'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Badge, Button, Card, KenteStrip } from '../../../../components/ui'
import { useWalletStore } from '../../../../store'
import { useAuth } from '../../../../lib/auth'
import { resolveWalletIdentity } from '../../../../lib/wallet'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export default function StrategyDetailPage() {
  const params = useParams<{ id: string }>()
  const strategyId = params.id
  const apiStrategyId = strategyId === 'reb' ? 'rebalance' : strategyId
  const { ready, authenticated, user } = useAuth()
  const walletAddress = useWalletStore((state) => state.address)
  const setAddress = useWalletStore((state) => state.setAddress)
  const setHasWallet = useWalletStore((state) => state.setHasWallet)

  const [strategy, setStrategy] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !authenticated) return
    const { address, hasWallet } = resolveWalletIdentity(user)
    setHasWallet(hasWallet)
    if (address) setAddress(address)
  }, [ready, authenticated, user, setAddress, setHasWallet])

  useEffect(() => {
    let mounted = true

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_URL}/api/strategy/${apiStrategyId}`)
        if (!res.ok) throw new Error(`Failed to load strategy ${apiStrategyId}`)
        const data = await res.json()
        if (mounted) setStrategy(data)
      } catch (err) {
        if (mounted) {
          setStrategy(null)
          setError(err instanceof Error ? err.message : 'Strategy unavailable')
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [apiStrategyId])

  async function toggle(action: 'pause' | 'resume') {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/strategy/${apiStrategyId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, walletAddress }),
      })
      if (!res.ok) throw new Error('Failed to update strategy')
      const data = await res.json()
      setStrategy((current) => ({
        ...(current ?? {}),
        status: data.newStatus ?? (current?.status ?? 'active'),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update strategy')
    } finally {
      setIsSubmitting(false)
    }
  }

  const status = String(strategy?.status ?? 'unknown')

  return (
    <div className="min-h-screen bg-earth text-cream">
      <KenteStrip height={4} />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted font-bold">Strategy</div>
            <h1 className="text-3xl font-display font-black mt-1">{getStrategyTitle(strategyId)}</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-muted hover:text-cream transition-colors">
            Back
          </Link>
        </div>

        <Card kente className="mb-4">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Badge variant={status === 'active' ? 'active' : status === 'paused' ? 'paused' : 'watching'}>
                {status}
              </Badge>
              <div className="text-sm text-muted">ID: {apiStrategyId}</div>
            </div>

            {isLoading && <p className="text-sm text-muted">Loading strategy state…</p>}
            {!isLoading && error && <p className="text-sm text-kola">{error}</p>}

            {!isLoading && strategy && (
              <div className="space-y-3 text-sm">
                {Object.entries(strategy).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-text2">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !strategy && !error && (
              <p className="text-sm text-muted">No strategy details returned yet.</p>
            )}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting || status === 'active' || !walletAddress}
            onClick={() => toggle('resume')}
          >
            Resume
          </Button>
          <Button
            variant="secondary"
            loading={isSubmitting}
            disabled={isSubmitting || status === 'paused' || !walletAddress}
            onClick={() => toggle('pause')}
          >
            Pause
          </Button>
        </div>
      </div>
    </div>
  )
}

function getStrategyTitle(id: string) {
  const titles: Record<string, string> = {
    arb: 'Arb Bot',
    yield: 'Yield Optimizer',
    reb: 'Auto-Rebalance',
    rebalance: 'Auto-Rebalance',
    brickt: 'Brickt Pools',
  }
  return titles[id] ?? 'Strategy'
}
