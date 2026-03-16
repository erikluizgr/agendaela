# Deploy AgendaEla — Passo a Passo

## Pré-requisitos
- Conta na [Vercel](https://vercel.com)
- Repositório no GitHub com o código
- Projeto criado no [Supabase](https://supabase.com)
- Conta no [Stripe](https://stripe.com)
- (Opcional) Conta no [Z-API](https://z-api.io) para WhatsApp
- (Opcional) Chave da [OpenAI](https://platform.openai.com)

---

## 1. Push para o GitHub

```bash
git add .
git commit -m "feat: versão inicial AgendaEla"
git remote add origin https://github.com/SEU_USUARIO/agendaela.git
git push -u origin main
```

---

## 2. Importar na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **Import Git Repository**
3. Selecione o repositório `agendaela`
4. Framework: **Next.js** (detectado automaticamente)
5. **Não clique em Deploy ainda** — configure as variáveis primeiro

---

## 3. Variáveis de ambiente na Vercel

Em **Settings → Environment Variables**, adicione:

### Supabase (obrigatório)
```
NEXT_PUBLIC_SUPABASE_URL         = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY        = eyJhbGci...   ← Settings > API > service_role
```

### App URL (obrigatório)
```
NEXT_PUBLIC_APP_URL              = https://agendaela.com.br
```

### Stripe (obrigatório para pagamentos)
```
STRIPE_SECRET_KEY                = sk_live_...
STRIPE_WEBHOOK_SECRET            = whsec_...     ← gerado na etapa 5
STRIPE_PRICE_SOLO_MONTHLY        = price_...
STRIPE_PRICE_SOLO_ANNUAL         = price_...
STRIPE_PRICE_STUDIO_MONTHLY      = price_...
STRIPE_PRICE_STUDIO_ANNUAL       = price_...
STRIPE_PRICE_CLINICA_MONTHLY     = price_...
STRIPE_PRICE_CLINICA_ANNUAL      = price_...
```

### Automações (opcional)
```
ZAPI_INSTANCE_ID                 = sua_instancia
ZAPI_TOKEN                       = seu_token
OPENAI_API_KEY                   = sk-proj-...
CRON_SECRET                      = string_aleatoria_segura_32chars
```

> **Dica:** Para o `CRON_SECRET`, gere com: `openssl rand -hex 32`

---

## 4. Migrations do Supabase em produção

Execute no **SQL Editor** do Supabase (em ordem):

### 4.1 Colunas novas nas tabelas existentes
```sql
-- Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zapi_instance_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zapi_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_reminders_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_confirmation_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_birthday_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_summary_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_summary_time text DEFAULT '07:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday_discount_pct integer DEFAULT 10;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday_custom_message text;

-- Appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
```

### 4.2 Políticas RLS públicas
```sql
-- Perfis públicos (para página de agendamento)
CREATE POLICY "Perfis públicos são visíveis para todos"
ON profiles FOR SELECT USING (is_active = true);

-- Serviços públicos
CREATE POLICY "Serviços públicos são visíveis para todos"
ON services FOR SELECT USING (true);

-- Horários de trabalho públicos
CREATE POLICY "Horários públicos são visíveis para todos"
ON working_hours FOR SELECT USING (true);

-- Agendamentos (leitura pública para verificar disponibilidade)
CREATE POLICY "Disponibilidade pública"
ON appointments FOR SELECT USING (true);
```

---

## 5. Configurar webhook do Stripe

1. Acesse [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em **Add endpoint**
3. URL: `https://agendaela.com.br/api/webhooks/stripe`
4. Eventos a escutar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copie o **Signing secret** (`whsec_...`) e adicione como `STRIPE_WEBHOOK_SECRET` na Vercel

---

## 6. Configurar domínio personalizado

1. Na Vercel: **Settings → Domains → Add Domain**
2. Digite: `agendaela.com.br`
3. Adicione os registros DNS no seu provedor de domínio:
   ```
   Tipo  Nome    Valor
   A     @       76.76.21.21
   CNAME www     cname.vercel-dns.com
   ```
4. Aguarde a propagação (pode levar até 24h)
5. A Vercel emite o certificado SSL automaticamente

---

## 7. Configurar Cron Jobs (lembretes automáticos)

### Opção A — Vercel Cron (recomendado, grátis no Pro)
Crie o arquivo `vercel.json` na raiz:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 7 * * *"
    }
  ]
}
```

> Os crons da Vercel chamam os endpoints com o header `Authorization: Bearer CRON_SECRET` automaticamente se você usar a biblioteca `@vercel/cron`.

### Opção B — Cron externo (ex: cron-job.org)
Configure chamadas diárias:
```
URL: https://agendaela.com.br/api/cron/reminders
Método: GET
Header: Authorization: Bearer SEU_CRON_SECRET
Horário: 10:00 BRT (13:00 UTC)
```

---

## 8. Teste do fluxo completo

### Checklist pós-deploy:
- [ ] Acessar `https://agendaela.com.br` — landing page carrega
- [ ] Cadastrar nova conta → receber e-mail de confirmação
- [ ] Completar onboarding (perfil → serviços → horários)
- [ ] Acessar `https://agendaela.com.br/SEU-SLUG` — página pública funciona
- [ ] Fazer agendamento pela página pública
- [ ] Verificar agendamento aparece na agenda
- [ ] Testar checkout Stripe (cartão de teste: `4242 4242 4242 4242`)
- [ ] Verificar webhook Stripe ativou o plano
- [ ] Testar envio de mensagem WhatsApp (se Z-API configurado)
- [ ] Testar exportação CSV do financeiro

---

## Variáveis de ambiente — resumo final

```env
# ── SUPABASE (obrigatório) ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── APP ─────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://agendaela.com.br

# ── STRIPE (obrigatório para pagamentos) ────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SOLO_MONTHLY=price_...
STRIPE_PRICE_SOLO_ANNUAL=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_ANNUAL=price_...
STRIPE_PRICE_CLINICA_MONTHLY=price_...
STRIPE_PRICE_CLINICA_ANNUAL=price_...

# ── AUTOMAÇÕES (opcional) ────────────────────────────────────────
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
OPENAI_API_KEY=
CRON_SECRET=
```
