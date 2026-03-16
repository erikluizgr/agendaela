'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Phone, Mail, Calendar, Star, DollarSign, MessageCircle, CalendarPlus, Loader2, FileText } from 'lucide-react'
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

interface Appointment {
  id: string
  starts_at: string
  ends_at: string
  status: string
  price: number | null
  notes: string | null
  service: { name: string; color: string } | null
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado',     color: '#10B981' },
  completed: { label: 'Concluído',      color: '#6366F1' },
  cancelled: { label: 'Cancelado',      color: '#EF4444' },
  no_show:   { label: 'Não compareceu', color: '#F59E0B' },
}

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()

  const [client,       setClient]       = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: clientData }, { data: apptData }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).eq('profile_id', user.id).single(),
        supabase
          .from('appointments')
          .select('id, starts_at, ends_at, status, price, notes, service:services(name, color)')
          .eq('client_id', id)
          .eq('profile_id', user.id)
          .order('starts_at', { ascending: false })
          .limit(50),
      ])

      if (clientData) setClient(clientData)
      if (apptData)   setAppointments(apptData as unknown as Appointment[])
      setLoading(false)
    }
    load()
  }, [id])

  function openWhatsApp() {
    if (!client?.phone) return
    const phone = client.phone.replace(/\D/g, '')
    const br    = phone.startsWith('55') ? phone : `55${phone}`
    const msg   = encodeURIComponent(`Olá, ${client.full_name.split(' ')[0]}! 😊`)
    window.open(`https://wa.me/${br}?text=${msg}`, '_blank')
  }

  function bookForClient() {
    router.push(`/dashboard/agenda?client_id=${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 size={28} className="animate-spin text-[#B565A7]" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-gray-500">Cliente não encontrado.</p>
        <button onClick={() => router.back()} className="text-[#B565A7] font-semibold">← Voltar</button>
      </div>
    )
  }

  const completedAppts = appointments.filter(a => a.status === 'completed')

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={16} /> Clientes
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#B565A7] to-[#7C5CBF]" />
        <div className="px-5 pb-5 -mt-10 flex items-end justify-between gap-3 flex-wrap">
          <div className="flex items-end gap-4">
            <div className="ring-4 ring-white rounded-full">
              <Avatar src={null} name={client.full_name} size="xl" />
            </div>
            <div className="mb-1">
              <h1 className="text-xl font-bold text-gray-900">{client.full_name}</h1>
              <div className="flex flex-wrap gap-3 mt-1">
                {client.phone && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone size={13} /> {client.phone}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail size={13} /> {client.email}
                  </span>
                )}
                {client.birth_date && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar size={13} /> {format(parseISO(client.birth_date), 'd/MM', { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-1">
            {client.phone && (
              <button
                onClick={openWhatsApp}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
            )}
            <button
              onClick={bookForClient}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
            >
              <CalendarPlus size={15} /> Agendar
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Star size={18} className="text-[#B565A7]" />} label="Visitas" value={String(client.total_appointments)} />
        <StatCard icon={<DollarSign size={18} className="text-[#10B981]" />} label="Total gasto"
          value={`R$ ${client.total_spent.toFixed(2).replace('.', ',')}`} />
        <StatCard icon={<Calendar size={18} className="text-[#7C5CBF]" />} label="Última visita"
          value={client.last_appointment_at
            ? format(parseISO(client.last_appointment_at), "d 'de' MMM", { locale: ptBR })
            : '—'
          }
        />
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <FileText size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Observações</p>
            <p className="text-sm text-amber-800">{client.notes}</p>
          </div>
        </div>
      )}

      {/* Appointment history */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-gray-900">
          Histórico de atendimentos
          <span className="ml-2 text-sm font-normal text-gray-400">({appointments.length})</span>
        </h2>

        {appointments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Calendar size={36} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhum atendimento ainda</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {appointments.map(appt => {
              const st = STATUS_LABEL[appt.status] ?? STATUS_LABEL.confirmed
              const color = appt.service?.color ?? '#B565A7'
              return (
                <div key={appt.id} className="flex items-center justify-between px-4 py-3.5 gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: appt.status === 'completed' ? color : '#e5e7eb' }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {appt.service?.name ?? 'Serviço removido'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(parseISO(appt.starts_at), "d 'de' MMM yyyy, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {appt.price != null && (
                      <span className="text-sm font-semibold text-gray-700">
                        R$ {appt.price.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${st.color}15`, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col items-center gap-2">
      {icon}
      <p className="text-xs text-gray-500 text-center">{label}</p>
      <p className="text-sm font-bold text-gray-800 text-center">{value}</p>
    </div>
  )
}
