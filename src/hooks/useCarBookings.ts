import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";
import { sendCarBookingNotification, sendCarBookingStatusNotification } from "@/lib/telegram";

export type CarBookingStatus = "pending" | "approved" | "rejected";

export interface CarBooking {
  id: string;
  name: string;
  seksi: string;
  date: string;
  start_time: string;
  end_time: string;
  keperluan: string;
  status: CarBookingStatus;
  admin_note: string;
  user_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CarBookingInput {
  name: string;
  seksi: string;
  date: string;
  startTime: string;
  endTime: string;
  keperluan: string;
  userId: string;
}

const safeDate = (date: any): string => {
  if (!date) return "";
  if (typeof date === "string") return date.substring(0, 10);
  try { return new Date(date).toISOString().split("T")[0]; }
  catch { return ""; }
};

export const useCarBookings = (user: { id: string; role: string } | null) => {
  const [bookings, setBookings] = useState<CarBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookings = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("car_bookings")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;

      const safe: CarBooking[] = (data || []).map((b) => ({
        id: b.id,
        name: b.name || "",
        seksi: b.seksi || "",
        date: safeDate(b.date),
        start_time: b.start_time || "00:00",
        end_time: b.end_time || "00:00",
        keperluan: b.keperluan || "",
        status: (b.status as CarBookingStatus) || "approved",
        admin_note: b.admin_note || "",
        user_id: b.user_id || null,
        created_at: b.created_at,
        updated_at: b.updated_at,
      }));

      setBookings(safe);
    } catch (err: any) {
      if (!isBackground)
        toast({
          title: "Gagal memuat data mobil",
          description: err.message,
          variant: "destructive",
        });
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { setBookings([]); return; }
    fetchBookings();

    const channel = supabase
      .channel("realtime-car-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "car_bookings" },
        () => fetchBookings(true)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBookings]);

