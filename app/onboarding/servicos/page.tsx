'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scissors, Plus, Trash2, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, Loader2,
} from 'lucide-react'
import { saveServices, loadOnboardingData } from '../actions'

interface Service {
  id:       string
  name:     string
  duration: number
  price:    number
  expanded: boolean
}

const SUGGESTIONS: Omit<Service, 'id' | 'expanded'>[] = [
  { name: 'Manicure',              duration: 45, price: 35  },
  { name: 'Pedicure',              duration: 60, price: 45  },
  { name: 'Design de Sobrancelha', duration: 30, price: 25  },
  { name: 'Extensão de Cílios',    duration: 90, price: 80  },
  { name: 'Limpeza de Pele',       duration: 60, price: 90  },
  { name: 'Depilação',             duration: 30, price: 40  },
]

const ICONS: Record<string, string> = {
  'Manicure':              '💅',
  'Pedicure':              '🦶',
  'Design de Sobrancelha': '✨',
  'Extensão de Cílios':    '👁️',
  'Limpeza de Pele':       '🌿',
  'Depilação':             '🪒',
}

let nextId = 1
const uid = () => `svc_${nextId++}`

export default function ServicosPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError]       = useState('')
  const [saving, setSaving]     = useState(false)

  // Carrega dados salvos
  useEffect(() => {
    loadOnboardingData().then(data => {
      if (data?.services && data.services.length > 0) {
        setServices(
          data.services.map(s => ({
            id:       uid(),
            name:     s.name,
            duration: s.duration_minutes,
            price:    Number(s.price),
            expanded: false,
          }))
        )
        setSelected(new Set(data.services.map((_, i) => `svc_${i + 1}`)))
      }
    })
  }, [])

  const toggleSuggestion = (s: typeof SUGGESTIONS[0]) => {
    const existing = services.find(svc => svc.name === s.name)
    if (existing) {
      // remove
      setServices(prev => prev.filter(svc => svc.id !== existing.id))
      setSelected(prev => { const n = new Set(prev); n.delete(existing.id); return n })
    } else {
      // add
      const id  = uid()
      setServices(prev => [...prev, { ...s, id, expanded: false }])
      setSelected(prev => new Set([...prev, id]))
    }
    setError('')
  }

  const isSelected = (name: string) => services.some(s => s.name === name)

  const updateService = (id: string, field: keyof Service, value: unknown) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const removeService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id))
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const addCustom = () => {
    const id = uid()
    setServices(prev => [...prev, { id, name: '', duration: 60, price: 0, expanded: true }])
    setSelected(prev => new Set([...prev, id]))
    setError('')
  }

  const validate = () => {
    if (services.length === 0) {
      setError('Adicione pelo menos um serviço para continuar.')
      return false
    }
    for (const s of services) {
      if (!s.name.trim()) {
        setError('Preencha o nome de todos os serviços.')
        return false
      }
    }
    return true
  }

  const handleContinue = async () => {
    if (!validate()) return
    setSaving(true)
    const result = await saveServices(
      services.map(s => ({ name: s.name.trim(), duration: s.duration, price: s.price }))
    )
    setSaving(false)
    if (result?.error) { setError(result.error); return }
    router.push('/onboarding/agenda')
  }

  return (
    <div className="animate-fade-slide-in space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Seus serviços 💇‍♀️</h1>
        <p className="text-[#6B7280] mt-1.5">
          Selecione os serviços que você oferece. Você pode editar preço e duração à vontade!
        </p>
      </div>

      {/* Sugestões rápidas */}
      <div>
        <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Selecione os que você oferece</p>
        <div className="grid grid-cols-2 gap-2.5">
          {SUGGESTIONS.map(s => {
            const active = isSelected(s.name)
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => toggleSuggestion(s)}
                className={[
                  'flex flex-col items-start gap-1 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-95',
                  active
                    ? 'border-[#B565A7] bg-[#B565A7]/5'
                    : 'border-gray-100 bg-white hover:border-gray-200',
                ].join(' ')}
              >
                <span className="text-xl">{ICONS[s.name] || '✂️'}</span>
                <span className={`text-sm font-semibold ${active ? 'text-[#B565A7]' : 'text-[#1A1A2E]'}`}>
                  {s.name}
                </span>
                <span className="text-xs text-[#6B7280]">
                  {s.duration}min · R${s.price}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Serviços selecionados (editáveis) */}
      {services.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3">
            {services.length} serviço{services.length !== 1 ? 's' : ''} selecionado{services.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {services.map(s => (
              <div
                key={s.id}
                className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm"
              >
                {/* Header do card */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <Scissors size={16} className="text-[#B565A7] shrink-0" />
                  <input
                    value={s.name}
                    onChange={e => updateService(s.id, 'name', e.target.value)}
                    placeholder="Nome do serviço"
                    className="flex-1 text-sm font-medium text-[#1A1A2E] bg-transparent focus:outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => updateService(s.id, 'expanded', !s.expanded)}
                    className="text-gray-400 hover:text-[#B565A7] transition-colors"
                    aria-label={s.expanded ? 'Fechar' : 'Editar'}
                  >
                    {s.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeService(s.id)}
                    className="text-gray-300 hover:text-[#EF4444] transition-colors"
                    aria-label="Remover serviço"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Edição inline */}
                {s.expanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-50 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-[#6B7280] font-medium">Duração (min)</label>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={s.duration}
                        onChange={e => updateService(s.id, 'duration', Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[#6B7280] font-medium">Preço (R$)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.50}
                        value={s.price}
                        onChange={e => updateService(s.id, 'price', Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Resumo quando fechado */}
                {!s.expanded && (
                  <div className="px-4 pb-3 flex items-center gap-3">
                    <span className="text-xs text-[#6B7280]">⏱ {s.duration} min</span>
                    <span className="text-xs text-[#6B7280]">·</span>
                    <span className="text-xs font-semibold text-[#B565A7]">R$ {Number(s.price).toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adicionar personalizado */}
      <button
        type="button"
        onClick={addCustom}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-[#B565A7] font-medium hover:border-[#B565A7] hover:bg-[#B565A7]/5 transition-all"
      >
        <Plus size={16} />
        Adicionar serviço personalizado
      </button>

      {error && (
        <p className="text-sm text-[#EF4444] bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Navegação */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.push('/onboarding/perfil')}
          className="flex items-center gap-2 px-5 py-4 rounded-2xl border border-gray-200 text-sm text-[#6B7280] font-medium hover:bg-gray-50 transition-all active:scale-95"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <button
          onClick={handleContinue}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#B565A7]/30"
          style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Salvando...</>
          ) : (
            <>Continuar <ArrowRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  )
}
