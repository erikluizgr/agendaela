import { OnboardingStepper } from './_components/OnboardingStepper'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Configurar minha conta',
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <span
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #B565A7, #7C5CBF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AgendaEla
          </span>
          <span className="text-xs text-[#6B7280]">Configuração inicial</span>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-gray-50 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <OnboardingStepper />
        </div>
      </div>

      {/* Conteúdo da etapa */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
