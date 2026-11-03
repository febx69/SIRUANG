// src/hooks/useAgenda.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

export interface AgendaEntry {
  jam: string
  acara: string
  tempat: string
  keterangan: string
}

export interface AgendaItem {
  id: string
  tanggal: string
  konten: string
  entries: AgendaEntry[]
  pengirim: string
  createdAt: string
}

export const useAgenda = () => {
  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAgendas = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agenda_kepala_dinas')
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAgendas((data || []).map(a => ({
        id:        a.id,
        tanggal:   a.tanggal,
        konten:    a.konten,
        entries:   Array.isArray(a.entries) ? a.entries : (a.entries ? JSON.parse(a.entries) : []),
        pengirim:  a.pengirim || '',
        createdAt: a.created_at,
      })));
    } catch (e: any) {
      if (!isBackground) toast({ title: "Gagal memuat agenda", description: e.message, variant: "destructive" });
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgendas();
    const channel = supabase.channel('realtime-agenda')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_kepala_dinas' }, () => fetchAgendas(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAgendas]);

  const availableDates = [...new Set(agendas.map(a => a.tanggal))].sort((a, b) => b.localeCompare(a));
  const getByDate = (date: string) => agendas.filter(a => a.tanggal === date);

  return { agendas, isLoading, availableDates, getByDate, refetch: fetchAgendas };
};