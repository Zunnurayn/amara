import { Router } from 'express'
import { z } from 'zod'
import { toggleStrategy, getStrategyStatus } from '@anara/agent'
import { getAgentSettings, getUserByWalletAddress, setStrategyEnabled } from '../db/client'

export const strategyRouter = Router()

strategyRouter.get('/', async (req, res) => {
  const walletAddress = typeof req.query.walletAddress === 'string' ? req.query.walletAddress : null
  const user = walletAddress ? await getUserByWalletAddress(walletAddress) : null
  const settings = user ? await getAgentSettings(user.id) : null

  res.json({
    strategies: [
      { id: 'arb',       name: 'Arb Bot',         status: settings?.arb_enabled === false ? 'paused' : 'active',   pnl: '+$847.32', type: 'arb' },
      { id: 'yield',     name: 'Yield Optimizer', status: settings?.yield_enabled === false ? 'paused' : 'active', pnl: '+$312.10', type: 'yield' },
      { id: 'rebalance', name: 'Auto-Rebalance',  status: settings?.rebalance_enabled === false ? 'paused' : 'watching', pnl: 'In Range', type: 'rebalance' },
      { id: 'brickt',    name: 'Brickt Pools',    status: settings?.brickt_enabled === false ? 'paused' : 'active', pnl: '+$64.00', type: 'brickt' },
    ],
  })
})

strategyRouter.get('/:id', async (req, res) => {
  const status = await getStrategyStatus(req.params.id)
  if (!status) return res.status(404).json({ error: 'Strategy not found' })
  res.json(status)
})

const ToggleSchema = z.object({
  action: z.enum(['pause', 'resume']),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
})

strategyRouter.post('/:id/toggle', async (req, res) => {
  try {
    const { action, walletAddress } = ToggleSchema.parse(req.body)
    if (walletAddress) {
      const user = await getUserByWalletAddress(walletAddress)
      if (user) {
        await setStrategyEnabled(user.id, req.params.id, action === 'resume')
      }
    }
    const result = await toggleStrategy(req.params.id, action)
    res.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid action' })
    res.status(500).json({ error: 'Failed to toggle strategy' })
  }
})
