import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendMessage } from '@/lib/zapi'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, phone } = await request.json()
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, slug')
    .eq('id', user.id)
    .single()

  const nome  = profile?.full_name.split(' ')[0] ?? 'Profissional'
  const negocio = profile?.business_name ?? profile?.full_name ?? 'Seu negócio'

  const MESSAGES: Record<string, string> = {
    reminder: `Olá, ${nome}! 👋\n\n✅ *[Teste] Lembrete automático ativo!*\n\nSuas clientes receberão esta mensagem 24h antes do agendamento, com o horário e serviço real.\n\nPowered by AgendaEla 💜`,
    confirmation: `✅ *[Teste] Confirmação automática ativa!*\n\nOlá, ${nome}! Suas clientes receberão esta mensagem logo após agendarem com você.\n\nPowered by AgendaEla 💜`,
    birthday: `🎂 *[Teste] Mensagem de aniversário ativa!*\n\nSuas clientes aniversariantes receberão uma mensagem carinhosa com desconto neste dia especial!\n\nPowered by AgendaEla 💜`,
    daily_summary: `☀️ *[Teste] Resumo diário ativo!*\n\nBom dia, ${nome}! Este é um exemplo do resumo que você receberá toda manhã com seus atendimentos do dia.\n\nPowered by AgendaEla 💜`,
  }

  const message = MESSAGES[type]
  if (!message) return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })

  try {
    const ok = await sendMessage(phone, message)
    return NextResponse.json({ ok })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
