// src/lib/shsVerificationHelper.ts
// Helper untuk Logika Verifikasi Ganda (Dual Verifikator: Admin Dinkes & Pengurus Barang)
// Standar Harga Satuan (SHS) Dinas Kesehatan Kab. Pamekasan

import { SHSItem, SHSStatus } from "@/types/shs";
import { DAFTAR_UNIT_DINKES_PUSKESMAS } from "./shsMasterData";

export interface VerifierDecision {
  status: "disetujui" | "perlu_perbaikan" | "ditolak";
  catatan?: string | null;
  verifikator_name: string;
  verified_at: string;
}

export interface DualVerificationData {
  admin: VerifierDecision | null;
  pengurus: VerifierDecision | null;
  summary_catatan?: string | null;
  submitted_at?: string | null;
  submitted_by?: string | null;
  is_revisi?: boolean;
  revisi_ke?: number;
  revisi_at?: string | null;
  catatan_perbaikan?: string | null;
  previous_admin?: VerifierDecision | null;
  previous_pengurus?: VerifierDecision | null;
}

/**
 * Parsing data verifikasi ganda dari item SHS.
 * Mendukung pembacaan dari field terstruktur maupun string JSON di catatan_verifikator,
 * serta fallback aman untuk data historis/legacy.
 */
export const parseVerificationData = (
  item: Partial<SHSItem>
): DualVerificationData => {
  let admin: VerifierDecision | null = item.verifikasi_admin || null;
  let pengurus: VerifierDecision | null = item.verifikasi_pengurus || null;
  let summaryCatatan: string | null = null;
  let submittedAt: string | null = (item as any)?.submitted_at || null;
  let submittedBy: string | null = (item as any)?.nama_pengusul || null;
  let isRevisi: boolean = item.is_revisi || false;
  let revisiKe: number | undefined = item.revisi_ke;
  let revisiAt: string | null = item.revisi_at || null;
  let catatanPerbaikan: string | null = item.catatan_perbaikan || null;
  let previousAdmin: VerifierDecision | null = item.previous_admin || null;
  let previousPengurus: VerifierDecision | null = item.previous_pengurus || null;

  if (item.catatan_verifikator) {
    const raw = item.catatan_verifikator.trim();
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.admin && !admin) admin = parsed.admin;
        if (parsed.pengurus && !pengurus) pengurus = parsed.pengurus;
        if (parsed.summary_catatan) summaryCatatan = parsed.summary_catatan;
        if (parsed.submitted_at) submittedAt = parsed.submitted_at;
        if (parsed.submitted_by) submittedBy = parsed.submitted_by;
        if (parsed.is_revisi !== undefined) isRevisi = Boolean(parsed.is_revisi);
        if (parsed.revisi_ke !== undefined) revisiKe = parsed.revisi_ke;
        if (parsed.revisi_at) revisiAt = parsed.revisi_at;
        if (parsed.catatan_perbaikan) catatanPerbaikan = parsed.catatan_perbaikan;
        if (parsed.previous_admin) previousAdmin = parsed.previous_admin;
        if (parsed.previous_pengurus) previousPengurus = parsed.previous_pengurus;
      } catch {
        summaryCatatan = raw;
      }
    } else {
      summaryCatatan = raw;
    }
  }

  // Fallback untuk waktu pengajuan jika status bukan draft
  if (!submittedAt && item.status && item.status !== "draft") {
    submittedAt = item.created_at || null;
  }

  // Fallback untuk data yang sudah disetujui sebelumnya (legacy)
  if (item.status === "disetujui" && !admin && !pengurus) {
    const defaultDate = item.verified_at || item.updated_at || new Date().toISOString();
    const verifName = item.verifikator_name || "Admin & Pengurus Barang";
    admin = {
      status: "disetujui",
      verifikator_name: "Admin Dinkes",
      verified_at: defaultDate,
      catatan: summaryCatatan,
    };
    pengurus = {
      status: "disetujui",
      verifikator_name: "Pengurus Barang",
      verified_at: defaultDate,
      catatan: summaryCatatan,
    };
  }

  return {
    admin,
    pengurus,
    summary_catatan: summaryCatatan,
    submitted_at: submittedAt,
    submitted_by: submittedBy,
    is_revisi: isRevisi,
    revisi_ke: revisiKe,
    revisi_at: revisiAt,
    catatan_perbaikan: catatanPerbaikan,
    previous_admin: previousAdmin,
    previous_pengurus: previousPengurus,
  };
};

