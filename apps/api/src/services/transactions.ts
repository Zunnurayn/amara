// ─────────────────────────────────────────────────────────────────
// Transactions Service
// Fetches recent transfers via Alchemy JSON-RPC
// ─────────────────────────────────────────────────────────────────

const ALCHEMY_BASE_URL = resolveRpcUrl(process.env.BASE_RPC_URL, 'https://base-mainnet.g.alchemy.com/v2')
const ALCHEMY_ETH_URL  = resolveRpcUrl(process.env.ETH_RPC_URL, 'https://eth-mainnet.g.alchemy.com/v2')
const ALCHEMY_BSC_URL  = resolveRpcUrl(process.env.BSC_RPC_URL, 'https://bnb-mainnet.g.alchemy.com/v2')
const ETHERSCAN_V2_API_URL = 'https://api.etherscan.io/v2/api'
const BSCSCAN_API_URL = 'https://api.bscscan.com/api'

type TransferDirection = 'from' | 'to'

export interface TransferRecord {
  uniqueId?: string
  hash: string
  from: string
  to?: string
  value: string
  asset?: string
  category?: string
  rawContract?: { value?: string; address?: string; decimal?: string }
  metadata?: { blockTimestamp?: string }
  blockNum?: string
  erc721TokenId?: string
  tokenId?: string
}

export interface TransactionSummary {
  hash: `0x${string}`
  chainId: number
  type: 'send' | 'receive' | 'contract'
  status: 'confirmed' | 'failed'
  from: `0x${string}`
  to?: `0x${string}`
  value: string
  valueFormatted: string
  valueUsd?: string
  timestamp: number
  blockNumber?: number
  nonce: number
  tokenIn?: { symbol: string; amount: string; amountUsd?: string }
  tokenOut?: { symbol: string; amount: string; amountUsd?: string }
  fromChainId?: number
  toChainId?: number
  bridgeProtocol?: string
}

export interface TransactionDebugSummary {
  chainId: number
  alchemyOutgoing: number | string
  alchemyIncoming: number | string
  alchemyMerged: number
  explorerNormal: number | string
  explorerToken: number | string
  finalCount: number
}

interface ExplorerTxRecord {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  blockNumber: string
  nonce: string
  txreceipt_status?: string
  isError?: string
  functionName?: string
  input?: string
}

interface ExplorerTokenTxRecord {
  hash: string
  from: string
  to: string
  value: string
  tokenSymbol?: string
  tokenName?: string
  tokenDecimal?: string
  timeStamp: string
  blockNumber: string
  nonce?: string
}

function getAlchemyUrl(chainId: number) {
  switch (chainId) {
    case 1:
      return ALCHEMY_ETH_URL
    case 56:
      return ALCHEMY_BSC_URL
    case 8453:
    default:
      return ALCHEMY_BASE_URL
  }
}

function toHexCount(n: number) {
  const clamped = Math.max(1, Math.min(n, 200))
  return `0x${clamped.toString(16)}`
}

function normalizeAddress(addr?: string) {
  return addr ? addr.toLowerCase() : addr
}

async function parseJsonResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return await response.json() as any
}

function hasUsableApiKey(value?: string) {
  const key = value?.trim()
  return Boolean(key && key !== 'xxxxxx')
}

function hasUsableRpcUrl(value?: string) {
  const rpcUrl = value?.trim()
  return Boolean(
    rpcUrl &&
    rpcUrl !== 'xxxxxx' &&
    !rpcUrl.includes('${') &&
    /^https?:\/\//.test(rpcUrl)
  )
}

function resolveRpcUrl(explicitUrl: string | undefined, defaultBaseUrl: string) {
  if (hasUsableRpcUrl(explicitUrl)) {
    return explicitUrl!.trim()
  }
  return `${defaultBaseUrl}/${process.env.ALCHEMY_API_KEY}`
}

function shouldUseExplorerFallback(chainId: number) {
  if (chainId === 1) return hasUsableApiKey(process.env.ETHERSCAN_API_KEY)
  if (chainId === 56) return hasUsableApiKey(process.env.BSCSCAN_API_KEY)
  return false
}

