'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge, Card, KenteStrip, ChainLogo, TokenLogo } from '../../../../../components/ui'
import { useWalletStore } from '../../../../../store'
import { chainMeta } from '../../../../../lib/ui-tokens'

export default function ActivityDetailPage() {
  const router = useRouter()
  const params = useParams<{ chainId: string; hash: string }>()
  const transactions = useWalletStore((state) => state.transactions)

  const transaction = useMemo(() => {
    const chainId = Number(params.chainId)
    const hash = decodeURIComponent(params.hash).toLowerCase()
    return transactions.find((entry) => entry.chainId === chainId && entry.hash.toLowerCase() === hash) ?? null
  }, [params.chainId, params.hash, transactions])

  if (!transaction) {
    return (
      <div className="min-h-screen bg-earth text-cream">
        <KenteStrip height={4} />
        <div className="max-w-xl mx-auto px-6 py-10">
          <Card kente>
            <div className="p-6">
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted font-bold mb-3">Activity Not Found</div>
              <div className="text-sm text-muted leading-6">
                This transaction is not available in the current wallet state. Refresh the dashboard and try again.
              </div>
              <div className="mt-4">
                <button onClick={() => router.push('/dashboard')} className="bg-gold text-earth px-4 py-2 text-xs font-bold uppercase tracking-wide">
                  Back To Dashboard
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const chain = chainMeta[transaction.chainId]
  const explorerUrl = chain ? `${chain.explorerUrl}/tx/${transaction.hash}` : null

  return (
    <div className="min-h-screen bg-earth text-cream">
      <KenteStrip height={4} />
      <header className="sticky top-0 z-20 border-b border-border bg-soil/95 px-4 py-3 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="text-xs text-muted hover:text-cream">Back</button>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">Activity Detail</div>
          <Link href="/dashboard" className="text-xs border border-border px-3 py-1.5 hover:border-border2">Close</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Card kente>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <TokenLogo
                  symbol={transaction.tokenOut?.symbol ?? transaction.tokenIn?.symbol ?? (transaction.chainId === 1 ? 'ETH' : 'BASE')}
                  name={transaction.tokenOut?.symbol ?? transaction.tokenIn?.symbol ?? 'Wallet Activity'}
                  chainId={transaction.chainId}
                  size={44}
                />
                <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-2">Transaction</div>
                <div className="text-3xl font-display font-black">{formatTransactionTitle(transaction)}</div>
                <div className="text-sm text-muted mt-1">{transaction.valueFormatted}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {chain && (
                  <Badge variant="chain" color={chain.color} className="inline-flex items-center gap-1">
                    <ChainLogo chainId={transaction.chainId} size={12} />
                    {chain.name}
                  </Badge>
                )}
                <Badge variant={transaction.status === 'confirmed' ? 'active' : transaction.status === 'failed' ? 'error' : 'watching'}>
                  {transaction.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <MetricCard label="Value" value={transaction.valueFormatted} />
              <MetricCard label="USD" value={transaction.valueUsd ?? '$0.00'} />
              <MetricCard label="Time" value={formatTime(transaction.timestamp)} />
              <MetricCard label="Block" value={transaction.blockNumber ? String(transaction.blockNumber) : 'Pending'} />
            </div>

            <div className="mt-6 space-y-3">
              <InfoRow label="Hash" value={transaction.hash} mono />
              <InfoRow label="From" value={transaction.from} mono />
              <InfoRow label="To" value={transaction.to ?? 'Contract interaction'} mono />
              <InfoRow label="Nonce" value={String(transaction.nonce)} />
              {transaction.bridgeProtocol && <InfoRow label="Route" value={transaction.bridgeProtocol} />}
              {transaction.tokenIn && <InfoRow label="Token In" value={`${transaction.tokenIn.amount} ${transaction.tokenIn.symbol}`} />}
              {transaction.tokenOut && <InfoRow label="Token Out" value={`${transaction.tokenOut.amount} ${transaction.tokenOut.symbol}`} />}
            </div>

            {explorerUrl && (
              <div className="mt-6">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-text2 hover:border-border2"
                >
                  View On Explorer
                </a>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-clay p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-2">{label}</div>
      <div className="text-lg font-display font-bold text-text2 break-words">{value}</div>
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-3 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted font-bold">{label}</span>
      <span className={mono ? 'font-mono text-right text-[12px] text-text2 break-all' : 'text-right text-[12px] text-text2'}>
        {value}
      </span>
    </div>
  )
}

function formatTransactionTitle(transaction: { type: string }) {
  if (transaction.type === 'send') return 'Send'
  if (transaction.type === 'receive') return 'Receive'
  if (transaction.type === 'swap') return 'Swap'
  if (transaction.type === 'bridge') return 'Bridge'
  return 'Wallet Activity'
}

function formatTime(timestamp?: number) {
  if (!timestamp) return 'Pending'
  return new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
