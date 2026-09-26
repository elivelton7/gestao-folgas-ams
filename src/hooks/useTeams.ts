import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Team, CreateTeamPayload } from '../types/database';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setTeams([
        { id: '11111111-1111-4111-a111-111111111111', name: 'Stellantis' },
        { id: '22222222-2222-4222-a222-222222222222', name: 'Iveco' },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) {
        // Tabela teams pode ainda não ter sido criada no Supabase
        console.warn('Tabela teams não encontrada ou erro no Supabase:', fetchError.message);
        setTeams([]);
        return;
      }

      if (data && data.length > 0) {
        setTeams(data);
      } else {
        // Se a tabela teams existe mas está vazia, insere automaticamente os times padrão com UUIDs reais
        const { data: insertedDefaults, error: seedError } = await supabase
          .from('teams')
          .insert([
            { name: 'Stellantis' },
            { name: 'Iveco' }
          ])
          .select('*')
          .order('name', { ascending: true });

        if (!seedError && insertedDefaults && insertedDefaults.length > 0) {
          setTeams(insertedDefaults);
        } else {
          setTeams([]);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar times do Supabase:', err.message);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTeam = async (payload: CreateTeamPayload): Promise<Team> => {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      throw new Error('O nome do time é obrigatório.');
    }

    if (!isSupabaseConfigured) {
      const mockTeam: Team = { 
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '33333333-3333-4333-a333-333333333333', 
        name: trimmed 
      };
      setTeams((prev) => [...prev, mockTeam]);
      return mockTeam;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('teams')
        .insert([{ name: trimmed }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setTeams((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err: any) {
      console.error('Erro ao adicionar time:', err);
      throw new Error(err.message || 'Falha ao salvar novo time.');
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    loading,
    error,
    refreshTeams: fetchTeams,
    addTeam,
  };
}
