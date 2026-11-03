// src/components/SHS/SHSRecapExport.tsx
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { SHSItem, SHSPeriod, SHSRecapStats } from "@/types/shs";
import { DAFTAR_UNIT_DINKES_PUSKESMAS } from "@/lib/shsMasterData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  Building,
  Coins,
  FileText,
  ShieldCheck,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

import { User } from "@/hooks/useSupabaseAuth";
import { getDualStatusInfo, formatDisplayCatatan, inferUnitFromUser } from "@/lib/shsVerificationHelper";

interface SHSRecapExportProps {
  user?: User | null;
  items: SHSItem[];
  activePeriod: SHSPeriod;
  stats: SHSRecapStats;
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

export const SHSRecapExport = ({ user, items, activePeriod, stats }: SHSRecapExportProps) => {
  const isAdmin = user?.role === "admin";
  const isPengurusBarang =
    user?.role === "pengurus_barang" ||
    (user?.username || "").toLowerCase().startsWith("pengurus");
  const isVerifikator = isAdmin || isPengurusBarang;
  const userUnitName = inferUnitFromUser(user?.username);

  // Filter default: "disetujui_admin" jika verifikator admin, atau "disetujui"
  const [filterStatus, setFilterStatus] = useState<string>("disetujui");
  const [filterUnit, setFilterUnit] = useState<string>("all");

  // Hitung jumlah untuk tiap opsi filter secara realtime
  const counts = useMemo(() => {
    let disetujuiPenuh = 0;
    let disetujuiAdminSaja = 0;
    let semuaDisetujuiAdmin = 0;
    let disetujuiPengurusSaja = 0;
    let semuaDisetujuiPengurus = 0;
    let diajukan = 0;
    let draft = 0;
    let perluPerbaikan = 0;
    let ditolak = 0;

    items.forEach((item) => {
      if (!isVerifikator && item.unit_kerja !== userUnitName) return;

      const dual = getDualStatusInfo(item);
      const isApprovedFull = item.status === "disetujui" || (dual.adminApproved && dual.pengurusApproved);

      if (isApprovedFull) {
        disetujuiPenuh++;
      }
      if (dual.adminApproved && !dual.pengurusApproved) {
        disetujuiAdminSaja++;
      }
      if (dual.adminApproved) {
        semuaDisetujuiAdmin++;
      }
      if (dual.pengurusApproved && !dual.adminApproved) {
        disetujuiPengurusSaja++;
      }
      if (dual.pengurusApproved) {
        semuaDisetujuiPengurus++;
      }
      if (
        (item.status === "diajukan" || item.status === "diperbaiki") &&
        !dual.adminApproved &&
        !dual.pengurusApproved
      ) {
        diajukan++;
      }
      if (item.status === "draft") {
        draft++;
      }
      if (
        item.status === "perlu_perbaikan" ||
        dual.adminStatus === "perlu_perbaikan" ||
        dual.pengurusStatus === "perlu_perbaikan"
      ) {
        perluPerbaikan++;
      }
      if (
        item.status === "ditolak" ||
        dual.adminStatus === "ditolak" ||
        dual.pengurusStatus === "ditolak"
      ) {
        ditolak++;
      }
    });

    return {
      disetujuiPenuh,
      disetujuiAdminSaja,
      semuaDisetujuiAdmin,
      disetujuiPengurusSaja,
      semuaDisetujuiPengurus,
      diajukan,
      draft,
      perluPerbaikan,
      ditolak,
      total: items.length,
    };
  }, [items, isVerifikator, userUnitName]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const dual = getDualStatusInfo(item);

      if (filterStatus === "disetujui") {
        // Disetujui Penuh (2/2)
        if (item.status !== "disetujui" && !(dual.adminApproved && dual.pengurusApproved)) return false;
      } else if (filterStatus === "disetujui_admin") {
        // Disetujui Admin Saja (1/2 - belum disetujui Pengurus Barang)
        if (!dual.adminApproved || dual.pengurusApproved) return false;
      } else if (filterStatus === "acc_admin") {
        // Semua yang sudah disetujui Admin (baik 1/2 maupun 2/2)
        if (!dual.adminApproved) return false;
      } else if (filterStatus === "disetujui_pengurus") {
        // Disetujui Pengurus Barang Saja (1/2 - belum disetujui Admin)
        if (!dual.pengurusApproved || dual.adminApproved) return false;
      } else if (filterStatus === "acc_pengurus") {
        // Semua yang sudah disetujui Pengurus Barang (1/2 maupun 2/2)
        if (!dual.pengurusApproved) return false;
      } else if (filterStatus === "diajukan") {
        // Belum diverifikasi (baik Admin maupun Pengurus Barang belum ACC)
        if (
          (item.status !== "diajukan" && item.status !== "diperbaiki") ||
          dual.adminApproved ||
          dual.pengurusApproved
        ) {
          return false;
        }
      } else if (filterStatus === "perlu_perbaikan") {
        if (
          item.status !== "perlu_perbaikan" &&
          dual.adminStatus !== "perlu_perbaikan" &&
          dual.pengurusStatus !== "perlu_perbaikan"
        ) {
          return false;
        }
      } else if (filterStatus === "ditolak") {
        if (
          item.status !== "ditolak" &&
          dual.adminStatus !== "ditolak" &&
          dual.pengurusStatus !== "ditolak"
        ) {
          return false;
        }
      } else if (filterStatus === "draft") {
        if (item.status !== "draft") return false;
      } else if (filterStatus !== "all" && item.status !== filterStatus) {
        return false;
      }

      if (isVerifikator && filterUnit !== "all" && item.unit_kerja !== filterUnit) return false;
      return true;
    });
  }, [items, filterStatus, filterUnit, isVerifikator]);

  // Total Anggaran terfilter
  const totalFilteredBudget = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  }, [filteredItems]);

  // Breakdown per Unit berdasarkan data terfilter
  const breakdownByUnit = useMemo(() => {
    const map: Record<string, { totalItems: number; approvedItems: number; totalBudget: number }> =
      {};
    filteredItems.forEach((item) => {
      const u = item.unit_kerja || "Lainnya";
      if (!map[u]) {
        map[u] = { totalItems: 0, approvedItems: 0, totalBudget: 0 };
      }
      map[u].totalItems += 1;
      map[u].approvedItems += 1;
      map[u].totalBudget += Number(item.total) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].totalBudget - a[1].totalBudget);
  }, [filteredItems]);

  // Label filter untuk tampilan & nama file
  const getFilterLabel = (status: string) => {
    switch (status) {
      case "disetujui":
        return "Disetujui Penuh (2/2)";
      case "disetujui_admin":
        return "Disetujui Admin Saja (1/2)";
      case "acc_admin":
        return "Semua yang Disetujui Admin";
      case "disetujui_pengurus":
        return "Disetujui Pengurus Barang Saja (1/2)";
      case "acc_pengurus":
        return "Semua yang Disetujui Pengurus";
      case "diajukan":
        return "Belum Diverifikasi (Menunggu)";
      case "draft":
        return "Draft";
      case "perlu_perbaikan":
        return "Perlu Perbaikan";
      case "ditolak":
        return "Ditolak";
      default:
        return "Semua Status Usulan";
    }
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada data yang sesuai filter untuk diekspor.",
        variant: "destructive",
      });
      return;
    }

    const exportRows = filteredItems.map((item) => {
      const numHarga = Number(item.harga) || 0;
      const numOngkir = Number(item.ongkir) || 0;
      const numTotal = item.total !== undefined ? Number(item.total) : numHarga + numOngkir;
      const dual = getDualStatusInfo(item);

      return {
        kode_kategori: item.kode_kategori || "",
        uraian: item.uraian || "",
        spek: item.spek || "",
        satuan: item.satuan || "",
        harga: numHarga,
        ongkir: numOngkir,
        "total (e+f)": numTotal,
        "rekening 1": item.rekening_1 || "",
        "rekening 2": item.rekening_2 || "",
        "rekening 3": item.rekening_3 || "",
        kelompok: item.kelompok || "",
        tahun: item.tahun || activePeriod.tahun || 2027,
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
        "STATUS USULAN": dual.label,
        "VERIFIKASI ADMIN": dual.adminApproved
          ? "Disetujui"
          : dual.adminStatus === "perlu_perbaikan"
          ? "Perlu Perbaikan"
          : dual.adminStatus === "ditolak"
          ? "Ditolak"
          : "Belum Verifikasi",
        "VERIFIKASI PENGURUS BARANG": dual.pengurusApproved
          ? "Disetujui"
          : dual.pengurusStatus === "perlu_perbaikan"
          ? "Perlu Perbaikan"
          : dual.pengurusStatus === "ditolak"
          ? "Ditolak"
          : "Belum Verifikasi",
        "CATATAN TELAAH": formatDisplayCatatan(item),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);

    // Column widths
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
      { wch: 30 }, // STATUS USULAN
      { wch: 20 }, // VERIFIKASI ADMIN
      { wch: 26 }, // VERIFIKASI PENGURUS BARANG
      { wch: 45 }, // CATATAN TELAAH
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Rekap Usulan SHS");

    // Sheet Ringkasan per Unit
    const summaryRows = breakdownByUnit.map(([unit, data], idx) => ({
      "No.": idx + 1,
      "Unit Kerja / Puskesmas": unit,
      "Total Usulan Terfilter": data.totalItems,
      "Estimasi Pagu Terfilter (Rp)": data.totalBudget,
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan per Unit");

    const statusSuffixMap: Record<string, string> = {
      disetujui: "Disetujui_Penuh_2_2",
      disetujui_admin: "Disetujui_Admin_Saja",
      acc_admin: "Semua_Disetujui_Admin",
      disetujui_pengurus: "Disetujui_Pengurus_Saja",
      acc_pengurus: "Semua_Disetujui_Pengurus",
      diajukan: "Menunggu_Verifikasi",
      draft: "Draft",
      perlu_perbaikan: "Perlu_Perbaikan",
      ditolak: "Ditolak",
      all: "Semua_Status",
    };
    const statusSuffix = statusSuffixMap[filterStatus] || filterStatus;
    const unitPart = !isVerifikator
      ? userUnitName.replace(/[^a-zA-Z0-9]/g, "_")
      : filterUnit === "all"
      ? "Semua_Unit"
      : filterUnit.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `Rekapitulasi_SHS_${unitPart}_TA_${activePeriod.tahun}_${statusSuffix}.xlsx`;

    XLSX.writeFile(wb, filename);
    toast({
      title: "Ekspor Berhasil",
      description: `File "${filename}" berhasil diunduh (${filteredItems.length} baris data).`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Kartu Ekspor & Filter Utama */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-600" />
                Rekapitulasi & Ekspor Data Standar Harga Satuan (SHS)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {!isVerifikator
                  ? `Unduh rekapitulasi usulan milik ${userUnitName} berformat resmi Microsoft Excel.`
                  : "Unduh rekapitulasi usulan berformat resmi Microsoft Excel untuk bahan telaah TAPD dan penyusunan SHS Daerah."}
              </CardDescription>
            </div>

            <Button
              type="button"
              onClick={handleExportExcel}
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold self-start sm:self-auto shadow-xs"
            >
              <Download size={14} />
              Ekspor ke Excel (.xlsx) ({filteredItems.length} Data)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-500">Usulan Terfilter</div>
                <div className="text-base font-bold text-slate-900 truncate">
                  {filteredItems.length} <span className="text-xs font-normal text-slate-500">Item</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Coins size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-500">Total Pagu Terfilter</div>
                <div className="text-base font-bold text-emerald-700 truncate font-mono">
                  {formatRupiah(totalFilteredBudget)}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-500">Kriteria Terpilih</div>
                <div className="text-xs font-bold text-slate-800 truncate" title={getFilterLabel(filterStatus)}>
                  {getFilterLabel(filterStatus)}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Filter size={14} className="text-slate-500" />
              Filter Data Rekap:
            </div>

            {/* Pilihan Status Terlengkap */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-800 text-xs outline-none shadow-2xs focus:ring-1 focus:ring-blue-500"
              >
                <optgroup label="✨ Rekomendasi Persetujuan Admin">
                  <option value="disetujui_admin">
                    ✅ Disetujui Admin Saja ({counts.disetujuiAdminSaja} data)
                  </option>
                  <option value="acc_admin">
                    🌟 Semua yang Disetujui Admin ({counts.semuaDisetujuiAdmin} data)
                  </option>
                  <option value="disetujui">
                    🏆 Disetujui Penuh 2/2 ({counts.disetujuiPenuh} data)
                  </option>
                </optgroup>

                <optgroup label="⚖️ Persetujuan Pengurus Barang">
                  <option value="disetujui_pengurus">
                    📦 Disetujui Pengurus Saja ({counts.disetujuiPengurusSaja} data)
                  </option>
                  <option value="acc_pengurus">
                    📦 Semua Disetujui Pengurus ({counts.semuaDisetujuiPengurus} data)
                  </option>
                </optgroup>

                <optgroup label="📋 Status Lainnya">
                  <option value="diajukan">
                    ⏳ Menunggu Verifikasi ({counts.diajukan} data)
                  </option>
                  <option value="perlu_perbaikan">
                    ✏️ Perlu Perbaikan ({counts.perluPerbaikan} data)
                  </option>
                  <option value="ditolak">
                    ❌ Ditolak ({counts.ditolak} data)
                  </option>
                  <option value="draft">
                    📄 Draft ({counts.draft} data)
                  </option>
                  <option value="all">
                    🌐 Semua Status ({counts.total} data)
                  </option>
                </optgroup>
              </select>
            </div>

            {isVerifikator ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Unit:</span>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-semibold text-slate-800 text-xs outline-none shadow-2xs focus:ring-1 focus:ring-blue-500 max-w-[240px]"
                >
                  <option value="all">Semua Unit Kerja / Puskesmas</option>
                  {DAFTAR_UNIT_DINKES_PUSKESMAS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-blue-50/90 border border-blue-200 px-2.5 py-1 rounded-md text-blue-900 font-semibold">
                <Building size={13} className="text-blue-600" />
                <span>Unit: {userUnitName}</span>
              </div>
            )}
          </div>

          {/* Pratinjau Daftar Usulan Terfilter */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-blue-600" />
                Pratinjau Usulan Terfilter ({filteredItems.length} Data)
              </span>
              <span className="text-slate-500 font-normal">
                Menampilkan maksimal 10 data teratas
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">No.</th>
                      <th className="py-2.5 px-3">Uraian & Spesifikasi</th>
                      <th className="py-2.5 px-3">Unit / Puskesmas</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Total (Rp)</th>
                      <th className="py-2.5 px-3 text-center">Admin Dinkes</th>
                      <th className="py-2.5 px-3 text-center">Pengurus Barang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.slice(0, 10).map((item, idx) => {
                      const dual = getDualStatusInfo(item);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 max-w-xs">
                            <div className="font-semibold text-slate-900 line-clamp-1">
                              {item.uraian}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {item.spek}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            <div className="font-medium">{item.unit_kerja}</div>
                            <div className="text-[10px] text-slate-400">{item.nama_pengusul}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-700 whitespace-nowrap">
                            {formatRupiah(item.harga)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(item.total)}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {dual.adminApproved ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                ✓ Disetujui
                              </Badge>
                            ) : dual.adminStatus === "perlu_perbaikan" ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                Perbaikan
                              </Badge>
                            ) : dual.adminStatus === "ditolak" ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                                Ditolak
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Menunggu
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {dual.pengurusApproved ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                ✓ Disetujui
                              </Badge>
                            ) : dual.pengurusStatus === "perlu_perbaikan" ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                Perbaikan
                              </Badge>
                            ) : dual.pengurusStatus === "ditolak" ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                                Ditolak
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Menunggu
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                          Tidak ada usulan yang cocok dengan filter "{getFilterLabel(filterStatus)}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredItems.length > 10 && (
                <div className="p-2.5 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100 font-medium">
                  + {filteredItems.length - 10} usulan lainnya akan disertakan secara lengkap saat Anda mengklik tombol <b>Ekspor ke Excel</b>.
                </div>
              )}
            </div>
          </div>

          {/* Ringkasan per Unit */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Ringkasan Usulan per Unit / Puskesmas Sesuai Kriteria</span>
              <span className="text-slate-500 font-normal">TA {activePeriod.tahun}</span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Unit Kerja / Puskesmas</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Usulan</th>
                    <th className="py-2.5 px-3 text-right">Estimasi Pagu Sesuai Filter (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {breakdownByUnit.map(([unit, data]) => (
                    <tr key={unit} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-semibold text-slate-800">{unit}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            data.approvedItems > 0
                              ? "bg-blue-100 text-blue-800 font-bold"
                              : "text-slate-400"
                          }
                        >
                          {data.approvedItems}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(data.totalBudget)}
                      </td>
                    </tr>
                  ))}

                  {breakdownByUnit.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400 text-xs">
                        Tidak ada unit kerja pada kriteria ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
