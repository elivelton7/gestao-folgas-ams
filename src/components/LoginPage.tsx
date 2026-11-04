import React, { useState } from 'react';
import {
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
  EyeIcon,
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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-[#F5F5F7] flex flex-col justify-center items-center p-4 relative transition-colors duration-200 ease-out">
      {/* Botão de Tema no Topo Direito */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-full border border-black/[0.06] dark:border-white/10 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md hover:bg-white dark:hover:bg-[#2C2C2E] text-[#1D1D1F] dark:text-neutral-200 shadow-apple-sm active:scale-95 transition-all duration-200 ease-out"
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-600" />
          )}
        </button>
      </div>

      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-200 ease-out">
        {/* Card Principal de Login (Apple Glassmorphism) */}
        <div className="apple-glass-card p-8 sm:p-10">
          {/* Logo e Cabeçalho */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl overflow-hidden bg-white dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/10 flex items-center justify-center mx-auto shadow-apple-md mb-4">
              <img
                src="/favicon.jfif"
                alt="Logo Gestão de Folgas AMS"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 text-[#0071E3] dark:text-[#0A84FF] mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              TIME AMS
            </div>
            <h1 className="text-2xl font-bold text-[#1D1D1F] dark:text-white tracking-tight">
              Gestão de Folgas
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Selecione o seu perfil e informe sua senha
            </p>
          </div>

          {/* Mensagem de Erro */}
          {errorMessage && (
            <div
              className="mb-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in duration-200"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Escolha do Usuário / Perfil */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
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
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ease-out flex flex-col justify-between ${
                    selectedUser === 'AMS-ADM'
                      ? 'bg-[#0071E3]/10 dark:bg-[#0A84FF]/15 border-[#0071E3] dark:border-[#0A84FF] text-[#1D1D1F] dark:text-white shadow-apple-sm'
                      : 'bg-neutral-100/80 dark:bg-[#2C2C2E] border-black/[0.06] dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-[#3A3A3C]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-sm tracking-tight">AMS-ADM</span>
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        selectedUser === 'AMS-ADM'
                          ? 'text-[#0071E3] dark:text-[#0A84FF]'
                          : 'text-neutral-400'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
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
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ease-out flex flex-col justify-between ${
                    selectedUser === 'AMS-CLICK'
                      ? 'bg-amber-500/12 border-amber-500 text-[#1D1D1F] dark:text-white shadow-apple-sm'
                      : 'bg-neutral-100/80 dark:bg-[#2C2C2E] border-black/[0.06] dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-[#3A3A3C]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-sm tracking-tight">AMS-CLICK</span>
                    <EyeIcon
                      className={`w-4 h-4 ${
                        selectedUser === 'AMS-CLICK'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-neutral-400'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Somente Leitura
                  </span>
                </button>
              </div>
            </div>

            {/* Senha */}
            <div>
              <label
                htmlFor="loginPassword"
                className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
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
                  className="apple-input py-3 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#1D1D1F] dark:hover:text-neutral-200 transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="apple-btn-primary w-full py-3 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Liberando acesso...
                </>
              ) : (
                `Continuar como ${selectedUser}`
              )}
            </button>
          </form>

          {/* Dica Informativa */}
          <div className="mt-8 pt-5 border-t border-black/[0.06] dark:border-white/[0.08] text-center space-y-1">
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              🔑 <strong>AMS-ADM:</strong> Permite cadastrar, editar e excluir registros.
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              👁️ <strong>AMS-CLICK:</strong> Permite consultar, filtrar e exportar tabelas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
