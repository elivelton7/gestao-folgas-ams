import React, { useState, useEffect, useMemo } from 'react';
import {
  Palmtree,
  Calendar as CalendarIcon,
  RotateCcw,
  FileText,
  User,
  Plus,
  AlertTriangle,
  Check,
  Loader2,
  Building2,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import type { Employee, CreateVacationPayload, VacationWithEmployee, Team } from '../types/database';
import { getTodayDateString, calculateReturnDate, formatDateBR } from '../utils/date';
import { AddEmployeeModal } from './AddEmployeeModal';

interface VacationFormProps {
  employees: Employee[];
  teams: Team[];
  loadingEmployees: boolean;
  onAddEmployee: (payload: { name: string; team_id?: string | null }) => Promise<Employee>;
  onAddVacation: (payload: CreateVacationPayload, employeeData?: any) => Promise<any>;
  checkVacationConflicts: (
    startDate: string,
    returnDate: string,
    excludeEmployeeId?: string
  ) => VacationWithEmployee[];
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

const COMMON_DAYS_PRESETS = [5, 10, 15, 20, 30];

export const VacationForm: React.FC<VacationFormProps> = ({
  employees,
  teams,
  loadingEmployees,
  onAddEmployee,
  onAddVacation,
  checkVacationConflicts,
  onSuccessToast,
  onErrorToast,
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [days, setDays] = useState<number | ''>(10);
  const [returnDate, setReturnDate] = useState<string>(() =>
    calculateReturnDate(getTodayDateString(), 10)
  );
  const [isReturnDateManuallyEdited, setIsReturnDateManuallyEdited] = useState(false);
  const [notes, setNotes] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<VacationWithEmployee[]>([]);

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

  useEffect(() => {
    if (!isReturnDateManuallyEdited && startDate && days && Number(days) > 0) {
      const calculated = calculateReturnDate(startDate, Number(days));
      setReturnDate(calculated);
    }
  }, [startDate, days, isReturnDateManuallyEdited]);

  useEffect(() => {
    if (startDate && returnDate) {
      const foundConflicts = checkVacationConflicts(startDate, returnDate, employeeId);
      setConflicts(foundConflicts);
    } else {
      setConflicts([]);
    }
  }, [startDate, returnDate, employeeId, checkVacationConflicts]);

  const handleRecalculateReturnDate = () => {
    if (startDate && days && Number(days) > 0) {
      const calculated = calculateReturnDate(startDate, Number(days));
      setReturnDate(calculated);
      setIsReturnDateManuallyEdited(false);
      onSuccessToast('Data de volta recalculada (dias corridos com volta em dia útil)!');
    }
  };

  const handleReturnDateChange = (val: string) => {
    setReturnDate(val);
    setIsReturnDateManuallyEdited(true);
  };

  const handleSelectDaysPreset = (preset: number) => {
    setDays(preset);
    setIsReturnDateManuallyEdited(false);
    if (startDate) {
      setReturnDate(calculateReturnDate(startDate, preset));
    }
  };

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

    if (!startDate) {
      onErrorToast('A data de início das férias é obrigatória.');
      return;
    }

    if (!days || Number(days) <= 0) {
      onErrorToast('Informe a quantidade de dias de férias.');
      return;
    }

    if (!returnDate) {
      onErrorToast('A data de volta (retorno) é obrigatória.');
      return;
    }

    if (returnDate < startDate) {
      onErrorToast('A data de volta não pode ser anterior à data de início.');
      return;
    }

    try {
      setIsSubmitting(true);

      const selectedEmp = employees.find((e) => e.id === employeeId);

      await onAddVacation(
        {
          employee_id: employeeId,
          start_date: startDate,
          return_date: returnDate,
          days: Number(days),
          notes: notes ? notes.trim() : null,
        },
        selectedEmp
      );

      onSuccessToast('Férias programadas com sucesso!');

      setNotes('');
      setIsReturnDateManuallyEdited(false);
      setDays(10);
      setReturnDate(calculateReturnDate(startDate, 10));
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao registrar férias no sistema.');
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
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#1D1D1F] dark:text-white tracking-tight">
              Programar Férias
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Cadastre períodos de férias com cálculo automático da data de retorno
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Linha 1: Time e Colaborador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Seleção do Time */}
            <div>
              <label
                htmlFor="vacationTeamSelect"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-neutral-400" />
                Time / Equipe *
              </label>
              <select
                id="vacationTeamSelect"
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

            {/* 2. Seleção do Colaborador (filtrado pelo Time) */}
            <div>
              <label
                htmlFor="vacationEmployeeSelect"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5"
              >
                <User className="w-4 h-4 text-neutral-400" />
                Colaborador *
              </label>
              <div className="flex gap-2">
                <select
                  id="vacationEmployeeSelect"
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
          </div>

          {/* Linha 2: Datas e Período */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {/* 3. Data de Início das Férias */}
            <div>
              <label
                htmlFor="startDateInput"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5"
              >
                <CalendarIcon className="w-4 h-4 text-neutral-400" />
                Data de Início *
              </label>
              <input
                id="startDateInput"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
                className="apple-input"
                required
              />
            </div>

            {/* 4. Dias de Férias */}
            <div>
              <label
                htmlFor="daysInput"
                className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-neutral-400" />
                  Dias de Férias *
                </span>
                <span className="text-[11px] text-neutral-400 font-normal">(Dias corridos)</span>
              </label>
              <input
                id="daysInput"
                type="number"
                min="1"
                max="90"
                value={days}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setDays(val);
                }}
                disabled={isSubmitting}
                placeholder="Ex: 10, 15, 30"
                className="apple-input"
                required
              />

              {/* Presets Rápidos de Dias */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] text-neutral-400 mr-0.5">Sugestões:</span>
                {COMMON_DAYS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectDaysPreset(preset)}
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-all duration-200 ease-out ${
                      days === preset
                        ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white font-semibold shadow-apple-sm'
                        : 'bg-neutral-200/70 dark:bg-[#2C2C2E] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300/70 dark:hover:bg-[#3A3A3C]'
                    }`}
                  >
                    {preset}d
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Data de Volta (Cálculo Automático + Editável) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="returnDateInput"
                  className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                  Data de Volta ao Trabalho *
                </label>
                {isReturnDateManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleRecalculateReturnDate}
                    title="Recalcular automaticamente baseado nos dias corridos com retorno em dia útil"
                    className="text-[11px] text-[#0071E3] dark:text-[#0A84FF] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" /> Auto
                  </button>
                )}
              </div>
              <input
                id="returnDateInput"
                type="date"
                value={returnDate}
                onChange={(e) => handleReturnDateChange(e.target.value)}
                disabled={isSubmitting}
                className={`apple-input ${
                  isReturnDateManuallyEdited
                    ? 'border-[#0071E3] dark:border-[#0A84FF] ring-2 ring-[#0071E3]/15'
                    : ''
                }`}
                required
              />
              <p className="text-[11px] text-neutral-400 mt-1.5 leading-tight">
                {isReturnDateManuallyEdited ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ✏️ Data editada manualmente.
                  </span>
                ) : (
                  <span>
                    ✨ Preenchida automaticamente (dias corridos; retorno na segunda caso caia em fim de semana).
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Alerta de Conflito de Férias entre membros da equipe */}
          {conflicts.length > 0 && (
            <div
              className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 animate-in fade-in duration-200 ease-out"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-100 leading-tight">
                    Conflito de Período: Outro colaborador possui férias coincidentes neste intervalo.
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
                          {formatDateBR(conf.start_date)} até {formatDateBR(conf.return_date)} (
                          {conf.days} dias)
                          {conf.notes ? ` - ${conf.notes}` : ''}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Linha 3: Observação */}
          <div>
            <label
              htmlFor="vacationNotesInput"
              className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-neutral-400" />
              Observação
            </label>
            <input
              id="vacationNotesInput"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Adicionado +2 dias na mão devido a banco de horas..."
              disabled={isSubmitting}
              className="apple-input"
            />
          </div>

          {/* Botão de Envio */}
          <div className="flex items-center justify-end pt-4 border-t border-black/[0.05] dark:border-white/[0.08]">
            <button type="submit" disabled={isSubmitting} className="apple-btn-primary">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando Férias...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Programação de Férias
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
