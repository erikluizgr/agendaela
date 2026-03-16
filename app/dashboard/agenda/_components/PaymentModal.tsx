'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Appointment } from './types'

const METHODS = [
  { id: 'pix',         label: 'PIX',               emoji: '💰' },
  { id: 'cash',        label: 'Dinheiro',           emoji: '💵' },
  { id: 'credit_card', label: 'Crédito',            emoji: '💳' },
  { id: 'debit_card',  label: 'Débito',             emoji: '💳' },
] as const

const APPT_SELECT = `
  *,
  client:clients(id, full_name, phone, email, total_appointments, total_spent, last_appointment_at),
  service:services(id, name, description, duration_minutes, price, color)
`

interface Props {
  appointment: Appointment
  supabase:    SupabaseClient
  userId:      string
  onClose:     () => void
  onPaid:      (appt: Appointment) => void
}

export function PaymentModal({ appointment, supabase, userId, onClose, onPaid }: Props) {
  const [amount, setAmount] = useState(appointment.price?.toFixed(2) ?? '0.00')
  const [method, setMethod] = useState<string>('pix')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handlePay() {
    const value = parseFloat(amount)
    if (isNaN(value) || value < 0) { setError('Informe um valor válido'); return }

    setSaving(true)
    setError('')

    // Marca como concluído
    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment.id)
      .eq('profile_id', userId)
      .select(APPT_SELECT)
      .single()

    if (apptErr || !appt) {
      setError(apptErr?.message ?? 'Erro ao atualizar agendamento')
      setSaving(false)
      return
    }

    // Registra pagamento
    const { error: payErr } = await supabase
      .from('payments')
      .insert({
        appointment_id: appointment.id,
        profile_id:     userId,
        amount:         value,
        method,
        status:         'paid',
        paid_at:        new Date().toISOString(),
      })

    setSaving(false)
    if (payErr) { setError(payErr.message); return }
    onPaid(appt as Appointment)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Registrar pagamento</h2>
            <p className="text-sm text-gray-500">
              {appointment.client?.full_name ?? 'Sem cliente'}
              {appointment.service && ` · ${appointment.service.name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Valor */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Valor recebido</label>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 focus-within:border-[#10B981] focus-within:ring-2 focus-within:ring-[#10B981]/20 transition-all">
              <span className="text-xl font-bold text-gray-400">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 text-3xl font-bold outline-none text-gray-900 tabular-nums"
              />
            </div>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={[
                    'flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all',
                    method === m.id
                      ? 'border-[#10B981] bg-[#10B981]/5 text-[#10B981]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span className="text-base">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            onClick={handlePay}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base shadow-lg disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> Registrando...</>
              : '✓ Registrar pagamento'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
