import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Users,
  Building2,
  Upload,
  FileSpreadsheet,
  Calendar,
  Clock,
  Check,
  AlertTriangle,
  Edit3,
  Plus,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Info,
  UserPlus,
} from 'lucide-react';
import type {
  Employee,
  Team,
  TimeOffWithEmployee,
  UpdateEmployeePayload,
  CreateTeamPayload,
  CreateEmployeePayload,
} from '../types/database';
import {
  calculateEmployeeBalance,
  hhmmToMinutes,
  minutesToHHMM,
  isValidHHMM,
  parseBalanceSpreadsheet,
} from '../utils/balance';
import type { ParsedSpreadsheetRow } from '../utils/balance';
import { formatDateBR, getTodayDateString } from '../utils/date';
import { useAuth } from '../context/AuthContext';

const CREATE_NEW_OPTION = '__CREATE_NEW__';

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  teams: Team[];
  timeOffs: TimeOffWithEmployee[];
  onUpdateEmployee: (payload: UpdateEmployeePayload) => Promise<Employee>;
  onBulkUpdateBalances: (
    items: Array<{
      employeeId: string;
      newName?: string;
      saldoBaseMinutos: number;
      saldoBaseHoras: string;
      dataBaseSaldo: string;
    }>
  ) => Promise<number>;
  onAddTeam: (payload: CreateTeamPayload) => Promise<Team>;
  onAddEmployee: (payload: CreateEmployeePayload) => Promise<Employee>;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

type ModalTab = 'balances' | 'import' | 'teams';

