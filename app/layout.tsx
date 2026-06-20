import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MONA AI — Agent Hub',
  description: 'MONA AI Hackathon 2026 — Multi-agent platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white`} style={{ height: '100vh', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
