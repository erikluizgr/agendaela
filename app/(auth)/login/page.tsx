'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('[Login] SUPABASE_URL presente:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[Login] SUPABASE_ANON_KEY presente:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.log('Erro completo:', JSON.stringify(error, null, 2))
        setError(error.message || 'Erro desconhecido')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('[Login] Erro inesperado:', err)
      setError(`Erro inesperado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setLoadingGoogle(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      })

      if (error) {
        setError('Não foi possível entrar com o Google. Tente novamente.')
      }
    } catch {
      setError('Erro ao conectar com o Google.')
    } finally {
      setLoadingGoogle(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-brand flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-10 h-10" />
            <span className="text-4xl font-bold">AgendaEla</span>
          </div>
          <h2 className="text-2xl font-semibold mb-4">
            Sua agenda, do seu jeito
          </h2>
          <p className="text-white/80 text-lg leading-relaxed">
            Gerencie seus agendamentos, clientes e finanças em um só lugar.
            Feito especialmente para profissionais autônomas de estética e beleza.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { value: '2.000+', label: 'Profissionais' },
              { value: '50k+', label: 'Agendamentos' },
              { value: '4.9★', label: 'Avaliação' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-4">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-white/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Sparkles className="w-7 h-7 text-[#B565A7]" />
            <span className="text-2xl font-bold gradient-brand-text">AgendaEla</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Bem-vinda de volta!</h1>
            <p className="text-[#6B7280] mt-1">Entre na sua conta para continuar</p>
          </div>

          {/* Erro geral */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Botão Google */}
          <Button
            variant="ghost"
            fullWidth
            onClick={handleGoogleLogin}
            loading={loadingGoogle}
            className="mb-4"
          >
            {!loadingGoogle && (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Entrar com Google
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-[#6B7280]">ou entre com e-mail</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="sua@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-[#B565A7] transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-[#B565A7] hover:text-[#9A4A8E] font-medium transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-1">
              Entrar
            </Button>
          </form>

          <p className="text-center text-sm text-[#6B7280] mt-6">
            Não tem uma conta?{' '}
            <Link
              href="/register"
              className="text-[#B565A7] hover:text-[#9A4A8E] font-semibold transition-colors"
            >
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
