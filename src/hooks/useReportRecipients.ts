import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ReportRecipient, CreateReportRecipientPayload } from '../types/database';

export function useReportRecipients() {
  const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipients = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Mock inicial para demonstração caso o Supabase não esteja conectado
      setRecipients([
        {
          id: '1',
          name: 'Gestor AMS',
          email: 'gestao.ams@empresa.com',
          frequency: 'DAILY',
          is_active: true,
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

      setRecipients(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar destinatários de relatórios:', err);
      setError(err.message || 'Falha ao carregar e-mails cadastrados.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addRecipient = async (payload: CreateReportRecipientPayload): Promise<ReportRecipient> => {
    const trimmedEmail = payload.email.trim().toLowerCase();
    const trimmedName = payload.name?.trim() || null;

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
        name: trimmedName,
        email: trimmedEmail,
        frequency: payload.frequency,
        is_active: true,
      };
      setRecipients((prev) => [mock, ...prev]);
      return mock;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('report_recipients')
        .insert([
          {
            name: trimmedName,
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

      setRecipients((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('Erro ao cadastrar e-mail:', err);
      throw new Error(err.message || 'Falha ao salvar o destinatário de e-mail.');
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
    toggleActive,
    deleteRecipient,
  };
}
