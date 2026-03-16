'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera, User, Globe, FileText, MapPin, Home,
  CheckCircle, XCircle, Loader2, ArrowRight,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function PerfilPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [userId, setUserId]                   = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview]     = useState<string | null>(null)
  const [avatarFile, setAvatarFile]           = useState<File | null>(null)
  const [businessName, setBusinessName]       = useState('')
  const [slug, setSlug]                       = useState('')
  const [bio, setBio]                         = useState('')
  const [address, setAddress]                 = useState('')
  const [atHome, setAtHome]                   = useState(false)
  const [slugStatus, setSlugStatus]           = useState<SlugStatus>('idle')
  const [errors, setErrors]                   = useState<Record<string, string>>({})
  const [saving, setSaving]                   = useState(false)
  const [loadingAvatar, setLoadingAvatar]     = useState(false)

  // Carrega usuário e dados salvos anteriormente
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, slug, bio, address, at_home_service, avatar_url')
        .eq('id', user.id)
        .single()

      if (!profile) return
      if (profile.business_name) setBusinessName(profile.business_name)
      if (profile.slug)          setSlug(profile.slug)
      if (profile.bio)           setBio(profile.bio)
      if (profile.address)       setAddress(profile.address)
      if (profile.at_home_service) setAtHome(profile.at_home_service)
      if (profile.avatar_url)    setAvatarPreview(profile.avatar_url)
    }
    load()
  }, [])

  // Gera slug automático quando o nome do negócio muda
  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value)
    if (!slug) {
      const auto = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(auto)
      triggerSlugCheck(auto)
    }
  }

  const triggerSlugCheck = useCallback((value: string) => {
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    if (!value || value.length < 3) {
      setSlugStatus(value.length > 0 ? 'invalid' : 'idle')
      return
    }
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
    if (!slugRegex.test(value)) {
      setSlugStatus('invalid')
      return
    }
    setSlugStatus('checking')
    slugTimerRef.current = setTimeout(async () => {
      const normalized = value.toLowerCase().trim()
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', normalized)
        .neq('id', userId ?? '')
        .maybeSingle()
      setSlugStatus(data ? 'taken' : 'available')
    }, 600)
  }, [userId])

  const handleSlugChange = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(clean)
    triggerSlugCheck(clean)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (uid: string): Promise<string | null> => {
    if (!avatarFile) return null
    setLoadingAvatar(true)
    const ext  = avatarFile.name.split('.').pop()
    const path = `${uid}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true })
    setLoadingAvatar(false)
    if (error) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!businessName.trim()) errs.businessName = 'Informe o nome do seu negócio'
    if (!slug || slug.length < 3) errs.slug = 'O link deve ter pelo menos 3 caracteres'
    if (slugStatus === 'taken')    errs.slug = 'Este link já está em uso, escolha outro'
    if (slugStatus === 'invalid')  errs.slug = 'Use apenas letras minúsculas, números e hífens'
    if (slugStatus === 'checking') errs.slug = 'Aguarde a verificação do link'
    if (!atHome && !address.trim()) errs.address = 'Informe seu endereço ou marque "Atendo em domicílio"'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinue = async () => {
    if (!validate()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setErrors({ general: 'Sessão expirada. Faça login novamente.' })
      setSaving(false)
      return
    }

    let avatarUrl: string | undefined
    if (avatarFile) {
      const url = await uploadAvatar(user.id)
      if (url) avatarUrl = url
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        business_name:   businessName,
        slug:            slug.toLowerCase().trim(),
        bio,
        address:         atHome ? null : address,
        at_home_service: atHome,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      setErrors({ general: error.message })
      return
    }
    router.push('/onboarding/servicos')
  }

  const slugFeedback = {
    idle:      null,
    checking:  <span className="flex items-center gap-1 text-[#6B7280]"><Loader2 size={14} className="animate-spin" /> Verificando...</span>,
    available: <span className="flex items-center gap-1 text-[#10B981]"><CheckCircle size={14} /> Disponível!</span>,
    taken:     <span className="flex items-center gap-1 text-[#EF4444]"><XCircle size={14} /> Já está em uso</span>,
    invalid:   <span className="flex items-center gap-1 text-[#EF4444]"><XCircle size={14} /> Formato inválido</span>,
  }[slugStatus]

  return (
    <div className="animate-fade-slide-in space-y-8">
      {/* Cabeçalho da etapa */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Conte sobre você ✨</h1>
        <p className="text-[#6B7280] mt-1.5">
          Essas informações aparecem para suas clientes quando elas acessam seu link de agendamento.
        </p>
      </div>

      {/* Upload de avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-gradient-to-br from-[#F4A5C8] to-[#B565A7] flex items-center justify-center group transition-transform hover:scale-105 active:scale-95"
          aria-label="Escolher foto de perfil"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Prévia" className="w-full h-full object-cover" />
          ) : (
            <User size={36} className="text-white/80" />
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={22} className="text-white" />
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-[#B565A7] font-medium hover:underline"
        >
          {avatarPreview ? 'Trocar foto' : 'Adicionar foto'}
        </button>
      </div>

      {/* Formulário */}
      <div className="space-y-5">

        {/* Nome do negócio */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-1.5">
            <User size={15} className="text-[#B565A7]" />
            Nome do negócio
            <span className="text-[#EF4444]">*</span>
          </label>
          <input
            value={businessName}
            onChange={e => handleBusinessNameChange(e.target.value)}
            placeholder="Ex: Studio da Maria"
            className={[
              'w-full rounded-xl border px-3 py-3 text-base text-[#1A1A2E] placeholder:text-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent transition-all',
              errors.businessName ? 'border-[#EF4444]' : 'border-gray-200 hover:border-[#B565A7]',
            ].join(' ')}
          />
          {errors.businessName && (
            <p className="text-xs text-[#EF4444]">{errors.businessName}</p>
          )}
        </div>

        {/* Slug / Link público */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-1.5">
            <Globe size={15} className="text-[#B565A7]" />
            Seu link de agendamento
            <span className="text-[#EF4444]">*</span>
          </label>
          <div className={[
            'flex items-center rounded-xl border bg-white overflow-hidden transition-all',
            errors.slug ? 'border-[#EF4444]' : slugStatus === 'available' ? 'border-[#10B981]' : 'border-gray-200 focus-within:border-[#B565A7] focus-within:ring-2 focus-within:ring-[#B565A7]',
          ].join(' ')}>
            <span className="pl-3 pr-1 text-sm text-[#6B7280] shrink-0 whitespace-nowrap">
              agendaela.com.br/
            </span>
            <input
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="seu-nome"
              className="flex-1 py-3 pr-3 text-base text-[#1A1A2E] placeholder:text-gray-400 focus:outline-none bg-transparent"
            />
          </div>
          <div className="text-xs">{slugFeedback}</div>
          {errors.slug && <p className="text-xs text-[#EF4444]">{errors.slug}</p>}
          <p className="text-xs text-[#6B7280]">Use apenas letras minúsculas, números e hífens.</p>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-1.5">
            <FileText size={15} className="text-[#B565A7]" />
            Bio curta
            <span className="text-xs text-[#6B7280] font-normal ml-auto">{bio.length}/160</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 160))}
            rows={3}
            placeholder="Ex: Especialista em unhas com 5 anos de experiência. Atendimento com amor e capricho! 💅"
            className="w-full rounded-xl border border-gray-200 hover:border-[#B565A7] px-3 py-3 text-base text-[#1A1A2E] placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent transition-all"
          />
        </div>

        {/* Endereço / Domicílio */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-1.5">
            <MapPin size={15} className="text-[#B565A7]" />
            Localização
          </label>

          {/* Toggle domicílio */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div
              onClick={() => setAtHome(!atHome)}
              className={[
                'w-11 h-6 rounded-full relative transition-colors duration-300 shrink-0',
                atHome ? 'bg-[#B565A7]' : 'bg-gray-300',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300',
                atHome ? 'left-5' : 'left-0.5',
              ].join(' ')} />
            </div>
            <span className="flex items-center gap-2 text-sm text-[#1A1A2E]">
              <Home size={16} className="text-[#B565A7]" />
              Atendo em domicílio
            </span>
          </label>

          {!atHome && (
            <div className="space-y-1">
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ex: Rua das Flores, 123 — Centro, São Paulo"
                className={[
                  'w-full rounded-xl border px-3 py-3 text-base text-[#1A1A2E] placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent transition-all',
                  errors.address ? 'border-[#EF4444]' : 'border-gray-200 hover:border-[#B565A7]',
                ].join(' ')}
              />
              {errors.address && <p className="text-xs text-[#EF4444]">{errors.address}</p>}
            </div>
          )}
        </div>
      </div>

      {errors.general && (
        <p className="text-sm text-[#EF4444] bg-red-50 rounded-xl px-4 py-3">{errors.general}</p>
      )}

      {/* Navegação */}
      <div className="pt-2">
        <button
          onClick={handleContinue}
          disabled={saving || loadingAvatar}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#B565A7]/30"
          style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
        >
          {saving || loadingAvatar ? (
            <><Loader2 size={18} className="animate-spin" /> Salvando...</>
          ) : (
            <>Continuar <ArrowRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  )
}
