'use client'

import { useState, useEffect, use } from 'react'
import { format, addDays, startOfDay, parseISO, isBefore, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, DollarSign, MapPin, Check, Loader2, Sparkles, Phone, Mail, User, Calendar } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  business_name: string | null
  full_name: string
  bio: string | null
  address: string | null
  avatar_url: string | null
  at_home_service: boolean
  slug: string
}

interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  color: string
}

interface WorkingDay {
  day_of_week: number
  is_active: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`
}

function maskPhone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2)  return `(${n}`
  if (n.length <= 6)  return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [profile,      setProfile]      = useState<Profile | null>(null)
  const [services,     setServices]     = useState<Service[]>([])
  const [workingDays,  setWorkingDays]  = useState<WorkingDay[]>([])
  const [loadingPage,  setLoadingPage]  = useState(true)
  const [notFound,     setNotFound]     = useState(false)

  // Booking state
  const [step,         setStep]         = useState<1 | 2 | 3 | 4 | 5>(1)
  const [service,      setService]      = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [calWeekStart, setCalWeekStart] = useState<Date>(startOfDay(new Date()))
  const [slots,        setSlots]        = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [clientName,   setClientName]   = useState('')
  const [clientPhone,  setClientPhone]  = useState('')
  const [clientEmail,  setClientEmail]  = useState('')
  const [formError,    setFormError]    = useState('')
  const [booking,      setBooking]      = useState(false)
  const [booked,       setBooked]       = useState<{ starts_at: string } | null>(null)

  // Load profile
  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); return }
        setProfile(d.profile)
        setServices(d.services)
        setWorkingDays(d.workingHours)
      })
      .finally(() => setLoadingPage(false))
  }, [slug])

  // Load slots when date selected
  useEffect(() => {
    if (!selectedDate || !service) return
    setSlots([])
    setSelectedTime(null)
    setLoadingSlots(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    fetch(`/api/public/${slug}/availability?service_id=${service.id}&date=${dateStr}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, service, slug])

  // Which days are active
  const activeDays = new Set(workingDays.filter(d => d.is_active).map(d => d.day_of_week))

  function isDayAvailable(d: Date) {
    return activeDays.has(d.getDay()) && !isBefore(startOfDay(d), startOfDay(new Date()))
  }

  async function handleBook() {
    if (!clientName.trim()) { setFormError('Informe seu nome'); return }
    if (!clientPhone.trim()) { setFormError('Informe seu telefone'); return }
    setFormError('')
    setBooking(true)

    const res = await fetch(`/api/public/${slug}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:   service!.id,
        date:         format(selectedDate!, 'yyyy-MM-dd'),
        time:         selectedTime!,
        client_name:  clientName.trim(),
        client_phone: clientPhone,
        client_email: clientEmail.trim() || undefined,
      }),
    })
    const data = await res.json()
    setBooking(false)

    if (!res.ok) { setFormError(data.error ?? 'Erro ao agendar'); return }
    setBooked(data.appointment)
    setStep(5)
  }

  function addToGoogleCalendar() {
    if (!booked || !service) return
    const start = parseISO(booked.starts_at)
    const end   = new Date(start.getTime() + service.duration_minutes * 60_000)
    const fmt   = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const title = encodeURIComponent(`${service.name} — ${profile?.business_name ?? profile?.full_name}`)
    const loc   = encodeURIComponent(profile?.address ?? '')
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(start)}/${fmt(end)}&location=${loc}`,
      '_blank'
    )
  }

  // ── Loading / Not found ───────────────────────────────────────────────────

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6ff] to-[#f0eaff] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#B565A7]" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6ff] to-[#f0eaff] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Sparkles size={36} className="text-[#B565A7]" />
        <h1 className="text-xl font-bold text-gray-800">Página não encontrada</h1>
        <p className="text-gray-500 text-sm">Este link não existe ou foi desativado.</p>
        <a href="/" className="text-sm text-[#B565A7] font-semibold hover:underline">Conheça o AgendaEla →</a>
      </div>
    )
  }

  const displayName = profile.business_name ?? profile.full_name

  // ── Success screen ────────────────────────────────────────────────────────

  if (step === 5 && booked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdf6ff] to-[#f0eaff] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-7 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check size={30} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Agendamento confirmado!</h2>
            <p className="text-sm text-gray-500 mt-1">Até logo, {clientName.split(' ')[0]}!</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2">
            <Row icon={<Sparkles size={14} className="text-[#B565A7]" />} label={service!.name} />
            <Row icon={<Calendar size={14} className="text-[#7C5CBF]" />}
              label={format(parseISO(booked.starts_at), "d 'de' MMMM, HH:mm", { locale: ptBR })} />
            {profile.address && (
              <Row icon={<MapPin size={14} className="text-gray-400" />} label={profile.address} />
            )}
          </div>
          <button
            onClick={addToGoogleCalendar}
            className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Calendar size={15} /> Adicionar ao Google Calendar
          </button>
          <button
            onClick={() => { setStep(1); setService(null); setSelectedDate(null); setSelectedTime(null); setBooked(null) }}
            className="text-sm text-[#B565A7] font-semibold hover:underline"
          >
            Fazer outro agendamento
          </button>
        </div>
        <PoweredBy />
      </div>
    )
  }

  // ── Header (profile) ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf6ff] to-[#f0eaff]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Profile header */}
        <div className="text-center space-y-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover mx-auto ring-4 ring-white shadow-md"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full mx-auto ring-4 ring-white shadow-md flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            {profile.bio && <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">{profile.bio}</p>}
            {profile.address && (
              <p className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
                <MapPin size={12} /> {profile.address}
              </p>
            )}
          </div>
        </div>

        {/* Steps */}
        {step === 1 && (
          <StepServices
            services={services}
            onSelect={s => { setService(s); setStep(2) }}
          />
        )}

        {step === 2 && service && (
          <StepDate
            service={service}
            weekStart={calWeekStart}
            selectedDate={selectedDate}
            isDayAvailable={isDayAvailable}
            onPrevWeek={() => setCalWeekStart(d => addDays(d, -7))}
            onNextWeek={() => setCalWeekStart(d => addDays(d, 7))}
            onSelectDate={d => { setSelectedDate(d); setStep(3) }}
            onBack={() => { setStep(1); setService(null) }}
          />
        )}

        {step === 3 && service && selectedDate && (
          <StepTime
            service={service}
            date={selectedDate}
            slots={slots}
            loading={loadingSlots}
            selectedTime={selectedTime}
            onSelectTime={t => setSelectedTime(t)}
            onContinue={() => { if (selectedTime) setStep(4) }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <StepForm
            service={service!}
            date={selectedDate!}
            time={selectedTime!}
            clientName={clientName}
            clientPhone={clientPhone}
            clientEmail={clientEmail}
            error={formError}
            booking={booking}
            onNameChange={setClientName}
            onPhoneChange={v => setClientPhone(maskPhone(v))}
            onEmailChange={setClientEmail}
            onBook={handleBook}
            onBack={() => setStep(3)}
          />
        )}

        <PoweredBy />
      </div>
    </div>
  )
}

