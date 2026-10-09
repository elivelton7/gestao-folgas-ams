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
  Sparkles
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
  checkVacationConflicts: (startDate: string, returnDate: string, excludeEmployeeId?: string) => VacationWithEmployee[];
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
  // Estados do formulário
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [days, setDays] = useState<number | ''>(10);
  const [returnDate, setReturnDate] = useState<string>(() => calculateReturnDate(getTodayDateString(), 10));
  const [isReturnDateManuallyEdited, setIsReturnDateManuallyEdited] = useState(false);
  const [notes, setNotes] = useState('');

  // Estados de controle e UX
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<VacationWithEmployee[]>([]);

  // Filtra colaboradores pelo time selecionado
  const filteredEmployees = useMemo(() => {
    if (!selectedTeamId) return [];
    return employees.filter((emp) => {
      const teamId = emp.team_id || emp.teams?.id;
      return teamId === selectedTeamId;
    });
  }, [employees, selectedTeamId]);

  // Se o time for alterado e o colaborador selecionado não pertencer ao novo time, limpa a seleção
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

  // Recálculo automático da data de volta baseado em dias úteis
  useEffect(() => {
    if (!isReturnDateManuallyEdited && startDate && days && Number(days) > 0) {
      const calculated = calculateReturnDate(startDate, Number(days));
      setReturnDate(calculated);
    }
  }, [startDate, days, isReturnDateManuallyEdited]);

  // Checagem de conflitos de férias
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
      onSuccessToast('Data de volta recalculada com base nos dias úteis!');
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

      // Reseta observação e recalcula data futura mantendo o time para facilidade
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 mb-8 transition-colors duration-200">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Palmtree className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Programar Férias</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cadastre períodos de férias com cálculo automático da data de retorno
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Linha 1: Time e Colaborador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Seleção do Time */}
            <div>
              <label htmlFor="vacationTeamSelect" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Time / Equipe *
              </label>
              <select
                id="vacationTeamSelect"
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm transition"
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
              <label htmlFor="vacationEmployeeSelect" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Colaborador *
              </label>
              <div className="flex gap-2">
                <select
                  id="vacationEmployeeSelect"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={!selectedTeamId || loadingEmployees || isSubmitting}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm transition disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
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
                  className="inline-flex items-center justify-center px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Linha 2: Datas e Período */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* 3. Data de Início das Férias */}
            <div>
              <label htmlFor="startDateInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Data de Início *
              </label>
              <input
                id="startDateInput"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm transition"
                required
              />
            </div>

            {/* 4. Dias de Férias */}
            <div>
              <label htmlFor="daysInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  Dias de Férias *
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                  (Dias úteis)
                </span>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm transition"
                required
              />

              {/* Presets Rápidos de Dias */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-0.5">Sugestões:</span>
                {COMMON_DAYS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectDaysPreset(preset)}
                    className={`text-xs px-2 py-0.5 rounded-md font-medium transition ${
                      days === preset
                        ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                <label htmlFor="returnDateInput" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Data de Volta ao Trabalho *
                </label>
                {isReturnDateManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleRecalculateReturnDate}
                    title="Recalcular automaticamente baseado nos dias úteis"
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
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
                className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm transition ${
                  isReturnDateManuallyEdited
                    ? 'border-teal-500 dark:border-teal-500 ring-1 ring-teal-500/20'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
                required
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-tight">
                {isReturnDateManuallyEdited ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ✏️ Data editada manualmente.
                  </span>
                ) : (
                  <span>✨ Preenchida automaticamente (dias úteis: Seg-Sex). Você pode alterar se houver horas/compensações.</span>
                )}
              </p>
            </div>
          </div>

          {/* Alerta de Conflito de Férias entre membros da equipe */}
          {conflicts.length > 0 && (
            <div 
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-1"
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-tight">
                    Atenção: Já existe outro colaborador com férias coincidentes neste mesmo período.
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-amber-800 dark:text-amber-300/90">
                    {conflicts.map((conf) => {
                      const conflictTeam = conf.employees?.teams?.name ? ` [${conf.employees.teams.name}]` : '';
                      return (
                        <li key={conf.id} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <strong className="font-semibold">{conf.employees?.name || 'Colaborador'}{conflictTeam}:</strong>{' '}
                          {formatDateBR(conf.start_date)} até {formatDateBR(conf.return_date)} ({conf.days} dias)
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
            <label htmlFor="vacationNotesInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Observação
            </label>
            <input
              id="vacationNotesInput"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Adicionado +2 dias na mão devido a banco de horas..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 text-sm transition"
            />
          </div>

          {/* Botão de Envio */}
          <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-md shadow-teal-500/20 transition disabled:opacity-50"
            >
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

      {/* Modal de cadastro de novo colaborador com time */}
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
