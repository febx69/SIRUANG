// src/hooks/useUserManagement.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { UserRole, resolveRole } from "./useSupabaseAuth";

export interface ManagedUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  is_ob?: boolean;
  created_at?: string;
}

export const useUserManagement = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setUsers((data || []).map(u => {
        const resolved = resolveRole(u);
        return {
          ...u,
          role: resolved,
          is_ob: Boolean(u.is_ob) || resolved === 'ob',
        };
      }));
    } catch (e: any) {
      toast({ title: "Gagal memuat data user", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const addUser = async (payload: Omit<ManagedUser, 'id' | 'created_at'>) => {
    // Normalisasi username
    let cleanUsername = payload.username.trim().toLowerCase().replace(/[\s-]/g, '_');
    if (payload.role === 'puskesmas' && cleanUsername !== 'puskesmas' && !cleanUsername.startsWith('puskesmas_') && !cleanUsername.startsWith('pkm_')) {
      cleanUsername = `puskesmas_${cleanUsername}`;
    }

    // Cek username unik
    const { data: existing } = await supabase.from('users').select('id').eq('username', cleanUsername).single();
    if (existing) {
      toast({ title: "Username sudah dipakai", description: `Akun dengan username '${cleanUsername}' sudah ada.`, variant: "destructive" });
      return false;
    }

    // Pemetaan role agar mematuhi constraint PostgreSQL: CHECK (role IN ('admin', 'bidang', 'user'))
    let dbRole: 'admin' | 'bidang' | 'user' = 'user';
    let dbIsOb = false;

    if (payload.role === 'admin') {
      dbRole = 'admin';
    } else if (payload.role === 'bidang') {
      dbRole = 'bidang';
    } else if (payload.role === 'ob') {
      dbRole = 'user';
      dbIsOb = true;
    } else if (
      payload.role === 'puskesmas' ||
      payload.role === 'rsud' ||
      payload.role === 'dinsos' ||
      payload.role === 'dukcapil' ||
      payload.role === 'pengurus_barang'
    ) {
      dbRole = 'user';
      dbIsOb = false;
    } else {
      dbRole = 'user';
      dbIsOb = Boolean(payload.is_ob);
    }

    const { error } = await supabase.from('users').insert({
      username: cleanUsername,
      password: payload.password,
      role: dbRole,
      is_ob: dbIsOb,
    });

    if (error) {
      toast({ title: "Gagal tambah user", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Akun Berhasil Dibuat", description: `Akun '${cleanUsername}' (${payload.role.toUpperCase()}) telah berhasil ditambahkan.` });
    fetchUsers();
    return true;
  };

  const updateUser = async (id: string, payload: Partial<Omit<ManagedUser, 'id' | 'created_at'>>) => {
    const updateData: Record<string, any> = {};

    if (payload.username !== undefined) {
      let cleanUsername = payload.username.trim().toLowerCase().replace(/[\s-]/g, '_');
      if (payload.role === 'puskesmas' && cleanUsername !== 'puskesmas' && !cleanUsername.startsWith('puskesmas_') && !cleanUsername.startsWith('pkm_')) {
        cleanUsername = `puskesmas_${cleanUsername}`;
      }
      updateData.username = cleanUsername;
    }

    if (payload.password !== undefined && payload.password.trim() !== '') {
      updateData.password = payload.password;
    }

    if (payload.role !== undefined) {
      if (payload.role === 'admin') {
        updateData.role = 'admin';
        updateData.is_ob = false;
      } else if (payload.role === 'bidang') {
        updateData.role = 'bidang';
        updateData.is_ob = false;
      } else if (payload.role === 'ob') {
        updateData.role = 'user';
        updateData.is_ob = true;
      } else if (
        payload.role === 'puskesmas' ||
        payload.role === 'rsud' ||
        payload.role === 'dinsos' ||
        payload.role === 'dukcapil' ||
        payload.role === 'pengurus_barang'
      ) {
        updateData.role = 'user';
        updateData.is_ob = false;
      } else {
        updateData.role = 'user';
        updateData.is_ob = Boolean(payload.is_ob);
      }
    } else if (payload.is_ob !== undefined) {
      updateData.is_ob = payload.is_ob;
    }

    const { error } = await supabase.from('users').update(updateData).eq('id', id);
    if (error) {
      toast({ title: "Gagal update user", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Berhasil", description: "Data akun berhasil diperbarui." });
    fetchUsers();
    return true;
  };

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      toast({ title: "Gagal hapus user", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Terhapus", description: "Akun berhasil dihapus." });
    fetchUsers();
    return true;
  };

  return { users, isLoading, addUser, updateUser, deleteUser, refetch: fetchUsers };
};