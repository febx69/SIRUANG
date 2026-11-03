// src/components/Zoom/ZoomBookingPanel.tsx
import { useState, useMemo } from "react";
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
  Video, Plus, Calendar, Clock, User, Briefcase,
  Link, MessageSquare, CheckCircle, XCircle, Trash2,
  Send, ClipboardList, Copy, Edit, Loader2, Wand2,
  Search, X, FileSpreadsheet, ChevronLeft, ChevronRight,
  AlertTriangle, CalendarDays, ListFilter, Check
} from "lucide-react";
import { useZoomBookings, ZoomBooking } from "@/hooks/useZoomBookings";
import { User as UserType } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const EDGE_FUNCTION_URL = "https://kgufceeudnsrgfamzeuj.supabase.co/functions/v1/zoom-generate";

const seksiOptions = [
  "Subag Umum & Kepegawaian","Subag Perencanaan","Subag Keuangan",
  "Seksi Kesga & Gizi","Seksi Promkes","Seksi Kesling",
  "Seksi Surveilans","Seksi P2PM","Seksi P2PTM",
  "Seksi Yankes Primer","Seksi Yankes Rujukan","Seksi Yankes Tradisional",
  "Seksi Farmasi","Seksi Alkes","Seksi SDMK"
];

const hours   = Array.from({ length: 15 }, (_, i) => (i + 7).toString().padStart(2, '0'));
const minutes = ["00", "15", "30", "45"];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: 'Menunggu',  color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  rejected: { label: 'Ditolak',   color: 'bg-red-100 text-red-700 border-red-200',       icon: XCircle },
};

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const dayHeaders = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

interface ZoomBookingPanelProps { user: UserType; }

const emptyForm = { name: '', seksi: '', acara: '', date: '', startHour: '', startMinute: '', endHour: '', endMinute: '' };

