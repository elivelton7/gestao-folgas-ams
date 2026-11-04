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
    <header className="sticky top-0 z-30 bg-white/75 dark:bg-[#1C1C1E]/75 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/10 transition-all duration-200 ease-out">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4">
        {/* Logotipo (Favicon) e Identificação */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/10 flex items-center justify-center shadow-apple-sm flex-shrink-0">
            <img
              src="/favicon.jfif"
              alt="Logo Gestão de Folgas AMS"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-semibold text-[#1D1D1F] dark:text-white tracking-tight truncate">
                Gestão de Folgas
              </h1>
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF]">
                TIME AMS
              </span>
              {/* Badge de Perfil de Acesso */}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-900/[0.06] dark:bg-white/10 text-neutral-700 dark:text-neutral-200">
                  <ShieldCheck className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" />
                  ADM
                </span>
              ) : isReadOnly ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  CONSULTA
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate hidden md:block">
              Escala de trabalho, banco de horas e programação de férias
            </p>
          </div>
        </div>

        {/* Segmented Control Estilo macOS / iOS: Folgas vs Férias */}
        <nav aria-label="Navegação Principal" className="flex items-center">
          <div className="apple-segmented-control">
            <button
              onClick={() => onViewChange('folgas')}
              type="button"
              className={`apple-segmented-item ${
                activeView === 'folgas'
                  ? 'apple-segmented-item-active text-[#0071E3] dark:text-[#0A84FF]'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              <span>Folgas</span>
            </button>
            <button
              onClick={() => onViewChange('ferias')}
              type="button"
              className={`apple-segmented-item ${
                activeView === 'ferias'
                  ? 'apple-segmented-item-active text-[#0071E3] dark:text-[#0A84FF]'
                  : 'apple-segmented-item-inactive'
              }`}
            >
              <Palmtree className="w-4 h-4" />
              <span>Férias</span>
            </button>
          </div>
        </nav>

        {/* Controles Minimalistas do Topo (Apenas Ícones Circulares Estilo Apple Toolbar) */}
        <div className="flex items-center gap-2">
          {/* Botão: Gestão de Equipes e Banco de Horas */}
          {onOpenManagementModal && (
            <button
              onClick={onOpenManagementModal}
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/80 dark:bg-[#2C2C2E] hover:bg-[#0071E3]/10 dark:hover:bg-[#0A84FF]/20 text-[#1D1D1F] dark:text-neutral-200 hover:text-[#0071E3] dark:hover:text-[#0A84FF] active:scale-95 transition-all duration-200 ease-out"
              title="Gestão e Importação de Saldo"
              aria-label="Gestão e Importação de Saldo"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {/* Botão: Relatórios por E-mail (Apenas Ícone) */}
          {isAdmin && onOpenEmailModal && (
            <button
              onClick={onOpenEmailModal}
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/80 dark:bg-[#2C2C2E] hover:bg-[#0071E3]/10 dark:hover:bg-[#0A84FF]/20 text-[#1D1D1F] dark:text-neutral-200 hover:text-[#0071E3] dark:hover:text-[#0A84FF] active:scale-95 transition-all duration-200 ease-out"
              title="Relatórios por E-mail"
              aria-label="Relatórios por E-mail"
            >
              <Mail className="w-4 h-4" />
            </button>
          )}

          {/* Botão: Alternância de Tema Claro / Escuro (Apenas Ícone) */}
          <button
            onClick={toggleTheme}
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/80 dark:bg-[#2C2C2E] hover:bg-neutral-200/80 dark:hover:bg-[#3A3A3C] text-[#1D1D1F] dark:text-neutral-200 active:scale-95 transition-all duration-200 ease-out"
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            aria-label={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-600" />
            )}
          </button>

          {/* Indicador de Status de Conexão com Supabase (Apenas Ícone) */}
          {isSupabaseConfigured ? (
            <div
              className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              title="Supabase Conectado"
              aria-label="Supabase Conectado"
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div
              className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              title="Configuração .env do Supabase Pendente"
              aria-label="Configuração .env do Supabase Pendente"
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
          )}

          {/* Botão Sair / Logout */}
          <button
            onClick={logout}
            type="button"
            className="flex items-center gap-1.5 px-3.5 h-9 rounded-full border border-black/[0.06] dark:border-white/10 bg-neutral-100/80 dark:bg-[#2C2C2E] hover:bg-rose-500/10 dark:hover:bg-rose-500/20 text-neutral-600 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/20 active:scale-95 transition-all duration-200 ease-out text-xs font-medium"
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
