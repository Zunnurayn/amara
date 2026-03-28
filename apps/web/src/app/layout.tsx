import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title:       'Anara Wallet — Autonomous Multichain',
  description: 'The world\'s first autonomous multichain wallet. Agent-powered DeFi for everyone.',
  icons: {
    icon:  '/anara-icon.svg',
    apple: '/anara-icon.svg',
  },
  openGraph: {
    title:       'Anara Wallet',
    description: 'Autonomous multichain wallet. Your agent works while you sleep.',
    images:      ['/anara-logo.svg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-earth text-cream font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
