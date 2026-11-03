// src/components/SHS/SHSItemList.tsx
import { useState, useMemo, useEffect } from "react";
import { User } from "@/hooks/useSupabaseAuth";
import { SHSItem, SHSStatus } from "@/types/shs";
import {
  DAFTAR_UNIT_DINKES_PUSKESMAS,
  formatRekeningWithUraian,
  getRekeningUraian,
  formatKategoriWithNama,
  getKategoriNama,
} from "@/lib/shsMasterData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Send,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Building,
  Tag,
  Coins,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "@/components/ui/use-toast";
import {
  getDualStatusInfo,
  formatDisplayCatatan,
  isItemOwner,
  canEditItem,
  canDeleteItem,
  inferUnitFromUser,
} from "@/lib/shsVerificationHelper";
import { SHSTimeline } from "@/components/SHS/SHSTimeline";

interface SHSItemListProps {
  user: User | null;
  items: SHSItem[];
  isPeriodOpen: boolean;
  onEditItem: (item: SHSItem) => void;
  onDeleteItem: (id: string) => Promise<boolean>;
  onSubmitDrafts: (ids: string[]) => Promise<boolean>;
  onRefresh: () => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

const formatDate = (isoString: string) => {
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

const getStatusBadge = (status: SHSStatus, item?: SHSItem) => {
  if (item) {
    const dual = getDualStatusInfo(item);
    if (dual.stage === "diperbaiki" || status === "diperbaiki" || (item.is_revisi && status !== "disetujui" && status !== "perlu_perbaikan" && status !== "ditolak")) {
      const revNum = item?.revisi_ke || 1;
      return (
        <Badge className="bg-teal-100 text-teal-900 border-teal-300 font-semibold gap-1 text-[11px] shadow-2xs">
          <Sparkles size={12} className="text-teal-600" /> Selesai Diperbaiki (Revisi #{revNum})
        </Badge>
      );
    }
    if (dual.stage === "waiting_pengurus") {
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold gap-1 text-[11px]">
          <Clock size={12} /> {item.is_revisi ? `Selesai Diperbaiki (Revisi #${item.revisi_ke || 1}) - ` : ""}Menunggu Pengurus (1/2)
        </Badge>
      );
    }
    if (dual.stage === "waiting_admin") {
      return (
        <Badge className="bg-sky-100 text-sky-900 border-sky-300 font-semibold gap-1 text-[11px]">
          <Clock size={12} /> {item.is_revisi ? `Selesai Diperbaiki (Revisi #${item.revisi_ke || 1}) - ` : ""}Menunggu Admin (1/2)
        </Badge>
      );
    }
    if (dual.stage === "approved_full") {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1 text-[11px]">
          <CheckCircle2 size={12} /> Disetujui (2/2)
        </Badge>
      );
    }
    if (dual.stage === "pending_all") {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold gap-1 text-[11px]">
          <Clock size={12} /> Menunggu Verifikasi (0/2)
        </Badge>
      );
    }
  }

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
          <Sparkles size={12} className="text-teal-600" /> Selesai Diperbaiki
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

export const SHSItemList = ({
  user,
  items,
  isPeriodOpen,
  onEditItem,
  onDeleteItem,
  onSubmitDrafts,
  onRefresh,
  statusFilter,
  setStatusFilter,
}: SHSItemListProps) => {
  const isAdmin = user?.role === "admin";
  const isPengurusBarang =
    user?.role === "pengurus_barang" ||
    (user?.username || "").toLowerCase().startsWith("pengurus");
  const isVerifikator = isAdmin || isPengurusBarang;
  const userUnitName = inferUnitFromUser(user?.username);

  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState<
    "default" | "uraian_asc" | "uraian_desc" | "total_desc" | "total_asc" | "harga_desc" | "harga_asc"
  >("default");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeItemDetail, setActiveItemDetail] = useState<SHSItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Toggle sort helpers
  const handleToggleSortUraian = () => {
    setSortBy((prev) => (prev === "uraian_asc" ? "uraian_desc" : prev === "uraian_desc" ? "default" : "uraian_asc"));
  };

