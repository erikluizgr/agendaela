import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default:  'AgendaEla — Agendamento para Profissionais de Estética',
    template: '%s | AgendaEla',
  },
  description:
    'Plataforma de agendamento inteligente para profissionais autônomas de estética e beleza.',
  keywords: ['agendamento', 'estética', 'beleza', 'manicure', 'SaaS'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
