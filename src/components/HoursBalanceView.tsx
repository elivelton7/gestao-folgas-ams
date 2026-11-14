import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Loader2,
  Search,
  Building2,
  FileSpreadsheet,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Sun,
  TrendingDown,
  Users,
  CalendarPlus,
} from 'lucide-react';
import type {
  Employee,
  Team,
  TimeOffWithEmployee,
  CreateTimeOffPayload,
} from '../types/database';
import {
  calculateEmployeeBalance,
  minutesToHHMM,
} from '../utils/balance';
import type { EmployeeBalanceSummary } from '../utils/balance';
import { formatDateBR, getTodayDateString } from '../utils/date';
import { exportBalancesToExcel } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import { TeamMultiSelectFilter, NO_TEAM_FILTER_ID } from './TeamMultiSelectFilter';

interface HoursBalanceViewProps {
  employees: Employee[];
  teams: Team[];
  timeOffs: TimeOffWithEmployee[];
  loading: boolean;
  deletingTimeOffId: string | null;
  onAddTimeOff: (payload: CreateTimeOffPayload) => Promise<any>;
  onDeleteTimeOff: (id: string) => Promise<void>;
  checkConflicts: (date: string, excludeEmployeeId?: string) => Promise<TimeOffWithEmployee[]>;
  onRefresh?: () => Promise<void>;
  onOpenManagementModal?: () => void;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

type BalanceFilterType = 'all' | 'eligible_8h' | 'with_scheduled' | 'negative';
type SortOption = 'balance_desc' | 'projected_desc' | 'balance_asc' | 'name_asc';

interface DraftTimeOffSlot {
  id: string;
  date: string;
  isFullDay: boolean;
  hours: number;
  description: string;
}

const STORAGE_KEYS = {
  TEAMS: 'gestao-folgas-hours-view-teams',
  FILTER: 'gestao-folgas-hours-view-filter',
  SORT: 'gestao-folgas-hours-view-sort',
};

// Adiciona N dias úteis a uma data YYYY-MM-DD para sugerir datas iniciais de folga
function addBusinessDays(dateStr: string, daysToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  let added = 0;
  while (added < daysToAdd) {
    dt.setDate(dt.getDate() + 1);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export const HoursBalanceView: React.FC<HoursBalanceViewProps> = ({
  employees,
  teams,
  timeOffs,
  loading,
  deletingTimeOffId,
  onAddTimeOff,
  onDeleteTimeOff,
  checkConflicts,
  onRefresh,
  onOpenManagementModal,
  onSuccessToast,
  onErrorToast,
}) => {
  const { isReadOnly, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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

  const [balanceFilter, setBalanceFilter] = useState<BalanceFilterType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FILTER);
      return saved === 'all' ||
        saved === 'eligible_8h' ||
        saved === 'with_scheduled' ||
        saved === 'negative'
        ? saved
        : 'all';
    } catch {
      return 'all';
    }
  });

