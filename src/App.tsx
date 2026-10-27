import { useState } from 'react';
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
import type { UpdateEmployeePayload } from './types/database';

function MainApp() {
  const { isAuthenticated, loading: authLoading, isAdmin, isReadOnly, user } = useAuth();
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<'folgas' | 'ferias'>('folgas');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);

  const { teams, addTeam } = useTeams();

  const {
    employees,
    loading: loadingEmployees,
    addEmployee,
    updateEmployee,
    bulkUpdateBalances,
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

  const handleUpdateEmployee = async (payload: UpdateEmployeePayload) => {
    const updated = await updateEmployee(payload);
    // Caso nome ou time tenha mudado, sincroniza listas de folgas e férias
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
    // Sincroniza listas de folgas e férias para refletir os nomes equalizados com a planilha
    refreshTimeOffs();
    refreshVacations();
    return count;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Verificando autorização...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenEmailModal={() => setIsEmailModalOpen(true)}
        onOpenManagementModal={() => setIsManagementModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner instrutivo caso o Supabase ainda não tenha sido configurado no .env */}
        {!isSupabaseConfigured && (
          <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-sm transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-950 dark:text-amber-100">
                  Configuração Inicial do Supabase Necessária
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-300/90 mt-1">
                  Para persistir as folgas, colaboradores e times em seu projeto, execute o script SQL contido em{' '}
                  <code className="bg-amber-100/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">
                    supabase-schema.sql
                  </code>{' '}
                  no <strong>SQL Editor do Supabase</strong> e preencha as variáveis de ambiente no arquivo{' '}
                  <code className="bg-amber-100/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">
                    .env
                  </code>{' '}
                  (<code className="text-xs font-mono">VITE_SUPABASE_URL</code> e{' '}
                  <code className="text-xs font-mono">VITE_SUPABASE_ANON_KEY</code>).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner Informativo de Perfil Consulta (AMS-CLICK) */}
        {isReadOnly && (
          <div className="mb-8 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-xs transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex-shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                  Modo Consulta Ativo ({user?.username})
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
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
          <div className="animate-in fade-in duration-200">
            {/* Formulário de Cadastro Superior de Folgas (Apenas Administrador) */}
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

            {/* Data Grid / Tabela Inferior de Folgas com Filtro por Time e Saldo Hoje */}
            <TimeOffList
              timeOffs={timeOffs}
              teams={teams}
              employees={employees}
              loading={loadingTimeOffs}
              deletingId={deletingId}
              onDeleteTimeOff={deleteTimeOff}
              onSuccessToast={(msg) => showToast(msg, 'success')}
              onErrorToast={(msg) => showToast(msg, 'error')}
            />
          </div>
        )}

        {/* ========================================= */}
        {/* PÁGINA: PROGRAMAÇÃO DE FÉRIAS             */}
        {/* ========================================= */}
        {activeView === 'ferias' && (
          <div className="animate-in fade-in duration-200">
            {/* Formulário de Programação de Férias (Apenas Administrador) */}
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

            {/* Data Grid / Tabela de Férias com Filtros e Exportação Excel */}
            <VacationList
              vacations={vacations}
              teams={teams}
              loading={loadingVacations}
              deletingId={deletingVacationId}
              onDeleteVacation={deleteVacation}
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
          onUpdateEmployee={handleUpdateEmployee}
          onBulkUpdateBalances={handleBulkUpdateBalances}
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

      <footer className="py-6 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors duration-200">
        <p>Gestão de Folgas, Banco de Horas e Férias - Time AMS</p>
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
