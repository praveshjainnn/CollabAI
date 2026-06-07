'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  color: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('collabai_token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
    void refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const userToken = data.token || null;
    setUser(data.user || null);
    setToken(userToken);
    if (userToken) {
      localStorage.setItem('collabai_token', userToken);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    const userToken = data.token || null;
    setUser(data.user || null);
    setToken(userToken);
    if (userToken) {
      localStorage.setItem('collabai_token', userToken);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // swallow logout network errors and clear local state anyway
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('collabai_token');
    }
    setUser(null);
    setToken(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
