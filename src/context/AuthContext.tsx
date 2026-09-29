import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'readonly';

export interface AuthUser {
  username: 'AMS-ADM' | 'AMS-CLICK' | string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isReadOnly: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Credenciais configuradas (com fallbacks para as senhas solicitadas)
const ADM_PASSWORD = import.meta.env.VITE_ADM_PASSWORD || 'AMS2026AMS';
const CLICK_PASSWORD = import.meta.env.VITE_CLICK_PASSWORD || import.meta.env.VITE_ADMIN_PASSWORD || 'ams@2026';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Verifica sessão salva no localStorage
    try {
      const savedAuth = localStorage.getItem('gestao-folgas-auth-user');
      if (savedAuth) {
        setUser(JSON.parse(savedAuth));
      }
    } catch (err) {
      console.warn('Erro ao carregar sessão:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (usernameInput: string, passwordInput: string) => {
    const usernameClean = usernameInput.trim().toUpperCase();
    const passClean = passwordInput.trim();

    if (!usernameClean) {
      throw new Error('Por favor, selecione ou informe o usuário de acesso.');
    }

    if (!passClean) {
      throw new Error('Por favor, informe a senha de acesso.');
    }

    if (usernameClean === 'AMS-ADM') {
      if (passClean !== ADM_PASSWORD) {
        throw new Error('Senha incorreta para o usuário Administrador AMS-ADM.');
      }
      const authUser: AuthUser = { username: 'AMS-ADM', role: 'admin' };
      setUser(authUser);
      localStorage.setItem('gestao-folgas-auth-user', JSON.stringify(authUser));
      return;
    }

    if (usernameClean === 'AMS-CLICK') {
      if (passClean !== CLICK_PASSWORD) {
        throw new Error('Senha incorreta para o usuário Consulta AMS-CLICK.');
      }
      const authUser: AuthUser = { username: 'AMS-CLICK', role: 'readonly' };
      setUser(authUser);
      localStorage.setItem('gestao-folgas-auth-user', JSON.stringify(authUser));
      return;
    }

    throw new Error('Usuário não reconhecido. Utilize AMS-ADM ou AMS-CLICK.');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gestao-folgas-auth-user');
  };

  const isAdmin = user?.role === 'admin';
  const isReadOnly = user?.role === 'readonly';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin,
        isReadOnly,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
