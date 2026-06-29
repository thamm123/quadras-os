import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'QUADRAS OS',
  description: 'QUADRAS Founder Operating System',
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      </head>
      <body>{children}</body>
    </html>
  )
}
