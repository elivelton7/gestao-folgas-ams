import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Trash2,
  Loader2,
  CalendarDays,
  History,
  Sun,
  Building2,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import type { TimeOffWithEmployee, Team, Employee } from '../types/database';
import { formatDateBR, isUpcoming, isWithinPastFilter } from '../utils/date';
import type { PastDateFilter } from '../utils/date';
import { exportTableToExcel } from '../utils/export';
import { calculateEmployeeBalance } from '../utils/balance';
import type { EmployeeBalanceSummary } from '../utils/balance';
import { useAuth } from '../context/AuthContext';
import { TeamMultiSelectFilter } from './TeamMultiSelectFilter';

interface TimeOffListProps {
  timeOffs: TimeOffWithEmployee[];
  teams: Team[];
  employees?: Employee[];
  loading: boolean;
  deletingId: string | null;
  onDeleteTimeOff: (id: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

type TabType = 'upcoming' | 'past';

const STORAGE_KEYS = {
  TAB: 'gestao-folgas-timeoff-tab',
  TEAMS: 'gestao-folgas-timeoff-teams',
  PAST_FILTER: 'gestao-folgas-timeoff-past-period',
};

export const TimeOffList: React.FC<TimeOffListProps> = ({
  timeOffs,
  teams,
  employees = [],
  loading,
  deletingId,
  onDeleteTimeOff,
  onRefresh,
  onSuccessToast,
  onErrorToast,
}) => {
  const { isReadOnly } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TAB);
      return saved === 'past' || saved === 'upcoming' ? saved : 'upcoming';
    } catch {
      return 'upcoming';
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
      onSuccessToast('Quadro de folgas atualizado!');
    } catch {
      onErrorToast('Não foi possível atualizar os dados no momento.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mapa rápido de Saldo Hoje por colaborador
  const balanceByEmployeeId = useMemo(() => {
    const map = new Map<string, EmployeeBalanceSummary>();
    employees.forEach((emp) => {
      map.set(emp.id, calculateEmployeeBalance(emp, timeOffs));
    });
    return map;
  }, [employees, timeOffs]);

  // Nomes das equipes selecionadas (fallback caso algum registro compare por nome)
  const selectedTeamNamesLower = useMemo(() => {
    return teams
      .filter((t) => selectedTeamIds.includes(t.id))
      .map((t) => t.name.toLowerCase());
  }, [teams, selectedTeamIds]);

  const matchesTeam = useCallback(
    (item: TimeOffWithEmployee) => {
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

  // Filtra por data (próximas vs passadas com período) e pelas equipes selecionadas
  const filteredList = useMemo(() => {
    return timeOffs
      .filter((item) => {
        if (activeTab === 'upcoming') {
          if (!isUpcoming(item.date)) return false;
        } else {
          if (!isWithinPastFilter(item.date, pastFilter)) return false;
        }

        return matchesTeam(item);
      })
      .sort((a, b) => {
        return activeTab === 'upcoming'
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      });
  }, [timeOffs, activeTab, pastFilter, matchesTeam]);

  const upcomingCount = useMemo(
    () => timeOffs.filter((item) => matchesTeam(item) && isUpcoming(item.date)).length,
    [timeOffs, matchesTeam]
  );

  const pastCount = useMemo(
    () =>
      timeOffs.filter(
        (item) => matchesTeam(item) && !isUpcoming(item.date) && isWithinPastFilter(item.date, pastFilter)
      ).length,
    [timeOffs, matchesTeam, pastFilter]
  );

  const handleDelete = async (id: string, employeeName: string) => {
    try {
      await onDeleteTimeOff(id);
      setConfirmDeleteId(null);
      onSuccessToast(`Folga de "${employeeName}" excluída com sucesso!`);
    } catch (err: any) {
      onErrorToast(err.message || 'Falha ao excluir a folga.');
    }
  };

  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      onErrorToast('Não há folgas na visualização atual para exportar.');
      return;
    }

    const prefix = activeTab === 'upcoming' ? 'proximas-folgas' : `folgas-passadas-${pastFilter}`;
    exportTableToExcel(filteredList, prefix);
    onSuccessToast('Planilha Excel gerada com sucesso!');
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
    <div className="apple-glass-card p-6 sm:p-8 space-y-6">
      {/* Cabeçalho da listagem, abas e filtros integrados */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-2">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] dark:text-white tracking-tight">
            Quadro de Folgas
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Escala de ausências por equipe, status e saldo de horas atualizado
          </p>
        </div>

        {/* Controles estilo macOS: Segmented Control + Filtros + Refresh + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="apple-segmented-control">
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
                htmlFor="pastFilterSelect"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
              >
                Período:
              </label>
              <select
                id="pastFilterSelect"
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

          {/* Botão Circular de Exportação Excel */}
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

      {/* Conteúdo em Formato "Grouped Inset List View" (macOS Sequoia & iOS) */}
      {loading ? (
        <div className="apple-grouped-inset flex flex-col items-center justify-center py-16 text-neutral-400">
          <Loader2 className="w-7 h-7 animate-spin text-[#0071E3] dark:text-[#0A84FF] mb-3" />
          <p className="text-sm font-medium">Carregando folgas da equipe...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="apple-grouped-inset flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-neutral-400 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-neutral-200">
            {selectedTeamIds.length > 0
              ? 'Nenhuma folga encontrada para os times e período selecionados'
              : activeTab === 'upcoming'
                ? 'Nenhuma folga futura agendada'
                : 'Nenhum histórico encontrado para o período selecionado'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
            {activeTab === 'past'
              ? 'Experimente alternar o filtro de período (ex: 90 Dias ou Ano Inteiro) ou selecionar "Todos os Times".'
              : 'Todas as escalas estão completas e não há membros da equipe ausentes nos próximos dias.'}
          </p>
        </div>
      ) : (
        <div className="apple-grouped-inset p-2 overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                <th className="py-1.5 px-3">Colaborador</th>
                <th className="py-1.5 px-2.5">Time</th>
                <th className="py-1.5 px-2.5">Data</th>
                <th className="py-1.5 px-2.5">Tipo</th>
                <th className="py-1.5 px-2.5">Saldo Hoje</th>
                <th className="py-1.5 px-3">Descrição</th>
                {!isReadOnly && <th className="py-1.5 px-2.5 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="text-xs">
              {filteredList.map((item) => {
                const isItemDeleting = deletingId === item.id;
                const isConfirming = confirmDeleteId === item.id;
                const employeeName = item.employees?.name || 'Não identificado';
                const teamName = item.employees?.teams?.name;
                const balanceInfo = balanceByEmployeeId.get(item.employee_id);

                return (
                  <tr
                    key={item.id}
                    className="bg-white/90 dark:bg-[#2C2C2E]/85 hover:bg-white dark:hover:bg-[#3A3A3C]/90 shadow-apple-sm transition-all duration-200 ease-out group"
                  >
                    {/* Colaborador */}
                    <td className="py-2.5 px-3 font-semibold text-[#1D1D1F] dark:text-white whitespace-nowrap first:rounded-l-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#0071E3]/15 to-[#0071E3]/25 dark:from-[#0A84FF]/20 dark:to-[#0A84FF]/30 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center font-semibold text-[10px] uppercase flex-shrink-0">
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

                    {/* Data formatada DD/MM/YYYY */}
                    <td className="py-2.5 px-2.5 text-[#1D1D1F] dark:text-neutral-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-medium font-mono text-xs">
                          {formatDateBR(item.date)}
                        </span>
                      </div>
                    </td>

                    {/* Tipo: Dia Inteiro ou X horas */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {item.is_full_day ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/12 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300">
                          <Sun className="w-3 h-3 text-emerald-500" />
                          Dia Inteiro (08:00)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF]">
                          <Clock className="w-3 h-3" />
                          {item.hours} {item.hours === 1 ? 'hora' : 'horas'}
                        </span>
                      )}
                    </td>

                    {/* Saldo Hoje do Colaborador */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {balanceInfo && balanceInfo.hasBaseBalance ? (
                        <span
                          title={`Saldo Base: ${balanceInfo.baseHHMM}h${balanceInfo.baseDate ? ` (Ref: ${formatDateBR(balanceInfo.baseDate)})` : ''} | Abatido pós data-base: ${balanceInfo.deductedHHMM}h`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                            balanceInfo.currentBalanceMinutes < 0
                              ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
                              : balanceInfo.currentBalanceMinutes > 0
                                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                                : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          {balanceInfo.currentBalanceHHMM}h
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400 italic">-</span>
                      )}
                    </td>

                    {/* Descrição */}
                    <td
                      className={`py-2.5 px-3 text-neutral-500 dark:text-neutral-300 max-w-[200px] truncate ${
                        isReadOnly ? 'last:rounded-r-xl' : ''
                      }`}
                    >
                      {item.description ? (
                        <span title={item.description} className="text-xs">
                          {item.description}
                        </span>
                      ) : (
                        <span className="text-neutral-400 italic text-[11px]">Sem descrição</span>
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
                            title="Excluir folga"
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
