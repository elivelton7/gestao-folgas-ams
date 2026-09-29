import React, { useState } from 'react';
import { 
  CalendarRange, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  Sun, 
  Moon,
  AlertCircle,
  ShieldAlert,
  EyeIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [selectedUser, setSelectedUser] = useState<'AMS-ADM' | 'AMS-CLICK'>('AMS-ADM');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Por favor, informe a senha de acesso.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await login(selectedUser, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha na autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative transition-colors duration-200">
      {/* Botão de Tema no Topo Direito */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition"
          title="Alternar Tema"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Tema Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Tema Escuro</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        {/* Card Principal de Login */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 transition-colors">
          {/* Logo e Cabeçalho */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 mb-4">
              <CalendarRange className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              TIME AMS
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Gestão de Folgas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Selecione o seu perfil e informe sua senha
            </p>
          </div>

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div 
              className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-start gap-2.5 animate-in fade-in"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Escolha do Usuário / Perfil */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Perfil de Acesso
              </label>
              
              <div className="grid grid-cols-2 gap-2.5">
                {/* Botão AMS-ADM */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser('AMS-ADM');
                    setPassword('');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    selectedUser === 'AMS-ADM'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-extrabold text-sm tracking-wide">AMS-ADM</span>
                    <ShieldAlert className={`w-3.5 h-3.5 ${selectedUser === 'AMS-ADM' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Acesso Completo
                  </span>
                </button>

                {/* Botão AMS-CLICK */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser('AMS-CLICK');
                    setPassword('');
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    selectedUser === 'AMS-CLICK'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-100 shadow-sm ring-1 ring-amber-500'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-extrabold text-sm tracking-wide">AMS-CLICK</span>
                    <EyeIcon className={`w-3.5 h-3.5 ${selectedUser === 'AMS-CLICK' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Somente Leitura
                  </span>
                </button>
              </div>
            </div>

            {/* Senha */}
            <div>
              <label 
                htmlFor="loginPassword" 
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Senha de Acesso ({selectedUser})
              </label>
              <div className="relative">
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Informe a senha correspondente..."
                  disabled={isSubmitting}
                  autoFocus
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Liberando acesso...
                </>
              ) : (
                `Entrar como ${selectedUser}`
              )}
            </button>
          </form>

          {/* Dica Informativa */}
          <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 text-center space-y-1">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              🔑 <strong>AMS-ADM:</strong> Permite cadastrar, editar e excluir registros.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              👁️ <strong>AMS-CLICK:</strong> Permite consultar, filtrar e exportar tabelas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
