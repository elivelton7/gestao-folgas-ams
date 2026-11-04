import React, { useState } from 'react';
import { UserPlus, X, Loader2, Building2 } from 'lucide-react';
import type { Employee, Team } from '../types/database';

interface AddEmployeeModalProps {
  isOpen: boolean;
  teams: Team[];
  initialTeamId?: string;
  onClose: () => void;
  onAddEmployee: (payload: { name: string; team_id?: string | null }) => Promise<Employee>;
  onSuccess: (newEmployee: Employee) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  teams,
  initialTeamId,
  onClose,
  onAddEmployee,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState<string>(initialTeamId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && initialTeamId) {
      setTeamId(initialTeamId);
    }
  }, [isOpen, initialTeamId]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200 ease-out"
      onClick={onClose}
    >
      <div
        className="bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-3xl shadow-apple-lg max-w-md w-full p-6 sm:p-7 border border-black/[0.08] dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-semibold text-[#1D1D1F] dark:text-white tracking-tight">
                Novo Colaborador
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Adicione um membro informando seu time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-neutral-200/70 dark:bg-[#2C2C2E] text-neutral-500 hover:text-[#1D1D1F] dark:hover:text-white flex items-center justify-center transition-all duration-200 ease-out"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Nome do Colaborador */}
          <div>
            <label
              htmlFor="employeeName"
              className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5"
            >
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
              placeholder="Ex: Carlos Silva"
              autoFocus
              disabled={isSubmitting}
              className="apple-input"
              required
            />
            {formError && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {formError}
              </p>
            )}
          </div>

          {/* Seleção do Time */}
          <div>
            <label
              htmlFor="teamSelect"
              className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4 text-neutral-400" />
              Time / Projeto
            </label>
            <select
              id="teamSelect"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={isSubmitting}
              className="apple-input cursor-pointer"
            >
              <option value="">Selecione o Time (ex: Stellantis, Iveco)...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Vincula o colaborador ao time correspondente para filtros e escalas.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="apple-btn-secondary"
            >
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="apple-btn-primary">
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