/**
 * Format string penyimpanan untuk kolom catatan_verifikator di Supabase.
 * Menyimpan data JSON terstruktur agar tidak memerlukan migrasi DDL kolom baru pada tabel Postgres.
 */
export const serializeVerificationData = (
  admin: VerifierDecision | null,
  pengurus: VerifierDecision | null,
  activeNote?: string | null,
  submittedAt?: string | null,
  submittedBy?: string | null,
  extra?: {
    is_revisi?: boolean;
    revisi_ke?: number;
    revisi_at?: string | null;
    catatan_perbaikan?: string | null;
    previous_admin?: VerifierDecision | null;
    previous_pengurus?: VerifierDecision | null;
  }
): string => {
  const payload: DualVerificationData = {
    admin,
    pengurus,
    summary_catatan: activeNote || null,
    submitted_at: submittedAt || null,
    submitted_by: submittedBy || null,
    is_revisi: extra?.is_revisi,
    revisi_ke: extra?.revisi_ke,
    revisi_at: extra?.revisi_at,
    catatan_perbaikan: extra?.catatan_perbaikan,
    previous_admin: extra?.previous_admin,
    previous_pengurus: extra?.previous_pengurus,
  };
  return JSON.stringify(payload);
};

/**
 * Menghitung status akhir dari keputusan dua verifikator:
 * - Jika salah satu MENOLAK ('ditolak') -> status = 'ditolak'
 * - Jika salah satu MEMINTA PERBAIKAN ('perlu_perbaikan') -> status = 'perlu_perbaikan'
 * - Jika KEDUANYA MENYETUJUI ('disetujui') -> status = 'disetujui' (Disetujui Penuh!)
 * - Jika baru satu yang menyetujui -> status = 'diajukan' (Tetap dalam antrean, belum disetujui)
 * - Jika belum ada -> status = 'diajukan' (atau 'draft' jika item belum diajukan)
 */
export const computeOverallStatus = (
  admin: VerifierDecision | null,
  pengurus: VerifierDecision | null,
  fallbackStatus: SHSStatus = "diajukan"
): { status: SHSStatus; verifikator_name: string | null } => {
  // 1. Cek Penolakan (prioritas utama)
  if (admin?.status === "ditolak" || pengurus?.status === "ditolak") {
    const rejecter =
      admin?.status === "ditolak" && pengurus?.status === "ditolak"
        ? "Admin & Pengurus Barang"
        : admin?.status === "ditolak"
        ? "Admin Dinkes"
        : "Pengurus Barang";
    return { status: "ditolak", verifikator_name: rejecter };
  }

  // 2. Cek Permintaan Perbaikan
  if (admin?.status === "perlu_perbaikan" || pengurus?.status === "perlu_perbaikan") {
    const reviser =
      admin?.status === "perlu_perbaikan" && pengurus?.status === "perlu_perbaikan"
        ? "Admin & Pengurus Barang"
        : admin?.status === "perlu_perbaikan"
        ? "Admin Dinkes"
        : "Pengurus Barang";
    return { status: "perlu_perbaikan", verifikator_name: reviser };
  }

  // 3. Cek Persetujuan Ganda (Keduanya harus menyetujui)
  const isAdminApproved = admin?.status === "disetujui";
  const isPengurusApproved = pengurus?.status === "disetujui";

  if (isAdminApproved && isPengurusApproved) {
    return {
      status: "disetujui",
      verifikator_name: "Admin Dinkes & Pengurus Barang",
    };
  }

  // 4. Jika baru salah satu yang menyetujui (1/2) -> Masih dalam tahap diajukan / proses verifikasi
  if (isAdminApproved && !isPengurusApproved) {
    return {
      status: fallbackStatus === "diperbaiki" ? "diperbaiki" : "diajukan",
      verifikator_name: "Admin Dinkes (Menunggu Pengurus Barang)",
    };
  }

  if (isPengurusApproved && !isAdminApproved) {
    return {
      status: fallbackStatus === "diperbaiki" ? "diperbaiki" : "diajukan",
      verifikator_name: "Pengurus Barang (Menunggu Admin)",
    };
  }

  // 5. Belum diverifikasi sama sekali
  return {
    status:
      fallbackStatus === "draft"
        ? "draft"
        : fallbackStatus === "diperbaiki"
        ? "diperbaiki"
        : "diajukan",
    verifikator_name: null,
  };
};

export type DualStatusStage =
  | "draft"
  | "pending_all"
  | "diperbaiki"
  | "waiting_pengurus"
  | "waiting_admin"
  | "approved_full"
  | "revision"
  | "rejected";

