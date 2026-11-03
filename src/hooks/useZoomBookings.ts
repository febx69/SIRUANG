// src/hooks/useZoomBookings.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "./useSupabaseAuth";
import { toast } from "@/components/ui/use-toast";

export interface ZoomBooking {
  id: string;
  name: string;
  seksi: string;
  acara: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected';
  zoomLink?: string;
  adminNote?: string;
  userId?: string;
  createdAt?: string;
}

export const useZoomBookings = (user: User | null) => {
  const [zoomBookings, setZoomBookings] = useState<ZoomBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchZoomBookings = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('zoom_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const mapped: ZoomBooking[] = (data || []).map(r => ({
        id: r.id,
        name: r.name,
        seksi: r.seksi || '-',
        acara: r.acara,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status || 'pending',
        zoomLink: r.zoom_link || '',
        adminNote: r.admin_note || '',
        userId: r.user_id,
        createdAt: r.created_at,
      }));
      setZoomBookings(mapped);
    } catch (e: any) {
      if (!isBackground) toast({ title: "Gagal memuat data zoom", description: e.message, variant: "destructive" });
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) { setZoomBookings([]); return; }
    fetchZoomBookings();
    const channel = supabase.channel('realtime-zoom')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zoom_bookings' }, () => fetchZoomBookings(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchZoomBookings]);

  // Cek konflik waktu zoom (1 akun zoom tidak bisa meeting bersamaan)
  const checkZoomConflict = (date: string, startTime: string, endTime: string, excludeId?: string): boolean => {
    const sTime = startTime.slice(0, 5);
    const eTime = endTime.slice(0, 5);
    return zoomBookings.some(z => {
      if (z.id === excludeId) return false;
      if (z.status === 'rejected') return false; // yang ditolak tidak dihitung
      if (z.date !== date) return false;
      const zsTime = z.startTime.slice(0, 5);
      const zeTime = z.endTime.slice(0, 5);
      return (
        (sTime >= zsTime && sTime < zeTime) ||
        (eTime > zsTime && eTime <= zeTime) ||
        (sTime <= zsTime && eTime >= zeTime)
      );
    });
  };

  const addZoomBooking = async (d: Omit<ZoomBooking, 'id' | 'createdAt' | 'status' | 'zoomLink' | 'adminNote'>) => {
    if (!user) return { success: false, error: 'Login required' };

    // Validasi konflik
    if (checkZoomConflict(d.date, d.startTime, d.endTime)) {
      return { success: false, error: 'GAGAL: Sudah ada pengajuan Zoom pada waktu yang sama! Pilih waktu lain.' };
    }

    const { error } = await supabase.from('zoom_bookings').insert({
      name: d.name, seksi: d.seksi, acara: d.acara,
      date: d.date, start_time: d.startTime, end_time: d.endTime,
      user_id: user.id, status: 'pending',
    });
    if (!error) fetchZoomBookings(true);
    return { success: !error, error: error?.message };
  };

  // Edit pengajuan — hanya pembuat atau admin
  const editZoomBooking = async (id: string, d: { acara: string; date: string; startTime: string; endTime: string }) => {
    if (!user) return { success: false, error: 'Login required' };
    const existing = zoomBookings.find(z => z.id === id);
    if (!existing) return { success: false, error: 'Tidak ditemukan' };
    if (user.role !== 'admin' && existing.userId !== user.id) return { success: false, error: 'Tidak punya izin' };
    
    // Validasi konflik (kecuali diri sendiri)
    if (checkZoomConflict(d.date, d.startTime, d.endTime, id)) {
      return { success: false, error: 'GAGAL: Sudah ada pengajuan Zoom pada waktu yang sama! Pilih waktu lain.' };
    }

    const { error } = await supabase.from('zoom_bookings').update({
      acara: d.acara,
      date: d.date,
      start_time: d.startTime,
      end_time: d.endTime,
    }).eq('id', id);
    if (!error) fetchZoomBookings(true);
    return { success: !error, error: error?.message };
  };

  const replyZoomBooking = async (id: string, zoomLink: string, adminNote: string, status: 'approved' | 'rejected') => {
    if (!user || user.role !== 'admin') return { success: false, error: 'Unauthorized' };
    const { error } = await supabase.from('zoom_bookings').update({
      zoom_link: zoomLink, admin_note: adminNote, status,
    }).eq('id', id);
    if (!error) fetchZoomBookings(true);
    return { success: !error, error: error?.message };
  };

  const deleteZoomBooking = async (id: string) => {
    if (!user) return { success: false, error: 'Login required' };
    const existing = zoomBookings.find(z => z.id === id);
    if (!existing) return { success: false, error: 'Tidak ditemukan' };
    if (user.role !== 'admin' && existing.userId !== user.id) return { success: false, error: 'Tidak punya izin' };
    const { error } = await supabase.from('zoom_bookings').delete().eq('id', id);
    if (!error) fetchZoomBookings(true);
    return { success: !error, error: error?.message };
  };

  return { zoomBookings, isLoading, addZoomBooking, editZoomBooking, replyZoomBooking, deleteZoomBooking };
};