import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { TimeOffWithEmployee, CreateTimeOffPayload } from '../types/database';

export function useTimeOffs() {
  const [timeOffs, setTimeOffs] = useState<TimeOffWithEmployee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeOffs = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Join com employees e teams
      const { data, error: fetchError } = await supabase
        .from('time_offs')
        .select(`
          id,
          employee_id,
          date,
          description,
          is_full_day,
          hours,
          created_at,
          employees (
            id,
            name,
            team_id,
            teams (
              id,
              name
            )
          )
        `)
        .order('date', { ascending: true });

      if (fetchError) {
        // Fallback caso teams ainda não esteja configurado
        console.warn('Tentando busca sem join de times nas folgas:', fetchError.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('time_offs')
          .select(`
            id,
            employee_id,
            date,
            description,
            is_full_day,
            hours,
            created_at,
            employees (
              id,
              name
            )
          `)
          .order('date', { ascending: true });

        if (fallbackError) throw fallbackError;
        setTimeOffs((fallbackData as unknown as TimeOffWithEmployee[]) || []);
        return;
      }

      setTimeOffs((data as unknown as TimeOffWithEmployee[]) || []);
    } catch (err: any) {
      console.error('Erro ao buscar folgas:', err);
      setError(err.message || 'Falha ao carregar as folgas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addTimeOff = async (payload: CreateTimeOffPayload) => {
    try {
      setError(null);

      const recordToInsert = {
        employee_id: payload.employee_id,
        date: payload.date,
        description: payload.description ? payload.description.trim() : null,
        is_full_day: payload.is_full_day,
        hours: payload.is_full_day ? null : Number(payload.hours),
      };

      const { data, error: insertError } = await supabase
        .from('time_offs')
        .insert([recordToInsert])
        .select(`
          id,
          employee_id,
          date,
          description,
          is_full_day,
          hours,
          created_at,
          employees (
            id,
            name,
            team_id,
            teams (
              id,
              name
            )
          )
        `)
        .single();

      if (insertError) {
        throw insertError;
      }

      setTimeOffs((prev) => [...prev, data as unknown as TimeOffWithEmployee]);
      return data;
    } catch (err: any) {
      console.error('Erro ao cadastrar folga:', err);
      throw new Error(err.message || 'Falha ao salvar a folga.');
    }
  };

  const deleteTimeOff = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);

      const { error: deleteError } = await supabase
        .from('time_offs')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setTimeOffs((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir folga:', err);
      throw new Error(err.message || 'Falha ao excluir a folga.');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Consulta no banco se já existe alguma folga registrada para OUTRO colaborador na data selecionada.
   */
  const checkConflicts = async (date: string, excludeEmployeeId?: string): Promise<TimeOffWithEmployee[]> => {
    if (!date || !isSupabaseConfigured) return [];

    try {
      let query = supabase
        .from('time_offs')
        .select(`
          id,
          employee_id,
          date,
          description,
          is_full_day,
          hours,
          created_at,
          employees (
            id,
            name,
            team_id,
            teams (
              id,
              name
            )
          )
        `)
        .eq('date', date);

      if (excludeEmployeeId) {
        query = query.neq('employee_id', excludeEmployeeId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Erro ao verificar conflito de folgas:', queryError);
        return [];
      }

      return (data as unknown as TimeOffWithEmployee[]) || [];
    } catch (err) {
      console.error('Falha na consulta de conflitos:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchTimeOffs();
  }, [fetchTimeOffs]);

  return {
    timeOffs,
    loading,
    deletingId,
    error,
    refreshTimeOffs: fetchTimeOffs,
    addTimeOff,
    deleteTimeOff,
    checkConflicts,
  };
}
