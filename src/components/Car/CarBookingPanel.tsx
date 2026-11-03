// src/components/Car/CarBookingPanel.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car, Plus, Calendar, Clock, User, Briefcase,
  Trash2, Edit, Send,
  ClipboardList, MapPin, History,
  ChevronDown, ChevronUp, FileSpreadsheet,
  CheckCircle2, XCircle, Search, X,
  AlertTriangle, CalendarDays, ChevronLeft, ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useCarBookings, CarBooking, CarBookingStatus } from "@/hooks/useCarBookings";
import { User as UserType } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const CAR_NAME = "Mobil Dinas Kesehatan Pamekasan";

const seksiOptions = [
  "Subag Umum & Kepegawaian", "Subag Perencanaan", "Subag Keuangan",
  "Seksi Kesga & Gizi", "Seksi Promkes", "Seksi Kesling",
  "Seksi Surveilans", "Seksi P2PM", "Seksi P2PTM",
  "Seksi Yankes Primer", "Seksi Yankes Rujukan", "Seksi Yankes Tradisional",
  "Seksi Farmasi", "Seksi Alkes", "Seksi SDMK"
];

const hours   = Array.from({ length: 15 }, (_, i) => (i + 7).toString().padStart(2, '0'));
const minutes = ["00", "15", "30", "45"];

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const dayHeaders = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const emptyForm = {
  name: '', seksi: '', date: '',
  startHour: '', startMinute: '',
  endHour: '', endMinute: '',
  keperluan: ''
};

interface CarBookingPanelProps {
  user: UserType;
}

