import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client.ts';

export type UserRole = 'SUPER_ADMIN' | 'COORDENADOR_ESTADUAL' | 'COORDENADOR_MUNICIPAL' | 'LIDER_EMERGENTE' | 'VOLUNTARIO';

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

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdatePayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('missao_user');
    if (!storedUser) return;

    try {
      const parsed = JSON.parse(storedUser) as User;
      setUser(parsed);
    } catch {
      localStorage.removeItem('missao_user');
      setUser(null);
    }
  }, []);

  const persistUser = (nextUser: User | null): void => {
    setUser(nextUser);

    if (!nextUser) {
      localStorage.removeItem('missao_user');
      return;
    }

    localStorage.setItem('missao_user', JSON.stringify(nextUser));
  };

  const login = async (email: string, password?: string): Promise<void> => {
    const result = await apiClient.post<{ user: User }>('/api/auth/login', {
      email,
      password: password ?? '',
    });

    if (result.error || !result.data?.user) {
      throw new Error(result.error ?? 'Falha no login');
    }

    persistUser(result.data.user);
  };

  const register = async (data: RegisterPayload): Promise<void> => {
    const result = await apiClient.post<{ user: User; success: boolean }>('/api/auth/register', data);

    if (result.error || !result.data?.user) {
      throw new Error(result.error ?? 'Falha no cadastro');
    }

    persistUser(result.data.user);
  };

  const updateProfile = async (data: ProfileUpdatePayload): Promise<void> => {
    if (!user) return;

    const result = await apiClient.put<{ user: User }>(`/api/users/${user.id}/profile`, data);

    if (result.error || !result.data?.user) {
      throw new Error(result.error ?? 'Falha ao atualizar perfil');
    }

    persistUser(result.data.user);
  };

  const logout = (): void => {
    persistUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
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