export interface DualStatusInfo {
  stage: DualStatusStage;
  label: string;
  badgeClass: string;
  progressText: string;
  adminApproved: boolean;
  pengurusApproved: boolean;
  adminStatus: "pending" | "disetujui" | "perlu_perbaikan" | "ditolak";
  pengurusStatus: "pending" | "disetujui" | "perlu_perbaikan" | "ditolak";
  adminCatatan?: string | null;
  pengurusCatatan?: string | null;
}

/**
 * Mendapatkan detail status verifikasi ganda untuk keperluan UI (Badge, Label, Progress)
 */
export const getDualStatusInfo = (item: SHSItem): DualStatusInfo => {
  const { admin, pengurus, is_revisi, revisi_ke } = parseVerificationData(item);

  const adminStatus = admin?.status || "pending";
  const pengurusStatus = pengurus?.status || "pending";
  const adminApproved = adminStatus === "disetujui";
  const pengurusApproved = pengurusStatus === "disetujui";

  if (item.status === "draft") {
    return {
      stage: "draft",
      label: "Draft",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      progressText: "0/2",
      adminApproved: false,
      pengurusApproved: false,
      adminStatus: "pending",
      pengurusStatus: "pending",
    };
  }

  if (item.status === "ditolak") {
    return {
      stage: "rejected",
      label: "Ditolak",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      progressText: "Ditolak",
      adminApproved,
      pengurusApproved,
      adminStatus,
      pengurusStatus,
      adminCatatan: admin?.catatan,
      pengurusCatatan: pengurus?.catatan,
    };
  }

  if (item.status === "perlu_perbaikan") {
    return {
      stage: "revision",
      label: "Perlu Perbaikan",
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
      progressText: "Revisi",
      adminApproved,
      pengurusApproved,
      adminStatus,
      pengurusStatus,
      adminCatatan: admin?.catatan,
      pengurusCatatan: pengurus?.catatan,
    };
  }

  if (item.status === "disetujui" || (adminApproved && pengurusApproved)) {
    return {
      stage: "approved_full",
      label: "Disetujui Penuh (2/2)",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      progressText: "2/2 Selesai",
      adminApproved: true,
      pengurusApproved: true,
      adminStatus: "disetujui",
      pengurusStatus: "disetujui",
      adminCatatan: admin?.catatan,
      pengurusCatatan: pengurus?.catatan,
    };
  }

  // Jika berstatus diperbaiki (hasil perbaikan pengusul yang diajukan ulang)
  if (item.status === "diperbaiki" || item.is_revisi || is_revisi) {
    const revNum = item.revisi_ke || revisi_ke || 1;
    if (adminApproved && !pengurusApproved) {
      return {
        stage: "waiting_pengurus",
        label: `Selesai Diperbaiki (Revisi #${revNum}) - Disetujui Admin (1/2)`,
        badgeClass: "bg-teal-100 text-teal-900 border-teal-300 font-semibold",
        progressText: "Selesai Diperbaiki (1/2)",
        adminApproved: true,
        pengurusApproved: false,
        adminStatus: "disetujui",
        pengurusStatus,
        adminCatatan: admin?.catatan,
        pengurusCatatan: pengurus?.catatan,
      };
    }
    if (pengurusApproved && !adminApproved) {
      return {
        stage: "waiting_admin",
        label: `Selesai Diperbaiki (Revisi #${revNum}) - Disetujui Pengurus (1/2)`,
        badgeClass: "bg-teal-100 text-teal-900 border-teal-300 font-semibold",
        progressText: "Selesai Diperbaiki (1/2)",
        adminApproved: false,
        pengurusApproved: true,
        adminStatus,
        pengurusStatus: "disetujui",
        adminCatatan: admin?.catatan,
        pengurusCatatan: pengurus?.catatan,
      };
    }
    return {
      stage: "diperbaiki",
      label: `Selesai Diperbaiki (Revisi #${revNum})`,
      badgeClass: "bg-teal-100 text-teal-900 border-teal-300 font-semibold",
      progressText: "Selesai Diperbaiki",
      adminApproved: false,
      pengurusApproved: false,
      adminStatus: "pending",
      pengurusStatus: "pending",
      adminCatatan: admin?.catatan,
      pengurusCatatan: pengurus?.catatan,
    };
  }

  // Masih berstatus diajukan
  if (adminApproved && !pengurusApproved) {
    return {
      stage: "waiting_pengurus",
      label: "Menunggu Pengurus Barang (1/2)",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
      progressText: "1/2 Verifikator",
      adminApproved: true,
      pengurusApproved: false,
      adminStatus: "disetujui",
      pengurusStatus,
      adminCatatan: admin?.catatan,
      pengurusCatatan: pengurus?.catatan,
    };
  }

  if (pengurusApproved && !adminApproved) {
    return {
      stage: "waiting_admin",
      label: "Menunggu Admin Dinkes (1/2)",
      badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
      progressText: "1/2 Verifikator",
      adminApproved: false,
      pengurusApproved: true,
      adminStatus,
      pengurusStatus: "disetujui",
      adminCatatan: admin?.catatan,
      pengurusCatatan: pengurus?.catatan,
    };
  }

  return {
    stage: "pending_all",
    label: "Menunggu Verifikasi (0/2)",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    progressText: "0/2 Verifikator",
    adminApproved: false,
    pengurusApproved: false,
    adminStatus: "pending",
    pengurusStatus: "pending",
    adminCatatan: admin?.catatan,
    pengurusCatatan: pengurus?.catatan,
  };
};

