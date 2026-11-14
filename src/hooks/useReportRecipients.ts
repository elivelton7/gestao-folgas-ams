import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ReportRecipient, CreateReportRecipientPayload } from '../types/database';

const TEAMS_TAG_REGEX = /\s*\|\|TEAMS:([^|]*)\|\|\s*$/;

export function encodeRecipientNameWithTeams(
  name?: string | null,
  teamIds?: string[]
): string | null {
  const cleanName = (name || '').replace(TEAMS_TAG_REGEX, '').trim();
  const validTeamIds = (teamIds || []).map((id) => id.trim()).filter(Boolean);

  if (validTeamIds.length === 0) {
    return cleanName || null;
  }

  return `${cleanName} ||TEAMS:${validTeamIds.join(',')}||`.trim();
}

export function decodeRecipientRow(row: any): ReportRecipient {
  const rawName: string = row?.name || '';
  const match = rawName.match(TEAMS_TAG_REGEX);
  const cleanName = rawName.replace(TEAMS_TAG_REGEX, '').trim() || null;

  let teamIds: string[] = [];
  if (Array.isArray(row?.team_ids) && row.team_ids.length > 0) {
    teamIds = row.team_ids;
  } else if (match && match[1]) {
    teamIds = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    id: row.id,
    name: cleanName,
    email: row.email,
    frequency: row.frequency,
    is_active: row.is_active,
    team_ids: teamIds,
    created_at: row.created_at,
  };
}

export function useReportRecipients() {
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipients = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRecipients([
        {
          id: '1',
          name: 'Gestor AMS',
          email: 'gestao.ams@empresa.com',
          frequency: 'DAILY',
          is_active: true,
          team_ids: [],
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('report_recipients')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.warn('Tabela report_recipients ainda não criada:', fetchError.message);
        setRecipients([]);
        return;
      }

      setRecipients((data || []).map(decodeRecipientRow));
    } catch (err: any) {
      console.error('Erro ao buscar destinatários de relatórios:', err);
      setError(err.message || 'Falha ao carregar e-mails cadastrados.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addRecipient = async (payload: CreateReportRecipientPayload): Promise<ReportRecipient> => {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const encodedName = encodeRecipientNameWithTeams(payload.name, payload.team_ids);

    if (!trimmedEmail) {
      throw new Error('O e-mail é obrigatório.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Informe um endereço de e-mail válido.');
    }

    if (!isSupabaseConfigured) {
      const mock: ReportRecipient = {
        id: Math.random().toString(),
        name: payload.name?.trim() || null,
        email: trimmedEmail,
        frequency: payload.frequency,
        is_active: true,
        team_ids: payload.team_ids || [],
      };
      setRecipients((prev) => [mock, ...prev]);
      return mock;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('report_recipients')
        .insert([
          {
            name: encodedName,
            email: trimmedEmail,
            frequency: payload.frequency,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const decoded = decodeRecipientRow(data);
      setRecipients((prev) => [decoded, ...prev]);
      return decoded;
    } catch (err: any) {
      console.error('Erro ao cadastrar e-mail:', err);
      throw new Error(err.message || 'Falha ao salvar o destinatário de e-mail.');
    }
  };

  const updateRecipientTeams = async (
    id: string,
    currentName: string | null,
    teamIds: string[]
  ) => {
    const encodedName = encodeRecipientNameWithTeams(currentName, teamIds);

    if (!isSupabaseConfigured) {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, team_ids: teamIds } : r))
      );
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('report_recipients')
        .update({ name: encodedName })
        .eq('id', id);

      if (updateError) throw updateError;

      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, team_ids: teamIds } : r))
      );
    } catch (err: any) {
      console.error('Erro ao atualizar equipes do destinatário:', err);
      throw new Error('Não foi possível salvar os times deste destinatário.');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (!isSupabaseConfigured) {
      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !currentStatus } : r))
      );
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('report_recipients')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (updateError) throw updateError;

      setRecipients((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !currentStatus } : r))
      );
    } catch (err: any) {
      console.error('Erro ao atualizar status do destinatário:', err);
      throw new Error('Não foi possível alterar o status do e-mail.');
    }
  };

  const deleteRecipient = async (id: string) => {
    if (!isSupabaseConfigured) {
      setRecipients((prev) => prev.filter((r) => r.id !== id));
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('report_recipients')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setRecipients((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir destinatário:', err);
      throw new Error('Não foi possível excluir o e-mail cadastrado.');
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  return {
    recipients,
    loading,
    error,
    refreshRecipients: fetchRecipients,
    addRecipient,
    updateRecipientTeams,
    toggleActive,
    deleteRecipient,
  };
}
