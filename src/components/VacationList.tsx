import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Palmtree,
  RotateCcw,
  Trash2,
  Loader2,
  CalendarDays,
  History,
  Building2,
  FileSpreadsheet,
  Calendar,
  Clock,
  Sun,
  RefreshCw,
} from 'lucide-react';
import type { VacationWithEmployee, Team } from '../types/database';
import {
  formatDateBR,
  isVacationCurrent,
  isVacationUpcoming,
  isVacationPast,
  isWithinPastFilter,
} from '../utils/date';
import type { PastDateFilter } from '../utils/date';
import { exportVacationsToExcel } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import { TeamMultiSelectFilter } from './TeamMultiSelectFilter';

interface VacationListProps {
  vacations: VacationWithEmployee[];
  teams: Team[];
  loading: boolean;
  deletingId: string | null;
  onDeleteVacation: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

type TabType = 'current' | 'upcoming' | 'past';

const STORAGE_KEYS = {
  TAB: 'gestao-folgas-vacation-tab',
  TEAMS: 'gestao-folgas-vacation-teams',
  PAST_FILTER: 'gestao-folgas-vacation-past-period',
};

export const VacationList: React.FC<VacationListProps> = ({
  vacations,
  teams,
  loading,
  deletingId,
  onDeleteVacation,
  onRefresh,
  onSuccessToast,
  onErrorToast,
}) => {
  const { isReadOnly } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TAB);
      return saved === 'current' || saved === 'upcoming' || saved === 'past' ? saved : 'current';
    } catch {
      return 'current';
    }
  });

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAMS);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [pastFilter, setPastFilter] = useState<PastDateFilter>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAST_FILTER);
      return saved === '30d' || saved === '90d' || saved === 'year' || saved === 'all'
        ? saved
        : '30d';
    } catch {
      return '30d';
    }
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Persiste escolhas de filtros no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TAB, activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(selectedTeamIds));
    } catch {
      // ignore storage errors
    }
  }, [selectedTeamIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PAST_FILTER, pastFilter);
    } catch {
      // ignore storage errors
    }
  }, [pastFilter]);

  // Limpa IDs de equipes que eventualmente não existam mais no cadastro
  useEffect(() => {
    if (teams.length > 0 && selectedTeamIds.length > 0) {
      const validIds = new Set(teams.map((t) => t.id));
      const filtered = selectedTeamIds.filter((id) => validIds.has(id));
      if (filtered.length !== selectedTeamIds.length) {
        setSelectedTeamIds(filtered);
      }
    }
  }, [teams, selectedTeamIds]);

  const handleRefreshGrid = async () => {
    if (!onRefresh || isRefreshing) return;
    try {
      setIsRefreshing(true);
      await onRefresh();
      onSuccessToast('Quadro de férias atualizado!');
    } catch {
      onErrorToast('Não foi possível atualizar os dados no momento.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedTeamNamesLower = useMemo(() => {
    return teams
      .filter((t) => selectedTeamIds.includes(t.id))
      .map((t) => t.name.toLowerCase());
  }, [teams, selectedTeamIds]);

  const matchesTeam = useCallback(
    (item: VacationWithEmployee) => {
      if (selectedTeamIds.length === 0) return true;
      const teamId = item.employees?.team_id || item.employees?.teams?.id;
      const teamName = item.employees?.teams?.name?.toLowerCase();
      return (
        (teamId ? selectedTeamIds.includes(teamId) : false) ||
        (teamName ? selectedTeamNamesLower.includes(teamName) : false)
      );
    },
    [selectedTeamIds, selectedTeamNamesLower]
  );

  const filteredList = useMemo(() => {
    return vacations
      .filter((item) => {
        if (activeTab === 'current') {
          if (!isVacationCurrent(item.start_date, item.return_date)) return false;
        } else if (activeTab === 'upcoming') {
          if (!isVacationUpcoming(item.start_date)) return false;
        } else {
          if (!isVacationPast(item.return_date)) return false;
          if (!isWithinPastFilter(item.return_date, pastFilter, true)) return false;
        }

        return matchesTeam(item);
      })
      .sort((a, b) => {
        if (activeTab === 'current') {
          return a.return_date.localeCompare(b.return_date);
        }
        return activeTab === 'upcoming'
          ? a.start_date.localeCompare(b.start_date)
          : b.return_date.localeCompare(a.return_date);
      });
  }, [vacations, activeTab, pastFilter, matchesTeam]);

  const currentCount = useMemo(
    () =>
      vacations.filter(
        (item) => matchesTeam(item) && isVacationCurrent(item.start_date, item.return_date)
      ).length,
    [vacations, matchesTeam]
  );

  const upcomingCount = useMemo(
    () =>
      vacations.filter((item) => matchesTeam(item) && isVacationUpcoming(item.start_date)).length,
    [vacations, matchesTeam]
  );

  const pastCount = useMemo(
    () =>
      vacations.filter(
        (item) =>
          matchesTeam(item) &&
          isVacationPast(item.return_date) &&
          isWithinPastFilter(item.return_date, pastFilter, true)
      ).length,
    [vacations, matchesTeam, pastFilter]
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

    const prefix =
      activeTab === 'current'
        ? 'ferias-em-curso'
        : activeTab === 'upcoming'
          ? 'proximas-ferias'
          : `ferias-passadas-${pastFilter}`;
    exportVacationsToExcel(filteredList, prefix);
    onSuccessToast('Planilha de férias gerada com sucesso!');
  };

  const getTeamBadgeStyle = (teamName?: string) => {
    if (!teamName) {
      return 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400';
    }
    const lower = teamName.toLowerCase();
    if (lower.includes('stellantis')) {
      return 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF]';
    }
    if (lower.includes('iveco')) {
      return 'bg-purple-500/10 dark:bg-purple-400/15 text-purple-600 dark:text-purple-300';
    }
    return 'bg-teal-500/10 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300';
  };

  return (
    <div className="relative z-20 apple-glass-card p-6 sm:p-8 space-y-6">
      {/* Cabeçalho da listagem, abas e filtros integrados */}
      <div className="relative z-30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-2">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] dark:text-white tracking-tight">
            Quadro de Férias
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Acompanhe os períodos de férias em curso, programadas e histórico
          </p>
        </div>

        {/* Controles: Segmented Control + Filtros + Refresh + Excel */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="apple-segmented-control">
            {/* 1. Em Curso */}
            <button
              onClick={() => setActiveTab('current')}
              type="button"
              className={`apple-segmented-item ${
                activeTab === 'current'
                  ? 'apple-segmented-item-active text-emerald-600 dark:text-emerald-400'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              <Sun className="w-4 h-4 text-emerald-500" />
              <span>Em Curso</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'current'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-black/[0.06] dark:bg-white/10 text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {currentCount}
              </span>
            </button>

            {/* 2. Próximas */}
            <button
              onClick={() => setActiveTab('upcoming')}
              type="button"
              className={`apple-segmented-item ${
                activeTab === 'upcoming'
                  ? 'apple-segmented-item-active text-[#0071E3] dark:text-[#0A84FF]'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Próximas</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'upcoming'
                    ? 'bg-[#0071E3]/15 dark:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF]'
                    : 'bg-black/[0.06] dark:bg-white/10 text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {upcomingCount}
              </span>
            </button>

            {/* 3. Passadas */}
            <button
              onClick={() => setActiveTab('past')}
              type="button"
              className={`apple-segmented-item ${
                activeTab === 'past'
                  ? 'apple-segmented-item-active text-[#0071E3] dark:text-[#0A84FF]'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Passadas</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === 'past'
                    ? 'bg-[#0071E3]/15 dark:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF]'
                    : 'bg-black/[0.06] dark:bg-white/10 text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {pastCount}
              </span>
            </button>
          </div>

          {activeTab === 'past' && (
            <div className="flex items-center gap-1.5 bg-neutral-100/90 dark:bg-[#2C2C2E] px-3.5 py-2 rounded-full border border-black/[0.05] dark:border-white/10 animate-in fade-in duration-200 ease-out">
              <label
                htmlFor="pastVacationFilterSelect"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
              >
                Período:
              </label>
              <select
                id="pastVacationFilterSelect"
                value={pastFilter}
                onChange={(e) => setPastFilter(e.target.value as PastDateFilter)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-[#1D1D1F] dark:text-neutral-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="30d" className="dark:bg-[#1C1C1E]">
                  30 Dias
                </option>
                <option value="90d" className="dark:bg-[#1C1C1E]">
                  90 Dias
                </option>
                <option value="year" className="dark:bg-[#1C1C1E]">
                  Ano Inteiro
                </option>
                <option value="all" className="dark:bg-[#1C1C1E]">
                  Todas
                </option>
              </select>
            </div>
          )}

          {/* Filtro por Múltiplos Times */}
          <TeamMultiSelectFilter
            teams={teams}
            selectedTeamIds={selectedTeamIds}
            onChange={setSelectedTeamIds}
          />

          {/* Botão Circular de Atualizar Grid (Refresh) */}
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefreshGrid}
              disabled={loading || isRefreshing}
              title="Atualizar dados do quadro"
              aria-label="Atualizar dados do quadro"
              className="w-9 h-9 rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/90 dark:bg-[#2C2C2E] hover:bg-[#0071E3]/15 dark:hover:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF] active:scale-95 transition-all duration-200 ease-out disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Botão Circular Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredList.length === 0}
            title="Exportar para Excel (.csv)"
            aria-label="Exportar para Excel"
            className="w-9 h-9 rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/90 dark:bg-[#2C2C2E] hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 active:scale-95 transition-all duration-200 ease-out disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteúdo da Lista em Formato "Grouped Inset List View" */}
      {loading ? (
        <div className="apple-grouped-inset flex flex-col items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#0071E3] dark:text-[#0A84FF] mb-3" />
          <p className="text-sm font-medium">Carregando férias programadas...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="apple-grouped-inset flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-neutral-400 flex items-center justify-center mb-4">
            <Palmtree className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-neutral-200">
            {selectedTeamIds.length > 0
              ? 'Nenhuma programação de férias encontrada para os times e visualização selecionados'
              : activeTab === 'current'
                ? 'Nenhum colaborador de férias atualmente'
                : activeTab === 'upcoming'
                  ? 'Nenhuma férias futura agendada'
                  : 'Nenhum histórico de férias encontrado para o período selecionado'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
            {activeTab === 'current'
              ? 'Toda a equipe está presente em atividade normal hoje.'
              : activeTab === 'past'
                ? 'Experimente alternar o filtro de período (ex: 90 Dias ou Ano Inteiro) ou selecionar "Todos os Times".'
                : 'Utilize o formulário acima para programar as próximas férias da equipe.'}
          </p>
        </div>
      ) : (
        <div className="relative z-10 apple-grouped-inset p-2 overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                <th className="py-1.5 px-3">Colaborador</th>
                <th className="py-1.5 px-2.5">Time</th>
                <th className="py-1.5 px-2.5">Data de Início</th>
                <th className="py-1.5 px-2.5">Data de Volta</th>
                <th className="py-1.5 px-2.5">Duração</th>
                <th className="py-1.5 px-3">Observação</th>
                {!isReadOnly && <th className="py-1.5 px-2.5 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredList.map((item) => {
                const isItemDeleting = deletingId === item.id;
                const isConfirming = confirmDeleteId === item.id;
                const employeeName = item.employees?.name || 'Não identificado';
                const teamName = item.employees?.teams?.name;
                const isCurrent = isVacationCurrent(item.start_date, item.return_date);

                return (
                  <tr
                    key={item.id}
                    className="bg-white/90 dark:bg-[#2C2C2E]/85 hover:bg-white dark:hover:bg-[#3A3A3C]/90 shadow-apple-sm transition-all duration-200 ease-out group"
                  >
                    {/* Colaborador */}
                    <td className="py-2.5 px-3 font-semibold text-[#1D1D1F] dark:text-white whitespace-nowrap first:rounded-l-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-b from-teal-500/15 to-teal-500/25 text-teal-700 dark:text-teal-300 flex items-center justify-center font-semibold text-[10px] uppercase flex-shrink-0">
                          {employeeName.charAt(0)}
                        </div>
                        <span className="tracking-tight text-xs">{employeeName}</span>
                      </div>
                    </td>

                    {/* Time / Projeto */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {teamName ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getTeamBadgeStyle(teamName)}`}
                        >
                          <Building2 className="w-3 h-3 opacity-75" />
                          {teamName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400 italic">Sem time</span>
                      )}
                    </td>

                    {/* Data de Início formatada DD/MM/YYYY */}
                    <td className="py-2.5 px-2.5 text-[#1D1D1F] dark:text-neutral-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-medium font-mono text-xs">
                          {formatDateBR(item.start_date)}
                        </span>
                      </div>
                    </td>

                    {/* Data de Retorno formatada DD/MM/YYYY */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                        <span className="font-semibold font-mono text-xs text-[#0071E3] dark:text-[#0A84FF]">
                          {formatDateBR(item.return_date)}
                        </span>
                      </div>
                    </td>

                    {/* Duração / Dias de Férias */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-500/10 dark:bg-white/10 text-[#1D1D1F] dark:text-neutral-200">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          {item.days} {item.days === 1 ? 'dia' : 'dias'}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            Em Curso
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Observação */}
                    <td
                      className={`py-2.5 px-3 text-neutral-500 dark:text-neutral-300 max-w-[200px] truncate ${
                        isReadOnly ? 'last:rounded-r-xl' : ''
                      }`}
                    >
                      {item.notes ? (
                        <span title={item.notes} className="text-xs">
                          {item.notes}
                        </span>
                      ) : (
                        <span className="text-neutral-400 italic text-[11px]">Sem observação</span>
                      )}
                    </td>

                    {/* Ações */}
                    {!isReadOnly && (
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap last:rounded-r-xl">
                        {isConfirming ? (
                          <div className="flex items-center justify-end gap-1 animate-in fade-in duration-200">
                            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mr-0.5">
                              Excluir?
                            </span>
                            <button
                              onClick={() => handleDelete(item.id, employeeName)}
                              disabled={isItemDeleting}
                              className="px-2.5 py-0.5 text-[11px] font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-full transition duration-200"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isItemDeleting}
                              className="px-2 py-0.5 text-[11px] font-medium bg-neutral-200/70 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-full transition duration-200"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.id)}
                            disabled={isItemDeleting}
                            title="Excluir férias"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 ease-out"
                          >
                            {isItemDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
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