  // ─── Cek apakah mobil sedang dipinjam saat ini ──────────────
  const isCarInUse = useCallback((): boolean => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    return bookings.some((b) => {
      if (b.status !== "approved") return false;
      if (b.date !== todayStr) return false;
      const startTime = b.start_time.slice(0, 5);
      const endTime = b.end_time.slice(0, 5);
      return currentTime >= startTime && currentTime <= endTime;
    });
  }, [bookings]);

  // ─── Get siapa yang sedang pakai mobil ─────────────────────
  const getCurrentBooking = useCallback((): CarBooking | null => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const found = bookings.find((b) => {
      if (b.status !== "approved") return false;
      if (b.date !== todayStr) return false;
      const startTime = b.start_time.slice(0, 5);
      const endTime = b.end_time.slice(0, 5);
      return currentTime >= startTime && currentTime <= endTime;
    });
    return found || null;
  }, [bookings]);

  // ─── Cek bentrok jadwal mobil ───────────────────────────────
  const checkTimeConflict = (
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): boolean => {
    const sTime = startTime.slice(0, 5);
    const eTime = endTime.slice(0, 5);
    return bookings.some((b) => {
      if (b.id === excludeId) return false;
      if (b.status !== "approved") return false;
      if (b.date !== date) return false;
      const bsTime = (b.start_time || "00:00").slice(0, 5);
      const beTime = (b.end_time || "00:00").slice(0, 5);
      return (
        (sTime >= bsTime && sTime < beTime) ||
        (eTime > bsTime && eTime <= beTime) ||
        (sTime <= bsTime && eTime >= beTime)
      );
    });
  };

  // ─── User: Ajukan peminjaman mobil (status awal: pending, menunggu ACC) ───
  const addBooking = async (d: CarBookingInput) => {
    if (!user) return { success: false, error: "Login required" };

    if (checkTimeConflict(d.date, d.startTime, d.endTime)) {
      return {
        success: false,
        error: `GAGAL: Mobil sudah dipinjam pada rentang waktu tersebut di tanggal yang sama!`,
      };
    }

    const { error } = await supabase.from("car_bookings").insert({
      name: d.name,
      seksi: d.seksi,
      date: d.date,
      start_time: d.startTime,
      end_time: d.endTime,
      keperluan: d.keperluan,
      status: "pending", // menunggu ACC admin/Sekdin
      admin_note: "",
      user_id: d.userId,
    });

    if (!error) {
      fetchBookings(true);
      // Kirim notifikasi Telegram pengajuan mobil baru (non-blocking)
      const newBookingRecord: CarBooking = {
        id: `car-${Date.now()}`,
        name: d.name,
        seksi: d.seksi,
        date: d.date,
        start_time: d.startTime,
        end_time: d.endTime,
        keperluan: d.keperluan,
        status: "pending",
        admin_note: "",
        user_id: d.userId,
      };
      sendCarBookingNotification(newBookingRecord).catch((e) => {
        console.warn("Gagal mengirim notifikasi Telegram mobil:", e);
      });
    }
    return { success: !error, error: error?.message };
  };

  // ─── User/Admin: Edit pengajuan ───────────────────────────
  const editBooking = async (
    id: string,
    d: Partial<CarBookingInput>
  ) => {
    if (!user) return { success: false, error: "Login required" };

    const existing = bookings.find((b) => b.id === id);
    if (!existing) return { success: false, error: "Data tidak ditemukan" };

    const isOwner = existing.user_id === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) return { success: false, error: "Tidak memiliki izin" };

    const checkDate = d.date || existing.date;
    const checkStart = d.startTime || existing.start_time;
    const checkEnd = d.endTime || existing.end_time;

    if (checkTimeConflict(checkDate, checkStart, checkEnd, id)) {
      return { success: false, error: "Jadwal bentrok dengan pengajuan lain!" };
    }

    const payload: Record<string, any> = {};
    if (d.name !== undefined) payload.name = d.name;
    if (d.seksi !== undefined) payload.seksi = d.seksi;
    if (d.date !== undefined) payload.date = d.date;
    if (d.startTime !== undefined) payload.start_time = d.startTime;
    if (d.endTime !== undefined) payload.end_time = d.endTime;
    if (d.keperluan !== undefined) payload.keperluan = d.keperluan;

    const { error } = await supabase
      .from("car_bookings")
      .update(payload)
      .eq("id", id);

    if (!error) fetchBookings(true);
    return { success: !error, error: error?.message };
  };

  // ─── Admin: ACC / Tolak pengajuan ─────────────────────────
  const updateBookingStatus = async (
    id: string,
    status: CarBookingStatus,
    adminNote: string = ""
  ) => {
    if (!user) return { success: false, error: "Login required" };
    if (user.role !== "admin")
      return { success: false, error: "Hanya admin yang bisa mengubah status pengajuan" };

    const target = bookings.find((b) => b.id === id);
    if (!target) return { success: false, error: "Data tidak ditemukan" };

    if (
      status === "approved" &&
      checkTimeConflict(target.date, target.start_time, target.end_time, id)
    ) {
      return {
        success: false,
        error: "Bentrok dengan jadwal lain yang sudah disetujui pada tanggal & jam yang sama!",
      };
    }

    const { error } = await supabase
      .from("car_bookings")
      .update({ status, admin_note: adminNote })
      .eq("id", id);

    if (!error) {
      fetchBookings(true);
      // Kirim notifikasi Telegram pembaruan status (non-blocking)
      const updatedBooking: CarBooking = {
        ...target,
        status,
        admin_note: adminNote,
      };
      sendCarBookingStatusNotification(updatedBooking, status, adminNote).catch((e) => {
        console.warn("Gagal mengirim notifikasi Telegram status mobil:", e);
      });
    }
    return { success: !error, error: error?.message };
  };

  // ─── User / Admin: Hapus pengajuan ────────────────────────
  const deleteBooking = async (id: string) => {
    if (!user) return { success: false, error: "Login required" };

    const existing = bookings.find((b) => b.id === id);
    if (!existing) return { success: false, error: "Data tidak ditemukan" };

    const isOwner = existing.user_id === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin)
      return { success: false, error: "Tidak memiliki izin" };

    const { error } = await supabase
      .from("car_bookings")
      .delete()
      .eq("id", id);

    if (!error) fetchBookings(true);
    return { success: !error, error: error?.message };
  };

  const canModify = (booking: CarBooking): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (booking.user_id === user.id) return true;
    return false;
  };

  return {
    bookings,
    isLoading,
    addBooking,
    editBooking,
    updateBookingStatus,
    deleteBooking,
    canModify,
    checkTimeConflict,
    isCarInUse,
    getCurrentBooking,
    refetch: fetchBookings,
  };
};