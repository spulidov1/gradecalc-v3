import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Grade Calc',
  description: 'Invert · Slope · Structure calculator for field crews',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  )
}
