import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap', // Prevent FOIT (flash of invisible text)
  preload: true,
})

export const metadata: Metadata = {
  title: 'Bakked CRM',
  description: 'WhatsApp Marketing Platform for Bakked',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to API for faster requests */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || ''} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || ''} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            className: 'text-sm',
          }}
        />
      </body>
    </html>
  )
}
