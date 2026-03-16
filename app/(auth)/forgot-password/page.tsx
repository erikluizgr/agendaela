'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Step = 'form' | 'success'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<Step>('form')

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Informe um e-mail válido.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      })

      if (error) {
        setError('Não foi possível enviar o e-mail. Tente novamente.')
        return
      }

      setStep('success')
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Sparkles className="w-7 h-7 text-[#B565A7]" />
          <span className="text-2xl font-bold gradient-brand-text">AgendaEla</span>
        </div>

        <div className="bg-white rounded-[12px] border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-8">
          {step === 'form' ? (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-[#1A1A2E]">Recuperar senha</h1>
                <p className="text-[#6B7280] text-sm mt-1">
                  Digite seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="E-mail cadastrado"
                  type="email"
                  placeholder="sua@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />

                <Button type="submit" fullWidth loading={loading} size="lg">
                  Enviar link de recuperação
                </Button>
              </form>
            </>
          ) : (
            /* Tela de confirmação após envio */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">
                E-mail enviado!
              </h2>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                Enviamos um link de recuperação para{' '}
                <strong className="text-[#1A1A2E]">{email}</strong>.
                <br />
                Verifique sua caixa de entrada (e o spam).
              </p>
              <p className="text-xs text-[#9CA3AF] mt-4">
                O link expira em 1 hora.
              </p>
            </div>
          )}
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 mt-6 text-sm text-[#6B7280] hover:text-[#B565A7] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}