const CarBookingPanel = ({ user }: CarBookingPanelProps) => {
  const { bookings, isLoading, addBooking, editBooking, updateBookingStatus, deleteBooking, canModify, isCarInUse, getCurrentBooking } = useCarBookings(user);
  const { toast } = useToast();
  const isAdmin = user.role === 'admin';

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form pengajuan baru
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [form, setForm]                 = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<CarBooking | null>(null);
  const [editForm, setEditForm]         = useState(emptyForm);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Status ACC (admin)
  const [rejectTarget, setRejectTarget] = useState<CarBooking | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Export Excel
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStatuses, setExportStatuses] = useState<CarBookingStatus[]>(['pending']);

  // Search & Filter state
  const [searchQuery, setSearchQuery]   = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'conflict'>('all');
  const [viewMode, setViewMode]         = useState<'list' | 'calendar'>('list');

  // Calendar state
  const [calDate, setCalDate]           = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Status mobil real-time
  const [carStatus, setCarStatus]       = useState<'free' | 'dipinjam'>('free');
  const [currentBooking, setCurrentBooking] = useState<CarBooking | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update status setiap 30 detik + saat bookings berubah
  useEffect(() => {
    const updateStatus = () => {
      setCarStatus(isCarInUse() ? 'dipinjam' : 'free');
      setCurrentBooking(getCurrentBooking());
    };
    updateStatus();
    statusIntervalRef.current = setInterval(updateStatus, 30_000);
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, [bookings, isCarInUse, getCurrentBooking]);

  // Peminjaman minimal H-1
  const getTomorrowStr = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split('T')[0];
  };
  const minBookingDate = getTomorrowStr();

  // ─── Deteksi Bentrok / Jadwal Menumpuk Mobil ───
  const carConflictMap = useMemo(() => {
    const map: Record<string, CarBooking[]> = {};
    const nonRejected = bookings.filter(b => b.status !== 'rejected');

    for (let i = 0; i < nonRejected.length; i++) {
      for (let j = i + 1; j < nonRejected.length; j++) {
        const a = nonRejected[i];
        const b = nonRejected[j];
        if (a.date === b.date) {
          const aStart = a.start_time.slice(0, 5);
          const aEnd   = a.end_time.slice(0, 5);
          const bStart = b.start_time.slice(0, 5);
          const bEnd   = b.end_time.slice(0, 5);

          // Overlap interval check
          if (aStart < bEnd && aEnd > bStart) {
            if (!map[a.id]) map[a.id] = [];
            if (!map[b.id]) map[b.id] = [];
            map[a.id].push(b);
            map[b.id].push(a);
          }
        }
      }
    }
    return map;
  }, [bookings]);

  const totalCarConflicts = useMemo(() => Object.keys(carConflictMap).length, [carConflictMap]);

  // ─── Filter & Search Helpers ───
  const applyFilters = (list: CarBooking[]) => {
    return list.filter(b => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.name.toLowerCase().includes(q) ||
          b.seksi.toLowerCase().includes(q) ||
          b.keperluan.toLowerCase().includes(q) ||
          b.date.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'conflict') {
        if (!carConflictMap[b.id] || carConflictMap[b.id].length === 0) return false;
      } else if (statusFilter !== 'all') {
        if (b.status !== statusFilter) return false;
      }

      return true;
    });
  };

  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
    conflict: totalCarConflicts,
  }), [bookings, totalCarConflicts]);

  const todayBookings = useMemo(() => {
    return applyFilters(bookings.filter(b => b.date === todayStr));
  }, [bookings, todayStr, searchQuery, statusFilter, carConflictMap]);

  const upcomingBookings = useMemo(() => {
    return applyFilters(bookings.filter(b => b.date > todayStr).sort((a, b) => a.date.localeCompare(b.date)));
  }, [bookings, todayStr, searchQuery, statusFilter, carConflictMap]);

  const historyBookings = useMemo(() => {
    return applyFilters(bookings.filter(b => b.date < todayStr).sort((a, b) => b.date.localeCompare(a.date)));
  }, [bookings, todayStr, searchQuery, statusFilter, carConflictMap]);

  const [showHistory, setShowHistory] = useState(false);

  // ─── Form submission ───
  const handleSubmit = async () => {
    if (!form.name || !form.seksi || !form.date ||
        !form.startHour || !form.startMinute ||
        !form.endHour || !form.endMinute || !form.keperluan) {
      toast({ title: "Form tidak lengkap", description: "Semua field wajib diisi.", variant: "destructive" });
      return;
    }
    if (form.date < minBookingDate) {
      toast({ title: "Tanggal tidak valid", description: "Peminjaman minimal H-1. Silakan pilih tanggal besok atau setelahnya.", variant: "destructive" });
      return;
    }
    const startTime = `${form.startHour}:${form.startMinute}:00`;
    const endTime   = `${form.endHour}:${form.endMinute}:00`;
    if (startTime >= endTime) {
      toast({ title: "Waktu tidak valid", description: "Jam mulai harus lebih awal dari jam selesai.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await addBooking({
      name: form.name, seksi: form.seksi, date: form.date,
      startTime, endTime, keperluan: form.keperluan, userId: user.id
    });
    setIsSubmitting(false);
    if (result.success) {
      toast({
        title: "Pengajuan Terkirim!",
        description: "Pengajuan peminjaman mobil dinas berhasil dikirim dan diteruskan ke Telegram pengelola.",
      });
      setIsFormOpen(false); setForm(emptyForm);
    } else {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  const openEdit = (b: CarBooking) => {
    setEditTarget(b);
    setEditForm({
      name: b.name, seksi: b.seksi, date: b.date,
      startHour: b.start_time.slice(0, 2), startMinute: b.start_time.slice(3, 5),
      endHour: b.end_time.slice(0, 2), endMinute: b.end_time.slice(3, 5),
      keperluan: b.keperluan,
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.name || !editForm.seksi || !editForm.date ||
        !editForm.startHour || !editForm.startMinute ||
        !editForm.endHour || !editForm.endMinute || !editForm.keperluan) {
      toast({ title: "Form tidak lengkap", description: "Semua field wajib diisi.", variant: "destructive" });
      return;
    }
    if (editForm.date < minBookingDate) {
      toast({ title: "Tanggal tidak valid", description: "Peminjaman minimal H-1. Silakan pilih tanggal besok atau setelahnya.", variant: "destructive" });
      return;
    }
    const startTime = `${editForm.startHour}:${editForm.startMinute}:00`;
    const endTime   = `${editForm.endHour}:${editForm.endMinute}:00`;
    if (startTime >= endTime) {
      toast({ title: "Waktu tidak valid", description: "Jam mulai harus lebih awal dari jam selesai.", variant: "destructive" });
      return;
    }
    setIsSavingEdit(true);
    const result = await editBooking(editTarget.id, {
      name: editForm.name, seksi: editForm.seksi, date: editForm.date,
      startTime, endTime, keperluan: editForm.keperluan, userId: user.id
    });
    setIsSavingEdit(false);
    if (result.success) {
      toast({ title: "Berhasil", description: "Pengajuan berhasil diperbarui." });
      setIsEditOpen(false); setEditTarget(null);
    } else {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  const formatDate = (d: string) => {
    try {
      const parts = d.split('-');
      if (parts.length === 3) {
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return d; }
  };

  const formatDateShort = (d: string) => {
    try {
      const parts = d.split('-');
      if (parts.length === 3) {
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return d;
    } catch { return d; }
  };

  const getDayName = (d: string) => {
    try {
      const parts = d.split('-');
      if (parts.length === 3) {
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dt.toLocaleDateString('id-ID', { weekday: 'long' });
      }
      return '';
    } catch { return ''; }
  };

  // ─── ACC / Tolak (admin) ───
  const handleApprove = async (b: CarBooking) => {
    const result = await updateBookingStatus(b.id, 'approved', '');
    if (result.success) {
      toast({ title: "Disetujui", description: `Jadwal "${b.name}" telah di-ACC & notifikasi dikirim ke Telegram.` });
    } else {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  const openReject = (b: CarBooking) => {
    setRejectTarget(b);
    setRejectNote('');
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    const result = await updateBookingStatus(rejectTarget.id, 'rejected', rejectNote);
    setIsRejecting(false);
    if (result.success) {
      toast({ title: "Ditolak", description: `Jadwal "${rejectTarget.name}" ditolak & notifikasi dikirim ke Telegram.` });
      setRejectTarget(null);
    } else {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  // ─── Export Excel ───
  const toggleExportStatus = (s: CarBookingStatus) => {
    setExportStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleExportExcel = () => {
    const statusLabel: Record<CarBookingStatus, string> = {
      pending: '',
      approved: 'Disetujui',
      rejected: 'Ditolak',
    };

    const rows = bookings
      .filter(b => b.date >= todayStr && exportStatuses.includes(b.status))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
      .map((b, i) => ({
        "No": i + 1,
        "Nama": b.name,
        "Seksi / Subag": b.seksi,
        "Hari": getDayName(b.date),
        "Tanggal": formatDateShort(b.date),
        "Jam Mulai": b.start_time?.slice(0, 5),
        "Jam Selesai": b.end_time?.slice(0, 5),
        "Keperluan": b.keperluan,
        "ACC": statusLabel[b.status],
      }));

    if (rows.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada jadwal dengan status yang dipilih.", variant: "destructive" });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 4 },  // No
      { wch: 24 }, // Nama
      { wch: 26 }, // Seksi / Subag
      { wch: 12 }, // Hari
      { wch: 16 }, // Tanggal
      { wch: 10 }, // Jam Mulai
      { wch: 12 }, // Jam Selesai
      { wch: 45 }, // Keperluan
      { wch: 12 }, // ACC
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Peminjaman Mobil Dinas");
    XLSX.writeFile(wb, `Peminjaman-Mobil-Dinas-${todayStr}.xlsx`);
    setIsExportOpen(false);
  };

  // ─── Kalender Grid Generator untuk Mobil ───
  const calendarDays = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startDay = (firstDayIndex + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [calDate]);

  const dateCarBookingsMap = useMemo(() => {
    const map: Record<string, CarBooking[]> = {};
    bookings.forEach(b => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [bookings]);

  const selectedDayCarBookings = useMemo(() => {
    return (dateCarBookingsMap[selectedDate] || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [dateCarBookingsMap, selectedDate]);

  const prevMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  const nextMonth = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  const goToToday = () => {
    const now = new Date();
    setCalDate(now);
    setSelectedDate(todayStr);
  };

  // ─── Status Badge ACC ───
  const StatusBadge = ({ status }: { status: CarBookingStatus }) => {
    const map: Record<CarBookingStatus, { label: string; cls: string }> = {
      pending: { label: 'Menunggu ACC', cls: 'bg-amber-100 text-amber-700' },
      approved: { label: 'Disetujui', cls: 'bg-green-100 text-green-700' },
      rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
    };
    const s = map[status] || map.pending;
    return (
      <Badge className={`${s.cls} border-none text-[10px] px-2 py-0.5 rounded-full font-medium`}>
        {s.label}
      </Badge>
    );
  };

  return (
    <Card className="shadow-government border-none bg-white">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Car size={20} /> Peminjaman Mobil Dinas
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Kelola semua peminjaman mobil dinas, cek bentrok jadwal & status ACC'
                : 'Ajukan peminjaman mobil, cek ketersediaan kalender dan riwayat perjalanan'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setExportStatuses(['pending']); setIsExportOpen(true); }}
                className="gap-1.5 border-slate-200 hover:bg-slate-100 text-slate-700 font-medium"
              >
                <FileSpreadsheet size={16} className="text-emerald-600" /> Export Excel
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => { setForm(emptyForm); setIsFormOpen(true); }}
              className="bg-primary hover:bg-primary/90 text-white gap-1.5 shadow-sm"
            >
              <Plus size={16} /> Ajukan Peminjaman
            </Button>
          </div>
        </div>

        {/* ─── TABS / VIEW SWITCHER & CONFLICT ALERT ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList size={13} />
              Daftar Jadwal
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                viewMode === 'list' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
              }`}>
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'calendar'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays size={13} />
              Kalender Mobil
              {totalCarConflicts > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Ada jadwal bentrok!" />
              )}
            </button>
          </div>

          {totalCarConflicts > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertTriangle size={14} className="text-rose-600 shrink-0" />
              <span>
                <strong>{totalCarConflicts} Jadwal Bertabrakan!</strong> Jam peminjaman mobil bentrok di tanggal yang sama.
              </span>
            </div>
          )}
        </div>

        {/* ─── PENCARIAN & STATUS FILTER (Untuk Mode List) ─── */}
        {viewMode === 'list' && (
          <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari peminjam, seksi, keperluan, tanggal..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-slate-50 border-slate-200 rounded-lg focus-visible:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({counts.all})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Disetujui ({counts.approved})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Menunggu ACC ({counts.pending})
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Ditolak ({counts.rejected})
              </button>

              {counts.conflict > 0 && (
                <button
                  onClick={() => setStatusFilter('conflict')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                    statusFilter === 'conflict'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <AlertTriangle size={11} /> Bentrok ({counts.conflict})
                </button>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ======================================================== */}
        {/* ─── STATUS MOBIL REAL-TIME (TETAP TAMPIL DI SEMUA VIEW) ─ */}
        {/* ======================================================== */}
        <div className={`rounded-xl border-2 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
          carStatus === 'dipinjam'
            ? 'bg-rose-50/70 border-rose-200'
            : 'bg-emerald-50/70 border-emerald-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              carStatus === 'dipinjam'
                ? 'bg-rose-100 text-rose-600'
                : 'bg-emerald-100 text-emerald-600'
            }`}>
              <Car size={22} />
            </div>
            <div>
              <p className="font-bold text-[15px] text-slate-800">{CAR_NAME}</p>
              <p className={`text-[13px] font-semibold ${
                carStatus === 'dipinjam' ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {carStatus === 'dipinjam' ? '● Sedang Dipinjam' : '● Free / Tersedia'}
              </p>
              {currentBooking && (
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Oleh: <span className="font-medium text-slate-700">{currentBooking.name}</span> ({currentBooking.seksi})
                  · {currentBooking.start_time?.slice(0,5)} – {currentBooking.end_time?.slice(0,5)} WIB
                </p>
              )}
            </div>
          </div>

          <div className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${
            carStatus === 'dipinjam'
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}>
            {carStatus === 'dipinjam' ? 'DIPINJAM' : 'FREE'}
          </div>
        </div>

        {/* ======================================================== */}
        {/* ─── VIEW 1: DAFTAR JADWAL (HARI INI, MENDATANG, RIWAYAT)  */}
        {/* ======================================================== */}
        {viewMode === 'list' && (
          <>
            {/* ─── JADWAL HARI INI ─── */}
            <div>
              <h3 className="font-semibold text-[14px] text-slate-700 mb-3 flex items-center gap-2">
                <Calendar size={15} className="text-blue-500" />
                Jadwal Hari Ini
                <Badge className="bg-blue-100 text-blue-700 border-none text-[11px] px-2 py-0.5 rounded-full">
                  {todayBookings.length}
                </Badge>
              </h3>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : todayBookings.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Car size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">
                    {searchQuery || statusFilter !== 'all'
                      ? "Tidak ada jadwal hari ini yang cocok dengan filter"
                      : "Belum ada jadwal peminjaman hari ini."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayBookings.map((b) => {
                    const isActive = () => {
                      const now = new Date();
                      const today = now.toISOString().split('T')[0];
                      if (b.date !== today) return false;
                      const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
                      return currentTime >= b.start_time.slice(0,5) && currentTime <= b.end_time.slice(0,5);
                    };
                    const active = isActive();
                    const canEdit = canModify(b);
                    const canDelete = canModify(b);
                    const conflicts = carConflictMap[b.id] || [];
                    const hasConflict = conflicts.length > 0;

                    return (
                      <div key={b.id} className={`rounded-xl border overflow-hidden transition-all ${
                        hasConflict
                          ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-200'
                          : active
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                hasConflict
                                  ? 'bg-rose-100 text-rose-600'
                                  : active
                                  ? 'bg-emerald-100 text-emerald-600'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                <Car size={15} />
                              </div>
                              <div>
                                <p className="font-semibold text-[14px] text-slate-800 flex items-center gap-2 flex-wrap">
                                  {b.name}
                                  <StatusBadge status={b.status} />
                                  {hasConflict && (
                                    <Badge className="bg-rose-600 text-white border-none text-[9px] px-1.5 py-0 rounded-full font-bold animate-pulse">
                                      ⚠️ BENTROK JAM MOBIL
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Briefcase size={10} />{b.seksi}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {active && (
                                <Badge className="bg-emerald-600 text-white border-none text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                                  SEDANG DIPINJAM
                                </Badge>
                              )}
                              {isAdmin && (
                                <>
                                  <Button variant="ghost" size="icon"
                                    className={`h-7 w-7 ${b.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                    onClick={() => handleApprove(b)} title="Setujui / ACC">
                                    <CheckCircle2 size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon"
                                    className={`h-7 w-7 ${b.status === 'rejected' ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                    onClick={() => openReject(b)} title="Tolak">
                                    <XCircle size={14} />
                                  </Button>
                                </>
                              )}
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => openEdit(b)}>
                                  <Edit size={12} />
                                </Button>
                              )}
                              {canDelete && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                                      <Trash2 size={12} />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus jadwal ini?</AlertDialogTitle>
                                      <AlertDialogDescription>Pengajuan "{b.name}" akan dihapus permanen.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction onClick={async () => {
                                        const res = await deleteBooking(b.id);
                                        if (res.success) toast({ title: "Terhapus", description: "Jadwal berhasil dihapus." });
                                        else toast({ title: "Gagal", description: res.error, variant: "destructive" });
                                      }} className="bg-destructive hover:bg-destructive/90">
                                        Ya, Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 text-[12px] text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-blue-500" />
                              {formatDateShort(b.date)}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock size={11} className="text-blue-500" />
                              {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)} WIB
                            </span>
                          </div>

                          {/* Peringatan Bentrok jika ada */}
                          {hasConflict && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                              <p className="font-semibold flex items-center gap-1 text-[11px] text-rose-800">
                                <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                                Bentrok dengan pengajuan mobil berikut:
                              </p>
                              {conflicts.map(c => (
                                <div key={c.id} className="text-[11px] pl-4 text-slate-700 flex items-center gap-1.5">
                                  <span>• <strong>{c.name}</strong> ({c.seksi})</span>
                                  <span className="font-mono text-rose-700">[{c.start_time.slice(0,5)} - {c.end_time.slice(0,5)}]</span>
                                  <span>- "{c.keperluan}"</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="bg-white/80 rounded-lg px-3 py-2 border border-slate-100">
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                              <MapPin size={10} /> Keperluan
                            </p>
                            <p className="text-[13px] text-slate-700 leading-relaxed">{b.keperluan}</p>
                          </div>

                          {b.status === 'rejected' && b.admin_note && (
                            <div className="bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
                              <p className="text-[11px] text-rose-500 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <XCircle size={10} /> Alasan Ditolak
                              </p>
                              <p className="text-[13px] text-rose-700 leading-relaxed">{b.admin_note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── JADWAL MENDATANG ─── */}
            {upcomingBookings.length > 0 && (
              <div>
                <h3 className="font-semibold text-[14px] text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar size={15} className="text-purple-500" />
                  Jadwal Mendatang
                  <Badge className="bg-purple-100 text-purple-700 border-none text-[11px] px-2 py-0.5 rounded-full">
                    {upcomingBookings.length}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {upcomingBookings.map((b) => {
                    const canEdit = canModify(b);
                    const canDelete = canModify(b);
                    const conflicts = carConflictMap[b.id] || [];
                    const hasConflict = conflicts.length > 0;

                    return (
                      <div key={b.id} className={`rounded-xl border overflow-hidden transition-all ${
                        hasConflict
                          ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-200'
                          : 'border-slate-200 bg-slate-50'
                      }`}>
                        <div className="p-3.5 space-y-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                hasConflict ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                              }`}>
                                <Car size={15} />
                              </div>
                              <div>
                                <p className="font-semibold text-[14px] text-slate-800 flex items-center gap-2 flex-wrap">
                                  {b.name}
                                  <StatusBadge status={b.status} />
                                  {hasConflict && (
                                    <Badge className="bg-rose-600 text-white border-none text-[9px] px-1.5 py-0 rounded-full font-bold animate-pulse">
                                      ⚠️ BENTROK JAM MOBIL
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Briefcase size={10} />{b.seksi}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <>
                                  <Button variant="ghost" size="icon"
                                    className={`h-7 w-7 ${b.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                    onClick={() => handleApprove(b)} title="Setujui / ACC">
                                    <CheckCircle2 size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon"
                                    className={`h-7 w-7 ${b.status === 'rejected' ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                    onClick={() => openReject(b)} title="Tolak">
                                    <XCircle size={14} />
                                  </Button>
                                </>
                              )}
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() => openEdit(b)}>
                                  <Edit size={12} />
                                </Button>
                              )}
                              {canDelete && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                                      <Trash2 size={12} />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hapus jadwal ini?</AlertDialogTitle>
                                      <AlertDialogDescription>Pengajuan "{b.name}" akan dihapus permanen.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction onClick={async () => {
                                        const res = await deleteBooking(b.id);
                                        if (res.success) toast({ title: "Terhapus", description: "Jadwal berhasil dihapus." });
                                        else toast({ title: "Gagal", description: res.error, variant: "destructive" });
                                      }} className="bg-destructive hover:bg-destructive/90">
                                        Ya, Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 text-[12px] text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-purple-500" />
                              {formatDateShort(b.date)}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock size={11} className="text-purple-500" />
                              {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)} WIB
                            </span>
                          </div>

                          {/* Detail Bentrok jika ada */}
                          {hasConflict && (
                            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                              <p className="font-semibold flex items-center gap-1 text-[11px] text-rose-800">
                                <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                                Bentrok dengan pengajuan mobil lain:
                              </p>
                              {conflicts.map(c => (
                                <div key={c.id} className="text-[11px] pl-4 text-slate-700 flex items-center gap-1.5">
                                  <span>• <strong>{c.name}</strong> ({c.seksi})</span>
                                  <span className="font-mono text-rose-700">[{c.start_time.slice(0,5)} - {c.end_time.slice(0,5)}]</span>
                                  <span>- "{c.keperluan}"</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="bg-white/80 rounded-lg px-3 py-2 border border-slate-100">
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                              <MapPin size={10} /> Keperluan
                            </p>
                            <p className="text-[13px] text-slate-700 leading-relaxed">{b.keperluan}</p>
                          </div>

                          {b.status === 'rejected' && b.admin_note && (
                            <div className="bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
                              <p className="text-[11px] text-rose-500 font-semibold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                <XCircle size={10} /> Alasan Ditolak
                              </p>
                              <p className="text-[13px] text-rose-700 leading-relaxed">{b.admin_note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── RIWAYAT PEMINJAMAN ─── */}
            {historyBookings.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="w-full flex items-center justify-between text-[14px] font-semibold text-slate-700 mb-3 hover:text-primary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <History size={15} className="text-slate-400" />
                    Riwayat Peminjaman Selesai
                    <Badge className="bg-slate-100 text-slate-600 border-none text-[11px] px-2 py-0.5 rounded-full">
                      {historyBookings.length}
                    </Badge>
                  </span>
                  {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showHistory && (
                  <div className="space-y-2">
                    {historyBookings.map((b) => {
                      const canDelete = canModify(b);
                      return (
                        <div key={b.id} className="rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                          <div className="p-3.5 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                  <Car size={13} className="text-slate-400" />
                                </div>
                                <div>
                                  <p className="font-semibold text-[13px] text-slate-700 flex items-center gap-2 flex-wrap">
                                    {b.name}
                                    <StatusBadge status={b.status} />
                                  </p>
                                  <p className="text-[11px] text-slate-400">{b.seksi}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1 justify-end">
                                    <Calendar size={10} className="text-blue-400" />
                                    {formatDateShort(b.date)}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)} WIB
                                  </p>
                                </div>
                                {canDelete && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50">
                                        <Trash2 size={11} />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Hapus riwayat ini?</AlertDialogTitle>
                                        <AlertDialogDescription>Riwayat peminjaman "{b.name}" akan dihapus permanen.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction onClick={async () => {
                                          const res = await deleteBooking(b.id);
                                          if (res.success) toast({ title: "Terhapus" });
                                          else toast({ title: "Gagal", description: res.error, variant: "destructive" });
                                        }} className="bg-destructive hover:bg-destructive/90">
                                          Ya, Hapus
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                            {b.keperluan && (
                              <p className="text-[12px] text-slate-500 pl-10 italic">{b.keperluan}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* ─── VIEW 2: KALENDER & TIMELINE MOBIL DINAS ───────────── */}
        {/* ======================================================== */}
        {viewMode === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Sisi Kiri: Kalender Grid Mobil (5 cols di desktop) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {monthNames[calDate.getMonth()]} {calDate.getFullYear()}
                    </h3>
                    <p className="text-[11px] text-slate-400">Pilih tanggal untuk melihat timeline mobil</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                      <ChevronLeft size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 text-primary font-medium" onClick={goToToday}>
                      Hari Ini
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 pb-1 border-b border-slate-100">
                  {dayHeaders.map(h => (
                    <div key={h} className={h === 'Min' ? 'text-rose-400' : ''}>{h}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cd, idx) => {
                    const isSelected = cd.dateStr === selectedDate;
                    const isToday = cd.dateStr === todayStr;
                    const dayBookings = dateCarBookingsMap[cd.dateStr] || [];
                    const hasConflict = dayBookings.some(b => carConflictMap[b.id]?.length > 0);
                    const approvedCount = dayBookings.filter(b => b.status === 'approved').length;
                    const pendingCount = dayBookings.filter(b => b.status === 'pending').length;

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(cd.dateStr)}
                        className={`min-h-[46px] p-1 rounded-lg border text-center flex flex-col items-center justify-between transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                            : isToday
                            ? 'border-blue-300 bg-blue-50/50 font-semibold text-blue-900'
                            : cd.isCurrentMonth
                            ? 'border-slate-100 hover:bg-slate-50 text-slate-700'
                            : 'border-transparent text-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <span className={`text-[12px] ${isSelected ? 'text-primary' : ''}`}>
                          {cd.dayNumber}
                        </span>

                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          {hasConflict ? (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Bentrok mobil!" />
                          ) : (
                            <>
                              {approvedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${approvedCount} Disetujui`} />}
                              {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${pendingCount} Menunggu ACC`} />}
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Di-ACC
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Menunggu ACC
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Bentrok Jam
                  </div>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Detail & Timeline Mobil Tanggal Terpilih (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Jadwal Penggunaan Mobil</p>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Calendar size={16} className="text-primary" />
                      {formatDate(selectedDate)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedDayCarBookings.length > 0 ? "secondary" : "outline"} className="text-xs">
                      {selectedDayCarBookings.length > 0 ? `${selectedDayCarBookings.length} Peminjaman` : 'Mobil Bebas (Free)'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setForm({ ...emptyForm, date: selectedDate });
                        setIsFormOpen(true);
                      }}
                      className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                    >
                      <Plus size={13} /> Ajukan di Tanggal Ini
                    </Button>
                  </div>
                </div>

                {/* Timeline Visualizer Mobil (07:00 – 21:00 WIB) */}
                {selectedDayCarBookings.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold flex items-center gap-1 text-slate-700">
                        <Clock size={13} className="text-primary" />
                        Timeline Penggunaan Mobil (07:00 – 21:00 WIB)
                      </span>
                      <span className="text-[11px] text-slate-400">Jam pemakaian mobil dinas</span>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 overflow-x-auto">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono border-b border-slate-200 pb-1 mb-2 min-w-[420px]">
                        <span>07:00</span>
                        <span>09:00</span>
                        <span>12:00</span>
                        <span>15:00</span>
                        <span>18:00</span>
                        <span>21:00</span>
                      </div>

                      <div className="space-y-2 min-w-[420px] py-1">
                        {selectedDayCarBookings.map((b) => {
                          const startH = parseInt(b.start_time.slice(0, 2));
                          const startM = parseInt(b.start_time.slice(3, 5));
                          const endH   = parseInt(b.end_time.slice(0, 2));
                          const endM   = parseInt(b.end_time.slice(3, 5));

                          const startMinutes = Math.max(0, (startH - 7) * 60 + startM);
                          const endMinutes   = Math.min(840, (endH - 7) * 60 + endM); // 14 jam (07 - 21) = 840 menit
                          const duration     = Math.max(25, endMinutes - startMinutes);

                          const leftPct  = Math.min(100, Math.max(0, (startMinutes / 840) * 100));
                          const widthPct = Math.min(100 - leftPct, Math.max(5, (duration / 840) * 100));

                          const hasConflict = carConflictMap[b.id]?.length > 0;
                          const isApproved = b.status === 'approved';

                          return (
                            <div key={b.id} className="relative h-9 bg-slate-200/50 rounded-lg overflow-hidden">
                              <div
                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                className={`absolute top-0.5 bottom-0.5 rounded-md px-2 flex items-center justify-between text-xs font-medium text-white shadow-sm transition-all overflow-hidden ${
                                  hasConflict
                                    ? 'bg-rose-600 ring-2 ring-rose-300'
                                    : isApproved
                                    ? 'bg-emerald-600'
                                    : 'bg-amber-500'
                                }`}
                                title={`${b.name} (${b.seksi}): ${b.keperluan}`}
                              >
                                <span className="truncate text-[11px] font-semibold">{b.name} ({b.seksi})</span>
                                <span className="font-mono text-[10px] opacity-90 shrink-0 ml-1">
                                  {b.start_time.slice(0,5)}-{b.end_time.slice(0,5)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* List Kartu Peminjaman di Tanggal Ini */}
                {selectedDayCarBookings.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    <Car size={36} className="mx-auto text-emerald-400 mb-2" />
                    <p className="text-slate-700 text-sm font-semibold">Mobil Dinas Tersedia Sepanjang Hari!</p>
                    <p className="text-slate-400 text-xs mt-0.5">Belum ada yang memesan mobil dinas pada tanggal ini.</p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setForm({ ...emptyForm, date: selectedDate });
                        setIsFormOpen(true);
                      }}
                      className="mt-3 bg-primary hover:bg-primary/90 text-white text-xs gap-1.5"
                    >
                      <Plus size={14} /> Ajukan Peminjaman Mobil
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {selectedDayCarBookings.map((b) => {
                      const canEdit = canModify(b);
                      const canDelete = canModify(b);
                      const conflicts = carConflictMap[b.id] || [];
                      const hasConflict = conflicts.length > 0;

                      return (
                        <div
                          key={b.id}
                          className={`p-3.5 rounded-xl border bg-white space-y-2.5 transition-all ${
                            hasConflict ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 text-[14px]">{b.name}</span>
                                <StatusBadge status={b.status} />
                                {hasConflict && (
                                  <Badge className="bg-rose-600 text-white border-none text-[9px] px-1.5 py-0 rounded-full font-bold">
                                    ⚠️ Bentrok Jam Mobil
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">{b.seksi}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {isAdmin && (
                                <>
                                  <Button variant="ghost" size="icon"
                                    className={`h-7 w-7 ${b.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600'}`}
                                    onClick={() => handleApprove(b)} title="Setujui / ACC">
                                    <CheckCircle2 size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon"
                                    className={`h-7 w-7 ${b.status === 'rejected' ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600'}`}
                                    onClick={() => openReject(b)} title="Tolak">
                                    <XCircle size={14} />
                                  </Button>
                                </>
                              )}
                              {canEdit && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEdit(b)}>
                                  <Edit size={12} />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500" onClick={async () => {
                                  const res = await deleteBooking(b.id);
                                  if (res.success) toast({ title: "Terhapus" });
                                  else toast({ title: "Gagal", description: res.error, variant: "destructive" });
                                }}>
                                  <Trash2 size={12} />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock size={12} className="text-primary" />
                              {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)} WIB
                            </span>
                          </div>

                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-xs text-slate-700">
                            <p className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Keperluan:</p>
                            <p>{b.keperluan}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* ===== MODAL AJUKAN PEMINJAMAN ===== */}
      <AlertDialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Car size={18} /> Ajukan Peminjaman Mobil Dinas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Semua field wajib diisi. Pengajuan akan berstatus "Menunggu ACC" hingga disetujui admin.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Telegram Notification Notice */}
          <div className="p-3 bg-sky-50/80 border border-sky-200/90 rounded-xl flex items-center gap-3 text-xs text-sky-900">
            <span className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Send size={13} className="-ml-0.5 mt-0.5" />
            </span>
            <div>
              <span className="font-bold text-sky-900">Notifikasi Otomatis ke Telegram</span>
              <p className="text-[11px] text-sky-700 mt-0.5">
                Pengajuan mobil ini akan otomatis diteruskan ke Telegram pengelola & admin secara real-time.
              </p>
            </div>
          </div>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <User size={13} /> Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nama peminjam"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-slate-50 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Briefcase size={13} /> Seksi / Subag <span className="text-red-500">*</span>
                </Label>
                <Select value={form.seksi} onValueChange={v => setForm(p => ({ ...p, seksi: v }))}>
                  <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Pilih seksi" /></SelectTrigger>
                  <SelectContent>
                    {seksiOptions.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs font-semibold">
                <Calendar size={13} /> Tanggal <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.date}
                min={minBookingDate}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Peminjaman minimal H-1 (dipesan untuk besok atau setelahnya).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Clock size={13} /> Jam Mulai <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select value={form.startHour} onValueChange={v => setForm(p => ({ ...p, startHour: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Jam" /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.startMinute} onValueChange={v => setForm(p => ({ ...p, startMinute: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Menit" /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Clock size={13} /> Jam Selesai <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Select value={form.endHour} onValueChange={v => setForm(p => ({ ...p, endHour: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Jam" /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.endMinute} onValueChange={v => setForm(p => ({ ...p, endMinute: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Menit" /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs font-semibold">
                <MapPin size={13} /> Keperluan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Jelaskan keperluan meminjam mobil (tujuan, kegiatan, rute, dll)"
                value={form.keperluan}
                onChange={e => setForm(p => ({ ...p, keperluan: e.target.value }))}
                rows={4}
                className="bg-slate-50 text-xs resize-none"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsFormOpen(false); setForm(emptyForm); }}>Batal</AlertDialogCancel>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white gap-1.5 text-xs">
              {isSubmitting ? "Mengirim..." : <><Send size={13} /> Ajukan</>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== MODAL EDIT PENGAJUAN ===== */}
      <AlertDialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Edit size={18} /> Edit Pengajuan Mobil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ubah detail pengajuan mobil dinas.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold"><User size={13} /> Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="bg-slate-50 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold"><Briefcase size={13} /> Seksi / Subag <span className="text-red-500">*</span></Label>
                <Select value={editForm.seksi} onValueChange={v => setEditForm(p => ({ ...p, seksi: v }))}>
                  <SelectTrigger className="bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{seksiOptions.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold"><Calendar size={13} /> Tanggal <span className="text-red-500">*</span></Label>
              <Input type="date" value={editForm.date} min={minBookingDate} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} className="bg-slate-50 text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold"><Clock size={13} /> Jam Mulai <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Select value={editForm.startHour} onValueChange={v => setEditForm(p => ({ ...p, startHour: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editForm.startMinute} onValueChange={v => setEditForm(p => ({ ...p, startMinute: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold"><Clock size={13} /> Jam Selesai <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Select value={editForm.endHour} onValueChange={v => setEditForm(p => ({ ...p, endHour: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editForm.endMinute} onValueChange={v => setEditForm(p => ({ ...p, endMinute: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold"><MapPin size={13} /> Keperluan <span className="text-red-500">*</span></Label>
              <Textarea value={editForm.keperluan} onChange={e => setEditForm(p => ({ ...p, keperluan: e.target.value }))} rows={4} className="bg-slate-50 text-xs resize-none" />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsEditOpen(false); setEditTarget(null); }}>Batal</AlertDialogCancel>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-primary hover:bg-primary/90 text-white text-xs">
              {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== MODAL TOLAK PENGAJUAN (ADMIN) ===== */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <XCircle size={18} /> Tolak Pengajuan Mobil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Pengajuan "{rejectTarget?.name}" akan ditandai ditolak. Peminjam akan melihat status ini beserta alasannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-semibold">Alasan Penolakan (opsional)</Label>
            <Textarea
              placeholder="Contoh: Mobil dinas sudah dijadwalkan untuk dinas luar kota pimpinan, atau jadwal bertabrakan."
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={3}
              className="bg-slate-50 text-xs resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectTarget(null)}>Batal</AlertDialogCancel>
            <Button onClick={handleConfirmReject} disabled={isRejecting} className="bg-destructive hover:bg-destructive/90 text-white text-xs gap-1.5">
              {isRejecting ? "Menyimpan..." : "Tolak Pengajuan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== MODAL EXPORT EXCEL (ADMIN) ===== */}
      <AlertDialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <FileSpreadsheet size={18} className="text-emerald-600" /> Export Mobil Dinas ke Excel
            </AlertDialogTitle>
            <AlertDialogDescription>
              Pilih status jadwal yang mau dimasukkan ke file Excel (hari ini & mendatang saja).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            {([
              { value: 'pending' as CarBookingStatus, label: 'Menunggu ACC', desc: 'Kolom ACC dikosongkan, siap dicentang manual untuk diajukan' },
              { value: 'approved' as CarBookingStatus, label: 'Disetujui', desc: 'Sudah pernah di-ACC' },
              { value: 'rejected' as CarBookingStatus, label: 'Ditolak', desc: 'Sudah pernah ditolak' },
            ]).map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={exportStatuses.includes(opt.value)}
                  onChange={() => toggleExportStatus(opt.value)}
                  className="h-4 w-4 accent-primary rounded"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{opt.label}</p>
                  <p className="text-[11px] text-slate-400">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={handleExportExcel} disabled={exportStatuses.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
              <FileSpreadsheet size={14} /> Export Sekarang
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CarBookingPanel;