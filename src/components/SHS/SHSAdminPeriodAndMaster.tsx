// src/components/SHS/SHSAdminPeriodAndMaster.tsx
import { useState, useMemo, useEffect } from "react";
import {
  SHSPeriod,
  MasterKategori,
  MasterRekening,
  MasterSatuan,
  MasterKelompok,
} from "@/types/shs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Calendar,
  Database,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Layers,
  BookOpen,
  Search,
  Edit2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface SHSAdminPeriodAndMasterProps {
  activePeriod: SHSPeriod;
  masterKategori: MasterKategori[];
  masterRekening: MasterRekening[];
  masterSatuan: MasterSatuan[];
  masterKelompok: MasterKelompok[];
  onSavePeriod: (period: SHSPeriod) => Promise<boolean>;
  onUpdateMasterKategori: (list: MasterKategori[]) => void;
  onUpdateMasterRekening: (list: MasterRekening[]) => void;
  onUpdateMasterSatuan: (list: MasterSatuan[]) => void;
  onUpdateMasterKelompok: (list: MasterKelompok[]) => void;
  // Database Master Props
  isDatabaseConnected?: boolean;
  isSyncingMasters?: boolean;
  onAddMasterKategori?: (item: MasterKategori) => Promise<boolean>;
  onDeleteMasterKategori?: (kode: string) => Promise<boolean>;
  onAddMasterRekening?: (item: MasterRekening) => Promise<boolean>;
  onDeleteMasterRekening?: (kode: string) => Promise<boolean>;
  onSyncAllMastersToDatabase?: () => Promise<boolean>;
  onRefreshMasterData?: () => Promise<void>;
}

const ITEMS_PER_PAGE = 50;

