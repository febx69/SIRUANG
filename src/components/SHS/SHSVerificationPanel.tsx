// src/components/SHS/SHSVerificationPanel.tsx
import { useState, useMemo, useEffect } from "react";
import { User } from "@/hooks/useSupabaseAuth";
import { SHSItem, SHSStatus } from "@/types/shs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  Building,
  Coins,
  FileCheck,
  Eye,
  CheckCheck,
  Tag,
  Calendar,
  FileText,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  parseVerificationData,
  getDualStatusInfo,
  formatDisplayCatatan,
} from "@/lib/shsVerificationHelper";
import {
  formatRekeningWithUraian,
  getRekeningUraian,
  formatKategoriWithNama,
  getKategoriNama,
} from "@/lib/shsMasterData";
import { SHSTimeline } from "@/components/SHS/SHSTimeline";

interface SHSVerificationPanelProps {
  user: User | null;
  items: SHSItem[];
  verifyItem: (
    id: string,
    keputusan: "disetujui" | "perlu_perbaikan" | "ditolak",
    catatan: string,
    verifikatorName: string
  ) => Promise<boolean>;
  bulkApprove: (ids: string[], verifikatorName: string) => Promise<boolean>;
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

const formatDate = (isoString?: string | null) => {
  if (!isoString) return "-";
  try {
    return new Date(isoString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const getStatusBadge = (status: SHSStatus) => {
  switch (status) {
    case "draft":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold gap-1 text-[11px]">
          <Tag size={12} /> Draft
        </Badge>
      );
    case "diajukan":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold gap-1 text-[11px]">
          <Clock size={12} /> Diajukan
        </Badge>
      );
    case "diperbaiki":
      return (
        <Badge className="bg-teal-100 text-teal-900 border-teal-300 font-semibold gap-1 text-[11px] shadow-2xs">
          <Sparkles size={12} className="text-teal-600" /> Diperbaiki (Revisi)
        </Badge>
      );
    case "disetujui":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1 text-[11px]">
          <CheckCircle2 size={12} /> Disetujui
        </Badge>
      );
    case "perlu_perbaikan":
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 font-semibold gap-1 text-[11px]">
          <AlertCircle size={12} /> Perlu Perbaikan
        </Badge>
      );
    case "ditolak":
      return (
        <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold gap-1 text-[11px]">
          <XCircle size={12} /> Ditolak
        </Badge>
      );
    default:
      return null;
  }
};

