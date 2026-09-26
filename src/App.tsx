import { useState } from 'react';
import { Header } from './components/Header';
import { TimeOffForm } from './components/TimeOffForm';
import { TimeOffList } from './components/TimeOffList';
import { LoginPage } from './components/LoginPage';
import { EmailReportsModal } from './components/EmailReportsModal';
import { useEmployees } from './hooks/useEmployees';
import { useTimeOffs } from './hooks/useTimeOffs';
import { useTeams } from './hooks/useTeams';
import { useReportRecipients } from './hooks/useReportRecipients';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import { Database, Loader2 } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  const { 
    teams 
  } = useTeams();

  const { 
    employees, 
    loading: loadingEmployees, 
    addEmployee 
  } = useEmployees();

  const { 
    timeOffs, 
    loading: loadingTimeOffs, 
    deletingId, 
    addTimeOff, 
    deleteTimeOff, 
    checkConflicts 
  } = useTimeOffs();

  const {
    recipients,
    loading: loadingRecipients,
    addRecipient,
    toggleActive,
    deleteRecipient,
  } = useReportRecipients();

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
      <Header onOpenEmailModal={() => setIsEmailModalOpen(true)} />

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
                  (<code className="text-xs font-mono">VITE_SUPABASE_URL</code> e <code className="text-xs font-mono">VITE_SUPABASE_ANON_KEY</code>).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Formulário de Cadastro Superior */}
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

        {/* Data Grid / Tabela Inferior de Folgas com Filtro por Time */}
        <TimeOffList
          timeOffs={timeOffs}
          teams={teams}
          loading={loadingTimeOffs}
          deletingId={deletingId}
          onDeleteTimeOff={deleteTimeOff}
          onSuccessToast={(msg) => showToast(msg, 'success')}
          onErrorToast={(msg) => showToast(msg, 'error')}
        />

        {/* Modal de Configuração de Relatórios por E-mail */}
        <EmailReportsModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipients={recipients}
          loadingRecipients={loadingRecipients}
          onAddRecipient={addRecipient}
          onToggleActive={toggleActive}
          onDeleteRecipient={deleteRecipient}
          timeOffs={timeOffs}
          onSuccessToast={(msg) => showToast(msg, 'success')}
          onErrorToast={(msg) => showToast(msg, 'error')}
        />
      </main>

      <footer className="py-6 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors duration-200">
        <p>Gestão de Folgas - Time AMS</p>
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
