-- ============================================================
-- AgendaEla — Schema Inicial
-- Migração: 001_initial_schema
-- ============================================================

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FUNÇÃO: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABELA: profiles
-- Perfil de cada profissional autônoma
-- ============================================================
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  business_name         TEXT,
  phone                 TEXT,
  avatar_url            TEXT,
  slug                  TEXT UNIQUE, -- link público: agendaela.com/maria
  bio                   TEXT,
  address               TEXT,
  plan                  TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'solo', 'studio', 'clinica')),
  trial_ends_at         TIMESTAMP WITH TIME ZONE,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- ============================================================
-- TABELA: services
-- Serviços oferecidos por cada profissional
-- ============================================================
CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price            DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  color            TEXT DEFAULT '#B565A7', -- cor para exibição no calendário
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_services_profile_id ON services(profile_id);
CREATE INDEX idx_services_is_active ON services(profile_id, is_active);

-- ============================================================
-- TABELA: clients
-- Clientes cadastrados por cada profissional
-- ============================================================
CREATE TABLE clients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  birth_date            DATE,
  notes                 TEXT,
  total_appointments    INT NOT NULL DEFAULT 0,
  total_spent           DECIMAL(10, 2) NOT NULL DEFAULT 0,
  last_appointment_at   TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clients_profile_id ON clients(profile_id);
CREATE INDEX idx_clients_phone ON clients(profile_id, phone);
CREATE INDEX idx_clients_full_name ON clients(profile_id, full_name);

-- ============================================================
-- TABELA: appointments
-- Agendamentos de cada profissional
-- ============================================================
CREATE TABLE appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_id     UUID REFERENCES services(id) ON DELETE SET NULL,
  starts_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at        TIMESTAMP WITH TIME ZONE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'confirmed'
                   CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  price          DECIMAL(10, 2),
  notes          TEXT,
  reminder_sent  BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chk_appointment_dates CHECK (ends_at > starts_at)
);

-- Índices críticos para consultas de agenda
CREATE INDEX idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX idx_appointments_starts_at ON appointments(profile_id, starts_at);
CREATE INDEX idx_appointments_status ON appointments(profile_id, status);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);

-- ============================================================
-- TABELA: payments
-- Pagamentos vinculados a agendamentos
-- ============================================================
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount          DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  method          TEXT CHECK (method IN ('pix', 'cash', 'credit_card', 'debit_card')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'paid', 'refunded')),
  paid_at         TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payments_profile_id ON payments(profile_id);
CREATE INDEX idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX idx_payments_status ON payments(profile_id, status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuária só vê seus próprios dados
-- ============================================================

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
CREATE POLICY "Usuária vê seu próprio perfil"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuária atualiza seu próprio perfil"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuária insere seu próprio perfil"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies: services
CREATE POLICY "Usuária gerencia seus serviços"
  ON services FOR ALL USING (
    profile_id = auth.uid()
  );

-- Policies: clients
CREATE POLICY "Usuária gerencia seus clientes"
  ON clients FOR ALL USING (
    profile_id = auth.uid()
  );

-- Policies: appointments
CREATE POLICY "Usuária gerencia seus agendamentos"
  ON appointments FOR ALL USING (
    profile_id = auth.uid()
  );

-- Policies: payments
CREATE POLICY "Usuária gerencia seus pagamentos"
  ON payments FOR ALL USING (
    profile_id = auth.uid()
  );

-- ============================================================
-- FUNÇÃO: cria perfil automaticamente após registro
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NOW() + INTERVAL '14 days' -- trial de 14 dias
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNÇÃO: atualiza estatísticas do cliente após agendamento
-- ============================================================
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza total de agendamentos e último atendimento
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE clients
    SET
      total_appointments = total_appointments + 1,
      last_appointment_at = NEW.starts_at
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_client_stats
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_client_stats();
