'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, Plus, X, Loader2, ChevronRight, Phone, Mail, User } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Client {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  notes: string | null
  total_appointments: number
  total_spent: number
  last_appointment_at: string | null
}

type Sort = 'recent' | 'frequent' | 'spent'

function maskPhone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2)  return `(${n}`
  if (n.length <= 6)  return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

export default function ClientesPage() {
  const [clients,  setClients]  = useState<Client[]>([])
  const [search,   setSearch]   = useState('')
  const [sortBy,   setSortBy]   = useState<Sort>('recent')
  const [userId,   setUserId]   = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<{ open: boolean; client?: Client }>({ open: false })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', user.id)
      if (data) setClients(data)
      setLoading(false)
    }
    init()
  }, [])

  const filtered = useMemo(() => {
    let list = clients.filter(c =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
    )
    if (sortBy === 'recent')   list = list.sort((a, b) => (b.last_appointment_at ?? '').localeCompare(a.last_appointment_at ?? ''))
    if (sortBy === 'frequent') list = list.sort((a, b) => b.total_appointments - a.total_appointments)
    if (sortBy === 'spent')    list = list.sort((a, b) => b.total_spent - a.total_spent)
    return list
  }, [clients, search, sortBy])

  function handleSaved(client: Client) {
    setClients(prev => {
      const exists = prev.some(c => c.id === client.id)
      return exists ? prev.map(c => c.id === client.id ? client : c) : [client, ...prev]
    })
    setModal({ open: false })
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} clientes cadastrados</p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm"
          style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
        >
          <Plus size={16} /> Novo cliente
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white flex-1 min-w-48 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20 transition-all">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as Sort)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#B565A7]"
        >
          <option value="recent">Mais recentes</option>
          <option value="frequent">Mais frequentes</option>
          <option value="spent">Maior gasto</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#B565A7]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <User size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search ? 'Nenhum cliente encontrado' : 'Ainda sem clientes'}
          </p>
          {!search && (
            <button
              onClick={() => setModal({ open: true })}
              className="mt-3 text-sm text-[#B565A7] font-semibold hover:underline"
            >
              Adicionar primeiro cliente
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
            <span>Cliente</span>
            <span>Telefone</span>
            <span className="text-right">Visitas</span>
            <span className="text-right">Último atend.</span>
            <span className="text-right">Total gasto</span>
            <span />
          </div>

          {filtered.map((client, i) => (
            <div
              key={client.id}
              className={`flex sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar src={null} name={client.full_name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{client.full_name}</p>
                  {client.email && (
                    <p className="text-xs text-gray-400 truncate hidden sm:block">{client.email}</p>
                  )}
                </div>
              </div>

              <div className="hidden sm:block text-sm text-gray-600">{client.phone ?? '—'}</div>

              <div className="hidden sm:block text-sm text-gray-700 text-right font-medium">
                {client.total_appointments}
              </div>

              <div className="hidden sm:block text-sm text-gray-500 text-right">
                {client.last_appointment_at
                  ? format(parseISO(client.last_appointment_at), 'd MMM', { locale: ptBR })
                  : '—'
                }
              </div>

              <div className="hidden sm:block text-sm font-semibold text-gray-800 text-right">
                R$ {client.total_spent.toFixed(2).replace('.', ',')}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setModal({ open: true, client }) }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Editar"
                >
                  <User size={14} />
                </button>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && userId && (
        <ClientModal
          client={modal.client}
          userId={userId}
          onClose={() => setModal({ open: false })}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ── Modal de novo/editar cliente ──────────────────────────────────────────────
function ClientModal({
  client, userId, onClose, onSaved,
}: {
  client?: Client
  userId: string
  onClose: () => void
  onSaved: (c: Client) => void
}) {
  const [fullName,   setFullName]   = useState(client?.full_name   ?? '')
  const [phone,      setPhone]      = useState(client?.phone       ?? '')
  const [email,      setEmail]      = useState(client?.email       ?? '')
  const [birthDate,  setBirthDate]  = useState(client?.birth_date  ?? '')
  const [notes,      setNotes]      = useState(client?.notes       ?? '')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  async function handleSave() {
    if (!fullName.trim()) { setError('Nome obrigatório'); return }
    setSaving(true)
    setError('')

    const payload = {
      profile_id: userId,
      full_name:  fullName.trim(),
      phone:      phone   || null,
      email:      email   || null,
      birth_date: birthDate || null,
      notes:      notes   || null,
    }

    const query = client
      ? supabase.from('clients').update(payload).eq('id', client.id).select('*').single()
      : supabase.from('clients').insert(payload).select('*').single()

    const { data, error: err } = await query
    setSaving(false)
    if (err || !data) { setError(err?.message ?? 'Erro ao salvar'); return }
    onSaved(data as Client)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10 flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {client ? 'Editar cliente' : 'Novo cliente'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <Field label="Nome completo *">
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Maria da Silva"
              className={inputCls(!!error && !fullName)}
            />
          </Field>

          <Field label="Telefone *">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <input
                value={phone}
                onChange={e => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
              />
            </div>
          </Field>

          <Field label="E-mail (opcional)">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="maria@email.com"
                className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
              />
            </div>
          </Field>

          <Field label="Data de aniversário (opcional)">
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className={inputCls(false)}
            />
          </Field>

          <Field label="Observações (alergias, preferências...)">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: alergia a acetona, prefere gel..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#B565A7] focus:ring-2 focus:ring-[#B565A7]/20 resize-none"
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold shadow-lg disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
          >
            {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : 'Salvar cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
