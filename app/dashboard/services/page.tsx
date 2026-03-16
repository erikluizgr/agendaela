'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Scissors, Plus, X, Loader2, Pencil, Trash2, Clock, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Service {
  id:               string
  name:             string
  description:      string | null
  duration_minutes: number
  price:            number
  color:            string
  is_active:        boolean
}

const DURATION_OPTS = [15, 30, 45, 60, 90, 120]

const COLORS = [
  '#B565A7', // roxo-rosa (padrão)
  '#7C5CBF', // violeta
  '#10B981', // verde
  '#F59E0B', // âmbar
  '#EF4444', // vermelho
  '#3B82F6', // azul
  '#EC4899', // rosa
  '#14B8A6', // teal
]

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`
}

function fmtPrice(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading,  setLoading]  = useState(true)
  const [userId,   setUserId]   = useState<string | null>(null)
  const [modal,    setModal]    = useState<{ open: boolean; service?: Service }>({ open: false })
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('profile_id', user.id)
        .order('name')

      if (data) setServices(data)
      setLoading(false)
    }
    init()
  }, [])

  function handleSaved(service: Service) {
    setServices(prev => {
      const exists = prev.some(s => s.id === service.id)
      return exists
        ? prev.map(s => s.id === service.id ? service : s)
        : [...prev, service].sort((a, b) => a.name.localeCompare(b.name))
    })
    setModal({ open: false })
  }

  async function handleToggleActive(service: Service) {
    const updated = { ...service, is_active: !service.is_active }
    setServices(prev => prev.map(s => s.id === service.id ? updated : s))
    await supabase
      .from('services')
      .update({ is_active: updated.is_active })
      .eq('id', service.id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este serviço? Agendamentos existentes não serão afetados.')) return
    setDeleting(id)
    await supabase.from('services').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  const active   = useMemo(() => services.filter(s => s.is_active), [services])
  const inactive = useMemo(() => services.filter(s => !s.is_active), [services])

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-sm text-gray-500 mt-0.5">{services.length} serviço{services.length !== 1 ? 's' : ''} cadastrado{services.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm"
          style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
        >
          <Plus size={16} /> Novo serviço
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#B565A7]" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20">
          <Scissors size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum serviço cadastrado</p>
          <button
            onClick={() => setModal({ open: true })}
            className="mt-3 text-sm text-[#B565A7] font-semibold hover:underline"
          >
            Adicionar primeiro serviço
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Ativos */}
          {active.length > 0 && (
            <ServiceGroup
              title="Ativos"
              services={active}
              deleting={deleting}
              onEdit={s => setModal({ open: true, service: s })}
              onDelete={handleDelete}
              onToggle={handleToggleActive}
            />
          )}

          {/* Inativos */}
          {inactive.length > 0 && (
            <ServiceGroup
              title="Inativos"
              services={inactive}
              deleting={deleting}
              onEdit={s => setModal({ open: true, service: s })}
              onDelete={handleDelete}
              onToggle={handleToggleActive}
              dimmed
            />
          )}
        </div>
      )}

      {modal.open && userId && (
        <ServiceModal
          service={modal.service}
          userId={userId}
          onClose={() => setModal({ open: false })}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ── ServiceGroup ──────────────────────────────────────────────────────────────

function ServiceGroup({
  title, services, deleting, onEdit, onDelete, onToggle, dimmed = false,
}: {
  title:    string
  services: Service[]
  deleting: string | null
  onEdit:   (s: Service) => void
  onDelete: (id: string) => void
  onToggle: (s: Service) => void
  dimmed?:  boolean
}) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{title}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        {services.map(service => (
          <ServiceRow
            key={service.id}
            service={service}
            deleting={deleting === service.id}
            onEdit={() => onEdit(service)}
            onDelete={() => onDelete(service.id)}
            onToggle={() => onToggle(service)}
            dimmed={dimmed}
          />
        ))}
      </div>
    </div>
  )
}

// ── ServiceRow ────────────────────────────────────────────────────────────────

function ServiceRow({
  service, deleting, onEdit, onDelete, onToggle, dimmed,
}: {
  service:  Service
  deleting: boolean
  onEdit:   () => void
  onDelete: () => void
  onToggle: () => void
  dimmed:   boolean
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 ${dimmed ? 'opacity-60' : ''}`}>
      {/* Color dot */}
      <div
        className="w-3 h-12 rounded-full shrink-0"
        style={{ backgroundColor: service.color }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{service.name}</p>
        {service.description && (
          <p className="text-xs text-gray-400 truncate">{service.description}</p>
        )}
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} /> {fmtDuration(service.duration_minutes)}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-600">
            <DollarSign size={11} /> {fmtPrice(service.price)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggle}
          title={service.is_active ? 'Desativar' : 'Ativar'}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {service.is_active
            ? <ToggleRight size={18} className="text-[#B565A7]" />
            : <ToggleLeft size={18} />
          }
        </button>
        <button
          onClick={onEdit}
          title="Editar"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Excluir"
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  )
}

