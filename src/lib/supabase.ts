import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://sua-url-do-supabase.supabase.co' &&
  supabaseAnonKey !== 'sua-chave-anon-aqui'
);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Configurações do Supabase ausentes ou incompletas no arquivo .env!\n' +
    'Por favor, defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
