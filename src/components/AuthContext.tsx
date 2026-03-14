import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  clearStoredSession,
  getStoredAuthToken,
  getStoredUserRaw,
  setStoredSession,
} from '../lib/auth-storage.ts';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'ADMIN_NACIONAL'
  | 'ADMIN_ESTADUAL'
  | 'ADMIN_REGIONAL'
  | 'PRE_CANDIDATO'
  | 'CHEFE_CAMPANHA'
  | 'COORDENADOR_CAMPANHA'
  | 'COORDENADOR_ESTADUAL'
  | 'COORDENADOR_MUNICIPAL'
  | 'LIDER_SETOR'
  | 'MEMBRO_SETOR'
  | 'LIDER_EMERGENTE'
  | 'MILITANTE'
  | 'VOLUNTARIO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone_whatsapp: string;
  city?: string;
  state?: string;
  role: UserRole;
  xp_total: number;
  current_level: number;
  current_streak: number;
  missions_completed: number;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone_whatsapp: string;
  state: string;
  cep?: string;
  city?: string;
  neighborhood?: string;
  skills?: string[];
  availability?: string;
  political_experience?: string;
}

interface ProfileUpdatePayload {
  cep: string;
  city: string;
  neighborhood: string;
  skills: string[];
  availability: string;
  political_experience: string;
  lat: number | null;
  lng: number | null;
}

interface AuthApiPayload {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  devLogin: (userId: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdatePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = getStoredUserRaw();
    const token = getStoredAuthToken();

    if (!storedUser || !token) {
      clearStoredSession();
      setUser(null);
      return;
    }

    try {
      const parsed = JSON.parse(storedUser) as User;
      setUser(parsed);
    } catch {
      clearStoredSession();
      setUser(null);
    }
  }, []);

  const persistSession = (nextUser: User | null, token?: string): void => {
    setUser(nextUser);

    if (!nextUser || !token) {
      clearStoredSession();
      return;
    }

    setStoredSession(nextUser, token);
  };

  const login = async (email: string, password?: string): Promise<void> => {
    const result = await apiClient.post<AuthApiPayload>('/api/auth/login', {
      email,
      password: password ?? '',
    });

    if (result.error || !result.data?.user || !result.data?.token) {
      throw new Error(result.error ?? 'Falha no login');
    }

    persistSession(result.data.user, result.data.token);
  };

  const register = async (data: RegisterPayload): Promise<void> => {
    const result = await apiClient.post<AuthApiPayload>('/api/auth/register', data);

    if (result.error || !result.data?.user || !result.data?.token) {
      throw new Error(result.error ?? 'Falha no cadastro');
    }

    persistSession(result.data.user, result.data.token);
  };

  const devLogin = async (userId: string): Promise<void> => {
    const result = await apiClient.post<AuthApiPayload>('/api/auth/dev/login', { userId });

    if (result.error || !result.data?.user || !result.data?.token) {
      throw new Error(result.error ?? 'Falha no login local');
    }

    persistSession(result.data.user, result.data.token);
  };

  const updateProfile = async (data: ProfileUpdatePayload): Promise<void> => {
    if (!user) return;

    const result = await apiClient.put<{ user: User }>(`/api/users/${user.id}/profile`, data);

    if (result.error || !result.data?.user) {
      throw new Error(result.error ?? 'Falha ao atualizar perfil');
    }

    const token = getStoredAuthToken();
    if (!token) {
      clearStoredSession();
      setUser(null);
      throw new Error('Sessao invalida');
    }

    persistSession(result.data.user, token);
  };

  const logout = (): void => {
    persistSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, devLogin, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AUTH_TOKEN_KEY, AUTH_USER_KEY };
