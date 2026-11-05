// src/components/SHS/SHSItemForm.tsx
import { useState, useEffect, useMemo } from "react";
import { User } from "@/hooks/useSupabaseAuth";
import {
  SHSItem,
  SHSStatus,
  SHSPeriod,
  MasterKategori,
  MasterRekening,
  MasterSatuan,
  MasterKelompok,
} from "@/types/shs";
import { DAFTAR_UNIT_DINKES_PUSKESMAS, getKategoriNama, formatKategoriWithNama } from "@/lib/shsMasterData";
import { SearchableSelect, SearchableOption } from "@/components/ui/SearchableSelect";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Copy,
  Trash2,
  Save,
  Send,
  ExternalLink,
  AlertCircle,
  Coins,
  Link as LinkIcon,
  Tag,
  Building,
  Calculator,
  FileText,
  FileCheck,
  Info,
  Lock,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  formatDisplayCatatan,
  isItemOwner,
  canEditItem,
  inferUnitFromUser,
} from "@/lib/shsVerificationHelper";
import { SHSTimeline } from "@/components/SHS/SHSTimeline";

interface DraftProposalItem {
  tempId: string;
  kode_kategori: string;
  uraian: string;
  spek: string;
  satuan: string;
  kelompok: string;
  harga: string;
  ongkir: string;
  rekening_1: string;
  rekening_2: string;
  rekening_3: string;
  link_katalog_1: string;
  link_katalog_2: string;
  link_katalog_3: string;
  tkdn_1: string;
  tkdn_2: string;
  tkdn_3: string;
}

interface SHSItemFormProps {
  user: User | null;
  activePeriod?: SHSPeriod;
  isPeriodOpen: boolean;
  masterKategori: MasterKategori[];
  masterRekening: MasterRekening[];
  masterSatuan: MasterSatuan[];
  masterKelompok: MasterKelompok[];
  editingItem?: SHSItem | null;
  onSuccess: () => void;
  onCancel?: () => void;
  createItem: (item: Omit<SHSItem, "id" | "created_at" | "updated_at">) => Promise<boolean>;
  createBatchItems?: (
    itemsList: Omit<SHSItem, "id" | "created_at" | "updated_at">[]
  ) => Promise<boolean>;
  updateItem: (id: string, payload: Partial<SHSItem>) => Promise<boolean>;
}

// Format Rupiah
const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

// Helper cerdas parsing input harga (mendukung angka, titik, atau kata seperti '1 miliar', '1m', '220 jt', dll)
const parseSmartRupiahInput = (val: string): string => {
  const trimmed = val.trim().toLowerCase();
  // Cocokkan pola '1 miliar' / '1.5 miliar' / '1m' / '1 milyar'
  const miliarMatch = trimmed.match(/^([\d.,]+)\s*(miliar|milyar|m)$/);
  if (miliarMatch) {
    const num = parseFloat(miliarMatch[1].replace(/\./g, "").replace(/,/g, "."));
    if (!isNaN(num)) return String(Math.round(num * 1_000_000_000));
  }
  // Cocokkan pola '500 juta' / '500jt' / '500 jt'
  const jutaMatch = trimmed.match(/^([\d.,]+)\s*(juta|jt)$/);
  if (jutaMatch) {
    const num = parseFloat(jutaMatch[1].replace(/\./g, "").replace(/,/g, "."));
    if (!isNaN(num)) return String(Math.round(num * 1_000_000));
  }
  // Cocokkan pola '500 ribu' / '500rb' / '500k'
  const ribuMatch = trimmed.match(/^([\d.,]+)\s*(ribu|rb|k)$/);
  if (ribuMatch) {
    const num = parseFloat(ribuMatch[1].replace(/\./g, "").replace(/,/g, "."));
    if (!isNaN(num)) return String(Math.round(num * 1_000));
  }
  return val.replace(/\D/g, "");
};

// Helper teks terbilang singkat nominal (contoh: 1 Miliar Rupiah, 220 Juta Rupiah)
const formatTerbilangSingkat = (num: number): string => {
  if (!num || num <= 0) return "";
  if (num >= 1_000_000_000_000) return (num / 1_000_000_000_000).toLocaleString("id-ID") + " Triliun Rupiah";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toLocaleString("id-ID") + " Miliar Rupiah";
  if (num >= 1_000_000) return (num / 1_000_000).toLocaleString("id-ID") + " Juta Rupiah";
  if (num >= 1_000) return (num / 1_000).toLocaleString("id-ID") + " Ribu Rupiah";
  return num.toLocaleString("id-ID") + " Rupiah";
};


// Pembuat draft usulan awal
const createBlankItem = (
  masterKategori: MasterKategori[],
  masterSatuan: MasterSatuan[],
  masterKelompok: MasterKelompok[],
  masterRekening: MasterRekening[]
): DraftProposalItem => ({
  tempId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  kode_kategori: masterKategori[0]?.kode || "",
  uraian: "",
  spek: "",
  satuan: masterSatuan[0]?.nama || "Unit",
  kelompok: masterKelompok[0]?.nama || "Barang Medis / Alkes",
  harga: "",
  ongkir: "0",
  rekening_1: masterRekening[0]?.kode || "",
  rekening_2: "",
  rekening_3: "",
  link_katalog_1: "",
  link_katalog_2: "",
  link_katalog_3: "",
  tkdn_1: "0",
  tkdn_2: "",
  tkdn_3: "",
});

