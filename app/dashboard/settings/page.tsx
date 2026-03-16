'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import {
  MessageCircle, Loader2, Check, Eye, EyeOff,
  Wifi, WifiOff, Key, Hash, Phone, Zap, User,
  Camera, Lock, CreditCard, Trash2, AlertTriangle,
  ExternalLink,
} from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  id:                string
  full_name:         string
  business_name:     string | null
  bio:               string | null
  address:           string | null
  phone:             string | null
  avatar_url:        string | null
  plan:              string
  stripe_customer_id: string | null
  zapi_instance_id:  string | null
  zapi_token:        string | null
}

type Section = 'profile' | 'password' | 'whatsapp' | 'subscription' | 'danger'

type ConnStatus = 'idle' | 'testing' | 'connected' | 'error'

function maskPhone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2)  return `(${n}`
  if (n.length <= 6)  return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

export default function ConfiguracoesPage() {
  const router      = useRouter()
  const fileRef     = useRef<HTMLInputElement>(null)

  const [profile,    setProfile]    = useState<Profile | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [activeSection, setSection] = useState<Section>('profile')

  // Profile fields
  const [fullName,   setFullName]   = useState('')
  const [bizName,    setBizName]    = useState('')
  const [bio,        setBio]        = useState('')
  const [address,    setAddress]    = useState('')
  const [phone,      setPhone]      = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPrev, setAvatarPrev] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile,  setSavedProfile]  = useState(false)

  // Password
  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [savingPw,   setSavingPw]   = useState(false)
  const [pwMsg,      setPwMsg]      = useState('')

  // Z-API
  const [instanceId, setInstanceId] = useState('')
  const [zapiToken,  setZapiToken]  = useState('')
  const [showToken,  setShowToken]  = useState(false)
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle')
  const [connMsg,    setConnMsg]    = useState('')
  const [savingZapi, setSavingZapi] = useState(false)
  const [savedZapi,  setSavedZapi]  = useState(false)

  // Stripe portal
  const [loadingPortal, setLoadingPortal] = useState(false)

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, bio, address, phone, avatar_url, plan, stripe_customer_id, zapi_instance_id, zapi_token')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data as Profile)
        setFullName(data.full_name ?? '')
        setBizName(data.business_name ?? '')
        setBio(data.bio ?? '')
        setAddress(data.address ?? '')
        setPhone(data.phone ?? '')
        setAvatarPrev(data.avatar_url)
        setInstanceId(data.zapi_instance_id ?? '')
        setZapiToken(data.zapi_token ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Save profile ───────────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!profile) return
    setSavingProfile(true)

    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      const ext  = avatarFile.name.split('.').pop()
      const path = `${profile.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, avatarFile, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }
    }

    await supabase.from('profiles').update({
      full_name:     fullName.trim(),
      business_name: bizName.trim() || null,
      bio:           bio.trim() || null,
      address:       address.trim() || null,
      phone:         phone.trim() || null,
      avatar_url:    avatarUrl,
    }).eq('id', profile.id)

    setSavingProfile(false)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2500)
  }

  // ── Change password ────────────────────────────────────────────────────────

  async function handleChangePassword() {
    if (newPw !== confirmPw) { setPwMsg('As senhas não coincidem'); return }
    if (newPw.length < 8)    { setPwMsg('Mínimo 8 caracteres'); return }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) { setPwMsg(error.message); return }
    setPwMsg('Senha alterada com sucesso!')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwMsg(''), 3000)
  }

  // ── Save Z-API ─────────────────────────────────────────────────────────────

  async function handleSaveZapi() {
    if (!profile) return
    setSavingZapi(true)
    await supabase.from('profiles').update({
      zapi_instance_id: instanceId.trim() || null,
      zapi_token:       zapiToken.trim() || null,
    }).eq('id', profile.id)
    setSavingZapi(false)
    setSavedZapi(true)
    setTimeout(() => setSavedZapi(false), 2500)
  }

  async function testConnection() {
    if (!instanceId.trim() || !zapiToken.trim()) {
      setConnMsg('Preencha o Instance ID e o Token antes de testar.')
      setConnStatus('error')
      return
    }
    setConnStatus('testing'); setConnMsg('')
    try {
      const res  = await fetch('/api/automations/zapi-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ instanceId: instanceId.trim(), token: zapiToken.trim() }),
      })
      const data = await res.json()
      setConnStatus(data.connected ? 'connected' : 'error')
      setConnMsg(data.connected ? 'WhatsApp conectado!' : data.error ?? 'Falha na conexão.')
    } catch { setConnStatus('error'); setConnMsg('Erro de rede.') }
  }

  // ── Stripe portal ──────────────────────────────────────────────────────────

  async function openPortal() {
    setLoadingPortal(true)
    const res  = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    setLoadingPortal(false)
    if (data.url) window.location.href = data.url
    else alert(data.error ?? 'Erro ao abrir portal.')
  }

  // ── Delete account ─────────────────────────────────────────────────────────

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'EXCLUIR') return
    setDeleting(true)
    await fetch('/api/account/delete', { method: 'DELETE' })
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── Nav items ──────────────────────────────────────────────────────────────

  const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',      label: 'Perfil',          icon: <User size={15} /> },
    { id: 'password',     label: 'Senha',            icon: <Lock size={15} /> },
    { id: 'whatsapp',     label: 'WhatsApp (Z-API)', icon: <MessageCircle size={15} /> },
    { id: 'subscription', label: 'Assinatura',       icon: <CreditCard size={15} /> },
    { id: 'danger',       label: 'Zona de perigo',   icon: <AlertTriangle size={15} /> },
  ]

  const PLAN_LABELS: Record<string, string> = {
    trial: 'Trial (14 dias)', solo: 'Solo', studio: 'Studio', clinica: 'Clínica'
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin text-[#B565A7]" /></div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie seu perfil, senha e integrações</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">

        {/* Sidebar nav */}
        <nav className="sm:w-48 shrink-0">
          <ul className="space-y-1">
            {NAV.map(n => (
              <li key={n.id}>
                <button
                  onClick={() => setSection(n.id)}
                  className={[
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all',
                    activeSection === n.id
                      ? 'bg-[#B565A7]/10 text-[#B565A7]'
                      : 'text-gray-600 hover:bg-gray-100',
                    n.id === 'danger' && activeSection !== n.id ? 'text-red-500 hover:bg-red-50' : '',
                  ].join(' ')}
                >
                  {n.icon} {n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-5">

          {/* ── PROFILE ── */}
          {activeSection === 'profile' && (
            <Card title="Perfil" icon={<User size={16} className="text-[#B565A7]" />}>
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-5">
                <button onClick={() => fileRef.current?.click()} className="relative group">
                  {avatarPrev
                    ? <img src={avatarPrev} className="w-16 h-16 rounded-full object-cover ring-2 ring-[#B565A7]/30" />
                    : <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B565A7] to-[#7C5CBF] flex items-center justify-center text-white font-bold text-xl">
                        {fullName.charAt(0) || '?'}
                      </div>
                  }
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={16} className="text-white" />
                  </div>
                </button>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Foto de perfil</p>
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-[#B565A7] hover:underline">Trocar foto</button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPrev(URL.createObjectURL(f)) } }} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nome completo *">
                  <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder="Seu nome" />
                </Field>
                <Field label="Nome do negócio">
                  <input value={bizName} onChange={e => setBizName(e.target.value)} className={inputCls} placeholder="Studio da Maria" />
                </Field>
                <Field label="Telefone">
                  <input value={phone} onChange={e => setPhone(maskPhone(e.target.value))} className={inputCls} placeholder="(11) 99999-9999" />
                </Field>
                <Field label="Endereço">
                  <input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="Rua das Flores, 123" />
                </Field>
                <Field label="Bio" className="sm:col-span-2">
                  <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} rows={3} className={inputCls + ' resize-none'} placeholder="Especialista em unhas..." />
                  <p className="text-xs text-gray-400 mt-0.5 text-right">{bio.length}/160</p>
                </Field>
              </div>
              <SaveButton loading={savingProfile} saved={savedProfile} onClick={handleSaveProfile} />
            </Card>
          )}

          {/* ── PASSWORD ── */}
          {activeSection === 'password' && (
            <Card title="Alterar senha" icon={<Lock size={16} className="text-[#7C5CBF]" />}>
              <div className="space-y-3 max-w-sm">
                <Field label="Nova senha">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20">
                    <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                      placeholder="Mínimo 8 caracteres" className="flex-1 text-sm outline-none text-gray-800" />
                    <button onClick={() => setShowPw(v => !v)} className="text-gray-400">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirmar nova senha">
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={inputCls} placeholder="Repita a senha" />
                </Field>
                {pwMsg && (
                  <p className={`text-sm px-3 py-2 rounded-xl ${pwMsg.includes('sucesso') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {pwMsg}
                  </p>
                )}
                <SaveButton loading={savingPw} saved={false} onClick={handleChangePassword} label="Alterar senha" />
              </div>
            </Card>
          )}

          {/* ── WHATSAPP ── */}
          {activeSection === 'whatsapp' && (
            <Card title="Integração WhatsApp (Z-API)" icon={<MessageCircle size={16} className="text-green-500" />}>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs text-blue-700 space-y-1 mb-4">
                <p className="font-semibold">Como configurar:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                  <li>Acesse <strong>z-api.io</strong> e crie uma instância</li>
                  <li>Escaneie o QR Code para conectar seu WhatsApp</li>
                  <li>Copie o Instance ID e Token abaixo</li>
                </ol>
              </div>
              <div className="space-y-3 max-w-sm">
                <Field label="Instance ID">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20">
                    <Hash size={13} className="text-gray-400 shrink-0" />
                    <input value={instanceId} onChange={e => setInstanceId(e.target.value)} placeholder="3ABC12345" className="flex-1 text-sm outline-none text-gray-800" />
                  </div>
                </Field>
                <Field label="Token">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]/20">
                    <Key size={13} className="text-gray-400 shrink-0" />
                    <input type={showToken ? 'text' : 'password'} value={zapiToken} onChange={e => setZapiToken(e.target.value)} placeholder="Token da instância" className="flex-1 text-sm outline-none text-gray-800" />
                    <button onClick={() => setShowToken(v => !v)} className="text-gray-400">{showToken ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                  </div>
                </Field>
                <div className="flex items-center gap-3">
                  <button onClick={testConnection} disabled={connStatus === 'testing'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {connStatus === 'testing' ? <Loader2 size={14} className="animate-spin" />
                     : connStatus === 'connected' ? <Wifi size={14} className="text-green-500" />
                     : connStatus === 'error'     ? <WifiOff size={14} className="text-red-500" />
                     : <Wifi size={14} className="text-gray-400" />}
                    {connStatus === 'testing' ? 'Testando...' : 'Testar conexão'}
                  </button>
                  {connMsg && <span className={`text-xs font-medium ${connStatus === 'connected' ? 'text-green-600' : 'text-red-500'}`}>{connMsg}</span>}
                </div>
                <SaveButton loading={savingZapi} saved={savedZapi} onClick={handleSaveZapi} label="Salvar configuração" />
              </div>
            </Card>
          )}

          {/* ── SUBSCRIPTION ── */}
          {activeSection === 'subscription' && (
            <Card title="Assinatura" icon={<CreditCard size={16} className="text-[#B565A7]" />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Plano atual</p>
                    <p className="text-lg font-bold text-[#B565A7]">{PLAN_LABELS[profile?.plan ?? 'trial'] ?? 'Trial'}</p>
                  </div>
                  <a href="/precos" className="text-sm text-[#B565A7] font-semibold hover:underline flex items-center gap-1">
                    Ver planos <ExternalLink size={12} />
                  </a>
                </div>

                {profile?.stripe_customer_id ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">Gerencie sua assinatura pelo portal Stripe: cancele, troque de plano ou atualize seu cartão.</p>
                    <button
                      onClick={openPortal}
                      disabled={loadingPortal}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loadingPortal ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                      Gerenciar assinatura
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-500">Você está no período de trial. Escolha um plano para continuar usando após os 14 dias.</p>
                    <a href="/precos"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
                      <Zap size={15} /> Fazer upgrade agora
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── DANGER ZONE ── */}
          {activeSection === 'danger' && (
            <Card title="Zona de perigo" icon={<AlertTriangle size={16} className="text-red-500" />} danger>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  A exclusão da conta é <strong>permanente e irreversível</strong>. Todos os seus dados serão removidos.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">
                    Digite <span className="font-bold text-red-600">EXCLUIR</span> para confirmar:
                  </label>
                  <input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="EXCLUIR"
                    className="w-full px-3 py-2.5 rounded-xl border border-red-200 text-sm text-gray-800 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 max-w-xs"
                  />
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'EXCLUIR' || deleting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Excluir minha conta
                </button>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#B565A7] focus:ring-2 focus:ring-[#B565A7]/20 transition-all'

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-xs font-semibold text-gray-500">{label}</label>
      {children}
    </div>
  )
}

function Card({ title, icon, children, danger }: { title: string; icon: React.ReactNode; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-6 space-y-5 ${danger ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-gray-700'}`}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SaveButton({ loading, saved, onClick, label = 'Salvar alterações' }: {
  loading: boolean; saved: boolean; onClick: () => void; label?: string
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 mt-2"
      style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
      {loading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
       : saved  ? <><Check size={15} /> Salvo!</>
       : <><Zap size={15} /> {label}</>}
    </button>
  )
}