const ZoomBookingPanel = ({ user }: ZoomBookingPanelProps) => {
  const { zoomBookings, isLoading, addZoomBooking, editZoomBooking, replyZoomBooking, deleteZoomBooking } = useZoomBookings(user);
  const { toast } = useToast();
  const isAdmin = user.role === 'admin';

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form pengajuan baru
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [form, setForm]                 = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<ZoomBooking | null>(null);
  const [editForm, setEditForm]         = useState({ acara: '', date: '', startHour: '', startMinute: '', endHour: '', endMinute: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Reply state (admin)
  const [replyTarget, setReplyTarget]         = useState<string | null>(null);
  const [replyTargetData, setReplyTargetData] = useState<ZoomBooking | null>(null);
  const [replyForm, setReplyForm]             = useState({ status: 'approved' as 'approved' | 'rejected', zoomDetail: '', adminNote: '' });
  const [isReplying, setIsReplying]           = useState(false);
  const [isGenerating, setIsGenerating]       = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery]         = useState("");
  const [statusFilter, setStatusFilter]       = useState<'all' | 'pending' | 'approved' | 'rejected' | 'conflict'>('all');
  const [activeTab, setActiveTab]             = useState<'upcoming' | 'past' | 'calendar'>('upcoming');

  // Calendar View state
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Export Excel state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStatuses, setExportStatuses] = useState<string[]>(['approved', 'pending']);
  const [exportScope, setExportScope] = useState<'all' | 'upcoming' | 'month'>('upcoming');

  // ─── Deteksi Jadwal Menumpuk / Bentrok (Conflict Detection) ───
  const conflictMap = useMemo(() => {
    const map: Record<string, ZoomBooking[]> = {};
    const nonRejected = zoomBookings.filter(z => z.status !== 'rejected');

    for (let i = 0; i < nonRejected.length; i++) {
      for (let j = i + 1; j < nonRejected.length; j++) {
        const a = nonRejected[i];
        const b = nonRejected[j];
        if (a.date === b.date) {
          const aStart = a.startTime.slice(0, 5);
          const aEnd   = a.endTime.slice(0, 5);
          const bStart = b.startTime.slice(0, 5);
          const bEnd   = b.endTime.slice(0, 5);

          // Overlap check
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
  }, [zoomBookings]);

  const totalConflicts = useMemo(() => Object.keys(conflictMap).length, [conflictMap]);

  // ─── Filter & Search Logic ───
  const filteredBookings = useMemo(() => {
    return zoomBookings.filter(z => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          z.acara.toLowerCase().includes(q) ||
          z.name.toLowerCase().includes(q) ||
          (z.seksi && z.seksi.toLowerCase().includes(q)) ||
          (z.zoomLink && z.zoomLink.toLowerCase().includes(q)) ||
          (z.adminNote && z.adminNote.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'conflict') {
        if (!conflictMap[z.id] || conflictMap[z.id].length === 0) return false;
      } else if (statusFilter !== 'all') {
        if (z.status !== statusFilter) return false;
      }

      // 3. Tab Scope (Akan Datang vs Riwayat)
      if (activeTab === 'upcoming') {
        return z.date >= todayStr;
      } else if (activeTab === 'past') {
        return z.date < todayStr;
      }

      return true;
    }).sort((a, b) => {
      if (activeTab === 'past') {
        const dc = b.date.localeCompare(a.date);
        return dc !== 0 ? dc : b.startTime.localeCompare(a.startTime);
      } else {
        const dc = a.date.localeCompare(b.date);
        return dc !== 0 ? dc : a.startTime.localeCompare(b.startTime);
      }
    });
  }, [zoomBookings, searchQuery, statusFilter, activeTab, conflictMap, todayStr]);

  // Counter status untuk badge
  const counts = useMemo(() => {
    const list = zoomBookings.filter(z => {
      if (activeTab === 'upcoming') return z.date >= todayStr;
      if (activeTab === 'past') return z.date < todayStr;
      return true;
    });
    return {
      all: list.length,
      pending: list.filter(z => z.status === 'pending').length,
      approved: list.filter(z => z.status === 'approved').length,
      rejected: list.filter(z => z.status === 'rejected').length,
      conflict: list.filter(z => conflictMap[z.id]?.length > 0).length,
    };
  }, [zoomBookings, activeTab, todayStr, conflictMap]);

  // ─── Submit Form Baru ───
  const handleSubmit = async () => {
    if (!form.name || !form.acara || !form.date || !form.startHour || !form.startMinute || !form.endHour || !form.endMinute) {
      toast({ title: "Form tidak lengkap", description: "Mohon isi semua field yang diperlukan", variant: "destructive" });
      return;
    }
    const startTime = `${form.startHour}:${form.startMinute}:00`;
    const endTime   = `${form.endHour}:${form.endMinute}:00`;
    if (startTime >= endTime) {
      toast({ title: "Waktu tidak valid", description: "Jam mulai harus lebih awal dari jam selesai", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await addZoomBooking({ name: form.name, seksi: form.seksi, acara: form.acara, date: form.date, startTime, endTime, userId: user.id });
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Berhasil!", description: "Pengajuan Zoom berhasil dikirim. Tunggu balasan dari Admin." });
      setIsFormOpen(false); setForm(emptyForm);
    } else {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  const openEdit = (z: ZoomBooking) => {
    setEditTarget(z);
    setEditForm({
      acara:       z.acara,
      date:        z.date,
      startHour:   z.startTime.slice(0, 2),
      startMinute: z.startTime.slice(3, 5),
      endHour:     z.endTime.slice(0, 2),
      endMinute:   z.endTime.slice(3, 5),
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.acara || !editForm.date || !editForm.startHour || !editForm.startMinute || !editForm.endHour || !editForm.endMinute) {
      toast({ title: "Form tidak lengkap", variant: "destructive" });
      return;
    }
    const startTime = `${editForm.startHour}:${editForm.startMinute}:00`;
    const endTime   = `${editForm.endHour}:${editForm.endMinute}:00`;
    if (startTime >= endTime) {
      toast({ title: "Waktu tidak valid", description: "Jam mulai harus lebih awal dari jam selesai", variant: "destructive" });
      return;
    }
    setIsSavingEdit(true);
    const result = await editZoomBooking(editTarget.id, { acara: editForm.acara, date: editForm.date, startTime, endTime });
    setIsSavingEdit(false);
    if (result.success) {
      toast({ title: "Berhasil", description: "Pengajuan berhasil diperbarui." });
      setIsEditOpen(false); setEditTarget(null);
    } else {
      toast({ title: "Gagal", description: result.error, variant: "destructive" });
    }
  };

  const openReply = (z: ZoomBooking) => {
    setReplyTarget(z.id); setReplyTargetData(z);
    const note = z.adminNote || '';
    setReplyForm({ status: z.status === 'rejected' ? 'rejected' : 'approved', zoomDetail: z.status !== 'rejected' ? note : '', adminNote: z.status === 'rejected' ? note : '' });
  };

  const handleAutoGenerate = async () => {
    if (!replyTargetData) return;
    setIsGenerating(true);
    toast({ title: "Membuat meeting Zoom...", description: "Mohon tunggu sebentar" });
    try {
      const res  = await fetch(EDGE_FUNCTION_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: replyTargetData.acara, date: replyTargetData.date, startTime: replyTargetData.startTime, endTime: replyTargetData.endTime }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal generate Zoom");
      const detail = data.detail || [`Join Zoom Meeting: ${data.join_url}`, data.meeting_id ? `Meeting ID: ${data.meeting_id}` : "", data.password ? `Passcode: ${data.password}` : ""].filter(Boolean).join("\n");
      setReplyForm(p => ({ ...p, zoomDetail: detail }));
      toast({ title: "Berhasil!", description: "Link Zoom berhasil dibuat otomatis" });
    } catch (err: any) {
      toast({ title: "Gagal generate Zoom", description: err.message, variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const handleReply = async () => {
    if (!replyTarget) return;
    if (replyForm.status === 'approved' && !replyForm.zoomDetail.trim()) {
      toast({ title: "Detail Zoom wajib diisi", variant: "destructive" }); return;
    }
    setIsReplying(true);
    const formattedNote = replyForm.status === 'approved' ? replyForm.zoomDetail.trim() : replyForm.adminNote;
    const linkOnly = replyForm.zoomDetail.split('\n').find(l => l.trim().startsWith('https://zoom.us/j/'))?.trim() || replyForm.zoomDetail.match(/https:\/\/zoom\.us\/j\/\S+/)?.[0] || '';
    const result = await replyZoomBooking(replyTarget, linkOnly, formattedNote, replyForm.status);
    setIsReplying(false);
    if (result.success) {
      toast({ title: "Berhasil", description: "Balasan berhasil disimpan." });
      setReplyTarget(null); setReplyTargetData(null);
      setReplyForm({ status: 'approved', zoomDetail: '', adminNote: '' });
    } else { toast({ title: "Gagal", description: result.error, variant: "destructive" }); }
  };

  const formatDate = (d: string) => {
    try {
      const parts = d.split('-');
      if (parts.length === 3) {
        const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    catch { return d; }
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

  // ─── Export Excel Logic (Admin) ───
  const toggleExportStatus = (s: string) => {
    setExportStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleExportExcel = () => {
    const statusLabel: Record<string, string> = {
      pending: 'Menunggu ACC',
      approved: 'Disetujui',
      rejected: 'Ditolak',
    };

    const targetList = zoomBookings.filter(z => {
      if (exportScope === 'upcoming' && z.date < todayStr) return false;
      if (exportScope === 'month') {
        const currentYM = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}`;
        if (!z.date.startsWith(currentYM)) return false;
      }
      return exportStatuses.includes(z.status);
    }).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    if (targetList.length === 0) {
      toast({ title: "Tidak ada data", description: "Tidak ada data peminjaman Zoom sesuai filter yang dipilih.", variant: "destructive" });
      return;
    }

    const rows = targetList.map((z, idx) => ({
      "No": idx + 1,
      "Nama Pemohon": z.name,
      "Seksi / Subag": z.seksi || '-',
      "Acara / Kegiatan": z.acara,
      "Hari": getDayName(z.date),
      "Tanggal": formatDateShort(z.date),
      "Jam Mulai": z.startTime?.slice(0, 5),
      "Jam Selesai": z.endTime?.slice(0, 5),
      "Status": statusLabel[z.status] || z.status,
      "Link Zoom": z.zoomLink || '',
      "Catatan Admin": z.adminNote || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 24 },  // Nama Pemohon
      { wch: 26 },  // Seksi
      { wch: 35 },  // Acara
      { wch: 12 },  // Hari
      { wch: 16 },  // Tanggal
      { wch: 10 },  // Jam Mulai
      { wch: 12 },  // Jam Selesai
      { wch: 15 },  // Status
      { wch: 38 },  // Link Zoom
      { wch: 45 },  // Catatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Peminjaman Zoom");
    XLSX.writeFile(wb, `Peminjaman-Zoom-DINKES-${todayStr}.xlsx`);
    setIsExportOpen(false);
    toast({ title: "Berhasil Export", description: `${rows.length} jadwal peminjaman Zoom berhasil diunduh.` });
  };

  // ─── Kalender Grid Generator ───
  const calendarDays = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();

    // Hari pertama bulan ini (0 = Minggu, 1 = Senin, dst.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Konversi ke Senin = 0, Minggu = 6
    const startDay = (firstDayIndex + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding awal dari bulan sebelumnya
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    // Hari-hari bulan ini
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: true });
    }

    // Padding akhir untuk melengkapi baris 7 kolom
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
    }

    return days;
  }, [calDate]);

  // Map tanggal ke jadwal Zoom untuk marker kalender
  const dateBookingsMap = useMemo(() => {
    const map: Record<string, ZoomBooking[]> = {};
    zoomBookings.forEach(z => {
      if (!map[z.date]) map[z.date] = [];
      map[z.date].push(z);
    });
    return map;
  }, [zoomBookings]);

  // Booking pada tanggal yang dipilih di kalender
  const selectedDayBookings = useMemo(() => {
    return (dateBookingsMap[selectedDate] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [dateBookingsMap, selectedDate]);

  // Navigasi bulan kalender
  const prevMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    const now = new Date();
    setCalDate(now);
    setSelectedDate(todayStr);
  };

  return (
    <Card className="shadow-government border-none bg-white">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Video size={20} /> Peminjaman Zoom Meeting
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'Kelola pengajuan, cek jadwal bertabrakan, kalender dan ekspor Excel' : 'Ajukan dan pantau ketersediaan akun Zoom meeting Dinas'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExportOpen(true)}
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
              <Plus size={16} /> Ajukan Zoom
            </Button>
          </div>
        </div>

        {/* ─── TABS & VIEW SWITCHER ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 mt-2">
          {/* Main Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'upcoming'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock size={13} />
              Akan Datang
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'upcoming' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
              }`}>
                {zoomBookings.filter(z => z.date >= todayStr).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays size={13} />
              Kalender & Timeline
              {totalConflicts > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Ada jadwal menumpuk" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('past')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'past'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList size={13} />
              Riwayat Selesai
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'past' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600'
              }`}>
                {zoomBookings.filter(z => z.date < todayStr).length}
              </span>
            </button>
          </div>

          {/* Quick conflict banner if any */}
          {totalConflicts > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span>
                <strong>{totalConflicts} Jadwal Menumpuk!</strong> Waktu meeting bertabrakan pada tanggal yang sama.
              </span>
            </div>
          )}
        </div>

        {/* ─── PENCARIAN & STATUS FILTER (Untuk Tab List) ─── */}
        {activeTab !== 'calendar' && (
          <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari acara, pemohon, seksi, catatan..."
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
                Menunggu ({counts.pending})
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
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                  }`}
                >
                  <AlertTriangle size={11} /> Bentrok ({counts.conflict})
                </button>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ======================================================== */}
        {/* ─── VIEW 1 & 2: LIST (AKAN DATANG & RIWAYAT SELESAI) ─── */}
        {/* ======================================================== */}
        {activeTab !== 'calendar' && (
          <>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium text-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? "Tidak ada jadwal Zoom yang cocok dengan filter atau pencarian Anda"
                    : activeTab === 'upcoming'
                    ? "Belum ada jadwal Zoom mendatang"
                    : "Belum ada riwayat Zoom yang telah lewat"}
                </p>
                {(searchQuery || statusFilter !== 'all') && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => { setSearchQuery(""); setStatusFilter('all'); }}
                    className="text-primary mt-1 text-xs"
                  >
                    Reset Filter & Pencarian
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map(z => {
                  const sc = statusConfig[z.status] || statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const isOwner   = !!z.userId && z.userId === user.id;
                  const canEdit   = user.role === 'admin' || isOwner;
                  const canDelete = user.role === 'admin' || isOwner;
                  const canReply  = user.role === 'admin';
                  const conflicts = conflictMap[z.id] || [];
                  const hasConflict = conflicts.length > 0;

                  return (
                    <div
                      key={z.id}
                      className={`border rounded-xl overflow-hidden bg-white transition-all shadow-sm ${
                        hasConflict
                          ? 'border-amber-300 ring-1 ring-amber-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-4 space-y-3">
                        {/* Header card: Acara, Pemohon, Status */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-800 text-[15px] leading-snug">{z.acara}</p>
                              {hasConflict && (
                                <Badge className="bg-amber-500 text-white border-none text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold animate-pulse">
                                  <AlertTriangle size={11} />
                                  Jadwal Bentrok ({conflicts.length} meeting lain)
                                </Badge>
                              )}
                            </div>
                            <p className="text-[12px] text-slate-400">
                              Diajukan oleh: <span className="font-medium text-slate-700">{z.name}</span>
                              {z.seksi && z.seksi !== '-' && <span className="ml-1 text-slate-500">· {z.seksi}</span>}
                            </p>
                          </div>
                          <Badge className={`${sc.color} border text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0`}>
                            <StatusIcon size={11} /> {sc.label}
                          </Badge>
                        </div>

                        {/* Waktu & Tanggal */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-primary" />
                            <span className="font-semibold text-slate-700">{formatDate(z.date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-primary" />
                            <span className="font-semibold">{z.startTime?.slice(0,5)} s/d {z.endTime?.slice(0,5)} WIB</span>
                          </div>
                        </div>

                        {/* Detail Jadwal Bentrok jika ada */}
                        {hasConflict && (
                          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                            <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                              <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                              Perhatian: Jam bertabrakan dengan meeting berikut:
                            </p>
                            <div className="pl-5 space-y-1 text-[11px]">
                              {conflicts.map((c) => (
                                <div key={c.id} className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span className="font-medium text-slate-800">{c.acara}</span>
                                  <span className="text-slate-500">({c.seksi})</span>
                                  <span className="font-mono text-amber-700">[{c.startTime.slice(0,5)} - {c.endTime.slice(0,5)}]</span>
                                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-white border border-amber-300 text-amber-700">
                                    {c.status === 'approved' ? 'Disetujui' : 'Menunggu'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Link Zoom jika disetujui */}
                        {z.status === 'approved' && z.zoomLink && (
                          <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Link size={14} className="text-emerald-600 shrink-0" />
                              <a href={z.zoomLink} target="_blank" rel="noopener noreferrer" className="text-emerald-800 text-[13px] font-medium hover:underline truncate">
                                {z.zoomLink}
                              </a>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-700 hover:bg-emerald-100 shrink-0"
                              onClick={() => { navigator.clipboard.writeText(z.zoomLink!); toast({ title: "Link Zoom disalin!" }); }}
                            >
                              <Copy size={13} />
                            </Button>
                          </div>
                        )}

                        {/* Catatan Admin / Alasan */}
                        {z.adminNote && (
                          <div className={`rounded-lg p-3 text-[13px] ${
                            z.status === 'rejected'
                              ? 'bg-rose-50 border border-rose-100 text-rose-800'
                              : 'bg-slate-50 border border-slate-200 text-slate-700'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold flex items-center gap-1 text-xs">
                                <MessageSquare size={13} className="shrink-0" />
                                {z.status === 'rejected' ? 'Alasan Penolakan:' : 'Detail Meeting Zoom:'}
                              </p>
                              {z.status !== 'rejected' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] text-slate-600 hover:bg-slate-200 gap-1 px-2"
                                  onClick={() => { navigator.clipboard.writeText(z.adminNote!); toast({ title: "Detail Zoom disalin!" }); }}
                                >
                                  <Copy size={11} /> Salin Detail
                                </Button>
                              )}
                            </div>
                            <p className="whitespace-pre-line leading-relaxed font-mono text-[12px] text-slate-800">{z.adminNote}</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons footer */}
                      {(canReply || canEdit || canDelete) && (
                        <div className="bg-slate-50/70 px-4 py-2.5 border-t border-slate-100 flex justify-end gap-2 flex-wrap">
                          {canEdit && z.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(z)}
                              className="h-8 text-xs gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-100"
                            >
                              <Edit size={12} /> Edit
                            </Button>
                          )}
                          {canReply && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReply(z)}
                              className={`h-8 text-xs gap-1.5 ${
                                z.status === 'pending'
                                  ? 'text-primary border-primary/40 hover:bg-primary/5 font-medium'
                                  : 'text-slate-600 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {z.status === 'pending' ? <><Send size={12} /> Balas & Buat Link</> : <><Edit size={12} /> Edit Balasan</>}
                            </Button>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 h-8 text-xs gap-1.5">
                                  <Trash2 size={12} /> Hapus
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Hapus pengajuan ini?</AlertDialogTitle>
                                  <AlertDialogDescription>Pengajuan Zoom "{z.acara}" akan dihapus secara permanen.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteZoomBooking(z.id)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* ─── VIEW 3: KALENDER & TIMELINE VIEW (JADWAL MENUMPUK) ── */}
        {/* ======================================================== */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Sisi Kiri: Kalender Grid (5 cols di desktop) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                {/* Header Bulan & Navigasi */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {monthNames[calDate.getMonth()]} {calDate.getFullYear()}
                    </h3>
                    <p className="text-[11px] text-slate-400">Pilih tanggal untuk melihat timeline meeting</p>
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

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 pb-1 border-b border-slate-100">
                  {dayHeaders.map(h => (
                    <div key={h} className={h === 'Min' ? 'text-rose-400' : ''}>{h}</div>
                  ))}
                </div>

                {/* Grid Tanggal */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cd, idx) => {
                    const isSelected = cd.dateStr === selectedDate;
                    const isToday = cd.dateStr === todayStr;
                    const dayBookings = dateBookingsMap[cd.dateStr] || [];
                    const hasConflict = dayBookings.some(b => conflictMap[b.id]?.length > 0);
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

                        {/* Indikator Titik / Badge */}
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          {hasConflict ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Bentrok jadwal" />
                          ) : (
                            <>
                              {approvedCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title={`${approvedCount} Disetujui`} />}
                              {pendingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${pendingCount} Menunggu`} />}
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legend Kalender */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disetujui
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Menunggu
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Bentrok
                  </div>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Detail & Timeline Tanggal Terpilih (7 cols di desktop) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
                {/* Header Tanggal Terpilih */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Jadwal Tanggal</p>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      <Calendar size={16} className="text-primary" />
                      {formatDate(selectedDate)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedDayBookings.length} Meeting
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

                {/* ─── VISUAL TIMELINE BAR (JADWAL MENUMPUK) ─── */}
                {selectedDayBookings.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold flex items-center gap-1 text-slate-700">
                        <Clock size={13} className="text-primary" />
                        Visual Timeline Hari Ini (07:00 – 18:00 WIB)
                      </span>
                      <span className="text-[11px] text-slate-400">Balok yang bertingkat menandakan jadwal bentrok/menumpuk</span>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 overflow-x-auto">
                      {/* Ruler Jam */}
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono border-b border-slate-200 pb-1 mb-2 min-w-[420px]">
                        <span>07:00</span>
                        <span>09:00</span>
                        <span>11:00</span>
                        <span>13:00</span>
                        <span>15:00</span>
                        <span>17:00</span>
                        <span>18:00</span>
                      </div>

                      {/* Stacking Timeline Bars */}
                      <div className="space-y-2 min-w-[420px] py-1">
                        {selectedDayBookings.map((b) => {
                          const startH = parseInt(b.startTime.slice(0, 2));
                          const startM = parseInt(b.startTime.slice(3, 5));
                          const endH   = parseInt(b.endTime.slice(0, 2));
                          const endM   = parseInt(b.endTime.slice(3, 5));

                          const startMinutes = Math.max(0, (startH - 7) * 60 + startM);
                          const endMinutes   = Math.min(660, (endH - 7) * 60 + endM); // total 11 jam = 660 menit
                          const duration     = Math.max(20, endMinutes - startMinutes);

                          const leftPct  = Math.min(100, Math.max(0, (startMinutes / 660) * 100));
                          const widthPct = Math.min(100 - leftPct, Math.max(5, (duration / 660) * 100));

                          const hasConflict = conflictMap[b.id]?.length > 0;
                          const isApproved = b.status === 'approved';

                          return (
                            <div key={b.id} className="relative h-9 bg-slate-200/50 rounded-lg overflow-hidden">
                              <div
                                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                className={`absolute top-0.5 bottom-0.5 rounded-md px-2 flex items-center justify-between text-xs font-medium text-white shadow-sm transition-all overflow-hidden ${
                                  hasConflict
                                    ? 'bg-amber-600 ring-2 ring-amber-300'
                                    : isApproved
                                    ? 'bg-emerald-600'
                                    : 'bg-amber-500'
                                }`}
                                title={`${b.acara} (${b.startTime.slice(0,5)} - ${b.endTime.slice(0,5)})`}
                              >
                                <span className="truncate text-[11px] font-semibold">{b.acara}</span>
                                <span className="font-mono text-[10px] opacity-90 shrink-0 ml-1">
                                  {b.startTime.slice(0,5)}-{b.endTime.slice(0,5)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* List Kartu Meeting Hari Ini */}
                {selectedDayBookings.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                    <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-600 text-sm font-medium">Tidak ada meeting Zoom di tanggal ini.</p>
                    <p className="text-slate-400 text-xs mt-0.5">Jadwal pada tanggal ini masih kosong dan siap diajukan.</p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setForm({ ...emptyForm, date: selectedDate });
                        setIsFormOpen(true);
                      }}
                      className="mt-3 bg-primary hover:bg-primary/90 text-white text-xs gap-1.5"
                    >
                      <Plus size={14} /> Ajukan Zoom Sekarang
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {selectedDayBookings.map((z) => {
                      const sc = statusConfig[z.status] || statusConfig.pending;
                      const StatusIcon = sc.icon;
                      const isOwner   = !!z.userId && z.userId === user.id;
                      const canEdit   = user.role === 'admin' || isOwner;
                      const canDelete = user.role === 'admin' || isOwner;
                      const canReply  = user.role === 'admin';
                      const conflicts = conflictMap[z.id] || [];
                      const hasConflict = conflicts.length > 0;

                      return (
                        <div
                          key={z.id}
                          className={`p-3.5 rounded-xl border bg-white space-y-2.5 transition-all ${
                            hasConflict ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800 text-[14px]">{z.acara}</span>
                                {hasConflict && (
                                  <Badge className="bg-amber-500 text-white border-none text-[9px] px-1.5 py-0 rounded-full font-bold">
                                    ⚠️ Bentrok Jam
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {z.name} {z.seksi && z.seksi !== '-' && `· ${z.seksi}`}
                              </p>
                            </div>
                            <Badge className={`${sc.color} border text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1`}>
                              <StatusIcon size={10} /> {sc.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock size={12} className="text-primary" />
                              {z.startTime?.slice(0,5)} – {z.endTime?.slice(0,5)} WIB
                            </span>
                          </div>

                          {/* Link Zoom */}
                          {z.status === 'approved' && z.zoomLink && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs">
                              <a href={z.zoomLink} target="_blank" rel="noopener noreferrer" className="text-emerald-700 truncate font-medium hover:underline">
                                {z.zoomLink}
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-emerald-700 hover:bg-emerald-100 shrink-0"
                                onClick={() => { navigator.clipboard.writeText(z.zoomLink!); toast({ title: "Link Zoom disalin!" }); }}
                              >
                                <Copy size={12} />
                              </Button>
                            </div>
                          )}

                          {/* Action Footer */}
                          {(canReply || canEdit || canDelete) && (
                            <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
                              {canEdit && z.status === 'pending' && (
                                <Button size="sm" variant="ghost" onClick={() => openEdit(z)} className="h-7 text-xs text-slate-600 hover:bg-slate-100 gap-1 px-2">
                                  <Edit size={11} /> Edit
                                </Button>
                              )}
                              {canReply && (
                                <Button size="sm" variant="ghost" onClick={() => openReply(z)} className="h-7 text-xs text-primary hover:bg-primary/5 gap-1 px-2 font-medium">
                                  <Send size={11} /> {z.status === 'pending' ? 'Balas' : 'Edit Balasan'}
                                </Button>
                              )}
                              {canDelete && (
                                <Button size="sm" variant="ghost" onClick={() => deleteZoomBooking(z.id)} className="h-7 text-xs text-rose-600 hover:bg-rose-50 gap-1 px-2">
                                  <Trash2 size={11} /> Hapus
                                </Button>
                              )}
                            </div>
                          )}
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

      {/* ======================================================== */}
      {/* ─── MODAL AJUKAN ZOOM ─────────────────────────────────── */}
      {/* ======================================================== */}
      <AlertDialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Video size={18} /> Ajukan Peminjaman Zoom
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isi data acara dan jadwal dengan lengkap. Admin akan memproses pengajuan Anda.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <User size={13} /> Nama Pemohon <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Nama pemohon"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-slate-50 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Briefcase size={13} /> Seksi / Subag <span className="text-rose-500">*</span>
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
              <Label className="text-xs font-semibold">Nama Acara / Topik Meeting <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="Contoh: Rapat Koordinasi Program Dinkes"
                value={form.acara}
                onChange={e => setForm(p => ({ ...p, acara: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs font-semibold">
                <Calendar size={13} /> Tanggal Kegiatan <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Clock size={13} /> Jam Mulai <span className="text-rose-500">*</span>
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
                  <Clock size={13} /> Jam Selesai <span className="text-rose-500">*</span>
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
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsFormOpen(false); setForm(emptyForm); }}>Batal</AlertDialogCancel>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white gap-1.5 text-xs">
              {isSubmitting ? <><Loader2 size={13} className="animate-spin" /> Mengirim...</> : <><Send size={13} /> Kirim Pengajuan</>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================================================== */}
      {/* ─── MODAL EDIT ZOOM ───────────────────────────────────── */}
      {/* ======================================================== */}
      <AlertDialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Edit size={18} /> Edit Pengajuan Zoom
            </AlertDialogTitle>
            <AlertDialogDescription>Perbarui rincian pengajuan Zoom meeting.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Acara / Topik <span className="text-rose-500">*</span></Label>
              <Input
                value={editForm.acara}
                onChange={e => setEditForm(p => ({ ...p, acara: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal <span className="text-rose-500">*</span></Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                className="bg-slate-50 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Mulai <span className="text-rose-500">*</span></Label>
                <div className="flex gap-2">
                  <Select value={editForm.startHour} onValueChange={v => setEditForm(p => ({ ...p, startHour: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Jam" /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editForm.startMinute} onValueChange={v => setEditForm(p => ({ ...p, startMinute: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Menit" /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Jam Selesai <span className="text-rose-500">*</span></Label>
                <div className="flex gap-2">
                  <Select value={editForm.endHour} onValueChange={v => setEditForm(p => ({ ...p, endHour: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Jam" /></SelectTrigger>
                    <SelectContent>{hours.map(h => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={editForm.endMinute} onValueChange={v => setEditForm(p => ({ ...p, endMinute: v }))}>
                    <SelectTrigger className="bg-slate-50 text-xs"><SelectValue placeholder="Menit" /></SelectTrigger>
                    <SelectContent>{minutes.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
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

      {/* ======================================================== */}
      {/* ─── MODAL BALAS ADMIN ─────────────────────────────────── */}
      {/* ======================================================== */}
      <AlertDialog open={!!replyTarget} onOpenChange={open => { if (!open) { setReplyTarget(null); setReplyTargetData(null); } }}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <Send size={18} /> Balas Pengajuan Zoom
            </AlertDialogTitle>
            <AlertDialogDescription>
              {replyTargetData && `Acara: ${replyTargetData.acara} (${formatDateShort(replyTargetData.date)}, ${replyTargetData.startTime.slice(0,5)} WIB)`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status Pengajuan</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={replyForm.status === 'approved' ? 'default' : 'outline'}
                  onClick={() => setReplyForm(p => ({ ...p, status: 'approved' }))}
                  className={`flex-1 text-xs gap-1.5 ${replyForm.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                >
                  <CheckCircle size={14} /> Disetujui
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={replyForm.status === 'rejected' ? 'destructive' : 'outline'}
                  onClick={() => setReplyForm(p => ({ ...p, status: 'rejected' }))}
                  className="flex-1 text-xs gap-1.5"
                >
                  <XCircle size={14} /> Ditolak
                </Button>
              </div>
            </div>

            {replyForm.status === 'approved' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Detail Meeting Zoom</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoGenerate}
                    disabled={isGenerating}
                    className="h-7 text-xs gap-1 text-purple-700 border-purple-200 hover:bg-purple-50 font-semibold"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    Buat Otomatis via API
                  </Button>
                </div>
                <Textarea
                  placeholder={`Contoh:\nJoin Zoom Meeting: https://zoom.us/j/123456789\nMeeting ID: 123 456 789\nPasscode: 12345`}
                  value={replyForm.zoomDetail}
                  onChange={e => setReplyForm(p => ({ ...p, zoomDetail: e.target.value }))}
                  rows={5}
                  className="bg-slate-50 text-xs font-mono resize-none"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Alasan Penolakan</Label>
                <Textarea
                  placeholder="Contoh: Jadwal bertabrakan dengan acara pimpinan, atau akun Zoom sedang digunakan keperluan lain."
                  value={replyForm.adminNote}
                  onChange={e => setReplyForm(p => ({ ...p, adminNote: e.target.value }))}
                  rows={4}
                  className="bg-slate-50 text-xs resize-none"
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setReplyTarget(null); setReplyTargetData(null); }}>Batal</AlertDialogCancel>
            <Button onClick={handleReply} disabled={isReplying} className="bg-primary hover:bg-primary/90 text-white text-xs gap-1.5">
              {isReplying ? <><Loader2 size={13} className="animate-spin" /> Menyimpan...</> : "Kirim Balasan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================================================== */}
      {/* ─── MODAL EXPORT EXCEL (ADMIN) ────────────────────────── */}
      {/* ======================================================== */}
      <AlertDialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <FileSpreadsheet size={18} className="text-emerald-600" /> Export Data Zoom ke Excel
            </AlertDialogTitle>
            <AlertDialogDescription>
              Unduh rekapitulasi data peminjaman Zoom Meeting ke dalam file Microsoft Excel (.xlsx).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            {/* Lingkup Waktu */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lingkup Tanggal</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upcoming', label: 'Mendatang' },
                  { id: 'month', label: 'Bulan Ini' },
                  { id: 'all', label: 'Semua Data' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExportScope(opt.id as any)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                      exportScope === opt.id
                        ? 'border-primary bg-primary/5 text-primary font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Status */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Status yang Disertakan</Label>
              {[
                { val: 'approved', label: 'Disetujui', desc: 'Jadwal yang telah memiliki link meeting' },
                { val: 'pending', label: 'Menunggu', desc: 'Pengajuan yang belum di-ACC' },
                { val: 'rejected', label: 'Ditolak', desc: 'Pengajuan yang ditolak' },
              ].map(item => (
                <label
                  key={item.val}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={exportStatuses.includes(item.val)}
                    onChange={() => toggleExportStatus(item.val)}
                    className="h-4 w-4 accent-primary rounded"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              onClick={handleExportExcel}
              disabled={exportStatuses.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <FileSpreadsheet size={14} /> Unduh Excel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ZoomBookingPanel;