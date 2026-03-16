# AgendaEla 💜

> Plataforma SaaS de agendamento online para profissionais de beleza e estética.

**Agenda no automático. Clientes nunca esquecidas.**

---

## Visão Geral

AgendaEla é uma plataforma completa para manicures, esteticistas, designers de sobrancelha e demais profissionais de beleza gerenciarem seus agendamentos de forma profissional.

### O que resolve
- **Fim do caos no WhatsApp** — Link de agendamento online para clientes marcarem 24/7
- **Zero faltas sem aviso** — Lembretes automáticos por WhatsApp 24h antes
- **Controle financeiro real** — Dashboard com faturamento, ticket médio e relatórios
- **Clientes nunca esquecidas** — Mensagens de aniversário com desconto automáticas

---

## Stack Tecnológica

| Camada        | Tecnologia               |
|---------------|--------------------------|
| Frontend      | Next.js 16 (App Router)  |
| Estilo        | Tailwind CSS             |
| Backend/DB    | Supabase (PostgreSQL)    |
| Autenticação  | Supabase Auth            |
| Pagamentos    | Stripe                   |
| WhatsApp      | Z-API                    |
| IA            | OpenAI (GPT-4o-mini)     |
| Deploy        | Vercel                   |
| Gráficos      | Recharts                 |
| QR Code       | qrcode                   |

---

## Estrutura de Pastas

```
agendaela/
├── app/
│   ├── (auth)/              # Login, cadastro (layout sem sidebar)
│   ├── [slug]/              # Página pública de agendamento
│   ├── api/
│   │   ├── appointments/    # CRUD de agendamentos
│   │   ├── automations/     # Churn, teste de WhatsApp, Z-API status
│   │   ├── cron/            # Lembretes automáticos, resumo diário
│   │   ├── public/[slug]/   # API pública (perfil, disponibilidade, booking)
│   │   ├── stripe/          # Checkout, portal de assinatura
│   │   ├── webhooks/stripe/ # Webhook de eventos Stripe
│   │   └── account/delete/  # Exclusão de conta
│   ├── dashboard/
│   │   ├── agenda/          # Calendário semanal/diário + modais
│   │   ├── automacoes/      # Dashboard de automações WhatsApp
│   │   ├── clients/         # Lista + perfil de clientes
│   │   ├── financial/       # Dashboard financeiro
│   │   ├── my-link/         # Link público + QR Code
│   │   ├── services/        # Gerenciar serviços
│   │   └── settings/        # Configurações gerais
│   ├── onboarding/          # Fluxo de onboarding (4 etapas)
│   ├── precos/              # Página pública de planos
│   └── page.tsx             # Landing page
├── components/
│   └── ui/                  # Avatar, Badge, etc.
├── lib/
│   ├── ai.ts                # OpenAI — sugestões e churn
│   ├── plans.ts             # Feature flags por plano + PlanGate
│   ├── stripe.ts            # Checkout e portal Stripe
│   ├── zapi.ts              # Envio de mensagens WhatsApp
│   └── supabase/            # Clients (browser, server, service)
├── supabase/                # Migrations SQL
├── DEPLOY.md                # Guia de deploy detalhado
└── README.md
```

---

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta no Supabase (gratuita)

### 1. Clonar e instalar

```bash
git clone https://github.com/SEU_USUARIO/agendaela.git
cd agendaela
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha o `.env.local` com suas chaves (veja seção abaixo).

### 3. Configurar o banco de dados

Execute no SQL Editor do Supabase as migrations necessárias (detalhadas em `DEPLOY.md`).

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### 5. (Opcional) Testar webhooks do Stripe localmente

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypassa RLS) | ✅ |
| `NEXT_PUBLIC_APP_URL` | URL base da aplicação | ✅ |
| `STRIPE_SECRET_KEY` | Secret key do Stripe | ✅ pagamentos |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe | ✅ pagamentos |
| `STRIPE_PRICE_SOLO_MONTHLY` | Price ID plano Solo mensal | ✅ pagamentos |
| `STRIPE_PRICE_SOLO_ANNUAL` | Price ID plano Solo anual | ✅ pagamentos |
| `STRIPE_PRICE_STUDIO_MONTHLY` | Price ID plano Studio mensal | ✅ pagamentos |
| `STRIPE_PRICE_STUDIO_ANNUAL` | Price ID plano Studio anual | ✅ pagamentos |
| `STRIPE_PRICE_CLINICA_MONTHLY` | Price ID plano Clínica mensal | ✅ pagamentos |
| `STRIPE_PRICE_CLINICA_ANNUAL` | Price ID plano Clínica anual | ✅ pagamentos |
| `ZAPI_INSTANCE_ID` | ID da instância Z-API | Opcional |
| `ZAPI_TOKEN` | Token Z-API | Opcional |
| `OPENAI_API_KEY` | Chave OpenAI para IA | Opcional |
| `CRON_SECRET` | Segredo para proteger cron jobs | Opcional |

---

## Planos de Assinatura

| Plano   | Preço/mês | Profissionais | WhatsApp  | IA |
|---------|-----------|---------------|-----------|-----|
| Trial   | Grátis    | 1             | —         | —  |
| Solo    | R$59      | 1             | 100/mês   | —  |
| Studio  | R$119     | 3             | Ilimitado | ✅ |
| Clínica | R$199     | Ilimitados    | Ilimitado | ✅ |

---

## Deploy

Consulte o arquivo [DEPLOY.md](./DEPLOY.md) para o guia completo.

**Resumo:**
1. Push para GitHub → Import na Vercel
2. Configurar variáveis de ambiente na Vercel
3. Rodar migrations no Supabase
4. Configurar webhook Stripe
5. Apontar domínio personalizado

---

## Roadmap de Features Futuras

- [ ] Programa de fidelidade — pontos por visita
- [ ] Multi-profissional — agenda por profissional no plano Studio
- [ ] Pacotes de serviços — combos com desconto
- [ ] Pagamento online via Pix/cartão no agendamento
- [ ] App mobile (PWA com notificações push)
- [ ] Integração Instagram — publicar horários disponíveis
- [ ] Lista de espera — fila quando horário esgotado
- [ ] Formulário de anamnese antes do primeiro atendimento
- [ ] API pública para integrações externas

---

## Licença

MIT © AgendaEla
