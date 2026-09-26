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
  AlertCircle
} from 'lucide-react';
import { useAuth, FIXED_USERNAME } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
      await login(FIXED_USERNAME, password);
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
              Acesso exclusivo para o usuário <strong className="text-blue-600 dark:text-blue-400 font-bold">{FIXED_USERNAME}</strong>
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

          {/* Formulário com Usuário Fixo */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Usuário Fixo */}
            <div>
              <label 
                htmlFor="fixedUser" 
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  Usuário de Acesso
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/60">
                  Fixo
                </span>
              </label>
              <div className="relative">
                <input
                  id="fixedUser"
                  type="text"
                  value={FIXED_USERNAME}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-bold text-sm tracking-wider cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label 
                htmlFor="loginPassword" 
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Senha de Acesso
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
                  placeholder="Informe sua senha..."
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
                'Liberar e Entrar'
              )}
            </button>
          </form>

          {/* Dica da Senha */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              💡 Senha definida no arquivo <code className="font-mono text-slate-600 dark:text-slate-300">.env</code> (<code className="font-mono">VITE_ADMIN_PASSWORD</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
