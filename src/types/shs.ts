// src/types/shs.ts
// Tipe data untuk Sistem Usulan Standar Harga Satuan (SHS) Dinas Kesehatan Kab. Pamekasan

export type SHSStatus = 'draft' | 'diajukan' | 'diperbaiki' | 'disetujui' | 'perlu_perbaikan' | 'ditolak';

export interface SHSItem {
  id: string;
  period_id: string;
  tahun: number;
  user_id: string;
  nama_pengusul: string;
  unit_kerja: string; // Puskesmas atau Bidang di Dinkes
  
  // Spesifikasi barang / jasa
  kode_kategori: string; // Referensi master Kepmendagri kodefikasi barang
  kategori_nama?: string;
  uraian: string;        // Nama barang/jasa (maks 255)
  spek: string;          // Spesifikasi teknis (maks 2000)
  satuan: string;        // Referensi master satuan (misal: Unit, Rim, Dus, Botol, Lembar)
  
  // Komponen harga
  harga: number;         // Rupiah (> 0)
  ongkir: number;        // Rupiah (>= 0, default 0)
  total: number;         // Otomatis = harga + ongkir
  
  // Rekening belanja (Permendagri 90/2019 / Kepmendagri 050-5889 / 900.1-861)
  rekening_1: string;    // Wajib
  rekening_2?: string;   // Opsional
  rekening_3?: string;   // Opsional
  
  // Pengelompokan
  kelompok: string;      // Master kelompok belanja
  
  // Referensi katalog & TKDN
  link_katalog_1: string; // Wajib URL
  link_katalog_2?: string;// Wajib URL saat diajukan
  link_katalog_3?: string;// Opsional URL
  tkdn_1: number;        // Persen (0 - 100)
  tkdn_2?: number;       // Persen (0 - 100)
  tkdn_3?: number;       // Persen (0 - 100)
  
  // Status alur kerja
  status: SHSStatus;
  catatan_verifikator?: string | null;
  verifikator_name?: string | null;
  verified_at?: string | null;
  submitted_at?: string | null; // Timestamp saat usulan diajukan (WIB)

  // Status & Riwayat Perbaikan (Revisi setelah penolakan / perlu perbaikan)
  is_revisi?: boolean;
  revisi_ke?: number;
  revisi_at?: string | null;
  catatan_perbaikan?: string | null;

  // Verifikasi Ganda (Dual Verifikator: Admin & Pengurus Barang)
  verifikasi_admin?: {
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak';
    catatan?: string | null;
    verifikator_name: string;
    verified_at: string;
  } | null;
  verifikasi_pengurus?: {
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak';
    catatan?: string | null;
    verifikator_name: string;
    verified_at: string;
  } | null;
  previous_admin?: {
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak';
    catatan?: string | null;
    verifikator_name: string;
    verified_at: string;
  } | null;
  previous_pengurus?: {
    status: 'disetujui' | 'perlu_perbaikan' | 'ditolak';
    catatan?: string | null;
    verifikator_name: string;
    verified_at: string;
  } | null;
  
  created_at: string;
  updated_at: string;
}

export type PeriodStatus = 'belum_dibuka' | 'dibuka' | 'ditutup';

export interface SHSPeriod {
  id: string;
  nama: string;
  tahun: number;
  buka_at: string;  // ISO string
  tutup_at: string; // ISO string
  masa_revisi_sampai?: string | null; // ISO string
  aktif: boolean;
  deskripsi?: string;
  created_at: string;
}

export interface MasterKategori {
  kode: string;
  nama: string;
  kelompok: string;
  aktif: boolean;
}

export interface MasterRekening {
  kode: string;
  uraian: string;
  aktif: boolean;
}

export interface MasterSatuan {
  nama: string;
  keterangan?: string;
}

export interface MasterKelompok {
  nama: string;
  deskripsi?: string;
}

export interface SHSRecapStats {
  total: number;
  draft: number;
  diajukan: number;
  diperbaiki: number;
  disetujui: number;
  perlu_perbaikan: number;
  ditolak: number;
  totalAnggaran: number;
  totalAnggaranDisetujui: number;
}