/**
 * Format catatan verifikator yang ramah pembaca untuk tampilan tabel atau ekspor excel
 */
export const formatDisplayCatatan = (item: SHSItem): string => {
  const { admin, pengurus, summary_catatan, catatan_perbaikan, revisi_ke } = parseVerificationData(item);
  const parts: string[] = [];

  if (catatan_perbaikan) {
    parts.push(`[Catatan Revisi #${revisi_ke || 1}]: ${catatan_perbaikan}`);
  }
  if (admin?.catatan) {
    parts.push(`[Admin]: ${admin.catatan}`);
  }
  if (pengurus?.catatan) {
    parts.push(`[Pengurus Barang]: ${pengurus.catatan}`);
  }
  if (parts.length === 0 && summary_catatan) {
    return summary_catatan;
  }
  return parts.join(" | ") || "-";
};

/**
 * Helper untuk mendeteksi unit kerja resmi Dinas Kesehatan / Puskesmas dari username.
 * Menjamin akun Puskesmas tidak tertukar dengan Bidang Kesmas ('puskesmas' vs 'kesmas').
 */
export const inferUnitFromUser = (username?: string): string => {
  if (!username) return "Sekretariat Dinas Kesehatan";
  const lower = username.toLowerCase().trim();

  // 1. Prioritas pemeriksaan Puskesmas agar 'puskesmas' tidak memicu 'kesmas'
  const isPusk =
    lower.startsWith("puskesmas") ||
    lower.startsWith("pkm_") ||
    lower.startsWith("pkms_") ||
    lower.includes("puskesmas_");
  if (isPusk) {
    const cleanName = lower
      .replace(/^(puskesmas_|pkm_|pkms_|puskesmas)/, "")
      .replace(/[\s_']/g, "");
    if (cleanName) {
      const puskMatch = DAFTAR_UNIT_DINKES_PUSKESMAS.find((u) => {
        const cleanU = u.toLowerCase().replace(/[\s']/g, "");
        return cleanU.includes(cleanName);
      });
      if (puskMatch) return puskMatch;
    }
  }

  // 2. Bidang-bidang Dinkes & UPT
  if (lower.includes("kesmas") && !lower.includes("puskesmas"))
    return "Bidang Kesehatan Masyarakat (Kesmas)";
  if (lower.includes("p2p"))
    return "Bidang Pencegahan & Pengendalian Penyakit (P2P)";
  if (lower.includes("yankes"))
    return "Bidang Pelayanan Kesehatan (Yankes)";
  if (lower.includes("sdk"))
    return "Bidang Sumber Daya Kesehatan (SDK)";
  if (lower.includes("sekretariat"))
    return "Sekretariat Dinas Kesehatan";
  if (lower.includes("labkesda"))
    return "Labkesda Kab. Pamekasan";
  if (lower.includes("ifk") || lower.includes("farmasi"))
    return "Instalasi Farmasi Kab. Pamekasan";

  // 3. Fallback pencarian Puskesmas jika username tidak pakai prefix standar
  const directMatch = DAFTAR_UNIT_DINKES_PUSKESMAS.find((u) => {
    const cu = u.toLowerCase().replace(/[\s_']/g, "");
    const cl = lower.replace(/[\s_']/g, "");
    return cu.includes(cl) || cl.includes(cu);
  });
  if (directMatch) return directMatch;

  return "Sekretariat Dinas Kesehatan";
};

/**
 * Memeriksa apakah suatu usulan SHS milik unit kerja / bidang dari pengguna saat ini.
 */
export const isItemBelongToUserUnit = (
  item: Partial<SHSItem>,
  user: { id?: string; username?: string; role?: string } | null
): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;

  // 1. Pemilik langsung berdasarkan user_id (akun pembuat)
  if (item.user_id && user.id && item.user_id === user.id) return true;

  const uname = (user.username || "").toLowerCase().trim();
  const pengusul = (item.nama_pengusul || "").toLowerCase().trim();
  const unit = (item.unit_kerja || "").toLowerCase().trim();

  // 2. Nama pengusul sama dengan username pengguna
  if (pengusul && uname && pengusul === uname) return true;

  // 3. Unit kerja item sama dengan unit kerja yang dimiliki user
  const userUnit = inferUnitFromUser(uname);
  if (userUnit && unit && userUnit.toLowerCase().trim() === unit) return true;

  // 4. Pencocokan keyword bersih (minimal 3 karakter)
  const cleanUname = uname.replace(/^(pkm_|pkms_|puskesmas_|bidang_)/, "").replace(/[^a-z0-9]/g, "");
  const cleanUnit = unit.replace(/[^a-z0-9]/g, "");
  const cleanUserUnit = (userUnit || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanPengusul = pengusul.replace(/[^a-z0-9]/g, "");

  if (cleanUname.length >= 3) {
    if (cleanUnit.includes(cleanUname)) return true;
    if (cleanPengusul.includes(cleanUname)) return true;
  }

  if (cleanUserUnit.length >= 4) {
    if (cleanUnit.includes(cleanUserUnit) || cleanUserUnit.includes(cleanUnit)) return true;
  }

  return false;
};

/**
 * Memeriksa apakah user berhak melihat item usulan SHS ini.
 * Aturan:
 * 1. Admin dan Verifikator (Pengurus Barang) berhak melihat SEMUA usulan dari seluruh bidang/puskesmas.
 * 2. User Bidang / Puskesmas / Pengusul HANYA DAPAT MELIHAT usulan milik bidang/unitnya sendiri.
 */
export const canUserViewItem = (
  item: Partial<SHSItem>,
  user: { id?: string; username?: string; role?: string } | null
): boolean => {
  if (!user) return false;
  if (user.role === "admin" || user.role === "pengurus_barang") return true;
  const uname = (user.username || "").toLowerCase().trim();
  if (uname.startsWith("pengurus")) return true;

  return isItemBelongToUserUnit(item, user);
};

/**
 * Memeriksa apakah user saat ini adalah pemilik dari usulan tersebut.
 * Admin memiliki akses kepemilikan penuh ke seluruh usulan.
 */
export const isItemOwner = (
  item: Partial<SHSItem>,
  user: { id?: string; username?: string; role?: string } | null
): boolean => {
  return isItemBelongToUserUnit(item, user);
};

/**
 * Validasi apakah suatu item dapat diedit oleh user.
 * Aturan:
 * 1. Admin dapat mengedit kapan saja.
 * 2. User/Bidang HANYA dapat mengedit miliknya sendiri (TIDAK BISA edit punya bidang/unit lain).
 * 3. User/Bidang TIDAK BISA mengedit saat status 'diajukan' atau 'disetujui' (Terkunci selama verifikasi).
 *    Hanya bisa diedit jika berstatus 'draft', 'perlu_perbaikan', atau 'ditolak'.
 */
export const canEditItem = (
  item: Partial<SHSItem>,
  user: { id?: string; username?: string; role?: string } | null
): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;

  const isOwner = isItemOwner(item, user);
  if (!isOwner) return false;

  // Kunci saat diajukan (menunggu verifikasi) atau saat disetujui penuh
  return item.status === "draft" || item.status === "perlu_perbaikan" || item.status === "ditolak";
};

/**
 * Validasi apakah suatu item dapat dihapus oleh user.
 * Aturan:
 * 1. Admin dapat menghapus usulan kapan saja.
 * 2. User/Bidang HANYA dapat menghapus usulan miliknya sendiri jika berstatus 'draft' atau 'ditolak'.
 */
export const canDeleteItem = (
  item: Partial<SHSItem>,
  user: { id?: string; username?: string; role?: string } | null
): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;

  const isOwner = isItemOwner(item, user);
  if (!isOwner) return false;

  return item.status === "draft" || item.status === "ditolak";
};


