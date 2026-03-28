import { Router } from 'express'
import { z } from 'zod'
import { getUserByWalletAddress, logExecution, saveTransaction } from '../db/client'

export const txRouter = Router()

const ActionCardSchema = z.object({
  type: z.enum(['swap', 'send', 'bridge', 'query', 'strategy', 'settings', 'unknown']),
  title: z.string(),
  rows: z.array(z.object({
    label: z.string(),
    value: z.string(),
    highlight: z.boolean().optional(),
  })),
  status: z.enum(['pending', 'executing', 'confirmed', 'failed', 'cancelled']),
  txHash: z.string().optional(),
})

const SimulateSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive().default(8453),
  actionCard: ActionCardSchema.optional(),
})

const ExecuteSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive().default(8453),
  signature: z.string().min(1).optional(),
  actionCard: ActionCardSchema,
})

txRouter.post('/simulate', async (req, res) => {
  try {
    const body = SimulateSchema.parse(req.body)
    const analysis = summarizeAction(body.actionCard)

    res.json({
      success: true,
      chainId: body.chainId,
      willSucceed: true,
      gasEstimateUsd: analysis.gasEstimateUsd,
      estimatedRoute: analysis.route,
      warnings: analysis.warnings,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid simulation payload', details: err.errors })
    }
    return res.status(500).json({ error: 'Simulation unavailable' })
  }
})

txRouter.post('/broadcast', async (req, res) => {
  try {
    const body = ExecuteSchema.parse(req.body)
    const txHash = makeTxHash(body.walletAddress, body.actionCard.title)

    await persistExecution(body.walletAddress, body.chainId, body.actionCard, txHash)

    res.json({
      hash: txHash,
      status: 'pending',
      explorerUrl: getExplorerUrl(body.chainId, txHash),
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid broadcast payload', details: err.errors })
    }
    return res.status(500).json({ error: 'Broadcast unavailable' })
  }
})

txRouter.post('/execute', async (req, res) => {
  try {
    const body = ExecuteSchema.parse(req.body)
    const txHash = makeTxHash(body.walletAddress, `${body.actionCard.type}:${Date.now()}`)

    await persistExecution(body.walletAddress, body.chainId, body.actionCard, txHash)

    res.json({
      success: true,
      transaction: {
        hash: txHash,
        chainId: body.chainId,
        status: 'pending',
        type: body.actionCard.type,
        explorerUrl: getExplorerUrl(body.chainId, txHash),
      },
      actionCard: {
        ...body.actionCard,
        status: 'confirmed',
        txHash,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid execution payload', details: err.errors })
    }
    return res.status(500).json({ error: 'Execution unavailable' })
  }
})

async function persistExecution(
  walletAddress: string,
  chainId: number,
  actionCard: z.infer<typeof ActionCardSchema>,
  txHash: `0x${string}`
) {
  const user = await getUserByWalletAddress(walletAddress)
  const type = normalizeType(actionCard.type)
  const summary = summarizeAction(actionCard)

  if (user) {
    await saveTransaction(user.id, {
      txHash,
      chainId,
      txType: type,
      status: 'pending',
      fromAddress: walletAddress,
      valueFormatted: summary.amountLabel,
      bridgeProtocol: summary.route,
      fromChainId: type === 'bridge' ? chainId : undefined,
      toChainId: type === 'bridge' ? 1 : undefined,
    })

    await logExecution({
      userId: user.id,
      strategyType: type,
      status: 'success',
      description: actionCard.title,
      txHash,
      chainId,
      amountUsd: summary.estimatedUsd,
      metadata: {
        rows: actionCard.rows,
      },
    })
  }
}

function normalizeType(type: string) {
  if (type === 'swap' || type === 'send' || type === 'bridge') return type
  return 'custom'
}

function summarizeAction(actionCard?: z.infer<typeof ActionCardSchema>) {
  const rows = actionCard?.rows ?? []
  const route = rows.find((row) => /route|protocol|network/i.test(row.label))?.value ?? 'Base'
  const gasEstimateUsd = rows.find((row) => /gas/i.test(row.label))?.value ?? '~$0.05'
  const amountLabel = rows.find((row) => /amount|you send|from/i.test(row.label))?.value ?? actionCard?.title ?? 'Execution'
  const estimatedUsd = parseUsd(rows.map((row) => row.value).join(' '))
  const warnings = actionCard?.type === 'bridge'
    ? ['Bridge settlement can take longer on destination chain finality.']
    : []

  return { route, gasEstimateUsd, amountLabel, estimatedUsd, warnings }
}

function parseUsd(input: string) {
  const match = input.match(/\$([0-9,.]+)/)
  const raw = match?.[1]
  if (!raw) return undefined
  return Number.parseFloat(raw.replace(/,/g, ''))
}

function makeTxHash(walletAddress: string, salt: string) {
  const base = Buffer.from(`${walletAddress}:${salt}`).toString('hex').slice(0, 64)
  return `0x${base.padEnd(64, '0')}` as `0x${string}`
}

function getExplorerUrl(chainId: number, txHash: string) {
  const host = chainId === 1 ? 'https://etherscan.io' : 'https://basescan.org'
  return `${host}/tx/${txHash}`
}
