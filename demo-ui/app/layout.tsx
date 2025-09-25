import type { Metadata } from 'next'
import { ThemeProvider } from './contexts/ThemeContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forecasting Assistant Demo',
  description: 'AI-powered time series forecasting chatbot interface',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}