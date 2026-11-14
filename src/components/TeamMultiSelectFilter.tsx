import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check, ChevronDown, X, Building2, HelpCircle } from 'lucide-react';
import type { Team } from '../types/database';

export const NO_TEAM_FILTER_ID = '__NO_TEAM__';

interface TeamMultiSelectFilterProps {
  teams: Team[];
  selectedTeamIds: string[];
  onChange: (selectedIds: string[]) => void;
  includeNoTeamOption?: boolean;
  label?: string;
  align?: 'left' | 'right';
}

export const TeamMultiSelectFilter: React.FC<TeamMultiSelectFilterProps> = ({
  teams,
  selectedTeamIds,
  onChange,
  includeNoTeamOption = false,
  label = 'Time:',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o popover ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isAllSelected = selectedTeamIds.length === 0;

  const toggleTeam = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      onChange(selectedTeamIds.filter((id) => id !== teamId));
    } else {
      onChange([...selectedTeamIds, teamId]);
    }
  };

  const selectAll = () => {
    onChange([]);
    setIsOpen(false);
  };

  // Texto resumido exibido no botão principal
  const summaryLabel = React.useMemo(() => {
    if (selectedTeamIds.length === 0) {
      return 'Todos os Times';
    }
    const selectedNames = teams
      .filter((t) => selectedTeamIds.includes(t.id))
      .map((t) => t.name);

    if (includeNoTeamOption && selectedTeamIds.includes(NO_TEAM_FILTER_ID)) {
      selectedNames.push('Sem Equipe');
    }

    if (selectedNames.length === 0) {
      return 'Todos os Times';
    }
    if (selectedNames.length <= 2) {
      return selectedNames.join(', ');
    }
    return `${selectedNames.length} times selecionados`;
  }, [teams, selectedTeamIds, includeNoTeamOption]);

  return (
    <div className="relative z-50" ref={containerRef}>
      <div
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border transition-all duration-200 ease-out ${
          !isAllSelected
            ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 border-[#0071E3]/30 dark:border-[#0A84FF]/30 text-[#0071E3] dark:text-[#0A84FF]'
            : 'bg-neutral-100/90 dark:bg-[#2C2C2E] border-black/[0.05] dark:border-white/10 text-[#1D1D1F] dark:text-neutral-200'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-left focus:outline-none w-full"
        >
          <Filter
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              !isAllSelected
                ? 'text-[#0071E3] dark:text-[#0A84FF]'
                : 'text-neutral-400'
            }`}
          />
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              !isAllSelected
                ? 'text-[#0071E3]/80 dark:text-[#0A84FF]/80'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {label}
          </span>
          <span className="text-xs sm:text-sm font-semibold max-w-[180px] truncate">
            {summaryLabel}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-60 ml-auto transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {!isAllSelected && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            title="Limpar filtro de equipes"
            className="ml-0.5 p-0.5 rounded-full hover:bg-[#0071E3]/20 dark:hover:bg-[#0A84FF]/25 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Popover estilo macOS Sequoia */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-2 w-64 rounded-2xl bg-white dark:bg-[#242426] shadow-2xl border border-black/[0.08] dark:border-white/15 p-2 z-[100] animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Filtrar Equipes (Múltipla)
            </span>
            {!isAllSelected && (
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-semibold text-[#0071E3] dark:text-[#0A84FF] hover:underline"
              >
                Limpar ({selectedTeamIds.length})
              </button>
            )}
          </div>

          {/* Opção: Todos os Times */}
          <button
            type="button"
            onClick={selectAll}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              isAllSelected
                ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] font-semibold'
                : 'text-[#1D1D1F] dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
            }`}
          >
            <span>Todos os Times</span>
            <div
              className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                isAllSelected
                  ? 'bg-[#0071E3] dark:bg-[#0A84FF] border-transparent text-white'
                  : 'border-neutral-300 dark:border-neutral-600'
              }`}
            >
              {isAllSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
            </div>
          </button>

          <div className="my-1.5 border-t border-black/[0.06] dark:border-white/[0.08]" />

          {/* Lista de Equipes com Múltipla Escolha */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
            {teams.map((team) => {
              const isSelected = selectedTeamIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] font-semibold'
                      : 'text-[#1D1D1F] dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Building2 className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                    <span className="truncate">{team.name}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#0071E3] dark:bg-[#0A84FF] border-transparent text-white'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}

            {includeNoTeamOption && (
              <>
                <div className="my-1 border-t border-black/[0.05] dark:border-white/[0.06]" />
                <button
                  type="button"
                  onClick={() => toggleTeam(NO_TEAM_FILTER_ID)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                    selectedTeamIds.includes(NO_TEAM_FILTER_ID)
                      ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] font-semibold'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <HelpCircle className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                    <span className="truncate italic">Sem Equipe</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border flex-shrink-0 transition-colors ${
                      selectedTeamIds.includes(NO_TEAM_FILTER_ID)
                        ? 'bg-[#0071E3] dark:bg-[#0A84FF] border-transparent text-white'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {selectedTeamIds.includes(NO_TEAM_FILTER_ID) && (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
