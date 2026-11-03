// src/lib/shsMasterData.ts
// Master Data Standar untuk Sistem Usulan Standar Harga Satuan (SHS) Dinas Kesehatan Kab. Pamekasan

import { MasterKategori, MasterRekening, MasterSatuan, MasterKelompok, SHSPeriod } from "@/types/shs";
import { EXCEL_MASTER_KATEGORI } from "./shsMasterCategories";

// Fallback kategori spesifik faskes/medis jika belum tercakup di Excel
const excelKodeSet = new Set(EXCEL_MASTER_KATEGORI.map((k) => k.kode));
const FALLBACK_KATEGORI: MasterKategori[] = [
  { kode: "1.3.2.05.01.01.001", nama: "Komputer PC / Desktop", kelompok: "Komputer & Elektronik", aktif: true },
  { kode: "1.3.2.05.01.01.002", nama: "Komputer Laptop / Notebook", kelompok: "Komputer & Elektronik", aktif: true },
  { kode: "1.3.2.05.02.01.001", nama: "Printer Inkjet / Laserjet", kelompok: "Komputer & Elektronik", aktif: true },
  { kode: "1.3.2.05.02.01.002", nama: "Scanner Dokumen", kelompok: "Komputer & Elektronik", aktif: true },
  { kode: "1.3.2.05.02.06.001", nama: "Proyektor LCD / Screen Proyektor", kelompok: "Komputer & Elektronik", aktif: true },
  { kode: "1.3.2.05.03.01.001", nama: "UPS / Stabilizer", kelompok: "Komputer & Elektronik", aktif: true },
  { kode: "1.3.2.05.03.02.001", nama: "Eksternal Harddisk / SSD Portabel", kelompok: "Komputer & Elektronik", aktif: true },

  { kode: "1.3.2.08.01.01.001", nama: "Alat Kedokteran Umum / Pemeriksaan", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.01.002", nama: "Tensimeter Digital / Air Raksa", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.01.003", nama: "Stetoskop Medis", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.01.004", nama: "Termometer Inframerah / Dahi", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.01.005", nama: "Timbangan Badan Digital / Bayi", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.01.006", nama: "Pengukur Tinggi Badan (Stadiometer / Infantometer)", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.02.001", nama: "Alat Gigi / Dental Unit & Accessories", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.03.001", nama: "USG Portable / USG 2D/3D Kebidanan", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.04.001", nama: "Doppler Fetal Heart Rate Detector", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.05.001", nama: "Nebulizer Kompresor", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.06.001", nama: "Suction Pump Medis", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.07.001", nama: "Tabung Oksigen & Regulator Lengkap", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.08.001", nama: "Bed Pasien / Ranjang Periksa Manual & Elektrik", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.09.001", nama: "Kursi Roda Standar Rumah Sakit / Puskesmas", kelompok: "Barang Medis / Alkes", aktif: true },
  { kode: "1.3.2.08.01.10.001", nama: "Brankar Pasien / Emergency Stretcher", kelompok: "Barang Medis / Alkes", aktif: true },

  { kode: "1.1.7.01.01.001", nama: "Alat Tulis Kantor (Kertas HVS A4 / F4)", kelompok: "Alat Tulis Kantor (ATK)", aktif: true },
  { kode: "1.1.7.01.01.002", nama: "Tinta Printer & Toner Asli / Compatible", kelompok: "Alat Tulis Kantor (ATK)", aktif: true },
  { kode: "1.1.7.01.01.003", nama: "Pena, Spidol, Pensil, Penghapus", kelompok: "Alat Tulis Kantor (ATK)", aktif: true },
  { kode: "1.1.7.01.01.004", nama: "Map Folio, Binder, Ordner Dokumen", kelompok: "Alat Tulis Kantor (ATK)", aktif: true },
  { kode: "1.1.7.01.01.005", nama: "Stapler, Perforator, Cutter & Gunting", kelompok: "Alat Tulis Kantor (ATK)", aktif: true },

  { kode: "1.1.7.01.02.001", nama: "Bahan Cetak Formulir & Rekam Medis", kelompok: "Cetak & Penggandaan", aktif: true },
  { kode: "1.1.7.01.02.002", nama: "Buku KIA / Buku Kesehatan Ibu & Anak", kelompok: "Cetak & Penggandaan", aktif: true },
  { kode: "1.1.7.01.02.003", nama: "Banner / Spanduk Sosialisasi Kesehatan", kelompok: "Cetak & Penggandaan", aktif: true },
  { kode: "1.1.7.01.02.004", nama: "Brosur, Leaflet, Poster Promosi Kesehatan", kelompok: "Cetak & Penggandaan", aktif: true },

  { kode: "1.1.7.01.03.001", nama: "Masker Medis 3-Ply & N95 / KN95", kelompok: "Bahan Habis Pakai (BHP)", aktif: true },
  { kode: "1.1.7.01.03.002", nama: "Sarung Tangan Medis (Handscoon Non-Steril & Steril)", kelompok: "Bahan Habis Pakai (BHP)", aktif: true },
  { kode: "1.1.7.01.03.003", nama: "Jarum Suntik & Spuit (1cc, 3cc, 5cc, 10cc)", kelompok: "Bahan Habis Pakai (BHP)", aktif: true },
  { kode: "1.1.7.01.03.004", nama: "Kassa Gulung, Kapas, Alkohol Swab", kelompok: "Bahan Habis Pakai (BHP)", aktif: true },
  { kode: "1.1.7.01.03.005", nama: "Infus Set Dewasa / Anak & Jarum Abocath", kelompok: "Bahan Habis Pakai (BHP)", aktif: true },
  { kode: "1.1.7.01.03.006", nama: "Cairan Infus (RL, NaCl 0.9%, Dextrose)", kelompok: "Bahan Habis Pakai (BHP)", aktif: true },
  { kode: "1.1.7.01.03.007", nama: "Hand Sanitizer & Disinfektan Medis", kelompok: "Bahan Habis Pakai (BHP)", aktif: true },

  { kode: "1.1.7.01.04.001", nama: "Reagen Golongan Darah & Hematologi", kelompok: "Laboratorium & Reagen", aktif: true },
  { kode: "1.1.7.01.04.002", nama: "Rapid Test Gula Darah, Kolesterol, Asam Urat", kelompok: "Laboratorium & Reagen", aktif: true },
  { kode: "1.1.7.01.04.003", nama: "Rapid Test HIV, Hepatitis B & Sifilis", kelompok: "Laboratorium & Reagen", aktif: true },
  { kode: "1.1.7.01.04.004", nama: "Tabung Reaksi & Tabung Vacutainer EDTA", kelompok: "Laboratorium & Reagen", aktif: true },

  { kode: "1.1.7.01.05.001", nama: "Obat Generik Tablet / Kapsul / Sirup", kelompok: "Obat & Farmasi", aktif: true },
  { kode: "1.1.7.01.05.002", nama: "Antibiotik & Antivirus Esensial", kelompok: "Obat & Farmasi", aktif: true },
  { kode: "1.1.7.01.05.003", nama: "Vaksin Imunisasi Dasar Lengkap", kelompok: "Obat & Farmasi", aktif: true },
  { kode: "1.1.7.01.05.004", nama: "Vitamin & Suplemen Ibu Hamil / Balita", kelompok: "Obat & Farmasi", aktif: true },

  { kode: "1.3.2.02.01.001", nama: "Lemari Obat / Kulkas Penyimpan Vaksin (Cold Chain)", kelompok: "Perabot & Alat Pendingin", aktif: true },
  { kode: "1.3.2.02.01.002", nama: "Vaccine Carrier Box Portabel", kelompok: "Perabot & Alat Pendingin", aktif: true },
  { kode: "1.3.2.02.01.003", nama: "AC Split 1 PK / 2 PK Ruang Pelayanan", kelompok: "Perabot & Alat Pendingin", aktif: true },
].filter((k) => !excelKodeSet.has(k.kode));

// Seluruh Master Kategori Barang (1.420 item dari DAFTAR USULAN SSH_SBU.xlsx + Kategori Medis Tambahan)
export const DEFAULT_MASTER_KATEGORI: MasterKategori[] = [
  ...EXCEL_MASTER_KATEGORI,
  ...FALLBACK_KATEGORI,
];

export const DEFAULT_MASTER_REKENING: MasterRekening[] = [
  // Rekening Belanja Barang & Jasa (Format Baru Kepmendagri 050-5889 / SIPD RI)
  { kode: "5.1.02.01.001.00012", uraian: "Belanja Bahan-Bahan Lainnya", aktif: true },
  { kode: "5.1.02.01.001.00002", uraian: "Belanja Bahan Kimia", aktif: true },
  { kode: "5.1.02.01.001.00009", uraian: "Belanja Bahan Isi Tabung Pemadam Kebakaran", aktif: true },
  { kode: "5.1.02.01.001.00024", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Tulis Kantor", aktif: true },
  { kode: "5.1.02.01.001.00025", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Kertas dan Cover", aktif: true },
  { kode: "5.1.02.01.001.00026", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Cetak (Buku KIA/Formulir)", aktif: true },
  { kode: "5.1.02.01.001.00027", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Benda Pos", aktif: true },
  { kode: "5.1.02.01.001.00031", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Bahan Komputer", aktif: true },
  { kode: "5.1.02.01.001.00032", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Perabot Kantor", aktif: true },
  { kode: "5.1.02.01.001.00036", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-Alat Listrik", aktif: true },
  { kode: "5.1.02.01.001.00037", uraian: "Belanja Obat-Obatan-Obat", aktif: true },
  { kode: "5.1.02.01.001.00038", uraian: "Belanja Bahan Obat", aktif: true },
  { kode: "5.1.02.01.001.00039", uraian: "Belanja Bahan Kimia", aktif: true },
  { kode: "5.1.02.01.001.00040", uraian: "Belanja Bahan Bakar Minyak/Gas", aktif: true },
  { kode: "5.1.02.01.001.00052", uraian: "Belanja Alat Kesehatan Habis Pakai", aktif: true },
  { kode: "5.1.02.01.001.00053", uraian: "Belanja Alat/Bahan untuk Kegiatan Kantor-ATK Puskesmas (BLUD)", aktif: true },
  { kode: "5.1.02.01.001.00054", uraian: "Belanja Reagen Laboratorium Kesehatan", aktif: true },
  { kode: "5.1.02.01.001.00055", uraian: "Belanja Bahan Makanan & Minuman Pasien/Rapat", aktif: true },

  // Belanja Jasa & Sewa
  { kode: "5.1.02.02.001.00014", uraian: "Belanja Jasa Pemeliharaan Peralatan Komputer", aktif: true },
  { kode: "5.1.02.02.001.00016", uraian: "Belanja Jasa Kalibrasi Alat Kesehatan", aktif: true },
  { kode: "5.1.02.02.001.00026", uraian: "Belanja Sewa Gedung / Ruang Pertemuan", aktif: true },

  // Belanja Modal (Format Baru)
  { kode: "5.2.02.02.001.00006", uraian: "Belanja Modal Alat Angkutan Darat Bermotor", aktif: true },
  { kode: "5.2.02.05.001.00005", uraian: "Belanja Modal Peralatan Komputer - PC / Laptop", aktif: true },
  { kode: "5.2.02.05.002.00001", uraian: "Belanja Modal Peralatan Jaringan Komputer", aktif: true },
  { kode: "5.2.02.07.001.00001", uraian: "Belanja Modal Alat Kedokteran Umum", aktif: true },
  { kode: "5.2.02.07.001.00002", uraian: "Belanja Modal Alat Kedokteran/Kesehatan - Dental Chair", aktif: true },
  { kode: "5.2.02.07.001.00014", uraian: "Belanja Modal Alat Kedokteran Jantung", aktif: true },
  { kode: "5.2.02.07.001.00029", uraian: "Belanja Modal Alat Kedokteran Lainnya", aktif: true },
  { kode: "5.2.02.07.002.00005", uraian: "Belanja Modal Alat Kesehatan Umum Lainnya", aktif: true },
  { kode: "5.2.02.08.001.00001", uraian: "Belanja Modal Alat Kedokteran Umum", aktif: true },
  { kode: "5.2.02.08.001.00011", uraian: "Belanja Modal Alat Laboratorium Umum", aktif: true },
  { kode: "5.2.02.08.001.00012", uraian: "Belanja Modal Alat Laboratorium Mikrobiologi", aktif: true },
  { kode: "5.2.02.08.001.00014", uraian: "Belanja Modal Alat Kedokteran/Kesehatan - Photometer", aktif: true },
  { kode: "5.2.02.08.001.00019", uraian: "Belanja Modal Alat Kedokteran/Kesehatan - Mikroskop", aktif: true },
  { kode: "5.2.02.08.001.00054", uraian: "Belanja Modal Alat Kedokteran/Kesehatan - Bio Safety Cabinet (BSC)", aktif: true },
  { kode: "5.2.02.08.001.00055", uraian: "Belanja Modal Laboratorium Hematologi dan Urinalisis", aktif: true },
  { kode: "5.2.02.08.002.00001", uraian: "Belanja Modal Alat Kedokteran Gigi", aktif: true },
  { kode: "5.2.02.08.003.00001", uraian: "Belanja Modal Alat Kebidanan & Kandungan", aktif: true },
  { kode: "5.2.02.08.005.00001", uraian: "Belanja Modal Alat Laboratorium Medis", aktif: true },
];

export const DEFAULT_MASTER_SATUAN: MasterSatuan[] = [
  { nama: "Unit", keterangan: "Alat elektronik, mesin, furnitur" },
  { nama: "Buah", keterangan: "Barang satuan umum" },
  { nama: "Pcs", keterangan: "Piece / barang kecil" },
  { nama: "Rim", keterangan: "Kertas 500 lembar" },
  { nama: "Kotak", keterangan: "Box berisi beberapa item" },
  { nama: "Dus", keterangan: "Karton besar" },
  { nama: "Botol", keterangan: "Cairan atau sirup" },
  { nama: "Vial", keterangan: "Vaksin / obat suntik serbuk" },
  { nama: "Ampul", keterangan: "Obat suntik cair gelas" },
  { nama: "Lembar", keterangan: "Formulir, poster, sertifikat" },
  { nama: "Paket", keterangan: "Bundel barang atau jasa lengkap" },
  { nama: "Set", keterangan: "Kumpulan instrumen atau set alat" },
  { nama: "Roll", keterangan: "Kassa, lakban, tali gulung" },
  { nama: "Strip", keterangan: "Blister obat tablet / strip test" },
  { nama: "Tube", keterangan: "Salep obat luar" },
  { nama: "Tablet", keterangan: "Satuan butir tablet" },
  { nama: "Pasang", keterangan: "Sarung tangan, sepatu APD" },
  { nama: "Lusin", keterangan: "12 buah" },
  { nama: "Liter", keterangan: "Volume cairan / disinfektan" },
  { nama: "Kaleng", keterangan: "Susu atau bahan kemas kaleng" },
];

export const DEFAULT_MASTER_KELOMPOK: MasterKelompok[] = [
  { nama: "SSH", deskripsi: "Standar Satuan Harga (Kepmendagri / Permendagri)" },
  { nama: "ASB", deskripsi: "Analisis Standar Belanja" },
  { nama: "SBU", deskripsi: "Standar Biaya Umum" },
  { nama: "Barang Medis / Alkes", deskripsi: "Peralatan medis dan kedokteran untuk faskes" },
  { nama: "Bahan Habis Pakai (BHP)", deskripsi: "Bahan medis habis pakai, spuit, kassa, infus" },
  { nama: "Obat & Farmasi", deskripsi: "Obat generik, vaksin, vitamin, dan sediaan farmasi" },
  { nama: "Laboratorium & Reagen", deskripsi: "Bahan uji lab, strip diagnostik, reagen cair" },
  { nama: "Komputer & Elektronik", deskripsi: "PC, laptop, printer, scanner, proyektor, aksesoris" },
  { nama: "Alat Tulis Kantor (ATK)", deskripsi: "Kertas HVS, map, pulpen, tinta printer" },
  { nama: "Cetak & Penggandaan", deskripsi: "Buku KIA, formulir rekam medis, brosur, banner" },
  { nama: "Perabot & Alat Pendingin", deskripsi: "Ranjang periksa, lemari obat, kulkas vaksin, AC" },
  { nama: "Makanan & Minuman Rapat", deskripsi: "Konsumsi kegiatan rapat dan pelatihan dinas" },
  { nama: "Jasa & Pemeliharaan", deskripsi: "Jasa kalibrasi alat kesehatan, servis IT, sewa" },
];

export const DAFTAR_UNIT_DINKES_PUSKESMAS: string[] = [
  "Sekretariat Dinas Kesehatan",
  "Bidang Kesehatan Masyarakat (Kesmas)",
  "Bidang Pencegahan & Pengendalian Penyakit (P2P)",
  "Bidang Pelayanan Kesehatan (Yankes)",
  "Bidang Sumber Daya Kesehatan (SDK)",
  "Puskesmas Teja",
  "Puskesmas Kowel",
  "Puskesmas Tlanakan",
  "Puskesmas Pademawu",
  "Puskesmas Sopa'ah",
  "Puskesmas Galis",
  "Puskesmas Larangan",
  "Puskesmas Kadur",
  "Puskesmas Pegantenan",
  "Puskesmas Pakong",
  "Puskesmas Waru",
  "Puskesmas Batumarmar",
  "Puskesmas Pasean",
  "Puskesmas Palengaan",
  "Puskesmas Proppo",
  "Puskesmas Panaguan",
  "Puskesmas Bandaran",
  "Labkesda Kab. Pamekasan",
  "Instalasi Farmasi Kab. Pamekasan",
];

// Periode aktif default (buka selama 30 hari ke depan untuk kenyamanan pengguna sistem)
export const DEFAULT_ACTIVE_PERIOD: SHSPeriod = {
  id: "period-shs-ta-2027",
  nama: "Periode Pengusulan Standar Harga Satuan (SHS) TA 2027",
  tahun: 2027,
  buka_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Dibuka sejak 2 hari lalu
  tutup_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // Tutup 28 hari lagi
  masa_revisi_sampai: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
  aktif: true,
  deskripsi: "Pengumpulan usulan Standar Harga Satuan (SHS) Dinas Kesehatan dan Seluruh Puskesmas Kabupaten Pamekasan Tahun Anggaran 2027.",
  created_at: new Date().toISOString(),
};

// In-memory cache and O(1) Maps for dynamic master data loaded from Supabase database
let dynamicMasterKategoriCache: MasterKategori[] = DEFAULT_MASTER_KATEGORI;
let dynamicMasterRekeningCache: MasterRekening[] = DEFAULT_MASTER_REKENING;

const buildRekeningMap = (list: MasterRekening[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r?.kode) {
      const clean = r.kode.trim();
      map.set(clean, r.uraian || "");
      map.set(clean.replace(/\b0+(\d+)/g, "$1"), r.uraian || "");
    }
  }
  return map;
};

const buildKategoriMap = (list: MasterKategori[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (let i = 0; i < list.length; i++) {
    const k = list[i];
    if (k?.kode) {
      const clean = k.kode.trim();
      map.set(clean, k.nama || "");
      map.set(clean.replace(/\s+/g, ""), k.nama || "");
    }
  }
  return map;
};

let dynamicRekeningMap: Map<string, string> = buildRekeningMap(DEFAULT_MASTER_REKENING);
let dynamicKategoriMap: Map<string, string> = buildKategoriMap(DEFAULT_MASTER_KATEGORI);

export const setDynamicMasterKategori = (list: MasterKategori[]) => {
  if (Array.isArray(list) && list.length > 0) {
    dynamicMasterKategoriCache = list;
    dynamicKategoriMap = buildKategoriMap(list);
  }
};

export const setDynamicMasterRekening = (list: MasterRekening[]) => {
  if (Array.isArray(list) && list.length > 0) {
    dynamicMasterRekeningCache = list;
    dynamicRekeningMap = buildRekeningMap(list);
  }
};

export const getDynamicMasterKategori = (): MasterKategori[] => dynamicMasterKategoriCache;
export const getDynamicMasterRekening = (): MasterRekening[] => dynamicMasterRekeningCache;

/**
 * Mencari nama / uraian rekening dari master rekening belanja berdasarkan kode rekening.
 */
export const getRekeningUraian = (kode?: string | null, customList?: MasterRekening[]): string => {
  if (!kode) return "";
  const clean = kode.trim();

  if (customList && customList.length > 0) {
    const found = customList.find((r) => r.kode === clean);
    if (found) return found.uraian;
    const normClean = clean.replace(/\b0+(\d+)/g, "$1");
    const normFound = customList.find(
      (r) => r.kode.replace(/\b0+(\d+)/g, "$1") === normClean
    );
    if (normFound) return normFound.uraian;
  }

  // O(1) Fast Map lookup
  const hit = dynamicRekeningMap.get(clean) || dynamicRekeningMap.get(clean.replace(/\b0+(\d+)/g, "$1"));
  if (hit) return hit;

  return "";
};

/**
 * Format kode rekening lengkap dengan uraiannya, misal:
 * "5.1.02.01.001.00012 (Belanja Bahan Lainnya (BMHP / Reagen / Strip))"
 */
export const formatRekeningWithUraian = (
  kode?: string | null,
  customList?: MasterRekening[]
): string => {
  if (!kode) return "-";
  const uraian = getRekeningUraian(kode, customList);
  if (uraian) {
    return `${kode} (${uraian})`;
  }
  return kode;
};

/**
 * Mencari nama / uraian kategori Kepmendagri berdasarkan kode kategori.
 */
export const getKategoriNama = (
  kode?: string | null,
  fallbackNama?: string | null,
  customList?: MasterKategori[]
): string => {
  const cleanFallback = fallbackNama?.trim();
  const isValidFallback =
    cleanFallback &&
    cleanFallback !== "Kategori Barang" &&
    cleanFallback !== "-" &&
    cleanFallback !== "undefined" &&
    cleanFallback !== "null";

  if (isValidFallback) {
    return cleanFallback;
  }
  if (!kode) return "";
  const clean = kode.trim();

  if (customList && customList.length > 0) {
    const found = customList.find((k) => k.kode === clean);
    if (found) return found.nama;
    const normClean = clean.replace(/\s+/g, "");
    const normFound = customList.find(
      (k) => k.kode.replace(/\s+/g, "") === normClean
    );
    if (normFound) return normFound.nama;
  }

  // O(1) Fast Map lookup
  const hit = dynamicKategoriMap.get(clean) || dynamicKategoriMap.get(clean.replace(/\s+/g, ""));
  if (hit) return hit;

  return "";
};

/**
 * Format kode kategori lengkap dengan uraian namanya, misal:
 * "1.1 (ASET LANCAR)" atau "1.1.12.01.01.0012 (Bahan Lainnya)"
 */
export const formatKategoriWithNama = (
  kode?: string | null,
  fallbackNama?: string | null,
  customList?: MasterKategori[]
): string => {
  if (!kode) return "-";
  const nama = getKategoriNama(kode, fallbackNama, customList);
  if (nama) {
    return `${kode} (${nama})`;
  }
  return kode;
};
