import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Longevity IA — Análisis de Laboratorio con IA',
  description: 'Plataforma médica de longevidad con análisis de laboratorio impulsada por inteligencia artificial',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#0A1729',
              border: '1px solid #1A2E4C',
              color: '#E2DFD6',
            },
          }}
        />
      </body>
    </html>
  )
}
