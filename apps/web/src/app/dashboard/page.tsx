'use client'

import { useEffect, useState } from 'react'
import { useRouter }   from 'next/navigation'
import Link from 'next/link'
import { AnaraLogo, KenteStrip, Badge, Card, StatGrid, LiveDot } from '../../components/ui'
import { colors, shadows } from '../../lib/ui-tokens'
import { useWalletStore, useAgentStore, useUIStore } from '../../store'
import { useAgent } from '../../hooks/useAgent'
import { track } from '../../lib/analytics'
import { resolveWalletIdentity } from '../../lib/wallet'
import { useAuth } from '../../lib/auth'
import type { TokenBalance, WalletChainSummary, WalletNftSummary } from '@anara/types'

export default function DashboardPage() {
  const { ready, authenticated, syncReady, user, logout } = useAuth()
  const router  = useRouter()
  const { fetchBrief, fetchStatus, refreshWallet } = useAgent()
  const { address, totalUsd, tokens, nfts, chains, transactions, isLoading, error, hasWallet, lastUpdated, setAddress, setHasWallet } = useWalletStore()
  const { state: agentState, brief, setChatOpen } = useAgentStore()
  const { activeSheet, closeSheet } = useUIStore()
  const [showBrief, setShowBrief]   = useState(true)
  const [activeTab, setActiveTab]   = useState<'activity' | 'assets' | 'nfts'>('activity')
  const [chainOpen, setChainOpen]   = useState(false)
  const [trackedDashboardLoad, setTrackedDashboardLoad] = useState(false)

  useEffect(() => {
    if (ready && !authenticated) router.push('/onboard')
  }, [ready, authenticated, router])

  useEffect(() => {
    if (authenticated && syncReady) {
      const { address: walletAddress, hasWallet } = resolveWalletIdentity(user)
      setHasWallet(hasWallet)
      if (walletAddress) setAddress(walletAddress)
      if (walletAddress) {
        fetchStatus()
        refreshWallet()
        fetchBrief()
      }
    }
  }, [authenticated, syncReady, user, setAddress, setHasWallet, fetchBrief, fetchStatus, refreshWallet])

  useEffect(() => {
    if (!authenticated || !hasWallet || isLoading || trackedDashboardLoad) return

    track('dashboard_loaded', {
      walletAddress: address,
      totalUsd,
      tokenCount: tokens.length,
      nftCount: nfts.length,
      transactionCount: transactions.length,
      chainCount: chains.length,
      hasError: Boolean(error),
    })
    setTrackedDashboardLoad(true)
  }, [
    authenticated,
    hasWallet,
    isLoading,
    trackedDashboardLoad,
    address,
    totalUsd,
    tokens.length,
    nfts.length,
    transactions.length,
    chains.length,
    error,
  ])

  if (!ready || !authenticated) return <LoadingSplash />

  if (!hasWallet) return <MissingWalletState />

  if (showBrief && brief && hasReportableBrief(brief)) {
    return <BriefModal brief={brief} onDismiss={() => setShowBrief(false)} />
  }

  return (
    <div className="min-h-screen bg-earth text-cream flex flex-col">
      {/* Kente top strip */}
      <KenteStrip height={4} />

      {/* ── Status bar ── */}
      <header className="flex items-center justify-between px-4 py-3 bg-soil border-b border-border">
        <div className="flex items-center gap-3">
          <AnaraLogo size={32} />
          <div>
            <div className="font-display font-black text-lg leading-tight">Anara</div>
            <div className="text-[9px] text-muted tracking-widest uppercase">Assisted · Base + Ethereum</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Chain dropdown */}
          <div className="relative">
            <button
              onClick={() => setChainOpen(v => !v)}
              className="flex items-center gap-1.5 bg-clay border border-border px-2.5 py-1.5 text-[9px] font-bold font-mono tracking-wide text-text2 hover:border-border2 transition-colors"
            >
              {chains.slice(0, 3).map((chain) => (
                <span
                  key={chain.chainId}
                  style={{ background: chain.chainId === 1 ? colors.chains.eth : colors.chains.base }}
                  className="inline-block w-2 h-2 rounded-full"
                />
              ))}
              <span className="ml-1">{Math.max(chains.length, 1)} {chains.length === 1 ? 'chain' : 'chains'} ▾</span>
            </button>
            {chainOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setChainOpen(false)} />
                <ChainMenu />
              </>
            )}
          </div>

          {/* Live agent pip */}
          <div className="flex items-center gap-1.5 border border-green/25 bg-green/5 px-3 py-1.5">
            <LiveDot />
            <span className="text-[9px] font-bold text-green tracking-widest uppercase">Agent Ready</span>
          </div>

          {/* Avatar / logout */}
          <button
            onClick={logout}
            className="w-8 h-8 bg-gold flex items-center justify-content-center text-earth font-black text-sm font-display"
            title="Log out"
          >
            {user?.email?.address?.[0]?.toUpperCase() ?? 'S'}
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-md mx-auto w-full pb-8">
        {error && (
          <div className="mx-4 mt-4 border border-kola/30 bg-kola/10 px-4 py-3 text-[12px] text-text2">
            <div className="font-bold text-kola mb-1">Wallet data is partially unavailable</div>
            <div>{error}</div>
            <button
              onClick={() => refreshWallet()}
              className="mt-2 text-[11px] font-bold uppercase tracking-wide text-gold2 hover:text-gold"
            >
              Retry refresh
            </button>
          </div>
        )}

        {!error && lastUpdated && (
          <div className="mx-4 mt-4 text-[10px] font-mono text-muted">
            Last synced {formatRelativeSync(lastUpdated)}
          </div>
        )}

        {/* Portfolio hero */}
        <PortfolioHero totalUsd={totalUsd} chains={chains} tokenCount={tokens.length} nftCount={nfts.length} />

        {/* Proverb ticker */}
        <div className="flex items-center gap-3 bg-clay border-x border-b border-border px-4 py-2 overflow-hidden">
          <span className="text-[8px] font-bold text-gold tracking-[0.18em] uppercase flex-shrink-0">Ọrọ àṣà</span>
          <span className="text-[10px] text-muted italic whitespace-nowrap animate-ticker">
            "The wealth of a man is not in his pocket, but in the land he cultivates." &nbsp;·&nbsp; "Oní owó ló ní ọrọ." &nbsp;·&nbsp; Brickt — African land. Global capital.
          </span>
        </div>

        {/* Strategy cards */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-[9px] font-bold tracking-[0.2em] text-muted uppercase mb-3">Strategies</div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {STRATEGY_CARDS.map(s => (
              <StrategyCard key={s.id} {...s} />
            ))}
          </div>
        </div>

        {/* Inline tabs */}
        <div className="px-4 pt-4">
          <div className="text-[9px] font-bold tracking-[0.2em] text-muted uppercase mb-3">Wallet</div>
          <Card kente>
            {/* Tab bar */}
            <div className="sticky top-0 z-10 flex bg-clay border-b border-border">
              {(['activity', 'assets', 'nfts'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-[11px] font-bold tracking-wider uppercase border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'text-gold2 border-gold2'
                      : 'text-muted border-transparent hover:text-text2'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-[200px] max-h-[26rem] md:max-h-[34rem] overflow-y-auto overscroll-contain">
              {activeTab === 'activity' && <ActivityTab transactions={transactions} isLoading={isLoading} error={error} />}
              {activeTab === 'assets'   && <AssetsTab tokens={tokens} />}
              {activeTab === 'nfts'     && <NFTsTab nfts={nfts} isLoading={isLoading} error={error} />}
            </div>
          </Card>
        </div>

        {/* Agent stats */}
        <div className="px-4 pt-4">
          <StatGrid stats={[
            { label: 'Actions today',  value: String(agentState.actionsToday || 0) },
            { label: 'Profit today',   value: agentState.profitToday || '$0.00', color: colors.green },
            { label: 'Errors',         value: String(agentState.errorsToday || 0),  color: agentState.errorsToday ? colors.kola : colors.green },
            { label: 'Wallet assets',  value: String(tokens.length + nfts.length), color: colors.teal },
          ]} />
        </div>

        {!brief && !isLoading && (
          <div className="px-4 pt-4">
            <Card>
              <div className="p-4 text-[12px] text-muted">
                No recent agent brief is available yet. Open chat to issue your first action or refresh once activity exists.
              </div>
            </Card>
          </div>
        )}
      </main>

      {activeSheet && (
        <QuickActionSheet
          sheet={activeSheet}
          address={address}
          tokens={tokens}
          onClose={closeSheet}
          onOpenChat={(prompt) => {
            closeSheet()
            setChatOpen(true)
            router.push(`/dashboard/chat?prompt=${encodeURIComponent(prompt)}&autosend=1`)
          }}
        />
      )}

      {/* Agent FAB */}
      <button
        onClick={() => { setChatOpen(true); router.push('/dashboard/chat') }}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-gold flex items-center justify-center text-2xl z-20"
        style={{ boxShadow: shadows.gold }}
      >
        🤖
        <span
          className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-green border-2 border-gold"
        />
      </button>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function LoadingSplash() {
  return (
    <div className="min-h-screen bg-earth flex flex-col items-center justify-center gap-4">
      <AnaraLogo size={48} />
      <div className="text-[10px] font-mono text-muted tracking-widest animate-pulse">LOADING WALLET…</div>
    </div>
  )
}

function hasReportableBrief(brief: Brief | null) {
  if (!brief) return false
  if ((brief.actionsCount ?? 0) > 0) return true
  if ((brief.errorsCount ?? 0) > 0) return true
  if (Array.isArray(brief.events) && brief.events.length > 0) return true
  return false
}

function QuickActionSheet({
  sheet,
  address,
  tokens,
  onClose,
  onOpenChat,
}: {
  sheet: 'send' | 'receive' | 'swap' | 'bridge'
  address: string | null
  tokens: TokenBalance[]
  onClose: () => void
  onOpenChat: (prompt: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const tokenOptions = buildTokenOptions(tokens)
  const defaultToken = tokenOptions[0]?.symbol ?? 'ETH'
  const [sendToken, setSendToken] = useState(defaultToken)
  const [sendAmount, setSendAmount] = useState('')
  const [sendAddress, setSendAddress] = useState('')
  const [sendChain, setSendChain] = useState<'Base' | 'Ethereum'>('Base')
  const [swapFromToken, setSwapFromToken] = useState(defaultToken)
  const [swapToToken, setSwapToToken] = useState(tokenOptions.find((token) => token.symbol !== defaultToken)?.symbol ?? 'USDC')
  const [swapAmount, setSwapAmount] = useState('')
  const [swapChain, setSwapChain] = useState<'Base' | 'Ethereum'>('Base')
  const [bridgeToken, setBridgeToken] = useState(defaultToken)
  const [bridgeAmount, setBridgeAmount] = useState('')
  const [bridgeFromChain, setBridgeFromChain] = useState<'Base' | 'Ethereum'>('Base')
  const [bridgeToChain, setBridgeToChain] = useState<'Base' | 'Ethereum'>('Ethereum')

  const sheetMeta = {
    send: {
      title: 'Send',
      body: 'Open chat with a prefilled send request and confirm it through the existing execution flow.',
      prompts: [
        'Send 10 USDC to 0x1111111111111111111111111111111111111111 on Base',
        'Send 0.001 ETH to 0x1111111111111111111111111111111111111111',
      ],
      accent: colors.kola,
    },
    receive: {
      title: 'Receive',
      body: 'Share your wallet address or copy it directly for inbound transfers.',
      prompts: [],
      accent: colors.green,
    },
    swap: {
      title: 'Swap',
      body: 'Open chat with a prefilled swap request and reuse the same preview and confirmation pipeline.',
      prompts: [
        'Swap 0.01 ETH to USDC on Base',
        'Swap 25 USDC to ETH on Base',
      ],
      accent: colors.gold,
    },
    bridge: {
      title: 'Bridge',
      body: 'Open chat with a prefilled bridge request. This still respects beta feature flags and guardrails.',
      prompts: [
        'Bridge 10 USDC from Base to Ethereum',
        'Bridge 0.005 ETH from Base to Ethereum',
      ],
      accent: colors.teal,
    },
  } as const

  const meta = sheetMeta[sheet]

  async function handleCopyAddress() {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-30">
      <button
        aria-label="Close quick action sheet"
        className="absolute inset-0 bg-earth/70"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md border border-border bg-soil shadow-2xl">
        <KenteStrip height={4} />
        <div className="flex items-start justify-between gap-4 p-4 border-b border-border">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted">Quick Action</div>
            <div className="text-xl font-display font-black mt-1" style={{ color: meta.accent }}>{meta.title}</div>
            <div className="text-sm text-muted mt-2 leading-6">{meta.body}</div>
          </div>
          <button onClick={onClose} className="text-xs border border-border px-3 py-1.5 text-muted hover:text-cream hover:border-border2">
            Close
          </button>
        </div>

        {sheet === 'receive' ? (
          <div className="p-4 space-y-4">
            <div className="border border-border bg-clay p-4">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">Wallet Address</div>
              <div className="font-mono text-[12px] text-text2 break-all">{address ?? 'No linked wallet address available yet.'}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyAddress}
                disabled={!address}
                className="flex-1 bg-gold text-earth font-bold text-xs uppercase tracking-wide px-4 py-3 disabled:opacity-50"
              >
                {copied ? 'Copied' : 'Copy Address'}
              </button>
              {address && (
                <Link
                  href={`/dashboard/chat?prompt=${encodeURIComponent(`What is my wallet address?`)}`}
                  onClick={onClose}
                  className="flex-1 border border-border text-center text-xs font-bold uppercase tracking-wide px-4 py-3 text-text2 hover:border-border2"
                >
                  Open In Chat
                </Link>
              )}
            </div>
          </div>
        ) : sheet === 'send' ? (
          <div className="p-4 space-y-4">
            <QuickField
              label="Asset"
              control={(
                <select value={sendToken} onChange={(event) => setSendToken(event.target.value)} className={quickInputClassName}>
                  {tokenOptions.map((token) => (
                    <option key={`${token.symbol}-${token.chain}`} value={token.symbol}>{token.symbol} · {token.chain}</option>
                  ))}
                </select>
              )}
            />
            <QuickField
              label="Amount"
              control={(
                <input
                  value={sendAmount}
                  onChange={(event) => setSendAmount(event.target.value)}
                  placeholder="10"
                  className={quickInputClassName}
                />
              )}
            />
            <QuickField
              label="Recipient"
              control={(
                <input
                  value={sendAddress}
                  onChange={(event) => setSendAddress(event.target.value)}
                  placeholder="0x1111111111111111111111111111111111111111"
                  className={`${quickInputClassName} font-mono`}
                />
              )}
            />
            <QuickField
              label="Chain"
              control={(
                <select value={sendChain} onChange={(event) => setSendChain(event.target.value as 'Base' | 'Ethereum')} className={quickInputClassName}>
                  <option>Base</option>
                  <option>Ethereum</option>
                </select>
              )}
            />
            <button
              onClick={() => onOpenChat(`Send ${sendAmount || '<amount>'} ${sendToken} to ${sendAddress || '<recipient>'} on ${sendChain}`)}
              className="w-full bg-gold text-earth font-bold text-xs uppercase tracking-wide px-4 py-3"
            >
              Continue In Chat
            </button>
          </div>
        ) : sheet === 'swap' ? (
          <div className="p-4 space-y-4">
            <QuickField
              label="From Asset"
              control={(
                <select value={swapFromToken} onChange={(event) => setSwapFromToken(event.target.value)} className={quickInputClassName}>
                  {tokenOptions.map((token) => (
                    <option key={`${token.symbol}-${token.chain}`} value={token.symbol}>{token.symbol} · {token.chain}</option>
                  ))}
                </select>
              )}
            />
            <QuickField
              label="To Asset"
              control={(
                <select value={swapToToken} onChange={(event) => setSwapToToken(event.target.value)} className={quickInputClassName}>
                  {tokenOptions.map((token) => (
                    <option key={`${token.symbol}-${token.chain}`} value={token.symbol}>{token.symbol} · {token.chain}</option>
                  ))}
                </select>
              )}
            />
            <QuickField
              label="Amount"
              control={(
                <input
                  value={swapAmount}
                  onChange={(event) => setSwapAmount(event.target.value)}
                  placeholder="0.01"
                  className={quickInputClassName}
                />
              )}
            />
            <QuickField
              label="Chain"
              control={(
                <select value={swapChain} onChange={(event) => setSwapChain(event.target.value as 'Base' | 'Ethereum')} className={quickInputClassName}>
                  <option>Base</option>
                  <option>Ethereum</option>
                </select>
              )}
            />
            <button
              onClick={() => onOpenChat(`Swap ${swapAmount || '<amount>'} ${swapFromToken} to ${swapToToken} on ${swapChain}`)}
              className="w-full bg-gold text-earth font-bold text-xs uppercase tracking-wide px-4 py-3"
            >
              Continue In Chat
            </button>
          </div>
        ) : sheet === 'bridge' ? (
          <div className="p-4 space-y-4">
            <QuickField
              label="Asset"
              control={(
                <select value={bridgeToken} onChange={(event) => setBridgeToken(event.target.value)} className={quickInputClassName}>
                  {tokenOptions.map((token) => (
                    <option key={`${token.symbol}-${token.chain}`} value={token.symbol}>{token.symbol} · {token.chain}</option>
                  ))}
                </select>
              )}
            />
            <QuickField
              label="Amount"
              control={(
                <input
                  value={bridgeAmount}
                  onChange={(event) => setBridgeAmount(event.target.value)}
                  placeholder="10"
                  className={quickInputClassName}
                />
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <QuickField
                label="From"
                control={(
                  <select value={bridgeFromChain} onChange={(event) => setBridgeFromChain(event.target.value as 'Base' | 'Ethereum')} className={quickInputClassName}>
                    <option>Base</option>
                    <option>Ethereum</option>
                  </select>
                )}
              />
              <QuickField
                label="To"
                control={(
                  <select value={bridgeToChain} onChange={(event) => setBridgeToChain(event.target.value as 'Base' | 'Ethereum')} className={quickInputClassName}>
                    <option>Ethereum</option>
                    <option>Base</option>
                  </select>
                )}
              />
            </div>
            <button
              onClick={() => onOpenChat(`Bridge ${bridgeAmount || '<amount>'} ${bridgeToken} from ${bridgeFromChain} to ${bridgeToChain}`)}
              className="w-full bg-gold text-earth font-bold text-xs uppercase tracking-wide px-4 py-3"
            >
              Continue In Chat
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {meta.prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => onOpenChat(prompt)}
                className="w-full text-left border border-border bg-clay px-4 py-3 hover:border-border2 transition-colors"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-1">{meta.title} Prompt</div>
                <div className="text-sm text-text2 leading-6">{prompt}</div>
              </button>
            ))}
            <div className="text-[11px] text-muted leading-5 pt-1">
              These quick actions reuse the same chat preview, guardrails, and wallet-confirmed execution flow that is already live.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuickField({ label, control }: { label: string; control: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted mb-2">{label}</div>
      {control}
    </label>
  )
}

const quickInputClassName = 'w-full border border-border bg-clay px-3 py-3 text-sm text-text2 outline-none focus:border-gold/40'

function buildTokenOptions(tokens: TokenBalance[]) {
  const seen = new Set<string>()
  const options = tokens
    .filter((token) => parseUsdAmount(token.balanceUsd) > 0 || parseFloat(token.balanceFormatted || '0') > 0)
    .map((token) => ({
      symbol: token.symbol,
      chain: token.chainId === 1 ? 'Ethereum' : 'Base',
    }))
    .filter((token) => {
      const key = `${token.symbol}:${token.chain}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  if (!options.length) {
    return [
      { symbol: 'ETH', chain: 'Base' },
      { symbol: 'USDC', chain: 'Base' },
      { symbol: 'ETH', chain: 'Ethereum' },
    ]
  }

  return options
}

interface Brief {
  summary: string
  totalProfitUsd: string
  actionsCount: number
  errorsCount: number
  events: { type: string; description: string; timeAgo: string; profitUsd: string | null }[]
}

function MissingWalletState() {
  return (
    <div className="min-h-screen bg-earth text-cream">
      <KenteStrip height={4} />
      <div className="max-w-xl mx-auto px-6 py-16">
        <Card kente>
          <div className="p-6">
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted font-bold mb-3">Wallet Required</div>
            <h1 className="text-3xl font-display font-black mb-3">Connect or create a wallet to continue.</h1>
            <p className="text-sm text-muted leading-6">
              Your account is authenticated, but there is no linked wallet address available for dashboard and agent actions yet.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function BriefModal({ brief, onDismiss }: { brief: Brief; onDismiss: () => void }) {
  const events = Array.isArray(brief.events) ? brief.events : []

  return (
    <div className="min-h-screen bg-earth/97 flex items-start justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-sm bg-soil border border-border overflow-hidden mt-4">
        <KenteStrip height={4} />

        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <LiveDot />
            <span className="text-[10px] font-bold text-green tracking-[0.2em] uppercase">Agent Online · Base & ETH</span>
          </div>
          <div className="font-display font-black text-2xl">
            Good morning, <span className="text-gold2">Shehu.</span>
          </div>
          <div className="text-[12px] text-muted mt-1">While you were away — last 14 hours.</div>
        </div>

        {/* Summary */}
        <div className="p-5">
          <div className="bg-gold/7 border border-gold/18 border-l-4 border-l-gold px-4 py-3 mb-5 text-[12px] text-text2 leading-relaxed">
            {brief.summary}
          </div>

          {/* Events */}
          <div className="flex flex-col gap-2">
            {events.length ? (
              events.map((ev, i) => (
                <div key={i} className="flex gap-3 items-start bg-clay border border-border p-3">
                  <div className={`w-7 h-7 flex items-center justify-center text-sm flex-shrink-0 border border-border/50 ${
                    ev.type === 'arb' ? 'bg-kola/15' : ev.type === 'yield' ? 'bg-gold/12' : 'bg-teal/10'
                  }`}>
                    {ev.type === 'arb' ? '⚡' : ev.type === 'yield' ? '🌾' : ev.type === 'rebalance' ? '⚖️' : '🏗️'}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] text-cream">{ev.description}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] text-muted font-mono">{ev.timeAgo}</span>
                      {ev.profitUsd && <span className="text-[10px] font-bold text-green font-mono">{ev.profitUsd}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-clay border border-border p-3 text-[12px] text-muted">
                No recent agent events yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border bg-earth">
          <div className="flex gap-6">
            {[
              { num: brief.totalProfitUsd, lbl: 'Gained' },
              { num: String(brief.actionsCount), lbl: 'Actions' },
              { num: String(brief.errorsCount), lbl: 'Errors' },
            ].map(s => (
              <div key={s.lbl}>
                <div className={`font-display font-bold text-xl ${s.lbl === 'Errors' ? 'text-green' : 'text-gold2'}`}>{s.num}</div>
                <div className="text-[9px] text-muted tracking-wider uppercase mt-0.5">{s.lbl}</div>
              </div>
            ))}
          </div>
          <button
            onClick={onDismiss}
            className="bg-gold text-earth font-bold text-[12px] uppercase tracking-wide px-5 py-2.5 hover:bg-gold2 transition-colors"
          >
            Enter →
          </button>
        </div>
      </div>
    </div>
  )
}

function PortfolioHero({
  totalUsd,
  chains,
  tokenCount,
  nftCount,
}: {
  totalUsd: string
  chains: WalletChainSummary[]
  tokenCount: number
  nftCount: number
}) {
  const { openSheet } = useUIStore()
  const chainBreakdown = chains.filter((chain) => parseUsdAmount(chain.totalUsd) > 0)
  const totalValue = Math.max(parseUsdAmount(totalUsd), 0.01)
  return (
    <Card kente className="mx-4 mt-3">
      <div className="p-4">
        <div className="text-[9px] font-bold tracking-[0.2em] text-muted uppercase mb-2">Total Portfolio Value</div>
        <div className="font-display font-black text-[2.8rem] leading-none">
          <span className="text-gold2">$</span>
          {totalUsd.replace('$','').split('.')[0]}
          <span className="text-2xl text-muted font-bold">.{totalUsd.split('.')[1] ?? '00'}</span>
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="bg-clay border border-border text-text2 text-[10px] font-bold font-mono px-2.5 py-1">
            {chains.length} active {chains.length === 1 ? 'chain' : 'chains'}
          </span>
          <span className="text-[10px] text-muted">{tokenCount} tokens · {nftCount} NFTs</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex border-t border-border">
        {[
          { label: 'Base',      value: formatChainTotal(chains, 8453),  color: colors.chains.base },
          { label: 'Ethereum',  value: formatChainTotal(chains, 1),     color: colors.chains.eth  },
          { label: 'Assets',    value: String(tokenCount + nftCount),   color: colors.gold2       },
        ].map((s, i) => (
          <div key={s.label} className={`flex-1 p-3 ${i < 2 ? 'border-r border-border' : ''}`}>
            <div className="font-display font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] text-muted uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-t border-border">
        {[
          { label: 'Send',    icon: '↑', sheet: 'send'    as const, color: colors.kola   },
          { label: 'Receive', icon: '↓', sheet: 'receive' as const, color: colors.green  },
          { label: 'Swap',    icon: '⇄', sheet: 'swap'    as const, color: colors.gold   },
          { label: 'Bridge',  icon: '⛓', sheet: 'bridge'  as const, color: colors.teal   },
        ].map(a => (
          <button
            key={a.label}
            onClick={() => openSheet(a.sheet)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 bg-clay2 border border-border hover:border-border2 transition-colors"
            style={{ borderTopWidth: 2, borderTopColor: a.color }}
          >
            <span className="text-base">{a.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-text2">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Chain bar */}
      <div className="flex h-1">
        {chainBreakdown.length ? chainBreakdown.map((chain) => (
          <div
            key={chain.chainId}
            className="flex-1"
            style={{
              flex: parseUsdAmount(chain.totalUsd) / totalValue,
              background: chain.chainId === 1 ? colors.chains.eth : colors.chains.base,
            }}
          />
        )) : (
          <div className="flex-1 bg-clay" />
        )}
      </div>
    </Card>
  )
}

const STRATEGY_CARDS = [
  { id: 'arb',    icon: '⚡', name: 'Arb Bot',   pnl: '+$847', sub: '23 runs · 30d',  accent: colors.kola,   status: 'On' },
  { id: 'yield',  icon: '🌾', name: 'Yield',      pnl: '+$312', sub: 'Aerodrome LP',   accent: colors.gold,   status: 'On' },
  { id: 'reb',    icon: '⚖️', name: 'Rebalance',  pnl: 'Range', sub: '±5% thresh',    accent: colors.teal,   status: 'Watch' },
  { id: 'brickt', icon: '🏗️', name: 'Brickt',     pnl: '+$64',  sub: 'Lagos · Abuja', accent: '#C8956A',     status: 'On' },
]

function StrategyCard({ id, icon, name, pnl, sub, accent, status }: typeof STRATEGY_CARDS[0]) {
  const router = useRouter()
  const isNeutral = id === 'reb'
  return (
    <button
      onClick={() => router.push(`/dashboard/strategy/${id}`)}
      className="flex-shrink-0 w-32 bg-soil border border-border text-left hover:border-border2 transition-all hover:-translate-y-0.5 relative overflow-hidden"
    >
      <div style={{ height: 2, background: accent }} />
      <div className="p-3">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[18px]">{icon}</span>
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 border tracking-wider uppercase"
            style={{ color: accent, borderColor: `${accent}40`, background: `${accent}15` }}
          >{status}</span>
        </div>
        <div className="text-[9px] font-bold text-muted uppercase tracking-wide mb-1.5">{name}</div>
        <div
          className="font-display font-bold text-lg leading-none"
          style={{ color: isNeutral ? colors.muted : colors.green }}
        >{pnl}</div>
        <div className="text-[9px] text-muted mt-1 font-mono">{sub}</div>
      </div>
    </button>
  )
}

function ActivityTab({ transactions, isLoading, error }: { transactions: any[]; isLoading: boolean; error: string | null }) {
  if (isLoading) return <EmptyTabState message="Loading wallet activity…" />
  if (error && !transactions.length) return <EmptyTabState message={error} />
  if (!transactions.length) return <EmptyTabState message="No wallet activity yet." />
  return (
    <div>
      {transactions.map((item: any, i: number) => (
        <div key={i} className="flex gap-3 items-start px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-clay/30 transition-colors">
          <div className={`w-7 h-7 flex items-center justify-center text-xs flex-shrink-0 border ${
            item.type === 'send' ? 'bg-kola/15 border-kola/20' :
            item.type === 'receive' ? 'bg-green/10 border-green/20' :
            'bg-teal/10 border-teal/20'
          }`}>{item.type === 'send' ? '↑' : item.type === 'receive' ? '↓' : '⌘'}</div>
          <div className="flex-1">
            <div className="text-[12px] text-cream">{formatActivityLabel(item)}</div>
            <div className="text-[10px] text-muted font-mono mt-1">
              {item.hash ? `${item.hash.slice(0, 10)}…${item.hash.slice(-4)}` : 'Pending hash'}
              {' · '}
              {item.chainId === 1 ? 'Ethereum' : 'Base'}
            </div>
            <div className="flex gap-2 mt-1 items-center">
              <div className={`w-1 h-1 rounded-full ${item.status === 'confirmed' ? 'bg-green' : 'bg-muted2'}`} />
              <span className="text-[10px] text-muted font-mono">{formatTime(item.timestamp)}</span>
              {item.valueUsd && <span className="text-[10px] font-bold text-green font-mono">{item.valueUsd}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AssetsTab({ tokens }: { tokens: any[] }) {
  if (!tokens.length) return <EmptyTabState message="No token balances found for this wallet yet." />
  const assets = [...tokens]
    .sort((a: any, b: any) => parseUsdAmount(b.balanceUsd) - parseUsdAmount(a.balanceUsd))
    .map((token: any) => ({
    symbol: token.symbol,
    icon: String(token.symbol ?? '?').slice(0, 1),
    amount: token.balanceFormatted,
    value: token.balanceUsd,
    name: token.name,
    chain: token.chainId === 1 ? 'ETH' : 'BASE',
    color: token.chainId === 1 ? colors.chains.eth : colors.chains.base,
  }))
  return (
    <div>
      {assets.map((a: any, i: number) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-clay/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center text-[10px] font-black font-mono border"
              style={{ background: `${a.color}20`, borderColor: `${a.color}35`, color: a.color }}
            >{a.icon}</div>
            <div>
              <div className="text-[13px] font-bold">{a.symbol}</div>
              <div className="text-[10px] text-muted">{a.name}</div>
              <span className="text-[8px] text-muted bg-clay border border-border px-1.5 py-0.5 font-mono">{a.chain}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] font-bold font-mono text-text2">{a.value}</div>
            <div className="text-[9px] text-muted font-mono mt-0.5">{a.amount}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function NFTsTab({ nfts, isLoading, error }: { nfts: WalletNftSummary[]; isLoading: boolean; error: string | null }) {
  if (isLoading) return <EmptyTabState message="Loading NFT collection…" />
  if (error && !nfts.length) return <EmptyTabState message={error} />
  if (!nfts.length) return <EmptyTabState message="No NFTs found for this wallet yet." />

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {nfts.map((nft) => (
        <div key={`${nft.chain}:${nft.tokenId}:${nft.collection}`} className="overflow-hidden border border-border bg-clay/30">
          <div className="aspect-square bg-clay border-b border-border flex items-center justify-center overflow-hidden">
            <NftArtwork nft={nft} />
          </div>
          <div className="p-3">
            <div className="text-[11px] font-bold text-text2 truncate">{nft.name ?? `#${nft.tokenId}`}</div>
            <div className="text-[10px] text-muted truncate mt-1">{nft.collection}</div>
            <div className="mt-2">
              <Badge variant="chain" color={nft.chain === 'ethereum' ? colors.chains.eth : colors.chains.base}>
                {nft.chain}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyTabState({ message }: { message: string }) {
  return <div className="p-6 text-sm text-muted leading-6">{message}</div>
}

function formatTime(timestamp?: number) {
  if (!timestamp) return 'Pending'
  return new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatRelativeSync(timestamp: number) {
  const diffMs = Date.now() - timestamp
  const minutes = Math.max(0, Math.floor(diffMs / (1000 * 60)))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function parseUsdAmount(value?: string) {
  if (!value) return 0
  return Number.parseFloat(value.replace(/[$,]/g, '')) || 0
}

function formatActivityLabel(item: any) {
  if (item.type === 'contract') {
    const raw = String(item.valueFormatted ?? '').trim()
    return raw && raw !== '0 ETH' ? raw : 'Contract interaction'
  }
  return item.valueFormatted ?? item.type
}

function formatChainTotal(chains: WalletChainSummary[], chainId: number) {
  const chain = chains.find((entry) => entry.chainId === chainId)
  return chain?.totalUsd ?? '$0.00'
}

function NftArtwork({ nft }: { nft: WalletNftSummary }) {
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
      className="flex h-full w-full items-center justify-center text-[1.4rem] font-display font-black tracking-[0.18em]"
      style={{
        background: `linear-gradient(135deg, ${colors.clay2} 0%, ${colors.earth} 100%)`,
        color: nft.chain === 'ethereum' ? colors.chains.eth : colors.chains.base,
      }}
    >
      {initials}
    </div>
  )
}

function ChainMenu() {
  const chains = [
    { name: 'Base',      sub: 'L2 · Coinbase', color: colors.chains.base,  active: true  },
    { name: 'Ethereum',  sub: 'L1 · Mainnet',  color: colors.chains.eth,   active: true  },
  ]
  return (
    <div className="absolute top-full right-0 mt-1.5 w-56 bg-soil border border-border z-20 shadow-dark">
      <div className="text-[9px] font-bold tracking-[0.16em] text-muted uppercase px-3 py-2.5 border-b border-border">Connected Networks</div>
      {chains.map(c => (
        <div key={c.name} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-clay transition-colors cursor-pointer">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
          <div className="flex-1">
            <div className="text-[12px] font-bold">{c.name}</div>
            <div className="text-[9px] text-muted">{c.sub}</div>
          </div>
          <Badge variant={c.active ? 'active' : 'paused'}>{c.active ? '● ON' : 'OFF'}</Badge>
        </div>
      ))}
    </div>
  )
}
