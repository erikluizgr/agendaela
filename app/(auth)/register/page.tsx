'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Sparkles, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface FormData {
  fullName: string
  businessName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  fullName?: string
  businessName?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
}

/** Formata telefone brasileiro: (11) 91234-5678 */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/** Verifica requisitos da senha */
function checkPasswordStrength(password: string) {
  return {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const supabase = createClient()
  const strength = checkPasswordStrength(form.password)

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Limpa o erro do campo ao digitar
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!form.fullName.trim() || form.fullName.trim().length < 3) {
      newErrors.fullName = 'Informe seu nome completo (mínimo 3 caracteres)'
    }
    if (!form.businessName.trim()) {
      newErrors.businessName = 'Informe o nome do seu studio ou negócio'
    }
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Informe um e-mail válido'
    }
    if (!form.password || form.password.length < 8) {
      newErrors.password = 'A senha deve ter pelo menos 8 caracteres'
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')

    if (!validate()) return

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name:     form.fullName.trim(),
            business_name: form.businessName.trim(),
            phone:         form.phone,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setServerError('Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.')
        } else if (error.message.includes('Password should be')) {
          setServerError('A senha não atende aos requisitos mínimos de segurança.')
        } else {
          // Mostra o erro real do Supabase para diagnóstico
          setServerError(`Erro do Supabase: ${error.message} (status ${error.status ?? 'n/a'})`)
        }
        return
      }

      // Redireciona para onboarding após cadastro bem-sucedido
      router.push('/onboarding')
    } catch {
      setServerError('Erro inesperado ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-5/12 gradient-brand flex-col items-center justify-center p-12 text-white">
        <div className="max-w-xs text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-9 h-9" />
            <span className="text-3xl font-bold">AgendaEla</span>
          </div>
          <h2 className="text-xl font-semibold mb-3">
            Comece gratuitamente
          </h2>
          <p className="text-white/80 leading-relaxed">
            14 dias de trial sem precisar de cartão de crédito.
            Cancele quando quiser.
          </p>
          <ul className="mt-8 space-y-3 text-left">
            {[
              'Agenda online 24h para seus clientes',
              'Confirmação automática via WhatsApp',
              'Controle financeiro completo',
              'Link público personalizado',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 lg:py-0 lg:px-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <Sparkles className="w-7 h-7 text-[#B565A7]" />
            <span className="text-2xl font-bold gradient-brand-text">AgendaEla</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Criar conta gratuita</h1>
            <p className="text-[#6B7280] mt-1 text-sm">14 dias de trial, sem cartão de crédito</p>
          </div>

          {serverError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Input
              label="Seu nome completo"
              type="text"
              placeholder="Maria Silva"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              error={errors.fullName}
              required
              autoComplete="name"
            />

            <Input
              label="Nome do seu studio / negócio"
              type="text"
              placeholder="Studio Bella Arte"
              value={form.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              error={errors.businessName}
              required
              helperText="Será exibido no seu link público de agendamento"
            />

            <Input
              label="E-mail"
              type="email"
              placeholder="sua@email.com"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              error={errors.email}
              required
              autoComplete="email"
            />

            <Input
              label="WhatsApp"
              type="tel"
              placeholder="(11) 91234-5678"
              value={form.phone}
              onChange={(e) => updateField('phone', formatPhone(e.target.value))}
              error={errors.phone}
              helperText="Opcional — usado para lembretes de agendamento"
              autoComplete="tel"
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                error={errors.password}
                required
                autoComplete="new-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-[#B565A7] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              {/* Indicadores de força da senha */}
              {form.password && (
                <div className="flex gap-2 mt-1">
                  {[
                    { ok: strength.length,    label: '8+ chars' },
                    { ok: strength.uppercase, label: 'Maiúscula' },
                    { ok: strength.number,    label: 'Número' },
                  ].map((req) => (
                    <span
                      key={req.label}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        req.ok
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {req.ok && '✓ '}{req.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="Confirmar senha"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="hover:text-[#B565A7] transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
              Criar minha conta gratuita
            </Button>
          </form>

          <p className="text-center text-xs text-[#6B7280] mt-4">
            Ao criar uma conta, você concorda com os{' '}
            <Link href="/terms" className="text-[#B565A7] hover:underline">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacy" className="text-[#B565A7] hover:underline">
              Política de Privacidade
            </Link>
          </p>

          <p className="text-center text-sm text-[#6B7280] mt-4">
            Já tem uma conta?{' '}
            <Link
              href="/login"
              className="text-[#B565A7] hover:text-[#9A4A8E] font-semibold transition-colors"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
