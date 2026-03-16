'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Download, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Payment {
  id: string
  amount: number
  method: string | null
  status: string
  paid_at: string | null
  appointment: {
    starts_at: string
    client: { full_name: string } | null
    service: { name: string } | null
  } | null
}

const METHOD_LABELS: Record<string, string> = {
  pix:         'PIX',
  cash:        'Dinheiro',
  credit_card: 'Crédito',
  debit_card:  'Débito',
}

const STATUS_FILTER_OPTS = [
  { value: 'all',     label: 'Todos' },
  { value: 'paid',    label: 'Pago' },
  { value: 'pending', label: 'Pendente' },
]

const METHOD_FILTER_OPTS = [
  { value: 'all',         label: 'Todos' },
  { value: 'pix',         label: 'PIX' },
  { value: 'cash',        label: 'Dinheiro' },
  { value: 'credit_card', label: 'Crédito' },
  { value: 'debit_card',  label: 'Débito' },
]

function fmt(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}

export default function FinanceiroPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [payments,     setPayments]     = useState<Payment[]>([])
  const [prevTotal,    setPrevTotal]    = useState(0)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!userId) return
    loadPayments()
  }, [currentMonth, userId])

  async function loadPayments() {
    setLoading(true)
    const monthStart = startOfMonth(currentMonth)
    const monthEnd   = endOfMonth(currentMonth)
    const prevStart  = startOfMonth(subMonths(currentMonth, 1))
    const prevEnd    = endOfMonth(subMonths(currentMonth, 1))

    const [{ data: curr }, { data: prev }] = await Promise.all([
      supabase
        .from('payments')
        .select(`id, amount, method, status, paid_at,
          appointment:appointments(starts_at, client:clients(full_name), service:services(name))`)
        .eq('profile_id', userId)
        .gte('paid_at', monthStart.toISOString())
        .lte('paid_at', monthEnd.toISOString())
        .order('paid_at', { ascending: false }),
      supabase
        .from('payments')
        .select('amount')
        .eq('profile_id', userId)
        .eq('status', 'paid')
        .gte('paid_at', prevStart.toISOString())
        .lte('paid_at', prevEnd.toISOString()),
    ])

    if (curr) setPayments(curr as unknown as Payment[])
    if (prev) setPrevTotal(prev.reduce((s, p) => s + p.amount, 0))
    setLoading(false)
  }

  const paidPayments = useMemo(() => payments.filter(p => p.status === 'paid'), [payments])

  const currTotal     = paidPayments.reduce((s, p) => s + p.amount, 0)
  const ticketMedio   = paidPayments.length > 0 ? currTotal / paidPayments.length : 0
  const pct           = pctChange(currTotal, prevTotal)

  // Weekly chart data
  const weeklyData = useMemo(() => {
    const weeks = [
      { semana: 'Sem 1', start: 1,  end: 7  },
      { semana: 'Sem 2', start: 8,  end: 14 },
      { semana: 'Sem 3', start: 15, end: 21 },
      { semana: 'Sem 4', start: 22, end: 28 },
      { semana: 'Sem 5', start: 29, end: 31 },
    ]
    return weeks.map(w => ({
      semana: w.semana,
      total: paidPayments
        .filter(p => {
          if (!p.paid_at) return false
          const day = parseISO(p.paid_at).getDate()
          return day >= w.start && day <= w.end
        })
        .reduce((s, p) => s + p.amount, 0),
    })).filter(w => w.total > 0 || parseInt(w.semana.split(' ')[1]) <= 4)
  }, [paidPayments])

  // Top 5 services
  const top5 = useMemo(() => {
    const map = new Map<string, { name: string; count: number; total: number }>()
    paidPayments.forEach(p => {
      const name = p.appointment?.service?.name ?? 'Sem serviço'
      const key  = name
      const cur  = map.get(key) ?? { name, count: 0, total: 0 }
      map.set(key, { ...cur, count: cur.count + 1, total: cur.total + p.amount })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [paidPayments])

  // Filtered transactions
  const filtered = useMemo(() => payments.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (methodFilter !== 'all' && p.method !== methodFilter) return false
    return true
  }), [payments, statusFilter, methodFilter])

  function exportCSV() {
    const headers = ['Data', 'Cliente', 'Serviço', 'Valor', 'Método', 'Status']
    const rows = filtered.map(p => [
      p.paid_at ? format(parseISO(p.paid_at), 'dd/MM/yyyy') : '',
      p.appointment?.client?.full_name ?? '',
      p.appointment?.service?.name ?? '',
      p.amount.toFixed(2),
      METHOD_LABELS[p.method ?? ''] ?? p.method ?? '',
      p.status === 'paid' ? 'Pago' : 'Pendente',
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `financeiro-${format(currentMonth, 'yyyy-MM')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header + nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-700 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              disabled={format(currentMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM')}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[#B565A7]" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Faturamento do mês"
              value={fmt(currTotal)}
              sub={pct !== null ? (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(pct)}% vs mês ant.
                </span>
              ) : null}
              accent="#B565A7"
            />
            <KpiCard
              label="Mês anterior"
              value={fmt(prevTotal)}
              accent="#7C5CBF"
            />
            <KpiCard
              label="Ticket médio"
              value={fmt(ticketMedio)}
              accent="#10B981"
            />
            <KpiCard
              label="Atendimentos"
              value={String(paidPayments.length)}
              accent="#F59E0B"
            />
          </div>

          {/* Chart + Top 5 */}
          <div className="grid sm:grid-cols-[1fr_280px] gap-4">
            {/* Bar chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Faturamento por semana</h2>
              {weeklyData.every(w => w.total === 0) ? (
                <div className="flex items-center justify-center h-36 text-gray-300 text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v ?? 0)), 'Faturamento']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {weeklyData.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? '#B565A7' : '#7C5CBF'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top 5 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">Top 5 serviços</h2>
              {top5.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {top5.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#B565A7]/10 text-[#B565A7] text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{s.name}</p>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(s.count / top5[0].count) * 100}%`,
                              background: 'linear-gradient(90deg, #B565A7, #7C5CBF)',
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 shrink-0">{s.count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-wrap gap-2">
              <h2 className="text-sm font-bold text-gray-700">Transações</h2>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 focus:outline-none"
                >
                  {STATUS_FILTER_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 focus:outline-none"
                >
                  {METHOD_FILTER_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-300 py-12">Nenhuma transação encontrada</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {p.appointment?.client?.full_name ?? 'Sem cliente'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.appointment?.service?.name ?? '—'}
                        {p.paid_at && ` · ${format(parseISO(p.paid_at), 'd MMM', { locale: ptBR })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {p.method && (
                        <span className="text-xs text-gray-400 hidden sm:block">
                          {METHOD_LABELS[p.method] ?? p.method}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-800">{fmt(p.amount)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: React.ReactNode; accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: accent }}>{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}
