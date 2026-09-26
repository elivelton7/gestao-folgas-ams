import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthUser {
  username: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (passwordOrUser: string, passwordInput?: string) => Promise<void>;
  logout: () => void;
  FIXED_USER: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FIXED_USERNAME = 'AMS-CLICK';
const MASTER_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'ams@2026';

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

  const login = async (userOrPass: string, passwordInput?: string) => {
    let submittedUser = FIXED_USERNAME;
    let submittedPass = '';

    if (passwordInput !== undefined) {
      // Passou (username, password)
      submittedUser = userOrPass.trim();
      submittedPass = passwordInput.trim();
    } else {
      // Passou apenas (password)
      submittedPass = userOrPass.trim();
    }

    // Validação estrita: Usuário deve ser AMS-CLICK (case-insensitive)
    if (submittedUser.toUpperCase() !== FIXED_USERNAME) {
      throw new Error(`Usuário inválido. O acesso é exclusivo para o usuário ${FIXED_USERNAME}.`);
    }

    // Validação da senha
    if (!submittedPass || submittedPass !== MASTER_PASSWORD) {
      throw new Error('Senha incorreta. Verifique a senha de acesso.');
    }

    const authUser: AuthUser = { username: FIXED_USERNAME, role: 'admin' };
    setUser(authUser);
    localStorage.setItem('gestao-folgas-auth-user', JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gestao-folgas-auth-user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        loading,
        login,
        logout,
        FIXED_USER: FIXED_USERNAME,
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
