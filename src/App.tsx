import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TimeOffForm } from './components/TimeOffForm';
import { TimeOffList } from './components/TimeOffList';
import { VacationForm } from './components/VacationForm';
import { VacationList } from './components/VacationList';
import { LoginPage } from './components/LoginPage';
import { EmailReportsModal } from './components/EmailReportsModal';
import { ManagementModal } from './components/ManagementModal';
import { useEmployees } from './hooks/useEmployees';
import { useTimeOffs } from './hooks/useTimeOffs';
import { useVacations } from './hooks/useVacations';
import { useTeams } from './hooks/useTeams';
import { useReportRecipients } from './hooks/useReportRecipients';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { Database, Loader2, Eye } from 'lucide-react';
import type { UpdateEmployeePayload, MergeEmployeesPayload } from './types/database';

const ACTIVE_VIEW_STORAGE_KEY = 'gestao-folgas-active-view';

function MainApp() {
  const { isAuthenticated, loading: authLoading, isAdmin, isReadOnly, user } = useAuth();
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<'folgas' | 'ferias'>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
      return saved === 'ferias' || saved === 'folgas' ? saved : 'folgas';
    } catch {
      return 'folgas';
    }
  });
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
    } catch {
      // ignore storage errors
    }
  }, [activeView]);

  const { teams, addTeam, refreshTeams } = useTeams();

  const {
    employees,
    loading: loadingEmployees,
    refreshEmployees,
    addEmployee,
    updateEmployee,
    bulkUpdateBalances,
    deleteEmployee,
    mergeEmployees,
  } = useEmployees();

  const {
    timeOffs,
    loading: loadingTimeOffs,
    deletingId,
    addTimeOff,
    deleteTimeOff,
    checkConflicts,
    refreshTimeOffs,
  } = useTimeOffs();

  const {
    vacations,
    loading: loadingVacations,
    deletingId: deletingVacationId,
    addVacation,
    deleteVacation,
    checkVacationConflicts,
    refreshVacations,
  } = useVacations();

  const {
    recipients,
    loading: loadingRecipients,
    addRecipient,
    toggleActive,
    deleteRecipient,
  } = useReportRecipients();

  const handleRefreshTimeOffGrid = async () => {
    await Promise.all([refreshTimeOffs(), refreshEmployees(), refreshTeams()]);
  };

  const handleRefreshVacationGrid = async () => {
    await Promise.all([refreshVacations(), refreshEmployees(), refreshTeams()]);
  };

  const handleUpdateEmployee = async (payload: UpdateEmployeePayload) => {
    const updated = await updateEmployee(payload);
    if (payload.name !== undefined || payload.team_id !== undefined) {
      refreshTimeOffs();
      refreshVacations();
    }
    return updated;
  };

  const handleBulkUpdateBalances = async (
    items: Array<{
      employeeId: string;
      newName?: string;
      saldoBaseMinutos: number;
      saldoBaseHoras: string;
      dataBaseSaldo: string;
    }>
  ) => {
    const count = await bulkUpdateBalances(items);
    refreshTimeOffs();
    refreshVacations();
    return count;
  };

  const handleMergeEmployees = async (payload: MergeEmployeesPayload) => {
    const merged = await mergeEmployees(payload);
    refreshTimeOffs();
    refreshVacations();
    return merged;
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    await deleteEmployee(employeeId);
    refreshTimeOffs();
    refreshVacations();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col items-center justify-center text-neutral-500">
        <Loader2 className="w-7 h-7 animate-spin text-[#0071E3] dark:text-[#0A84FF] mb-3" />
        <p className="text-sm font-medium tracking-tight">Verificando autorização...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col transition-colors duration-200 ease-out">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenEmailModal={() => setIsEmailModalOpen(true)}
        onOpenManagementModal={() => setIsManagementModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Banner instrutivo caso o Supabase ainda não tenha sido configurado no .env */}
        {!isSupabaseConfigured && (
          <div className="p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-400/10 backdrop-blur-md border border-amber-500/20 text-amber-950 dark:text-amber-200 shadow-apple-sm transition-all duration-200 ease-out">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-amber-950 dark:text-amber-100">
                  Configuração Inicial do Supabase Necessária
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed">
                  Execute o script SQL contido em{' '}
                  <code className="bg-black/[0.06] dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-medium">
                    supabase-schema.sql
                  </code>{' '}
                  no <strong>SQL Editor do Supabase</strong> e preencha as variáveis de ambiente no arquivo{' '}
                  <code className="bg-black/[0.06] dark:bg-white/10 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-medium">
                    .env
                  </code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner Informativo de Perfil Consulta (AMS-CLICK) */}
        {isReadOnly && (
          <div className="p-5 rounded-3xl bg-white/75 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/10 shadow-apple-sm transition-all duration-200 ease-out">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-[#1D1D1F] dark:text-white">
                  Modo Consulta Ativo ({user?.username})
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {activeView === 'folgas'
                    ? 'Você possui permissão para consultar o quadro de folgas, saldos e exportar planilhas para o Excel. O cadastro e exclusão são restritos ao perfil AMS-ADM.'
                    : 'Você possui permissão para consultar a programação de férias e exportar planilhas para o Excel. O agendamento e exclusão de férias são restritos ao perfil AMS-ADM.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* PÁGINA: QUADRO DE FOLGAS                 */}
        {/* ========================================= */}
        {activeView === 'folgas' && (
          <div className="space-y-8 animate-in fade-in duration-200 ease-out">
            {isAdmin && (
              <TimeOffForm
                employees={employees}
                teams={teams}
                loadingEmployees={loadingEmployees}
                onAddEmployee={addEmployee}
                onAddTimeOff={addTimeOff}
                checkConflicts={checkConflicts}
                onSuccessToast={(msg) => showToast(msg, 'success')}
                onErrorToast={(msg) => showToast(msg, 'error')}
              />
            )}

            <TimeOffList
              timeOffs={timeOffs}
              teams={teams}
              employees={employees}
              loading={loadingTimeOffs}
              deletingId={deletingId}
              onDeleteTimeOff={deleteTimeOff}
              onRefresh={handleRefreshTimeOffGrid}
              onSuccessToast={(msg) => showToast(msg, 'success')}
              onErrorToast={(msg) => showToast(msg, 'error')}
            />
          </div>
        )}

        {/* ========================================= */}
        {/* PÁGINA: PROGRAMAÇÃO DE FÉRIAS             */}
        {/* ========================================= */}
        {activeView === 'ferias' && (
          <div className="space-y-8 animate-in fade-in duration-200 ease-out">
            {isAdmin && (
              <VacationForm
                employees={employees}
                teams={teams}
                loadingEmployees={loadingEmployees}
                onAddEmployee={addEmployee}
                onAddVacation={addVacation}
                checkVacationConflicts={checkVacationConflicts}
                onSuccessToast={(msg) => showToast(msg, 'success')}
                onErrorToast={(msg) => showToast(msg, 'error')}
              />
            )}

            <VacationList
              vacations={vacations}
              teams={teams}
              loading={loadingVacations}
              deletingId={deletingVacationId}
              onDeleteVacation={deleteVacation}
              onRefresh={handleRefreshVacationGrid}
              onSuccessToast={(msg) => showToast(msg, 'success')}
              onErrorToast={(msg) => showToast(msg, 'error')}
            />
          </div>
        )}

        {/* Modal de Gestão de Equipes, Colaboradores e Banco de Horas */}
        <ManagementModal
          isOpen={isManagementModalOpen}
          onClose={() => setIsManagementModalOpen(false)}
          employees={employees}
          teams={teams}
          timeOffs={timeOffs}
          vacations={vacations}
          onUpdateEmployee={handleUpdateEmployee}
          onBulkUpdateBalances={handleBulkUpdateBalances}
          onMergeEmployees={handleMergeEmployees}
          onDeleteEmployee={handleDeleteEmployee}
          onAddTeam={addTeam}
          onAddEmployee={addEmployee}
          onSuccessToast={(msg) => showToast(msg, 'success')}
          onErrorToast={(msg) => showToast(msg, 'error')}
        />

        {/* Modal de Configuração de Relatórios por E-mail (Apenas Administrador) */}
        {isAdmin && (
          <EmailReportsModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            recipients={recipients}
            loadingRecipients={loadingRecipients}
            onAddRecipient={addRecipient}
            onToggleActive={toggleActive}
            onDeleteRecipient={deleteRecipient}
            timeOffs={timeOffs}
            vacations={vacations}
            onSuccessToast={(msg) => showToast(msg, 'success')}
            onErrorToast={(msg) => showToast(msg, 'error')}
          />
        )}
      </main>

      <footer className="relative z-0 py-6 border-t border-black/[0.05] dark:border-white/[0.08] bg-white/50 dark:bg-[#1C1C1E]/40 text-center text-xs text-neutral-400 dark:text-neutral-500 transition-colors duration-200 ease-out">
        <p className="font-medium tracking-tight">Gestão de Folgas, Banco de Horas e Férias • Time AMS</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