  const handleToggleSortTotal = () => {
    setSortBy((prev) => (prev === "total_desc" ? "total_asc" : prev === "total_asc" ? "default" : "total_desc"));
  };

  const handleToggleSortHarga = () => {
    setSortBy((prev) => (prev === "harga_desc" ? "harga_asc" : prev === "harga_asc" ? "default" : "harga_desc"));
  };

  // Filter & Sort items
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      // Filter status
      if (statusFilter !== "all") {
        const dual = getDualStatusInfo(item);
        if (statusFilter === "disetujui") {
          if (item.status !== "disetujui" && !(dual.adminApproved && dual.pengurusApproved)) return false;
        } else if (statusFilter === "disetujui_admin") {
          // Disetujui Admin Saja (1/2 - belum Pengurus Barang)
          if (!dual.adminApproved || dual.pengurusApproved) return false;
        } else if (statusFilter === "acc_admin") {
          // Semua yang disetujui Admin (baik 1/2 maupun 2/2)
          if (!dual.adminApproved) return false;
        } else if (statusFilter === "disetujui_pengurus") {
          // Disetujui Pengurus Barang Saja (1/2 - belum Admin)
          if (!dual.pengurusApproved || dual.adminApproved) return false;
        } else if (statusFilter === "acc_pengurus") {
          if (!dual.pengurusApproved) return false;
        } else if (statusFilter === "diajukan") {
          if ((item.status !== "diajukan" && item.status !== "diperbaiki") || dual.adminApproved || dual.pengurusApproved) return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }

      // Filter unit (hanya aktif untuk verifikator/admin yang melihat seluruh data)
      if (isVerifikator && unitFilter !== "all" && item.unit_kerja !== unitFilter) return false;

      // Filter search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchUraian = item.uraian.toLowerCase().includes(query);
        const matchKategori = item.kode_kategori.toLowerCase().includes(query) || (item.kategori_nama || "").toLowerCase().includes(query);
        const matchSpek = item.spek.toLowerCase().includes(query);
        const matchRekening = item.rekening_1.toLowerCase().includes(query);
        const matchUnit = item.unit_kerja.toLowerCase().includes(query);
        const matchPengusul = item.nama_pengusul.toLowerCase().includes(query);
        if (!matchUraian && !matchKategori && !matchSpek && !matchRekening && !matchUnit && !matchPengusul) {
          return false;
        }
      }

