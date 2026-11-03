// src/hooks/useCleanliness.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "./useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";

export interface CleanlinessReport {
  id: string;
  date: string;
  time: string;
  inspector_name: string;
  floor: 'Lantai 1' | 'Lantai 2' | 'Lantai 3' | string;
  description: string;
  photos: string[];
  user_id: string;
  created_at: string;
}

export interface CleanlinessComplaint {
  id: string;
  date: string;
  time: string;
  reporter_name: string;
  bidang: string;
  floor: 'Lantai 1' | 'Lantai 2' | 'Lantai 3' | string;
  description: string;
  photos: string[];
  status: 'pending' | 'in_progress' | 'resolved';
  handler_name?: string;
  handler_notes?: string;
  resolution_photos?: string[];
  resolved_at?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useCleanliness = (user: User | null) => {
  const [reports, setReports] = useState<CleanlinessReport[]>([]);
  const [complaints, setComplaints] = useState<CleanlinessComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  // Fetch Laporan Harian
  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cleanliness_reports')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) throw error;
      setReports((data || []).map(r => ({
        ...r,
        description: r.description || '',
        photos: Array.isArray(r.photos) ? r.photos : [],
      })));
    } catch (err) {
      console.warn("Gagal memuat cleanliness_reports:", err);
    }
  }, []);

  // Fetch Pengaduan
  const fetchComplaints = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cleanliness_complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints((data || []).map(c => ({
        ...c,
        photos: Array.isArray(c.photos) ? c.photos : [],
        resolution_photos: Array.isArray(c.resolution_photos) ? c.resolution_photos : [],
      })));
    } catch (err) {
      console.warn("Gagal memuat cleanliness_complaints:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchReports(), fetchComplaints()]);
    setIsLoading(false);
  }, [fetchReports, fetchComplaints]);

  useEffect(() => {
    if (!user) return;
    refreshAll();

    // Realtime channel
    const channel = supabase.channel('realtime-cleanliness')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanliness_reports' }, () => fetchReports())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleanliness_complaints' }, () => fetchComplaints())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshAll, fetchReports, fetchComplaints]);

  /**
   * Helper upload foto dengan kompresi otomatis & fallback ke DataURL
   */
  const processAndUploadPhotos = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const rawFile of files) {
      try {
        // Kompresi di browser (max 1200px, WebP/JPEG ~70-90KB)
        const compressed = await compressImage(rawFile, 1200, 1200, 0.78);
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const filePath = `monev/${fileName}`;

        // Coba upload ke Supabase Storage bucket 'cleanliness-photos'
        const { error: uploadError } = await supabase.storage
          .from('cleanliness-photos')
          .upload(filePath, compressed.file, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('cleanliness-photos')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            uploadedUrls.push(publicUrlData.publicUrl);
            continue;
          }
        }

        // Fallback jika bucket storage belum dibuat di Supabase:
        // Gunakan Base64 dataURL yang sudah terkompresi hemat
        uploadedUrls.push(compressed.dataUrl);
      } catch (err) {
        console.error("Gagal memproses foto:", err);
      }
    }

    return uploadedUrls;
  };

  /**
   * Tambah Laporan Harian OB
   */
  const addReport = async (payload: {
    inspector_name: string;
    floor: string;
    description: string;
    files: File[];
  }): Promise<boolean> => {
    if (!user) return false;
    try {
      const now = new Date();
      const date = getTodayStr();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Upload & kompresi foto (maksimal 10 foto)
      const photoUrls = await processAndUploadPhotos(payload.files.slice(0, 10));

      const { error } = await supabase.from('cleanliness_reports').insert({
        date,
        time,
        inspector_name: payload.inspector_name.trim(),
        floor: payload.floor,
        description: payload.description.trim(),
        photos: photoUrls,
        user_id: user.id
      });

      if (error) throw error;
      toast({
        title: "Laporan Berhasil Terkirim",
        description: `Laporan kebersihan untuk ${payload.floor} telah disimpan.`
      });
      await fetchReports();
      return true;
    } catch (err: any) {
      toast({
        title: "Gagal Mengirim Laporan",
        description: err.message || "Periksa koneksi internet Anda.",
        variant: "destructive"
      });
      return false;
    }
  };

  /**
   * Tambah Pengaduan Pegawai
   */
  const addComplaint = async (payload: {
    reporter_name: string;
    bidang: string;
    floor: string;
    description: string;
    files: File[];
  }): Promise<boolean> => {
    if (!user) return false;
    try {
      const now = new Date();
      const date = getTodayStr();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const photoUrls = await processAndUploadPhotos(payload.files.slice(0, 10));

      const { error } = await supabase.from('cleanliness_complaints').insert({
        date,
        time,
        reporter_name: payload.reporter_name.trim(),
        bidang: payload.bidang.trim(),
        floor: payload.floor,
        description: payload.description.trim(),
        photos: photoUrls,
        status: 'pending',
        user_id: user.id
      });

      if (error) throw error;
      toast({
        title: "Pengaduan Terkirim",
        description: "Pengaduan kebersihan berhasil dikirimkan ke petugas OB."
      });
      await fetchComplaints();
      return true;
    } catch (err: any) {
      toast({
        title: "Gagal Mengirim Pengaduan",
        description: err.message || "Terjadi kesalahan sistem.",
        variant: "destructive"
      });
      return false;
    }
  };

  /**
   * Perbarui Status Pengaduan (oleh OB atau Admin)
   */
  const updateComplaintStatus = async (
    complaintId: string,
    payload: {
      status: 'pending' | 'in_progress' | 'resolved';
      handler_name?: string;
      handler_notes?: string;
      files?: File[];
    }
  ): Promise<boolean> => {
    try {
      let resolutionPhotos: string[] = [];
      if (payload.files && payload.files.length > 0) {
        resolutionPhotos = await processAndUploadPhotos(payload.files.slice(0, 5));
      }

      const updateData: any = {
        status: payload.status,
        updated_at: new Date().toISOString()
      };

      if (payload.handler_name) updateData.handler_name = payload.handler_name;
      if (payload.handler_notes !== undefined) updateData.handler_notes = payload.handler_notes;
      if (resolutionPhotos.length > 0) updateData.resolution_photos = resolutionPhotos;
      if (payload.status === 'resolved') updateData.resolved_at = new Date().toISOString();

      const { error } = await supabase
        .from('cleanliness_complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;
      toast({
        title: "Status Diperbarui",
        description: `Pengaduan berhasil ditandai sebagai: ${
          payload.status === 'resolved' ? 'Selesai' :
          payload.status === 'in_progress' ? 'Sedang Dikerjakan' : 'Menunggu'
        }`
      });
      await fetchComplaints();
      return true;
    } catch (err: any) {
      toast({
        title: "Gagal Memperbarui Status",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  };

  /**
   * Hapus Laporan Harian
   */
  const deleteReport = async (reportId: string, photoUrls: string[] = []): Promise<boolean> => {
    try {
      // Hapus file dari Supabase Storage jika ada
      const pathsToDelete = photoUrls
        .filter(url => url.includes('cleanliness-photos/monev/'))
        .map(url => {
          const parts = url.split('cleanliness-photos/');
          return parts[1] || '';
        })
        .filter(Boolean);

      if (pathsToDelete.length > 0) {
        await supabase.storage.from('cleanliness-photos').remove(pathsToDelete);
      }

      const { error } = await supabase.from('cleanliness_reports').delete().eq('id', reportId);
      if (error) throw error;

      toast({ title: "Laporan Dihapus", description: "Data laporan kebersihan telah dihapus." });
      await fetchReports();
      return true;
    } catch (err: any) {
      toast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
      return false;
    }
  };

  /**
   * Hapus Pengaduan
   */
  const deleteComplaint = async (complaintId: string, photoUrls: string[] = []): Promise<boolean> => {
    try {
      const pathsToDelete = photoUrls
        .filter(url => url.includes('cleanliness-photos/monev/'))
        .map(url => {
          const parts = url.split('cleanliness-photos/');
          return parts[1] || '';
        })
        .filter(Boolean);

      if (pathsToDelete.length > 0) {
        await supabase.storage.from('cleanliness-photos').remove(pathsToDelete);
      }

      const { error } = await supabase.from('cleanliness_complaints').delete().eq('id', complaintId);
      if (error) throw error;

      toast({ title: "Pengaduan Dihapus", description: "Data pengaduan telah dihapus." });
      await fetchComplaints();
      return true;
    } catch (err: any) {
      toast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
      return false;
    }
  };

  /**
   * Bersihkan data periode tertentu (Khusus Admin setelah Export Excel)
   */
  const bulkCleanByPeriod = async (year: number, month: number): Promise<boolean> => {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

      // 1. Ambil foto-foto yang akan dibersihkan
      const { data: oldReports } = await supabase
        .from('cleanliness_reports')
        .select('photos')
        .gte('date', startDate)
        .lt('date', endDate);

      const { data: oldComplaints } = await supabase
        .from('cleanliness_complaints')
        .select('photos, resolution_photos')
        .gte('date', startDate)
        .lt('date', endDate);

      // Kumpulkan file storage path
      const allUrls: string[] = [];
      (oldReports || []).forEach(r => {
        if (Array.isArray(r.photos)) allUrls.push(...r.photos);
      });
      (oldComplaints || []).forEach(c => {
        if (Array.isArray(c.photos)) allUrls.push(...c.photos);
        if (Array.isArray(c.resolution_photos)) allUrls.push(...c.resolution_photos);
      });

      const pathsToDelete = allUrls
        .filter(url => url.includes('cleanliness-photos/monev/'))
        .map(url => url.split('cleanliness-photos/')[1])
        .filter(Boolean);

      if (pathsToDelete.length > 0) {
        await supabase.storage.from('cleanliness-photos').remove(pathsToDelete);
      }

      // 2. Hapus baris database
      await supabase
        .from('cleanliness_reports')
        .delete()
        .gte('date', startDate)
        .lt('date', endDate);

      await supabase
        .from('cleanliness_complaints')
        .delete()
        .gte('date', startDate)
        .lt('date', endDate);

      toast({
        title: "Pembersihan Selesai",
        description: `Seluruh data & foto periode ${month}/${year} berhasil dihapus dari Supabase.`
      });

      await refreshAll();
      return true;
    } catch (err: any) {
      toast({
        title: "Gagal Membersihkan Data",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  };

  // Indikator status kebersihan hari ini
  const todayStr = getTodayStr();
  const todayReports = reports.filter(r => r.date === todayStr);
  const floorStatusToday = {
    'Lantai 1': todayReports.some(r => r.floor === 'Lantai 1'),
    'Lantai 2': todayReports.some(r => r.floor === 'Lantai 2'),
    'Lantai 3': todayReports.some(r => r.floor === 'Lantai 3'),
  };

  return {
    reports,
    complaints,
    isLoading,
    refreshAll,
    addReport,
    addComplaint,
    updateComplaintStatus,
    deleteReport,
    deleteComplaint,
    bulkCleanByPeriod,
    floorStatusToday,
    todayReportsCount: todayReports.length,
    pendingComplaintsCount: complaints.filter(c => c.status !== 'resolved').length
  };
};
