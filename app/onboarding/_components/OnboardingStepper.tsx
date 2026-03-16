'use client'

import { usePathname } from 'next/navigation'
import { User, Scissors, Calendar, CheckCircle } from 'lucide-react'

const STEPS = [
  { path: '/onboarding/perfil',   label: 'Seu perfil',  icon: User        },
  { path: '/onboarding/servicos', label: 'Serviços',    icon: Scissors    },
  { path: '/onboarding/agenda',   label: 'Agenda',      icon: Calendar    },
  { path: '/onboarding/concluido',label: 'Tudo pronto!',icon: CheckCircle },
]

export function OnboardingStepper() {
  const pathname = usePathname()
  const currentIndex = STEPS.findIndex(s => pathname.startsWith(s.path))
  const progress = currentIndex === -1 ? 0 : ((currentIndex + 1) / STEPS.length) * 100

  return (
    <div className="w-full">
      {/* Barra de progresso */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #B565A7, #7C5CBF)',
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isDone    = currentIndex > i
          const isCurrent = currentIndex === i
          const Icon      = step.icon

          return (
            <div key={step.path} className="flex flex-col items-center gap-1.5 flex-1">
              {/* Ícone / número */}
              <div
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                  isDone
                    ? 'bg-[#B565A7] text-white shadow-sm'
                    : isCurrent
                      ? 'bg-white border-2 border-[#B565A7] text-[#B565A7] shadow-sm'
                      : 'bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                <Icon size={16} strokeWidth={2} />
              </div>

              {/* Label — oculto em telas muito pequenas */}
              <span
                className={[
                  'text-xs font-medium text-center leading-tight hidden sm:block',
                  isCurrent ? 'text-[#B565A7]' : isDone ? 'text-[#1A1A2E]' : 'text-gray-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step counter — mobile */}
      <p className="text-center text-xs text-[#6B7280] mt-3 sm:hidden">
        Etapa {currentIndex + 1} de {STEPS.length} — <span className="font-medium text-[#B565A7]">{STEPS[currentIndex]?.label}</span>
      </p>
    </div>
  )
}
