import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Longevity IA — Análisis de Laboratorio con IA',
  description: 'Plataforma médica de longevidad con análisis de laboratorio impulsada por inteligencia artificial',
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
              background: '#0a1628',
              border: '1px solid #1a2d4a',
              color: '#e2e8f0',
            },
          }}
        />
      </body>
    </html>
  )
}
