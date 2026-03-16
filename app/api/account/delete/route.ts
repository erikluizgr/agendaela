import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE() {
  const supabase        = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  // Deletar dados do usuário em cascata (a FK com ON DELETE CASCADE cuida das tabelas filhas)
  await service.from('profiles').delete().eq('id', user.id)

  // Deletar o usuário do Auth (requer service role)
  await service.auth.admin.deleteUser(user.id)

  return NextResponse.json({ ok: true })
}
