import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BookingData } from "@/components/Booking/BookingForm";
import { User } from "./useSupabaseAuth";
import { toast } from "@/components/ui/use-toast";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export type PeriodOption = {
  year?: number;
  month?: number;
  quarter?: number;
};

const safeDate = (date: any): string => {
  if (!date) return new Date().toISOString().split('T')[0];
  if (typeof date === 'string') return date.substring(0, 10);
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export const useSupabaseBookings = (user: User | null) => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // PARAMETER BARU: isBackground = true bikin loadingnya jalan diam-diam tanpa layar kedip
  const fetchBookings = useCallback(async (isBackground = false) => {
    if (!user) return;
    
    // Cuma nampilin efek loading (skeleton) pas pertama kali buka web
    if (!isBackground) setIsLoading(true); 
    
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      const safeData: BookingData[] = (data || []).map(b => ({
        id: b.id,
        date: safeDate(b.date),
        endDate: b.end_date ? safeDate(b.end_date) : safeDate(b.date),
        name: b.name || "Tanpa Nama",
        seksi: b.seksi || "-", 
        room: b.room || "Ruangan Tidak Diketahui",
        startTime: b.start_time || "00:00",
        endTime: b.end_time || "00:00",
        description: b.description || '',
        createdAt: b.created_at
      }));

      setBookings(safeData);
    } catch (error) {
      console.error('Fetch error:', error);
      if (!isBackground) toast({ title: "Gagal Memuat Data", description: "Cek koneksi internet Anda.", variant: "destructive" });
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }
    fetchBookings();
    
    // Sinkronisasi realtime otomatis jalan di background tanpa layar kedip
    const channel = supabase.channel('realtime-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchBookings(true))
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBookings]);

  const checkTimeConflict = (startDate: string, endDate: string, room: string, startTime: string, endTime: string, excludeId?: string) => {
    const sTime = startTime.slice(0, 5); 
    const eTime = endTime.slice(0, 5);

    return bookings.some(b => {
      if (b.id === excludeId) return false;
      if (b.room !== room) return false;

      const bEndDate = b.endDate || b.date;
      const isDateOverlap = (startDate <= bEndDate) && (endDate >= b.date);
      
      if (isDateOverlap) {
        const bsTime = (b.startTime || "00:00").slice(0, 5);
        const beTime = (b.endTime || "00:00").slice(0, 5);
        return (
          (sTime >= bsTime && sTime < beTime) ||
          (eTime > bsTime && eTime <= beTime) ||
          (sTime <= bsTime && eTime >= beTime)
        );
      }
      return false;
    });
  };

  const addBooking = async (d: any) => {
    if (!user) return { success: false, error: 'Login required' };
    
    const end = d.endDate || d.date;

    if (checkTimeConflict(d.date, end, d.room, d.startTime, d.endTime)) {
        return { success: false, error: `GAGAL: Ruangan ${d.room} sudah dipinjam pada rentang waktu tersebut!` };
    }

    const { error } = await supabase.from('bookings').insert({
        date: d.date,
        end_date: end,
        name: d.name,
        seksi: d.seksi,
        room: d.room,
        start_time: d.startTime,
        end_time: d.endTime,
        description: d.description,
        user_id: user.id
    });

    if (!error) fetchBookings(true); // Sinkronisasi diam-diam

    return { success: !error, error: error?.message };
  };

  const updateBooking = async (id: string, d: any) => {
    if (!user) return { success: false, error: 'Login required' };
    
    const existing = bookings.find(b => b.id === id);
    if (existing) {
        const checkStartD = d.date || existing.date;
        const checkEndD = d.endDate || existing.endDate || checkStartD;
        const checkRoom = d.room || existing.room;
        const checkStartT = d.startTime || existing.startTime;
        const checkEndT = d.endTime || existing.endTime;

        if (checkTimeConflict(checkStartD, checkEndD, checkRoom, checkStartT, checkEndT, id)) {
            return { success: false, error: `GAGAL: Perubahan jadwal Anda bertabrakan dengan jadwal lain yang sudah ada!` };
        }
    }
    
    // FITUR INTERAKTIF: Langsung ubah data di layar sebelum database merespon!
    setBookings(prev => prev.map(b => {
      if (b.id === id) {
        return {
          ...b,
          date: d.date || b.date,
          endDate: d.endDate || d.date || b.endDate,
          name: d.name || b.name,
          seksi: d.seksi || b.seksi,
          room: d.room || b.room,
          startTime: d.startTime || b.startTime,
          endTime: d.endTime || b.endTime,
          description: d.description !== undefined ? d.description : b.description
        };
      }
      return b;
    }));

    const updatePayload: any = {};
    if(d.date) updatePayload.date = d.date;
    if(d.endDate) updatePayload.end_date = d.endDate;
    if(d.name) updatePayload.name = d.name;
    if(d.seksi) updatePayload.seksi = d.seksi; 
    if(d.room) updatePayload.room = d.room;
    if(d.startTime) updatePayload.start_time = d.startTime;
    if(d.endTime) updatePayload.end_time = d.endTime;
    if(d.description !== undefined) updatePayload.description = d.description;

    const { error } = await supabase.from('bookings').update(updatePayload).eq('id', id);
    if (!error) fetchBookings(true); // Sinkronisasi diam-diam

    return { success: !error, error: error?.message };
  };

  const deleteBooking = async (id: string) => {
    // FITUR INTERAKTIF: Langsung hapus dari layar seketika!
    setBookings(prev => prev.filter(b => b.id !== id));

    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) fetchBookings(true); // Sinkronisasi diam-diam

    return { success: !error, error: error?.message };
  };

  const bulkDeleteByPeriod = async (period: PeriodOption) => {
    if (!user || user.role !== 'admin') return { success: false, error: 'Unauthorized' };
    try {
      let query = supabase.from('bookings').delete();
      const y = period.year || new Date().getFullYear();
      const yearStr = y.toString();

      if (period.month) {
        const m = period.month.toString().padStart(2, '0');
        const start = `${yearStr}-${m}-01`;
        const end = `${yearStr}-${m}-31`; 
        query = query.gte('date', start).lte('date', end);
      } 
      else if (period.quarter) {
        const startM = ((period.quarter - 1) * 3) + 1;
        const endM = startM + 2;
        const start = `${yearStr}-${startM.toString().padStart(2, '0')}-01`;
        const end = `${yearStr}-${endM.toString().padStart(2, '0')}-31`;
        query = query.gte('date', start).lte('date', end);
      } 
      else {
        query = query.gte('date', `${yearStr}-01-01`).lte('date', `${yearStr}-12-31`);
      }

      const { error } = await query;
      if (error) throw error;
      
      fetchBookings(true); // Sinkronisasi diam-diam
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const exportToExcel = async (period: PeriodOption) => {
    try {
      if (!bookings.length) return;
      
      const y = period.year || new Date().getFullYear();
      
      const filtered = bookings.filter(b => {
        const bYear = parseInt(b.date.substring(0, 4));
        if (bYear !== y) return false;
        
        if (period.month) {
          const bMonth = parseInt(b.date.substring(5, 7));
          return bMonth === period.month;
        }
        
        if (period.quarter) {
          const bMonth = parseInt(b.date.substring(5, 7));
          const qStart = ((period.quarter - 1) * 3) + 1;
          return bMonth >= qStart && bMonth <= qStart + 2;
        }
        return true;
      });

      if (filtered.length === 0) {
        toast({ title: "Info", description: "Tidak ada data pada periode tersebut." });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Peminjaman');

      worksheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Tgl Mulai', key: 'date', width: 15 },
        { header: 'Tgl Selesai', key: 'endDate', width: 15 },
        { header: 'Nama Peminjam', key: 'name', width: 25 },
        { header: 'Seksi/Subag', key: 'seksi', width: 25 }, 
        { header: 'Ruangan', key: 'room', width: 25 },
        { header: 'Waktu Mulai', key: 'start', width: 15 },
        { header: 'Waktu Selesai', key: 'end', width: 15 },
        { header: 'Keterangan', key: 'desc', width: 40 },
      ];

      filtered.forEach((b, index) => {
        worksheet.addRow({
          no: index + 1,
          date: b.date,
          endDate: b.endDate || b.date,
          name: b.name,
          seksi: b.seksi, 
          room: b.room,
          start: b.startTime,
          end: b.endTime,
          desc: b.description
        });
      });

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12 };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;

      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = { 
            top: { style: 'thin' }, 
            left: { style: 'thin' }, 
            bottom: { style: 'thin' }, 
            right: { style: 'thin' } 
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Rekap_Peminjaman_${y}.xlsx`);

      toast({ title: "Berhasil", description: "Laporan Excel berhasil diunduh." });

    } catch (e) {
      console.error(e);
      toast({ title: "Error Export", description: "Gagal membuat file excel.", variant: "destructive" });
    }
  };

  return {
    bookings, 
    isLoading, 
    addBooking, 
    updateBooking, 
    deleteBooking, 
    bulkDeleteByPeriod, 
    exportToExcel,
    getActiveBookings: () => bookings.filter(b => (b.endDate || b.date) >= new Date().toISOString().split('T')[0]),
    getAllBookings: () => bookings
  };
};