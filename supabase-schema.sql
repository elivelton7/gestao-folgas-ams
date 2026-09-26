-- ==============================================================================
-- SCHEMA SUPABASE: GESTÃO DE FOLGAS - TIME AMS
-- Execute este script no SQL Editor do Supabase.
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela: teams (Times / Projetos)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: employees (Colaboradores)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Caso a tabela employees já exista de uma execução anterior:
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- 4. Tabela: time_offs (Folgas)
CREATE TABLE IF NOT EXISTS public.time_offs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT,
    is_full_day BOOLEAN DEFAULT TRUE NOT NULL,
    hours INTEGER NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_hours_if_partial CHECK (
        (is_full_day = TRUE AND hours IS NULL) OR 
        (is_full_day = FALSE AND hours IS NOT NULL AND hours > 0)
    )
);

-- 5. Tabela: report_recipients (Destinatários de Relatórios por E-mail)
CREATE TABLE IF NOT EXISTS public.report_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('REALTIME', 'DAILY', 'WEEKLY')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Índices para otimização de consultas e relatórios
CREATE INDEX IF NOT EXISTS idx_time_offs_date ON public.time_offs(date);
CREATE INDEX IF NOT EXISTS idx_time_offs_employee_id ON public.time_offs(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON public.employees(team_id);
CREATE INDEX IF NOT EXISTS idx_report_recipients_frequency ON public.report_recipients(frequency, is_active);

-- 7. Configuração de Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para teams
CREATE POLICY "Permitir leitura de times" 
ON public.teams FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir inserção de times" 
ON public.teams FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Políticas de acesso público para employees
CREATE POLICY "Permitir leitura de colaboradores" 
ON public.employees FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir inserção de colaboradores" 
ON public.employees FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Políticas de acesso público para time_offs
CREATE POLICY "Permitir leitura de folgas" 
ON public.time_offs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir inserção de folgas" 
ON public.time_offs FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir exclusão de folgas" 
ON public.time_offs FOR DELETE TO anon, authenticated USING (true);

-- Políticas de acesso para report_recipients
CREATE POLICY "Permitir leitura de destinatários" 
ON public.report_recipients FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Permitir inserção de destinatários" 
ON public.report_recipients FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização de destinatários" 
ON public.report_recipients FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Permitir exclusão de destinatários" 
ON public.report_recipients FOR DELETE TO anon, authenticated USING (true);

-- 8. Dados iniciais dos times principais (Stellantis e Iveco)
INSERT INTO public.teams (name) VALUES 
    ('Stellantis'),
    ('Iveco')
ON CONFLICT (name) DO NOTHING;
