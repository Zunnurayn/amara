'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge, Card, KenteStrip, ChainLogo, TokenLogo } from '../../../../../components/ui'
import { useWalletStore } from '../../../../../store'
import { chainMeta } from '../../../../../lib/ui-tokens'

export default function AssetDetailPage() {
  const router = useRouter()
  const params = useParams<{ chainId: string; address: string }>()
  const tokens = useWalletStore((state) => state.tokens)

  const asset = useMemo(() => {
    const chainId = Number(params.chainId)
    const address = decodeURIComponent(params.address)
    return tokens.find((token) => token.chainId === chainId && token.address === address) ?? null
  }, [params.address, params.chainId, tokens])

  if (!asset) {
    return (
      <div className="min-h-screen bg-earth text-cream">
        <KenteStrip height={4} />
        <div className="max-w-xl mx-auto px-6 py-10">
          <Card kente>
            <div className="p-6">
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted font-bold mb-3">Asset Not Found</div>
              <div className="text-sm text-muted leading-6">
                This asset is not available in the current wallet state. Refresh the dashboard and try again.
              </div>
              <div className="mt-4 flex gap-2">
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

  const chain = chainMeta[asset.chainId]
  const explorerUrl = asset.address === 'native' ? null : `${chain?.explorerUrl}/token/${asset.address}`

  return (
    <div className="min-h-screen bg-earth text-cream">
      <KenteStrip height={4} />
      <header className="sticky top-0 z-20 border-b border-border bg-soil/95 px-4 py-3 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="text-xs text-muted hover:text-cream">Back</button>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">Asset Detail</div>
          <Link href="/dashboard" className="text-xs border border-border px-3 py-1.5 hover:border-border2">Close</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Card kente>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <TokenLogo symbol={asset.symbol} name={asset.name} logoUrl={asset.logoUrl} chainId={asset.chainId} size={44} />
                <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-2">Token</div>
                <div className="text-3xl font-display font-black">{asset.symbol}</div>
                <div className="text-sm text-muted mt-1">{asset.name}</div>
                </div>
              </div>
              {chain && (
                <Badge variant="chain" color={chain.color} className="inline-flex items-center gap-1">
                  <ChainLogo chainId={asset.chainId} size={12} />
                  {chain.name}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <MetricCard label="Balance" value={asset.balanceFormatted} />
              <MetricCard label="Value" value={asset.balanceUsd} />
              <MetricCard label="Price" value={asset.priceUsd} />
              <MetricCard label="24h Change" value={asset.change24h} />
            </div>

            <div className="mt-6 space-y-3">
              <InfoRow label="Contract" value={asset.address === 'native' ? 'Native asset' : asset.address} mono />
              <InfoRow label="Decimals" value={String(asset.decimals)} />
              <InfoRow label="Chain ID" value={String(asset.chainId)} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/chat?prompt=${encodeURIComponent(`Send ${asset.symbol} to 0x1111111111111111111111111111111111111111 on ${chain?.name ?? 'Base'}`)}`}
                className="bg-kola/10 border border-kola/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-kola hover:bg-kola/20"
              >
                Send With Chat
              </Link>
              <Link
                href={`/dashboard/chat?prompt=${encodeURIComponent(`Swap ${asset.symbol} to USDC on ${chain?.name ?? 'Base'}`)}`}
                className="bg-gold/10 border border-gold/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gold2 hover:bg-gold/20"
              >
                Swap With Chat
              </Link>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-text2 hover:border-border2"
                >
                  View On Explorer
                </a>
              )}
            </div>
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
      <div className="text-lg font-display font-bold text-text2">{value}</div>
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
