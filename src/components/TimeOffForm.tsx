import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  FileText,
  User,
  Plus,
  AlertTriangle,
  Check,
  Loader2,
  Building2,
} from 'lucide-react';
import type { Employee, CreateTimeOffPayload, TimeOffWithEmployee, Team } from '../types/database';
import { getTodayDateString } from '../utils/date';
import { AddEmployeeModal } from './AddEmployeeModal';

interface TimeOffFormProps {
  employees: Employee[];
  teams: Team[];
  loadingEmployees: boolean;
  onAddEmployee: (payload: { name: string; team_id?: string | null }) => Promise<Employee>;
  onAddTimeOff: (payload: CreateTimeOffPayload) => Promise<any>;
  checkConflicts: (date: string, excludeEmployeeId?: string) => Promise<TimeOffWithEmployee[]>;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

export const TimeOffForm: React.FC<TimeOffFormProps> = ({
  employees,
  teams,
  loadingEmployees,
  onAddEmployee,
  onAddTimeOff,
  checkConflicts,
  onSuccessToast,
  onErrorToast,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [hours, setHours] = useState<number | ''>(4);

  const filteredEmployees = useMemo(() => {
    if (!selectedTeamId) return [];
    return employees.filter((emp) => {
      const teamId = emp.team_id || emp.teams?.id;
      return teamId === selectedTeamId;
    });
  }, [employees, selectedTeamId]);

  const handleTeamChange = (newTeamId: string) => {
    setSelectedTeamId(newTeamId);
    if (employeeId) {
      const stillValid = employees.some(
        (emp) => emp.id === employeeId && (emp.team_id === newTeamId || emp.teams?.id === newTeamId)
      );
      if (!stillValid) {
        setEmployeeId('');
      }
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [conflicts, setConflicts] = useState<TimeOffWithEmployee[]>([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const runConflictCheck = async () => {
      if (!date) {
        setConflicts([]);
        return;
      }

      setIsCheckingConflict(true);
      try {
        const foundConflicts = await checkConflicts(date, employeeId);
        if (!isCancelled) {
          setConflicts(foundConflicts);
        }
      } catch (err) {
        console.error('Falha ao verificar conflitos:', err);
      } finally {
        if (!isCancelled) {
          setIsCheckingConflict(false);
        }
      }
    };

    runConflictCheck();

    return () => {
      isCancelled = true;
    };
  }, [date, employeeId, checkConflicts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeamId) {
      onErrorToast('Selecione primeiro o time / equipe.');
      return;
    }

    if (!employeeId) {
      onErrorToast('Selecione um colaborador da equipe.');
      return;
    }

    if (!date) {
      onErrorToast('A data da folga é obrigatória.');
      return;
    }

    if (!isFullDay && (!hours || Number(hours) <= 0)) {
      onErrorToast('Informe a quantidade de horas (mínimo 1 hora).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddTimeOff({
        employee_id: employeeId,
        date,
        description,
        is_full_day: isFullDay,
        hours: isFullDay ? null : Number(hours),
      });

      onSuccessToast('Folga cadastrada com sucesso!');

      setDescription('');
      setIsFullDay(true);
      setHours(4);

      const updatedConflicts = await checkConflicts(date, employeeId);
      setConflicts(updatedConflicts);
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao registrar folga no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeCreated = (newEmp: Employee) => {
    const teamId = newEmp.team_id || newEmp.teams?.id;
    if (teamId) {
      setSelectedTeamId(teamId);
    }
    setEmployeeId(newEmp.id);
    onSuccessToast(`Colaborador "${newEmp.name}" adicionado e selecionado!`);
  };

  return (
    <>
      <div className="apple-glass-card p-6 sm:p-8">
        <div className="flex items-center gap-3.5 pb-6 mb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] dark:text-white tracking-tight">
              Registrar Folga
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Cadastre ausências planejadas ou compensações das equipes
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Time / Equipe */}
            <div>
              <label
                htmlFor="timeOffTeamSelect"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-neutral-400" />
                Time / Equipe *
              </label>
              <select
                id="timeOffTeamSelect"
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                disabled={isSubmitting}
                className="apple-input cursor-pointer"
                required
              >
                <option value="">Selecione o time...</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Colaborador (filtrado pelo Time) */}
            <div>
              <label
                htmlFor="employeeSelect"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5"
              >
                <User className="w-4 h-4 text-neutral-400" />
                Colaborador *
              </label>
              <div className="flex gap-2">
                <select
                  id="employeeSelect"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={!selectedTeamId || loadingEmployees || isSubmitting}
                  className="apple-input flex-1 cursor-pointer disabled:opacity-50"
                  required
                >
                  {!selectedTeamId ? (
                    <option value="">Selecione o time primeiro...</option>
                  ) : filteredEmployees.length === 0 ? (
                    <option value="">Nenhum colaborador neste time...</option>
                  ) : (
                    <>
                      <option value="">Selecione um colaborador...</option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={isSubmitting}
                  title="Cadastrar novo colaborador"
                  className="w-10 h-[42px] inline-flex items-center justify-center rounded-xl border border-black/[0.06] dark:border-white/10 bg-neutral-100/90 dark:bg-[#2C2C2E] hover:bg-[#0071E3]/10 dark:hover:bg-[#0A84FF]/20 text-neutral-700 dark:text-neutral-200 hover:text-[#0071E3] dark:hover:text-[#0A84FF] active:scale-95 transition-all duration-200 ease-out flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Campo de Data */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="timeOffDate"
                  className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5"
                >
                  <CalendarIcon className="w-4 h-4 text-neutral-400" />
                  Data da Folga *
                </label>
                {isCheckingConflict && (
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
                  </span>
                )}
              </div>
              <input
                id="timeOffDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="apple-input"
                required
              />
            </div>
          </div>

          {/* REGRA DE NEGÓCIO CRÍTICA: Alerta de Conflito de Data */}
          {conflicts.length > 0 && (
            <div
              className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 animate-in fade-in duration-200 ease-out"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-100 leading-tight">
                    Conflito de Escala: Já existe outro colaborador com folga marcada para este dia.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-800 dark:text-amber-300/90">
                    {conflicts.map((conf) => {
                      const conflictTeam = conf.employees?.teams?.name
                        ? ` [${conf.employees.teams.name}]`
                        : '';
                      return (
                        <li key={conf.id} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <strong className="font-semibold">
                            {conf.employees?.name || 'Colaborador'}
                            {conflictTeam}:
                          </strong>{' '}
                          {conf.is_full_day ? 'Dia inteiro' : `${conf.hours} horas`}
                          {conf.description ? ` (${conf.description})` : ''}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Descrição */}
            <div>
              <label
                htmlFor="descriptionInput"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-neutral-400" />
                Descrição / Motivo
              </label>
              <input
                id="descriptionInput"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Consulta médica, Folga compensatória, Banco de horas..."
                disabled={isSubmitting}
                className="apple-input"
              />
            </div>

            {/* Toggle Dia Inteiro / Quantidade de Horas */}
            <div>
              <span className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-400" />
                Período da Ausência *
              </span>
              <div className="space-y-3">
                <div className="p-2.5 px-3.5 rounded-xl bg-neutral-100/80 dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1D1D1F] dark:text-neutral-200">
                    Dia inteiro{' '}
                    {isFullDay ? (
                      <span className="text-xs text-[#0071E3] dark:text-[#0A84FF] font-semibold">
                        (08:00h)
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">(Parcial por horas)</span>
                    )}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFullDay}
                      onChange={(e) => setIsFullDay(e.target.checked)}
                      disabled={isSubmitting}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-300 dark:bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all duration-200 peer-checked:bg-[#34C759]"></div>
                  </label>
                </div>

                {!isFullDay && (
                  <div className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-[#2C2C2E]/70 border border-black/[0.05] dark:border-white/[0.08] animate-in fade-in duration-200 ease-out">
                    <label
                      htmlFor="hoursInput"
                      className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1.5"
                    >
                      Quantidade de Horas (ex: 2, 4)
                    </label>
                    <div className="relative">
                      <input
                        id="hoursInput"
                        type="number"
                        min="1"
                        max="23"
                        value={hours}
                        onChange={(e) =>
                          setHours(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        disabled={isSubmitting}
                        placeholder="Ex: 4"
                        className="apple-input pr-14 bg-white dark:bg-[#1C1C1E]"
                        required={!isFullDay}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-medium pointer-events-none">
                        horas
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="flex items-center justify-end pt-4 border-t border-black/[0.05] dark:border-white/[0.08]">
            <button type="submit" disabled={isSubmitting} className="apple-btn-primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Registro de Folga
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        teams={teams}
        initialTeamId={selectedTeamId}
        onClose={() => setIsModalOpen(false)}
        onAddEmployee={onAddEmployee}
        onSuccess={handleEmployeeCreated}
      />
    </>
  );
};
