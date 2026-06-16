import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QUADRAS OS',
  description: 'QUADRAS Founder Operating System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