export const SHSItemForm = ({
  user,
  activePeriod,
  isPeriodOpen,
  masterKategori,
  masterRekening,
  masterSatuan,
  masterKelompok,
  editingItem,
  onSuccess,
  onCancel,
  createItem,
  createBatchItems,
  updateItem,
}: SHSItemFormProps) => {
  const isAdmin = user?.role === "admin";
  const isEditing = Boolean(editingItem);
  const canEdit = !editingItem || canEditItem(editingItem, user);
  const isOwner = !editingItem || isItemOwner(editingItem, user);

  // Identitas Pengusul (Berlaku untuk seluruh batch usulan)
  const [namaPengusul, setNamaPengusul] = useState(
    editingItem?.nama_pengusul || user?.username || ""
  );
  const [unitKerja, setUnitKerja] = useState(
    editingItem?.unit_kerja || inferUnitFromUser(user?.username)
  );

  // Catatan Perbaikan dari Pengusul saat merevisi usulan
  const [catatanPerbaikanPengusul, setCatatanPerbaikanPengusul] = useState(
    editingItem?.catatan_perbaikan || ""
  );

  // Daftar Usulan (Mendukung Multi-Item / Beberapa Usulan Sekaligus)
  const [itemList, setItemList] = useState<DraftProposalItem[]>(() => {
    if (editingItem) {
      return [
        {
          tempId: editingItem.id,
          kode_kategori: editingItem.kode_kategori,
          uraian: editingItem.uraian,
          spek: editingItem.spek,
          satuan: editingItem.satuan,
          kelompok: editingItem.kelompok,
          harga: String(editingItem.harga),
          ongkir: String(editingItem.ongkir),
          rekening_1: editingItem.rekening_1,
          rekening_2: editingItem.rekening_2 || "",
          rekening_3: editingItem.rekening_3 || "",
          link_katalog_1: editingItem.link_katalog_1,
          link_katalog_2: editingItem.link_katalog_2 || "",
          link_katalog_3: editingItem.link_katalog_3 || "",
          tkdn_1: String(editingItem.tkdn_1),
          tkdn_2: editingItem.tkdn_2 !== undefined ? String(editingItem.tkdn_2) : "",
          tkdn_3: editingItem.tkdn_3 !== undefined ? String(editingItem.tkdn_3) : "",
        },
      ];
    }
    return [createBlankItem(masterKategori, masterSatuan, masterKelompok, masterRekening)];
  });

  // Sinkronisasi data ketika editingItem berubah (hanya saat ID berubah, tidak saat mengetik)
  useEffect(() => {
    if (editingItem) {
      setUnitKerja(editingItem.unit_kerja || inferUnitFromUser(user?.username));
      setNamaPengusul(editingItem.nama_pengusul || user?.username || "");
      setCatatanPerbaikanPengusul(editingItem.catatan_perbaikan || "");
      setItemList([
        {
          tempId: editingItem.id,
          kode_kategori: editingItem.kode_kategori,
          uraian: editingItem.uraian,
          spek: editingItem.spek,
          satuan: editingItem.satuan,
          kelompok: editingItem.kelompok,
          harga: String(editingItem.harga),
          ongkir: String(editingItem.ongkir || 0),
          rekening_1: editingItem.rekening_1,
          rekening_2: editingItem.rekening_2 || "",
          rekening_3: editingItem.rekening_3 || "",
          link_katalog_1: editingItem.link_katalog_1,
          link_katalog_2: editingItem.link_katalog_2 || "",
          link_katalog_3: editingItem.link_katalog_3 || "",
          tkdn_1: String(editingItem.tkdn_1 || 0),
          tkdn_2: editingItem.tkdn_2 !== undefined && editingItem.tkdn_2 !== null ? String(editingItem.tkdn_2) : "",
          tkdn_3: editingItem.tkdn_3 !== undefined && editingItem.tkdn_3 !== null ? String(editingItem.tkdn_3) : "",
        },
      ]);
      setActiveIndex(0);
    }
  }, [editingItem?.id]);

  // Index usulan yang sedang diedit
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pastikan index aktif berada di dalam rentang
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, itemList.length - 1));
  const activeItem = itemList[safeActiveIndex] || itemList[0];

  // Hitung total harga usulan aktif
  const activeNumericHarga = Number(String(activeItem?.harga || "").replace(/\D/g, "")) || 0;
  const activeNumericOngkir = Number(String(activeItem?.ongkir || "").replace(/\D/g, "")) || 0;
  const activeTotalHarga = activeNumericHarga + activeNumericOngkir;

  const formatInputRupiah = (raw: string | number | undefined | null) => {
    if (!raw && raw !== 0) return "";
    const clean = String(raw).replace(/\D/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("id-ID").format(Number(clean));
  };

  // Selected Category Nama pada item aktif
  const selectedKatObj = useMemo(() => {
    if (!activeItem?.kode_kategori) return null;
    const direct = masterKategori.find((k) => k.kode === activeItem.kode_kategori);
    if (direct) return direct;
    const nama = getKategoriNama(activeItem.kode_kategori);
    if (nama) {
      return { kode: activeItem.kode_kategori, nama, kelompok: "SSH", aktif: true };
    }
    return null;
  }, [masterKategori, activeItem?.kode_kategori]);

  // Kalkulasi total seluruh pagu usulan dalam batch
  const batchTotalAnggaran = useMemo(() => {
    return itemList.reduce((sum, item) => {
      const h = Number(String(item.harga || "").replace(/\D/g, "")) || 0;
      const o = Number(String(item.ongkir || "").replace(/\D/g, "")) || 0;
      return sum + h + o;
    }, 0);
  }, [itemList]);

  // Options for SearchableSelect
  const unitOptions: SearchableOption[] = useMemo(() => {
    return DAFTAR_UNIT_DINKES_PUSKESMAS.map((u) => ({
      value: u,
      label: u,
    }));
  }, []);

  const kategoriOptions: SearchableOption[] = useMemo(() => {
    return masterKategori.map((k) => ({
      value: k.kode,
      code: k.kode,
      label: k.nama,
      badge: k.kelompok,
    }));
  }, [masterKategori]);

  const rekeningOptions: SearchableOption[] = useMemo(() => {
    return masterRekening.map((r) => ({
      value: r.kode,
      code: r.kode,
      label: r.uraian,
    }));
  }, [masterRekening]);

  const satuanOptions: SearchableOption[] = useMemo(() => {
    return masterSatuan.map((s) => ({
      value: s.nama,
      label: s.nama,
      sublabel: s.keterangan,
    }));
  }, [masterSatuan]);

  const kelompokOptions: SearchableOption[] = useMemo(() => {
    return masterKelompok.map((k) => ({
      value: k.nama,
      label: k.nama,
      sublabel: k.deskripsi,
    }));
  }, [masterKelompok]);

  // Update field pada usulan aktif
  const updateActiveField = <K extends keyof DraftProposalItem>(
    field: K,
    value: DraftProposalItem[K]
  ) => {
    setItemList((prev) => {
      const copy = [...prev];
      if (copy[safeActiveIndex]) {
        copy[safeActiveIndex] = {
          ...copy[safeActiveIndex],
          [field]: value,
        };
      }
      return copy;
    });
  };

  // Tambah Usulan Baru
  const handleAddNewItem = () => {
    const newItem = createBlankItem(masterKategori, masterSatuan, masterKelompok, masterRekening);
    setItemList((prev) => [...prev, newItem]);
    setActiveIndex(itemList.length);
    toast({
      title: "Usulan Baru Ditambahkan",
      description: `Usulan ke-${itemList.length + 1} siap diisi pada tabel formulir.`,
    });
  };

  // Duplikasi Usulan Aktif
  const handleDuplicateItem = (indexToDup: number) => {
    const source = itemList[indexToDup];
    if (!source) return;
    const duplicated: DraftProposalItem = {
      ...source,
      tempId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      uraian: source.uraian ? `${source.uraian} (Salinan)` : "",
    };
    const nextList = [...itemList];
    nextList.splice(indexToDup + 1, 0, duplicated);
    setItemList(nextList);
    setActiveIndex(indexToDup + 1);
    toast({
      title: "Usulan Berhasil Diduplikasi",
      description: `Data usulan "${source.uraian || 'Barang'}" telah disalin sebagai usulan ke-${indexToDup + 2}.`,
    });
  };

  // Hapus Usulan
  const handleRemoveItem = (indexToRemove: number) => {
    if (itemList.length <= 1) {
      toast({
        title: "Tidak Dapat Dihapus",
        description: "Formulir harus memiliki minimal 1 usulan barang.",
        variant: "destructive",
      });
      return;
    }
    const target = itemList[indexToRemove];
    if (
      target.uraian.trim() &&
      !window.confirm(`Hapus usulan ke-${indexToRemove + 1} ("${target.uraian}") dari daftar?`)
    ) {
      return;
    }
    const nextList = itemList.filter((_, idx) => idx !== indexToRemove);
    setItemList(nextList);
    if (safeActiveIndex >= nextList.length) {
      setActiveIndex(nextList.length - 1);
    } else if (safeActiveIndex === indexToRemove && safeActiveIndex > 0) {
      setActiveIndex(safeActiveIndex - 1);
    }
    toast({
      title: "Usulan Dihapus",
      description: `Usulan ke-${indexToRemove + 1} telah dihapus dari formulir.`,
    });
  };

  // Helper normalisasi URL e-katalog (otomatis tambah https:// jika pengguna belum menyertakan)
  const normalizeUrl = (url: string | undefined | null) => {
    const trimmed = (url || "").trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  // Cek kelengkapan usulan
  const checkItemCompletion = (item: DraftProposalItem) => {
    const numHarga = Number(String(item.harga || "").replace(/\D/g, "")) || 0;
    const l1 = normalizeUrl(item.link_katalog_1);
    return (
      Boolean(item.uraian.trim()) &&
      Boolean(item.kode_kategori) &&
      Boolean(item.spek.trim()) &&
      numHarga > 0 &&
      Boolean(item.rekening_1) &&
      Boolean(l1)
    );
  };

  // Validasi per item
  const validateSingleItem = (
    item: DraftProposalItem,
    index: number,
    isDraft: boolean
  ): boolean => {
    const prefix = `Usulan ke-${index + 1}${item.uraian ? ` ("${item.uraian}")` : ""}:`;

    if (!item.uraian.trim()) {
      toast({
        title: "Validasi Gagal",
        description: `${prefix} Uraian / nama barang wajib diisi.`,
        variant: "destructive",
      });
      return false;
    }
    if (!item.kode_kategori) {
      toast({
        title: "Validasi Gagal",
        description: `${prefix} Kode kategori barang Kepmendagri wajib dipilih.`,
        variant: "destructive",
      });
      return false;
    }
    if (!isDraft) {
      if (!item.spek.trim()) {
        toast({
          title: "Validasi Gagal",
          description: `${prefix} Spesifikasi teknis wajib diisi sebelum mengajukan usulan.`,
          variant: "destructive",
        });
        return false;
      }
      const numHarga = Number(String(item.harga || "").replace(/\D/g, "")) || 0;
      if (numHarga <= 0) {
        toast({
          title: "Validasi Gagal",
          description: `${prefix} Harga satuan dasar harus lebih besar dari Rp 0.`,
          variant: "destructive",
        });
        return false;
      }
      if (!item.rekening_1) {
        toast({
          title: "Validasi Gagal",
          description: `${prefix} Rekening belanja 1 wajib dipilih.`,
          variant: "destructive",
        });
        return false;
      }
      const l1 = normalizeUrl(item.link_katalog_1);
      if (!l1) {
        toast({
          title: "Validasi Gagal",
          description: `${prefix} Tautan e-katalog utama (1) wajib diisi dengan link produk.`,
          variant: "destructive",
        });
        return false;
      }
      const l2 = normalizeUrl(item.link_katalog_2);
      if (!l2) {
        toast({
          title: "Validasi Gagal",
          description: `${prefix} Tautan e-katalog pembanding 1 (2) wajib diisi dengan link produk.`,
          variant: "destructive",
        });
        return false;
      }
      if (item.rekening_2 && item.rekening_2 === item.rekening_1) {
        toast({
          title: "Validasi Gagal",
          description: `${prefix} Rekening 2 tidak boleh sama dengan Rekening 1.`,
          variant: "destructive",
        });
        return false;
      }
      if (
        item.rekening_3 &&
        (item.rekening_3 === item.rekening_1 || item.rekening_3 === item.rekening_2)
      ) {
        toast({
          title: "Validasi Gagal",
          description: `${prefix} Rekening 3 tidak boleh duplikat dengan Rekening 1 atau 2.`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  // Convert draft to payload
  const buildPayload = (item: DraftProposalItem, targetStatus: "draft" | "diajukan" | "diperbaiki") => {
    const numHarga = Number(String(item.harga || "").replace(/\D/g, "")) || 0;
    const numOngkir = Number(String(item.ongkir || "").replace(/\D/g, "")) || 0;
    const katObj = masterKategori.find((k) => k.kode === item.kode_kategori);
    const link1 = normalizeUrl(item.link_katalog_1);
    const link2 = normalizeUrl(item.link_katalog_2);
    const link3 = normalizeUrl(item.link_katalog_3);

    let resolvedStatus: SHSStatus = targetStatus;
    if (
      targetStatus === "diajukan" &&
      isEditing &&
      (editingItem?.status === "perlu_perbaikan" ||
        editingItem?.status === "ditolak" ||
        editingItem?.status === "diperbaiki")
    ) {
      resolvedStatus = "diperbaiki";
    }

    return {
      period_id: activePeriod?.id || "period-shs-ta-2027",
      tahun: activePeriod?.tahun || 2027,
      user_id: editingItem?.user_id || user?.id || "user-unknown",
      nama_pengusul: namaPengusul.trim() || editingItem?.nama_pengusul || user?.username || "Pengusul",
      unit_kerja: unitKerja || editingItem?.unit_kerja || "",
      kode_kategori: item.kode_kategori,
      kategori_nama: katObj?.nama || getKategoriNama(item.kode_kategori) || "",
      uraian: item.uraian.trim(),
      spek: item.spek.trim(),
      satuan: item.satuan,
      harga: numHarga,
      ongkir: numOngkir,
      total: numHarga + numOngkir,
      rekening_1: item.rekening_1,
      rekening_2: item.rekening_2 || undefined,
      rekening_3: item.rekening_3 || undefined,
      kelompok: item.kelompok,
      link_katalog_1: link1,
      link_katalog_2: link2 || undefined,
      link_katalog_3: link3 || undefined,
      tkdn_1: Number(item.tkdn_1) || 0,
      tkdn_2: item.tkdn_2 ? Number(item.tkdn_2) : undefined,
      tkdn_3: item.tkdn_3 ? Number(item.tkdn_3) : undefined,
      status: resolvedStatus,
      catatan_perbaikan: catatanPerbaikanPengusul.trim() || undefined,
    };
  };

  // Simpan / Kirim Semua Usulan
  const handleSubmit = async (targetStatus: "draft" | "diajukan") => {
    if (!isPeriodOpen && user?.role !== "admin") {
      toast({
        title: "Periode Pengusulan Ditutup",
        description: "Tidak dapat menyimpan usulan saat periode pengusulan tidak dibuka.",
        variant: "destructive",
      });
      return;
    }

    // Mode Edit Tunggal
    if (isEditing && editingItem) {
      if (!canEdit) {
        toast({
          title: "Akses Ditolak / Usulan Terkunci",
          description: !isOwner
            ? `Usulan ini milik unit ${editingItem.unit_kerja}. Anda tidak dapat mengubah data usulan unit lain.`
            : editingItem.status === "diajukan"
            ? "Usulan sedang dalam proses verifikasi. Menunggu keputusan verifikator sebelum dapat diedit."
            : "Usulan ini telah disetujui dan tidak dapat diedit lagi.",
          variant: "destructive",
        });
        return;
      }
      const single = itemList[0];
      if (!validateSingleItem(single, 0, targetStatus === "draft")) return;
      setIsSubmitting(true);
      try {
        const payload = buildPayload(single, targetStatus);
        const ok = await updateItem(editingItem.id, payload);
        if (ok) onSuccess();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Mode Multi-Item Usulan Baru
    for (let i = 0; i < itemList.length; i++) {
      const item = itemList[i];
      if (!validateSingleItem(item, i, targetStatus === "draft")) {
        setActiveIndex(i); // Langsung pindah ke item yang belum lengkap
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadList = itemList.map((it) => buildPayload(it, targetStatus));
      let ok = false;
      if (createBatchItems) {
        ok = await createBatchItems(payloadList);
      } else {
        for (const p of payloadList) {
          await createItem(p);
        }
        ok = true;
      }

      if (ok) {
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden animate-enter-from-bottom">
      {/* Header Formulir Usulan */}
      <CardHeader className="bg-gradient-to-r from-slate-50 via-blue-50/25 to-teal-50/25 border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <FileCheck size={16} />
              </div>
              {isEditing
                ? "Edit Lembar Usulan Standar Harga Satuan"
                : "Formulir Usulan Standar Harga Satuan (Bisa Input Beberapa Usulan)"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              {isEditing
                ? "Perbarui rincian spesifikasi, harga, rekening, dan tautan e-katalog."
                : `Anda dapat menambahkan beberapa usulan barang sekaligus (${itemList.length} usulan saat ini) dan menyimpannya secara kolektif.`}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold px-3 py-1 text-xs gap-1.5 shadow-2xs">
              <Calendar size={13} />
              Tahun Anggaran {activePeriod?.tahun || 2027}
            </Badge>
          </div>
        </div>

        {/* Banner Peringatan Periode Pengusulan Ditutup (Terkunci Otomatis) */}
        {!isPeriodOpen && user?.role !== "admin" && (
          <div className="mt-3 p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Lock size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-rose-950 text-sm flex items-center gap-2">
                  <span>Periode Pengusulan Telah Ditutup (Form Terkunci)</span>
                </div>
                <p className="text-rose-800 mt-0.5 leading-relaxed">
                  Batas waktu pengusulan Standar Harga Satuan (SHS) telah berakhir pada{" "}
                  <b>
                    {activePeriod?.tutup_at
                      ? new Date(activePeriod.tutup_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "waktu yang ditentukan"}
                  </b>
                  . Sistem secara otomatis mengunci seluruh tombol simpan dan pengiriman usulan baru tanpa perlu memuat ulang halaman.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner 1: Peringatan Hak Akses - Usulan Milik Bidang/Unit Lain */}
        {editingItem && !isOwner && (
          <div className="mt-3 p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Lock size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-rose-950 text-sm">
                  Akses Ditolak: Usulan Milik {editingItem.unit_kerja}
                </div>
                <p className="text-rose-800 mt-0.5 leading-relaxed">
                  Usulan ini diinput oleh <b>{editingItem.nama_pengusul}</b> dari unit kerja <b>{editingItem.unit_kerja}</b>. Bidang atau Puskesmas lain tidak memiliki kewenangan mengubah atau menghapus usulan ini.
                </p>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-rose-200">
              <SHSTimeline item={editingItem} />
            </div>
          </div>
        )}

        {/* Banner 2: Peringatan Status - Usulan Sedang Diverifikasi (Terkunci) */}
        {editingItem && isOwner && editingItem.status === "diajukan" && (
          <div className="mt-3 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Lock size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-amber-950 text-sm">
                  Usulan Terkunci: Sedang Dalam Proses Verifikasi
                </div>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Usulan ini telah diajukan dan sedang menunggu pemeriksaan oleh Verifikator Admin Dinkes serta Pengurus Barang. Usulan <b>terkunci dan tidak dapat diedit</b> sampai ada keputusan verifikator (perlu perbaikan atau ditolak).
                </p>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-amber-200">
              <SHSTimeline item={editingItem} />
            </div>
          </div>
        )}

        {/* Banner 2B: Usulan Selesai Diperbaiki */}
        {editingItem && isOwner && editingItem.status === "diperbaiki" && (
          <div className="mt-3 p-4 bg-teal-50 border border-teal-300 rounded-2xl text-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-teal-950 text-sm flex items-center gap-2">
                  <span>Usulan Selesai Diperbaiki (Revisi #{editingItem.revisi_ke || 1})</span>
                </div>
                <p className="text-teal-800 mt-0.5 leading-relaxed">
                  Usulan ini berstatus <b>&quot;Selesai Diperbaiki&quot;</b>. Seluruh data perbaikan telah tersimpan dan diteruskan ke Tim Verifikator.
                </p>
                {editingItem.catatan_perbaikan && (
                  <div className="mt-2 p-2.5 bg-white/90 border border-teal-200 rounded-xl text-teal-950 text-xs">
                    <span className="font-bold block text-[11px] text-teal-700">Catatan Perbaikan Anda:</span>
                    {editingItem.catatan_perbaikan}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-teal-200">
              <SHSTimeline item={editingItem} />
            </div>
          </div>
        )}

        {/* Banner 3: Peringatan Status - Usulan Telah Disetujui Penuh */}
        {editingItem && isOwner && editingItem.status === "disetujui" && (
          <div className="mt-3 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-emerald-950 text-sm">
                  Usulan Telah Disetujui Penuh (2/2)
                </div>
                <p className="text-emerald-800 mt-0.5 leading-relaxed">
                  Usulan ini telah diverifikasi dan disetujui resmi oleh kedua verifikator sehingga terkunci permanen.
                </p>
              </div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
              <SHSTimeline item={editingItem} />
            </div>
          </div>
        )}

        {/* Banner 4: Usulan Dikembalikan untuk Perbaikan (Revisi Dibuka) */}
        {editingItem && canEdit && (editingItem.status === "perlu_perbaikan" || editingItem.status === "ditolak") && (
          <div className="mt-3 p-4 bg-orange-50 border border-orange-300 rounded-2xl text-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-orange-950 text-sm">
                  {editingItem.status === "perlu_perbaikan"
                    ? "Usulan Dikembalikan untuk Perbaikan (Revisi Dibuka)"
                    : "Usulan Ditolak (Dapat Diperbaiki & Diajukan Ulang)"}
                </div>
                <p className="text-orange-800 mt-0.5 leading-relaxed">
                  Periksa linimasa verifikasi di bawah untuk melihat catatan dari verifikator. Silakan sesuaikan data usulan pada formulir ini, tulis ringkasan apa saja yang diperbaiki, lalu klik <b>&quot;Kirim Usulan yang Telah Diperbaiki&quot;</b> agar statusnya berubah menjadi <b>Selesai Diperbaiki</b>.
                </p>
              </div>
            </div>

            {/* Input Catatan Perbaikan Pengusul */}
            <div className="bg-white p-3.5 rounded-xl border border-orange-200 space-y-2">
              <label className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                <Sparkles size={14} className="text-orange-600" />
                Catatan Perbaikan dari Pengusul (Jelaskan apa yang telah disesuaikan):
              </label>
              <Textarea
                value={catatanPerbaikanPengusul}
                onChange={(e) => setCatatanPerbaikanPengusul(e.target.value)}
                placeholder="Contoh: Sudah disesuaikan harga satuan dan link e-katalog terupdate sesuai arahan verifikator..."
                className="bg-orange-50/30 border-orange-300 text-xs rounded-xl focus:ring-orange-500"
                rows={2}
              />
              <span className="text-[10px] text-orange-700 block">
                Catatan ini akan langsung terlihat oleh Tim Verifikator saat memeriksa usulan hasil perbaikan Anda.
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-orange-200">
              <SHSTimeline item={editingItem} />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        <fieldset disabled={isEditing && !canEdit} className="space-y-6 border-0 p-0 m-0 min-w-0">
          {/* BAGIAN 1: Identitas Unit Pengusul (Berlaku untuk seluruh usulan dalam sesi ini) */}
        <div className="rounded-2xl bg-slate-50/80 p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building size={15} className="text-blue-600" />
              Identitas Unit Pengusul
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Berlaku untuk seluruh {itemList.length} usulan dalam sesi ini
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Nama Pengusul / Akun:
              </label>
              <Input
                value={namaPengusul}
                onChange={(e) => setNamaPengusul(e.target.value)}
                placeholder="Username login pengusul"
                className="bg-white text-xs h-9 rounded-xl"
              />
              <span className="text-[10px] text-slate-400 block">
                Terisi otomatis dari akun login Anda.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Unit Kerja / Puskesmas / Bidang Pengusul:
              </label>
              {isAdmin ? (
                <SearchableSelect
                  options={unitOptions}
                  value={unitKerja}
                  onChange={setUnitKerja}
                  placeholder="Ketik untuk mencari Puskesmas atau Bidang..."
                  searchPlaceholder="Cari nama Puskesmas / Bidang..."
                />
              ) : (
                <div className="flex items-center justify-between gap-2 p-2.5 px-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 font-semibold h-9 shadow-2xs">
                  <div className="flex items-center gap-2 truncate">
                    <Building size={14} className="text-blue-600 shrink-0" />
                    <span className="truncate">{unitKerja || inferUnitFromUser(user?.username)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">
                    🏢 Terkunci (Bidang Anda)
                  </span>
                </div>
              )}
              <span className="text-[10px] text-slate-400 block">
                {isAdmin
                  ? "Pilih unit kerja atau Puskesmas yang mengajukan."
                  : "Unit kerja terkunci otomatis sesuai bidang akun login Anda."}
              </span>
            </div>
          </div>
        </div>

        {/* BAGIAN 2: Navigator Multi-Item Usulan Barang */}
        {!isEditing && (
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={15} className="text-blue-600" />
                  Daftar Barang yang Diusulkan ({itemList.length} Usulan)
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Klik tab untuk beralih antar usulan, atau gunakan tombol di kanan untuk menambah dan menyalin item.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Estimasi Total: {formatRupiah(batchTotalAnggaran)}
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNewItem}
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 px-3 rounded-xl shadow-xs"
                >
                  <Plus size={14} />
                  Tambah Usulan Baru
                </Button>
              </div>
            </div>

            {/* TAB PILLS USULAN BARANG */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {itemList.map((it, idx) => {
                const isActive = idx === safeActiveIndex;
                const isComplete = checkItemCompletion(it);
                const h = Number(String(it.harga || "").replace(/\D/g, "")) || 0;
                const o = Number(String(it.ongkir || "").replace(/\D/g, "")) || 0;
                const itemTotal = h + o;

                return (
                  <div
                    key={it.tempId}
                    onClick={() => setActiveIndex(idx)}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all border ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm font-semibold"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {/* Status icon kelengkapan */}
                    {isComplete ? (
                      <CheckCircle2
                        size={13}
                        className={isActive ? "text-emerald-200" : "text-emerald-600"}
                      />
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? "bg-amber-300" : "bg-amber-400"
                        }`}
                        title="Belum lengkap"
                      />
                    )}

                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className="font-bold">#{idx + 1}</span>
                        <span className="truncate max-w-[130px] sm:max-w-[160px]">
                          {it.uraian.trim() || "Usulan Baru"}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono ${
                          isActive ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {itemTotal > 0 ? formatRupiah(itemTotal) : "Rp 0"}
                      </span>
                    </div>

                    {/* Tombol Hapus pada Tab (jika item > 1) */}
                    {itemList.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(idx);
                        }}
                        className={`p-1 rounded-lg transition-colors ml-1 ${
                          isActive
                            ? "hover:bg-blue-700 text-white/80 hover:text-white"
                            : "hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                        }`}
                        title="Hapus usulan ini"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddNewItem}
                className="h-10 px-3 text-xs border-dashed border-blue-300 text-blue-700 hover:bg-blue-50/70 rounded-xl gap-1.5 font-medium"
              >
                <Plus size={14} />
                + Tambah Item
              </Button>
            </div>

            {/* Quick Action Strip Usulan Aktif */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 px-1 text-xs text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">
                  Mengedit Usulan #{safeActiveIndex + 1} dari {itemList.length}:
                </span>
                <span className="font-medium text-blue-700 truncate max-w-xs">
                  {activeItem.uraian || "Belum ada nama barang"}
                </span>
                {checkItemCompletion(activeItem) ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0 px-2">
                    Lengkap
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] py-0 px-2">
                    Belum Lengkap
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={safeActiveIndex === 0}
                  onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                  className="h-7 px-2 text-xs gap-1"
                >
                  <ChevronLeft size={13} /> Prev
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={safeActiveIndex === itemList.length - 1}
                  onClick={() => setActiveIndex((prev) => Math.min(itemList.length - 1, prev + 1))}
                  className="h-7 px-2 text-xs gap-1"
                >
                  Next <ChevronRight size={13} />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateItem(safeActiveIndex)}
                  className="h-7 px-2.5 text-xs text-slate-700 hover:text-blue-700 gap-1 rounded-lg"
                  title="Salin isi usulan aktif ke baris baru"
                >
                  <Copy size={12} /> Salin Usulan Ini
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TABEL FORMULIR ISIAN PARAMETER UNTUK USULAN AKTIF */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3 w-12 text-center border-r border-slate-200">No</th>
                <th className="py-3 px-4 w-52 sm:w-60 border-r border-slate-200">
                  Parameter / Komponen Usulan
                </th>
                <th className="py-3 px-4">
                  Formulir Input Data {itemList.length > 1 && `(Usulan #${safeActiveIndex + 1})`}
                </th>
                <th className="py-3 px-4 w-60 sm:w-72 border-l border-slate-200 hidden lg:table-cell">
                  Keterangan / Panduan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* BARIS 1: UNIT PENGUSUL & AKUN */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    1
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Building size={14} className="text-blue-600 shrink-0" />
                    Unit Pengusul & Akun
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Identitas instansi / unit pemohon
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Nama / Username Akun:
                      </label>
                      <Input
                        value={namaPengusul}
                        onChange={(e) => setNamaPengusul(e.target.value)}
                        placeholder="Username login"
                        className="bg-white text-xs h-9 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Puskesmas / Bidang Pengusul:
                      </label>
                      <SearchableSelect
                        options={unitOptions}
                        value={unitKerja}
                        onChange={setUnitKerja}
                        placeholder="Ketik untuk mencari unit..."
                        searchPlaceholder="Cari nama Puskesmas / Bidang..."
                      />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Terisi otomatis dari akun aktif Anda. Berlaku untuk seluruh usulan dalam sesi pengajuan ini.
                </td>
              </tr>

              {/* BARIS 2: KODE & KATEGORI BARANG (KEPMENDAGRI) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    2
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Tag size={14} className="text-blue-600 shrink-0" />
                    Kategori Barang BMD <span className="text-red-500 font-bold">*</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Kepmendagri 118 Kodefikasi Aset
                  </div>
                </td>
                <td className="py-4 px-4 align-top space-y-2">
                  <SearchableSelect
                    options={kategoriOptions}
                    value={activeItem.kode_kategori}
                    onChange={(val) => updateActiveField("kode_kategori", val)}
                    placeholder="-- Ketik untuk mencari Kategori (contoh: komputer, tensimeter, atk) --"
                    searchPlaceholder="Ketik nama barang atau kode kategori..."
                  />
                  {selectedKatObj && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50/50 border border-blue-200/60 rounded-lg text-[11px]">
                      <span className="font-mono font-bold text-blue-800">{selectedKatObj.kode}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-medium text-slate-700">{selectedKatObj.nama}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-blue-600 font-semibold">{selectedKatObj.kelompok}</span>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Pilih kodefikasi aset Barang Milik Daerah (BMD). Gunakan fitur ketik pada dropdown untuk menemukan nama kelompok barang dengan instan.
                </td>
              </tr>

              {/* BARIS 3: URAIAN / NAMA BARANG ATAU JASA */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    3
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <FileText size={14} className="text-blue-600 shrink-0" />
                    Uraian Barang / Jasa <span className="text-red-500 font-bold">*</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Nama resmi item belanja
                  </div>
                </td>
                <td className="py-4 px-4 align-top space-y-1">
                  <Input
                    value={activeItem.uraian}
                    onChange={(e) => updateActiveField("uraian", e.target.value)}
                    placeholder="Contoh: Kertas HVS A4 80 gram Sinar Dunia / Dental Unit Electric Treatment"
                    className="bg-white text-xs h-9 rounded-lg"
                    maxLength={255}
                    required
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Gunakan nama barang yang baku dan jelas tanpa singkatan asing.</span>
                    <span>{activeItem.uraian.length}/255</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Nama barang atau jasa yang diusulkan. Ini akan menjadi judul item standar harga yang digunakan seluruh unit di Dinkes.
                </td>
              </tr>

              {/* BARIS 4: SPESIFIKASI TEKNIS LENGKAP */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    4
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <FileCheck size={14} className="text-blue-600 shrink-0" />
                    Spesifikasi Teknis <span className="text-red-500 font-bold">*</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Merk, tipe, dimensi, garansi
                  </div>
                </td>
                <td className="py-4 px-4 align-top space-y-1">
                  <Textarea
                    value={activeItem.spek}
                    onChange={(e) => updateActiveField("spek", e.target.value)}
                    placeholder="Tuliskan spesifikasi detail: merk, tipe/model, ukuran dimensi, kapasitas, kebutuhan daya, kelengkapan aksesoris, masa garansi resmi, dan sertifikasi (SNI / Izin Edar Kemenkes)..."
                    className="bg-white text-xs min-h-[95px] rounded-lg font-sans"
                    maxLength={2000}
                    required
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Hindari hanya menyalin nama barang; cantumkan parameter fisik/teknis.</span>
                    <span>{activeItem.spek.length}/2000</span>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Spesifikasi teknis lengkap menjadi dasar verifikator menilai kelayakan harga pasar. Semakin detail, proses persetujuan semakin cepat.
                </td>
              </tr>

              {/* BARIS 5: SATUAN BAKU & KELOMPOK BELANJA */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    5
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Tag size={14} className="text-blue-600 shrink-0" />
                    Satuan & Kelompok <span className="text-red-500 font-bold">*</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Satuan baku & rumpun belanja
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Satuan Pengadaan Baku: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={satuanOptions}
                        value={activeItem.satuan}
                        onChange={(val) => updateActiveField("satuan", val)}
                        placeholder="Pilih Satuan Baku..."
                        searchPlaceholder="Cari satuan (Unit, Rim, Kotak)..."
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Kelompok Belanja: <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        options={kelompokOptions}
                        value={activeItem.kelompok}
                        onChange={(val) => updateActiveField("kelompok", val)}
                        placeholder="Pilih Kelompok Belanja..."
                        searchPlaceholder="Cari kelompok belanja..."
                      />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Gunakan satuan pengadaan terkecil yang biasa dibeli (contoh: Rim untuk kertas, Unit untuk alat, Botol untuk cairan).
                </td>
              </tr>

              {/* BARIS 6: KOMPONEN HARGA & ONGKIR */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    6
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Coins size={14} className="text-emerald-600 shrink-0" />
                    Harga & Ongkir <span className="text-red-500 font-bold">*</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Dasar kalkulasi harga satuan
                  </div>
                </td>
                <td className="py-4 px-4 align-top">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Harga Dasar */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Harga Satuan Dasar (Rp) <span className="text-red-500">*</span>:
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">Rp</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputRupiah(activeItem.harga)}
                          onChange={(e) => {
                            const parsed = parseSmartRupiahInput(e.target.value);
                            updateActiveField("harga", parsed);
                          }}
                          placeholder="0"
                          className="pl-8 bg-white text-xs h-9 font-mono font-semibold rounded-lg"
                          required
                        />
                      </div>

                      {/* Tombol Preset Cepat */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] text-slate-400 font-medium mr-0.5">Preset:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(String(activeItem.harga || "").replace(/\D/g, "")) || 0;
                            updateActiveField("harga", String(cur + 1_000_000));
                          }}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300 font-mono transition-colors"
                        >
                          +1 Jt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(String(activeItem.harga || "").replace(/\D/g, "")) || 0;
                            updateActiveField("harga", String(cur + 10_000_000));
                          }}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300 font-mono transition-colors"
                        >
                          +10 Jt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(String(activeItem.harga || "").replace(/\D/g, "")) || 0;
                            updateActiveField("harga", String(cur + 100_000_000));
                          }}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300 font-mono transition-colors"
                        >
                          +100 Jt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateActiveField("harga", "1000000000");
                          }}
                          className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-300 font-bold font-mono transition-colors"
                        >
                          1 Miliar (1 M)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActiveField("harga", "0")}
                          className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded border border-rose-200 transition-colors"
                          title="Reset harga ke 0"
                        >
                          Reset
                        </button>
                      </div>

                      {activeNumericHarga > 0 ? (
                        <span className="text-[11px] text-emerald-700 font-semibold block pt-0.5">
                          ✓ Terbaca: {formatRupiah(activeNumericHarga)} ({formatTerbilangSingkat(activeNumericHarga)})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          Bebas ketik angka atau kata (contoh: 1 miliar, 220 juta, 1m)
                        </span>
                      )}
                    </div>

                    {/* Ongkos Kirim */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Ongkos Kirim (Rp):
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">Rp</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputRupiah(activeItem.ongkir)}
                          onChange={(e) => {
                            const parsed = parseSmartRupiahInput(e.target.value);
                            updateActiveField("ongkir", parsed);
                          }}
                          placeholder="0"
                          className="pl-8 bg-white text-xs h-9 font-mono rounded-lg"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        {activeNumericOngkir > 0
                          ? `Terbaca: ${formatRupiah(activeNumericOngkir)} (${formatTerbilangSingkat(activeNumericOngkir)})`
                          : "Isi 0 jika bebas ongkir"}
                      </span>
                    </div>

                    {/* Total Terkunci */}
                    <div className="space-y-1 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-300">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                          <Calculator size={12} className="text-emerald-700" />
                          Total Standar (Rp):
                        </label>
                        <Lock size={11} className="text-emerald-600" />
                      </div>
                      <div className="relative mt-0.5">
                        <span className="absolute left-2 top-1.5 text-xs font-bold text-emerald-700">Rp</span>
                        <Input
                          type="text"
                          readOnly
                          disabled
                          value={new Intl.NumberFormat("id-ID").format(activeTotalHarga)}
                          className="pl-8 bg-white border-emerald-300 text-emerald-900 text-xs h-8 font-mono font-black rounded-lg cursor-not-allowed"
                        />
                      </div>
                      <span className="text-[10px] text-emerald-700 block font-medium">
                        Otomatis = Harga + Ongkir
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Harga Satuan adalah harga riil barang di e-katalog. Masukkan ongkos kirim jika belum termasuk dalam harga katalog. Total dihitung otomatis oleh sistem.
                </td>
              </tr>

              {/* BARIS 7: KODE REKENING BELANJA (PERMENDAGRI 90) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    7
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Coins size={14} className="text-blue-600 shrink-0" />
                    Rekening Belanja <span className="text-red-500 font-bold">*</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Kepmendagri 050-5889 / SIPD RI
                  </div>
                </td>
                <td className="py-4 px-4 align-top space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Rekening Belanja 1 (Utama / Wajib): <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={rekeningOptions}
                      value={activeItem.rekening_1}
                      onChange={(val) => updateActiveField("rekening_1", val)}
                      placeholder="-- Ketik Kode / Uraian Rekening 1 (cth: 5.1.02.01.001.00012) --"
                      searchPlaceholder="Cari kode rekening atau uraian..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Rekening Belanja 2 (Opsional):
                      </label>
                      <SearchableSelect
                        options={rekeningOptions}
                        value={activeItem.rekening_2}
                        onChange={(val) => updateActiveField("rekening_2", val)}
                        placeholder="-- Tanpa Rekening 2 (Kosong) --"
                        searchPlaceholder="Cari rekening belanja 2..."
                        allowClear
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Rekening Belanja 3 (Opsional):
                      </label>
                      <SearchableSelect
                        options={rekeningOptions}
                        value={activeItem.rekening_3}
                        onChange={(val) => updateActiveField("rekening_3", val)}
                        disabled={!activeItem.rekening_2}
                        placeholder={
                          activeItem.rekening_2
                            ? "-- Tanpa Rekening 3 (Kosong) --"
                            : "-- Terkunci (Isi Rekening 2 Dulu) --"
                        }
                        searchPlaceholder="Cari rekening belanja 3..."
                        allowClear
                      />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Mata anggaran belanja APBD (kode 5.1.02...). Rekening 1 wajib diisi. Rekening 2 dan 3 opsional jika belanja dapat dialokasikan pada lebih dari satu pos kegiatan.
                </td>
              </tr>

              {/* BARIS 8: TAUTAN E-KATALOG & NILAI TKDN */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-3 text-center align-top font-bold text-slate-600 border-r border-slate-200 bg-slate-50/30">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs">
                    8
                  </span>
                </td>
                <td className="py-4 px-4 align-top border-r border-slate-200 bg-slate-50/30">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <LinkIcon size={14} className="text-blue-600 shrink-0" />
                    Tautan E-Katalog & TKDN <span className="text-red-500 font-bold">*</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Bukti survei harga LKPP (Katalog 1 & 2 Wajib)
                  </div>
                </td>
                <td className="py-4 px-4 align-top space-y-3">
                  {/* Katalog 1: Utama (Wajib) */}
                  <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                          1
                        </span>
                        Tautan E-Katalog Utama <span className="text-red-500 font-bold">* (Wajib)</span>
                      </span>
                      {activeItem.link_katalog_1.startsWith("http") && (
                        <a
                          href={activeItem.link_katalog_1}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                        >
                          Buka Link <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-3">
                        <Input
                          type="url"
                          value={activeItem.link_katalog_1}
                          onChange={(e) => updateActiveField("link_katalog_1", e.target.value)}
                          placeholder="https://e-katalog.lkpp.go.id/katalog/produk/detail/..."
                          className="bg-white text-xs h-9 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={activeItem.tkdn_1}
                            onChange={(e) => updateActiveField("tkdn_1", e.target.value)}
                            placeholder="TKDN"
                            className="bg-white text-xs h-9 pr-7 font-mono rounded-lg"
                          />
                          <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Katalog 2: Pembanding 1 (Wajib) */}
                  <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                          2
                        </span>
                        Tautan E-Katalog Pembanding 1 <span className="text-red-500 font-bold">* (Wajib)</span>
                      </span>
                      {activeItem.link_katalog_2.startsWith("http") && (
                        <a
                          href={activeItem.link_katalog_2}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                        >
                          Buka Link <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-3">
                        <Input
                          type="url"
                          value={activeItem.link_katalog_2}
                          onChange={(e) => updateActiveField("link_katalog_2", e.target.value)}
                          placeholder="https://e-katalog.lkpp.go.id/..."
                          className="bg-white text-xs h-9 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={activeItem.tkdn_2}
                            onChange={(e) => updateActiveField("tkdn_2", e.target.value)}
                            placeholder="TKDN 2"
                            className="bg-white text-xs h-9 pr-7 font-mono rounded-lg"
                          />
                          <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Katalog 3: Pembanding 2 (Opsional) */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                          3
                        </span>
                        Tautan Pembanding 2 (Opsional)
                      </span>
                      {activeItem.link_katalog_3.startsWith("http") && (
                        <a
                          href={activeItem.link_katalog_3}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                        >
                          Buka Link <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-3">
                        <Input
                          type="url"
                          value={activeItem.link_katalog_3}
                          onChange={(e) => updateActiveField("link_katalog_3", e.target.value)}
                          placeholder="https://e-katalog.lkpp.go.id/..."
                          className="bg-white text-xs h-9 rounded-lg"
                        />
                      </div>
                      <div>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={activeItem.tkdn_3}
                            onChange={(e) => updateActiveField("tkdn_3", e.target.value)}
                            placeholder="TKDN 3"
                            className="bg-white text-xs h-9 pr-7 font-mono rounded-lg"
                          />
                          <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-bold">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 align-top text-[11px] text-slate-500 border-l border-slate-200 hidden lg:table-cell leading-relaxed bg-slate-50/30">
                  Tautan resmi produk pada platform e-Katalog LKPP (https://e-katalog.lkpp.go.id/...). Tautan 1 dan Tautan 2 wajib diisi, sedangkan Tautan 3 bersifat opsional sebagai pembanding tambahan. TKDN adalah persentase sertifikasi Tingkat Komponen Dalam Negeri (isi 0 jika barang impor).
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* BAGIAN 3: Ringkasan Tabel Seluruh Usulan (Batch Overview Table) jika > 1 Usulan */}
        {!isEditing && itemList.length > 1 && (
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Ringkasan Rekapitulasi {itemList.length} Usulan Barang dalam Batch Ini
              </span>
              <span className="text-xs font-bold text-emerald-800">
                Total Anggaran Batch: {formatRupiah(batchTotalAnggaran)}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3">Uraian Barang</th>
                    <th className="py-2 px-3">Satuan</th>
                    <th className="py-2 px-3 text-right">Harga Dasar</th>
                    <th className="py-2 px-3 text-right">Ongkir</th>
                    <th className="py-2 px-3 text-right">Total (Rp)</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemList.map((it, idx) => {
                    const isCur = idx === safeActiveIndex;
                    const itTotal = (Number(it.harga) || 0) + (Number(it.ongkir) || 0);
                    const itComplete = checkItemCompletion(it);

                    return (
                      <tr
                        key={it.tempId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCur ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => setActiveIndex(idx)}
                            className="font-semibold text-blue-700 hover:underline text-left"
                          >
                            {it.uraian || "(Belum diberi nama)"}
                          </button>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{it.satuan}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatRupiah(Number(String(it.harga || "").replace(/\D/g, "")) || 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {formatRupiah(Number(String(it.ongkir || "").replace(/\D/g, "")) || 0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatRupiah(itTotal)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {itComplete ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                              Lengkap
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveIndex(idx)}
                              className="h-6 px-2 text-[11px] text-blue-600"
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateItem(idx)}
                              className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-blue-700"
                              title="Duplikasi"
                            >
                              <Copy size={11} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(idx)}
                              className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-rose-600"
                              title="Hapus"
                            >
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        </fieldset>

        {/* Tombol Aksi Formulir */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="text-[11px] text-slate-500 self-start sm:self-auto flex items-center gap-1.5">
            {isEditing && !canEdit ? (
              <span className="inline-flex items-center gap-1.5 text-amber-800 font-medium">
                <Lock size={14} className="text-amber-600" />
                Mode Lihat Saja: {!isOwner ? `Milik unit ${editingItem.unit_kerja}` : editingItem.status === "diajukan" ? "Usulan sedang diverifikasi" : "Usulan telah disetujui"}
              </span>
            ) : (
              <>
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>
                  {isEditing
                    ? "Menyimpan perubahan pada usulan yang dipilih."
                    : `Menyiapkan ${itemList.length} usulan barang • Estimasi total: ${formatRupiah(
                        batchTotalAnggaran
                      )}`}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {onCancel && (
              <Button
                type="button"
                variant={isEditing && !canEdit ? "default" : "outline"}
                onClick={onCancel}
                className={`w-full sm:w-auto text-xs rounded-xl h-10 px-5 ${
                  isEditing && !canEdit
                    ? "bg-slate-800 hover:bg-slate-900 text-white font-semibold"
                    : ""
                }`}
              >
                {isEditing && !canEdit ? "Kembali ke Daftar" : "Batal"}
              </Button>
            )}

            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddNewItem}
                className="w-full sm:w-auto text-xs rounded-xl h-10 px-4 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Plus size={14} />
                Tambah Usulan Lagi
              </Button>
            )}

            {isEditing && canEdit && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || (!isPeriodOpen && user?.role !== "admin")}
                onClick={() => handleSubmit("draft")}
                className="w-full sm:w-auto gap-2 text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl h-10 px-5 font-semibold"
              >
                <Save size={15} />
                Simpan sebagai Draft
              </Button>
            )}

            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || (!isPeriodOpen && user?.role !== "admin")}
                onClick={() => handleSubmit("draft")}
                className="w-full sm:w-auto gap-2 text-xs border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl h-10 px-5 font-semibold"
              >
                <Save size={15} />
                Simpan Semua ({itemList.length}) sebagai Draft
              </Button>
            )}

            {(!isEditing || canEdit) && (
              <Button
                type="button"
                disabled={isSubmitting || (!isPeriodOpen && user?.role !== "admin")}
                onClick={() => handleSubmit("diajukan")}
                className={`w-full sm:w-auto gap-2 text-xs text-white font-semibold rounded-xl h-10 px-6 shadow-md transition-all ${
                  isEditing && (editingItem?.status === "perlu_perbaikan" || editingItem?.status === "ditolak")
                    ? "bg-teal-600 hover:bg-teal-700 shadow-teal-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {isEditing && (editingItem?.status === "perlu_perbaikan" || editingItem?.status === "ditolak") ? (
                  <Sparkles size={15} />
                ) : (
                  <Send size={15} />
                )}
                {isSubmitting
                  ? "Menyimpan..."
                  : isEditing
                  ? editingItem?.status === "perlu_perbaikan" || editingItem?.status === "ditolak"
                    ? "✨ Kirim Usulan yang Telah Diperbaiki"
                    : "Simpan & Ajukan Usulan"
                  : `Kirim Semua (${itemList.length}) Usulan`}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
