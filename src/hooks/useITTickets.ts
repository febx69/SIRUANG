// src/hooks/useITTickets.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "./useSupabaseAuth";
import { toast } from "@/components/ui/use-toast";
import { sendITTicketNotification, sendITTicketStatusNotification } from "@/lib/telegram";

export type TicketCategory = 'hardware' | 'software';
export type TicketStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ITTicket {
  id: string;
  ticket_number: string;
  category: TicketCategory;
  penanggung_jawab: string;
  unit_name: string;
  bidang: string;
  description: string;
  status: TicketStatus;
  handler_name?: string | null;
  handler_notes?: string | null;
  completed_at?: string | null;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

const STORAGE_KEY = 'siruang_it_tickets_cache';

// Helper untuk membersihkan data dummy/seed lama agar tidak pernah muncul lagi
const purgeDemoSeed = (list: ITTicket[]): ITTicket[] => {
  return list.filter(
    (t) =>
      !t.id.startsWith('tkt-seed-') &&
      !['IT-202609-001', 'IT-202609-002', 'IT-202609-003'].includes(t.ticket_number)
  );
};

const getLocalTickets = (): ITTicket[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: ITTicket[] = JSON.parse(raw);
    const cleaned = purgeDemoSeed(parsed);
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
};

const saveLocalTickets = (tickets: ITTicket[]) => {
  try {
    const cleaned = purgeDemoSeed(tickets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch (e) {
    console.error("Failed saving IT tickets to localStorage", e);
  }
};

export const useITTickets = (user: User | null) => {
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTickets = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('it_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Supabase it_tickets query failed, using local storage fallback", error.message);
        const local = getLocalTickets();
        setTickets(local);
      } else if (data) {
        const cleaned = purgeDemoSeed(data as ITTicket[]);
        setTickets(cleaned);
        saveLocalTickets(cleaned);
      } else {
        setTickets([]);
        saveLocalTickets([]);
      }
    } catch (e: any) {
      console.warn("fetchTickets exception, using cache:", e);
      const local = getLocalTickets();
      setTickets(local);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();

    // Realtime subscription — auto-sync saat ada perubahan di database
    const channel = supabase
      .channel("realtime-it-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "it_tickets" },
        () => fetchTickets(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  // Create new ticket
  const createTicket = async (params: {
    category: TicketCategory;
    penanggung_jawab: string;
    unit_name: string;
    bidang: string;
    description: string;
    created_at?: string;
  }): Promise<{ success: boolean; error?: string; ticket?: ITTicket }> => {
    if (!user) return { success: false, error: "Silakan login terlebih dahulu." };

    const createdAt = params.created_at || new Date().toISOString();
    const ticketDate = new Date(createdAt);
    const validDate = isNaN(ticketDate.getTime()) ? new Date() : ticketDate;

    const yearMonth = `${validDate.getFullYear()}${(validDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const ticketNumber = `IT-${yearMonth}-${randomSuffix}`;

    const newTicket: ITTicket = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tkt-${Date.now()}`,
      ticket_number: ticketNumber,
      category: params.category,
      penanggung_jawab: params.penanggung_jawab.trim(),
      unit_name: params.unit_name.trim(),
      bidang: params.bidang.trim(),
      description: params.description.trim(),
      status: 'pending',
      user_id: user.id,
      created_at: isNaN(ticketDate.getTime()) ? new Date().toISOString() : createdAt,
    };

    try {
      // Attempt supabase insert
      const { data, error } = await supabase.from('it_tickets').insert([newTicket]).select().single();

      if (error) {
        toast({
          title: "Gagal Membuat Tiket",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      const savedTicket = (data as ITTicket) || newTicket;
      const updated = [savedTicket, ...tickets.filter(t => t.id !== savedTicket.id)].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTickets(updated);
      saveLocalTickets(updated);

      toast({
        title: "Tiket Berhasil Dibuat",
        description: `Nomor Tiket: ${savedTicket.ticket_number} untuk penanggung jawab ${savedTicket.penanggung_jawab}`,
      });

      // Trigger Telegram notification (non-blocking)
      sendITTicketNotification(savedTicket).catch((e) => {
        console.warn("Gagal mengirim notifikasi Telegram tiket baru:", e);
      });

      return { success: true, ticket: savedTicket };
    } catch (err: any) {
      toast({
        title: "Gagal Membuat Tiket",
        description: `Koneksi ke database gagal: ${err.message}. Silakan coba lagi.`,
        variant: "destructive",
      });
      return { success: false, error: err.message };
    }
  };

  // Update ticket status & handler notes (for Admin/IT Staff)
  const updateTicketStatus = async (
    id: string,
    status: TicketStatus,
    handlerNotes?: string,
    handlerName?: string,
    createdAt?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const isCompleted = status === 'completed';
    const effectiveHandler = handlerName || (user?.username ? user.username : 'Admin IT');
    const patch: Partial<ITTicket> = {
      status,
      handler_notes: handlerNotes !== undefined ? handlerNotes : undefined,
      handler_name: effectiveHandler,
      completed_at: isCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      ...(createdAt ? { created_at: createdAt } : {}),
    };

    try {
      const { error } = await supabase.from('it_tickets').update(patch).eq('id', id);
      if (error) {
        toast({ title: "Gagal Memperbarui Status", description: error.message, variant: "destructive" });
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      toast({ title: "Gagal Memperbarui Status", description: `Koneksi gagal: ${e.message}`, variant: "destructive" });
      return { success: false, error: e.message };
    }

    const currentTicket = tickets.find(t => t.id === id);
    const updated = tickets
      .map(t => (t.id === id ? { ...t, ...patch } : t))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTickets(updated);
    saveLocalTickets(updated);

    // Trigger Telegram status update notification (non-blocking)
    if (currentTicket) {
      const mergedTicket: ITTicket = { ...currentTicket, ...patch };
      sendITTicketStatusNotification(mergedTicket, status, handlerNotes, effectiveHandler).catch((e) => {
        console.warn("Gagal mengirim notifikasi status ke Telegram:", e);
      });
    }

    const statusLabel =
      status === 'completed' ? 'Selesai' : status === 'in_progress' ? 'Sedang Dikerjakan' : status === 'pending' ? 'Menunggu' : 'Dibatalkan';

    toast({
      title: "Status Tiket Diperbarui",
      description: `Tiket diubah menjadi: ${statusLabel}`,
    });

    return { success: true };
  };

  // Delete single ticket (Admin only)
  const deleteTicket = async (id: string): Promise<{ success: boolean }> => {
    try {
      const { error } = await supabase.from('it_tickets').delete().eq('id', id);
      if (error) {
        toast({ title: "Gagal Menghapus Tiket", description: error.message, variant: "destructive" });
        return { success: false };
      }
    } catch (e: any) {
      toast({ title: "Gagal Menghapus Tiket", description: `Koneksi gagal: ${e.message}`, variant: "destructive" });
      return { success: false };
    }

    const updated = tickets.filter(t => t.id !== id);
    setTickets(updated);
    saveLocalTickets(updated);

    toast({
      title: "Tiket Dihapus",
      description: "Data tiket telah dihapus dari sistem.",
    });

    return { success: true };
  };

  // Clear all tickets (Admin only)
  const clearAllTickets = async (): Promise<{ success: boolean }> => {
    try {
      const { error } = await supabase.from('it_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        toast({ title: "Gagal Membersihkan", description: error.message, variant: "destructive" });
        return { success: false };
      }
    } catch (e: any) {
      toast({ title: "Gagal Membersihkan", description: `Koneksi gagal: ${e.message}`, variant: "destructive" });
      return { success: false };
    }

    setTickets([]);
    saveLocalTickets([]);

    toast({
      title: "Antrean Dibersihkan",
      description: "Seluruh data tiket telah dihapus.",
    });

    return { success: true };
  };

  // Recap statistics for Admin
  const recapStats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'pending').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const completed = tickets.filter(t => t.status === 'completed').length;
    const cancelled = tickets.filter(t => t.status === 'cancelled').length;

    const hardwareCount = tickets.filter(t => t.category === 'hardware').length;
    const softwareCount = tickets.filter(t => t.category === 'software').length;

    // Group by bidang
    const bidangCount: Record<string, number> = {};
    // Group by unit_name
    const unitCount: Record<string, number> = {};
    // Group by penanggung_jawab
    const personCount: Record<string, number> = {};

    tickets.forEach(t => {
      const b = t.bidang || "Lainnya";
      bidangCount[b] = (bidangCount[b] || 0) + 1;

      const u = t.unit_name || "Tidak Disebutkan";
      unitCount[u] = (unitCount[u] || 0) + 1;

      const p = t.penanggung_jawab || "Tidak Disebutkan";
      personCount[p] = (personCount[p] || 0) + 1;
    });

    const topBidang = Object.entries(bidangCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const topUnits = Object.entries(unitCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topPersons = Object.entries(personCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      hardwareCount,
      softwareCount,
      topBidang,
      topUnits,
      topPersons,
    };
  }, [tickets]);

  return {
    tickets,
    isLoading,
    fetchTickets,
    createTicket,
    updateTicketStatus,
    updateTicket: updateTicketStatus,
    deleteTicket,
    clearAllTickets,
    recapStats,
  };
};