      return true;
    });

    if (sortBy === "uraian_asc") {
      list.sort((a, b) => (a.uraian || "").localeCompare(b.uraian || "", "id", { sensitivity: "base" }));
    } else if (sortBy === "uraian_desc") {
      list.sort((a, b) => (b.uraian || "").localeCompare(a.uraian || "", "id", { sensitivity: "base" }));
    } else if (sortBy === "total_desc") {
      list.sort((a, b) => {
        const totalA = a.total !== undefined && a.total !== null ? Number(a.total) : (Number(a.harga) || 0) + (Number(a.ongkir) || 0);
        const totalB = b.total !== undefined && b.total !== null ? Number(b.total) : (Number(b.harga) || 0) + (Number(b.ongkir) || 0);
        return totalB - totalA;
      });
    } else if (sortBy === "total_asc") {
      list.sort((a, b) => {
        const totalA = a.total !== undefined && a.total !== null ? Number(a.total) : (Number(a.harga) || 0) + (Number(a.ongkir) || 0);
        const totalB = b.total !== undefined && b.total !== null ? Number(b.total) : (Number(b.harga) || 0) + (Number(b.ongkir) || 0);
        return totalA - totalB;
      });
    } else if (sortBy === "harga_desc") {
      list.sort((a, b) => (Number(b.harga) || 0) - (Number(a.harga) || 0));
    } else if (sortBy === "harga_asc") {
      list.sort((a, b) => (Number(a.harga) || 0) - (Number(b.harga) || 0));
    }

    return list;
  }, [items, statusFilter, unitFilter, searchTerm, sortBy]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset page to 1 when filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, unitFilter, statusFilter, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredItems.length);

  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex]);

  // Items selectable for submission across all filtered items
  const submittableInFiltered = useMemo(() => {
    return filteredItems.filter((i) => i.status === "draft" || i.status === "perlu_perbaikan");
  }, [filteredItems]);

  // Items selectable for submission on the current page
  const submittableInCurrentPage = useMemo(() => {
    return paginatedItems.filter((i) => (isAdmin || isItemOwner(i, user)) && (i.status === "draft" || i.status === "perlu_perbaikan" || i.status === "ditolak"));
  }, [paginatedItems, isAdmin, user]);

  const isAllCurrentPageSelected =
    submittableInCurrentPage.length > 0 &&
    submittableInCurrentPage.every((item) => selectedIds.includes(item.id));

  const toggleSelectCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(submittableInCurrentPage.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const toAdd = submittableInCurrentPage.map((i) => i.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...toAdd])));
    }
  };

  const selectAllFiltered = () => {
    setSelectedIds(submittableInFiltered.map((i) => i.id));
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

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Bulk Submit
  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter((i) => selectedIds.includes(i.id));
    const hasNewDrafts = selectedItems.some((i) => i.status === "draft");

    if (hasNewDrafts && !isPeriodOpen && !isAdmin) {
      toast({
        title: "Batas Waktu Pengusulan Baru Berakhir",
        description: "Usulan baru (draft) tidak dapat diajukan karena periode pengusulan telah ditutup. Usulan perbaikan tetap dapat diajukan.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const ok = await onSubmitDrafts(selectedIds);
      if (ok) setSelectedIds([]);
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Single Delete
  const handleDelete = async (id: string, uraian: string) => {
    if (!window.confirm(`Yakin ingin menghapus usulan "${uraian}"?`)) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(id);
    } finally {
      setIsDeleting(false);
    }
  };

  // Ekspor Data Terfilter sesuai format kolom baku
  const handleExportFiltered = () => {
    if (filteredItems.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data yang dapat diekspor.",
        variant: "destructive",
      });
      return;
    }

    const exportRows = filteredItems.map((item) => {
      const numHarga = Number(item.harga) || 0;
      const numOngkir = Number(item.ongkir) || 0;
      const numTotal = item.total !== undefined ? Number(item.total) : numHarga + numOngkir;

      return {
        "kode_kategori": item.kode_kategori || "",
        "uraian": item.uraian || "",
        "spek": item.spek || "",
        "satuan": item.satuan || "",
        "harga": numHarga,
        "ongkir": numOngkir,
        "total (e+f)": numTotal,
        "rekening 1": item.rekening_1 || "",
        "rekening 2": item.rekening_2 || "",
        "rekening 3": item.rekening_3 || "",
        "kelompok": item.kelompok || "",
        "tahun": item.tahun || 2027,
        "Link Katalog 1": item.link_katalog_1 || "",
        "Link Katalog 2": item.link_katalog_2 || "",
        "Link Katalog 3": item.link_katalog_3 || "",
        "TKDN 1": Number(item.tkdn_1) || 0,
        "TKDN 2":
          item.tkdn_2 !== undefined && item.tkdn_2 !== null && (item.tkdn_2 as any) !== ""
            ? Number(item.tkdn_2)
            : "",
        "TKDN 3":
          item.tkdn_3 !== undefined && item.tkdn_3 !== null && (item.tkdn_3 as any) !== ""
            ? Number(item.tkdn_3)
            : "",
        "NAMA PENGUSUL": item.nama_pengusul || "",
        "PUSKESMAS/DINKES": item.unit_kerja || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);

    ws["!cols"] = [
      { wch: 22 }, // kode_kategori
      { wch: 36 }, // uraian
      { wch: 45 }, // spek
      { wch: 12 }, // satuan
      { wch: 16 }, // harga
      { wch: 14 }, // ongkir
      { wch: 18 }, // total (e+f)
      { wch: 22 }, // rekening 1
      { wch: 22 }, // rekening 2
      { wch: 22 }, // rekening 3
      { wch: 22 }, // kelompok
      { wch: 10 }, // tahun
      { wch: 38 }, // Link Katalog 1
      { wch: 28 }, // Link Katalog 2
      { wch: 28 }, // Link Katalog 3
      { wch: 12 }, // TKDN 1
      { wch: 12 }, // TKDN 2
      { wch: 12 }, // TKDN 3
      { wch: 22 }, // NAMA PENGUSUL
      { wch: 34 }, // PUSKESMAS/DINKES
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Daftar Usulan SHS");
    XLSX.writeFile(wb, `Ekspor_Usulan_SHS_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({
      title: "Ekspor Berhasil",
      description: `${exportRows.length} data usulan berhasil diunduh ke Excel.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              !isVerifikator
                ? `Cari usulan barang, rekening, spek milik ${userUnitName}...`
                : "Cari uraian barang, kode kategori, rekening, atau unit..."
            }
            className="pl-9 bg-slate-50 border-slate-200 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none h-9"
          >
            <option value="all">Semua Status</option>
            <option value="disetujui">Disetujui Penuh (2/2)</option>
            <option value="disetujui_admin">Disetujui Admin Saja (1/2)</option>
            <option value="acc_admin">Semua Disetujui Admin</option>
            <option value="disetujui_pengurus">Disetujui Pengurus Saja (1/2)</option>
            <option value="diajukan">Diajukan (Belum Diverifikasi)</option>
            <option value="diperbaiki">✨ Selesai Diperbaiki</option>
            <option value="perlu_perbaikan">Perlu Perbaikan</option>
            <option value="ditolak">Ditolak</option>
            <option value="draft">Draft</option>
          </select>

          {/* Unit Filter: Verifikator/Admin memilih semua unit, sedangkan Bidang terkunci ke bidangnya sendiri */}
          {isVerifikator ? (
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none h-9 max-w-[200px]"
            >
              <option value="all">Semua Unit / Faskes</option>
              {DAFTAR_UNIT_DINKES_PUSKESMAS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-semibold h-9 shadow-2xs">
              <Building size={14} className="text-blue-600 shrink-0" />
              <span className="truncate max-w-[220px]" title={userUnitName}>
                {userUnitName}
              </span>
            </div>
          )}

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 font-medium text-slate-700 outline-none h-9 cursor-pointer hover:bg-slate-100 transition-colors"
              title="Urutkan daftar usulan"
            >
              <option value="default">Urutkan: Standar</option>
              <option value="uraian_asc">Uraian: A → Z (Nama)</option>
              <option value="uraian_desc">Uraian: Z → A (Nama)</option>
              <option value="total_desc">Total: Besar → Kecil</option>
              <option value="total_asc">Total: Kecil → Besar</option>
              <option value="harga_desc">Harga: Besar → Kecil</option>
              <option value="harga_asc">Harga: Kecil → Besar</option>
            </select>
            <ArrowUpDown size={12} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-1.5 text-xs h-9"
            title="Muat Ulang"
          >
            <RefreshCw size={14} />
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleExportFiltered}
            className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            title="Ekspor daftar ini ke format Excel resmi"
          >
            <Download size={14} />
            Ekspor Excel
          </Button>
        </div>
      </div>

      {/* Active Filter & Sort Chips */}
      {(sortBy !== "default" || searchTerm || statusFilter !== "all" || unitFilter !== "all") && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>Ditemukan <strong>{filteredItems.length}</strong> usulan</span>
            {sortBy !== "default" && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                Urutan: {sortBy === "uraian_asc" ? "Uraian A → Z" : sortBy === "uraian_desc" ? "Uraian Z → A" : sortBy === "total_desc" ? "Total Besar → Kecil" : sortBy === "total_asc" ? "Total Kecil → Besar" : sortBy === "harga_desc" ? "Harga Besar → Kecil" : "Harga Kecil → Besar"}
                <button
                  type="button"
                  onClick={() => setSortBy("default")}
                  className="hover:text-blue-900 ml-0.5"
                  title="Reset urutan"
                >
                  <XCircle size={12} />
                </button>
              </span>
            )}
            {isVerifikator && unitFilter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                Unit: {unitFilter}
                <button type="button" onClick={() => setUnitFilter("all")}>
                  <XCircle size={12} />
                </button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter("all")}>
                  <XCircle size={12} />
                </button>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setUnitFilter("all");
              setSortBy("default");
            }}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold"
          >
            Reset Semua
          </button>
        </div>
      )}

      {/* Bulk Action Bar (jika ada terpilih) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-blue-900">
              {selectedIds.length} usulan terpilih
            </span>
            {selectedIds.length < submittableInFiltered.length && (
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-blue-700 underline text-xs font-semibold hover:text-blue-900 cursor-pointer"
              >
                Pilih semua ({submittableInFiltered.length}) usulan yang dapat diajukan
              </button>
            )}
            <button
              type="button"
              onClick={clearSelection}
              className="text-slate-500 hover:text-slate-800 text-xs ml-1 hover:underline cursor-pointer"
            >
              Batalkan Pilihan
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleBulkSubmit}
            disabled={isSubmittingBulk || (!isPeriodOpen && !isAdmin)}
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8"
          >
            <Send size={13} />
            Ajukan {selectedIds.length} Usulan Terpilih
          </Button>
        </div>
      )}

      {/* Tabel Data Usulan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileSpreadsheet size={28} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Tidak ada usulan ditemukan</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchTerm || statusFilter !== "all"
                ? "Tidak ada item yang cocok dengan filter atau kata kunci pencarian."
                : "Belum ada usulan yang diinput. Klik tab 'Input Usulan Baru' atau 'Import Excel' untuk memulai."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pb-1 scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[1050px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center whitespace-nowrap">
                    {submittableInCurrentPage.length > 0 ? (
                      <Checkbox
                        checked={isAllCurrentPageSelected}
                        onCheckedChange={toggleSelectCurrentPage}
                        aria-label="Pilih semua di halaman ini"
                      />
                    ) : (
                      <span className="sr-only">Pilih</span>
                    )}
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group whitespace-nowrap min-w-[200px]"
                    onClick={handleToggleSortUraian}
                    title="Klik untuk mengurutkan A-Z / Z-A"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Uraian Barang & Spek</span>
                      {sortBy === "uraian_asc" ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                          A→Z <ArrowUp size={11} />
                        </span>
                      ) : sortBy === "uraian_desc" ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                          Z→A <ArrowDown size={11} />
                        </span>
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[180px]">Kategori & Rekening</th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[80px]">Satuan</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors select-none group whitespace-nowrap min-w-[110px]"
                    onClick={handleToggleSortHarga}
                    title="Klik untuk mengurutkan Harga Satuan"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Harga Satuan</span>
                      {sortBy === "harga_desc" ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                          Besar <ArrowDown size={11} />
                        </span>
                      ) : sortBy === "harga_asc" ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                          Kecil <ArrowUp size={11} />
                        </span>
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors select-none group whitespace-nowrap min-w-[110px]"
                    onClick={handleToggleSortTotal}
                    title="Klik untuk mengurutkan Total Nilai (Besar ke Kecil / Kecil ke Besar)"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total (Rp)</span>
                      {sortBy === "total_desc" ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                          Besar→Kecil <ArrowDown size={11} />
                        </span>
                      ) : sortBy === "total_asc" ? (
                        <span className="inline-flex items-center gap-0.5 text-blue-700 font-bold text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">
                          Kecil→Besar <ArrowUp size={11} />
                        </span>
                      ) : (
                        <ArrowUpDown size={11} className="text-slate-400 group-hover:text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 whitespace-nowrap min-w-[140px]">Unit / Pengusul</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap min-w-[130px]">Status</th>
                  <th className="py-3 px-3 text-right sticky right-0 z-20 bg-slate-50 border-l border-slate-200 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] whitespace-nowrap min-w-[120px]">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map((item) => {
                  const isOwner = isItemOwner(item, user);
                  const canEdit = canEditItem(item, user);
                  const canDelete = canDeleteItem(item, user);
                  const isSubmittable =
                    (isAdmin || isOwner) &&
                    (item.status === "draft" || item.status === "perlu_perbaikan" || item.status === "ditolak");
                  const isChecked = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isChecked ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        {isSubmittable && (
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                            aria-label={`Pilih ${item.uraian}`}
                          />
                        )}
                      </td>

                      {/* Uraian & Spek */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-slate-900 line-clamp-1">{item.uraian}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.spek}</div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {item.link_katalog_1 && (
                            <a
                              href={item.link_katalog_1}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition-colors"
                              title="Buka Tautan Katalog 1"
                            >
                              Katalog 1 <ExternalLink size={9} />
                            </a>
                          )}
                          {item.link_katalog_2 && (
                            <a
                              href={item.link_katalog_2}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-colors"
                              title="Buka Tautan Katalog 2"
                            >
                              Katalog 2 <ExternalLink size={9} />
                            </a>
                          )}
                          {item.link_katalog_3 && (
                            <a
                              href={item.link_katalog_3}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-colors"
                              title="Buka Tautan Katalog 3"
                            >
                              Katalog 3 <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                        {item.status === "perlu_perbaikan" && item.catatan_verifikator && (
                          <div className="mt-2 p-2 bg-amber-50/90 border border-amber-300 rounded-lg text-amber-950 text-[11px] leading-relaxed shadow-2xs">
                            <div className="flex items-center gap-1 font-bold text-amber-800 text-[10px] uppercase tracking-wider mb-0.5">
                              <AlertCircle size={12} className="text-amber-600 shrink-0" />
                              Catatan Revisi:
                            </div>
                            <div className="text-slate-800 font-medium whitespace-normal break-words">
                              {formatDisplayCatatan(item)}
                            </div>
                          </div>
                        )}
                        {item.status === "ditolak" && item.catatan_verifikator && (
                          <div className="mt-2 p-2 bg-rose-50/90 border border-rose-300 rounded-lg text-rose-950 text-[11px] leading-relaxed shadow-2xs">
                            <div className="flex items-center gap-1 font-bold text-rose-800 text-[10px] uppercase tracking-wider mb-0.5">
                              <AlertCircle size={12} className="text-rose-600 shrink-0" />
                              Alasan Penolakan:
                            </div>
                            <div className="text-slate-800 font-medium whitespace-normal break-words">
                              {formatDisplayCatatan(item)}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Kategori & Rekening */}
                      <td className="py-3 px-3 min-w-[190px] max-w-[240px]">
                        <div className="space-y-1.5">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none mb-1">
                              Kategori BMD
                            </div>
                            <div
                              className="font-mono text-[11px] font-bold text-blue-700 line-clamp-2"
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
                              className="font-mono text-[10px] text-slate-700 font-medium line-clamp-2"
                              title={formatRekeningWithUraian(item.rekening_1)}
                            >
                              {formatRekeningWithUraian(item.rekening_1)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Satuan */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {item.satuan}
                        </span>
                      </td>

                      {/* Harga + Ongkir */}
                      <td className="py-3 px-3 text-right font-mono text-[11px]">
                        <div className="text-slate-700">{formatRupiah(item.harga)}</div>
                        {item.ongkir > 0 && (
                          <div className="text-[10px] text-slate-400">
                            + {formatRupiah(item.ongkir)}
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(item.total)}
                      </td>

                      {/* Unit & Pengusul */}
                      <td className="py-3 px-3 min-w-[140px]">
                        <div className="font-semibold text-slate-800 leading-snug break-words">
                          {item.unit_kerja}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.nama_pengusul} • TA {item.tahun}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap min-w-[130px]">
                        {getStatusBadge(item.status, item)}
                      </td>

                      {/* Aksi (Sticky Right) */}
                      <td className="py-3 px-3 text-right sticky right-0 z-10 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] whitespace-nowrap min-w-[120px]">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveItemDetail(item)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                            title="Detail Lengkap & Linimasa"
                          >
                            <Eye size={14} />
                          </Button>

                          {canEdit ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditItem(item)}
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                              title="Edit Usulan"
                            >
                              <Edit3 size={14} />
                            </Button>
                          ) : item.status === "diajukan" && isOwner ? (
                            <span
                              className="h-7 w-7 flex items-center justify-center text-slate-400 cursor-not-allowed"
                              title="Terkunci: Usulan sedang diverifikasi. Menunggu keputusan verifikator (perlu perbaikan / ditolak) sebelum dapat diedit."
                            >
                              <Lock size={13} className="text-amber-600/80" />
                            </span>
                          ) : null}

                          {isSubmittable && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!isPeriodOpen && !isAdmin && item.status === "draft"}
                              onClick={() => onSubmitDrafts([item.id])}
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-800"
                              title={item.status === "perlu_perbaikan" ? "Kirim Hasil Perbaikan" : "Ajukan Sekarang"}
                            >
                              <Send size={14} />
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id, item.uraian)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                              title="Hapus Usulan"
                            >
                              <Trash2 size={14} />
                            </Button>
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
                Menampilkan <b>{filteredItems.length === 0 ? 0 : startIndex + 1}</b> - <b>{endIndex}</b> dari <b>{filteredItems.length}</b> usulan
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
        </>
      )}
    </div>

      {/* Modal Detail Item Lengkap */}
      <Dialog open={Boolean(activeItemDetail)} onOpenChange={() => setActiveItemDetail(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl">
          {activeItemDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getStatusBadge(activeItemDetail.status, activeItemDetail)}
                  <span className="text-xs text-slate-400">
                    Dibuat: {formatDate(activeItemDetail.created_at)}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 break-words leading-snug">
                  {activeItemDetail.uraian}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 break-words">
                  {activeItemDetail.unit_kerja} — Pengusul: {activeItemDetail.nama_pengusul} (TA {activeItemDetail.tahun})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs w-full max-w-full overflow-hidden">
                {/* Linimasa Alur Pengusulan & Verifikasi Lengkap */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl w-full max-w-full overflow-hidden">
                  <SHSTimeline item={activeItemDetail} />
                </div>

                {/* Catatan Perbaikan Pengusul (Jika Usulan Merupakan Hasil Revisi) */}
                {activeItemDetail.catatan_perbaikan && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900 uppercase tracking-wider">
                      <Sparkles size={13} className="text-teal-600" />
                      Catatan Perbaikan dari Pengusul (Revisi #{activeItemDetail.revisi_ke || 1})
                    </div>
                    <p className="text-teal-950 leading-relaxed whitespace-pre-wrap break-words">
                      {activeItemDetail.catatan_perbaikan}
                    </p>
                  </div>
                )}

                {/* Spesifikasi */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Spesifikasi Teknis
                  </span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                    {activeItemDetail.spek}
                  </p>
                </div>

                {/* Kategori, Satuan, Kelompok */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Kode Kategori BMD (Kepmendagri)</div>
                    <div className="font-mono font-bold text-blue-700 mt-0.5 text-xs leading-relaxed break-words">
                      {formatKategoriWithNama(activeItemDetail.kode_kategori, activeItemDetail.kategori_nama)}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Satuan & Kelompok</div>
                    <div className="font-bold text-slate-800 mt-0.5 break-words">{activeItemDetail.satuan}</div>
                    <div className="text-[10px] text-slate-600 break-words">{activeItemDetail.kelompok}</div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Standar Harga</div>
                    <div className="font-mono font-black text-emerald-700 text-sm mt-0.5">
                      {formatRupiah(activeItemDetail.total)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Harga: {formatRupiah(activeItemDetail.harga)} + Ongkir: {formatRupiah(activeItemDetail.ongkir)}
                    </div>
                  </div>
                </div>

                {/* Rekening Belanja */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Kode Rekening Belanja (Permendagri 90)
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-slate-800 p-2 bg-white rounded-lg border border-slate-200 break-words">
                      <strong className="text-blue-700 mr-2">Rekening 1 (Wajib):</strong> {formatRekeningWithUraian(activeItemDetail.rekening_1)}
                    </div>
                    {activeItemDetail.rekening_2 && (
                      <div className="text-slate-800 p-2 bg-white rounded-lg border border-slate-200 break-words">
                        <strong className="text-blue-700 mr-2">Rekening 2:</strong> {formatRekeningWithUraian(activeItemDetail.rekening_2)}
                      </div>
                    )}
                    {activeItemDetail.rekening_3 && (
                      <div className="text-slate-800 p-2 bg-white rounded-lg border border-slate-200 break-words">
                        <strong className="text-blue-700 mr-2">Rekening 3:</strong> {formatRekeningWithUraian(activeItemDetail.rekening_3)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tautan Katalog & TKDN */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Tautan E-Katalog & TKDN
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-700 text-xs mb-0.5">Katalog 1:</div>
                        <a
                          href={activeItemDetail.link_katalog_1}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs font-mono max-w-full group"
                          title={activeItemDetail.link_katalog_1}
                        >
                          <span className="truncate max-w-[260px] sm:max-w-md block">
                            {activeItemDetail.link_katalog_1}
                          </span>
                          <ExternalLink size={12} className="shrink-0 text-blue-500 group-hover:text-blue-700" />
                        </a>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono text-[10px] self-start sm:self-center">
                        TKDN: {activeItemDetail.tkdn_1}%
                      </Badge>
                    </div>

                    {activeItemDetail.link_katalog_2 && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-700 text-xs mb-0.5">Katalog 2:</div>
                          <a
                            href={activeItemDetail.link_katalog_2}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs font-mono max-w-full group"
                            title={activeItemDetail.link_katalog_2}
                          >
                            <span className="truncate max-w-[260px] sm:max-w-md block">
                              {activeItemDetail.link_katalog_2}
                            </span>
                            <ExternalLink size={12} className="shrink-0 text-blue-500 group-hover:text-blue-700" />
                          </a>
                        </div>
                        {activeItemDetail.tkdn_2 !== undefined && (
                          <Badge variant="outline" className="shrink-0 font-mono text-[10px] self-start sm:self-center">
                            TKDN: {activeItemDetail.tkdn_2}%
                          </Badge>
                        )}
                      </div>
                    )}

                    {activeItemDetail.link_katalog_3 && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-700 text-xs mb-0.5">Katalog 3:</div>
                          <a
                            href={activeItemDetail.link_katalog_3}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs font-mono max-w-full group"
                            title={activeItemDetail.link_katalog_3}
                          >
                            <span className="truncate max-w-[260px] sm:max-w-md block">
                              {activeItemDetail.link_katalog_3}
                            </span>
                            <ExternalLink size={12} className="shrink-0 text-blue-500 group-hover:text-blue-700" />
                          </a>
                        </div>
                        {activeItemDetail.tkdn_3 !== undefined && (
                          <Badge variant="outline" className="shrink-0 font-mono text-[10px] self-start sm:self-center">
                            TKDN: {activeItemDetail.tkdn_3}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500">
                  {!canEditItem(activeItemDetail, user) && (
                    <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium text-[11px]">
                      <Lock size={12} className="shrink-0 text-amber-600" />
                      {!isItemOwner(activeItemDetail, user)
                        ? `Milik ${activeItemDetail.unit_kerja} (Hanya dapat diedit oleh unit bersangkutan/Admin)`
                        : activeItemDetail.status === "diajukan"
                        ? "Terkunci: Usulan sedang diverifikasi. Menunggu keputusan verifikator."
                        : activeItemDetail.status === "diperbaiki"
                        ? "Terkunci: Usulan hasil perbaikan sedang diverifikasi ulang oleh tim verifikator."
                        : activeItemDetail.status === "disetujui"
                        ? "Terkunci: Usulan telah disetujui penuh."
                        : "Tidak dapat diedit"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveItemDetail(null)}
                    className="text-xs"
                  >
                    Tutup
                  </Button>
                  {canEditItem(activeItemDetail, user) && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const item = activeItemDetail;
                        setActiveItemDetail(null);
                        onEditItem(item);
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                      <Edit3 size={13} /> Edit Usulan
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
