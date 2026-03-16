'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CalendarDays,
  Users,
  Scissors,
  BarChart3,
  Link2,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { User } from '@supabase/supabase-js'

interface NavItem {
  href:  string
  icon:  React.ElementType
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/agenda',     icon: CalendarDays, label: 'Agenda' },
  { href: '/dashboard/clients',    icon: Users,        label: 'Clientes' },
  { href: '/dashboard/services',   icon: Scissors,     label: 'Serviços' },
  { href: '/dashboard/financial',  icon: BarChart3,    label: 'Financeiro' },
  { href: '/dashboard/my-link',    icon: Link2,        label: 'Meu Link' },
  { href: '/dashboard/automacoes', icon: Zap,          label: 'Automações' },
  { href: '/dashboard/settings',   icon: Settings,     label: 'Configurações' },
]

const PLAN_LABELS: Record<string, { label: string; variant: 'warning' | 'primary' | 'success' | 'info' }> = {
  trial:   { label: 'Trial',    variant: 'warning' },
  solo:    { label: 'Solo',     variant: 'primary' },
  studio:  { label: 'Studio',   variant: 'success' },
  clinica: { label: 'Clínica',  variant: 'info'    },
}

interface Profile {
  full_name:     string | null
  business_name: string | null
  avatar_url:    string | null
  plan:          string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, business_name, avatar_url, plan')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    loadUser()
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  /** Verifica se o link de nav está ativo (exato para /dashboard, startsWith para subrotas) */
  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const plan = PLAN_LABELS[profile?.plan ?? 'trial'] ?? PLAN_LABELS.trial
  const displayName = profile?.full_name ?? user?.email ?? 'Profissional'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#F4A5C8]" />
          <span className="text-lg font-bold text-white">AgendaEla</span>
        </div>
      </div>

      {/* Perfil */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Avatar
            src={profile?.avatar_url}
            name={displayName}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {displayName}
            </p>
            {profile?.business_name && (
              <p className="text-xs text-gray-400 truncate">
                {profile.business_name}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Badge variant={plan.variant} size="sm" dot>
            Plano {plan.label}
          </Badge>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon   = item.icon
            const active = isActive(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-[rgba(181,101,167,0.2)] text-[#F4A5C8]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Rodapé — botão de logout */}
      <div className="px-3 pb-5 pt-2 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          Sair da conta
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">

      {/* ===== SIDEBAR DESKTOP ===== */}
      <aside
        className="hidden lg:flex flex-col w-[260px] bg-[#1A1A2E] flex-shrink-0"
        aria-label="Menu lateral"
      >
        <SidebarContent />
      </aside>

      {/* ===== SIDEBAR MOBILE (drawer) ===== */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          {/* Drawer */}
          <aside className="relative w-[260px] bg-[#1A1A2E] flex flex-col h-full shadow-2xl z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ===== ÁREA PRINCIPAL ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors text-[#1A1A2E]"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-[#B565A7]" />
            <span className="font-bold text-[#1A1A2E]">AgendaEla</span>
          </div>

          <Avatar
            src={profile?.avatar_url}
            name={displayName}
            size="sm"
          />
        </header>

        {/* Conteúdo das páginas */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
