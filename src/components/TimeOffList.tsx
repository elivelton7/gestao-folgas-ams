import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Loader2, 
  CalendarDays, 
  History, 
  Sun,
  Filter,
  Building2
} from 'lucide-react';
import type { TimeOffWithEmployee, Team } from '../types/database';
import { formatDateBR, isUpcoming } from '../utils/date';

interface TimeOffListProps {
  timeOffs: TimeOffWithEmployee[];
  teams: Team[];
  loading: boolean;
  deletingId: string | null;
  onDeleteTimeOff: (id: string) => Promise<void>;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

type TabType = 'upcoming' | 'past';

export const TimeOffList: React.FC<TimeOffListProps> = ({
  timeOffs,
  teams,
  loading,
  deletingId,
  onDeleteTimeOff,
  onSuccessToast,
  onErrorToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL'); // 'ALL' ou id do time
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtra por data (próximas vs passadas) e por time selecionado
  const filteredList = useMemo(() => {
    return timeOffs
      .filter((item) => {
        // Filtro de data
        const matchesDate = activeTab === 'upcoming' 
          ? isUpcoming(item.date) 
          : !isUpcoming(item.date);

        if (!matchesDate) return false;

        // Filtro de time
        if (selectedTeamFilter === 'ALL') return true;
        
        // Verifica por ID do time ou pelo nome caso seja fallback
        const teamId = item.employees?.team_id || item.employees?.teams?.id;
        const teamName = item.employees?.teams?.name?.toLowerCase();
        
        return teamId === selectedTeamFilter || teamName === selectedTeamFilter.toLowerCase();
      })
      .sort((a, b) => {
        return activeTab === 'upcoming'
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      });
  }, [timeOffs, activeTab, selectedTeamFilter]);

  const upcomingCount = useMemo(
    () => timeOffs.filter((item) => isUpcoming(item.date)).length,
    [timeOffs]
  );

  const pastCount = useMemo(
    () => timeOffs.filter((item) => !isUpcoming(item.date)).length,
    [timeOffs]
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
      {/* Cabeçalho da listagem e abas */}
      <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Quadro de Folgas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acompanhe a escala de ausências por time e histórico
          </p>
        </div>

        {/* Abas e Filtro de Times */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Abas / Tabs para alternar entre Próximas e Passadas */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'upcoming'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Próximas</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'upcoming'
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
                }`}
              >
                {upcomingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('past')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition ${
                activeTab === 'past'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Passadas</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'past'
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
                }`}
              >
                {pastCount}
              </span>
            </button>
          </div>

          {/* Filtro por Time: Mostrar todos ou filtrar por Stellantis, Iveco, etc. */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            <label htmlFor="teamFilterSelect" className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Time:
            </label>
            <select
              id="teamFilterSelect"
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
        </div>
      </div>

      {/* Conteúdo da Tabela / Data Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
          <p className="text-sm font-medium">Carregando folgas da equipe...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {selectedTeamFilter !== 'ALL'
              ? 'Nenhuma folga encontrada para o time selecionado'
              : activeTab === 'upcoming'
                ? 'Nenhuma folga futura agendada'
                : 'Nenhum histórico de folgas passadas'}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mt-1">
            {selectedTeamFilter !== 'ALL'
              ? 'Experimente alternar para outro time ou selecionar "Todos os Times".'
              : activeTab === 'upcoming'
                ? 'Todas as escalas estão completas e não há membros da equipe ausentes nos próximos dias.'
                : 'Nenhum registro anterior foi encontrado para o time.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Colaborador</th>
                <th className="py-3.5 px-6">Time</th>
                <th className="py-3.5 px-6">Data</th>
                <th className="py-3.5 px-6">Tipo</th>
                <th className="py-3.5 px-6">Descrição</th>
                <th className="py-3.5 px-6 text-right">Ações</th>
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
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
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

                    {/* Data formatada DD/MM/YYYY */}
                    <td className="py-4 px-6 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <span className="font-medium font-mono text-sm">
                          {formatDateBR(item.date)}
                        </span>
                      </div>
                    </td>

                    {/* Tipo: Dia Inteiro ou X horas */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.is_full_day ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          <Sun className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                          Dia Inteiro
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          {item.hours} {item.hours === 1 ? 'hora' : 'horas'}
                        </span>
                      )}
                    </td>

                    {/* Descrição */}
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {item.description ? (
                        <span title={item.description}>{item.description}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-xs">Sem descrição</span>
                      )}
                    </td>

                    {/* Ações */}
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
                          title="Excluir folga"
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
