'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { AnaraLogo, ChainLogo, LiveDot } from '../../components/ui'
import { colors } from '../../lib/ui-tokens'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-earth text-cream">
      <DesktopSidebar />
      <div className="lg:pl-[292px]">
        {children}
      </div>
    </div>
  )
}

function DesktopSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[292px] flex-col border-r border-border bg-soil">
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(212,146,10,0.12), transparent 26%), radial-gradient(circle at bottom left, rgba(12,86,110,0.16), transparent 34%)',
        }}
      />

      <div className="relative px-6 py-7 border-b border-border">
        <div className="flex items-center gap-3">
          <AnaraLogo size={36} />
          <div>
            <div className="font-display font-black text-xl leading-tight">Amara</div>
            <div className="mt-1 text-[9px] text-muted tracking-widest uppercase">Wallet Command Center</div>
          </div>
        </div>
      </div>

      <div className="relative px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 border border-green/25 bg-green/5 px-3 py-2">
          <LiveDot />
          <span className="text-[10px] font-bold text-green tracking-[0.18em] uppercase">Agent Ready</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted font-mono">
          <ChainLogo chainId={8453} size={14} />
          <ChainLogo chainId={1} size={14} />
          <ChainLogo chainId={56} size={14} />
          <span>Base + Ethereum + BNB</span>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-4 py-6 space-y-7">
        <SidebarSection
          title="Workspace"
          items={[
            { href: '/dashboard', label: 'Overview', icon: '◫' },
            { href: '/dashboard/chat', label: 'Chat', icon: '✦' },
          ]}
          pathname={pathname}
        />

        <SidebarSection
          title="Strategies"
          items={[
            { href: '/dashboard/strategy/reb', label: 'Rebalance', icon: '⚖', accent: colors.teal },
            { href: '/dashboard/strategy/yield', label: 'Yield', icon: '◇', accent: colors.gold },
            { href: '/dashboard/strategy/arb', label: 'Arbitrage', icon: '⚡', accent: colors.kola },
            { href: '/dashboard/strategy/brickt', label: 'Brickt', icon: '▦', accent: '#C8956A' },
          ]}
          pathname={pathname}
        />
      </nav>

      <div className="relative border-t border-border px-6 py-4">
        <div className="text-[10px] text-muted leading-5">
          Confirmed execution only. Direct wallet actions and chat-native flows share the same transaction pipeline.
        </div>
      </div>
    </aside>
  )
}

function SidebarSection({
  title,
  items,
  pathname,
}: {
  title: string
  pathname: string
  items: Array<{ href: string; label: string; icon: string; accent?: string }>
}) {
  const [isNavigating, startNavigation] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  return (
    <section>
      <div className="mb-3 px-2 text-[9px] font-bold tracking-[0.2em] text-muted uppercase">{title}</div>
      <div className="space-y-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const pending = isNavigating && pendingHref === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setPendingHref(item.href)
                startNavigation(() => {})
              }}
              className={`flex items-center gap-3 border px-3 py-3.5 transition-colors ${
                active
                  ? 'border-border2 bg-clay text-cream shadow-[0_0_0_1px_rgba(228,228,228,0.02)]'
                  : 'border-transparent text-text2 hover:border-border hover:bg-clay/45'
              } ${pending ? 'opacity-70' : ''}`}
              style={active && item.accent ? { boxShadow: `inset 3px 0 0 ${item.accent}` } : undefined}
            >
              <span
                className="flex h-8 w-8 items-center justify-center border border-border/50 bg-earth/35 text-[12px] font-bold"
                style={item.accent ? { color: item.accent } : undefined}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-bold uppercase tracking-[0.08em]">{item.label}</div>
                <div className="text-[10px] text-muted">
                  {pending ? 'Opening…' : active ? 'Current view' : 'Open'}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
