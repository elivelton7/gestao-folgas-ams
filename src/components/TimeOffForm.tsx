import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  FileText, 
  User, 
  Plus, 
  AlertTriangle, 
  Check, 
  Loader2 
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
  // Estados do formulário
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [hours, setHours] = useState<number | ''>(4);

  // Estados de controle e UX
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Conflito de datas (Regra de Negócio Crítica)
  const [conflicts, setConflicts] = useState<TimeOffWithEmployee[]>([]);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Efeito para verificar conflitos sempre que a data ou colaborador mudar
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
      
      // Reseta os campos mantendo a data para facilitar lançamentos em série
      setDescription('');
      setIsFullDay(true);
      setHours(4);
      
      // Recalcula conflitos após o insert
      const updatedConflicts = await checkConflicts(date, employeeId);
      setConflicts(updatedConflicts);
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao registrar folga no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmployeeCreated = (newEmp: Employee) => {
    setEmployeeId(newEmp.id);
    onSuccessToast(`Colaborador "${newEmp.name}" adicionado e selecionado!`);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 mb-8 transition-colors duration-200">
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Registrar Folga</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cadastre ausências planejadas ou compensações das equipes
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colaborador */}
            <div>
              <label htmlFor="employeeSelect" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Colaborador *
              </label>
              <div className="flex gap-2">
                <select
                  id="employeeSelect"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={loadingEmployees || isSubmitting}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm transition disabled:opacity-60"
                  required
                >
                  <option value="">Selecione um colaborador...</option>
                  {employees.map((emp) => {
                    const teamName = emp.teams?.name ? ` [${emp.teams.name}]` : '';
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}{teamName}
                      </option>
                    );
                  })}
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

            {/* Campo de Data */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="timeOffDate" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  Data da Folga *
                </label>
                {isCheckingConflict && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verificando escala...
                  </span>
                )}
              </div>
              <input
                id="timeOffDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 text-sm transition"
                required
              />

              {/* REGRA DE NEGÓCIO CRÍTICA: Alerta de Conflito de Data */}
              {conflicts.length > 0 && (
                <div 
                  className="mt-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-1"
                  role="alert"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-tight">
                        Atenção: Já existe outro colaborador do time com folga marcada para este dia.
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs text-amber-800 dark:text-amber-300/90">
                        {conflicts.map((conf) => {
                          const conflictTeam = conf.employees?.teams?.name ? ` [${conf.employees.teams.name}]` : '';
                          return (
                            <li key={conf.id} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <strong className="font-semibold">{conf.employees?.name || 'Colaborador'}{conflictTeam}:</strong>{' '}
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Descrição */}
            <div>
              <label htmlFor="descriptionInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Descrição / Motivo
              </label>
              <input
                id="descriptionInput"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Consulta médica, Folga compensatória, Banco de horas..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 text-sm transition"
              />
            </div>

            {/* Toggle Dia Inteiro / Quantidade de Horas */}
            <div>
              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Tipo de Folga *
              </span>
              <div className="space-y-3">
                {/* Toggle Switch estilizado */}
                <label className="relative flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isFullDay}
                      onChange={(e) => setIsFullDay(e.target.checked)}
                      disabled={isSubmitting}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Dia inteiro? {isFullDay ? <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">(Sim)</span> : <span className="text-xs text-slate-400 dark:text-slate-500">(Parcial / Horas)</span>}
                  </span>
                </label>

                {/* Input condicional de Horas */}
                {!isFullDay && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 animate-in fade-in slide-in-from-top-2">
                    <label htmlFor="hoursInput" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Quantidade de Horas (ex: 2, 4)
                    </label>
                    <div className="relative">
                      <input
                        id="hoursInput"
                        type="number"
                        min="1"
                        max="23"
                        value={hours}
                        onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={isSubmitting}
                        placeholder="Ex: 4"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 dark:text-slate-100 text-sm bg-white dark:bg-slate-800"
                        required={!isFullDay}
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-medium pointer-events-none">
                        horas
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
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

      {/* Modal de cadastro de novo colaborador com time */}
      <AddEmployeeModal
        isOpen={isModalOpen}
        teams={teams}
        onClose={() => setIsModalOpen(false)}
        onAddEmployee={onAddEmployee}
        onSuccess={handleEmployeeCreated}
      />
    </>
  );
};
