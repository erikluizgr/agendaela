'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import QRCode from 'qrcode'
import { Copy, Check, ExternalLink, Link2, Instagram, MessageCircle, Share2, Loader2 } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? (
  typeof window !== 'undefined' ? window.location.origin : ''
)

const SHARE_TIPS = [
  {
    icon: <Instagram size={18} className="text-pink-500" />,
    title: 'Instagram',
    desc: 'Cole na bio do seu perfil para clientes agendarem direto.',
  },
  {
    icon: <MessageCircle size={18} className="text-green-500" />,
    title: 'WhatsApp',
    desc: 'Envie o link no status ou em conversas para facilitar o agendamento.',
  },
  {
    icon: <Share2 size={18} className="text-blue-500" />,
    title: 'Outros',
    desc: 'Compartilhe em grupos, stories, cartões de visita ou imprima o QR Code.',
  },
]

export default function MeuLinkPage() {
  const [slug,    setSlug]    = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)
  const [qrUrl,   setQrUrl]   = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', user.id)
        .single()

      if (data?.slug) setSlug(data.slug)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!slug) return
    const url = `${BASE_URL}/${slug}`

    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: '#1A1A2E', light: '#FFFFFF' },
    }).then(setQrUrl)
  }, [slug])

  const publicUrl = slug ? `${BASE_URL}/${slug}` : ''

  async function copyLink() {
    if (!publicUrl) return
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openLink() {
    if (publicUrl) window.open(publicUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[#B565A7]" />
      </div>
    )
  }

  if (!slug) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center py-24">
        <Link2 size={40} className="text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Você ainda não definiu seu link.</p>
        <p className="text-sm text-gray-400 mt-1">Configure seu perfil para obter seu link público.</p>
        <a
          href="/dashboard/settings"
          className="mt-4 inline-block text-sm font-semibold text-[#B565A7] hover:underline"
        >
          Ir para Configurações →
        </a>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Link Público</h1>
        <p className="text-sm text-gray-500 mt-0.5">Compartilhe este link para seus clientes agendarem online</p>
      </div>

      {/* Link card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Seu link</p>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <Link2 size={15} className="text-[#B565A7] shrink-0" />
          <span className="flex-1 text-sm font-medium text-gray-700 truncate">{publicUrl}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? <><Check size={15} className="text-green-500" /> Copiado!</> : <><Copy size={15} /> Copiar link</>}
          </button>
          <button
            onClick={openLink}
            className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
          >
            <ExternalLink size={15} /> Abrir link
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">QR Code</p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="QR Code"
              className="w-44 h-44 rounded-xl border border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-44 h-44 rounded-xl bg-gray-50 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          )}
          <div className="space-y-3 flex-1">
            <p className="text-sm text-gray-600">
              Seus clientes podem escanear este QR Code para acessar sua página de agendamento.
            </p>
            <p className="text-sm text-gray-500">
              Imprima e cole no seu espaço de trabalho, cartão de visita ou material de divulgação.
            </p>
            {qrUrl && (
              <a
                href={qrUrl}
                download={`qrcode-${slug}.png`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Baixar QR Code
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Dicas de compartilhamento */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Onde compartilhar</p>
        <div className="space-y-3">
          {SHARE_TIPS.map(tip => (
            <div key={tip.title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                {tip.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{tip.title}</p>
                <p className="text-xs text-gray-400">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preview</p>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#B565A7] font-semibold hover:underline"
          >
            Abrir em nova aba ↗
          </a>
        </div>
        <div className="relative w-full rounded-2xl overflow-hidden border border-gray-100 bg-gray-50"
          style={{ paddingBottom: '75%' }}>
          <iframe
            src={publicUrl}
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
            title="Preview da página pública"
          />
        </div>
      </div>

    </div>
  )
}
