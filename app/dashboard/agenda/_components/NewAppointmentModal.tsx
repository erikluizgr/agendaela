'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { X, Search, Plus, User, Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Appointment, Client, Service } from './types'

interface Props {
  initialDate?: Date
  initialTime?: string
  clients:      Client[]
  services:     Service[]
  supabase:     SupabaseClient
  userId:       string
  onClose:      () => void
  onCreated:    (appt: Appointment) => void
}

export function NewAppointmentModal({
  initialDate, initialTime, clients, services,
  supabase, userId, onClose, onCreated,
}: Props) {
  const today = initialDate ?? new Date()

  const [date,            setDate]            = useState(format(today, 'yyyy-MM-dd'))
  const [time,            setTime]            = useState(initialTime ?? '09:00')
  const [selectedClient,  setSelectedClient]  = useState<Client | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [notes,           setNotes]           = useState('')
  const [price,           setPrice]           = useState('')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')

  // Busca de clientes
  const [clientSearch,      setClientSearch]      = useState('')
  const [showDropdown,      setShowDropdown]      = useState(false)
  const [creatingClient,    setCreatingClient]    = useState(false)
  const [newClientName,     setNewClientName]     = useState('')
  const [newClientPhone,    setNewClientPhone]    = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  const filtered = clients
    .filter(c =>
      c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.phone ?? '').includes(clientSearch)
    )
    .slice(0, 8)

  // Preenche preço ao selecionar serviço
  useEffect(() => {
    if (selectedService) setPrice(selectedService.price.toFixed(2))
  }, [selectedService])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function buildEndsAt(startsAt: Date): Date {
    return new Date(startsAt.getTime() + (selectedService?.duration_minutes ?? 60) * 60_000)
  }

  function parseDateTime(): Date {
    const [y, mo, d] = date.split('-').map(Number)
    const [h, m]     = time.split(':').map(Number)
    return new Date(y, mo - 1, d, h, m)
  }

  const endTimeLabel = (() => {
    try { return format(buildEndsAt(parseDateTime()), 'HH:mm') } catch { return '—' }
  })()

  async function createNewClient(): Promise<Client | null> {
    if (!newClientName.trim()) return null
    const { data } = await supabase
      .from('clients')
      .insert({ profile_id: userId, full_name: newClientName.trim(), phone: newClientPhone.trim() || null })
      .select('id, full_name, phone, email, total_appointments, total_spent, last_appointment_at')
      .single()
    return data as Client | null
  }

  async function handleSubmit() {
    if (!date || !time) { setError('Informe data e horário'); return }
    setError('')
    setSaving(true)

    let client = selectedClient
    if (creatingClient && newClientName.trim()) {
      client = await createNewClient()
      if (!client) { setError('Erro ao criar cliente'); setSaving(false); return }
    }

    const startsAt = parseDateTime()
    const endsAt   = buildEndsAt(startsAt)

    const { data, error: err } = await supabase
      .from('appointments')
      .insert({
        profile_id: userId,
        client_id:  client?.id  ?? null,
        service_id: selectedService?.id ?? null,
        starts_at:  startsAt.toISOString(),
        ends_at:    endsAt.toISOString(),
        notes:      notes.trim() || null,
        price:      price ? parseFloat(price) : (selectedService?.price ?? null),
      })
      .select(`
        *,
        client:clients(id, full_name, phone, email, total_appointments, total_spent, last_appointment_at),
        service:services(id, name, description, duration_minutes, price, color)
      `)
      .single()

    setSaving(false)
    if (err || !data) { setError(err?.message ?? 'Erro ao criar agendamento'); return }
    onCreated(data as Appointment)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10 flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Novo agendamento</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* ── Cliente ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Cliente</label>

            {creatingClient ? (
              <div className="space-y-2 p-3 rounded-xl border border-[#B565A7]/40 bg-[#B565A7]/5">
                <p className="text-xs font-bold text-[#B565A7] uppercase tracking-wide">Novo cliente</p>
                <input
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Nome completo *"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-[#B565A7] focus:ring-1 focus:ring-[#B565A7]"
                />
                <input
                  value={newClientPhone}
                  onChange={e => setNewClientPhone(e.target.value)}
                  placeholder="Telefone (opcional)"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-[#B565A7] focus:ring-1 focus:ring-[#B565A7]"
                />
                <button
                  onClick={() => setCreatingClient(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Buscar cliente existente
                </button>
              </div>
            ) : selectedClient ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#B565A7] bg-[#B565A7]/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#B565A7]/20 flex items-center justify-center shrink-0">
                    <User size={15} className="text-[#B565A7]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{selectedClient.full_name}</p>
                    {selectedClient.phone && (
                      <p className="text-xs text-gray-500">{selectedClient.phone}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div ref={searchRef} className="relative">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20 transition-all">
                  <Search size={15} className="text-gray-400 shrink-0" />
                  <input
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar por nome ou telefone..."
                    className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
                  />
                </div>
                {showDropdown && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-20">
                    <button
                      onMouseDown={e => { e.preventDefault(); setCreatingClient(true); setShowDropdown(false) }}
                      className="flex items-center gap-2 w-full px-3 py-3 text-sm text-[#B565A7] font-semibold hover:bg-[#B565A7]/5 transition-colors border-b border-gray-50"
                    >
                      <Plus size={15} /> Novo cliente
                    </button>
                    {filtered.length === 0 && clientSearch && (
                      <p className="px-3 py-3 text-sm text-gray-400 text-center">Nenhum cliente encontrado</p>
                    )}
                    {filtered.map(c => (
                      <button
                        key={c.id}
                        onMouseDown={e => {
                          e.preventDefault()
                          setSelectedClient(c)
                          setClientSearch('')
                          setShowDropdown(false)
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#B565A7]/10 flex items-center justify-center shrink-0">
                          <User size={13} className="text-[#B565A7]" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{c.full_name}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                        </div>
                        {c.total_appointments > 0 && (
                          <span className="ml-auto text-xs text-gray-400 shrink-0">
                            {c.total_appointments}x
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Serviço ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Serviço</label>
            <select
              value={selectedService?.id ?? ''}
              onChange={e => setSelectedService(services.find(s => s.id === e.target.value) ?? null)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#B565A7] focus:ring-2 focus:ring-[#B565A7]/20 bg-white"
            >
              <option value="">Selecione um serviço</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.duration_minutes}min — R${s.price.toFixed(2).replace('.', ',')}
                </option>
              ))}
            </select>
          </div>

          {/* ── Data e Hora ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#B565A7] focus:ring-2 focus:ring-[#B565A7]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Horário</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#B565A7] focus:ring-2 focus:ring-[#B565A7]/20"
              />
            </div>
          </div>

          {selectedService && (
            <p className="text-xs text-gray-500 -mt-2">
              Duração: <strong>{selectedService.duration_minutes}min</strong> · Término: <strong>{endTimeLabel}</strong>
            </p>
          )}

          {/* ── Valor ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Valor</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20 transition-all">
              <span className="text-sm font-medium text-gray-400">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0,00"
                className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* ── Observações ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Observações{' '}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: cliente prefere gel, alergia a acrílico..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#B565A7] focus:ring-2 focus:ring-[#B565A7]/20 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold shadow-lg shadow-[#B565A7]/25 disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
          >
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Salvando...</>
              : 'Confirmar agendamento'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
