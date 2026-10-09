import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { VacationWithEmployee, CreateVacationPayload } from '../types/database';

const LOCAL_STORAGE_KEY = 'gestao-folgas-vacations-backup';

export function useVacations() {
  const [vacations, setVacations] = useState<VacationWithEmployee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper para carregar do localStorage
  const loadLocalBackup = (): VacationWithEmployee[] => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  // Helper para salvar no localStorage
  const saveLocalBackup = (list: VacationWithEmployee[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignora erro de quota do localStorage
    }
  };

  const fetchVacations = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setVacations(loadLocalBackup());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('vacations')
        .select(`
          id,
          employee_id,
          start_date,
          return_date,
          days,
          notes,
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
        .order('start_date', { ascending: true });

      if (fetchError) {
        console.warn('Tabela vacations pode não estar criada no Supabase ainda. Utilizando armazenamento local temporário:', fetchError.message);
        setVacations(loadLocalBackup());
        return;
      }

      const list = (data as unknown as VacationWithEmployee[]) || [];
      setVacations(list);
      saveLocalBackup(list);
    } catch (err: any) {
      console.error('Erro ao buscar férias:', err);
      setError(err.message || 'Falha ao carregar as férias.');
      setVacations(loadLocalBackup());
    } finally {
      setLoading(false);
    }
  }, []);

  const addVacation = async (payload: CreateVacationPayload, employeeData?: any): Promise<VacationWithEmployee> => {
    try {
      setError(null);

      const recordToInsert = {
        employee_id: payload.employee_id,
        start_date: payload.start_date,
        return_date: payload.return_date,
        days: payload.days,
        notes: payload.notes ? payload.notes.trim() : null,
      };

      if (isSupabaseConfigured) {
        try {
          const { data, error: insertError } = await supabase
            .from('vacations')
            .insert([recordToInsert])
            .select(`
              id,
              employee_id,
              start_date,
              return_date,
              days,
              notes,
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

          if (!insertError && data) {
            const newItem = data as unknown as VacationWithEmployee;
            setVacations((prev) => {
              const updated = [...prev, newItem].sort((a, b) => a.start_date.localeCompare(b.start_date));
              saveLocalBackup(updated);
              return updated;
            });
            return newItem;
          }
        } catch (supabaseErr: any) {
          console.warn('Erro ao inserir vacations no Supabase. Salvando localmente:', supabaseErr);
        }
      }

      // Fallback local se o Supabase não estiver configurado ou a tabela ainda não existir
      const localNewItem: VacationWithEmployee = {
        id: `local-vacation-${Date.now()}`,
        employee_id: payload.employee_id,
        start_date: payload.start_date,
        return_date: payload.return_date,
        days: payload.days,
        notes: payload.notes ? payload.notes.trim() : null,
        created_at: new Date().toISOString(),
        employees: employeeData || {
          id: payload.employee_id,
          name: 'Colaborador',
          team_id: null,
        },
      };

      setVacations((prev) => {
        const updated = [...prev, localNewItem].sort((a, b) => a.start_date.localeCompare(b.start_date));
        saveLocalBackup(updated);
        return updated;
      });

      return localNewItem;
    } catch (err: any) {
      console.error('Erro ao cadastrar férias:', err);
      throw new Error(err.message || 'Falha ao salvar as férias.');
    }
  };

  const deleteVacation = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);

      if (isSupabaseConfigured && !id.startsWith('local-')) {
        try {
          const { error: deleteError } = await supabase
            .from('vacations')
            .delete()
            .eq('id', id);

          if (deleteError) {
            console.warn('Erro ao excluir no Supabase, removendo localmente:', deleteError.message);
          }
        } catch (supabaseErr) {
          console.warn('Exceção ao deletar no Supabase:', supabaseErr);
        }
      }

      setVacations((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        saveLocalBackup(updated);
        return updated;
      });
    } catch (err: any) {
      console.error('Erro ao excluir férias:', err);
      throw new Error(err.message || 'Falha ao excluir as férias.');
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Verifica se há conflito de período de férias para outros colaboradores da mesma equipe
   */
  const checkVacationConflicts = (
    startDate: string,
    returnDate: string,
    excludeEmployeeId?: string
  ): VacationWithEmployee[] => {
    if (!startDate || !returnDate) return [];

    return vacations.filter((item) => {
      if (excludeEmployeeId && item.employee_id === excludeEmployeeId) return false;

      // Há sobreposição se: item.start_date <= returnDate E item.return_date >= startDate
      return item.start_date <= returnDate && item.return_date >= startDate;
    });
  };

  useEffect(() => {
    fetchVacations();
  }, [fetchVacations]);

  return {
    vacations,
    loading,
    deletingId,
    error,
    refreshVacations: fetchVacations,
    addVacation,
    deleteVacation,
    checkVacationConflicts,
  };
}
