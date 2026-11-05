// src/components/Booking/BookingList.tsx - 2 Kolom (Lantai 1 & 3) Warna Asli SIRUANG
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, Search, Trash2, Edit, Users, Download, Archive, Briefcase } from "lucide-react";
import { BookingData } from "./BookingForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodOption } from "@/hooks/useSupabaseBookings";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/hooks/useSupabaseAuth";

interface BookingListProps {
  bookings: BookingData[];
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onUpdate?: (id: string, data: Partial<BookingData>) => Promise<{ success: boolean; error?: string }>;
  onEdit?: (booking: BookingData) => void;
  onBulkDelete?: (period: PeriodOption) => Promise<{ success: boolean; error?: string }>;
  onExport?: (period: PeriodOption) => void;
  userRole: UserRole;
  currentUserId?: string;
  canModify?: (booking: BookingData) => boolean;
  title: string;
  isLoading?: boolean;
}

const rooms = [
  "Lantai 1 - Aula Mini",
  "Lantai 3 - Aula Bhakti Husada"
];

const hours = Array.from({ length: 15 }, (_, i) => (i + 7).toString().padStart(2, '0'));
const minutes = ["00", "15", "30", "45"];

const seksiOptions = [
  "Subag Umum & Kepegawaian", "Subag Perencanaan", "Subag Keuangan",
  "Seksi Kesga & Gizi", "Seksi Promkes", "Seksi Kesling",
  "Seksi Surveilans", "Seksi P2PM", "Seksi P2PTM",
  "Seksi Yankes Primer", "Seksi Yankes Rujukan", "Seksi Yankes Tradisional",
  "Seksi Farmasi", "Seksi Alkes", "Seksi SDMK"
];

