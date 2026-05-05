import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi logout sekarang juga membersihkan timestamp
  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTimestamp');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    const maxSessionTime = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik

    if (savedUser && loginTimestamp) {
      const lastLoginTime = parseInt(loginTimestamp, 10);
      const currentTime = Date.now();

      // Cek apakah sesi sudah lebih dari 24 jam
      if (currentTime - lastLoginTime > maxSessionTime) {
        // Jika sudah kedaluwarsa, panggil logout
        logout();
      } else {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing saved user:', error);
          // Jika ada error, bersihkan semuanya
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

      if (error || !data) {
        console.error('Login error:', error);
        return false;
      }

      const userData: User = {
        id: data.id,
        username: data.username,
        role: data.role
      };
      
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      // Simpan timestamp saat berhasil login
      localStorage.setItem('loginTimestamp', Date.now().toString());
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  return {
    user,
    login,
    logout,
    isLoading
  };
};