// ── ServiceModal ──────────────────────────────────────────────────────────────

function ServiceModal({
  service, userId, onClose, onSaved,
}: {
  service?: Service
  userId:   string
  onClose:  () => void
  onSaved:  (s: Service) => void
}) {
  const [name,     setName]     = useState(service?.name             ?? '')
  const [desc,     setDesc]     = useState(service?.description      ?? '')
  const [duration, setDuration] = useState(service?.duration_minutes ?? 60)
  const [price,    setPrice]    = useState(service?.price?.toFixed(2).replace('.', ',') ?? '')
  const [color,    setColor]    = useState(service?.color            ?? COLORS[0])
  const [active,   setActive]   = useState(service?.is_active        ?? true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Informe o nome do serviço'); return }

    const priceNum = parseFloat(price.replace(',', '.'))
    if (isNaN(priceNum) || priceNum < 0) { setError('Preço inválido'); return }

    setSaving(true)
    setError('')

    const payload = {
      profile_id:       userId,
      name:             name.trim(),
      description:      desc.trim() || null,
      duration_minutes: duration,
      price:            priceNum,
      color,
      is_active:        active,
    }

    const query = service
      ? supabase.from('services').update(payload).eq('id', service.id).select('*').single()
      : supabase.from('services').insert(payload).select('*').single()

    const { data, error: err } = await query
    setSaving(false)
    if (err || !data) { setError(err?.message ?? 'Erro ao salvar'); return }
    onSaved(data as Service)
  }

  function handlePriceChange(v: string) {
    // Aceita apenas dígitos e vírgula/ponto
    const clean = v.replace(/[^0-9.,]/g, '')
    setPrice(clean)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10 flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {service ? 'Editar serviço' : 'Novo serviço'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Preview */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50"
          >
            <div className="w-2 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div>
              <p className="text-sm font-semibold text-gray-800">{name || 'Nome do serviço'}</p>
              <p className="text-xs text-gray-400">
                {fmtDuration(duration)} · {price ? `R$ ${price}` : 'R$ 0,00'}
              </p>
            </div>
          </div>

          {/* Nome */}
          <Field label="Nome do serviço *">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Manicure, Pedicure, Design de sobrancelha..."
              className={inputCls(!!error && !name)}
              autoFocus
            />
          </Field>

          {/* Descrição */}
          <Field label="Descrição (opcional)">
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Ex: Inclui esmaltação em gel"
              className={inputCls(false)}
            />
          </Field>

          {/* Duração + Preço */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duração">
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#B565A7] focus:ring-2 focus:ring-[#B565A7]/20"
              >
                {DURATION_OPTS.map(d => (
                  <option key={d} value={d}>{fmtDuration(d)}</option>
                ))}
              </select>
            </Field>

            <Field label="Preço (R$)">
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20">
                <span className="text-sm text-gray-400 shrink-0">R$</span>
                <input
                  value={price}
                  onChange={e => handlePriceChange(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
                />
              </div>
            </Field>
          </div>

          {/* Cor */}
          <Field label="Cor do serviço">
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </Field>

          {/* Ativo toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-semibold text-gray-700">Serviço ativo</p>
              <p className="text-xs text-gray-400">Aparece no link público de agendamento</p>
            </div>
            <button
              onClick={() => setActive(v => !v)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${
                active ? 'bg-[#B565A7]' : 'bg-gray-200'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                active ? 'left-6' : 'left-0.5'
              }`} />
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold shadow-lg disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
          >
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Salvando...</>
              : service ? 'Salvar alterações' : 'Criar serviço'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function inputCls(invalid: boolean) {
  return [
    'w-full px-3 py-2.5 rounded-xl border text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#B565A7]/20 focus:border-[#B565A7] transition-all',
    invalid ? 'border-red-400' : 'border-gray-200',
  ].join(' ')
}
