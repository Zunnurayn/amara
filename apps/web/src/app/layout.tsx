import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title:       'Amara Wallet — AI-Assisted Base + Ethereum Wallet',
  description: 'AI-assisted wallet for Base and Ethereum. Review route previews, confirm execution, and track wallet activity.',
  icons: {
    icon:  '/anara-icon.svg',
    apple: '/anara-icon.svg',
  },
  openGraph: {
    title:       'Amara Wallet',
    description: 'AI-assisted wallet for Base and Ethereum with confirmation-based execution.',
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
