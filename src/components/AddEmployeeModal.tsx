import React, { useState } from 'react';
import { UserPlus, X, Loader2, Building2 } from 'lucide-react';
import type { Employee, Team } from '../types/database';

interface AddEmployeeModalProps {
  isOpen: boolean;
  teams: Team[];
  onClose: () => void;
  onAddEmployee: (payload: { name: string; team_id?: string | null }) => Promise<Employee>;
  onSuccess: (newEmployee: Employee) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  teams,
  onClose,
  onAddEmployee,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Por favor, informe o nome do colaborador.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      const createdEmployee = await onAddEmployee({
        name: name.trim(),
        team_id: teamId || null,
      });
      setName('');
      setTeamId('');
      onSuccess(createdEmployee);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao cadastrar colaborador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 dark:border-slate-800 overflow-hidden transform transition-all scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-semibold text-slate-800 dark:text-white">
                Novo Colaborador
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Adicione um membro informando seu time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Nome do Colaborador */}
          <div>
            <label htmlFor="employeeName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nome Completo do Colaborador *
            </label>
            <input
              id="employeeName"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Ex: Carlos Silva - DevOps"
              autoFocus
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 transition text-sm"
              required
            />
            {formError && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">{formError}</p>
            )}
          </div>

          {/* Seleção do Time */}
          <div>
            <label htmlFor="teamSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              Time / Projeto
            </label>
            <select
              id="teamSelect"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 transition text-sm"
            >
              <option value="">Selecione o Time (ex: Stellantis, Iveco)...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Vincula o colaborador ao time correspondente para filtros e escalas.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-500/20 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Colaborador'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
