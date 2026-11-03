// src/hooks/useSupabaseAuth.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole = 'admin' | 'user' | 'bidang' | 'ob' | 'puskesmas' | 'pengurus_barang';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  is_ob?: boolean;
}

export const resolveRole = (data?: { username?: string; role?: string; is_ob?: boolean } | null): UserRole => {
  if (!data) return 'user';
  if (data.role === 'admin') return 'admin';
  const uname = (data.username || '').toLowerCase();
  if (Boolean(data.is_ob) || data.role === 'ob' || uname === 'fathor') return 'ob';
  if (
    uname === 'pengurus_barang' ||
    uname === 'pengurusbarang' ||
    uname.startsWith('pengurus_') ||
    uname.startsWith('pengurus') ||
    data.role === 'pengurus_barang'
  ) {
    return 'pengurus_barang';
  }
  if (
    uname.startsWith('puskesmas') ||
    uname.startsWith('pkm_') ||
    uname.startsWith('pkms_') ||
    data.role === 'puskesmas'
  ) {
    return 'puskesmas';
  }
  if (data.role === 'bidang') return 'bidang';
  return 'user';
};

export const isUserOB = (user: User | null): boolean => {
  if (!user) return false;
  return Boolean(user.is_ob) || user.role === 'ob' || (user.username || '').toLowerCase() === 'fathor';
};

export const isUserPuskesmas = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'puskesmas';
};

export const isUserPengurusBarang = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'pengurus_barang' || (user.username || '').toLowerCase().startsWith('pengurus');
};

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTimestamp');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const maxSessionTime = 24 * 60 * 60 * 1000;

    if (savedUser && loginTimestamp) {
      const lastLoginTime = parseInt(loginTimestamp, 10);
      if (Date.now() - lastLoginTime > maxSessionTime) {
        logout();
      } else {
        try {
          const parsed = JSON.parse(savedUser);
          const resolved = resolveRole(parsed);
          const userData: User = {
            ...parsed,
            role: resolved,
            is_ob: Boolean(parsed.is_ob) || resolved === 'ob',
          };
          setUser(userData);
        } catch {
          logout();
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) return false;

      const resolvedRole = resolveRole(data);
      const isObRole = Boolean(data.is_ob) || resolvedRole === 'ob';

      const userData: User = {
        id: data.id,
        username: data.username,
        role: resolvedRole,
        is_ob: isObRole,
      };

      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('loginTimestamp', Date.now().toString());
      return true;
    } catch {
      return false;
    }
  };

  return { user, login, logout, isLoading };
};