async function fetchTransfers(address: string, chainId: number, direction: TransferDirection, limit: number) {
  const url = getAlchemyUrl(chainId)
  const addr = normalizeAddress(address)

  const params: Record<string, unknown> = {
    fromBlock: '0x0',
    toBlock: 'latest',
    category: chainId === 1
      ? ['external', 'internal', 'erc20', 'erc721', 'erc1155']
      : ['external', 'erc20', 'erc721', 'erc1155'],
    withMetadata: true,
    excludeZeroValue: false,
    maxCount: toHexCount(limit),
    order: 'desc',
  }

  if (direction === 'from') params.fromAddress = addr
  else params.toAddress = addr

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [params],
    }),
  })

  const data = await parseJsonResponse(res)
  if (data?.error) {
    const message = typeof data.error?.message === 'string' ? data.error.message : 'Unknown transfer API error'
    throw new Error(`alchemy_getAssetTransfers(${chainId}/${direction}): ${message}`)
  }
  return (data.result?.transfers ?? []) as TransferRecord[]
}

export async function getRecentTransactions(address: string, chainId: number, limit = 20): Promise<TransactionSummary[]> {
  const { transactions } = await getRecentTransactionsWithDebug(address, chainId, limit)
  return transactions
}

export async function getRecentTransactionsWithDebug(address: string, chainId: number, limit = 20): Promise<{
  transactions: TransactionSummary[]
  debug: TransactionDebugSummary
}> {
  const [outgoing, incoming] = await Promise.allSettled([
    fetchTransfers(address, chainId, 'from', limit),
    fetchTransfers(address, chainId, 'to', limit),
  ])

  if (outgoing.status === 'rejected' && incoming.status === 'rejected') {
    throw new Error(
      [
        `outgoing: ${outgoing.reason instanceof Error ? outgoing.reason.message : String(outgoing.reason)}`,
        `incoming: ${incoming.reason instanceof Error ? incoming.reason.message : String(incoming.reason)}`,
      ].join(' | ')
    )
  }

  const merged = [
    ...(outgoing.status === 'fulfilled' ? outgoing.value : []),
    ...(incoming.status === 'fulfilled' ? incoming.value : []),
  ]

  if (!merged.length) {
    if (!shouldUseExplorerFallback(chainId)) {
      return {
        transactions: [],
        debug: {
          chainId,
          alchemyOutgoing: outgoing.status === 'fulfilled' ? outgoing.value.length : formatReason(outgoing.reason),
          alchemyIncoming: incoming.status === 'fulfilled' ? incoming.value.length : formatReason(incoming.reason),
          alchemyMerged: 0,
          explorerNormal: 'skipped',
          explorerToken: 'skipped',
          finalCount: 0,
        },
      }
    }

    const { transactions, normalCount, tokenCount } = await fetchExplorerTransactions(address, chainId, limit)
    return {
      transactions,
      debug: {
        chainId,
        alchemyOutgoing: outgoing.status === 'fulfilled' ? outgoing.value.length : formatReason(outgoing.reason),
        alchemyIncoming: incoming.status === 'fulfilled' ? incoming.value.length : formatReason(incoming.reason),
        alchemyMerged: 0,
        explorerNormal: normalCount,
        explorerToken: tokenCount,
        finalCount: transactions.length,
      },
    }
  }

  const seen = new Set<string>()
  const records = merged.filter((t) => {
    const key = t.uniqueId ?? `${t.hash}:${t.blockNum ?? ''}:${t.from}:${t.to}:${t.asset ?? ''}:${t.value}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const addr = normalizeAddress(address)

  const txs = records.map((t): TransactionSummary => {
    const isOutgoing = normalizeAddress(t.from) === addr
    const timestamp = t.metadata?.blockTimestamp
      ? new Date(t.metadata.blockTimestamp).getTime()
      : 0
    const blockNumber = t.blockNum ? Number.parseInt(t.blockNum, 16) : undefined
    const value = t.value ?? t.rawContract?.value ?? '0'
    const asset = t.asset ?? inferAssetLabel(t)
    const valueFormatted = formatTransferValue(value, asset, t)
    const valueUsd = asset === 'USDC' || asset === 'USDT'
      ? `$${Number.parseFloat(value).toFixed(2)}`
      : undefined

    return {
      hash: t.hash as `0x${string}`,
      chainId,
      type: isOutgoing ? 'send' : 'receive',
      status: 'confirmed',
      from: t.from as `0x${string}`,
      to: t.to as `0x${string}` | undefined,
      value,
      valueFormatted,
      valueUsd,
      timestamp,
      blockNumber,
      nonce: 0,
      tokenIn: !isOutgoing && asset ? { symbol: asset, amount: value, amountUsd: valueUsd } : undefined,
      tokenOut: isOutgoing && asset ? { symbol: asset, amount: value, amountUsd: valueUsd } : undefined,
    }
  })

  const transactions = txs
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit)

  return {
    transactions,
    debug: {
      chainId,
      alchemyOutgoing: outgoing.status === 'fulfilled' ? outgoing.value.length : formatReason(outgoing.reason),
      alchemyIncoming: incoming.status === 'fulfilled' ? incoming.value.length : formatReason(incoming.reason),
      alchemyMerged: merged.length,
      explorerNormal: 0,
      explorerToken: 0,
      finalCount: transactions.length,
    },
  }
}

async function fetchExplorerTransactions(address: string, chainId: number, limit: number): Promise<{
  transactions: TransactionSummary[]
  normalCount: number | string
  tokenCount: number | string
}> {
  const [normalTxs, tokenTxs] = await Promise.allSettled([
    fetchExplorerNormalTransactions(address, chainId, limit),
    fetchExplorerTokenTransactions(address, chainId, limit),
  ])

  const merged = mergeExplorerTransactions(
    normalTxs.status === 'fulfilled' ? normalTxs.value : [],
    tokenTxs.status === 'fulfilled' ? tokenTxs.value : [],
    limit
  )

  if (merged.length) {
    return {
      transactions: merged,
      normalCount: normalTxs.status === 'fulfilled' ? normalTxs.value.length : formatReason(normalTxs.reason),
      tokenCount: tokenTxs.status === 'fulfilled' ? tokenTxs.value.length : formatReason(tokenTxs.reason),
    }
  }

  if (normalTxs.status === 'rejected' && tokenTxs.status === 'rejected') {
    throw new Error(
      [
        `explorer txlist: ${normalTxs.reason instanceof Error ? normalTxs.reason.message : String(normalTxs.reason)}`,
        `explorer tokentx: ${tokenTxs.reason instanceof Error ? tokenTxs.reason.message : String(tokenTxs.reason)}`,
      ].join(' | ')
    )
  }

  return {
    transactions: [],
    normalCount: normalTxs.status === 'fulfilled' ? normalTxs.value.length : formatReason(normalTxs.reason),
    tokenCount: tokenTxs.status === 'fulfilled' ? tokenTxs.value.length : formatReason(tokenTxs.reason),
  }
}

async function fetchExplorerNormalTransactions(address: string, chainId: number, limit: number): Promise<TransactionSummary[]> {
  const { apiUrl, params } = buildExplorerParams(chainId, address, limit, 'txlist')
  const response = await fetch(`${apiUrl}?${params.toString()}`)
  const data = await parseJsonResponse(response) as {
    status?: string
    message?: string
    result?: ExplorerTxRecord[] | string
  }

  if (data.status === '0' && typeof data.result === 'string' && data.result !== 'No transactions found') {
    throw new Error(`explorer txlist(${chainId}): ${data.result}`)
  }

  const records = Array.isArray(data.result) ? data.result : []
  const normalizedAddress = normalizeAddress(address)

  return records.map((record): TransactionSummary => {
    const isOutgoing = normalizeAddress(record.from) === normalizedAddress
    const isContract = Boolean(record.input && record.input !== '0x')
    const valueEth = Number(record.value || '0') / 1e18
    const status = record.txreceipt_status === '0' || record.isError === '1' ? 'failed' : 'confirmed'
    return {
      hash: record.hash as `0x${string}`,
      chainId,
      type: isContract ? 'contract' : isOutgoing ? 'send' : 'receive',
      status,
      from: record.from as `0x${string}`,
      to: record.to as `0x${string}` | undefined,
      value: String(valueEth),
      valueFormatted: formatExplorerValue(record, valueEth, isContract, chainId),
      timestamp: Number(record.timeStamp) * 1000,
      blockNumber: Number(record.blockNumber),
      nonce: Number(record.nonce),
    }
  }).slice(0, limit)
}

async function fetchExplorerTokenTransactions(address: string, chainId: number, limit: number): Promise<TransactionSummary[]> {
  const { apiUrl, params } = buildExplorerParams(chainId, address, limit, 'tokentx')
  const response = await fetch(`${apiUrl}?${params.toString()}`)
  const data = await parseJsonResponse(response) as {
    status?: string
    message?: string
    result?: ExplorerTokenTxRecord[] | string
  }

  if (data.status === '0' && typeof data.result === 'string' && data.result !== 'No transactions found') {
    throw new Error(`explorer tokentx(${chainId}): ${data.result}`)
  }

  const records = Array.isArray(data.result) ? data.result : []
  const normalizedAddress = normalizeAddress(address)

  return records.map((record): TransactionSummary => {
    const isOutgoing = normalizeAddress(record.from) === normalizedAddress
    const decimals = Number(record.tokenDecimal || '18')
    const amount = formatTokenUnits(record.value || '0', decimals)
    const symbol = record.tokenSymbol || record.tokenName || 'TOKEN'
    return {
      hash: record.hash as `0x${string}`,
      chainId,
      type: isOutgoing ? 'send' : 'receive',
      status: 'confirmed',
      from: record.from as `0x${string}`,
      to: record.to as `0x${string}` | undefined,
      value: amount,
      valueFormatted: `${amount} ${symbol}`,
      valueUsd: symbol === 'USDC' || symbol === 'USDT'
        ? `$${Number.parseFloat(amount || '0').toFixed(2)}`
        : undefined,
      timestamp: Number(record.timeStamp) * 1000,
      blockNumber: Number(record.blockNumber),
      nonce: Number(record.nonce || '0'),
      tokenIn: !isOutgoing ? { symbol, amount } : undefined,
      tokenOut: isOutgoing ? { symbol, amount } : undefined,
    }
  }).slice(0, limit)
}

function mergeExplorerTransactions(
  normalTxs: TransactionSummary[],
  tokenTxs: TransactionSummary[],
  limit: number
) {
  const byHash = new Map<string, TransactionSummary>()

  for (const tx of normalTxs) {
    byHash.set(`${tx.chainId}:${tx.hash.toLowerCase()}`, tx)
  }

  for (const tx of tokenTxs) {
    const key = `${tx.chainId}:${tx.hash.toLowerCase()}`
    const existing = byHash.get(key)
    if (!existing) {
      byHash.set(key, tx)
      continue
    }
    byHash.set(key, {
      ...existing,
      valueFormatted: existing.valueFormatted === 'Contract interaction' ? tx.valueFormatted : existing.valueFormatted,
      valueUsd: existing.valueUsd ?? tx.valueUsd,
      tokenIn: existing.tokenIn ?? tx.tokenIn,
      tokenOut: existing.tokenOut ?? tx.tokenOut,
    })
  }

  return Array.from(byHash.values())
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, limit)
}

function formatExplorerValue(record: ExplorerTxRecord, valueEth: number, isContract: boolean, chainId: number) {
  if (isContract) {
    return record.functionName?.trim() || 'Contract interaction'
  }
  return valueEth > 0 ? `${valueEth} ${chainId === 56 ? 'BNB' : 'ETH'}` : 'Wallet activity'
}

function formatTokenUnits(value: string, decimals: number, precision = 6) {
  const raw = BigInt(value || '0')
  if (decimals <= 0) return raw.toString()
  const padded = raw.toString().padStart(decimals + 1, '0')
  const whole = padded.slice(0, -decimals)
  const fraction = padded.slice(-decimals).replace(/0+$/, '').slice(0, precision)
  return fraction ? `${whole}.${fraction}` : whole
}

function formatReason(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

function buildExplorerParams(
  chainId: number,
  address: string,
  limit: number,
  action: 'txlist' | 'tokentx'
) {
  if (chainId === 56) {
    const params = new URLSearchParams({
      module: 'account',
      action,
      address,
      page: '1',
      offset: String(limit),
      sort: 'desc',
    })
    if (hasUsableApiKey(process.env.BSCSCAN_API_KEY)) {
      params.set('apikey', process.env.BSCSCAN_API_KEY!)
    }
    return {
      apiUrl: BSCSCAN_API_URL,
      apiKey: process.env.BSCSCAN_API_KEY,
      params,
    }
  }

  const apiKey = chainId === 8453 ? process.env.BASESCAN_API_KEY : process.env.ETHERSCAN_API_KEY
  const params = new URLSearchParams({
    chainid: String(chainId),
    module: 'account',
    action,
    address,
    page: '1',
    offset: String(limit),
    sort: 'desc',
  })
  if (hasUsableApiKey(apiKey)) {
    params.set('apikey', apiKey!)
  }
  return {
    apiUrl: ETHERSCAN_V2_API_URL,
    apiKey,
    params,
  }
}

function inferAssetLabel(transfer: TransferRecord) {
  if (transfer.category === 'erc721' || transfer.category === 'erc1155') return 'NFT'
  return ''
}

function formatTransferValue(value: string, asset: string, transfer: TransferRecord) {
  if (transfer.category === 'erc721' || transfer.category === 'erc1155') {
    const tokenId = transfer.erc721TokenId ?? transfer.tokenId
    return tokenId ? `${asset} #${tokenId}` : asset
  }
  if (!asset) return value
  return `${value} ${asset}`
}
