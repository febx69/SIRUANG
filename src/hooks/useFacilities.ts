    // src/hooks/useFacilities.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

export interface FacilityItem {
  icon: string;
  label: string;
  value: string;
}

export interface Facility {
  id: string;
  room_name: string;
  capacity_min: number;
  capacity_max: number;
  items: FacilityItem[];
  created_at?: string;
  updated_at?: string;
}

export const useFacilities = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFacilities = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setFacilities(data || []);
    } catch (e: any) {
      toast({ title: "Gagal memuat fasilitas", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
  fetchFacilities();

  // Realtime subscription - otomatis update tanpa refresh
  const channel = supabase.channel('realtime-facilities')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => {
      fetchFacilities();
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
  }, [fetchFacilities]);

  const addFacility = async (payload: Omit<Facility, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('facilities').insert({
      room_name: payload.room_name,
      capacity_min: payload.capacity_min,
      capacity_max: payload.capacity_max,
      items: payload.items,
    });
    if (error) { toast({ title: "Gagal tambah fasilitas", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Berhasil", description: "Fasilitas berhasil ditambahkan." });
    fetchFacilities();
    return true;
  };

  const updateFacility = async (id: string, payload: Partial<Omit<Facility, 'id' | 'created_at'>>) => {
    const { error } = await supabase.from('facilities').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast({ title: "Gagal update fasilitas", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Berhasil", description: "Fasilitas berhasil diperbarui." });
    fetchFacilities();
    return true;
  };

  const deleteFacility = async (id: string) => {
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) { toast({ title: "Gagal hapus fasilitas", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Terhapus", description: "Fasilitas berhasil dihapus." });
    fetchFacilities();
    return true;
  };

  return { facilities, isLoading, addFacility, updateFacility, deleteFacility, refetch: fetchFacilities };
};