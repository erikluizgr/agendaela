import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, plan, trial_ends_at, onboarding_completed')
    .eq('id', user.id)
    .single()

  // Redireciona para onboarding se ainda não completou
  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'por aqui'

  return (
    <div className="p-6 lg:p-8">
      {/* Cabeçalho da página */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E]">
          Olá, {firstName}! 👋
        </h1>
        <p className="text-[#6B7280] mt-1">
          Veja o resumo do seu dia
        </p>
      </div>

      {/* Cards de resumo — serão populados nas próximas sprints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Agendamentos hoje',  value: '—', icon: '📅' },
          { label: 'Clientes ativos',    value: '—', icon: '👥' },
          { label: 'Faturamento no mês', value: '—', icon: '💰' },
          { label: 'Taxa de retorno',    value: '—', icon: '🔄' },
        ].map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#6B7280]">{stat.label}</p>
                <p className="text-2xl font-bold text-[#1A1A2E] mt-1">{stat.value}</p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Placeholder agenda do dia */}
      <Card padding="md">
        <div className="flex items-center gap-3 mb-4">
          <CalendarDays className="w-5 h-5 text-[#B565A7]" />
          <h2 className="font-semibold text-[#1A1A2E]">Agenda de hoje</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-3">
            <CalendarDays className="w-7 h-7 text-[#B565A7]" />
          </div>
          <p className="text-[#6B7280] text-sm">
            Nenhum agendamento para hoje.
            <br />
            <span className="text-[#B565A7] font-medium cursor-pointer hover:underline">
              Adicionar agendamento
            </span>
          </p>
        </div>
      </Card>
    </div>
  )
}