  const [sortBy, setSortBy] = useState<SortOption>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SORT);
      return saved === 'balance_desc' ||
        saved === 'projected_desc' ||
        saved === 'balance_asc' ||
        saved === 'name_asc'
        ? saved
        : 'balance_desc';
    } catch {
      return 'balance_desc';
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estado do painel rápido de lançamento de folgas com projeção em tempo real
  const [launchingEmployeeId, setLaunchingEmployeeId] = useState<string | null>(null);
  const [draftSlots, setDraftSlots] = useState<DraftTimeOffSlot[]>([]);
  const [conflictsByDate, setConflictsByDate] = useState<Record<string, TimeOffWithEmployee[]>>({});
  const [isSubmittingLaunch, setIsSubmittingLaunch] = useState(false);

  // Persistência de filtros no navegador
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(selectedTeamIds));
    } catch {
      // ignore
    }
  }, [selectedTeamIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FILTER, balanceFilter);
    } catch {
      // ignore
    }
  }, [balanceFilter]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SORT, sortBy);
    } catch {
      // ignore
    }
  }, [sortBy]);

  // Limpa IDs de times obsoletos caso algum time tenha sido excluído
  useEffect(() => {
    if (teams.length > 0 && selectedTeamIds.length > 0) {
      const validIds = new Set([...teams.map((t) => t.id), NO_TEAM_FILTER_ID]);
      const filtered = selectedTeamIds.filter((id) => validIds.has(id));
      if (filtered.length !== selectedTeamIds.length) {
        setSelectedTeamIds(filtered);
      }
    }
  }, [teams, selectedTeamIds]);

  // Verifica conflitos automaticamente para todas as datas preenchidas nos slots de lançamento
  useEffect(() => {
    if (!launchingEmployeeId || draftSlots.length === 0) {
      setConflictsByDate({});
      return;
    }

    let isCancelled = false;
    const uniqueDates = Array.from(
      new Set(draftSlots.map((s) => s.date).filter(Boolean))
    );

    const checkAll = async () => {
      const map: Record<string, TimeOffWithEmployee[]> = {};
      await Promise.all(
        uniqueDates.map(async (dt) => {
          try {
            const found = await checkConflicts(dt, launchingEmployeeId);
            if (found.length > 0) {
              map[dt] = found;
            }
          } catch {
            // ignore
          }
        })
      );
      if (!isCancelled) {
        setConflictsByDate(map);
      }
    };

    checkAll();
    return () => {
      isCancelled = true;
    };
  }, [draftSlots, launchingEmployeeId, checkConflicts]);

  const getTeamName = (emp: Employee): string => {
    if (emp.teams?.name) return emp.teams.name;
    if (emp.team_id) {
      const found = teams.find((t) => t.id === emp.team_id);
      if (found) return found.name;
    }
    return '';
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

  // Calcula resumos de todos os colaboradores
  const allSummaries = useMemo(() => {
    return employees.map((emp) => calculateEmployeeBalance(emp, timeOffs));
  }, [employees, timeOffs]);

  // Filtra apenas por Equipe e Busca (para calcular os contadores das pílulas de status)
  const teamAndSearchFiltered = useMemo(() => {
    return allSummaries.filter((item) => {
      const emp = item.employee;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!emp.name.toLowerCase().includes(q)) return false;
      }

      if (selectedTeamIds.length > 0) {
        const empTeamId = emp.team_id || emp.teams?.id || '';
        if (!empTeamId) {
          return selectedTeamIds.includes(NO_TEAM_FILTER_ID);
        }
        return selectedTeamIds.includes(empTeamId);
      }

      return true;
    });
  }, [allSummaries, searchQuery, selectedTeamIds]);

  const counts = useMemo(() => {
    return {
      all: teamAndSearchFiltered.length,
      eligible8h: teamAndSearchFiltered.filter((s) => s.projectedBalanceMinutes >= 480).length,
      withScheduled: teamAndSearchFiltered.filter((s) => s.scheduledFutureCount > 0).length,
      negative: teamAndSearchFiltered.filter((s) => s.projectedBalanceMinutes < 0).length,
    };
  }, [teamAndSearchFiltered]);

  // Filtra pelo filtro de status e ordena
  const filteredSummaries = useMemo(() => {
    return teamAndSearchFiltered
      .filter((s) => {
        if (balanceFilter === 'eligible_8h') return s.projectedBalanceMinutes >= 480;
        if (balanceFilter === 'with_scheduled') return s.scheduledFutureCount > 0;
        if (balanceFilter === 'negative') return s.projectedBalanceMinutes < 0;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'balance_desc') {
          if (b.currentBalanceMinutes !== a.currentBalanceMinutes) {
            return b.currentBalanceMinutes - a.currentBalanceMinutes;
          }
          return a.employee.name.localeCompare(b.employee.name);
        }
        if (sortBy === 'projected_desc') {
          if (b.projectedBalanceMinutes !== a.projectedBalanceMinutes) {
            return b.projectedBalanceMinutes - a.projectedBalanceMinutes;
          }
          return a.employee.name.localeCompare(b.employee.name);
        }
        if (sortBy === 'balance_asc') {
          if (a.projectedBalanceMinutes !== b.projectedBalanceMinutes) {
            return a.projectedBalanceMinutes - b.projectedBalanceMinutes;
          }
          return a.employee.name.localeCompare(b.employee.name);
        }
        return a.employee.name.localeCompare(b.employee.name);
      });
  }, [teamAndSearchFiltered, balanceFilter, sortBy]);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    try {
      setIsRefreshing(true);
      await onRefresh();
      onSuccessToast('Saldos e projeções atualizados!');
    } catch {
      onErrorToast('Não foi possível atualizar os saldos.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredSummaries.length === 0) {
      onErrorToast('Não há colaboradores na visualização atual para exportar.');
      return;
    }
    exportBalancesToExcel(
      filteredSummaries,
      (s) => getTeamName(s.employee),
      `saldo-horas-projecao-${balanceFilter}`
    );
    onSuccessToast('Planilha de Saldo de Horas e Projeção gerada com sucesso!');
  };

  // Abre o painel de lançamento rápido para um colaborador
  const openQuickLaunch = (summary: EmployeeBalanceSummary, suggestedDaysCount?: number) => {
    const today = getTodayDateString();
    const countToCreate =
      suggestedDaysCount && suggestedDaysCount > 0
        ? Math.min(suggestedDaysCount, 10)
        : 1;

    const initialSlots: DraftTimeOffSlot[] = Array.from({ length: countToCreate }).map(
      (_, idx) => ({
        id: `slot-${Date.now()}-${idx}`,
        date: addBusinessDays(today, idx + 1),
        isFullDay: true,
        hours: 4,
        description: 'Abatimento de Banco de Horas',
      })
    );

    setLaunchingEmployeeId(summary.employee.id);
    setDraftSlots(initialSlots);
  };

  const closeQuickLaunch = () => {
    setLaunchingEmployeeId(null);
    setDraftSlots([]);
    setConflictsByDate({});
  };

  const addDraftSlot = () => {
    const lastDate =
      draftSlots.length > 0
        ? draftSlots[draftSlots.length - 1].date
        : getTodayDateString();

    setDraftSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${prev.length}`,
        date: addBusinessDays(lastDate, 1),
        isFullDay: true,
        hours: 4,
        description: 'Abatimento de Banco de Horas',
      },
    ]);
  };

  const removeDraftSlot = (slotId: string) => {
    if (draftSlots.length <= 1) return;
    setDraftSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const updateDraftSlot = (slotId: string, patch: Partial<DraftTimeOffSlot>) => {
    setDraftSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, ...patch } : s))
    );
  };

  const handleConfirmQuickLaunch = async (summary: EmployeeBalanceSummary) => {
    if (draftSlots.length === 0) return;

    for (const slot of draftSlots) {
      if (!slot.date) {
        onErrorToast('Preencha a data em todas as folgas que deseja lançar.');
        return;
      }
      if (!slot.isFullDay && (!slot.hours || Number(slot.hours) <= 0)) {
        onErrorToast('Informe uma quantidade válida de horas para folga parcial.');
        return;
      }
    }

    // Verifica se há datas duplicadas no próprio lote
    const datesSet = new Set<string>();
    for (const slot of draftSlots) {
      if (datesSet.has(slot.date)) {
        onErrorToast(
          `A data ${formatDateBR(slot.date)} foi selecionada mais de uma vez para o mesmo colaborador.`
        );
        return;
      }
      datesSet.add(slot.date);
    }

    try {
      setIsSubmittingLaunch(true);
      for (const slot of draftSlots) {
        await onAddTimeOff({
          employee_id: summary.employee.id,
          date: slot.date,
          description: slot.description.trim() || 'Abatimento de Banco de Horas',
          is_full_day: slot.isFullDay,
          hours: slot.isFullDay ? null : Number(slot.hours),
        });
      }

      onSuccessToast(
        `${draftSlots.length} ${
          draftSlots.length === 1 ? 'folga lançada' : 'folgas lançadas'
        } para "${summary.employee.name}" com sucesso!`
      );
      closeQuickLaunch();
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao lançar folga(s).');
    } finally {
      setIsSubmittingLaunch(false);
    }
  };

  const handleDeleteScheduledTimeOff = async (timeOffId: string, empName: string, dateStr: string) => {
    try {
      await onDeleteTimeOff(timeOffId);
      onSuccessToast(`Folga agendada de "${empName}" (${formatDateBR(dateStr)}) removida!`);
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao remover folga agendada.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 ease-out">
      {/* Cards de Resumo (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Filtrado */}
        <button
          type="button"
          onClick={() => setBalanceFilter('all')}
          className={`text-left p-5 rounded-3xl border transition-all duration-200 ease-out ${
            balanceFilter === 'all'
              ? 'bg-white dark:bg-[#1C1C1E] border-[#0071E3]/40 dark:border-[#0A84FF]/40 ring-2 ring-[#0071E3]/15 shadow-apple-md'
              : 'apple-glass-card hover:bg-white/90 dark:hover:bg-[#242426]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Colaboradores
            </span>
            <div className="w-8 h-8 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#1D1D1F] dark:text-white mt-2 tracking-tight">
            {counts.all}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Exibidos conforme filtro de equipe
          </p>
        </button>

        {/* Card 2: Elegíveis a Folga Integral (>= 08:00h) */}
        <button
          type="button"
          onClick={() =>
            setBalanceFilter((prev) => (prev === 'eligible_8h' ? 'all' : 'eligible_8h'))
          }
          className={`text-left p-5 rounded-3xl border transition-all duration-200 ease-out ${
            balanceFilter === 'eligible_8h'
              ? 'bg-white dark:bg-[#1C1C1E] border-emerald-500/50 ring-2 ring-emerald-500/20 shadow-apple-md'
              : 'apple-glass-card hover:bg-white/90 dark:hover:bg-[#242426]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Disponíveis p/ Folga (≥ 08:00h)
            </span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {counts.eligible8h}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Com saldo projetado p/ 1 ou mais dias inteiros
          </p>
        </button>

        {/* Card 3: Com Folgas Futuras Agendadas */}
        <button
          type="button"
          onClick={() =>
            setBalanceFilter((prev) =>
              prev === 'with_scheduled' ? 'all' : 'with_scheduled'
            )
          }
          className={`text-left p-5 rounded-3xl border transition-all duration-200 ease-out ${
            balanceFilter === 'with_scheduled'
              ? 'bg-white dark:bg-[#1C1C1E] border-amber-500/50 ring-2 ring-amber-500/20 shadow-apple-md'
              : 'apple-glass-card hover:bg-white/90 dark:hover:bg-[#242426]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Com Folgas Agendadas
            </span>
            <div className="w-8 h-8 rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tracking-tight">
            {counts.withScheduled}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Possuem folgas futuras abatendo na projeção
          </p>
        </button>

        {/* Card 4: Saldo Projetado Negativo */}
        <button
          type="button"
          onClick={() =>
            setBalanceFilter((prev) => (prev === 'negative' ? 'all' : 'negative'))
          }
          className={`text-left p-5 rounded-3xl border transition-all duration-200 ease-out ${
            balanceFilter === 'negative'
              ? 'bg-white dark:bg-[#1C1C1E] border-rose-500/50 ring-2 ring-rose-500/20 shadow-apple-md'
              : 'apple-glass-card hover:bg-white/90 dark:hover:bg-[#242426]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              Saldo Negativo (&lt; 00:00h)
            </span>
            <div className="w-8 h-8 rounded-2xl bg-rose-500/12 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2 tracking-tight">
            {counts.negative}
          </p>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Colaboradores com banco de horas devedor
          </p>
        </button>
      </div>

      {/* Card Principal do Grid de Saldo de Horas e Projeção */}
      <div className="relative z-20 apple-glass-card p-6 sm:p-8 space-y-6">
        {/* Cabeçalho e Barra de Controles */}
        <div className="relative z-30 flex flex-col gap-4 pb-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] dark:text-white tracking-tight">
                Saldo de Horas & Projeção de Folgas
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Consulte o saldo atual, veja quantas folgas de 8h a pessoa pode tirar e simule/lance folgas com projeção automática do saldo final
              </p>
            </div>

            {isAdmin && onOpenManagementModal && (
              <button
                type="button"
                onClick={onOpenManagementModal}
                className="apple-btn-secondary self-start lg:self-auto"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                Importar Planilha RH / Editar Saldos Base
              </button>
            )}
          </div>

          {/* Barra de Busca, Segmented Control, Ordenação, Filtro Múltiplo de Equipes, Refresh e Excel */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Busca por Nome */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar colaborador por nome..."
                className="apple-input pl-9 py-2 rounded-full text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Ordenação */}
              <div className="flex items-center gap-1.5 bg-neutral-100/90 dark:bg-[#2C2C2E] px-3.5 py-2 rounded-full border border-black/[0.05] dark:border-white/10">
                <label
                  htmlFor="balanceSortSelect"
                  className="text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
                >
                  Ordenar:
                </label>
                <select
                  id="balanceSortSelect"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-[#1D1D1F] dark:text-neutral-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="balance_desc" className="dark:bg-[#1C1C1E]">
                    Maior Saldo Hoje
                  </option>
                  <option value="projected_desc" className="dark:bg-[#1C1C1E]">
                    Maior Projeção Final
                  </option>
                  <option value="balance_asc" className="dark:bg-[#1C1C1E]">
                    Menor Saldo (Negativos)
                  </option>
                  <option value="name_asc" className="dark:bg-[#1C1C1E]">
                    Nome (A - Z)
                  </option>
                </select>
              </div>

              {/* Filtro Múltiplo de Equipes */}
              <TeamMultiSelectFilter
                teams={teams}
                selectedTeamIds={selectedTeamIds}
                onChange={setSelectedTeamIds}
                includeNoTeamOption={true}
              />

              {/* Botão Refresh */}
              {onRefresh && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading || isRefreshing}
                  title="Atualizar saldos e folgas"
                  aria-label="Atualizar saldos e folgas"
                  className="w-9 h-9 rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/90 dark:bg-[#2C2C2E] hover:bg-[#0071E3]/15 dark:hover:bg-[#0A84FF]/20 text-[#0071E3] dark:text-[#0A84FF] active:scale-95 transition-all duration-200 ease-out disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Botão Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredSummaries.length === 0}
                title="Exportar Saldo de Horas e Projeção para Excel (.csv)"
                aria-label="Exportar para Excel"
                className="w-9 h-9 rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/90 dark:bg-[#2C2C2E] hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 active:scale-95 transition-all duration-200 ease-out disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Saldo de Horas e Projeção */}
        {loading ? (
          <div className="relative z-10 apple-grouped-inset flex flex-col items-center justify-center py-16 text-neutral-400">
            <Loader2 className="w-7 h-7 animate-spin text-[#0071E3] dark:text-[#0A84FF] mb-3" />
            <p className="text-sm font-medium">Calculando saldos e projeções da equipe...</p>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="relative z-10 apple-grouped-inset flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-neutral-400 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-neutral-200">
              Nenhum colaborador encontrado para os filtros selecionados
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
              Experimente limpar o filtro de equipes ou alternar os cards de filtro acima para &quot;Colaboradores (Todos)&quot;.
            </p>
          </div>
        ) : (
          <div className="relative z-10 apple-grouped-inset p-2 overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-1">
              <thead>
                <tr className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  <th className="py-1.5 px-3">Colaborador</th>
                  <th className="py-1.5 px-2.5">Time</th>
                  <th className="py-1.5 px-2.5">Saldo Base (RH)</th>
                  <th className="py-1.5 px-2.5">Abatido até Hoje</th>
                  <th className="py-1.5 px-2.5">Saldo Hoje</th>
                  <th className="py-1.5 px-2.5">Folgas Agendadas (Futuras)</th>
                  <th className="py-1.5 px-2.5">Projeção (Pós-Folgas)</th>
                  {!isReadOnly && <th className="py-1.5 px-3 text-right">Lançar Folga</th>}
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredSummaries.map((summary) => {
                  const { employee } = summary;
                  const teamName = getTeamName(employee);
                  const isLaunchingThis = launchingEmployeeId === employee.id;

                  // Cálculo da simulação em tempo real quando o painel de lançamento está aberto para este colaborador
                  const draftDeductionMinutes = isLaunchingThis
                    ? draftSlots.reduce((acc, s) => {
                        if (s.isFullDay) return acc + 480;
                        return acc + Math.round((Number(s.hours) || 0) * 60);
                      }, 0)
                    : 0;

                  const simulatedFinalMinutes =
                    summary.projectedBalanceMinutes - draftDeductionMinutes;
                  const simulatedFinalHHMM = minutesToHHMM(simulatedFinalMinutes);

                  return (
                    <React.Fragment key={employee.id}>
                      <tr
                        className={`transition-all duration-200 ease-out shadow-apple-sm ${
                          isLaunchingThis
                            ? 'bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/15 ring-1 ring-[#0071E3]/30'
                            : 'bg-white/90 dark:bg-[#2C2C2E]/85 hover:bg-white dark:hover:bg-[#3A3A3C]/90'
                        }`}
                      >
                        {/* 1. Colaborador */}
                        <td className="py-2.5 px-3 font-semibold text-[#1D1D1F] dark:text-white whitespace-nowrap first:rounded-l-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#0071E3]/15 to-[#0071E3]/25 dark:from-[#0A84FF]/20 dark:to-[#0A84FF]/30 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center font-semibold text-[10px] uppercase flex-shrink-0">
                              {employee.name.charAt(0)}
                            </div>
                            <span className="tracking-tight text-xs">{employee.name}</span>
                          </div>
                        </td>

                        {/* 2. Time */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {teamName ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getTeamBadgeStyle(
                                teamName
                              )}`}
                            >
                              <Building2 className="w-3 h-3 opacity-75" />
                              {teamName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">Sem time</span>
                          )}
                        </td>

                        {/* 3. Saldo Base (RH) */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {summary.hasBaseBalance ? (
                            <div className="flex flex-col">
                              <span className="font-mono font-semibold text-xs text-[#1D1D1F] dark:text-neutral-200">
                                {summary.baseHHMM}h
                              </span>
                              {summary.baseDate && (
                                <span className="text-[10px] text-neutral-400">
                                  Ref: {formatDateBR(summary.baseDate)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">00:00</span>
                          )}
                        </td>

                        {/* 4. Abatido até Hoje (Pós Data-Base) */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {summary.deductedMinutesAfterBase > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-semibold text-[11px] text-neutral-600 dark:text-neutral-300 bg-black/[0.05] dark:bg-white/10 px-2 py-0.5 rounded-full">
                                {summary.deductedHHMM}h
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                ({summary.deductedCountAfterBase}x)
                              </span>
                            </div>
                          ) : (
                            <span className="font-mono text-[11px] text-neutral-400">00:00</span>
                          )}
                        </td>

                        {/* 5. Saldo Hoje */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                summary.currentBalanceMinutes < 0
                                  ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
                                  : summary.currentBalanceMinutes > 0
                                    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              {summary.currentBalanceHHMM}h
                            </span>

                            {summary.availableFullDaysToday > 0 && (
                              <span
                                title={`Com ${summary.currentBalanceHHMM}h de saldo hoje, é possível tirar até ${summary.availableFullDaysToday} folga(s) de dia inteiro (08:00h cada)`}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF]"
                              >
                                {summary.availableFullDaysToday}{' '}
                                {summary.availableFullDaysToday === 1 ? 'dia (8h)' : 'dias (8h)'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Folgas Agendadas (Futuras) */}
                        <td className="py-2.5 px-2.5">
                          {summary.scheduledFutureCount > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">
                                  {summary.scheduledFutureHHMM}h
                                </span>
                                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                                  ({summary.scheduledFutureCount}{' '}
                                  {summary.scheduledFutureCount === 1
                                    ? 'agendada'
                                    : 'agendadas'}
                                  )
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {summary.scheduledFutureTimeOffs.map((to) => (
                                  <span
                                    key={to.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.08] text-[10px] font-mono text-neutral-600 dark:text-neutral-300"
                                    title={
                                      to.description
                                        ? `${formatDateBR(to.date)}: ${to.description}`
                                        : formatDateBR(to.date)
                                    }
                                  >
                                    {formatDateBR(to.date).slice(0, 5)} (
                                    {to.is_full_day ? '8h' : `${to.hours}h`})
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        disabled={deletingTimeOffId === to.id}
                                        onClick={() =>
                                          handleDeleteScheduledTimeOff(
                                            to.id,
                                            employee.name,
                                            to.date
                                          )
                                        }
                                        className="ml-0.5 text-neutral-400 hover:text-rose-500 transition-colors"
                                        title="Cancelar esta folga agendada"
                                      >
                                        {deletingTimeOffId === to.id ? (
                                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        ) : (
                                          <X className="w-2.5 h-2.5" />
                                        )}
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">
                              Nenhuma futura
                            </span>
                          )}
                        </td>

                        {/* 7. Projeção Pós-Folgas */}
                        <td
                          className={`py-2.5 px-2.5 whitespace-nowrap ${
                            isReadOnly ? 'last:rounded-r-xl' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {summary.scheduledFutureMinutes > 0 && (
                              <>
                                <span className="text-[11px] font-mono text-neutral-400 line-through">
                                  {summary.currentBalanceHHMM}h
                                </span>
                                <ArrowRight className="w-3 h-3 text-neutral-400" />
                              </>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                summary.projectedBalanceMinutes < 0
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-1 ring-rose-500/30'
                                  : summary.projectedBalanceMinutes > 0
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                                    : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              {summary.projectedBalanceHHMM}h
                            </span>
                          </div>
                        </td>

                        {/* 8. Botão de Lançar Folga Rápida */}
                        {!isReadOnly && (
                          <td className="py-2.5 px-3 text-right whitespace-nowrap last:rounded-r-xl">
                            {isLaunchingThis ? (
                              <button
                                type="button"
                                onClick={closeQuickLaunch}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:opacity-90 transition"
                              >
                                <X className="w-3 h-3" />
                                Fechar
                              </button>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {summary.availableFullDaysProjected >= 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openQuickLaunch(
                                        summary,
                                        summary.availableFullDaysProjected
                                      )
                                    }
                                    title={`Preparar ${summary.availableFullDaysProjected} folgas de 8h automaticamente`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 transition"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Lançar {summary.availableFullDaysProjected}x (
                                    {summary.availableFullDaysProjected * 8}h)
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openQuickLaunch(summary, 1)}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#0071E3] dark:bg-[#0A84FF] hover:brightness-110 text-white shadow-apple-sm active:scale-95 transition-all duration-150"
                                >
                                  <CalendarPlus className="w-3 h-3" />
                                  Lançar Folga
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* Painel Expansível de Lançamento Rápido e Simulação de Projeção */}
                      {isLaunchingThis && !isReadOnly && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="my-1.5 p-5 rounded-2xl bg-white dark:bg-[#1C1C1E] border-2 border-[#0071E3]/30 dark:border-[#0A84FF]/40 shadow-apple-lg space-y-4 animate-in fade-in duration-150">
                              {/* Barra de Simulação da Projeção em Tempo Real */}
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-black/[0.06] dark:border-white/10">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center">
                                    <CalendarPlus className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">
                                      Lançar Folga(s) para {employee.name}
                                    </h4>
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                      Adicione uma ou mais datas abaixo e acompanhe a projeção do saldo de horas em tempo real
                                    </p>
                                  </div>
                                </div>

                                {/* Resumo Numérico da Simulação */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-[#F5F5F7] dark:bg-[#2C2C2E] px-4 py-2.5 rounded-2xl border border-black/[0.05] dark:border-white/10">
                                  <div className="text-center">
                                    <span className="block text-[10px] uppercase text-neutral-400 font-semibold">
                                      Saldo Hoje
                                    </span>
                                    <span className="font-mono font-bold text-xs text-[#1D1D1F] dark:text-white">
                                      {summary.currentBalanceHHMM}h
                                    </span>
                                  </div>

                                  {summary.scheduledFutureMinutes > 0 && (
                                    <>
                                      <span className="text-neutral-400 font-bold">−</span>
                                      <div className="text-center">
                                        <span className="block text-[10px] uppercase text-amber-500 font-semibold">
                                          Já Agendado
                                        </span>
                                        <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                                          {minutesToHHMM(summary.scheduledFutureMinutes)}h
                                        </span>
                                      </div>
                                    </>
                                  )}

                                  <span className="text-neutral-400 font-bold">−</span>
                                  <div className="text-center">
                                    <span className="block text-[10px] uppercase text-[#0071E3] dark:text-[#0A84FF] font-semibold">
                                      Novo Lançamento ({draftSlots.length}x)
                                    </span>
                                    <span className="font-mono font-bold text-xs text-[#0071E3] dark:text-[#0A84FF]">
                                      {minutesToHHMM(draftDeductionMinutes)}h
                                    </span>
                                  </div>

                                  <ArrowRight className="w-4 h-4 text-neutral-400" />

                                  <div className="text-center">
                                    <span className="block text-[10px] uppercase text-neutral-500 dark:text-neutral-300 font-bold">
                                      Saldo Projetado Final
                                    </span>
                                    <span
                                      className={`inline-block font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
                                        simulatedFinalMinutes < 0
                                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                      }`}
                                    >
                                      {simulatedFinalHHMM}h
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Lista de Datas / Folgas a serem lançadas */}
                              <div className="space-y-2.5">
                                {draftSlots.map((slot, index) => {
                                  const dateConflicts = conflictsByDate[slot.date] || [];
                                  return (
                                    <div
                                      key={slot.id}
                                      className="p-3.5 rounded-2xl bg-[#F5F5F7]/80 dark:bg-[#2C2C2E]/70 border border-black/[0.05] dark:border-white/[0.08] space-y-2.5"
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                        {/* Número da Folga */}
                                        <div className="sm:col-span-1 flex items-center gap-1.5">
                                          <span className="w-6 h-6 rounded-full bg-[#0071E3]/15 text-[#0071E3] dark:text-[#0A84FF] font-bold text-[11px] flex items-center justify-center">
                                            #{index + 1}
                                          </span>
                                          <span className="sm:hidden text-xs font-semibold">
                                            Folga #{index + 1}
                                          </span>
                                        </div>

                                        {/* Data */}
                                        <div className="sm:col-span-3">
                                          <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                            Data da Folga *
                                          </label>
                                          <input
                                            type="date"
                                            value={slot.date}
                                            onChange={(e) =>
                                              updateDraftSlot(slot.id, { date: e.target.value })
                                            }
                                            className="apple-input bg-white dark:bg-[#1C1C1E] py-1.5 text-xs"
                                            required
                                          />
                                        </div>

                                        {/* Tipo: Dia Inteiro (08:00) ou Parcial */}
                                        <div className="sm:col-span-4">
                                          <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                            Duração do Desconto
                                          </label>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateDraftSlot(slot.id, { isFullDay: true })
                                              }
                                              className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition ${
                                                slot.isFullDay
                                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                                  : 'bg-white dark:bg-[#1C1C1E] border-black/10 dark:border-white/10 text-neutral-500'
                                              }`}
                                            >
                                              <Sun className="w-3 h-3 inline mr-1" />
                                              Dia Inteiro (08:00)
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateDraftSlot(slot.id, { isFullDay: false })
                                              }
                                              className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition ${
                                                !slot.isFullDay
                                                  ? 'bg-[#0071E3]/15 border-[#0071E3]/40 text-[#0071E3] dark:text-[#0A84FF]'
                                                  : 'bg-white dark:bg-[#1C1C1E] border-black/10 dark:border-white/10 text-neutral-500'
                                              }`}
                                            >
                                              Parcial
                                            </button>
                                            {!slot.isFullDay && (
                                              <input
                                                type="number"
                                                min="1"
                                                max="23"
                                                value={slot.hours}
                                                onChange={(e) =>
                                                  updateDraftSlot(slot.id, {
                                                    hours: Number(e.target.value) || 1,
                                                  })
                                                }
                                                className="apple-input w-16 py-1.5 px-2 text-xs font-mono bg-white dark:bg-[#1C1C1E]"
                                                title="Quantidade de horas"
                                              />
                                            )}
                                          </div>
                                        </div>

                                        {/* Descrição */}
                                        <div className="sm:col-span-3">
                                          <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                                            Motivo / Observação
                                          </label>
                                          <input
                                            type="text"
                                            value={slot.description}
                                            onChange={(e) =>
                                              updateDraftSlot(slot.id, {
                                                description: e.target.value,
                                              })
                                            }
                                            placeholder="Abatimento de Banco de Horas"
                                            className="apple-input bg-white dark:bg-[#1C1C1E] py-1.5 text-xs"
                                          />
                                        </div>

                                        {/* Remover slot */}
                                        <div className="sm:col-span-1 flex justify-end pt-4">
                                          {draftSlots.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => removeDraftSlot(slot.id)}
                                              className="w-7 h-7 rounded-full text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition"
                                              title="Remover esta data"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Alerta de Conflito de Data se houver */}
                                      {dateConflicts.length > 0 && (
                                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-200">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                          <span>
                                            <strong>Conflito em {formatDateBR(slot.date)}:</strong>{' '}
                                            {dateConflicts
                                              .map(
                                                (c) =>
                                                  `${c.employees?.name || 'Colaborador'} [${
                                                    c.employees?.teams?.name || 'Sem time'
                                                  }]`
                                              )
                                              .join(', ')}{' '}
                                            já possui folga nesta data.
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Rodapé de Ações do Lançamento */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={addDraftSlot}
                                  className="apple-btn-secondary py-1.5 px-3.5 text-xs"
                                >
                                  <Plus className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                                  Adicionar Outra Data de Folga (+08:00h)
                                </button>

                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    type="button"
                                    onClick={closeQuickLaunch}
                                    disabled={isSubmittingLaunch}
                                    className="apple-btn-secondary py-2 px-4 text-xs"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmQuickLaunch(summary)}
                                    disabled={isSubmittingLaunch}
                                    className="apple-btn-primary py-2 px-5 text-xs"
                                  >
                                    {isSubmittingLaunch ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Salvando...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        Confirmar {draftSlots.length}{' '}
                                        {draftSlots.length === 1 ? 'Folga' : 'Folgas'} (Projeção:{' '}
                                        {simulatedFinalHHMM}h)
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