// Helper konversi ISO UTC string dari database ke string datetime-local dalam zona waktu WIB (Asia/Jakarta)
const toDateTimeLocalWIB = (isoString?: string): string => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";
    return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}`;
  } catch {
    return "";
  }
};

// Helper konversi input datetime-local (WIB) ke ISO UTC string dengan offset +07:00 eksplisit
const wibStringToIso = (val?: string): string => {
  if (!val) return "";
  try {
    const withOffset = val.length === 16 ? `${val}:00+07:00` : val;
    return new Date(withOffset).toISOString();
  } catch {
    return new Date(val).toISOString();
  }
};

export const SHSAdminPeriodAndMaster = ({
  activePeriod,
  masterKategori,
  masterRekening,
  masterSatuan,
  masterKelompok,
  onSavePeriod,
  onUpdateMasterKategori,
  onUpdateMasterRekening,
  onUpdateMasterSatuan,
  onUpdateMasterKelompok,
  isDatabaseConnected = true,
  isSyncingMasters = false,
  onAddMasterKategori,
  onDeleteMasterKategori,
  onAddMasterRekening,
  onDeleteMasterRekening,
  onSyncAllMastersToDatabase,
  onRefreshMasterData,
}: SHSAdminPeriodAndMasterProps) => {
  // Active Sub-tab: 'periode' | 'kategori' | 'rekening' | 'satuan'
  const [subTab, setSubTab] = useState<"periode" | "kategori" | "rekening" | "satuan">("periode");

  // Form Periode
  const [namaPeriode, setNamaPeriode] = useState(activePeriod?.nama || "");
  const [tahunPeriode, setTahunPeriode] = useState(String(activePeriod?.tahun || 2027));
  const [bukaAt, setBukaAt] = useState(() => toDateTimeLocalWIB(activePeriod?.buka_at));
  const [tutupAt, setTutupAt] = useState(() => toDateTimeLocalWIB(activePeriod?.tutup_at));
  const [deskripsiPeriode, setDeskripsiPeriode] = useState(activePeriod?.deskripsi || "");
  const [isAktif, setIsAktif] = useState(activePeriod?.aktif ?? true);
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);

  // Sinkronisasi form saat data activePeriod dari database dimuat atau berubah
  useEffect(() => {
    if (activePeriod) {
      setNamaPeriode(activePeriod.nama || "");
      setTahunPeriode(String(activePeriod.tahun || 2027));
      setBukaAt(toDateTimeLocalWIB(activePeriod.buka_at));
      setTutupAt(toDateTimeLocalWIB(activePeriod.tutup_at));
      setDeskripsiPeriode(activePeriod.deskripsi || "");
      setIsAktif(activePeriod.aktif ?? true);
    }
  }, [activePeriod]);

  // Form Tambah Master Kategori
  const [newKatKode, setNewKatKode] = useState("");
  const [newKatNama, setNewKatNama] = useState("");
  const [newKatKelompok, setNewKatKelompok] = useState("SSH");
  const [isAddingKat, setIsAddingKat] = useState(false);

  // Search & Pagination Kategori
  const [searchKat, setSearchKat] = useState("");
  const [katPage, setKatPage] = useState(1);

  // Edit Kategori Modal
  const [editingKat, setEditingKat] = useState<MasterKategori | null>(null);
  const [editKatNama, setEditKatNama] = useState("");
  const [editKatKelompok, setEditKatKelompok] = useState("");
  const [editKatAktif, setEditKatAktif] = useState(true);

  // Form Tambah Master Rekening
  const [newRekKode, setNewRekKode] = useState("");
  const [newRekUraian, setNewRekUraian] = useState("");
  const [isAddingRek, setIsAddingRek] = useState(false);

  // Search Rekening
  const [searchRek, setSearchRek] = useState("");

  // Edit Rekening Modal
  const [editingRek, setEditingRek] = useState<MasterRekening | null>(null);
  const [editRekUraian, setEditRekUraian] = useState("");
  const [editRekAktif, setEditRekAktif] = useState(true);

  // Form Tambah Satuan
  const [newSatNama, setNewSatNama] = useState("");
  const [newSatKet, setNewSatKet] = useState("");

  // SQL Script Dialog
  const [showSqlDialog, setShowSqlDialog] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Handle Save Period
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPeriode.trim() || !bukaAt || !tutupAt) {
      toast({
        title: "Form Belum Lengkap",
        description: "Nama periode, waktu buka, dan tutup wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPeriod(true);
    try {
      const payload: SHSPeriod = {
        ...activePeriod,
        nama: namaPeriode.trim(),
        tahun: Number(tahunPeriode) || 2027,
        buka_at: wibStringToIso(bukaAt),
        tutup_at: wibStringToIso(tutupAt),
        deskripsi: deskripsiPeriode.trim(),
        aktif: isAktif,
      };

      await onSavePeriod(payload);
    } finally {
      setIsSavingPeriod(false);
    }
  };

  // Add Master Kategori
  const handleAddKategori = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKatKode.trim() || !newKatNama.trim()) return;

    if (masterKategori.some((k) => k.kode === newKatKode.trim())) {
      toast({
        title: "Kode Duplikat",
        description: "Kode kategori tersebut sudah ada dalam sistem.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingKat(true);
    const item: MasterKategori = {
      kode: newKatKode.trim(),
      nama: newKatNama.trim(),
      kelompok: newKatKelompok.trim() || "SSH",
      aktif: true,
    };

    try {
      let savedToDb = false;
      if (onAddMasterKategori) {
        savedToDb = await onAddMasterKategori(item);
      } else {
        onUpdateMasterKategori([item, ...masterKategori]);
      }
      setNewKatKode("");
      setNewKatNama("");
      if (savedToDb) {
        toast({
          title: "Berhasil Tersimpan di Database! 🎉",
          description: `Kategori ${item.kode} berhasil disimpan permanen ke database Supabase.`,
        });
      } else {
        toast({
          title: "⚠️ Disimpan Sementara di Browser",
          description: `Tabel 'shs_master_kategori' belum aktif di Supabase! Data disimpan di browser. Jalankan Skrip SQL Migrasi di Supabase Dashboard agar tersimpan permanen.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsAddingKat(false);
    }
  };

  // Delete Kategori
  const handleDeleteKategori = async (kode: string) => {
    if (!confirm(`Hapus kategori ${kode} dari database?`)) return;
    let savedToDb = false;
    if (onDeleteMasterKategori) {
      savedToDb = await onDeleteMasterKategori(kode);
    } else {
      const updated = masterKategori.filter((k) => k.kode !== kode);
      onUpdateMasterKategori(updated);
    }
    if (savedToDb) {
      toast({ title: "Terhapus dari Database", description: `Kategori ${kode} berhasil dihapus dari database.` });
    } else {
      toast({
        title: "Dihapus dari Browser",
        description: `Kategori ${kode} dihapus dari browser lokal (tabel database belum aktif).`,
        variant: "destructive",
      });
    }
  };

  // Open Edit Kategori
  const handleOpenEditKat = (k: MasterKategori) => {
    setEditingKat(k);
    setEditKatNama(k.nama);
    setEditKatKelompok(k.kelompok || "SSH");
    setEditKatAktif(k.aktif !== false);
  };

  // Save Edit Kategori
  const handleSaveEditKat = async () => {
    if (!editingKat) return;
    const updatedItem: MasterKategori = {
      ...editingKat,
      nama: editKatNama.trim(),
      kelompok: editKatKelompok.trim() || "SSH",
      aktif: editKatAktif,
    };

    let savedToDb = false;
    if (onAddMasterKategori) {
      savedToDb = await onAddMasterKategori(updatedItem);
    } else {
      const updated = masterKategori.map((k) => (k.kode === updatedItem.kode ? updatedItem : k));
      onUpdateMasterKategori(updated);
    }

    setEditingKat(null);
    if (savedToDb) {
      toast({
        title: "Perubahan Disimpan di Database! 🎉",
        description: `Kategori ${updatedItem.kode} berhasil diperbarui di database Supabase.`,
      });
    } else {
      toast({
        title: "⚠️ Perubahan Hanya di Browser",
        description: `Tabel 'shs_master_kategori' belum aktif di Supabase! Data diperbarui di browser lokal.`,
        variant: "destructive",
      });
    }
  };

  // Add Master Rekening
  const handleAddRekening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRekKode.trim() || !newRekUraian.trim()) return;

    if (masterRekening.some((r) => r.kode === newRekKode.trim())) {
      toast({
        title: "Kode Duplikat",
        description: "Kode rekening tersebut sudah ada dalam sistem.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingRek(true);
    const item: MasterRekening = {
      kode: newRekKode.trim(),
      uraian: newRekUraian.trim(),
      aktif: true,
    };

    try {
      let savedToDb = false;
      if (onAddMasterRekening) {
        savedToDb = await onAddMasterRekening(item);
      } else {
        onUpdateMasterRekening([item, ...masterRekening]);
      }
      setNewRekKode("");
      setNewRekUraian("");

      if (savedToDb) {
        toast({
          title: "Berhasil Tersimpan di Database! 🎉",
          description: `Rekening ${item.kode} (${item.uraian}) berhasil disimpan secara permanen di database Supabase.`,
        });
      } else {
        toast({
          title: "⚠️ Disimpan Sementara di Browser",
          description: `Tabel 'shs_master_rekening' belum dibuat di Supabase! Rekening disimpan di browser, jalankan Skrip SQL Migrasi di Supabase SQL Editor agar tersimpan permanen.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsAddingRek(false);
    }
  };

  // Delete Rekening
  const handleDeleteRekening = async (kode: string) => {
    if (!confirm(`Hapus rekening ${kode} dari database?`)) return;
    let savedToDb = false;
    if (onDeleteMasterRekening) {
      savedToDb = await onDeleteMasterRekening(kode);
    } else {
      const updated = masterRekening.filter((r) => r.kode !== kode);
      onUpdateMasterRekening(updated);
    }
    if (savedToDb) {
      toast({ title: "Terhapus dari Database", description: `Kode rekening ${kode} berhasil dihapus dari database Supabase.` });
    } else {
      toast({
        title: "Dihapus dari Browser",
        description: `Kode rekening ${kode} dihapus dari browser lokal (tabel database belum aktif).`,
        variant: "destructive",
      });
    }
  };

  // Open Edit Rekening
  const handleOpenEditRek = (r: MasterRekening) => {
    setEditingRek(r);
    setEditRekUraian(r.uraian);
    setEditRekAktif(r.aktif !== false);
  };

  // Save Edit Rekening
  const handleSaveEditRek = async () => {
    if (!editingRek) return;
    const updatedItem: MasterRekening = {
      ...editingRek,
      uraian: editRekUraian.trim(),
      aktif: editRekAktif,
    };

    let savedToDb = false;
    if (onAddMasterRekening) {
      savedToDb = await onAddMasterRekening(updatedItem);
    } else {
      const updated = masterRekening.map((r) => (r.kode === updatedItem.kode ? updatedItem : r));
      onUpdateMasterRekening(updated);
    }

    setEditingRek(null);
    if (savedToDb) {
      toast({
        title: "Perubahan Disimpan di Database! 🎉",
        description: `Rekening ${updatedItem.kode} berhasil diperbarui di database Supabase.`,
      });
    } else {
      toast({
        title: "⚠️ Perubahan Hanya di Browser",
        description: `Tabel 'shs_master_rekening' belum dibuat di Supabase! Rekening diperbarui di browser lokal.`,
        variant: "destructive",
      });
    }
  };

  // Add Satuan
  const handleAddSatuan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSatNama.trim()) return;
    const updated = [{ nama: newSatNama.trim(), keterangan: newSatKet.trim() }, ...masterSatuan];
    onUpdateMasterSatuan(updated);
    setNewSatNama("");
    setNewSatKet("");
    toast({ title: "Berhasil", description: "Satuan baru berhasil ditambahkan." });
  };

  // Filter & Pagination Kategori
  const filteredKategori = useMemo(() => {
    const q = searchKat.trim().toLowerCase();
    if (!q) return masterKategori;
    return masterKategori.filter(
      (k) =>
        k.kode.toLowerCase().includes(q) ||
        k.nama.toLowerCase().includes(q) ||
        (k.kelompok && k.kelompok.toLowerCase().includes(q))
    );
  }, [masterKategori, searchKat]);

  const totalKatPages = Math.max(1, Math.ceil(filteredKategori.length / ITEMS_PER_PAGE));
  const paginatedKategori = useMemo(() => {
    const start = (katPage - 1) * ITEMS_PER_PAGE;
    return filteredKategori.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredKategori, katPage]);

  // Filter Rekening
  const filteredRekening = useMemo(() => {
    const q = searchRek.trim().toLowerCase();
    if (!q) return masterRekening;
    return masterRekening.filter(
      (r) => r.kode.toLowerCase().includes(q) || r.uraian.toLowerCase().includes(q)
    );
  }, [masterRekening, searchRek]);

  // Copy SQL Migration
  const sqlSnippet = `-- ============================================================
-- SQL Migrasi Supabase: shs_master_kategori & shs_master_rekening
-- Jalankan di Menu 'SQL Editor' Dashboard Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shs_master_kategori (
  kode        TEXT PRIMARY KEY,
  nama        TEXT NOT NULL,
  kelompok    TEXT NOT NULL DEFAULT 'SSH',
  aktif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shs_master_kategori_nama ON public.shs_master_kategori(nama);
CREATE INDEX IF NOT EXISTS idx_shs_master_kategori_kelompok ON public.shs_master_kategori(kelompok);
CREATE INDEX IF NOT EXISTS idx_shs_master_kategori_aktif ON public.shs_master_kategori(aktif);

CREATE TABLE IF NOT EXISTS public.shs_master_rekening (
  kode        TEXT PRIMARY KEY,
  uraian      TEXT NOT NULL,
  aktif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shs_master_rekening_uraian ON public.shs_master_rekening(uraian);
CREATE INDEX IF NOT EXISTS idx_shs_master_rekening_aktif ON public.shs_master_rekening(aktif);

ALTER TABLE public.shs_master_kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shs_master_rekening ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select shs_master_kategori" ON public.shs_master_kategori;
DROP POLICY IF EXISTS "Allow insert shs_master_kategori" ON public.shs_master_kategori;
DROP POLICY IF EXISTS "Allow update shs_master_kategori" ON public.shs_master_kategori;
DROP POLICY IF EXISTS "Allow delete shs_master_kategori" ON public.shs_master_kategori;

CREATE POLICY "Allow select shs_master_kategori" ON public.shs_master_kategori FOR SELECT USING (true);
CREATE POLICY "Allow insert shs_master_kategori" ON public.shs_master_kategori FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update shs_master_kategori" ON public.shs_master_kategori FOR UPDATE USING (true);
CREATE POLICY "Allow delete shs_master_kategori" ON public.shs_master_kategori FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow select shs_master_rekening" ON public.shs_master_rekening;
DROP POLICY IF EXISTS "Allow insert shs_master_rekening" ON public.shs_master_rekening;
DROP POLICY IF EXISTS "Allow update shs_master_rekening" ON public.shs_master_rekening;
DROP POLICY IF EXISTS "Allow delete shs_master_rekening" ON public.shs_master_rekening;

CREATE POLICY "Allow select shs_master_rekening" ON public.shs_master_rekening FOR SELECT USING (true);
CREATE POLICY "Allow insert shs_master_rekening" ON public.shs_master_rekening FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update shs_master_rekening" ON public.shs_master_rekening FOR UPDATE USING (true);
CREATE POLICY "Allow delete shs_master_rekening" ON public.shs_master_rekening FOR DELETE USING (true);

-- Seed Data Rekening Belanja Standar (39 Kode Kepmendagri 050 / SIPD RI)
INSERT INTO public.shs_master_rekening (kode, uraian, aktif) VALUES
  ('5.1.02.01.001.00012', 'Belanja Bahan-Bahan Lainnya', true),
  ('5.1.02.01.001.00002', 'Belanja Bahan Kimia', true),
  ('5.1.02.01.001.00009', 'Belanja Bahan Isi Tabung Pemadam Kebakaran', true),
  ('5.1.02.01.001.00024', 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor', true),
  ('5.1.02.01.001.00025', 'Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover', true),
  ('5.1.02.01.001.00026', 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Cetak (Buku KIA/Formulir)', true),
  ('5.1.02.01.001.00027', 'Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos', true),
  ('5.1.02.01.001.00031', 'Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer', true),
  ('5.1.02.01.001.00032', 'Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor', true),
  ('5.1.02.01.001.00036', 'Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Listrik', true),
  ('5.1.02.01.001.00037', 'Belanja Obat-Obatan-Obat', true),
  ('5.1.02.01.001.00038', 'Belanja Bahan Obat', true),
  ('5.1.02.01.001.00039', 'Belanja Bahan Kimia', true),
  ('5.1.02.01.001.00040', 'Belanja Bahan Bakar Minyak/Gas', true),
  ('5.1.02.01.001.00052', 'Belanja Alat Kesehatan Habis Pakai', true),
  ('5.1.02.01.001.00053', 'Belanja Alat/Bahan untuk Kegiatan Kantor-ATK Puskesmas (BLUD)', true),
  ('5.1.02.01.001.00054', 'Belanja Reagen Laboratorium Kesehatan', true),
  ('5.1.02.01.001.00055', 'Belanja Bahan Makanan & Minuman Pasien/Rapat', true),
  ('5.1.02.02.001.00014', 'Belanja Jasa Pemeliharaan Peralatan Komputer', true),
  ('5.1.02.02.001.00016', 'Belanja Jasa Kalibrasi Alat Kesehatan', true),
  ('5.1.02.02.001.00026', 'Belanja Sewa Gedung / Ruang Pertemuan', true),
  ('5.2.02.02.001.00006', 'Belanja Modal Alat Angkutan Darat Bermotor', true),
  ('5.2.02.05.001.00005', 'Belanja Modal Peralatan Komputer - PC / Laptop', true),
  ('5.2.02.05.002.00001', 'Belanja Modal Peralatan Jaringan Komputer', true),
  ('5.2.02.07.001.00001', 'Belanja Modal Alat Kedokteran Umum', true),
  ('5.2.02.07.001.00002', 'Belanja Modal Alat Kedokteran/Kesehatan - Dental Chair', true),
  ('5.2.02.07.001.00014', 'Belanja Modal Alat Kedokteran Jantung', true),
  ('5.2.02.07.001.00029', 'Belanja Modal Alat Kedokteran Lainnya', true),
  ('5.2.02.07.002.00005', 'Belanja Modal Alat Kesehatan Umum Lainnya', true),
  ('5.2.02.08.001.00001', 'Belanja Modal Alat Kedokteran Umum', true),
  ('5.2.02.08.001.00011', 'Belanja Modal Alat Laboratorium Umum', true),
  ('5.2.02.08.001.00012', 'Belanja Modal Alat Laboratorium Mikrobiologi', true),
  ('5.2.02.08.001.00014', 'Belanja Modal Alat Kedokteran/Kesehatan - Photometer', true),
  ('5.2.02.08.001.00019', 'Belanja Modal Alat Kedokteran/Kesehatan - Mikroskop', true),
  ('5.2.02.08.001.00054', 'Belanja Modal Alat Kedokteran/Kesehatan - Bio Safety Cabinet (BSC)', true),
  ('5.2.02.08.001.00055', 'Belanja Modal Laboratorium Hematologi dan Urinalisis', true),
  ('5.2.02.08.002.00001', 'Belanja Modal Alat Kedokteran Gigi', true),
  ('5.2.02.08.003.00001', 'Belanja Modal Alat Kebidanan & Kandungan', true),
  ('5.2.02.08.005.00001', 'Belanja Modal Alat Laboratorium Medis', true)
ON CONFLICT (kode) DO UPDATE SET
  uraian = EXCLUDED.uraian,
  aktif = EXCLUDED.aktif;
`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    toast({
      title: "SQL Disalin ke Clipboard",
      description: "Silakan buka Supabase SQL Editor dan jalankan skrip ini.",
    });
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <Button
          type="button"
          size="sm"
          variant={subTab === "periode" ? "default" : "outline"}
          onClick={() => setSubTab("periode")}
          className={`gap-1.5 text-xs ${
            subTab === "periode" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          <Calendar size={14} /> Kelola Periode Pengusulan
        </Button>

        <Button
          type="button"
          size="sm"
          variant={subTab === "kategori" ? "default" : "outline"}
          onClick={() => {
            setSubTab("kategori");
            setKatPage(1);
          }}
          className={`gap-1.5 text-xs ${
            subTab === "kategori" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          <Database size={14} /> Master Kategori Barang ({masterKategori.length})
        </Button>

        <Button
          type="button"
          size="sm"
          variant={subTab === "rekening" ? "default" : "outline"}
          onClick={() => setSubTab("rekening")}
          className={`gap-1.5 text-xs ${
            subTab === "rekening" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          <BookOpen size={14} /> Master Rekening Belanja ({masterRekening.length})
        </Button>

        <Button
          type="button"
          size="sm"
          variant={subTab === "satuan" ? "default" : "outline"}
          onClick={() => setSubTab("satuan")}
          className={`gap-1.5 text-xs ${
            subTab === "satuan" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          <Layers size={14} /> Master Satuan & Kelompok
        </Button>
      </div>

      {/* SUB-TAB 1: KELOLA PERIODE */}
      {subTab === "periode" && (
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Pengaturan Jadwal Buka-Tutup Pengusulan SHS
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Atur waktu mulai buka, batas akhir penutupan pengusulan, serta status aktif periode (WIB).
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSavePeriod} className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="nama_p" className="text-xs font-semibold text-slate-700">
                  Nama Periode Pengusulan
                </Label>
                <Input
                  id="nama_p"
                  value={namaPeriode}
                  onChange={(e) => setNamaPeriode(e.target.value)}
                  className="text-xs bg-white"
                  placeholder="Contoh: Pengusulan Standar Satuan Harga (SSH) TA 2027"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tahun_p" className="text-xs font-semibold text-slate-700">
                    Tahun Anggaran (TA)
                  </Label>
                  <Input
                    id="tahun_p"
                    type="number"
                    value={tahunPeriode}
                    onChange={(e) => setTahunPeriode(e.target.value)}
                    className="text-xs bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="buka_p" className="text-xs font-semibold text-slate-700">
                    Jadwal Mulai Dibuka (WIB)
                  </Label>
                  <Input
                    id="buka_p"
                    type="datetime-local"
                    value={bukaAt}
                    onChange={(e) => setBukaAt(e.target.value)}
                    className="text-xs bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tutup_p" className="text-xs font-semibold text-slate-700">
                  Batas Akhir Penutupan (WIB)
                </Label>
                <Input
                  id="tutup_p"
                  type="datetime-local"
                  value={tutupAt}
                  onChange={(e) => setTutupAt(e.target.value)}
                  className="text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc_p" className="text-xs font-semibold text-slate-700">
                  Keterangan / Instruksi Pengusulan
                </Label>
                <Textarea
                  id="desc_p"
                  value={deskripsiPeriode}
                  onChange={(e) => setDeskripsiPeriode(e.target.value)}
                  className="text-xs min-h-[70px] bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">Status Periode Aktif</div>
                  <div className="text-[11px] text-slate-500">
                    Jika dinonaktifkan, seluruh aktivitas pengusulan ditutup sementara.
                  </div>
                </div>
                <Switch checked={isAktif} onCheckedChange={setIsAktif} />
              </div>

              <Button
                type="submit"
                disabled={isSavingPeriod}
                className="gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Save size={14} />
                {isSavingPeriod ? "Menyimpan..." : "Simpan Pengaturan Periode"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* SUB-TAB 2: MASTER KATEGORI */}
      {subTab === "kategori" && (
        <div className="space-y-4">
          {/* Status Database Banner */}
          <div
            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              isDatabaseConnected
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isDatabaseConnected ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold flex items-center gap-2">
                  {isDatabaseConnected
                    ? "Master Data Kategori Terhubung ke Database Supabase"
                    : "Penyimpanan Master Kategori: Mode Cache / Siap Sinkronisasi"}
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 uppercase ${
                      isDatabaseConnected
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : "border-amber-300 bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isDatabaseConnected ? "Tabel: public.shs_master_kategori" : "Tabel Belum Aktif"}
                  </Badge>
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {isDatabaseConnected
                    ? `Menyimpan ${masterKategori.length} kategori barang secara terpusat di PostgreSQL Supabase.`
                    : "Jalankan migrasi di Supabase SQL Editor atau klik tombol sinkronisasi untuk menyimpan seluruh data master ke database."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onSyncAllMastersToDatabase && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSyncingMasters}
                  onClick={onSyncAllMastersToDatabase}
                  className="h-8 gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs font-medium"
                >
                  {isSyncingMasters ? (
                    <Loader2 size={13} className="animate-spin text-blue-600" />
                  ) : (
                    <UploadCloud size={13} className="text-blue-600" />
                  )}
                  {isSyncingMasters ? "Mengunggah..." : "Unggah Master ke Supabase"}
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowSqlDialog(true)}
                className="h-8 gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs font-medium"
              >
                <Copy size={13} className="text-slate-500" />
                Script SQL Migrasi
              </Button>

              {onRefreshMasterData && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onRefreshMasterData}
                  className="h-8 w-8 p-0 text-slate-600 hover:bg-white"
                  title="Refresh dari database"
                >
                  <RefreshCw size={13} />
                </Button>
              )}
            </div>
          </div>

          {/* Form Tambah Master Kategori */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Tambah Master Kategori Barang Baru (Kepmendagri)</span>
                <span className="text-xs font-normal text-slate-500">
                  Total: <b className="text-slate-800">{masterKategori.length}</b> Kategori
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddKategori} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <Input
                  placeholder="Kode Kategori (contoh: 1.3.2.08.01.01.010)"
                  value={newKatKode}
                  onChange={(e) => setNewKatKode(e.target.value)}
                  className="text-xs h-9 font-mono"
                  required
                />
                <Input
                  placeholder="Nama Kategori Barang"
                  value={newKatNama}
                  onChange={(e) => setNewKatNama(e.target.value)}
                  className="text-xs h-9 sm:col-span-2"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAddingKat}
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Plus size={14} /> {isAddingKat ? "Menyimpan..." : "Simpan ke Database"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search & Filter Kategori */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari kode atau nama kategori..."
                value={searchKat}
                onChange={(e) => {
                  setSearchKat(e.target.value);
                  setKatPage(1);
                }}
                className="text-xs pl-8 h-8 bg-white border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
              <span>
                Menampilkan <b>{paginatedKategori.length}</b> dari <b>{filteredKategori.length}</b> item
              </span>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={katPage <= 1}
                  onClick={() => setKatPage((p) => Math.max(1, p - 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft size={13} />
                </Button>
                <span className="px-1 text-[11px] font-mono">
                  {katPage} / {totalKatPages}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={katPage >= totalKatPages}
                  onClick={() => setKatPage((p) => Math.min(totalKatPages, p + 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          </div>

          {/* List Kategori Table */}
          <div className="bg-white rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Kode Kategori</th>
                  <th className="py-2.5 px-3">Nama Kategori Barang</th>
                  <th className="py-2.5 px-3">Kelompok</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedKategori.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ditemukan data kategori yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedKategori.map((k) => (
                    <tr key={k.kode} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{k.kode}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{k.nama}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        <Badge variant="secondary" className="text-[10px] py-0 px-2">
                          {k.kelompok || "SSH"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            k.aktif !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {k.aktif !== false ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditKat(k)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit Kategori"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteKategori(k.kode)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Kategori"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MASTER REKENING */}
      {subTab === "rekening" && (
        <div className="space-y-4">
          {/* Status Database Banner */}
          <div
            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              isDatabaseConnected
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isDatabaseConnected ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold flex items-center gap-2">
                  {isDatabaseConnected
                    ? "Master Rekening Belanja Terhubung ke Database Supabase"
                    : "Penyimpanan Master Rekening: Mode Cache / Siap Sinkronisasi"}
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 uppercase ${
                      isDatabaseConnected
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : "border-amber-300 bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isDatabaseConnected ? "Tabel: public.shs_master_rekening" : "Tabel Belum Aktif"}
                  </Badge>
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {isDatabaseConnected
                    ? `Menyimpan ${masterRekening.length} kode rekening belanja Kepmendagri 050/Permendagri 90/SIPD RI.`
                    : "Jalankan migrasi di Supabase SQL Editor atau klik tombol sinkronisasi untuk menyimpan seluruh rekening ke database."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onSyncAllMastersToDatabase && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSyncingMasters}
                  onClick={onSyncAllMastersToDatabase}
                  className="h-8 gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs font-medium"
                >
                  {isSyncingMasters ? (
                    <Loader2 size={13} className="animate-spin text-blue-600" />
                  ) : (
                    <UploadCloud size={13} className="text-blue-600" />
                  )}
                  {isSyncingMasters ? "Mengunggah..." : "Unggah Master ke Supabase"}
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowSqlDialog(true)}
                className="h-8 gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs font-medium"
              >
                <Copy size={13} className="text-slate-500" />
                Script SQL Migrasi
              </Button>

              {onRefreshMasterData && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onRefreshMasterData}
                  className="h-8 w-8 p-0 text-slate-600 hover:bg-white"
                  title="Refresh dari database"
                >
                  <RefreshCw size={13} />
                </Button>
              )}
            </div>
          </div>

          {/* Form Tambah Master Rekening */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Tambah Master Kode Rekening Belanja Baru</span>
                <span className="text-xs font-normal text-slate-500">
                  Total: <b className="text-slate-800">{masterRekening.length}</b> Rekening
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddRekening} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <Input
                  placeholder="Kode Rekening (contoh: 5.1.02.01.001.00012)"
                  value={newRekKode}
                  onChange={(e) => setNewRekKode(e.target.value)}
                  className="text-xs h-9 font-mono"
                  required
                />
                <Input
                  placeholder="Uraian Rekening Belanja"
                  value={newRekUraian}
                  onChange={(e) => setNewRekUraian(e.target.value)}
                  className="text-xs h-9 sm:col-span-2"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAddingRek}
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Plus size={14} /> {isAddingRek ? "Menyimpan..." : "Simpan ke Database"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Rekening */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari kode atau uraian rekening..."
                value={searchRek}
                onChange={(e) => setSearchRek(e.target.value)}
                className="text-xs pl-8 h-8 bg-white border-slate-200"
              />
            </div>
            <div className="text-xs text-slate-500">
              Menampilkan <b>{filteredRekening.length}</b> rekening
            </div>
          </div>

          {/* List Rekening Table */}
          <div className="bg-white rounded-xl border border-slate-200 max-h-[460px] overflow-y-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Kode Rekening</th>
                  <th className="py-2.5 px-3">Uraian Rekening Belanja</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRekening.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Tidak ditemukan data rekening yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredRekening.map((r) => (
                    <tr key={r.kode} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {r.kode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{r.uraian}</td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            r.aktif !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {r.aktif !== false ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditRek(r)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit Rekening"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRekening(r.kode)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Rekening"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MASTER SATUAN & KELOMPOK */}
      {subTab === "satuan" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Daftar Satuan Baku ({masterSatuan.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddSatuan} className="flex gap-2">
                <Input
                  placeholder="Nama Satuan (cth: Rim, Botol)"
                  value={newSatNama}
                  onChange={(e) => setNewSatNama(e.target.value)}
                  className="text-xs h-9"
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0 font-semibold"
                >
                  <Plus size={14} /> Tambah
                </Button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {masterSatuan.map((s, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs py-1 px-2.5">
                    {s.nama}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Daftar Kelompok Belanja ({masterKelompok.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {masterKelompok.map((k, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="font-bold text-slate-800">{k.nama}</div>
                    <div className="text-[11px] text-slate-500">{k.deskripsi}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DIALOG EDIT KATEGORI */}
      <Dialog open={!!editingKat} onOpenChange={(open) => !open && setEditingKat(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Master Kategori Barang</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah data kategori dan simpan langsung ke database Supabase.
            </DialogDescription>
          </DialogHeader>

          {editingKat && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Kode Kategori</Label>
                <Input value={editingKat.kode} readOnly className="font-mono bg-slate-100 text-xs mt-1" />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Nama Kategori</Label>
                <Input
                  value={editKatNama}
                  onChange={(e) => setEditKatNama(e.target.value)}
                  className="text-xs mt-1"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Kelompok</Label>
                <Input
                  value={editKatKelompok}
                  onChange={(e) => setEditKatKelompok(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-800 text-xs">Status Kategori</div>
                  <div className="text-[10px] text-slate-500">
                    Kategori aktif dapat dipilih oleh pengguna saat mengisi usulan.
                  </div>
                </div>
                <Switch checked={editKatAktif} onCheckedChange={setEditKatAktif} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingKat(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEditKat}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG EDIT REKENING */}
      <Dialog open={!!editingRek} onOpenChange={(open) => !open && setEditingRek(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Edit Master Rekening Belanja</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah uraian rekening belanja dan simpan langsung ke database Supabase.
            </DialogDescription>
          </DialogHeader>

          {editingRek && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Kode Rekening</Label>
                <Input value={editingRek.kode} readOnly className="font-mono bg-slate-100 text-xs mt-1" />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Uraian Rekening Belanja</Label>
                <Textarea
                  value={editRekUraian}
                  onChange={(e) => setEditRekUraian(e.target.value)}
                  className="text-xs mt-1 min-h-[80px]"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-800 text-xs">Status Rekening</div>
                  <div className="text-[10px] text-slate-500">
                    Rekening aktif dapat dipilih oleh pengguna saat mengisi usulan.
                  </div>
                </div>
                <Switch checked={editRekAktif} onCheckedChange={setEditRekAktif} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingRek(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEditRek}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SCRIPT SQL MIGRASI */}
      <Dialog open={showSqlDialog} onOpenChange={setShowSqlDialog}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Database size={16} className="text-blue-600" />
              Skrip SQL Pembuatan Tabel Master di Supabase
            </DialogTitle>
            <DialogDescription className="text-xs">
              Jalankan skrip DDL SQL ini di menu <b>SQL Editor</b> pada Dashboard Supabase Anda untuk
              membuat tabel <code>shs_master_kategori</code> dan <code>shs_master_rekening</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex-1 overflow-hidden my-2">
            <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto overflow-y-auto max-h-[340px] leading-relaxed">
              {sqlSnippet}
            </pre>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSqlDialog(false)}
              className="text-xs"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopySql}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
            >
              {copiedSql ? <Check size={13} /> : <Copy size={13} />}
              {copiedSql ? "Tersalin ke Clipboard" : "Salin Skrip SQL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
