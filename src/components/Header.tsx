import React from 'react';
import {
  CalendarRange,
  ShieldAlert,
  CheckCircle2,
  Sun,
  Moon,
  LogOut,
  Mail,
  ShieldCheck,
  Eye,
  Palmtree,
  Users,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeView: 'folgas' | 'ferias';
  onViewChange: (view: 'folgas' | 'ferias') => void;
  onOpenEmailModal?: () => void;
  onOpenManagementModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  onOpenEmailModal,
  onOpenManagementModal,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { logout, user, isAdmin, isReadOnly } = useAuth();

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logotipo (Favicon) e Identificação */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shadow-md flex-shrink-0">
            <img
              src="/favicon.jfif"
              alt="Logo Gestão de Folgas AMS"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Gestão de Folgas
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                TIME AMS
              </span>
              {/* Badge de Perfil de Acesso */}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  ADM
                </span>
              ) : isReadOnly ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                  <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  CONSULTA
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escala de trabalho, folgas, banco de horas e programação de férias
            </p>
          </div>
        </div>

        {/* Navegação entre Páginas: Folgas vs Férias */}
        <nav aria-label="Navegação Principal" className="flex items-center">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
            <button
              onClick={() => onViewChange('folgas')}
              type="button"
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeView === 'folgas'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              <span>Folgas</span>
            </button>
            <button
              onClick={() => onViewChange('ferias')}
              type="button"
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeView === 'ferias'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Palmtree className="w-4 h-4" />
              <span>Férias</span>
            </button>
          </div>
        </nav>

        {/* Controles Minimalistas do Topo (Apenas Ícones com Tooltip) */}
        <div className="flex items-center gap-2">
          {/* Botão: Gestão de Equipes e Banco de Horas */}
          {onOpenManagementModal && (
            <button
              onClick={onOpenManagementModal}
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-all shadow-xs"
              title="Gestão e Importação de Saldo"
              aria-label="Gestão e Importação de Saldo"
            >
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}

          {/* Botão: Relatórios por E-mail (Apenas Ícone) */}
          {isAdmin && onOpenEmailModal && (
            <button
              onClick={onOpenEmailModal}
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-all shadow-xs"
              title="Relatórios por E-mail"
              aria-label="Relatórios por E-mail"
            >
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          )}

          {/* Botão: Alternância de Tema Claro / Escuro (Apenas Ícone) */}
          <button
            onClick={toggleTheme}
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-all shadow-xs"
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            aria-label={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* Indicador de Status de Conexão com Supabase (Apenas Ícone) */}
          {isSupabaseConfigured ? (
            <div
              className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs"
              title="Supabase Conectado"
              aria-label="Supabase Conectado"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : (
            <div
              className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 shadow-xs"
              title="Configuração .env do Supabase Pendente"
              aria-label="Configuração .env do Supabase Pendente"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          )}

          {/* Botão Sair / Logout */}
          <button
            onClick={logout}
            type="button"
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 transition text-xs font-semibold shadow-xs"
            title={`Conectado como ${user?.username}. Clique para sair.`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
