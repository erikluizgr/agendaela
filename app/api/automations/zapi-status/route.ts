import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { instanceId, token } = await request.json()
  if (!instanceId || !token) {
    return NextResponse.json({ error: 'instanceId e token obrigatórios' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/status`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    const data = await res.json()
    // Z-API retorna { connected: true/false, ... } ou { error: '...' }
    const connected = res.ok && (data.connected === true || data.status === 'CONNECTED')
    return NextResponse.json({ connected, raw: data })
  } catch (err) {
    return NextResponse.json({ connected: false, error: 'Erro de rede' }, { status: 500 })
  }
}
