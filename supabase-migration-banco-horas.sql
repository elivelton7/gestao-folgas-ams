-- ==============================================================================
-- MIGRATION SUPABASE: GESTÃO DE EQUIPES E BANCO DE HORAS (TIME AMS)
-- Execute este script no SQL Editor do Supabase após revisão.
-- ==============================================================================

-- 1. Garantir tabela de Equipes (public.teams)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Garantir colunas de Equipe e Banco de Horas na tabela de Colaboradores (public.employees)
ALTER TABLE public.employees 
    ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS saldo_base_minutos INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS saldo_base_horas TEXT DEFAULT '00:00',
    ADD COLUMN IF NOT EXISTS data_base_saldo DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Criar índice para otimizar consultas por equipe e data-base
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON public.employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_data_base_saldo ON public.employees(data_base_saldo);

-- 4. Habilitar RLS (caso ainda não esteja ativo)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 5. Garantir Políticas de RLS completas (SELECT, INSERT, UPDATE, DELETE) para teams e employees
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Permitir atualização de times'
    ) THEN
        CREATE POLICY "Permitir atualização de times" ON public.teams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Permitir exclusão de times'
    ) THEN
        CREATE POLICY "Permitir exclusão de times" ON public.teams FOR DELETE TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Permitir atualização de colaboradores'
    ) THEN
        CREATE POLICY "Permitir atualização de colaboradores" ON public.employees FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees' AND policyname = 'Permitir exclusão de colaboradores'
    ) THEN
        CREATE POLICY "Permitir exclusão de colaboradores" ON public.employees FOR DELETE TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'time_offs' AND policyname = 'Permitir atualização de folgas'
    ) THEN
        CREATE POLICY "Permitir atualização de folgas" ON public.time_offs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vacations' AND policyname = 'Permitir atualização de férias'
    ) THEN
        CREATE POLICY "Permitir atualização de férias" ON public.vacations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Permissões explícitas (GRANT ALL) para os roles do Supabase
GRANT ALL ON TABLE public.teams TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.employees TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.time_offs TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.vacations TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.report_recipients TO authenticated, anon, service_role;
