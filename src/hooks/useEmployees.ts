import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  MergeEmployeesPayload,
} from '../types/database';

const LOCAL_BALANCE_BACKUP_KEY = 'gestao-folgas-employees-balance-backup';

interface LocalEmployeeOverlay {
  name?: string;
  team_id?: string | null;
  saldo_base_minutos?: number | null;
  saldo_base_horas?: string | null;
  data_base_saldo?: string | null;
  updated_at?: string | null;
  deleted?: boolean;
}

const loadLocalOverlays = (): Record<string, LocalEmployeeOverlay> => {
  try {
    const raw = localStorage.getItem(LOCAL_BALANCE_BACKUP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalOverlays = (map: Record<string, LocalEmployeeOverlay>) => {
  try {
    localStorage.setItem(LOCAL_BALANCE_BACKUP_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
};

// Validador de formato UUID v4
const isValidUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mergeWithLocalOverlay = (list: Employee[]): Employee[] => {
    const overlays = loadLocalOverlays();
    return list
      .filter((emp) => !overlays[emp.id]?.deleted)
      .map((emp) => {
        const ov = overlays[emp.id];
        if (!ov) return emp;
        return {
          ...emp,
          name: ov.name ? ov.name : emp.name,
          saldo_base_minutos:
            emp.saldo_base_minutos !== undefined && emp.saldo_base_minutos !== null
              ? emp.saldo_base_minutos
              : (ov.saldo_base_minutos ?? null),
          saldo_base_horas: emp.saldo_base_horas ?? ov.saldo_base_horas ?? null,
          data_base_saldo: emp.data_base_saldo ?? ov.data_base_saldo ?? null,
          updated_at: emp.updated_at ?? ov.updated_at ?? null,
        };
      });
  };

  const fetchEmployees = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Tenta buscar com todas as colunas novas de saldo + join em teams
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          team_id,
          saldo_base_minutos,
          saldo_base_horas,
          data_base_saldo,
          updated_at,
          teams (
            id,
            name
          )
        `)
        .order('name', { ascending: true });

      if (!fetchError && data) {
        setEmployees(mergeWithLocalOverlay(data as unknown as Employee[]));
        return;
      }

      // 2. Fallback caso as colunas de saldo ainda não tenham sido criadas no Supabase
      console.warn('Buscando colaboradores com schema padrão (pré-migration de saldo):', fetchError?.message);
      const { data: stdData, error: stdError } = await supabase
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

      if (!stdError && stdData) {
        setEmployees(mergeWithLocalOverlay(stdData as unknown as Employee[]));
        return;
      }

      // 3. Fallback básico sem join de times
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('employees')
        .select('id, name')
        .order('name', { ascending: true });

      if (fallbackError) throw fallbackError;
      setEmployees(mergeWithLocalOverlay((fallbackData as unknown as Employee[]) || []));
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

      if (rawTeamId) {
        if (isValidUUID(rawTeamId)) {
          validTeamId = rawTeamId;
        } else {
          try {
            const { data: teamData } = await supabase
              .from('teams')
              .select('id')
              .ilike('name', rawTeamId)
              .maybeSingle();

            if (teamData?.id && isValidUUID(teamData.id)) {
              validTeamId = teamData.id;
            } else {
              const teamNameFormatted =
                rawTeamId.toLowerCase() === 'stellantis'
                  ? 'Stellantis'
                  : rawTeamId.toLowerCase() === 'iveco'
                    ? 'Iveco'
                    : rawTeamId;

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
        if (insertError.message.includes('team_id') || insertError.code === '42703') {
          const { data: fallbackCreated, error: fallbackErr } = await supabase
            .from('employees')
            .insert([{ name: trimmedName }])
            .select('id, name')
            .single();

          if (fallbackErr) throw fallbackErr;
          setEmployees((prev) =>
            [...prev, fallbackCreated as Employee].sort((a, b) => a.name.localeCompare(b.name))
          );
          return fallbackCreated as Employee;
        }
        throw insertError;
      }

      setEmployees((prev) =>
        [...prev, data as unknown as Employee].sort((a, b) => a.name.localeCompare(b.name))
      );
      return data as unknown as Employee;
    } catch (err: any) {
      console.error('Erro ao adicionar colaborador:', err);
      throw new Error(err.message || 'Falha ao cadastrar colaborador.');
    }
  };

  /**
   * Atualiza dados cadastrais e/ou saldo base de um colaborador
   */
  const updateEmployee = async (payload: UpdateEmployeePayload): Promise<Employee> => {
    const nowIso = new Date().toISOString();
    const updateFields: Record<string, any> = {
      updated_at: nowIso,
    };

    if (payload.name !== undefined) updateFields.name = payload.name.trim();
    if (payload.team_id !== undefined) updateFields.team_id = payload.team_id || null;
    if (payload.saldo_base_minutos !== undefined) {
      updateFields.saldo_base_minutos = payload.saldo_base_minutos;
    }
    if (payload.saldo_base_horas !== undefined) {
      updateFields.saldo_base_horas = payload.saldo_base_horas;
    }
    if (payload.data_base_saldo !== undefined) {
      updateFields.data_base_saldo = payload.data_base_saldo || null;
    }

    // Salva no overlay local como garantia imediata
    const overlays = loadLocalOverlays();
    overlays[payload.id] = {
      ...overlays[payload.id],
      ...updateFields,
    };
    saveLocalOverlays(overlays);

    if (isSupabaseConfigured) {
      const { data, error: updateErr } = await supabase
        .from('employees')
        .update(updateFields)
        .eq('id', payload.id)
        .select(`
          id,
          name,
          team_id,
          saldo_base_minutos,
          saldo_base_horas,
          data_base_saldo,
          updated_at,
          teams (
            id,
            name
          )
        `)
        .maybeSingle();

      if (!updateErr && data) {
        const updatedEmp = data as unknown as Employee;
        setEmployees((prev) =>
          prev
            .map((emp) => (emp.id === payload.id ? { ...emp, ...updatedEmp } : emp))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        return updatedEmp;
      }

      // Fallback caso as colunas de saldo ainda não tenham sido migradas no banco:
      // atualiza ao menos name e team_id no Supabase
      if (payload.name !== undefined || payload.team_id !== undefined) {
        const basicFields: Record<string, any> = {};
        if (payload.name !== undefined) basicFields.name = payload.name.trim();
        if (payload.team_id !== undefined) basicFields.team_id = payload.team_id || null;

        const { data: basicData } = await supabase
          .from('employees')
          .update(basicFields)
          .eq('id', payload.id)
          .select(`
            id,
            name,
            team_id,
            teams (
              id,
              name
            )
          `)
          .maybeSingle();

        if (basicData) {
          const merged: Employee = {
            ...(basicData as unknown as Employee),
            saldo_base_minutos: payload.saldo_base_minutos ?? overlays[payload.id]?.saldo_base_minutos ?? null,
            saldo_base_horas: payload.saldo_base_horas ?? overlays[payload.id]?.saldo_base_horas ?? null,
            data_base_saldo: payload.data_base_saldo ?? overlays[payload.id]?.data_base_saldo ?? null,
            updated_at: nowIso,
          };
          setEmployees((prev) =>
            prev
              .map((emp) => (emp.id === payload.id ? { ...emp, ...merged } : emp))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
          return merged;
        }
      }
    }

    // Atualiza estado local
    let updatedTarget: Employee | null = null;
    setEmployees((prev) =>
      prev
        .map((emp) => {
          if (emp.id !== payload.id) return emp;
          updatedTarget = {
            ...emp,
            ...updateFields,
          };
          return updatedTarget;
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    if (!updatedTarget) {
      throw new Error('Colaborador não encontrado para atualização.');
    }

    return updatedTarget;
  };

  /**
   * Atualização em lote (Importação de Planilha do RH com Data-Base e Equalização de Nome)
   */
  const bulkUpdateBalances = async (
    items: Array<{
      employeeId: string;
      newName?: string;
      saldoBaseMinutos: number;
      saldoBaseHoras: string;
      dataBaseSaldo: string;
    }>
  ): Promise<number> => {
    if (!items || items.length === 0) return 0;

    const nowIso = new Date().toISOString();
    const overlays = loadLocalOverlays();

    for (const item of items) {
      const trimmedNewName = item.newName?.trim();
      overlays[item.employeeId] = {
        ...overlays[item.employeeId],
        ...(trimmedNewName ? { name: trimmedNewName } : {}),
        saldo_base_minutos: item.saldoBaseMinutos,
        saldo_base_horas: item.saldoBaseHoras,
        data_base_saldo: item.dataBaseSaldo,
        updated_at: nowIso,
      };
    }
    saveLocalOverlays(overlays);

    if (isSupabaseConfigured) {
      await Promise.allSettled(
        items.map(async (item) => {
          const trimmedNewName = item.newName?.trim();
          const updateData: Record<string, any> = {
            saldo_base_minutos: item.saldoBaseMinutos,
            saldo_base_horas: item.saldoBaseHoras,
            data_base_saldo: item.dataBaseSaldo,
            updated_at: nowIso,
          };
          if (trimmedNewName) {
            updateData.name = trimmedNewName;
          }

          const { error: fullErr } = await supabase
            .from('employees')
            .update(updateData)
            .eq('id', item.employeeId);

          // Caso as colunas de saldo ainda não existam no Supabase, garante a equalização do nome na tabela employees
          if (fullErr && trimmedNewName) {
            await supabase
              .from('employees')
              .update({ name: trimmedNewName })
              .eq('id', item.employeeId);
          }
        })
      );
    }

    const updateMap = new Map(items.map((i) => [i.employeeId, i]));

    setEmployees((prev) =>
      prev
        .map((emp) => {
          const hit = updateMap.get(emp.id);
          if (!hit) return emp;
          const trimmedNewName = hit.newName?.trim();
          return {
            ...emp,
            name: trimmedNewName || emp.name,
            saldo_base_minutos: hit.saldoBaseMinutos,
            saldo_base_horas: hit.saldoBaseHoras,
            data_base_saldo: hit.dataBaseSaldo,
            updated_at: nowIso,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    return items.length;
  };

  /**
   * Exclui um colaborador cadastrado
   */
  const deleteEmployee = async (employeeId: string): Promise<void> => {
    const overlays = loadLocalOverlays();
    overlays[employeeId] = {
      ...overlays[employeeId],
      deleted: true,
    };
    saveLocalOverlays(overlays);

    if (isSupabaseConfigured) {
      await supabase.from('employees').delete().eq('id', employeeId);
    }

    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
  };

  /**
   * Unifica (Merge) dois colaboradores duplicados:
   * 1. Transfere todas as folgas (time_offs) e férias (vacations) de sourceEmployeeId para targetEmployeeId
   * 2. Atualiza targetEmployeeId com o nome oficial, equipe, saldo base e data-base consolidados
   * 3. Exclui o registro duplicado (sourceEmployeeId)
   */
  const mergeEmployees = async (payload: MergeEmployeesPayload): Promise<Employee> => {
    const {
      targetEmployeeId,
      sourceEmployeeId,
      finalName,
      finalTeamId,
      finalSaldoBaseMinutos,
      finalSaldoBaseHoras,
      finalDataBaseSaldo,
    } = payload;

    if (!targetEmployeeId || !sourceEmployeeId || targetEmployeeId === sourceEmployeeId) {
      throw new Error('Selecione dois cadastros diferentes para unificar.');
    }

    if (isSupabaseConfigured) {
      // 1. Transferir Folgas (time_offs) do cadastro duplicado para o principal
      const { data: sourceTimeOffs } = await supabase
        .from('time_offs')
        .select('id, date, description, is_full_day, hours')
        .eq('employee_id', sourceEmployeeId);

      if (sourceTimeOffs && sourceTimeOffs.length > 0) {
        const { data: updatedTimeOffs, error: updateToErr } = await supabase
          .from('time_offs')
          .update({ employee_id: targetEmployeeId })
          .eq('employee_id', sourceEmployeeId)
          .select('id');

        // Fallback seguro (INSERT + DELETE) caso a policy de UPDATE em time_offs ainda não tenha sido aplicada
        if (updateToErr || !updatedTimeOffs || updatedTimeOffs.length === 0) {
          const clonedTimeOffs = sourceTimeOffs.map((to) => ({
            employee_id: targetEmployeeId,
            date: to.date,
            description: to.description,
            is_full_day: to.is_full_day,
            hours: to.hours,
          }));
          const { error: insertCloneErr } = await supabase
            .from('time_offs')
            .insert(clonedTimeOffs);
          if (!insertCloneErr) {
            await supabase
              .from('time_offs')
              .delete()
              .in(
                'id',
                sourceTimeOffs.map((to) => to.id)
              );
          }
        }
      }

      // 2. Transferir Férias (vacations) do cadastro duplicado para o principal
      const { data: sourceVacations } = await supabase
        .from('vacations')
        .select('id, start_date, return_date, days, notes')
        .eq('employee_id', sourceEmployeeId);

      if (sourceVacations && sourceVacations.length > 0) {
        const { data: updatedVacations, error: updateVacErr } = await supabase
          .from('vacations')
          .update({ employee_id: targetEmployeeId })
          .eq('employee_id', sourceEmployeeId)
          .select('id');

        // Fallback seguro (INSERT + DELETE) caso a policy de UPDATE em vacations ainda não tenha sido aplicada
        if (updateVacErr || !updatedVacations || updatedVacations.length === 0) {
          const clonedVacations = sourceVacations.map((vac) => ({
            employee_id: targetEmployeeId,
            start_date: vac.start_date,
            return_date: vac.return_date,
            days: vac.days,
            notes: vac.notes,
          }));
          const { error: insertVacCloneErr } = await supabase
            .from('vacations')
            .insert(clonedVacations);
          if (!insertVacCloneErr) {
            await supabase
              .from('vacations')
              .delete()
              .in(
                'id',
                sourceVacations.map((v) => v.id)
              );
          }
        }
      }
    }

    // 3. Atualizar o colaborador principal (target) com os dados consolidados
    const updatedTarget = await updateEmployee({
      id: targetEmployeeId,
      name: finalName.trim(),
      team_id: finalTeamId,
      saldo_base_minutos: finalSaldoBaseMinutos,
      saldo_base_horas: finalSaldoBaseHoras,
      data_base_saldo: finalDataBaseSaldo,
    });

    // 4. Excluir o colaborador duplicado (source)
    await deleteEmployee(sourceEmployeeId);

    return updatedTarget;
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
    updateEmployee,
    bulkUpdateBalances,
    deleteEmployee,
    mergeEmployees,
  };
}