export const ManagementModal: React.FC<ManagementModalProps> = ({
  isOpen,
  onClose,
  employees,
  teams,
  timeOffs,
  onUpdateEmployee,
  onBulkUpdateBalances,
  onAddTeam,
  onAddEmployee,
  onSuccessToast,
  onErrorToast,
}) => {
  const { isReadOnly } = useAuth();
  const [activeTab, setActiveTab] = useState<ModalTab>('balances');

  // Filtros na aba de Saldos & Colaboradores
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  // Estado de edição inline de um colaborador
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeamId, setEditTeamId] = useState<string>('');
  const [editBaseHHMM, setEditBaseHHMM] = useState('00:00');
  const [editBaseDate, setEditBaseDate] = useState('');
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  // Cadastro rápido de novo colaborador na aba de colaboradores
  const [showNewEmpForm, setShowNewEmpForm] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpTeamId, setNewEmpTeamId] = useState('');
  const [isCreatingEmp, setIsCreatingEmp] = useState(false);

  // Cadastro de nova equipe
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Estados da Importação de Planilha RH (Coluna A: Nome, Coluna B: HH:MM)
  const [importBaseDate, setImportBaseDate] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedSpreadsheetRow[]>([]);
  // Mapeia rowNumber -> id do colaborador existente | '__CREATE_NEW__' | '' (ignorar)
  const [manualMatchOverrides, setManualMatchOverrides] = useState<Record<number, string>>({});
  // Mapeia rowNumber -> team_id escolhido para novos colaboradores cadastrados na importação
  const [newRowTeamMap, setNewRowTeamMap] = useState<Record<number, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Calcula os saldos dinâmicos para todos os colaboradores
  const employeeSummaries = useMemo(() => {
    return employees.map((emp) => calculateEmployeeBalance(emp, timeOffs));
  }, [employees, timeOffs]);

  // Filtra a lista exibida no grid
  const filteredSummaries = useMemo(() => {
    return employeeSummaries.filter((item) => {
      const emp = item.employee;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!emp.name.toLowerCase().includes(q)) return false;
      }

      if (teamFilter !== 'ALL') {
        const empTeamId = emp.team_id || emp.teams?.id || '';
        if (teamFilter === 'NO_TEAM') {
          return !empTeamId;
        }
        return empTeamId === teamFilter;
      }

      return true;
    });
  }, [employeeSummaries, searchQuery, teamFilter]);

  if (!isOpen) return null;

  const startEditingEmployee = (emp: Employee) => {
    const currentTeamId = emp.team_id || emp.teams?.id || '';
    const baseMins =
      emp.saldo_base_minutos !== null && emp.saldo_base_minutos !== undefined
        ? Number(emp.saldo_base_minutos)
        : emp.saldo_base_horas
          ? hhmmToMinutes(emp.saldo_base_horas)
          : 0;

    setEditingEmployeeId(emp.id);
    setEditName(emp.name);
    setEditTeamId(currentTeamId);
    setEditBaseHHMM(minutesToHHMM(baseMins));
    setEditBaseDate(emp.data_base_saldo || getTodayDateString());
  };

  const cancelEditingEmployee = () => {
    setEditingEmployeeId(null);
    setEditName('');
    setEditTeamId('');
    setEditBaseHHMM('00:00');
    setEditBaseDate('');
  };

  const handleSaveEmployee = async (employeeId: string) => {
    if (!editName.trim()) {
      onErrorToast('O nome do colaborador não pode ficar vazio.');
      return;
    }

    const trimmedHHMM = editBaseHHMM.trim() || '00:00';
    if (!isValidHHMM(trimmedHHMM)) {
      onErrorToast(
        'Formato de saldo inválido. Informe no padrão HH:MM (ex: 20:00, -02:30 ou 32:15).'
      );
      return;
    }

    const totalMinutes = hhmmToMinutes(trimmedHHMM);
    const normalizedHHMM = minutesToHHMM(totalMinutes);

    try {
      setIsSavingEmployee(true);
      await onUpdateEmployee({
        id: employeeId,
        name: editName.trim(),
        team_id: editTeamId || null,
        saldo_base_minutos: totalMinutes,
        saldo_base_horas: normalizedHHMM,
        data_base_saldo: editBaseDate || null,
      });

      onSuccessToast(`Cadastro e saldo de "${editName.trim()}" atualizados com sucesso!`);
      cancelEditingEmployee();
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao atualizar colaborador.');
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleQuickAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      onErrorToast('Informe o nome do colaborador.');
      return;
    }

    try {
      setIsCreatingEmp(true);
      await onAddEmployee({
        name: newEmpName.trim(),
        team_id: newEmpTeamId || null,
      });
      setNewEmpName('');
      setShowNewEmpForm(false);
      onSuccessToast('Novo colaborador cadastrado com sucesso!');
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao criar colaborador.');
    } finally {
      setIsCreatingEmp(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      onErrorToast('Informe o nome da nova equipe.');
      return;
    }

    try {
      setIsCreatingTeam(true);
      await onAddTeam({ name: newTeamName.trim() });
      setNewTeamName('');
      onSuccessToast(`Equipe "${newTeamName.trim()}" cadastrada com sucesso!`);
    } catch (err: any) {
      onErrorToast(err.message || 'Falha ao cadastrar equipe.');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const rows = parseBalanceSpreadsheet(buffer, employees);

      if (rows.length === 0) {
        onErrorToast(
          'Nenhuma linha válida encontrada na planilha. Verifique se a Coluna A possui os Nomes e a Coluna B o Saldo (HH:MM).'
        );
        return;
      }

      // Para colaboradores não encontrados no banco, pré-seleciona automaticamente a opção de "Cadastrar como novo"
      const initialOverrides: Record<number, string> = {};
      rows.forEach((row) => {
        if (!row.matchedEmployee) {
          initialOverrides[row.rowNumber] = CREATE_NEW_OPTION;
        }
      });

      setImportFileName(file.name);
      setParsedRows(rows);
      setManualMatchOverrides(initialOverrides);
      setNewRowTeamMap({});
      onSuccessToast(`${rows.length} linha(s) lida(s) da planilha "${file.name}". Confira a prévia abaixo.`);
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err);
      onErrorToast('Não foi possível ler o arquivo enviado. Utilize um arquivo .xlsx ou .csv válido.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Retorna o estado de resolução de uma linha da planilha:
   * - mode: 'existing' (colaborador já cadastrado) | 'create_new' (será criado agora) | 'ignore' (ignorar linha)
   */
  const getRowResolution = (
    row: ParsedSpreadsheetRow
  ): { mode: 'existing' | 'create_new' | 'ignore'; employee: Employee | null; selectValue: string } => {
    const override = manualMatchOverrides[row.rowNumber];

    if (override !== undefined) {
      if (override === CREATE_NEW_OPTION) {
        return { mode: 'create_new', employee: null, selectValue: CREATE_NEW_OPTION };
      }
      if (override === '') {
        return { mode: 'ignore', employee: null, selectValue: '' };
      }
      const found = employees.find((e) => e.id === override) || null;
      return {
        mode: found ? 'existing' : 'ignore',
        employee: found,
        selectValue: found ? found.id : '',
      };
    }

    if (row.matchedEmployee) {
      return {
        mode: 'existing',
        employee: row.matchedEmployee,
        selectValue: row.matchedEmployee.id,
      };
    }

    return { mode: 'create_new', employee: null, selectValue: CREATE_NEW_OPTION };
  };

  const handleConfirmImport = async () => {
    if (!importBaseDate) {
      onErrorToast('Informe obrigatoriamente a Data-Base do Saldo (data de fechamento do RH).');
      return;
    }

    const itemsToUpdate: Array<{
      employeeId: string;
      newName?: string;
      saldoBaseMinutos: number;
      saldoBaseHoras: string;
      dataBaseSaldo: string;
    }> = [];

    const rowsToCreate: Array<{
      row: ParsedSpreadsheetRow;
      teamId: string | null;
    }> = [];

    for (const row of parsedRows) {
      const res = getRowResolution(row);
      if (res.mode === 'existing' && res.employee) {
        itemsToUpdate.push({
          employeeId: res.employee.id,
          newName: row.rawName.trim(),
          saldoBaseMinutos: row.minutes,
          saldoBaseHoras: row.formattedHHMM,
          dataBaseSaldo: importBaseDate,
        });
      } else if (res.mode === 'create_new') {
        rowsToCreate.push({
          row,
          teamId: newRowTeamMap[row.rowNumber] || null,
        });
      }
    }

    if (itemsToUpdate.length === 0 && rowsToCreate.length === 0) {
      onErrorToast('Nenhuma linha selecionada para importar ou cadastrar.');
      return;
    }

    try {
      setIsImporting(true);
      let createdCount = 0;

      // 1. Cadastra automaticamente os colaboradores novos marcados como '+ Cadastrar como novo'
      for (const item of rowsToCreate) {
        const createdEmp = await onAddEmployee({
          name: item.row.rawName.trim(),
          team_id: item.teamId,
        });
        createdCount++;
        itemsToUpdate.push({
          employeeId: createdEmp.id,
          saldoBaseMinutos: item.row.minutes,
          saldoBaseHoras: item.row.formattedHHMM,
          dataBaseSaldo: importBaseDate,
        });
      }

      // 2. Atualiza os saldos base e data-base de todos (existentes + recém-criados)
      const totalUpdated = await onBulkUpdateBalances(itemsToUpdate);

      const msgParts: string[] = [];
      if (createdCount > 0) {
        msgParts.push(`${createdCount} novo(s) colaborador(es) cadastrado(s)`);
      }
      msgParts.push(`${totalUpdated} saldo(s) gravado(s) (Data-Base: ${formatDateBR(importBaseDate)})`);

      onSuccessToast(`Importação concluída: ${msgParts.join(' e ')}!`);
      setParsedRows([]);
      setImportFileName('');
      setManualMatchOverrides({});
      setNewRowTeamMap({});
      setActiveTab('balances');
    } catch (err: any) {
      onErrorToast(err.message || 'Erro ao processar a importação da planilha.');
    } finally {
      setIsImporting(false);
    }
  };

  const getTeamName = (emp: Employee): string => {
    if (emp.teams?.name) return emp.teams.name;
    if (emp.team_id) {
      const found = teams.find((t) => t.id === emp.team_id);
      if (found) return found.name;
    }
    return '';
  };

  const existingMatchedCount = parsedRows.filter(
    (r) => getRowResolution(r).mode === 'existing'
  ).length;
  const newToCreateCount = parsedRows.filter(
    (r) => getRowResolution(r).mode === 'create_new'
  ).length;
  const totalActionableCount = existingMatchedCount + newToCreateCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Gestão de Equipes, Colaboradores e Banco de Horas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Controle de saldo base (RH), abatimento automático pós data-base (1 dia integral = 08:00) e equipes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação de Abas */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('balances')}
            className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'balances'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Saldos & Colaboradores ({employees.length})</span>
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'import'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar Planilha RH (.xlsx / .csv)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`pb-3 px-3.5 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'teams'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Equipes ({teams.length})</span>
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* ========================================================= */}
          {/* ABA 1: GRID DE CONSULTA DE SALDO E EDIÇÃO DE CADASTROS    */}
          {/* ========================================================= */}
          {activeTab === 'balances' && (
            <div className="space-y-5">
              {/* Barra explicativa da Regra de Cálculo */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span>
                    <strong>Cálculo do Saldo Hoje:</strong> Saldo Base (RH) menos folgas gozadas{' '}
                    <span className="underline font-semibold">estritamente após</span> a Data-Base até hoje ({formatDateBR(getTodayDateString())}).{' '}
                    <strong>1 folga integral = 08:00</strong>.
                  </span>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewEmpForm((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100/60 transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Novo Colaborador
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('import')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Importar Planilha RH
                    </button>
                  </div>
                )}
              </div>

              {/* Mini-formulário expansível para novo colaborador */}
              {showNewEmpForm && !isReadOnly && (
                <form
                  onSubmit={handleQuickAddEmployee}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-end gap-3 animate-in fade-in"
                >
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Nome do Colaborador *
                    </label>
                    <input
                      type="text"
                      value={newEmpName}
                      onChange={(e) => setNewEmpName(e.target.value)}
                      placeholder="Ex: Everton Silva"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-56">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Equipe
                    </label>
                    <select
                      value={newEmpTeamId}
                      onChange={(e) => setNewEmpTeamId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="">Sem equipe definida</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setShowNewEmpForm(false)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingEmp}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      {isCreatingEmp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Salvar
                    </button>
                  </div>
                </form>
              )}

              {/* Filtros de Busca e Equipe */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar colaborador por nome..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Equipe:</span>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="dark:bg-slate-800">Todas as Equipes</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id} className="dark:bg-slate-800">
                        {t.name}
                      </option>
                    ))}
                    <option value="NO_TEAM" className="dark:bg-slate-800">Sem Equipe</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Saldos e Colaboradores */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Colaborador</th>
                        <th className="py-3.5 px-4">Equipe</th>
                        <th className="py-3.5 px-4">Saldo Base (RH) + Data-Base</th>
                        <th className="py-3.5 px-4">Folgas Pós Data-Base</th>
                        <th className="py-3.5 px-4">Saldo Hoje</th>
                        {!isReadOnly && <th className="py-3.5 px-4 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                      {filteredSummaries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            Nenhum colaborador encontrado para os filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredSummaries.map((summary) => {
                          const { employee } = summary;
                          const isEditing = editingEmployeeId === employee.id;
                          const teamName = getTeamName(employee);
                          const isNegativeToday = summary.currentBalanceMinutes < 0;
                          const isPositiveToday = summary.currentBalanceMinutes > 0;

                          return (
                            <tr
                              key={employee.id}
                              className={`transition-colors ${
                                isEditing
                                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              {/* Colaborador */}
                              <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full min-w-[160px] px-2.5 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                  />
                                ) : (
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                                      {employee.name.charAt(0)}
                                    </div>
                                    <span>{employee.name}</span>
                                  </div>
                                )}
                              </td>

                              {/* Equipe */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isEditing ? (
                                  <select
                                    value={editTeamId}
                                    onChange={(e) => setEditTeamId(e.target.value)}
                                    className="w-full min-w-[130px] px-2.5 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                                  >
                                    <option value="">Sem equipe</option>
                                    {teams.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : teamName ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                                    <Building2 className="w-3 h-3 opacity-75" />
                                    {teamName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">Sem equipe</span>
                                )}
                              </td>

                              {/* Saldo Base (RH) + Data-Base */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-0.5">
                                        Saldo (HH:MM)
                                      </label>
                                      <input
                                        type="text"
                                        value={editBaseHHMM}
                                        onChange={(e) => setEditBaseHHMM(e.target.value)}
                                        placeholder="Ex: 20:00 ou -02:30"
                                        className="w-24 px-2 py-1 text-xs font-mono rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-400 mb-0.5">
                                        Data-Base
                                      </label>
                                      <input
                                        type="date"
                                        value={editBaseDate}
                                        onChange={(e) => setEditBaseDate(e.target.value)}
                                        className="px-2 py-1 text-xs rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                      />
                                    </div>
                                  </div>
                                ) : summary.hasBaseBalance ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {summary.baseHHMM}h
                                    </span>
                                    {summary.baseDate && (
                                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                        (Ref: {formatDateBR(summary.baseDate)})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">
                                    Não informado (00:00)
                                  </span>
                                )}
                              </td>

                              {/* Folgas Pós Data-Base */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {summary.deductedMinutesAfterBase > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800/60">
                                      {summary.deductedHHMM}h
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      ({summary.deductedCountAfterBase}{' '}
                                      {summary.deductedCountAfterBase === 1 ? 'folga' : 'folgas'})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs text-slate-400">00:00</span>
                                )}
                              </td>

                              {/* Saldo Hoje */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                                    isNegativeToday
                                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70'
                                      : isPositiveToday
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {isNegativeToday && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                                  {summary.currentBalanceHHMM}h
                                </span>
                              </td>

                              {/* Ações */}
                              {!isReadOnly && (
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEmployee(employee.id)}
                                        disabled={isSavingEmployee}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition disabled:opacity-50"
                                      >
                                        {isSavingEmployee ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                        Salvar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditingEmployee}
                                        disabled={isSavingEmployee}
                                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => startEditingEmployee(employee)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                                      title="Editar nome, equipe, saldo base ou data-base"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Editar</span>
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 2: IMPORTAÇÃO DE PLANILHA DO RH (.XLSX / .CSV)        */}
          {/* ========================================================= */}
          {activeTab === 'import' && !isReadOnly && (
            <div className="space-y-6">
              {/* Instruções de Layout Fixo */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Padrão de Importação da Planilha do RH
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Envie o arquivo <strong>.xlsx</strong> ou <strong>.csv</strong> com o fechamento de banco de horas:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
                      Coluna A: NOME
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Nome do colaborador (se ainda não existir no sistema, será pré-marcado para cadastro automático).
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                      Coluna B: SALDO (HH:MM)
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Saldo em formato <code>HH:MM</code> (suporta horas negativas como <code>-03:45</code> e saldos acima de 24h como <code>45:20</code>).
                    </span>
                  </div>
                </div>
              </div>

              {/* Passo 1 e 2: Data-Base + Upload de Arquivo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Data-Base Obrigatória */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <label
                    htmlFor="importBaseDateInput"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    1. Data-Base do Fechamento (Obrigatório) *
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Data em que o RH fechou o saldo na planilha (ex: 30/09/2026). Folgas tiradas até esta data não serão descontadas novamente.
                  </p>
                  <input
                    id="importBaseDateInput"
                    type="date"
                    value={importBaseDate}
                    onChange={(e) => setImportBaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* 2. Upload do Arquivo */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      2. Selecionar Planilha (.xlsx ou .csv) *
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Selecione o arquivo do computador para visualizar a prévia antes de gravar.
                    </p>
                  </div>

                  <div className="pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="rhSpreadsheetUpload"
                    />
                    <label
                      htmlFor="rhSpreadsheetUpload"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer transition"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {importFileName ? `Arquivo: ${importFileName} (Trocar)` : 'Escolher Arquivo .xlsx ou .csv'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Passo 3: Prévia antes de salvar */}
              {parsedRows.length > 0 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>
                          Prévia da Importação: {existingMatchedCount} já cadastrado(s)
                          {newToCreateCount > 0 ? ` + ${newToCreateCount} novo(s) para cadastrar` : ''}
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-0.5">
                        {importBaseDate
                          ? `Data-Base selecionada: ${formatDateBR(importBaseDate)}`
                          : '⚠️ Selecione a Data-Base no campo acima para liberar a confirmação.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isImporting || !importBaseDate || totalActionableCount === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processando Importação...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirmar e Salvar ({totalActionableCount})
                        </>
                      )}
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            <th className="py-3 px-4">Linha</th>
                            <th className="py-3 px-4">Coluna A (Nome na Planilha)</th>
                            <th className="py-3 px-4">Coluna B (Saldo Lido)</th>
                            <th className="py-3 px-4">Ação / Vínculo no Sistema</th>
                            <th className="py-3 px-4">Projeção Saldo Hoje</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {parsedRows.map((row) => {
                            const resolution = getRowResolution(row);
                            const resolvedEmp = resolution.employee;
                            const isCreatingNew = resolution.mode === 'create_new';

                            // Simula o Saldo Hoje caso seja salvo com a Data-Base informada
                            const simulatedSummary = resolvedEmp
                              ? calculateEmployeeBalance(
                                  {
                                    ...resolvedEmp,
                                    saldo_base_minutos: row.minutes,
                                    saldo_base_horas: row.formattedHHMM,
                                    data_base_saldo: importBaseDate || resolvedEmp.data_base_saldo,
                                  },
                                  timeOffs
                                )
                              : isCreatingNew
                                ? {
                                    deductedMinutesAfterBase: 0,
                                    deductedHHMM: '00:00',
                                    currentBalanceMinutes: row.minutes,
                                    currentBalanceHHMM: row.formattedHHMM,
                                  }
                                : null;

                            return (
                              <tr key={row.rowNumber} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                <td className="py-3 px-4 font-mono text-slate-400">#{row.rowNumber}</td>
                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                  <div className="flex items-center gap-2">
                                    <span>{row.rawName}</span>
                                    {!row.matchedEmployee && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        <UserPlus className="w-3 h-3" />
                                        Novo
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {row.formattedHHMM}h
                                  {row.rawBalance && row.rawBalance !== row.formattedHHMM && (
                                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                                      (lido: {row.rawBalance})
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select
                                      value={resolution.selectValue}
                                      onChange={(e) =>
                                        setManualMatchOverrides((prev) => ({
                                          ...prev,
                                          [row.rowNumber]: e.target.value,
                                        }))
                                      }
                                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                                        resolution.mode === 'existing'
                                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                                          : resolution.mode === 'create_new'
                                            ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                                            : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500'
                                      }`}
                                    >
                                      <option value={CREATE_NEW_OPTION}>
                                        ➕ Cadastrar &quot;{row.rawName}&quot; como novo colaborador
                                      </option>
                                      <option value="">-- Ignorar esta linha --</option>
                                      <optgroup label="Vincular a Colaborador Já Cadastrado">
                                        {employees.map((emp) => (
                                          <option key={emp.id} value={emp.id}>
                                            {emp.name} {getTeamName(emp) ? `(${getTeamName(emp)})` : ''}
                                          </option>
                                        ))}
                                      </optgroup>
                                    </select>

                                      {/* Se estiver vinculado a um colaborador cujo nome atual difere da planilha, avisa que será equalizado */}
                                      {resolution.mode === 'existing' &&
                                        resolvedEmp &&
                                        resolvedEmp.name.trim() !== row.rawName.trim() && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                            🔄 Nome atualizado para &quot;{row.rawName.trim()}&quot;
                                          </span>
                                        )}

                                      {/* Se estiver marcado para criar novo colaborador, permite já escolher a Equipe dele */}
                                      {isCreatingNew && (
                                      <select
                                        value={newRowTeamMap[row.rowNumber] || ''}
                                        onChange={(e) =>
                                          setNewRowTeamMap((prev) => ({
                                            ...prev,
                                            [row.rowNumber]: e.target.value,
                                          }))
                                        }
                                        className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                                        title="Selecione a equipe para o novo colaborador"
                                      >
                                        <option value="">Equipe: Sem equipe</option>
                                        {teams.map((t) => (
                                          <option key={t.id} value={t.id}>
                                            Equipe: {t.name}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  {simulatedSummary ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-500">{row.formattedHHMM}h</span>
                                      {simulatedSummary.deductedMinutesAfterBase > 0 && (
                                        <>
                                          <ArrowRight className="w-3 h-3 text-slate-400" />
                                          <span className="text-amber-600 dark:text-amber-400">
                                            {simulatedSummary.deductedHHMM}h
                                          </span>
                                        </>
                                      )}
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                      <span
                                        className={`font-bold px-2 py-0.5 rounded-md ${
                                          simulatedSummary.currentBalanceMinutes < 0
                                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        }`}
                                      >
                                        {simulatedSummary.currentBalanceHHMM}h
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">Ignorado</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* ABA 3: GESTÃO DE EQUIPES                                  */}
          {/* ========================================================= */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              {!isReadOnly && (
                <form
                  onSubmit={handleCreateTeam}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-end gap-3"
                >
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Adicionar Nova Equipe
                    </label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Ex: Stellantis, Iveco, CNH, Sustentação..."
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingTeam}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {isCreatingTeam ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Cadastrar Equipe
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {teams.map((team) => {
                  const members = employees.filter(
                    (e) => (e.team_id || e.teams?.id) === team.id
                  );
                  return (
                    <div
                      key={team.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                            {team.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {members.length}{' '}
                            {members.length === 1 ? 'colaborador vinculado' : 'colaboradores vinculados'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
