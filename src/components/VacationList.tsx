import React, { useState, useMemo } from 'react';
import { 
  Palmtree, 
  RotateCcw, 
  Trash2, 
  Loader2, 
  CalendarDays, 
  History, 
  Filter, 
  Building2,
  FileSpreadsheet,
  Calendar,
  Clock,
  Sun
} from 'lucide-react';
import type { VacationWithEmployee, Team } from '../types/database';
import { formatDateBR, isVacationCurrent, isVacationUpcoming, isVacationPast, isWithinPastFilter } from '../utils/date';
import type { PastDateFilter } from '../utils/date';
import { exportVacationsToExcel } from '../utils/export';
import { useAuth } from '../context/AuthContext';

interface VacationListProps {
  vacations: VacationWithEmployee[];
  teams: Team[];
  loading: boolean;
  deletingId: string | null;
  onDeleteVacation: (id: string) => Promise<void>;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

type TabType = 'current' | 'upcoming' | 'past';

export const VacationList: React.FC<VacationListProps> = ({
  vacations,
  teams,
  loading,
  deletingId,
  onDeleteVacation,
  onSuccessToast,
  onErrorToast,
}) => {
  const { isReadOnly } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [pastFilter, setPastFilter] = useState<PastDateFilter>('30d');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtra por status das férias (em curso vs próximas vs passadas com período) e por time selecionado
  const filteredList = useMemo(() => {
    return vacations
      .filter((item) => {
        // 1. Filtro da aba selecionada
        if (activeTab === 'current') {
          if (!isVacationCurrent(item.start_date, item.return_date)) return false;
        } else if (activeTab === 'upcoming') {
          if (!isVacationUpcoming(item.start_date)) return false;
        } else {
          // Aba de férias passadas
          if (!isVacationPast(item.return_date)) return false;
          if (!isWithinPastFilter(item.return_date, pastFilter)) return false;
        }

        // 2. Filtro de time
        if (selectedTeamFilter === 'ALL') return true;

        const teamId = item.employees?.team_id || item.employees?.teams?.id;
        const teamName = item.employees?.teams?.name?.toLowerCase();

        return teamId === selectedTeamFilter || teamName === selectedTeamFilter.toLowerCase();
      })
      .sort((a, b) => {
        if (activeTab === 'current') {
          // Em curso: ordena por quem volta primeiro
          return a.return_date.localeCompare(b.return_date);
        }
        return activeTab === 'upcoming'
          ? a.start_date.localeCompare(b.start_date)
          : b.return_date.localeCompare(a.return_date);
      });
  }, [vacations, activeTab, selectedTeamFilter, pastFilter]);

  const currentCount = useMemo(
    () => vacations.filter((item) => isVacationCurrent(item.start_date, item.return_date)).length,
    [vacations]
  );

  const upcomingCount = useMemo(
    () => vacations.filter((item) => isVacationUpcoming(item.start_date)).length,
    [vacations]
  );

  const pastCount = useMemo(
    () => vacations.filter((item) => isVacationPast(item.return_date)).length,
    [vacations]
  );

  const handleDelete = async (id: string, employeeName: string) => {
    try {
      await onDeleteVacation(id);
      setConfirmDeleteId(null);
      onSuccessToast(`Férias de "${employeeName}" excluídas com sucesso!`);
    } catch (err: any) {
      onErrorToast(err.message || 'Falha ao excluir as férias.');
    }
  };

  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      onErrorToast('Não há férias na visualização atual para exportar.');
      return;
    }

