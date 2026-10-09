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
  Calendar
} from 'lucide-react';
import type { ReportRecipient, ReportFrequency, TimeOffWithEmployee, VacationWithEmployee } from '../types/database';
import { formatDateBR, isVacationCurrent, getTodayDateString } from '../utils/date';

interface EmailReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: ReportRecipient[];
  loadingRecipients: boolean;
  onAddRecipient: (payload: { name?: string; email: string; frequency: ReportFrequency }) => Promise<any>;
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
  const [activeTab, setActiveTab] = useState<'recipients' | 'gmail-setup' | 'preview'>('recipients');
  
  // Form de novo destinatário
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<ReportFrequency>('DAILY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);

  // Férias filtradas para prévia: SOMENTE em curso e próximas (exclui passadas)
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

  // Folgas filtradas para prévia e disparo: SOMENTE a partir de hoje (exclui passadas)
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

      onSuccessToast(`E-mail com Folgas e Férias enviado com sucesso para ${activeRecipients.length} destinatário(s)!`);
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Tempo Real
          </span>
        );
      case 'DAILY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
            <Clock className="w-3 h-3 text-blue-500" />
            Diário (08:00)
          </span>
        );
      case 'WEEKLY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <CalendarDays className="w-3 h-3 text-purple-500" />
            Semanal (Segunda)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Relatórios Automatizados • TIME AMS
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escala de Folgas e Férias enviadas diretamente para a liderança e equipe
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('recipients')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'recipients'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Destinatários ({recipients.length})
          </button>
          <button
            onClick={() => setActiveTab('gmail-setup')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'gmail-setup'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Configurações & Horários
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Prévia & Disparo Manual
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ABA 1: DESTINATÁRIOS */}
          {activeTab === 'recipients' && (
            <div className="space-y-6">
              {/* Formulário de Novo E-mail */}
              <form onSubmit={handleAddSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Adicionar Novo Destinatário
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Nome (Opcional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Gestor TI"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="gestor@empresa.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Frequência de Envio
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as ReportFrequency)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition disabled:opacity-50"
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

              {/* Tabela de Destinatários */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Destinatários Ativos ({recipients.filter((r) => r.is_active).length} de {recipients.length})
                  </h3>
                </div>

                {loadingRecipients ? (
                  <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs">Carregando destinatários...</span>
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                    <p className="text-xs">Nenhum e-mail cadastrado ainda.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                              {recipient.name || recipient.email}
                            </span>
                            {getFrequencyBadge(recipient.frequency)}
                          </div>
                          {recipient.name && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {recipient.email}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleActive(recipient.id, recipient.is_active)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                              recipient.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {recipient.is_active ? 'Ativo' : 'Pausado'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteRecipient(recipient.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
            <div className="space-y-5 text-xs text-slate-600 dark:text-slate-300">
              {/* Card dos Horários do Cron */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-start gap-3">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                    Horários de Envio Automatizado
                  </h4>
                  <p className="mt-1 text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    Os relatórios são acionados automaticamente pelo servidor (Vercel Cron & GitHub Actions):
                  </p>
                  <ul className="mt-2 space-y-1 text-indigo-900 dark:text-indigo-200 font-medium">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                      <strong>Diário:</strong> Todos os dias às <strong>08:00</strong> (Horário de Brasília) para destinatários com frequência Diária.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                      <strong>Semanal:</strong> Toda <strong>segunda-feira às 08:00</strong> (Horário de Brasília) para destinatários com frequência Semanal.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                      <strong>Conteúdo Completo:</strong> Escala de Folgas + Férias da equipe (exibindo exclusivamente as <strong>em curso</strong> e <strong>próximas</strong>).
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">
                    Autenticação SMTP via Gmail
                  </h4>
                  <p className="mt-1 text-blue-800 dark:text-blue-300 leading-relaxed">
                    O envio utiliza uma <strong>Senha de App (App Password)</strong> exclusiva do Google com 16 letras, sem comprometer a sua senha pessoal.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                  Passo a Passo das Credenciais:
                </h5>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    Verificação em Duas Etapas no Google
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                    Confirme se está ativa em <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 underline">myaccount.google.com/security</a>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    Gerar Senha de App
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                    Gere uma senha de app em <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">myaccount.google.com/apppasswords</a> com o nome <code>Gestao Folgas AMS</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    Variáveis de Ambiente na Vercel e no .env
                  </div>
                  <div className="pl-7 mt-1.5">
                    <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                      GMAIL_USER=seu-email@gmail.com<br/>
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
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Prévia do Relatório por E-mail
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Exibe a programação completa de férias (em curso e próximas) e folgas
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botão de Teste do Cron Automático */}
                  <button
                    type="button"
                    onClick={handleTriggerCronTest}
                    disabled={isTriggeringCron || isSendingTest}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl transition disabled:opacity-50"
                    title="Simula o disparo automático acionando o endpoint do cron serverless"
                  >
                    {isTriggeringCron ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Executando Cron...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Testar Disparo Automático (Cron)
                      </>
                    )}
                  </button>

                  {/* Botão de Disparo Manual com dados da tela */}
                  <button
                    type="button"
                    onClick={handleSendTestReport}
                    disabled={isSendingTest || isTriggeringCron}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition disabled:opacity-50"
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
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-sans text-xs shadow-xs space-y-5">
                {/* Cabeçalho Mockup */}
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      AMS
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Gestão de Folgas & Férias • TIME AMS
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Relatório da Escala de Ausências da Equipe
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Ref: {formatDateBR(todayStr)}
                  </span>
                </div>

                {/* SEÇÃO 1: FÉRIAS DA EQUIPE (EM CURSO & PRÓXIMAS) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Palmtree className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Programação de Férias (Em Curso & Próximas)</span>
                    <span className="ml-auto text-[10px] font-normal text-slate-400 lowercase">
                      {previewVacations.length} registro(s)
                    </span>
                  </div>

                  {previewVacations.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-slate-400 italic">
                      Nenhuma férias em curso ou próxima programada no momento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Colaborador</th>
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">Período</th>
                            <th className="py-2 px-3">Dias</th>
                            <th className="py-2 px-3">Observação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {previewVacations.map((item) => {
                            const isCurrent = isVacationCurrent(item.start_date, item.return_date);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="py-2.5 px-3">
                                  {isCurrent ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                      🟡 Em Curso
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                      🔵 Próxima
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {item.employees?.name}
                                </td>
                                <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-medium">
                                  {item.employees?.teams?.name || 'Geral'}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                  {formatDateBR(item.start_date)} até {formatDateBR(item.return_date)}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-teal-600 dark:text-teal-400">
                                  {item.days} dias
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
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
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Próximas Folgas & Compensações</span>
                    <span className="ml-auto text-[10px] font-normal text-slate-400 lowercase">
                      {previewTimeOffs.length} registro(s)
                    </span>
                  </div>

                  {previewTimeOffs.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-slate-400 italic">
                      Não há folgas cadastradas para hoje ou próximas datas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                            <th className="py-2 px-3">Colaborador</th>
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">Data</th>
                            <th className="py-2 px-3">Tipo</th>
                            <th className="py-2 px-3">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {previewTimeOffs.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                {item.employees?.name}
                              </td>
                              <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400 font-medium">
                                {item.employees?.teams?.name || 'Geral'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                                {formatDateBR(item.date)}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-emerald-600 dark:text-emerald-400">
                                {item.is_full_day ? 'Dia Inteiro' : `${item.hours}h`}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {item.description || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-[10px] text-slate-400 text-center">
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