const BookingList = ({
  bookings = [],
  onDelete,
  onUpdate,
  onEdit,
  onBulkDelete,
  onExport,
  userRole,
  currentUserId,
  canModify,
  title,
  isLoading = false
}: BookingListProps) => {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'specific'>('all');
  const [specificDate, setSpecificDate] = useState<string>("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BookingData>>({});
  const [isSaving, setIsSaving] = useState(false);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<string>();
    years.add(currentYear.toString());
    years.add((currentYear - 1).toString());
    bookings.forEach(b => {
      if (b.date) {
        const y = b.date.split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [bookings]);

  const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const formatDateLabel = (dateStr?: string, endDateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const s = new Date(dateStr);
      const startFmt = s.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      if (!endDateStr || endDateStr === dateStr) return startFmt;
      const e = new Date(endDateStr);
      const endFmt = e.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      return `${startFmt} - ${endFmt}`;
    } catch {
      return dateStr;
    }
  };

  const isActiveBooking = (b: BookingData) => {
    try { return new Date(`${b.endDate || b.date}T${b.endTime}`) > new Date(); }
    catch { return false; }
  };

  const userCanModify = (booking: BookingData): boolean => {
    if (canModify) return canModify(booking);
    if (userRole === 'admin') return true;
    const ownerId = booking.userId || (booking as any).user_id;
    if (currentUserId && ownerId && ownerId === currentUserId) return true;
    return false;
  };

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter(b => {
      if (!b) return false;

      // Filter jadwal yang sudah lewat:
      // - Admin: melihat semua jadwal (aktif & arsip lampau seluruh bidang)
      // - Selain Admin (Bidang / User):
      //     * Jadwal aktif (akan datang): tampil untuk semua agar tahu ruangan terpakai
      //     * Jadwal lampau (sudah selesai): HANYA tampil jika milik bidang/akun sendiri
      if (userRole !== 'admin') {
        const active = isActiveBooking(b);
        const ownerId = b.userId || (b as any).user_id;
        const isOwner = Boolean(currentUserId && ownerId && ownerId === currentUserId);
        if (!active && !isOwner) return false;
      }

      const term = searchTerm.toLowerCase();
      const matchesSearch = (b.name || "").toLowerCase().includes(term) ||
        (b.seksi || "").toLowerCase().includes(term) ||
        (b.room || "").toLowerCase().includes(term) ||
        (b.description || "").toLowerCase().includes(term);
      if (!matchesSearch) return false;

      const bStart = b.date || "", bEnd = b.endDate || b.date || "";
      if (dateFilter === 'today') return todayString >= bStart && todayString <= bEnd;
      if (dateFilter === 'tomorrow') return tomorrowString >= bStart && tomorrowString <= bEnd;
      if (dateFilter === 'specific' && specificDate) return specificDate >= bStart && specificDate <= bEnd;
      return true;
    }).sort((a, b) => {
      const dc = (b.date || "").localeCompare(a.date || "");
      return dc !== 0 ? dc : (a.startTime || "").localeCompare(b.startTime || "");
    });
  }, [bookings, searchTerm, dateFilter, specificDate, userRole, currentUserId, todayString, tomorrowString]);

  const bookingsLt1 = useMemo(() => {
    return filteredBookings.filter(b => {
      const r = (b.room || "").toLowerCase();
      return r.includes("lantai 1") || r.includes("mini");
    });
  }, [filteredBookings]);

  const bookingsLt3 = useMemo(() => {
    return filteredBookings.filter(b => {
      const r = (b.room || "").toLowerCase();
      return r.includes("lantai 3") || r.includes("bhakti") || r.includes("husada");
    });
  }, [filteredBookings]);

  const bookingsOther = useMemo(() => {
    return filteredBookings.filter(b => {
      const r = (b.room || "").toLowerCase();
      const isLt1 = r.includes("lantai 1") || r.includes("mini");
      const isLt3 = r.includes("lantai 3") || r.includes("bhakti") || r.includes("husada");
      return !isLt1 && !isLt3;
    });
  }, [filteredBookings]);

  const handleOpenEdit = (b: BookingData) => {
    setEditForm({ id: b.id, date: b.date, endDate: b.endDate || b.date, name: b.name, seksi: b.seksi, room: b.room, startTime: b.startTime, endTime: b.endTime, description: b.description });
    setIsEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.id) return;
    setIsSaving(true);
    const end = editForm.endDate || editForm.date;
    const sTime = (editForm.startTime || "00:00").slice(0, 5);
    const eTime = (editForm.endTime || "00:00").slice(0, 5);

    const isConflict = bookings.some(b => {
      if (b.id === editForm.id) return false;
      if (b.room !== editForm.room) return false;
      const bEndDate = b.endDate || b.date;
      const isDateOverlap = (editForm.date! <= bEndDate) && (end! >= b.date);
      if (isDateOverlap) {
        const bsTime = (b.startTime || "00:00").slice(0, 5);
        const beTime = (b.endTime || "00:00").slice(0, 5);
        return (sTime >= bsTime && sTime < beTime) || (eTime > bsTime && eTime <= beTime) || (sTime <= bsTime && eTime >= beTime);
      }
      return false;
    });

    if (isConflict) {
      toast({ title: "Gagal Menyimpan", description: "Jadwal bertabrakan dengan peminjaman lain di ruangan yang sama!", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    if (onUpdate) {
      const res = await onUpdate(editForm.id, {
        date: editForm.date,
        endDate: end,
        name: editForm.name,
        seksi: editForm.seksi,
        room: editForm.room,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        description: editForm.description
      });
      setIsSaving(false);
      if (!res.success) {
        toast({ title: "Gagal Update", description: res.error || "Gagal memperbarui jadwal", variant: "destructive" });
      } else {
        toast({ title: "Berhasil", description: "Jadwal berhasil diperbarui." });
        setIsEditOpen(false);
        if (onEdit) onEdit(editForm as BookingData);
      }
      return;
    }

    const { error } = await supabase.from('bookings').update({
      date: editForm.date, end_date: end, name: editForm.name, seksi: editForm.seksi,
      room: editForm.room, start_time: editForm.startTime, end_time: editForm.endTime,
      description: editForm.description
    }).eq('id', editForm.id);

    setIsSaving(false);
    if (error) { toast({ title: "Gagal Update", description: error.message, variant: "destructive" }); }
    else {
      toast({ title: "Berhasil", description: "Jadwal berhasil diperbarui." });
      setIsEditOpen(false);
      if (onEdit) onEdit(editForm as BookingData);
    }
  };

  const handleBulkDelete = async () => {
    if (typeof onBulkDelete !== 'function') return;
    const result = await onBulkDelete({ year: parseInt(selectedYear), month: selectedMonth === "all" ? undefined : parseInt(selectedMonth), quarter: selectedQuarter === "all" ? undefined : parseInt(selectedQuarter) });
    if (result?.success) toast({ title: "Berhasil", description: "Data massal berhasil dihapus" });
    else toast({ title: "Gagal", description: result?.error, variant: "destructive" });
  };

  const handleExport = () => {
    if (typeof onExport !== 'function') return;
    onExport({ year: parseInt(selectedYear), month: selectedMonth === "all" ? undefined : parseInt(selectedMonth), quarter: selectedQuarter === "all" ? undefined : parseInt(selectedQuarter) });
  };

  const handleSingleDelete = async (id: string, name: string) => {
    if (!onDelete) return;
    const res = await onDelete(id);
    if (res.success) toast({ title: "Terhapus", description: `Jadwal ${name} dihapus` });
    else toast({ title: "Gagal", description: res.error, variant: "destructive" });
  };

  const getRoomColor = (room: string) => {
    const r = (room || "").toLowerCase();
    if (r.includes('mini')) return 'bg-blue-100 text-blue-800';
    if (r.includes('bhakti')) return 'bg-purple-100 text-purple-800 border-none';
    return 'bg-gray-100 text-gray-800';
  };

  const isAdminOrBidang = userRole === 'admin' || userRole === 'bidang';

  const renderBookingCard = (booking: BookingData, indexKey: string | number) => {
    const active = isActiveBooking(booking);
    const ownerId = booking.userId || (booking as any).user_id;
    const isOwner = Boolean(currentUserId && ownerId && ownerId === currentUserId);
    const canEdit = userCanModify(booking);

    return (
      <div key={booking.id || indexKey} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 justify-between flex-wrap">
            <h3 className="font-bold text-[15px] text-slate-800 leading-snug">{booking.name}</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isOwner && userRole !== 'admin' && (
                <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  Milik Anda
                </Badge>
              )}
              <Badge className={`${active ? 'bg-[#0f172a] hover:bg-[#1e293b]' : 'bg-gray-500 hover:bg-gray-600'} text-white border-none rounded-full px-2.5 py-0.5 text-xs font-medium`}>
                {active ? "Akan Datang" : "Selesai"}
              </Badge>
            </div>
          </div>

          {booking.seksi && booking.seksi !== "-" && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 w-fit">
              <Briefcase size={10} /> {booking.seksi}
            </span>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span className="font-medium text-slate-700">{formatDateLabel(booking.date, booking.endDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400 shrink-0" />
              <span>{booking.startTime?.slice(0, 5)} s/d {booking.endTime?.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <Badge variant="secondary" className={`${getRoomColor(booking.room)} font-normal rounded-full px-2.5`}>
                {booking.room}
              </Badge>
            </div>
          </div>

          {booking.description && (
            <div className="mt-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-md p-2.5 text-[13px] text-slate-600 flex items-start gap-2">
              <Edit size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="break-words">{booking.description}</span>
            </div>
          )}
        </div>

        {/* Tombol Edit/Hapus - tampil hanya jika punya izin */}
        {canEdit && (
          <div className="bg-slate-50/70 px-4 py-2.5 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(booking)} className="h-8 text-xs text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900">
              <Edit size={13} className="mr-1.5" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 border-slate-200 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={13} className="mr-1.5" /> Hapus
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Jadwal {booking.name}?</AlertDialogTitle>
                  <AlertDialogDescription>Tindakan ini akan menghapus jadwal secara permanen.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleSingleDelete(booking.id, booking.name)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="shadow-government border-none bg-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2 text-primary">
                <Users size={20} /><span>{title}</span>
              </CardTitle>
              <CardDescription>Total: {filteredBookings.length} jadwal peminjaman</CardDescription>
            </div>

            {userRole === 'admin' && (
              <div className="flex flex-wrap gap-2">
                {/* Hapus Massal */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Archive size={16} className="mr-2" /> Hapus Data Lama
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Hapus Data Massal</AlertDialogTitle><AlertDialogDescription>Data yang dihapus tidak bisa dikembalikan.</AlertDialogDescription></AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                      {[
                        { label: "Tahun", val: selectedYear, onChange: setSelectedYear, options: availableYears.map(y => ({ value: y, label: y })) },
                        { label: "Bulan", val: selectedMonth, onChange: (v: string) => { setSelectedMonth(v); if (v !== "all") setSelectedQuarter("all"); }, options: [{ value: "all", label: "Semua Bulan" }, ...["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => ({ value: (i + 1).toString(), label: m }))] },
                        { label: "Triwulan", val: selectedQuarter, onChange: (v: string) => { setSelectedQuarter(v); if (v !== "all") setSelectedMonth("all"); }, options: [{ value: "all", label: "Semua Triwulan" }, { value: "1", label: "Triwulan 1 (Jan-Mar)" }, { value: "2", label: "Triwulan 2 (Apr-Jun)" }, { value: "3", label: "Triwulan 3 (Jul-Sep)" }, { value: "4", label: "Triwulan 4 (Okt-Des)" }] },
                      ].map(({ label, val, onChange, options }) => (
                        <div key={label} className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">{label}</Label>
                          <Select value={val} onValueChange={onChange}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Hapus Sekarang</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Export */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground">
                      <Download size={16} className="mr-2" /> Export Excel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Export Laporan</AlertDialogTitle><AlertDialogDescription>Unduh rekap peminjaman dalam format Excel.</AlertDialogDescription></AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                      {[
                        { label: "Tahun", val: selectedYear, onChange: setSelectedYear, options: availableYears.map(y => ({ value: y, label: y })) },
                        { label: "Bulan", val: selectedMonth, onChange: (v: string) => { setSelectedMonth(v); if (v !== "all") setSelectedQuarter("all"); }, options: [{ value: "all", label: "Semua Bulan" }, ...["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => ({ value: (i + 1).toString(), label: m }))] },
                        { label: "Triwulan", val: selectedQuarter, onChange: (v: string) => { setSelectedQuarter(v); if (v !== "all") setSelectedMonth("all"); }, options: [{ value: "all", label: "Semua Triwulan" }, { value: "1", label: "Triwulan 1 (Jan-Mar)" }, { value: "2", label: "Triwulan 2 (Apr-Jun)" }, { value: "3", label: "Triwulan 3 (Jul-Sep)" }, { value: "4", label: "Triwulan 4 (Okt-Des)" }] },
                      ].map(({ label, val, onChange, options }) => (
                        <div key={label} className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">{label}</Label>
                          <Select value={val} onValueChange={onChange}>
                            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                            <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleExport}>Download Excel</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full xl:w-1/3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari nama, seksi, ruangan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 bg-white border-slate-200" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'all', label: 'Semua Jadwal' },
                { key: 'today', label: 'Hari Ini' },
                { key: 'tomorrow', label: 'Besok' },
              ].map(({ key, label }) => (
                <Button key={key} variant={dateFilter === key ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter(key as any); setSpecificDate(""); }} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-100">
                  {label}
                </Button>
              ))}
              <Input type="date" value={specificDate} onChange={e => { setSpecificDate(e.target.value); setDateFilter(e.target.value ? 'specific' : 'all'); }} className={`h-9 px-3 text-sm bg-white border-slate-200 ${dateFilter === 'specific' ? 'border-blue-500 ring-1 ring-blue-500' : ''}`} />
            </div>
          </div>

          {/* List Jadwal: 2 Kolom (Lantai 1 vs Lantai 3) */}
          <div>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-700">Tidak ada jadwal ditemukan</h3>
                <p className="text-slate-500 mt-1">Coba sesuaikan filter pencarian atau tanggal Anda.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Kolom Kiri: Lantai 1 - Aula Mini */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 border-l-4 border-l-blue-600 shadow-sm">
                      <div>
                        <h4 className="font-bold text-slate-800 text-[15px] leading-tight">Lantai 1 - Aula Mini</h4>
                        <p className="text-xs text-slate-500">Ruang Rapat Lantai 1</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 rounded-full font-semibold text-xs px-2.5">
                        {bookingsLt1.length} Jadwal
                      </Badge>
                    </div>

                    {bookingsLt1.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-4">
                        <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">Tidak ada jadwal di Lantai 1</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ruang Aula Mini kosong untuk filter ini</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bookingsLt1.map((b, i) => renderBookingCard(b, `lt1-${b.id || i}`))}
                      </div>
                    )}
                  </div>

                  {/* Kolom Kanan: Lantai 3 - Aula Bhakti Husada */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 border-l-4 border-l-purple-600 shadow-sm">
                      <div>
                        <h4 className="font-bold text-slate-800 text-[15px] leading-tight">Lantai 3 - Aula Bhakti Husada</h4>
                        <p className="text-xs text-slate-500">Aula Utama Lantai 3</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border border-purple-200 rounded-full font-semibold text-xs px-2.5">
                        {bookingsLt3.length} Jadwal
                      </Badge>
                    </div>

                    {bookingsLt3.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-4">
                        <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">Tidak ada jadwal di Lantai 3</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ruang Aula Bhakti Husada kosong untuk filter ini</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bookingsLt3.map((b, i) => renderBookingCard(b, `lt3-${b.id || i}`))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ruangan Lainnya (jika ada) */}
                {bookingsOther.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl p-3.5">
                      <div>
                        <h4 className="font-bold text-slate-800 text-[15px]">Ruangan Lainnya</h4>
                        <p className="text-xs text-slate-500">Jadwal ruangan lainnya</p>
                      </div>
                      <Badge variant="outline">{bookingsOther.length} Jadwal</Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {bookingsOther.map((b, i) => renderBookingCard(b, `other-${b.id || i}`))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== MODAL EDIT INLINE (ADMIN & BIDANG) ===== */}
      <AlertDialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-primary flex items-center gap-2"><Edit size={20} /> Edit Jadwal Peminjaman</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="flex items-center gap-1"><Calendar size={14} /> Tanggal Mulai</Label><Input type="date" value={editForm.date || ""} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="focus-visible-ring" /></div>
              <div className="space-y-2"><Label className="flex items-center gap-1"><Calendar size={14} /> Tanggal Selesai</Label><Input type="date" value={editForm.endDate || ""} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} className="focus-visible-ring" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nama Peminjam</Label><Input value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="focus-visible-ring" /></div>
              <div className="space-y-2"><Label>Seksi / Subag</Label>
                <Select value={editForm.seksi || ""} onValueChange={v => setEditForm({ ...editForm, seksi: v })}>
                  <SelectTrigger className="focus-visible-ring"><SelectValue /></SelectTrigger>
                  <SelectContent>{seksiOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Ruangan</Label>
              <Select value={editForm.room || ""} onValueChange={v => setEditForm({ ...editForm, room: v })}>
                <SelectTrigger className="focus-visible-ring"><SelectValue /></SelectTrigger>
                <SelectContent>{rooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Jam Mulai</Label>
                <div className="flex gap-2">
                  <Select value={editForm.startTime?.split(':')[0] || ""} onValueChange={v => setEditForm({ ...editForm, startTime: `${v}:${editForm.startTime?.split(':')[1] || '00'}:00` })}>
                    <SelectTrigger className="focus-visible-ring"><SelectValue /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editForm.startTime?.split(':')[1] || ""} onValueChange={v => setEditForm({ ...editForm, startTime: `${editForm.startTime?.split(':')[0] || '07'}:${v}:00` })}>
                    <SelectTrigger className="focus-visible-ring"><SelectValue /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Jam Selesai</Label>
                <div className="flex gap-2">
                  <Select value={editForm.endTime?.split(':')[0] || ""} onValueChange={v => setEditForm({ ...editForm, endTime: `${v}:${editForm.endTime?.split(':')[1] || '00'}:00` })}>
                    <SelectTrigger className="focus-visible-ring"><SelectValue /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editForm.endTime?.split(':')[1] || ""} onValueChange={v => setEditForm({ ...editForm, endTime: `${editForm.endTime?.split(':')[0] || '08'}:${v}:00` })}>
                    <SelectTrigger className="focus-visible-ring"><SelectValue /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2"><Label>Keterangan</Label><Textarea value={editForm.description || ""} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="focus-visible-ring resize-none" /></div>
          </div>
          <AlertDialogFooter className="border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={saveEdit} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BookingList;