    const prefix = activeTab === 'current'
      ? 'ferias-em-curso'
      : activeTab === 'upcoming'
        ? 'proximas-ferias'
        : `ferias-passadas-${pastFilter}`;
    exportVacationsToExcel(filteredList, prefix);
    onSuccessToast('Planilha de férias gerada com sucesso!');
  };

  const getTeamBadgeStyle = (teamName?: string) => {
    if (!teamName) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
    const lower = teamName.toLowerCase();
    if (lower.includes('stellantis')) {
      return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
    }
    if (lower.includes('iveco')) {
      return 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60';
    }
    return 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors duration-200">
      {/* Cabeçalho da listagem, abas e filtros integrados */}
      <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Quadro de Férias
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe os períodos de férias da equipe e histórico
          </p>
        </div>

        {/* Controles: Abas + Filtro de Período + Filtro de Time + Ícone do Excel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Abas / Tabs para alternar entre Em Curso, Próximas e Passadas */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {/* 1. Em Curso */}
            <button
              onClick={() => setActiveTab('current')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'current'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4 text-emerald-500" />
              <span>Em Curso</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'current'
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
                }`}
              >
                {currentCount}
              </span>
            </button>

            {/* 2. Próximas */}
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'upcoming'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Próximas</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'upcoming'
                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
                }`}
              >
                {upcomingCount}
              </span>
            </button>

            {/* 3. Passadas */}
            <button
              onClick={() => setActiveTab('past')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'past'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Passadas</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'past'
                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
                }`}
              >
                {pastCount}
              </span>
            </button>
          </div>

          {/* Filtro de Período (discreto, aparece apenas quando a aba Passadas estiver ativa) */}
          {activeTab === 'past' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
              <label htmlFor="pastVacationFilterSelect" className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Período:
              </label>
              <select
                id="pastVacationFilterSelect"
                value={pastFilter}
                onChange={(e) => setPastFilter(e.target.value as PastDateFilter)}
                className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="30d" className="dark:bg-slate-800">30 Dias</option>
                <option value="90d" className="dark:bg-slate-800">90 Dias</option>
                <option value="year" className="dark:bg-slate-800">Ano Inteiro</option>
                <option value="all" className="dark:bg-slate-800">Todas</option>
              </select>
            </div>
          )}

          {/* Filtro por Time */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <label htmlFor="vacationTeamFilterSelect" className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Time:
            </label>
            <select
              id="vacationTeamFilterSelect"
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="dark:bg-slate-800">Todos os Times</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id} className="dark:bg-slate-800">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ícone Discreto do Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredList.length === 0}
            title="Exportar para Excel (.csv)"
            aria-label="Exportar para Excel"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteúdo da Tabela / Data Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400 mb-3" />
          <p className="text-sm font-medium">Carregando férias programadas...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
            <Palmtree className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {selectedTeamFilter !== 'ALL'
              ? 'Nenhuma programação de férias encontrada para o time e visualização selecionados'
              : activeTab === 'current'
                ? 'Nenhum colaborador de férias atualmente'
                : activeTab === 'upcoming'
                  ? 'Nenhuma férias futura agendada'
                  : 'Nenhum histórico de férias encontrado para o período selecionado'}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mt-1">
            {activeTab === 'current'
              ? 'Toda a equipe está presente em atividade normal hoje.'
              : activeTab === 'past'
                ? 'Experimente alternar o filtro de período (ex: 90 Dias ou Ano Inteiro) ou selecionar "Todos os Times".'
                : 'Utilize o formulário acima para programar as próximas férias da equipe.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Colaborador</th>
                <th className="py-3.5 px-6">Time</th>
                <th className="py-3.5 px-6">Data de Início</th>
                <th className="py-3.5 px-6">Data de Volta</th>
                <th className="py-3.5 px-6">Duração</th>
                <th className="py-3.5 px-6">Observação</th>
                {!isReadOnly && <th className="py-3.5 px-6 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredList.map((item) => {
                const isItemDeleting = deletingId === item.id;
                const isConfirming = confirmDeleteId === item.id;
                const employeeName = item.employees?.name || 'Não identificado';
                const teamName = item.employees?.teams?.name;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Colaborador */}
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {employeeName.charAt(0)}
                        </div>
                        <span>{employeeName}</span>
                      </div>
                    </td>

                    {/* Time / Projeto */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {teamName ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getTeamBadgeStyle(teamName)}`}>
                          <Building2 className="w-3 h-3 opacity-70" />
                          {teamName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sem time</span>
                      )}
                    </td>

                    {/* Data de Início formatada DD/MM/YYYY */}
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="font-medium font-mono text-sm">
                          {formatDateBR(item.start_date)}
                        </span>
                      </div>
                    </td>

                    {/* Data de Retorno formatada DD/MM/YYYY */}
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span className="font-semibold font-mono text-sm text-teal-700 dark:text-teal-300">
                          {formatDateBR(item.return_date)}
                        </span>
                      </div>
                    </td>

                    {/* Duração / Dias de Férias */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                          <Clock className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                          {item.days} {item.days === 1 ? 'dia' : 'dias'}
                        </span>
                        {isVacationCurrent(item.start_date, item.return_date) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                            Em Curso
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Observação */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {item.notes ? (
                        <span title={item.notes}>{item.notes}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-xs">Sem observação</span>
                      )}
                    </td>

                    {/* Ações */}
                    {!isReadOnly && (
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {isConfirming ? (
                          <div className="flex items-center justify-end gap-2 animate-in fade-in">
                            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold mr-1">
                              Excluir?
                            </span>
                            <button
                              onClick={() => handleDelete(item.id, employeeName)}
                              disabled={isItemDeleting}
                              className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-sm"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isItemDeleting}
                              className="px-2 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            disabled={isItemDeleting}
                            title="Excluir férias"
                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          >
                            {isItemDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
