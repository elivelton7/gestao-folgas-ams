import React, { useState, useMemo } from 'react';
import {
  Mail,
  X,
  Plus,
  Trash2,
  Loader2,
  Clock,
  Send,
  Info,
  CalendarDays,
  Sparkles,
  Palmtree,
  PlayCircle,
  Calendar,
} from 'lucide-react';
import type {
  ReportRecipient,
  ReportFrequency,
  TimeOffWithEmployee,
  VacationWithEmployee,
} from '../types/database';
import { formatDateBR, isVacationCurrent, getTodayDateString } from '../utils/date';

interface EmailReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: ReportRecipient[];
  loadingRecipients: boolean;
  onAddRecipient: (payload: {
    name?: string;
    email: string;
    frequency: ReportFrequency;
  }) => Promise<any>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
  onDeleteRecipient: (id: string) => Promise<void>;
  timeOffs: TimeOffWithEmployee[];
  vacations: VacationWithEmployee[];
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const EmailReportsModal: React.FC<EmailReportsModalProps> = ({
  isOpen,
  onClose,
  recipients,
  loadingRecipients,
  onAddRecipient,
  onToggleActive,
  onDeleteRecipient,
  timeOffs,
  vacations,
  onSuccessToast,
  onErrorToast,
}) => {
  const [activeTab, setActiveTab] = useState<'recipients' | 'gmail-setup' | 'preview'>(
    'recipients'
  );

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<ReportFrequency>('DAILY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);

  const todayStr = getTodayDateString();
  const previewVacations = useMemo(() => {
    return (vacations || [])
      .filter((item) => item.return_date > todayStr)
      .sort((a, b) => {
        const isACurrent = isVacationCurrent(a.start_date, a.return_date);
        const isBCurrent = isVacationCurrent(b.start_date, b.return_date);
        if (isACurrent && !isBCurrent) return -1;
        if (!isACurrent && isBCurrent) return 1;
        if (isACurrent && isBCurrent) return a.return_date.localeCompare(b.return_date);
        return a.start_date.localeCompare(b.start_date);
      });
  }, [vacations, todayStr]);

  const previewTimeOffs = useMemo(() => {
    return (timeOffs || [])
      .filter((item) => item.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [timeOffs, todayStr]);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      onErrorToast('Por favor, informe o e-mail do destinatário.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddRecipient({
        name: name.trim() || undefined,
        email: email.trim(),
        frequency,
      });

      setEmail('');
      setName('');
      setFrequency('DAILY');
      onSuccessToast('Destinatário cadastrado com sucesso!');
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao cadastrar destinatário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestReport = async () => {
    const activeRecipients = recipients.filter((r) => r.is_active);

    if (activeRecipients.length === 0) {
      onErrorToast('Cadastre e ative ao menos um e-mail para receber o relatório.');
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: activeRecipients,
          timeOffs: previewTimeOffs,
          vacations: previewVacations,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao processar envio de e-mail.');
      }

      onSuccessToast(
        `E-mail com Folgas e Férias enviado com sucesso para ${activeRecipients.length} destinatário(s)!`
      );
    } catch (err: any) {
      console.error('Erro no envio:', err);
      onErrorToast(err.message || 'Erro ao conectar ou enviar via Gmail.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTriggerCronTest = async () => {
    setIsTriggeringCron(true);
    try {
      const response = await fetch('/api/cron-report?frequency=DAILY');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao disparar cron report.');
      }

      onSuccessToast(data.message || 'Rotina automática executada com sucesso!');
    } catch (err: any) {
      console.error('Erro no teste de cron:', err);
      onErrorToast(err.message || 'Erro ao acionar rotina de cron.');
    } finally {
      setIsTriggeringCron(false);
    }
  };

  const getFrequencyBadge = (freq: ReportFrequency) => {
    switch (freq) {
      case 'REALTIME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/12 text-amber-700 dark:text-amber-300">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Tempo Real
          </span>
        );
      case 'DAILY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#0071E3]/12 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF]">
            <Clock className="w-3 h-3" />
            Diário (08:00)
          </span>
        );
      case 'WEEKLY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/12 text-purple-700 dark:text-purple-300">
            <CalendarDays className="w-3 h-3 text-purple-500" />
            Semanal (Segunda)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200 ease-out"
      onClick={onClose}
    >
      <div
        className="bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-apple-lg border border-black/[0.08] dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-white tracking-tight">
                Relatórios Automatizados • TIME AMS
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Escala de Folgas e Férias enviadas diretamente para a liderança e equipe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-200/70 dark:bg-[#2C2C2E] text-neutral-500 hover:text-[#1D1D1F] dark:hover:text-white flex items-center justify-center transition-all duration-200 ease-out"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Control Superior */}
        <div className="px-6 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7]/50 dark:bg-black/20 flex items-center overflow-x-auto">
          <div className="apple-segmented-control">
            <button
              onClick={() => setActiveTab('recipients')}
              type="button"
              className={`apple-segmented-item ${
                activeTab === 'recipients'
                  ? 'apple-segmented-item-active text-[#0071E3] dark:text-[#0A84FF]'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              Destinatários ({recipients.length})
            </button>
            <button
              onClick={() => setActiveTab('gmail-setup')}
              type="button"
              className={`apple-segmented-item ${
                activeTab === 'gmail-setup'
                  ? 'apple-segmented-item-active text-[#0071E3] dark:text-[#0A84FF]'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              Configurações & Horários
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              type="button"
              className={`apple-segmented-item ${
                activeTab === 'preview'
                  ? 'apple-segmented-item-active text-[#0071E3] dark:text-[#0A84FF]'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              Prévia & Disparo Manual
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ABA 1: DESTINATÁRIOS */}
          {activeTab === 'recipients' && (
            <div className="space-y-6">
              {/* Formulário de Novo E-mail */}
              <form
                onSubmit={handleAddSubmit}
                className="apple-grouped-inset p-5 space-y-4"
              >
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Adicionar Novo Destinatário
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Nome (Opcional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Gestor TI"
                      className="apple-input bg-white dark:bg-[#2C2C2E] py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="gestor@empresa.com"
                      className="apple-input bg-white dark:bg-[#2C2C2E] py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Frequência de Envio
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as ReportFrequency)}
                      className="apple-input bg-white dark:bg-[#2C2C2E] py-2 text-xs cursor-pointer"
                    >
                      <option value="DAILY">Diário (todos os dias úteis às 08:00)</option>
                      <option value="WEEKLY">Semanal (toda segunda às 08:00)</option>
                      <option value="REALTIME">Tempo Real (por disparo)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="apple-btn-primary py-2 px-5 text-xs"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Cadastrar Destinatário
                  </button>
                </div>
              </form>

              {/* Lista Agrupada de Destinatários */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Destinatários Ativos ({recipients.filter((r) => r.is_active).length} de{' '}
                    {recipients.length})
                  </h3>
                </div>

                {loadingRecipients ? (
                  <div className="apple-grouped-inset p-8 text-center text-neutral-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0071E3]" />
                    <span className="text-xs">Carregando destinatários...</span>
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="apple-grouped-inset p-8 text-center text-neutral-400">
                    <p className="text-xs">Nenhum e-mail cadastrado ainda.</p>
                  </div>
                ) : (
                  <div className="apple-grouped-inset p-2 space-y-1.5">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="p-3.5 rounded-xl bg-white/90 dark:bg-[#2C2C2E]/85 flex items-center justify-between gap-4 shadow-apple-sm transition-all duration-200 ease-out"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#1D1D1F] dark:text-white truncate">
                              {recipient.name || recipient.email}
                            </span>
                            {getFrequencyBadge(recipient.frequency)}
                          </div>
                          {recipient.name && (
                            <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                              {recipient.email}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleActive(recipient.id, recipient.is_active)}
                            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-all duration-200 ${
                              recipient.is_active
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-neutral-500/10 text-neutral-500'
                            }`}
                          >
                            {recipient.is_active ? 'Ativo' : 'Pausado'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteRecipient(recipient.id)}
                            className="w-8 h-8 inline-flex items-center justify-center text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-full hover:bg-rose-500/10 transition-all duration-200"
                            title="Remover destinatário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: CONFIGURAÇÃO DE ENVIO E HORÁRIOS */}
          {activeTab === 'gmail-setup' && (
            <div className="space-y-5 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="p-4 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 border border-[#0071E3]/20 flex items-start gap-3.5">
                <Clock className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[#1D1D1F] dark:text-white text-sm tracking-tight">
                    Horários de Envio Automatizado
                  </h4>
                  <p className="mt-1 text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Os relatórios são acionados automaticamente pelo servidor (Vercel Cron & GitHub Actions):
                  </p>
                  <ul className="mt-2 space-y-1 text-[#1D1D1F] dark:text-neutral-200 font-medium">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]"></span>
                      <strong>Diário:</strong> Todos os dias às <strong>08:00</strong> (Horário de Brasília).
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]"></span>
                      <strong>Semanal:</strong> Toda <strong>segunda-feira às 08:00</strong> (Horário de Brasília).
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]"></span>
                      <strong>Conteúdo Completo:</strong> Escala de Folgas + Férias da equipe (em curso e próximas).
                    </li>
                  </ul>
                </div>
              </div>

              <div className="apple-grouped-inset p-4 flex items-start gap-3.5">
                <Info className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-[#1D1D1F] dark:text-white text-sm tracking-tight">
                    Autenticação SMTP via Gmail
                  </h4>
                  <p className="mt-1 text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    O envio utiliza uma <strong>Senha de App (App Password)</strong> exclusiva do Google com 16 letras.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-[11px]">
                  Passo a Passo das Credenciais:
                </h5>

                <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/80 dark:bg-[#2C2C2E]/60 space-y-1">
                  <div className="font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0071E3]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center font-bold text-[10px]">
                      1
                    </span>
                    Verificação em Duas Etapas no Google
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-7">
                    Confirme se está ativa em{' '}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0071E3] dark:text-[#0A84FF] underline"
                    >
                      myaccount.google.com/security
                    </a>
                    .
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/80 dark:bg-[#2C2C2E]/60 space-y-1">
                  <div className="font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0071E3]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center font-bold text-[10px]">
                      2
                    </span>
                    Gerar Senha de App
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-7">
                    Gere uma senha de app em{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0071E3] dark:text-[#0A84FF] underline font-semibold"
                    >
                      myaccount.google.com/apppasswords
                    </a>{' '}
                    com o nome <code>Gestao Folgas AMS</code>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white/80 dark:bg-[#2C2C2E]/60 space-y-1">
                  <div className="font-semibold text-[#1D1D1F] dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0071E3]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center font-bold text-[10px]">
                      3
                    </span>
                    Variáveis de Ambiente na Vercel e no .env
                  </div>
                  <div className="pl-7 mt-1.5">
                    <div className="p-3 rounded-xl bg-[#1D1D1F] text-neutral-200 font-mono text-[11px] overflow-x-auto">
                      GMAIL_USER=seu-email@gmail.com
                      <br />
                      GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: PRÉVIA DO RELATÓRIO E DISPARO */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Prévia do Relatório por E-mail
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Exibe a programação completa de férias (em curso e próximas) e folgas
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTriggerCronTest}
                    disabled={isTriggeringCron || isSendingTest}
                    className="apple-btn-secondary"
                    title="Simula o disparo automático acionando o endpoint do cron serverless"
                  >
                    {isTriggeringCron ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Executando Cron...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                        Testar Disparo Automático (Cron)
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTestReport}
                    disabled={isSendingTest || isTriggeringCron}
                    className="apple-btn-primary py-2 px-5 text-xs"
                  >
                    {isSendingTest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Disparando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Disparar Agora
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Template Mockup do E-mail */}
              <div className="p-6 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-[#2C2C2E]/60 font-sans text-xs shadow-apple-sm space-y-5">
                <div className="border-b border-black/[0.06] dark:border-white/10 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0071E3] text-white flex items-center justify-center font-bold text-xs">
                      AMS
                    </div>
                    <div>
                      <span className="font-semibold text-[#1D1D1F] dark:text-white block">
                        Gestão de Folgas & Férias • TIME AMS
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Relatório da Escala de Ausências da Equipe
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Ref: {formatDateBR(todayStr)}
                  </span>
                </div>

                {/* SEÇÃO 1: FÉRIAS DA EQUIPE */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#1D1D1F] dark:text-neutral-200 font-semibold text-xs">
                    <Palmtree className="w-4 h-4 text-emerald-500" />
                    <span>Programação de Férias (Em Curso & Próximas)</span>
                    <span className="ml-auto text-[10px] font-normal text-neutral-400">
                      {previewVacations.length} registro(s)
                    </span>
                  </div>

                  {previewVacations.length === 0 ? (
                    <div className="text-center py-4 apple-grouped-inset text-neutral-400 italic">
                      Nenhuma férias em curso ou próxima programada no momento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto apple-grouped-inset p-1.5">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-neutral-400 uppercase text-[10px]">
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Colaborador</th>
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">Período</th>
                            <th className="py-2 px-3">Dias</th>
                            <th className="py-2 px-3">Observação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                          {previewVacations.map((item) => {
                            const isCurrent = isVacationCurrent(item.start_date, item.return_date);
                            return (
                              <tr key={item.id}>
                                <td className="py-2.5 px-3">
                                  {isCurrent ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                      Em Curso
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0071E3]/12 text-[#0071E3] dark:text-[#0A84FF]">
                                      Próxima
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-[#1D1D1F] dark:text-white">
                                  {item.employees?.name}
                                </td>
                                <td className="py-2.5 px-3 text-[#0071E3] dark:text-[#0A84FF] font-medium">
                                  {item.employees?.teams?.name || 'Geral'}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-neutral-600 dark:text-neutral-300">
                                  {formatDateBR(item.start_date)} até{' '}
                                  {formatDateBR(item.return_date)}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-teal-600 dark:text-teal-400">
                                  {item.days} dias
                                </td>
                                <td className="py-2.5 px-3 text-neutral-500">
                                  {item.notes || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SEÇÃO 2: FOLGAS & COMPENSAÇÕES */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#1D1D1F] dark:text-neutral-200 font-semibold text-xs">
                    <Calendar className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                    <span>Próximas Folgas & Compensações</span>
                    <span className="ml-auto text-[10px] font-normal text-neutral-400">
                      {previewTimeOffs.length} registro(s)
                    </span>
                  </div>

                  {previewTimeOffs.length === 0 ? (
                    <div className="text-center py-4 apple-grouped-inset text-neutral-400 italic">
                      Não há folgas cadastradas para hoje ou próximas datas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto apple-grouped-inset p-1.5">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="text-neutral-400 uppercase text-[10px]">
                            <th className="py-2 px-3">Colaborador</th>
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">Data</th>
                            <th className="py-2 px-3">Tipo</th>
                            <th className="py-2 px-3">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                          {previewTimeOffs.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2.5 px-3 font-semibold text-[#1D1D1F] dark:text-white">
                                {item.employees?.name}
                              </td>
                              <td className="py-2.5 px-3 text-[#0071E3] dark:text-[#0A84FF] font-medium">
                                {item.employees?.teams?.name || 'Geral'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-neutral-600 dark:text-neutral-300">
                                {formatDateBR(item.date)}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-emerald-600 dark:text-emerald-400">
                                {item.is_full_day ? 'Dia Inteiro' : `${item.hours}h`}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500">
                                {item.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border-t border-black/[0.06] dark:border-white/10 pt-3 text-[10px] text-neutral-400 text-center">
                  Gestão de Folgas & Férias - TIME AMS • Notificação confidencial interna
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