// ── Step 1: Service selection ─────────────────────────────────────────────────

function StepServices({ services, onSelect }: { services: Service[]; onSelect: (s: Service) => void }) {
  return (
    <div className="space-y-3">
      <SectionTitle>Escolha um serviço</SectionTitle>
      {services.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-8">Nenhum serviço disponível no momento.</p>
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[#B565A7] hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: s.color || '#B565A7' }}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={11} /> {fmtDuration(s.duration_minutes)}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-sm font-bold text-[#B565A7] shrink-0">{fmtPrice(s.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step 2: Date selection ────────────────────────────────────────────────────

function StepDate({
  service, weekStart, selectedDate, isDayAvailable,
  onPrevWeek, onNextWeek, onSelectDate, onBack,
}: {
  service: Service
  weekStart: Date
  selectedDate: Date | null
  isDayAvailable: (d: Date) => boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onSelectDate: (d: Date) => void
  onBack: () => void
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = startOfDay(new Date())
  const canGoPrev = isBefore(today, weekStart)

  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />
      <ServiceChip service={service} />
      <SectionTitle>Escolha uma data</SectionTitle>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onPrevWeek}
            disabled={!canGoPrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-700 capitalize">
            {format(weekStart, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={onNextWeek} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-gray-400 pb-1">{d}</div>
          ))}
          {days.map((day, i) => {
            const available = isDayAvailable(day)
            const isSelected = selectedDate ? format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') : false
            const todayDay  = isToday(day)
            return (
              <button
                key={i}
                onClick={() => available && onSelectDate(day)}
                disabled={!available}
                className={[
                  'flex flex-col items-center py-2 rounded-xl text-sm font-medium transition-all',
                  isSelected   ? 'bg-[#B565A7] text-white shadow-sm'
                  : available  ? 'hover:bg-[#B565A7]/10 text-gray-700'
                               : 'text-gray-300 cursor-not-allowed',
                  todayDay && !isSelected ? 'ring-1 ring-[#B565A7]' : '',
                ].join(' ')}
              >
                <span className="text-xs">{format(day, 'EEE', { locale: ptBR })}</span>
                <span>{format(day, 'd')}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Time slot selection ───────────────────────────────────────────────

function StepTime({
  service, date, slots, loading, selectedTime,
  onSelectTime, onContinue, onBack,
}: {
  service: Service
  date: Date
  slots: string[]
  loading: boolean
  selectedTime: string | null
  onSelectTime: (t: string) => void
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />
      <ServiceChip service={service} />
      <SectionTitle>
        Horários disponíveis — {format(date, "d 'de' MMMM", { locale: ptBR })}
      </SectionTitle>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-[#B565A7]" />
        </div>
      ) : slots.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-gray-400 text-sm">Nenhum horário disponível neste dia.</p>
          <button onClick={onBack} className="mt-2 text-sm text-[#B565A7] font-semibold hover:underline">
            Escolher outra data
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {slots.map(slot => (
              <button
                key={slot}
                onClick={() => onSelectTime(slot)}
                className={[
                  'py-2.5 rounded-xl text-sm font-semibold transition-all border',
                  selectedTime === slot
                    ? 'bg-[#B565A7] text-white border-[#B565A7] shadow-sm'
                    : 'bg-white text-gray-700 border-gray-100 hover:border-[#B565A7] hover:text-[#B565A7]',
                ].join(' ')}
              >
                {slot}
              </button>
            ))}
          </div>
          <button
            onClick={onContinue}
            disabled={!selectedTime}
            className="w-full py-3.5 rounded-2xl text-white font-semibold shadow-sm disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
          >
            Continuar
          </button>
        </>
      )}
    </div>
  )
}

// ── Step 4: Client form ───────────────────────────────────────────────────────

function StepForm({
  service, date, time,
  clientName, clientPhone, clientEmail,
  error, booking,
  onNameChange, onPhoneChange, onEmailChange,
  onBook, onBack,
}: {
  service: Service
  date: Date
  time: string
  clientName: string
  clientPhone: string
  clientEmail: string
  error: string
  booking: boolean
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onEmailChange: (v: string) => void
  onBook: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Resumo</p>
        <Row icon={<Sparkles size={14} className="text-[#B565A7]" />} label={`${service.name} — ${fmtPrice(service.price)}`} />
        <Row icon={<Clock size={14} className="text-gray-400" />} label={fmtDuration(service.duration_minutes)} />
        <Row icon={<Calendar size={14} className="text-[#7C5CBF]" />}
          label={`${format(date, "d 'de' MMMM", { locale: ptBR })} às ${time}`} />
      </div>

      <SectionTitle>Seus dados</SectionTitle>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <FormField icon={<User size={14} />} placeholder="Nome completo *" value={clientName} onChange={onNameChange} />
        <FormField icon={<Phone size={14} />} placeholder="(11) 99999-9999 *" value={clientPhone} onChange={onPhoneChange} type="tel" />
        <FormField icon={<Mail size={14} />} placeholder="E-mail (opcional)" value={clientEmail} onChange={onEmailChange} type="email" />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}

      <button
        onClick={onBook}
        disabled={booking}
        className="w-full py-3.5 rounded-2xl text-white font-semibold shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
      >
        {booking ? <><Loader2 size={18} className="animate-spin" /> Agendando...</> : 'Confirmar agendamento'}
      </button>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold text-gray-800">{children}</h2>
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
    >
      <ChevronLeft size={16} /> Voltar
    </button>
  )
}

function ServiceChip({ service }: { service: Service }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: service.color || '#B565A7' }}>
      {service.name}
    </div>
  )
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="shrink-0 text-gray-400">{icon}</span>
      {label}
    </div>
  )
}

function FormField({ icon, placeholder, value, onChange, type = 'text' }: {
  icon: React.ReactNode
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20 transition-all">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm outline-none text-gray-800 placeholder:text-gray-400"
      />
    </div>
  )
}

function PoweredBy() {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-2 pb-6">
      <Sparkles size={12} className="text-[#B565A7]" />
      <span className="text-xs text-gray-400">
        Agendamento via <span className="font-semibold text-[#B565A7]">AgendaEla</span>
      </span>
    </div>
  )
}
