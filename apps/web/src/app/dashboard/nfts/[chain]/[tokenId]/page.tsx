'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Badge, Card, KenteStrip } from '../../../../../components/ui'
import { useWalletStore } from '../../../../../store'
import { colors } from '../../../../../lib/ui-tokens'

export default function NftDetailPage() {
  const router = useRouter()
  const params = useParams<{ chain: string; tokenId: string }>()
  const nfts = useWalletStore((state) => state.nfts)

  const nft = useMemo(() => {
    const chain = decodeURIComponent(params.chain)
    const tokenId = decodeURIComponent(params.tokenId)
    return nfts.find((entry) => entry.chain === chain && entry.tokenId === tokenId) ?? null
  }, [nfts, params.chain, params.tokenId])

  if (!nft) {
    return (
      <div className="min-h-screen bg-earth text-cream">
        <KenteStrip height={4} />
        <div className="max-w-xl mx-auto px-6 py-10">
          <Card kente>
            <div className="p-6">
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted font-bold mb-3">NFT Not Found</div>
              <div className="text-sm text-muted leading-6">
                This NFT is not available in the current wallet state. Refresh the dashboard and try again.
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

  return (
    <div className="min-h-screen bg-earth text-cream">
      <KenteStrip height={4} />
      <header className="sticky top-0 z-20 border-b border-border bg-soil/95 px-4 py-3 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="text-xs text-muted hover:text-cream">Back</button>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">NFT Detail</div>
          <Link href="/dashboard" className="text-xs border border-border px-3 py-1.5 hover:border-border2">Close</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Card kente>
          <div className="p-6">
            <div className="border border-border bg-clay overflow-hidden">
              <div className="aspect-square bg-clay border-b border-border flex items-center justify-center overflow-hidden">
                <NftArtwork nft={nft} />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-2xl font-display font-black">{nft.name ?? `#${nft.tokenId}`}</div>
                    <div className="text-sm text-muted mt-1">{nft.collection}</div>
                  </div>
                  <Badge variant="chain" color={nft.chain === 'ethereum' ? colors.chains.eth : colors.chains.base}>
                    {nft.chain}
                  </Badge>
                </div>

                <div className="mt-6 space-y-3">
                  <InfoRow label="Token ID" value={nft.tokenId} mono />
                  <InfoRow label="Collection" value={nft.collection} />
                  <InfoRow label="Chain" value={nft.chain} />
                </div>

                {nft.imageUrl && (
                  <div className="mt-6">
                    <a
                      href={nft.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-border px-4 py-2 text-xs font-bold uppercase tracking-wide text-text2 hover:border-border2"
                    >
                      Open Artwork
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </main>
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

function NftArtwork({ nft }: { nft: { chain: string; collection: string; name?: string; imageUrl?: string } }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = Boolean(nft.imageUrl && !imageFailed)
  const initials = (nft.collection || nft.name || 'NFT')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, 2)
    .toUpperCase() || 'NFT'

  if (hasImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={nft.imageUrl}
        alt={nft.name ?? nft.collection}
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center text-[1.6rem] font-display font-black tracking-[0.18em]"
      style={{
        background: `linear-gradient(135deg, ${colors.clay2} 0%, ${colors.earth} 100%)`,
        color: nft.chain === 'ethereum' ? colors.chains.eth : colors.chains.base,
      }}
    >
      {initials}
    </div>
  )
}
