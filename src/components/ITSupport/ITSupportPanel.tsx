// src/components/ITSupport/ITSupportPanel.tsx
import { useState, useMemo } from "react";
import { User } from "@/hooks/useSupabaseAuth";
import { useITTickets, ITTicket, TicketCategory, TicketStatus } from "@/hooks/useITTickets";
import { TelegramConfigModal } from "./TelegramConfigModal";
import { getTelegramConfig } from "@/lib/telegram";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Laptop,
  Cpu,
  AppWindow,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  FileSpreadsheet,
  Printer,
  Trash2,
  Plus,
  Send,
  Building,
  UserCheck,
  BarChart3,
  HardDrive,
  Layers,
  ArrowUpDown,
  Calendar,
} from "lucide-react";

interface ITSupportPanelProps {
  user: User | null;
}

const BIDANG_OPTIONS = [
  "Sekretariat",
  "Bidang Kesehatan Masyarakat (Kesmas)",
  "Bidang Pencegahan & Pengendalian Penyakit (P2P)",
  "Bidang Pelayanan Kesehatan (Yankes)",
  "Bidang Sumber Daya Kesehatan (SDK)",
];

// Helper untuk format tanggal lokal YYYY-MM-DD
const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper untuk format jam lokal HH:mm
const getLocalTimeString = (d: Date = new Date()): string => {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Helper untuk menggabungkan tanggal (YYYY-MM-DD) dan jam (HH:mm) menjadi ISO string
const combineDateAndTimeToISO = (dateStr: string, timeStr?: string): string => {
  if (!dateStr) return new Date().toISOString();
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hours = new Date().getHours();
    let minutes = new Date().getMinutes();
    let seconds = new Date().getSeconds();

    if (timeStr && timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
      if (!isNaN(h)) hours = h;
      if (!isNaN(m)) minutes = m;
      seconds = 0;
    }

    const localDate = new Date(year, month - 1, day, hours, minutes, seconds);
    return isNaN(localDate.getTime()) ? new Date().toISOString() : localDate.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

export const ITSupportPanel = ({ user }: ITSupportPanelProps) => {
  const { tickets, isLoading, createTicket, updateTicketStatus, deleteTicket, clearAllTickets, recapStats } = useITTickets(user);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'recap'>('create');

  // Form State (Only requested fields, no photo, no phone)
  const [category, setCategory] = useState<TicketCategory>('hardware');
  const [penanggungJawab, setPenanggungJawab] = useState('');
  const [unitName, setUnitName] = useState('');
  const [bidang, setBidang] = useState(BIDANG_OPTIONS[0]);
  const [customBidang, setCustomBidang] = useState('');
  const [description, setDescription] = useState('');
  const [reportDate, setReportDate] = useState(() => getLocalDateString());
  const [reportTime, setReportTime] = useState(() => getLocalTimeString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Modal Update Status (Admin)
  const [selectedTicket, setSelectedTicket] = useState<ITTicket | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<TicketStatus>('in_progress');
  const [handlerNotes, setHandlerNotes] = useState('');
  const [handlerName, setHandlerName] = useState(user?.username || 'Admin IT');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // Modal Telegram Config
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState(() => getTelegramConfig());

  const openTelegramModal = () => {
    setTelegramConfig(getTelegramConfig());
    setIsTelegramModalOpen(true);
  };

  const isAdmin = user?.role === 'admin';

  // Handle Submit Form
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penanggungJawab.trim() || !unitName.trim() || !description.trim()) {
      alert("Harap lengkapi semua data wajib pada formulir.");
      return;
    }

    setIsSubmitting(true);
    const selectedBidangName = bidang === 'Lainnya / Ruang Rapat' && customBidang.trim() ? customBidang.trim() : bidang;
    const createdAtISO = combineDateAndTimeToISO(reportDate, reportTime);

    const res = await createTicket({
      category,
      penanggung_jawab: penanggungJawab,
      unit_name: unitName,
      bidang: selectedBidangName,
      description,
      created_at: createdAtISO,
    });

    setIsSubmitting(false);

    if (res.success) {
      // Reset form
      setPenanggungJawab('');
      setUnitName('');
      setDescription('');
      setReportDate(getLocalDateString());
      setReportTime(getLocalTimeString());
      setActiveTab('list'); // Pindah ke daftar tiket
    }
  };

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const formattedDate = new Date(t.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).toLowerCase();
      const rawDate = t.created_at.slice(0, 10);

      const matchSearch =
        t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.penanggung_jawab.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.bidang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formattedDate.includes(searchTerm.toLowerCase()) ||
        rawDate.includes(searchTerm.toLowerCase());

      const matchCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchDate = !filterDate || rawDate === filterDate;

      return matchSearch && matchCategory && matchStatus && matchDate;
    });
  }, [tickets, searchTerm, filterCategory, filterStatus, filterDate]);

  // Handle Save Status Update (Admin)
  const handleSaveStatus = async () => {
    if (!selectedTicket) return;
    const newCreatedAt = editDate ? combineDateAndTimeToISO(editDate, editTime) : undefined;
    await updateTicketStatus(selectedTicket.id, statusToUpdate, handlerNotes, handlerName, newCreatedAt);
    setIsStatusDialogOpen(false);
    setSelectedTicket(null);
  };

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (tickets.length === 0) {
      alert("Belum ada data tiket untuk diexport.");
      return;
    }

    const headers = [
      "No Tiket",
      "Tanggal Lapor",
      "Kategori",
      "Penanggung Jawab Unit",
      "Nama/Merk Unit",
      "Bidang/Seksi",
      "Deskripsi Kendala",
      "Status",
      "Teknisi",
      "Catatan Penanganan",
      "Tanggal Selesai"
    ];

    const rows = tickets.map(t => [
      `"${t.ticket_number}"`,
      `"${new Date(t.created_at).toLocaleDateString('id-ID')}"`,
      `"${t.category === 'hardware' ? 'Hardware' : 'Software'}"`,
      `"${t.penanggung_jawab.replace(/"/g, '""')}"`,
      `"${t.unit_name.replace(/"/g, '""')}"`,
      `"${t.bidang.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.status === 'completed' ? 'Selesai' : t.status === 'in_progress' ? 'Dikerjakan' : t.status === 'pending' ? 'Menunggu' : 'Dibatalkan'}"`,
      `"${(t.handler_name || '-').replace(/"/g, '""')}"`,
      `"${(t.handler_notes || '-').replace(/"/g, '""')}"`,
      `"${t.completed_at ? new Date(t.completed_at).toLocaleDateString('id-ID') : '-'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Tiket_IT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <CheckCircle2 size={12} /> Selesai
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <Wrench size={12} /> Sedang Dikerjakan
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <Clock size={12} /> Menunggu Respon
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            <AlertCircle size={12} /> Dibatalkan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── HEADER BANNER MODUL ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0f172a] text-white flex items-center justify-center shadow-md shrink-0">
            <Laptop size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Layanan Tiket IT</h2>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200">
                Helpdesk
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pelaporan kerusakan unit komputer/laptop dinas & pertanggungjawaban pemegang barang
            </p>
          </div>
        </div>

        {/* Actions & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Telegram Settings Button */}
          <button
            type="button"
            onClick={openTelegramModal}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs transition-all hover:border-sky-300 cursor-pointer"
            title="Pengaturan Notifikasi Telegram"
          >
            <Send size={13} className="text-sky-500" />
            <span>Telegram</span>
            {telegramConfig.chatId ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aktif
              </span>
            ) : (
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                Atur
              </span>
            )}
          </button>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'create'
                  ? "bg-[#0f172a] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Plus size={14} /> Buat Tiket
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'list'
                  ? "bg-[#0f172a] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Layers size={14} /> Antrean ({tickets.length})
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('recap')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'recap'
                    ? "bg-[#0f172a] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <BarChart3 size={14} /> Rekap Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── TAB 1: FORMULIR PELAPORAN ─── */}
      {activeTab === 'create' && (
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Plus size={18} className="text-[#0f172a]" /> Form Lapor Kendala Unit IT
            </CardTitle>
            <CardDescription className="text-xs">
              Isi data pemegang unit dan deskripsi kerusakan untuk ditangani oleh tim teknisi IT Dinkes.
            </CardDescription>
          </CardHeader>

          {/* Telegram Banner Notice */}
          <div className="mx-5 sm:mx-7 mt-4 p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-sky-900">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Send size={13} className="-ml-0.5 mt-0.5" />
              </span>
              <div>
                <span className="font-bold text-sky-900">Notifikasi Otomatis ke Telegram</span>
                <p className="text-[11px] text-sky-700 mt-0.5">
                  Setiap pengajuan tiket kendala akan langsung dikirimkan ke Telegram tim teknisi IT secara real-time.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openTelegramModal}
              className="text-[11px] font-bold text-sky-700 hover:text-sky-900 underline shrink-0 cursor-pointer"
            >
              {telegramConfig.chatId ? "Ubah Saluran" : "Atur Chat ID"}
            </button>
          </div>

          <CardContent className="p-5 sm:p-7">
            <form onSubmit={handleSubmitTicket} className="space-y-6">

              {/* 1. Kategori Kendala: Hardware vs Software */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  1. Pilih Kategori Kendala <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pilihan Hardware */}
                  <button
                    type="button"
                    onClick={() => setCategory('hardware')}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${category === 'hardware'
                        ? "border-[#0f172a] bg-slate-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${category === 'hardware' ? "bg-[#0f172a] text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                      <Cpu size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Hardware (Perangkat Keras)</span>
                        {category === 'hardware' && <CheckCircle2 size={15} className="text-[#0f172a]" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Komputer/PC mati, laptop tidak mau hidup, layar monitor bergaris, kipas bising, baterai rusak.
                      </p>
                    </div>
                  </button>

                  {/* Pilihan Software */}
                  <button
                    type="button"
                    onClick={() => setCategory('software')}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3.5 ${category === 'software'
                        ? "border-[#0f172a] bg-slate-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${category === 'software' ? "bg-[#0f172a] text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                      <AppWindow size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Software (Aplikasi & Sistem)</span>
                        {category === 'software' && <CheckCircle2 size={15} className="text-[#0f172a]" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Windows blue screen / hang, aplikasi dinas error, lisensi kadaluarsa, virus, instalasi program.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Baris: Penanggung Jawab Unit & Nama/Merk Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="penanggungJawab" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-slate-500" />
                    Nama Penanggung Jawab / Pemegang Unit <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="penanggungJawab"
                    placeholder="Contoh: Bu Rina / Pak Budi / Staf Farmasi"
                    value={penanggungJawab}
                    onChange={(e) => setPenanggungJawab(e.target.value)}
                    required
                    className="h-10 bg-slate-50/50 border-slate-300 text-sm focus:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-400">
                    Sebutkan siapa pegawai yang memegang/menggunakan unit ini agar jelas kepemilikannya.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitName" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <HardDrive size={14} className="text-slate-500" />
                    Nama / Merk Unit Perangkat <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="unitName"
                    placeholder="Contoh: Laptop Lenovo ThinkPad / PC All-in-One Dell"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    required
                    className="h-10 bg-slate-50/50 border-slate-300 text-sm focus:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-400">
                    Sebutkan jenis dan merk unit (contoh: Laptop Asus, PC Rakitan Seksi Yankes).
                  </p>
                </div>
              </div>

              {/* 3. Baris: Bidang/Seksi & Tanggal Masuk Laporan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="bidang" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building size={14} className="text-slate-500" />
                    Bidang / Bagian / Seksi <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="bidang"
                    value={bidang}
                    onChange={(e) => setBidang(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-slate-50/50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
                  >
                    {BIDANG_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  {bidang === "Lainnya / Ruang Rapat" && (
                    <Input
                      placeholder="Tuliskan nama ruangan atau unit khusus..."
                      value={customBidang}
                      onChange={(e) => setCustomBidang(e.target.value)}
                      className="h-9 mt-2 text-sm bg-white"
                    />
                  )}
                  <p className="text-[11px] text-slate-400">
                    Pilih bidang asal penanggung jawab perangkat dinas.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reportDate" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-500" />
                      Tanggal Lapor <span className="text-rose-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        setReportDate(getLocalDateString());
                        setReportTime(getLocalTimeString());
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline flex items-center gap-1"
                      title="Set ke hari ini"
                    >
                      Hari Ini
                    </button>
                  </div>

                  <Input
                    id="reportDate"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    required
                    className="h-10 bg-slate-50/50 border-slate-300 text-sm font-medium focus:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-400">
                    Tanggal saat kendala terjadi atau dilaporkan.
                  </p>
                </div>
              </div>

              {/* 4. Deskripsi Kerusakan */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-slate-500" />
                  Uraian Kerusakan / Kendala yang Dialami <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan kendala secara singkat, contoh: Laptop tidak mau menyala saat ditekan tombol power, atau layar blue screen dengan pesan error lisensi..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="bg-slate-50/50 border-slate-300 text-sm resize-none focus:border-slate-800"
                />
              </div>

              {/* Tombol Simpan / Kirim */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 h-11 text-sm font-bold shadow-md rounded-xl gap-2 transition-all"
                >
                  <Send size={15} />
                  {isSubmitting ? "Mengirim Laporan..." : "Kirim Laporan Tiket IT"}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 2: DAFTAR & ANTREAN TIKET ─── */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Bar Filter & Pencarian */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama pemegang unit, merk unit, nomor tiket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-sm bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Kategori */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <option value="all">Semua Kategori</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="in_progress">Dikerjakan</option>
                <option value="completed">Selesai</option>
              </select>

              {/* Filter Tanggal Lapor */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-10">
                <Calendar size={13} className="text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  title="Filter berdasarkan tanggal lapor"
                />
                {filterDate && (
                  <button
                    type="button"
                    onClick={() => setFilterDate('')}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1 font-bold cursor-pointer"
                    title="Hapus filter tanggal"
                  >
                    ×
                  </button>
                )}
              </div>

              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-10 border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5 text-xs font-semibold"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600" /> Export CSV
                  </Button>

                  {tickets.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Apakah Anda yakin ingin menghapus SEMUA tiket di antrean ini?")) {
                          await clearAllTickets();
                        }
                      }}
                      className="h-10 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1.5 text-xs font-semibold cursor-pointer"
                      title="Hapus semua tiket di antrean"
                    >
                      <Trash2 size={14} /> Bersihkan Semua
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* List Tiket */}
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Memuat daftar tiket...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
              <Laptop size={44} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-base">Tidak ada tiket ditemukan</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Belum ada pelaporan kendala IT atau tiket tidak cocok dengan filter pencarian.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('create')}
                className="mt-4 text-xs font-bold border-slate-300 text-slate-800"
              >
                + Buat Laporan Baru
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    {/* Top row: Nomor Tiket, Kategori Badge, Status Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {t.ticket_number}
                      </span>

                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${t.category === 'hardware'
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}>
                        {t.category === 'hardware' ? <Cpu size={11} /> : <AppWindow size={11} />}
                        {t.category === 'hardware' ? 'Hardware' : 'Software'}
                      </span>

                      {getStatusBadge(t.status)}

                      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        {new Date(t.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Middle row: Nama Unit & Penanggung Jawab */}
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                        {t.unit_name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <UserCheck size={13} className="text-slate-500" /> Penanggung Jawab: {t.penanggung_jawab}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Building size={13} /> {t.bidang}
                        </span>
                      </p>
                    </div>

                    {/* Description Box */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-800">Kendala: </span>
                      {t.description}
                    </div>

                    {/* Catatan Penanganan Teknisi */}
                    {t.handler_notes && (
                      <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                        <Wrench size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Penanganan Teknisi ({t.handler_name || 'Admin'}): </span>
                          <span>{t.handler_notes}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    {isAdmin && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTicket(t);
                          setStatusToUpdate(t.status);
                          setHandlerNotes(t.handler_notes || '');
                          setHandlerName(t.handler_name || user?.username || 'Admin IT');
                          const d = new Date(t.created_at);
                          setEditDate(getLocalDateString(d));
                          setEditTime(getLocalTimeString(d));
                          setIsStatusDialogOpen(true);
                        }}
                        className="text-xs bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold h-9 px-3.5 shadow-sm rounded-lg flex items-center gap-1.5"
                      >
                        <Wrench size={13} /> Update Status
                      </Button>
                    )}

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (confirm(`Hapus tiket ${t.ticket_number}?`)) {
                            await deleteTicket(t.id);
                          }
                        }}
                        className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 cursor-pointer"
                        title="Hapus Tiket"
                      >
                        <Trash2 size={14} /> Hapus
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: REKAP DATA & STATISTIK ADMIN ─── */}
      {isAdmin && activeTab === 'recap' && (
        <div className="space-y-6 animate-fade-in">

          {/* Action Header Rekap */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Dashboard Rekapitulasi Data Kendala IT</h3>
              <p className="text-xs text-slate-500">Ringkasan berkala untuk laporan pimpinan dan monitoring tim IT</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Printer size={14} /> Cetak Laporan
              </Button>
              <Button
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 text-xs font-bold bg-[#0f172a] hover:bg-[#1e293b] text-white shadow-sm"
              >
                <FileSpreadsheet size={14} className="text-emerald-400" /> Export File Excel/CSV
              </Button>
            </div>
          </div>

          {/* 4 Kartu Metrik Utama */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tiket</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                    <Layers size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">{recapStats.total}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">Semua laporan terdata</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Menunggu</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-700 mt-2">{recapStats.pending}</div>
                <p className="text-[11px] text-amber-600/80 mt-0.5">Perlu tindak lanjut</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Dikerjakan</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Wrench size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-800 mt-2">{recapStats.inProgress}</div>
                <p className="text-[11px] text-blue-600/80 mt-0.5">Dalam penanganan</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Selesai</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-2">{recapStats.completed}</div>
                <p className="text-[11px] text-emerald-600/80 mt-0.5">Unit sudah normal</p>
              </CardContent>
            </Card>
          </div>

          {/* Grid: Kategori Breakdown & Bidang Terbanyak */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Rasio Hardware vs Software */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Cpu size={16} className="text-[#0f172a]" /> Proporsi Kendala: Hardware vs Software
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Hardware Bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-amber-800 flex items-center gap-1.5">
                      <Cpu size={13} /> Hardware (Perangkat Keras)
                    </span>
                    <span className="text-slate-700 font-mono">
                      {recapStats.hardwareCount} unit ({recapStats.total ? Math.round((recapStats.hardwareCount / recapStats.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${recapStats.total ? (recapStats.hardwareCount / recapStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Software Bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-blue-800 flex items-center gap-1.5">
                      <AppWindow size={13} /> Software (Sistem & Aplikasi)
                    </span>
                    <span className="text-slate-700 font-mono">
                      {recapStats.softwareCount} unit ({recapStats.total ? Math.round((recapStats.softwareCount / recapStats.total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#0f172a] h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${recapStats.total ? (recapStats.softwareCount / recapStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed">
                  💡 <strong>Catatan Analisis:</strong> Jika kendala hardware mendominasi, pertimbangkan pengusulan pengadaan suku cadang (RAM, SSD, Charger) atau peremajaan unit di anggaran pemeliharaan.
                </div>
              </CardContent>
            </Card>

            {/* Box 2: Rekap Per Bidang */}
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building size={16} className="text-[#0f172a]" /> Frekuensi Kerusakan Berdasarkan Bidang
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {recapStats.topBidang.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada data bidang</p>
                ) : (
                  recapStats.topBidang.slice(0, 5).map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-white text-xs font-bold text-slate-700">
                        {item.count} laporan
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabel Rekap Unit Sering Dilaporkan */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HardDrive size={16} className="text-[#0f172a]" /> Daftar Unit & Penanggung Jawab Terdata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">No</th>
                    <th className="p-3">Nama / Merk Unit</th>
                    <th className="p-3">Penanggung Jawab</th>
                    <th className="p-3">Bidang</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Status Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.slice(0, 10).map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{t.unit_name}</td>
                      <td className="p-3 font-medium text-slate-700">{t.penanggung_jawab}</td>
                      <td className="p-3 text-slate-500">{t.bidang}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.category === 'hardware' ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>
                          {t.category === 'hardware' ? 'Hardware' : 'Software'}
                        </span>
                      </td>
                      <td className="p-3">{getStatusBadge(t.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

        </div>
      )}

      {/* ─── MODAL UPDATE STATUS (ADMIN / TEKNISI) ─── */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench size={18} className="text-[#0f172a]" /> Update Status Penanganan Tiket
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah status pengerjaan tiket #{selectedTicket?.ticket_number} ({selectedTicket?.unit_name} - {selectedTicket?.penanggung_jawab})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Status Pengerjaan</Label>
              <select
                value={statusToUpdate}
                onChange={(e) => setStatusToUpdate(e.target.value as TicketStatus)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-semibold"
              >
                <option value="pending">Menunggu Respon</option>
                <option value="in_progress">Sedang Dikerjakan</option>
                <option value="completed">Selesai (Sudah Diperbaiki)</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nama Teknisi / Petugas IT</Label>
              <Input
                value={handlerName}
                onChange={(e) => setHandlerName(e.target.value)}
                placeholder="Contoh: Admin IT / Nama Teknisi"
                className="h-9 text-xs"
              />
            </div>

            {/* Tanggal Lapor */}
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500" />
                  Tanggal Lapor
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setEditDate(getLocalDateString());
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline"
                >
                  Hari Ini
                </button>
              </div>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-8 text-xs bg-white"
              />
              <p className="text-[10px] text-slate-400">
                Sesuaikan tanggal lapor jika diperlukan.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Catatan Tindakan / Solusi Perbaikan</Label>
              <Textarea
                value={handlerNotes}
                onChange={(e) => setHandlerNotes(e.target.value)}
                placeholder="Contoh: Sudah diganti kabel power monitor dan diuji coba berjalan normal..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStatusDialogOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveStatus}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL PENGATURAN TELEGRAM ─── */}
      <TelegramConfigModal
        isOpen={isTelegramModalOpen}
        onClose={() => {
          setIsTelegramModalOpen(false);
          setTelegramConfig(getTelegramConfig());
        }}
      />
    </div>
  );
};
