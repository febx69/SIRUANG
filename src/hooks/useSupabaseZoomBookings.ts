// src/hooks/useSupabaseZoomBookings.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "./useSupabaseAuth";
import { toast } from "@/components/ui/use-toast";

export type ZoomBookingStatus = "pending" | "approved" | "rejected";

export interface ZoomBookingData {
  id: string;
  name: string;
  seksi: string;
  event_title: string;
  date: string;
  start_time: string;
  end_time: string;
  description: string;
  status: ZoomBookingStatus;
  zoom_link: string;
  admin_note: string;
  user_id: string | null;
  created_at?: string;
}

export const useSupabaseZoomBookings = (user: User | null) => {
  const [zoomBookings, setZoomBookings] = useState<ZoomBookingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchZoomBookings = useCallback(
    async (isBackground = false) => {
      if (!user) return;
      if (!isBackground) setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("zoom_bookings")
          .select("*")
          .order("date", { ascending: true });

        if (error) throw error;

        const safe: ZoomBookingData[] = (data || []).map((b) => ({
          id: b.id,
          name: b.name || "",
          seksi: b.seksi || "",
          event_title: b.event_title || "",
          date: b.date?.substring(0, 10) || "",
          start_time: b.start_time || "00:00",
          end_time: b.end_time || "00:00",
          description: b.description || "",
          status: (b.status as ZoomBookingStatus) || "pending",
          zoom_link: b.zoom_link || "",
          admin_note: b.admin_note || "",
          user_id: b.user_id || null,
          created_at: b.created_at,
        }));

        setZoomBookings(safe);
      } catch (err: any) {
        if (!isBackground)
          toast({
            title: "Gagal memuat data Zoom",
            description: err.message,
            variant: "destructive",
          });
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setZoomBookings([]);
      return;
    }
    fetchZoomBookings();

    const channel = supabase
      .channel("realtime-zoom-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "zoom_bookings" },
        () => fetchZoomBookings(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchZoomBookings]);

  // ─── User: Ajukan peminjaman zoom ────────────────────────────
  const addZoomBooking = async (
    d: Omit<ZoomBookingData, "id" | "status" | "zoom_link" | "admin_note" | "created_at">
  ) => {
    if (!user) return { success: false, error: "Login required" };

    const { error } = await supabase.from("zoom_bookings").insert({
      name: d.name,
      seksi: d.seksi,
      event_title: d.event_title,
      date: d.date,
      start_time: d.start_time,
      end_time: d.end_time,
      description: d.description,
      status: "pending",
      zoom_link: "",
      admin_note: "",
      user_id: user.id,
    });

    if (!error) fetchZoomBookings(true);
    return { success: !error, error: error?.message };
  };

  // ─── Admin: Balas dengan link zoom ───────────────────────────
  const respondToZoomBooking = async (
    id: string,
    status: ZoomBookingStatus,
    zoom_link: string,
    admin_note: string
  ) => {
    if (!user || user.role !== "admin")
      return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("zoom_bookings")
      .update({
        status,
        zoom_link,
        admin_note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      fetchZoomBookings(true);
      toast({
        title: status === "approved" ? "Permohonan Disetujui" : "Permohonan Ditolak",
        description:
          status === "approved"
            ? "Link Zoom berhasil dikirimkan."
            : "Permohonan telah ditolak.",
      });
    }
    return { success: !error, error: error?.message };
  };

  // ─── User / Admin: Hapus pengajuan ───────────────────────────
  const deleteZoomBooking = async (id: string) => {
    if (!user) return { success: false, error: "Login required" };

    const existing = zoomBookings.find((b) => b.id === id);
    if (!existing) return { success: false, error: "Data tidak ditemukan" };

    const isOwner = existing.user_id === user.id;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin)
      return { success: false, error: "Tidak memiliki izin" };

    const { error } = await supabase
      .from("zoom_bookings")
      .delete()
      .eq("id", id);

    if (!error) fetchZoomBookings(true);
    return { success: !error, error: error?.message };
  };

  const canModifyZoom = (booking: ZoomBookingData): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (
      (user.role === "bidang" || user.role === "user") &&
      booking.user_id === user.id
    )
      return true;
    return false;
  };

  return {
    zoomBookings,
    isLoading,
    addZoomBooking,
    respondToZoomBooking,
    deleteZoomBooking,
    canModifyZoom,
    refetch: fetchZoomBookings,
  };
};