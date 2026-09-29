import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import { loginApi, registerApi, logoutApi, getMeApi } from '../services/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smart_credit_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smart_credit_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifySession() {
      if (token) {
        try {
          const freshUser = await getMeApi(token);
          setUser(freshUser);
          localStorage.setItem('smart_credit_user', JSON.stringify(freshUser));
        } catch (e) {
          // Token invalid or expired
          setToken(null);
          setUser(null);
          localStorage.removeItem('smart_credit_token');
          localStorage.removeItem('smart_credit_user');
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
    verifySession();
  }, [token]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('smart_credit_token');
      localStorage.removeItem('smart_credit_user');
    };
    window.addEventListener('auth_expired', handleAuthExpired);
    return () => window.removeEventListener('auth_expired', handleAuthExpired);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await loginApi(credentials);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('smart_credit_token', response.access_token);
    localStorage.setItem('smart_credit_user', JSON.stringify(response.user));
  };

  const register = async (credentials: RegisterCredentials) => {
    const response = await registerApi(credentials);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('smart_credit_token', response.access_token);
    localStorage.setItem('smart_credit_user', JSON.stringify(response.user));
  };

  const logout = async () => {
    if (token) {
      await logoutApi(token);
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('smart_credit_token');
    localStorage.removeItem('smart_credit_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
