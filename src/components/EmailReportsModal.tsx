import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import type { ReportRecipient, ReportFrequency, TimeOffWithEmployee } from '../types/database';
import { formatDateBR } from '../utils/date';

interface EmailReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: ReportRecipient[];
  loadingRecipients: boolean;
  onAddRecipient: (payload: { name?: string; email: string; frequency: ReportFrequency }) => Promise<any>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
  onDeleteRecipient: (id: string) => Promise<void>;
  timeOffs: TimeOffWithEmployee[];
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
          timeOffs: timeOffs,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao processar envio de e-mail.');
      }

      onSuccessToast(`E-mail enviado com sucesso via Gmail para ${activeRecipients.length} destinatário(s)!`);
    } catch (err: any) {
      console.error('Erro no envio:', err);
      onErrorToast(err.message || 'Erro ao conectar ou enviar via Gmail.');
    } finally {
      setIsSendingTest(false);
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
            Diário
          </span>
        );
      case 'WEEKLY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            <CalendarDays className="w-3 h-3 text-purple-500" />
            Semanal
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Relatórios por E-mail & Notificações
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie quem recebe o resumo das folgas do TIME AMS e a frequência
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
            Configurar Envio (Gmail)
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Prévia & Disparo
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@gmail.com"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Frequência do Relatório *
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as ReportFrequency)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="REALTIME">⚡ Tempo Real (a cada agendamento)</option>
                      <option value="DAILY">📅 Diário (resumo matinal)</option>
                      <option value="WEEKLY">🗓️ Semanal (toda segunda-feira)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-50"
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

              {/* Lista de Destinatários */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  E-mails Ativos para Notificação
                </h3>
                {loadingRecipients ? (
                  <div className="py-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-xs">Carregando e-mails...</p>
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="py-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">Nenhum e-mail cadastrado ainda.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Cadastre acima os e-mails para envio automático.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Destinatário</th>
                          <th className="py-2.5 px-4">Frequência</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recipients.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {r.name || 'Sem nome'}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {r.email}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {getFrequencyBadge(r.frequency)}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => onToggleActive(r.id, r.is_active)}
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition ${
                                  r.is_active
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {r.is_active ? 'Ativo' : 'Pausado'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => onDeleteRecipient(r.id)}
                                title="Excluir destinatário"
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: COMO CONFIGURAR O GMAIL */}
          {activeTab === 'gmail-setup' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">
                    Como enviar e-mails usando o seu Gmail?
                  </h4>
                  <p className="mt-1 text-blue-800 dark:text-blue-300 leading-relaxed">
                    O Google não permite usar sua senha normal por motivos de segurança. Você utiliza uma <strong>Senha de App (App Password)</strong> exclusiva de 16 letras, sem comprometer a sua conta.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                  Passo a Passo Rápido (3 minutos):
                </h5>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">1</span>
                    Ative a Verificação em Duas Etapas no Google
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                    Acesse sua conta Google em <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 underline">myaccount.google.com/security</a> e confirme se está ativa.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">2</span>
                    Gere uma Senha de App
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                    Vá direto no link <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">myaccount.google.com/apppasswords</a>. Dê o nome de <code>Gestao Folgas AMS</code> e clique em <strong>Criar</strong>. O Google exibirá um código de 16 letras (ex: <code>abcd efgh ijkl mnop</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-[10px]">3</span>
                    Preencha as variáveis no arquivo <code>.env</code>
                  </div>
                  <div className="pl-7 mt-1.5">
                    <div className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                      GMAIL_USER=seu-email@gmail.com<br/>
                      GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: PRÉVIA DO RELATÓRIO E DISPARO */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Prévia do Relatório por E-mail
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Formato que será enviado aos destinatários cadastrados
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestReport}
                  disabled={isSendingTest}
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
                      Disparar Relatório Agora
                    </>
                  )}
                </button>
              </div>

              {/* Template Mockup do E-mail */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-sans text-xs shadow-xs space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      AMS
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Relatório de Folgas • TIME AMS
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Gerado automaticamente
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-400">
                  Olá! Segue a programação atualizada das folgas e compensações da equipe:
                </p>

                {timeOffs.length === 0 ? (
                  <p className="text-center py-4 text-slate-400 italic">
                    Não há folgas cadastradas no momento.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                          <th className="py-2">Colaborador</th>
                          <th className="py-2">Time</th>
                          <th className="py-2">Data</th>
                          <th className="py-2">Tipo</th>
                          <th className="py-2">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {timeOffs.slice(0, 5).map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                              {item.employees?.name}
                            </td>
                            <td className="py-2.5 text-slate-500">
                              {item.employees?.teams?.name || 'Geral'}
                            </td>
                            <td className="py-2.5 font-mono text-slate-600 dark:text-slate-300">
                              {formatDateBR(item.date)}
                            </td>
                            <td className="py-2.5">
                              {item.is_full_day ? 'Dia Inteiro' : `${item.hours}h`}
                            </td>
                            <td className="py-2.5 text-slate-500">
                              {item.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-[10px] text-slate-400 text-center">
                  Gestão de Folgas - TIME AMS • Notificação confidencial
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
