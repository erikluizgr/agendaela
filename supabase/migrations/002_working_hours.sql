-- ============================================================
-- AgendaEla — Horários de trabalho e configurações de agenda
-- Migração: 002_working_hours
-- ============================================================

-- Novas colunas em profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS at_home_service   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_advance_hours INT     NOT NULL DEFAULT 1;

-- ============================================================
-- TABELA: working_hours
-- Horários de trabalho por dia da semana
-- day_of_week: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
-- ============================================================

CREATE TABLE working_hours (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week  INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  break_start  TIME,
  break_end    TIME,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT chk_times     CHECK (end_time > start_time),
  CONSTRAINT chk_break     CHECK (
    (break_start IS NULL AND break_end IS NULL)
    OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
  ),
  UNIQUE (profile_id, day_of_week)
);

CREATE INDEX idx_working_hours_profile_id ON working_hours(profile_id);

ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuária gerencia seus horários"
  ON working_hours FOR ALL USING (profile_id = auth.uid());

-- Storage bucket para avatares (executar no painel Supabase Storage):
-- Bucket name: avatars | Public: true | Allowed MIME: image/*