export const SHSVerificationPanel = ({
  user,
  items,
  verifyItem,
  bulkApprove,
}: SHSVerificationPanelProps) => {
  const isPengurusBarang =
    user?.role === "pengurus_barang" || (user?.username || "").toLowerCase().startsWith("pengurus");
  const isAdmin = user?.role === "admin";
  const partnerRoleName = isPengurusBarang ? "Admin Dinkes" : "Pengurus Barang";

  const verifikatorName = isPengurusBarang
    ? "Pengurus Barang"
    : isAdmin
    ? "Admin Dinkes"
    : user?.username || "Tim Verifikator Dinkes";

  // Active queue tab: 'pending' (diajukan) | 'approved' | 'revision' | 'rejected'
  const [activeQueue, setActiveQueue] = useState<"pending" | "approved" | "revision" | "rejected">(
    "pending"
  );
  // Sub-filter khusus antrean masuk (pending)
  const [subQueueFilter, setSubQueueFilter] = useState<"all" | "needs_action" | "revisi_only" | "waiting_partner">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "default" | "uraian_asc" | "uraian_desc" | "total_desc" | "total_asc"
  >("default");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Toggle sort helpers
  const handleToggleSortUraian = () => {
    setSortBy((prev) => (prev === "uraian_asc" ? "uraian_desc" : prev === "uraian_desc" ? "default" : "uraian_asc"));
  };
  const handleToggleSortTotal = () => {
    setSortBy((prev) => (prev === "total_desc" ? "total_asc" : prev === "total_asc" ? "default" : "total_desc"));
  };

  // Modal Detail Item (Melihat seluruh spesifikasi item)
  const [detailItem, setDetailItem] = useState<SHSItem | null>(null);

  // Modal Keputusan Tunggal (Hanya Setujui atau Perlu Perbaikan dengan Catatan)
  const [selectedItem, setSelectedItem] = useState<SHSItem | null>(null);
  const [actionType, setActionType] = useState<"disetujui" | "perlu_perbaikan" | null>(
    null
  );
  const [catatan, setCatatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All pending items (termasuk usulan baru diajukan dan usulan hasil perbaikan)
  const allPendingItems = useMemo(() => {
    return items.filter((i) => i.status === "diajukan" || i.status === "diperbaiki");
  }, [items]);

  // Usulan hasil perbaikan (revisi)
  const revisedPendingItems = useMemo(() => {
    return allPendingItems.filter((i) => i.status === "diperbaiki" || i.is_revisi);
  }, [allPendingItems]);

  // Usulan yang membutuhkan persetujuan dari verifikator yang sedang login
  const needsMyActionItems = useMemo(() => {
    return allPendingItems.filter((item) => {
      const dual = getDualStatusInfo(item);
      return isPengurusBarang ? !dual.pengurusApproved : !dual.adminApproved;
    });
  }, [allPendingItems, isPengurusBarang]);

  // Usulan yang sudah disetujui pengguna ini, sedang menunggu verifikator mitra
  const waitingPartnerItems = useMemo(() => {
    return allPendingItems.filter((item) => {
      const dual = getDualStatusInfo(item);
      return isPengurusBarang
        ? dual.pengurusApproved && !dual.adminApproved
        : dual.adminApproved && !dual.pengurusApproved;
    });
  }, [allPendingItems, isPengurusBarang]);

  // Filter items based on active queue & subQueueFilter
  const queueItems = useMemo(() => {
    const result = items.filter((item) => {
      if (activeQueue === "pending") {
        if (item.status !== "diajukan" && item.status !== "diperbaiki") return false;
        const dual = getDualStatusInfo(item);
        const myApproved = isPengurusBarang ? dual.pengurusApproved : dual.adminApproved;
        if (subQueueFilter === "needs_action" && myApproved) return false;
        if (subQueueFilter === "revisi_only" && !(item.status === "diperbaiki" || item.is_revisi)) return false;
        if (subQueueFilter === "waiting_partner" && !myApproved) return false;
      }
      if (activeQueue === "approved" && item.status !== "disetujui") return false;
      if (activeQueue === "revision" && item.status !== "perlu_perbaikan") return false;
      if (activeQueue === "rejected" && item.status !== "ditolak") return false;

      if (unitFilter !== "all" && item.unit_kerja !== unitFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.uraian.toLowerCase().includes(q) ||
          item.kode_kategori.toLowerCase().includes(q) ||
          item.spek.toLowerCase().includes(q) ||
          item.unit_kerja.toLowerCase().includes(q) ||
          item.nama_pengusul.toLowerCase().includes(q)
        );
      }

      return true;
    });

    if (sortBy === "uraian_asc") {
      result.sort((a, b) => (a.uraian || "").localeCompare(b.uraian || "", "id", { sensitivity: "base" }));
    } else if (sortBy === "uraian_desc") {
      result.sort((a, b) => (b.uraian || "").localeCompare(a.uraian || "", "id", { sensitivity: "base" }));
    } else if (sortBy === "total_desc") {
      result.sort((a, b) => {
        const totalA = a.total !== undefined && a.total !== null ? Number(a.total) : (Number(a.harga) || 0) + (Number(a.ongkir) || 0);
        const totalB = b.total !== undefined && b.total !== null ? Number(b.total) : (Number(b.harga) || 0) + (Number(b.ongkir) || 0);
        return totalB - totalA;
      });
    } else if (sortBy === "total_asc") {
      result.sort((a, b) => {
        const totalA = a.total !== undefined && a.total !== null ? Number(a.total) : (Number(a.harga) || 0) + (Number(a.ongkir) || 0);
        const totalB = b.total !== undefined && b.total !== null ? Number(b.total) : (Number(b.harga) || 0) + (Number(b.ongkir) || 0);
        return totalA - totalB;
      });
    }

    return result;
  }, [items, activeQueue, subQueueFilter, unitFilter, searchTerm, isPengurusBarang, sortBy]);

  // Unique units for filter
  const unitList = useMemo(() => {
    const set = new Set(items.map((i) => i.unit_kerja));
    return Array.from(set);
  }, [items]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset page to 1 when filters or queue change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeQueue, subQueueFilter, unitFilter, searchTerm, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(queueItems.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, queueItems.length);

  const paginatedQueueItems = useMemo(() => {
    return queueItems.slice(startIndex, endIndex);
  }, [queueItems, startIndex, endIndex]);

  // Bulk selection on current page
  const isAllCurrentPageSelected =
    paginatedQueueItems.length > 0 &&
    paginatedQueueItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(paginatedQueueItems.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const toAdd = paginatedQueueItems.map((i) => i.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...toAdd])));
    }
  };

  const selectAllQueueItems = () => {
    setSelectedIds(queueItems.map((i) => i.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Setujui Terpilih (Checkbox)
  const handleBulkApproveSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Setujui ${selectedIds.length} usulan terpilih sekaligus?`)) return;

    setIsSubmitting(true);
    try {
      const ok = await bulkApprove(selectedIds, verifikatorName);
      if (ok) setSelectedIds([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // SETUJUI SEMUA USULAN MASUK (Approve All Pending)
  const handleApproveAllPending = async () => {
    if (allPendingItems.length === 0) {
      toast({
        title: "Tidak Ada Antrean",
        description: "Tidak ada usulan berstatus diajukan yang perlu disetujui.",
      });
      return;
    }

    const confirmMsg = `PERINGATAN: Anda akan menyetujui SELURUH ${allPendingItems.length} usulan yang sedang diajukan sekaligus.\n\nLanjutkan persetujuan semua?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      const allIds = allPendingItems.map((i) => i.id);
      const ok = await bulkApprove(allIds, verifikatorName);
      if (ok) {
        setSelectedIds([]);
        if (detailItem) setDetailItem(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Decision Modal
  const openDecisionModal = (
    item: SHSItem,
    type: "disetujui" | "perlu_perbaikan"
  ) => {
    setSelectedItem(item);
    setActionType(type);
    setCatatan("");
  };

  // Confirm Single Action
  const handleConfirmDecision = async () => {
    if (!selectedItem || !actionType) return;
    if (actionType === "perlu_perbaikan" && !catatan.trim()) {
      toast({
        title: "Catatan Perbaikan Wajib Diisi",
        description: "Harap berikan catatan telaah alasan perbaikan agar pengusul dapat merevisi usulan ini.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await verifyItem(selectedItem.id, actionType, catatan, verifikatorName);
      if (ok) {
        setSelectedItem(null);
        setActionType(null);
        if (detailItem && detailItem.id === selectedItem.id) {
          setDetailItem(null);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-enter-from-bottom">
      {/* Header & Sub-Nav Antrean */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck size={16} />
            </div>
            Panel Verifikasi Standar Harga Satuan (SHS)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Telaah spesifikasi barang, kesesuaian kode rekening, bukti e-katalog LKPP, dan tetapkan keputusan verifikasi.
          </p>
        </div>

        {/* Tab Antrean */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveQueue("pending");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeQueue === "pending"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Antrean Masuk ({allPendingItems.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveQueue("approved");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeQueue === "approved"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Disetujui ({items.filter((i) => i.status === "disetujui").length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveQueue("revision");
              setSelectedIds([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeQueue === "revision"
                ? "bg-white text-orange-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Perlu Perbaikan ({items.filter((i) => i.status === "perlu_perbaikan").length})
          </button>

          {items.some((i) => i.status === "ditolak") && (
            <button
              type="button"
              onClick={() => {
                setActiveQueue("rejected");
                setSelectedIds([]);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeQueue === "rejected"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ditolak ({items.filter((i) => i.status === "ditolak").length})
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar & Tombol SETUJUI SEMUA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari dalam antrean verifikasi (nama barang, rekening, unit)..."
            className="pl-9 bg-slate-50 border-slate-200 text-xs h-10 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none h-10 max-w-[220px]"
          >
            <option value="all">Semua Unit / Puskesmas</option>
            {unitList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 font-medium text-slate-700 outline-none h-10 cursor-pointer hover:bg-slate-100 transition-colors"
              title="Urutkan antrean verifikasi"
            >
              <option value="default">Urutkan: Standar</option>
              <option value="uraian_asc">Uraian: A → Z (Nama)</option>
              <option value="uraian_desc">Uraian: Z → A (Nama)</option>
              <option value="total_desc">Total: Besar → Kecil</option>
              <option value="total_asc">Total: Kecil → Besar</option>
            </select>
            <ArrowUpDown size={12} className="absolute left-2.5 top-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Tombol SETUJUI TERPILIH (Checkbox) */}
          {activeQueue === "pending" && selectedIds.length > 0 && (
            <Button
              size="sm"
              onClick={handleBulkApproveSelected}
              disabled={isSubmitting}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-3.5 rounded-xl shadow-xs"
            >
              <CheckCircle2 size={14} />
              Setujui ({selectedIds.length}) Terpilih
            </Button>
          )}

          {/* TOMBOL SETUJUI SEMUA USULAN MASUK */}
          {activeQueue === "pending" && allPendingItems.length > 0 && (
            <Button
              size="sm"
              onClick={handleApproveAllPending}
              disabled={isSubmitting}
              className="gap-2 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold h-10 px-4 rounded-xl shadow-sm"
              title="Setujui seluruh usulan yang sedang berada dalam antrean masuk"
            >
              <CheckCheck size={16} />
              Setujui Semua ({allPendingItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Sub-Filter Pills Khusus Antrean Masuk */}
      {activeQueue === "pending" && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => setSubQueueFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              subQueueFilter === "all"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semua Antrean Masuk ({allPendingItems.length})
          </button>
          <button
            type="button"
            onClick={() => setSubQueueFilter("needs_action")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              subQueueFilter === "needs_action"
                ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50"
            }`}
          >
            <Clock size={13} />
            Perlu Persetujuan Saya ({needsMyActionItems.length})
            {needsMyActionItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubQueueFilter("revisi_only")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              subQueueFilter === "revisi_only"
                ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50/50"
            }`}
          >
            <Sparkles size={13} className={subQueueFilter === "revisi_only" ? "text-white" : "text-teal-600"} />
            Selesai Diperbaiki ({revisedPendingItems.length})
            {revisedPendingItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-teal-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubQueueFilter("waiting_partner")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              subQueueFilter === "waiting_partner"
                ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserCheck size={13} />
            Menunggu {partnerRoleName} ({waitingPartnerItems.length})
          </button>
        </div>
      )}

      {/* Tabel Antrean */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {queueItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileCheck size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {activeQueue === "pending"
                ? subQueueFilter === "needs_action"
                  ? "Hebat! Semua usulan yang membutuhkan persetujuan Anda sudah selesai ditelaah"
                  : subQueueFilter === "waiting_partner"
                  ? `Tidak ada usulan yang sedang menunggu ${partnerRoleName}`
                  : "Tidak ada usulan dalam antrean verifikasi"
                : "Tidak ada data pada tab ini"}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Seluruh usulan yang diajukan oleh Puskesmas dan Bidang akan tampil di sini untuk ditelaah.
            </p>
          </div>
        ) : (
          <div>
            {/* Indikator Panduan Navigasi Tabel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                <FileCheck size={14} className="text-blue-600" />
                Menampilkan {queueItems.length === 0 ? 0 : startIndex + 1} - {endIndex} dari {queueItems.length} usulan dalam antrean verifikasi
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedIds.length > 0 && selectedIds.length < queueItems.length && (
                  <button
                    type="button"
                    onClick={selectAllQueueItems}
                    className="text-blue-700 underline text-[11px] font-semibold hover:text-blue-900 cursor-pointer"
                  >
                    Pilih semua ({queueItems.length}) antrean
                  </button>
                )}
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-slate-500 hover:text-slate-800 text-[11px] hover:underline cursor-pointer"
                  >
                    Batal Pilih ({selectedIds.length})
                  </button>
                )}
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  💡 Tombol keputusan disematkan permanen di sisi kanan
                </span>
              </div>
            </div>

            <div className="overflow-x-auto pb-1 scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[1150px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                  <tr>
                    {activeQueue === "pending" && (
                      <th className="py-3 px-3 w-10 text-center whitespace-nowrap">
                        <Checkbox
                          checked={isAllCurrentPageSelected}
                          onCheckedChange={toggleSelectCurrentPage}
                          aria-label="Pilih semua antrean di halaman ini"
                        />
                      </th>
                    )}
                    <th
                      className="py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group whitespace-nowrap min-w-[200px]"
                      onClick={handleToggleSortUraian}
                      title="Klik untuk mengurutkan A-Z / Z-A"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Uraian Barang &amp; Spek</span>
                        {sortBy === "uraian_asc" ? (
                          <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded shadow-2xs">
                            A→Z <ArrowUp size={11} />
                          </span>
                        ) : sortBy === "uraian_desc" ? (
                          <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded shadow-2xs">
                            Z→A <ArrowDown size={11} />
                          </span>
                        ) : (
                          <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap min-w-[140px]">Unit Pengusul</th>
                    <th className="py-3 px-3 whitespace-nowrap min-w-[200px]">Kode &amp; Rekening</th>
                    <th
                      className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors select-none group whitespace-nowrap min-w-[110px]"
                      onClick={handleToggleSortTotal}
                      title="Klik untuk mengurutkan Total Nilai (Besar ke Kecil / Kecil ke Besar)"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Total (Rp)</span>
                        {sortBy === "total_desc" ? (
                          <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded shadow-2xs">
                            Besar→Kecil <ArrowDown size={11} />
                          </span>
                        ) : sortBy === "total_asc" ? (
                          <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded shadow-2xs">
                            Kecil→Besar <ArrowUp size={11} />
                          </span>
                        ) : (
                          <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap min-w-[140px]">E-Katalog LKPP</th>
                    <th className="py-3 px-3 whitespace-nowrap min-w-[160px]">Status 2 Verifikator</th>
                    <th className="py-3 px-4 text-right sticky right-0 z-20 bg-slate-50 border-l border-slate-200 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[270px]">
                      Aksi Keputusan &amp; Detail
                    </th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedQueueItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const dualInfo = getDualStatusInfo(item);
                  const isMyApproved = isPengurusBarang ? dualInfo.pengurusApproved : dualInfo.adminApproved;
                  const isPartnerApproved = isPengurusBarang ? dualInfo.adminApproved : dualInfo.pengurusApproved;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isChecked ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {activeQueue === "pending" && (
                        <td className="py-3 px-3 text-center">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelect(item.id)}
                            aria-label={`Pilih ${item.uraian}`}
                          />
                        </td>
                      )}

                      {/* Uraian & Spek */}
                      <td className="py-3 px-3 min-w-[200px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 leading-snug break-words">{item.uraian}</span>
                          {(item.status === "diperbaiki" || item.is_revisi) && (
                            <Badge className="bg-teal-100 text-teal-900 border-teal-300 font-bold text-[10px] gap-1 px-1.5 py-0 shadow-2xs">
                              <Sparkles size={11} className="text-teal-600" /> Selesai Diperbaiki (Revisi #{item.revisi_ke || 1})
                            </Badge>
                          )}
                        </div>
                        {item.catatan_perbaikan && (
                          <div className="mt-1 p-1.5 bg-teal-50 border border-teal-200/80 rounded-md text-[10px] text-teal-950 font-medium leading-tight">
                            <span className="font-bold block text-teal-800">Catatan Perbaikan:</span>
                            {item.catatan_perbaikan}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{item.spek}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Satuan: <strong className="text-slate-700">{item.satuan}</strong>
                        </div>
                      </td>

                      {/* Unit Pengusul */}
                      <td className="py-3 px-3 min-w-[140px]">
                        <div className="font-semibold text-slate-800 leading-snug break-words">
                          {item.unit_kerja}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.nama_pengusul} • TA {item.tahun}
                        </div>
                      </td>

                      {/* Kode & Rekening */}
                      <td className="py-3 px-3 min-w-[200px]">
                        <div className="space-y-1.5">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">
                              Kategori BMD
                            </div>
                            <div
                              className="font-mono text-[11px] font-bold text-blue-700 leading-snug break-words"
                              title={formatKategoriWithNama(item.kode_kategori, item.kategori_nama)}
                            >
                              {formatKategoriWithNama(item.kode_kategori, item.kategori_nama)}
                            </div>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">
                              Rekening Belanja
                            </div>
                            <div
                              className="font-mono text-[10px] text-slate-700 font-medium leading-snug break-words"
                              title={formatRekeningWithUraian(item.rekening_1)}
                            >
                              {formatRekeningWithUraian(item.rekening_1)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap min-w-[110px]">
                        {formatRupiah(item.total)}
                        {item.ongkir > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            (+Ongkir: {formatRupiah(item.ongkir)})
                          </div>
                        )}
                      </td>

                      {/* E-Katalog */}
                      <td className="py-3 px-3 min-w-[140px]">
                        <div className="space-y-0.5">
                          <a
                            href={item.link_katalog_1}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold truncate text-[11px]"
                          >
                            <span>Katalog 1 ({item.tkdn_1}%)</span>
                            <ExternalLink size={10} />
                          </a>
                          {item.link_katalog_2 && (
                            <a
                              href={item.link_katalog_2}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:underline flex items-center gap-1 truncate text-[10px]"
                            >
                              <span>Katalog 2 ({item.tkdn_2 || 0}%)</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                          {item.link_katalog_3 && (
                            <a
                              href={item.link_katalog_3}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:underline flex items-center gap-1 truncate text-[10px]"
                            >
                              <span>Katalog 3 ({item.tkdn_3 || 0}%)</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Status 2 Verifikator (Admin & Pengurus Barang) */}
                      <td className="py-3 px-3 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-500 font-medium w-16">Admin:</span>
                            {dualInfo.adminApproved ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                <CheckCircle2 size={10} /> Disetujui
                              </span>
                            ) : dualInfo.adminStatus === "perlu_perbaikan" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px]">
                                <AlertCircle size={10} /> Revisi
                              </span>
                            ) : dualInfo.adminStatus === "ditolak" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                <XCircle size={10} /> Ditolak
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium text-[10px]">
                                <Clock size={10} /> Belum
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-500 font-medium w-16">Pengurus:</span>
                            {dualInfo.pengurusApproved ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                <CheckCircle2 size={10} /> Disetujui
                              </span>
                            ) : dualInfo.pengurusStatus === "perlu_perbaikan" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px]">
                                <AlertCircle size={10} /> Revisi
                              </span>
                            ) : dualInfo.pengurusStatus === "ditolak" ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                <XCircle size={10} /> Ditolak
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium text-[10px]">
                                <Clock size={10} /> Belum
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Aksi Keputusan & Detail (Sticky Right) */}
                      <td className="py-3 px-4 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-200 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.08)] whitespace-nowrap min-w-[270px]">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailItem(item)}
                            className="h-8 px-2.5 text-xs text-blue-700 border-blue-200 bg-blue-50/70 hover:bg-blue-100 gap-1 rounded-lg shrink-0 font-medium"
                            title="Lihat rincian lengkap & linimasa"
                          >
                            <Eye size={13} /> Detail
                          </Button>

                          {activeQueue === "pending" ? (
                            isMyApproved ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                                  <CheckCircle2 size={12} /> Anda Setuju (1/2)
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openDecisionModal(item, "perlu_perbaikan")}
                                  className="h-8 px-2 text-[11px] text-slate-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg shrink-0"
                                  title="Ubah keputusan verifikasi jika diperlukan"
                                >
                                  Ubah
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => openDecisionModal(item, "disetujui")}
                                  className={`h-8 px-2.5 text-xs text-white font-semibold gap-1 rounded-lg shrink-0 ${
                                    isPartnerApproved
                                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xs ring-2 ring-emerald-300"
                                      : "bg-emerald-600 hover:bg-emerald-700"
                                  }`}
                                  title={
                                    isPartnerApproved
                                      ? "Persetujuan Anda akan menjadikan usulan ini Disetujui Penuh 2/2"
                                      : "Setujui usulan ini (1/2)"
                                  }
                                >
                                  <CheckCircle2 size={12} />
                                  {isPartnerApproved ? "Setujui Final (2/2)" : "Setujui"}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDecisionModal(item, "perlu_perbaikan")}
                                  className="h-8 px-2.5 text-xs border-orange-300 text-orange-800 bg-orange-50 hover:bg-orange-100 gap-1 rounded-lg font-medium shrink-0"
                                  title="Kembalikan usulan ke pengusul disertai catatan perbaikan"
                                >
                                  <AlertCircle size={12} /> Perlu Perbaikan
                                </Button>
                              </>
                            )
                          ) : (
                            <div className="text-right">
                              <div className="text-[11px] font-bold text-slate-800">
                                {dualInfo.label}
                              </div>
                              {formatDisplayCatatan(item) !== "-" && (
                                <div className="text-[10px] text-slate-600 italic line-clamp-1 max-w-[200px] mt-0.5" title={formatDisplayCatatan(item)}>
                                  &quot;{formatDisplayCatatan(item)}&quot;
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Oleh: {item.verifikator_name || "Admin & Pengurus Barang"}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-600">
              <span>
                Menampilkan <b>{queueItems.length === 0 ? 0 : startIndex + 1}</b> - <b>{endIndex}</b> dari <b>{queueItems.length}</b> usulan
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 text-[11px]">Per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 text-xs bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-7 w-7 p-0"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft size={13} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={13} />
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {getPageNumbers().map((p, idx) =>
                    typeof p === "number" ? (
                      <Button
                        key={`page-${p}`}
                        type="button"
                        size="sm"
                        variant={p === safeCurrentPage ? "default" : "outline"}
                        onClick={() => setCurrentPage(p)}
                        className={`h-7 min-w-[28px] px-1.5 text-[11px] font-semibold ${
                          p === safeCurrentPage
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {p}
                      </Button>
                    ) : (
                      <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-mono">
                        ...
                      </span>
                    )
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 w-7 p-0"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={13} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-7 w-7 p-0"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight size={13} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

      {/* MODAL LIHAT DETAIL LENGKAP USULAN */}
      <Dialog open={Boolean(detailItem)} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl">
          {detailItem && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getStatusBadge(detailItem.status)}
                  <span className="text-xs text-slate-400">
                    Diajukan pada: {formatDate(detailItem.created_at)}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug break-words">
                  {detailItem.uraian}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 break-words">
                  {detailItem.unit_kerja} • Pengusul: {detailItem.nama_pengusul} • TA {detailItem.tahun}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs w-full max-w-full overflow-hidden">
                {/* Linimasa Alur Pengusulan & Verifikasi Lengkap */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl w-full max-w-full overflow-hidden">
                  <SHSTimeline item={detailItem} />
                </div>

                {/* Catatan Perbaikan Pengusul */}
                {detailItem.catatan_perbaikan && (
                  <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900 uppercase tracking-wider">
                      <Sparkles size={14} className="text-teal-600" />
                      Catatan Perbaikan dari Pengusul (Revisi #{detailItem.revisi_ke || 1})
                    </div>
                    <p className="text-teal-950 leading-relaxed whitespace-pre-wrap break-words text-xs">
                      {detailItem.catatan_perbaikan}
                    </p>
                  </div>
                )}

                {/* Spesifikasi Teknis */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-600 shrink-0" />
                    Spesifikasi Teknis Lengkap
                  </div>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap break-words text-xs bg-white p-3 rounded-lg border border-slate-200 font-sans">
                    {detailItem.spek || "Tidak ada rincian spesifikasi tambahan."}
                  </p>
                </div>

                {/* Rincian Harga & Pagu */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Harga Satuan Dasar</div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {formatRupiah(detailItem.harga)}
                    </div>
                    <div className="text-[10px] text-slate-400">per {detailItem.satuan}</div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Ongkos Kirim</div>
                    <div className="text-sm font-bold text-slate-700 font-mono mt-0.5">
                      {formatRupiah(detailItem.ongkir)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {detailItem.ongkir > 0 ? "Termasuk dalam usulan" : "Bebas ongkir (0)"}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 min-w-0">
                    <div className="text-[10px] text-emerald-800 uppercase font-bold">Total Standar Harga</div>
                    <div className="text-base font-black text-emerald-800 font-mono mt-0.5">
                      {formatRupiah(detailItem.total)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">Harga Satuan + Ongkir</div>
                  </div>
                </div>

                {/* Kategori, Satuan, Kelompok */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Kode Kategori BMD (Kepmendagri)</div>
                    <div className="font-mono font-bold text-blue-700 text-xs leading-relaxed break-words">
                      {formatKategoriWithNama(detailItem.kode_kategori, detailItem.kategori_nama)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Satuan & Kelompok</div>
                    <div className="font-bold text-slate-800 text-xs break-words">Satuan: {detailItem.satuan}</div>
                    <div className="text-slate-600 break-words">Kelompok: {detailItem.kelompok}</div>
                  </div>
                </div>

                {/* Rekening Belanja */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Kode Rekening Belanja (Permendagri 90)
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-slate-800 p-2 bg-white rounded-lg border border-slate-200 break-words">
                      <strong className="text-blue-700 mr-2">Rekening 1 (Wajib):</strong> {formatRekeningWithUraian(detailItem.rekening_1)}
                    </div>
                    {detailItem.rekening_2 && (
                      <div className="text-slate-800 p-2 bg-white rounded-lg border border-slate-200 break-words">
                        <strong className="text-blue-700 mr-2">Rekening 2:</strong> {formatRekeningWithUraian(detailItem.rekening_2)}
                      </div>
                    )}
                    {detailItem.rekening_3 && (
                      <div className="text-slate-800 p-2 bg-white rounded-lg border border-slate-200 break-words">
                        <strong className="text-blue-700 mr-2">Rekening 3:</strong> {formatRekeningWithUraian(detailItem.rekening_3)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tautan E-Katalog & TKDN */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between flex-wrap gap-1">
                    <span>Tautan E-Katalog LKPP & Bukti Harga</span>
                    <span className="text-[10px] text-slate-400 font-normal">Klik untuk memeriksa halaman katalog resmi</span>
                  </div>

                  <div className="space-y-2">
                    {/* Katalog 1 */}
                    <div className="p-3 bg-white rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-blue-900 text-xs mb-0.5">Tautan Katalog Utama (1):</div>
                        <a
                          href={detailItem.link_katalog_1}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-xs max-w-full group"
                          title={detailItem.link_katalog_1}
                        >
                          <span className="truncate max-w-[260px] sm:max-w-md block">
                            {detailItem.link_katalog_1}
                          </span>
                          <ExternalLink size={12} className="shrink-0 text-blue-500 group-hover:text-blue-700" />
                        </a>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 shrink-0 font-mono text-xs py-1 self-start sm:self-center">
                        TKDN: {detailItem.tkdn_1}%
                      </Badge>
                    </div>

                    {/* Katalog 2 */}
                    {detailItem.link_katalog_2 && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-700 text-xs mb-0.5">Tautan Pembanding 1 (2):</div>
                          <a
                            href={detailItem.link_katalog_2}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-xs max-w-full group"
                            title={detailItem.link_katalog_2}
                          >
                            <span className="truncate max-w-[260px] sm:max-w-md block">
                              {detailItem.link_katalog_2}
                            </span>
                            <ExternalLink size={12} className="shrink-0 text-blue-500 group-hover:text-blue-700" />
                          </a>
                        </div>
                        {detailItem.tkdn_2 !== undefined && (
                          <Badge variant="outline" className="shrink-0 font-mono text-xs py-1 self-start sm:self-center">
                            TKDN: {detailItem.tkdn_2}%
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Katalog 3 */}
                    {detailItem.link_katalog_3 && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-700 text-xs mb-0.5">Tautan Pembanding 2 (3):</div>
                          <a
                            href={detailItem.link_katalog_3}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-xs max-w-full group"
                            title={detailItem.link_katalog_3}
                          >
                            <span className="truncate max-w-[260px] sm:max-w-md block">
                              {detailItem.link_katalog_3}
                            </span>
                            <ExternalLink size={12} className="shrink-0 text-blue-500 group-hover:text-blue-700" />
                          </a>
                        </div>
                        {detailItem.tkdn_3 !== undefined && (
                          <Badge variant="outline" className="shrink-0 font-mono text-xs py-1 self-start sm:self-center">
                            TKDN: {detailItem.tkdn_3}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Telaah 2 Verifikator (Admin Dinkes & Pengurus Barang) */}
                {(() => {
                  const detailDual = getDualStatusInfo(detailItem);
                  return (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Pemeriksaan 2 Verifikator</span>
                        <Badge className={`${detailDual.badgeClass} font-bold text-[10px]`}>
                          {detailDual.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Admin Dinkes */}
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-800">1. Admin Dinkes</span>
                            {detailDual.adminApproved ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 size={12} /> Disetujui
                              </span>
                            ) : detailDual.adminStatus === "perlu_perbaikan" ? (
                              <span className="text-orange-700 font-bold flex items-center gap-1 text-[11px]">
                                <AlertCircle size={12} /> Revisi
                              </span>
                            ) : detailDual.adminStatus === "ditolak" ? (
                              <span className="text-rose-700 font-bold flex items-center gap-1 text-[11px]">
                                <XCircle size={12} /> Ditolak
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                                <Clock size={12} /> Belum Telaah
                              </span>
                            )}
                          </div>
                          {detailDual.adminCatatan && (
                            <div className="mt-1 text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded">
                              &quot;{detailDual.adminCatatan}&quot;
                            </div>
                          )}
                        </div>

                        {/* Pengurus Barang */}
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-800">2. Pengurus Barang</span>
                            {detailDual.pengurusApproved ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 size={12} /> Disetujui
                              </span>
                            ) : detailDual.pengurusStatus === "perlu_perbaikan" ? (
                              <span className="text-orange-700 font-bold flex items-center gap-1 text-[11px]">
                                <AlertCircle size={12} /> Revisi
                              </span>
                            ) : detailDual.pengurusStatus === "ditolak" ? (
                              <span className="text-rose-700 font-bold flex items-center gap-1 text-[11px]">
                                <XCircle size={12} /> Ditolak
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
                                <Clock size={12} /> Belum Telaah
                              </span>
                            )}
                          </div>
                          {detailDual.pengurusCatatan && (
                            <div className="mt-1 text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded">
                              &quot;{detailDual.pengurusCatatan}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons Inside Detail Modal */}
              <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailItem(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>

                {detailItem.status === "diajukan" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openDecisionModal(detailItem, "disetujui")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                    >
                      <CheckCircle2 size={13} /> Setujui Usulan Ini
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openDecisionModal(detailItem, "perlu_perbaikan")}
                      className="text-xs border-orange-300 text-orange-800 bg-orange-50 hover:bg-orange-100 gap-1.5 font-medium"
                      title="Kembalikan usulan ke pengusul disertai catatan perbaikan"
                    >
                      <AlertCircle size={13} /> Perlu Perbaikan
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Keputusan Verifikasi Tunggal */}
      <Dialog open={Boolean(selectedItem && actionType)} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl overflow-x-hidden">
          {selectedItem && actionType && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {actionType === "disetujui" && (
                    <span className="text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 size={18} /> Konfirmasi Persetujuan Usulan
                    </span>
                  )}
                  {actionType === "perlu_perbaikan" && (
                    <span className="text-orange-600 flex items-center gap-1.5">
                      <AlertCircle size={18} /> Kembalikan untuk Perbaikan
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 break-words">
                  {selectedItem.uraian} — {selectedItem.unit_kerja}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Penjelasan Aturan 2 Verifikator saat menyetujui */}
                {actionType === "disetujui" && (() => {
                  const dual = getDualStatusInfo(selectedItem);
                  const isPartnerApproved = isPengurusBarang ? dual.adminApproved : dual.pengurusApproved;

                  return (
                    <div
                      className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        isPartnerApproved
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : "bg-amber-50 border-amber-300 text-amber-950"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        <ShieldCheck size={14} className={isPartnerApproved ? "text-emerald-700" : "text-amber-700"} />
                        Ketentuan 2 Verifikator (Admin Dinkes & Pengurus Barang)
                      </div>
                      {isPartnerApproved ? (
                        <div>
                          ✓ <strong>{partnerRoleName}</strong> telah menyetujui usulan ini. Persetujuan dari Anda akan menjadikan usulan ini <strong>DISETUJUI PENUH (2/2)</strong> secara resmi.
                        </div>
                      ) : (
                        <div>
                          Persetujuan Anda akan dicatat sebagai <strong>1/2 persetujuan</strong> ({verifikatorName}). Usulan tetap berstatus Diajukan hingga diverifikasi dan disetujui juga oleh <strong>{partnerRoleName}</strong>.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Penjelasan saat Perlu Perbaikan */}
                {actionType === "perlu_perbaikan" && (
                  <div className="p-3 rounded-xl border border-orange-200 bg-orange-50/70 text-orange-950 text-xs leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-orange-800">
                      <AlertCircle size={14} className="text-orange-600" />
                      Pengembalian Berkas Usulan ke Unit Pengusul
                    </div>
                    <div>
                      Usulan akan dialihkan kembali ke status <strong>Perlu Perbaikan</strong> agar pengusul di {selectedItem.unit_kerja} dapat mengedit spesifikasi, rekening, atau bukti katalog sesuai catatan Anda.
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div>
                    <strong>Total Standar Harga:</strong> {formatRupiah(selectedItem.total)} / {selectedItem.satuan}
                  </div>
                  <div>
                    <strong>Kategori BMD:</strong> {formatKategoriWithNama(selectedItem.kode_kategori, selectedItem.kategori_nama)}
                  </div>
                  <div>
                    <strong>Rekening:</strong> {formatRekeningWithUraian(selectedItem.rekening_1)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="catatan_verifikasi" className="text-xs font-semibold text-slate-700">
                    {actionType === "perlu_perbaikan" ? (
                      <span>
                        Catatan Telaah Perbaikan <span className="text-red-500 font-bold">* (Wajib diisi)</span>
                      </span>
                    ) : (
                      <span>Catatan Telaah (Opsional)</span>
                    )}
                  </Label>
                  <Textarea
                    id="catatan_verifikasi"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder={
                      actionType === "disetujui"
                        ? "Catatan telaah opsional (misal: Sesuai spesifikasi e-katalog LKPP)..."
                        : "Tuliskan rincian perbaikan atau kelengkapan yang harus direvisi oleh pengusul..."
                    }
                    className="text-xs min-h-[95px] rounded-xl"
                    required={actionType === "perlu_perbaikan"}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleConfirmDecision}
                  className={`text-xs text-white font-semibold rounded-xl ${
                    actionType === "disetujui"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : actionType === "disetujui"
                    ? "Konfirmasi Setujui"
                    : "Kirim Catatan & Perlu Perbaikan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
