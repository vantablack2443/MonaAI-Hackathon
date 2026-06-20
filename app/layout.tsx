import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Orion — Intelligent Agent Platform',
  description: 'Orion — AI agents for business automation',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ height: '100vh', overflow: 'hidden', background: '#050810', color: 'white' }}>
        <div className="orb" style={{ width: 600, height: 600, background: '#4f46e5', top: '-200px', left: '-150px' }} />
        <div className="orb" style={{ width: 500, height: 500, background: '#7c3aed', top: '40%', right: '-100px' }} />
        <div className="orb" style={{ width: 400, height: 400, background: '#1d4ed8', bottom: '-100px', left: '30%' }} />
        <div style={{ position: 'relative', zIndex: 1, height: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
