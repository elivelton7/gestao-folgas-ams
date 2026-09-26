import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Employee, CreateEmployeePayload } from '../types/database';

// Validador de formato UUID v4
const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Tenta buscar com o join em teams
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          team_id,
          teams (
            id,
            name
          )
        `)
        .order('name', { ascending: true });

      if (fetchError) {
        // Fallback caso a tabela teams ou coluna team_id ainda não tenham sido migradas no Supabase
        console.warn('Tentando busca simples sem join de times:', fetchError.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('employees')
          .select('id, name')
          .order('name', { ascending: true });

        if (fallbackError) throw fallbackError;
        setEmployees((fallbackData as unknown as Employee[]) || []);
        return;
      }

      setEmployees((data as unknown as Employee[]) || []);
    } catch (err: any) {
      console.error('Erro ao buscar colaboradores:', err);
      setError(err.message || 'Falha ao carregar a lista de colaboradores.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addEmployee = async (nameOrPayload: string | CreateEmployeePayload): Promise<Employee> => {
    try {
      setError(null);
      const name = typeof nameOrPayload === 'string' ? nameOrPayload : nameOrPayload.name;
      const rawTeamId = typeof nameOrPayload === 'object' ? nameOrPayload.team_id : null;
      const trimmedName = name.trim();

      if (!trimmedName) {
        throw new Error('O nome do colaborador é obrigatório.');
      }

      let validTeamId: string | null = null;

      // Se o team_id foi fornecido, garantir que seja um UUID real válido
      if (rawTeamId) {
        if (isValidUUID(rawTeamId)) {
          validTeamId = rawTeamId;
        } else {
          // O identificador veio como string (ex: "stellantis" ou "iveco")
          // Busca o time pelo nome no banco para obter seu UUID real
          try {
            const { data: teamData } = await supabase
              .from('teams')
              .select('id')
              .ilike('name', rawTeamId)
              .maybeSingle();

            if (teamData?.id && isValidUUID(teamData.id)) {
              validTeamId = teamData.id;
            } else {
              // Se não encontrou, tenta criar o time no Supabase
              const teamNameFormatted = 
                rawTeamId.toLowerCase() === 'stellantis' ? 'Stellantis' :
                rawTeamId.toLowerCase() === 'iveco' ? 'Iveco' : rawTeamId;

              const { data: createdTeam } = await supabase
                .from('teams')
                .insert([{ name: teamNameFormatted }])
                .select('id')
                .maybeSingle();

              if (createdTeam?.id && isValidUUID(createdTeam.id)) {
                validTeamId = createdTeam.id;
              }
            }
          } catch (teamLookupErr) {
            console.warn('Não foi possível resolver o UUID do time:', teamLookupErr);
            validTeamId = null;
          }
        }
      }

      const insertData: { name: string; team_id?: string | null } = { name: trimmedName };
      if (validTeamId) {
        insertData.team_id = validTeamId;
      }

      const { data, error: insertError } = await supabase
        .from('employees')
        .insert([insertData])
        .select(`
          id,
          name,
          team_id,
          teams (
            id,
            name
          )
        `)
        .single();

      if (insertError) {
        // Fallback caso a coluna team_id ainda não exista na tabela employees
        if (insertError.message.includes('team_id') || insertError.code === '42703') {
          console.warn('Coluna team_id não encontrada em employees. Salvando sem vínculo de time.');
          const { data: fallbackCreated, error: fallbackErr } = await supabase
            .from('employees')
            .insert([{ name: trimmedName }])
            .select('id, name')
            .single();

          if (fallbackErr) throw fallbackErr;
          setEmployees((prev) => [...prev, fallbackCreated as Employee].sort((a, b) => a.name.localeCompare(b.name)));
          return fallbackCreated as Employee;
        }
        throw insertError;
      }

      // Atualiza a lista local mantendo ordenação
      setEmployees((prev) => [...prev, data as unknown as Employee].sort((a, b) => a.name.localeCompare(b.name)));
      return data as unknown as Employee;
    } catch (err: any) {
      console.error('Erro ao adicionar colaborador:', err);
      throw new Error(err.message || 'Falha ao cadastrar colaborador.');
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    error,
    refreshEmployees: fetchEmployees,
    addEmployee,
  };
}
