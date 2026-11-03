// src/components/SHS/SHSTimeline.tsx
// Komponen Linimasa (Timeline) Alur Pengusulan & Verifikasi Ganda SHS
// Melacak: Kapan diajukan, Kapan diverifikasi Admin, Kapan diverifikasi Pengurus Barang

import React from "react";
import { SHSItem, SHSStatus } from "@/types/shs";
import { parseVerificationData, VerifierDecision } from "@/lib/shsVerificationHelper";
import {
  Send,
  UserCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
  Boxes,
  HelpCircle,
  Calendar,
  Building,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SHSTimelineProps {
  item: SHSItem;
  className?: string;
  compact?: boolean;
}

export const formatTimelineWIB = (isoString?: string | null): string => {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return (
      new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(d) + " WIB"
    );
  } catch {
    return isoString;
  }
};

export const SHSTimeline: React.FC<SHSTimelineProps> = ({ item, className = "", compact = false }) => {
  const { admin, pengurus, summary_catatan, submitted_at } = parseVerificationData(item);

  // Waktu pengajuan
  const isDraft = item.status === "draft";
  const submitTime = submitted_at || (isDraft ? item.created_at : item.created_at);

  // Status Tahap 2 (Admin)
  const adminDone = Boolean(admin && admin.verified_at);
  const adminStatus = admin?.status;

  // Status Tahap 3 (Pengurus Barang)
  const pengurusDone = Boolean(pengurus && pengurus.verified_at);
  const pengurusStatus = pengurus?.status;

  // Status Tahap 4 (Final)
  const isFullyApproved = item.status === "disetujui";
  const isNeedRevision = item.status === "perlu_perbaikan";
  const isRejected = item.status === "ditolak";
  const isInReview = item.status === "diajukan";

  return (
    <div className={`space-y-4 w-full max-w-full overflow-hidden ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Linimasa Alur Pengusulan & Verifikasi
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 font-bold uppercase shrink-0 ${
            isFullyApproved
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : item.status === "diperbaiki"
              ? "border-teal-300 bg-teal-50 text-teal-800"
              : isNeedRevision
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : isRejected
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : isInReview
              ? "border-blue-300 bg-blue-50 text-blue-800"
              : "border-slate-300 bg-slate-50 text-slate-700"
          }`}
        >
          {isFullyApproved
            ? "Disetujui Penuh (2/2)"
            : item.status === "diperbaiki"
            ? `✨ Selesai Diperbaiki (Revisi #${item.revisi_ke || 1})`
            : isNeedRevision
            ? "Perlu Revisi"
            : isRejected
            ? "Ditolak"
            : isInReview
            ? "Dalam Verifikasi"
            : "Draft"}
        </Badge>
      </div>

      {/* Stepper / Timeline Track */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
        {/* ======================================================== */}
        {/* TAHAP 1: PENGUSULAN (DIAJUKAN)                           */}
        {/* ======================================================== */}
        <div className="relative group">
          {/* Node Icon */}
          <div
            className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs ${
              isDraft
                ? "bg-amber-500"
                : item.status === "diperbaiki"
                ? "bg-teal-600"
                : "bg-emerald-600"
            }`}
          >
            {isDraft ? <Clock size={12} /> : item.status === "diperbaiki" ? <Sparkles size={11} /> : <Send size={11} />}
          </div>

          <div className="bg-slate-50/80 hover:bg-slate-50 transition-colors p-3 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                {isDraft
                  ? "📌 Draft Usulan Dibuat"
                  : item.status === "diperbaiki"
                  ? `✨ Usulan Selesai Diperbaiki (Revisi #${item.revisi_ke || 1})`
                  : "📤 Usulan Resmi Diajukan"}
              </span>
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                <Calendar size={11} />
                {formatTimelineWIB(submitTime)}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="break-words">
                Pengusul: <b className="text-slate-800">{item.nama_pengusul}</b>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 break-words">
                <Building size={11} className="text-slate-400 shrink-0" />
                Unit/Bidang: <b className="text-slate-800">{item.unit_kerja}</b>
              </span>
              <span>•</span>
              <span>TA {item.tahun}</span>
            </div>

            {item.is_revisi && (
              <div className="text-[10px] text-teal-900 font-medium bg-teal-50/90 p-2 rounded-lg border border-teal-200 mt-1 space-y-0.5">
                <div className="font-bold text-teal-800 flex items-center gap-1">
                  <Sparkles size={11} className="text-teal-600" />
                  Status: Selesai Diperbaiki (Revisi #{item.revisi_ke || 1})
                </div>
                {item.catatan_perbaikan && (
                  <p className="text-teal-950 whitespace-pre-wrap">{item.catatan_perbaikan}</p>
                )}
              </div>
            )}

            {isDraft && (
              <div className="text-[10px] text-amber-700 font-medium bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                Usulan masih berstatus <b>Draft</b>. Klik tombol <i>"Ajukan Sekarang"</i> agar usulan masuk ke antrean verifikasi.
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAHAP 2: VERIFIKASI ADMIN DINKES                        */}
        {/* ======================================================== */}
        <div className="relative group">
          {/* Node Icon */}
          <div
            className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs ${
              adminStatus === "disetujui"
                ? "bg-emerald-600"
                : adminStatus === "perlu_perbaikan"
                ? "bg-amber-500"
                : adminStatus === "ditolak"
                ? "bg-rose-600"
                : isDraft
                ? "bg-slate-300 text-slate-600"
                : "bg-blue-600 animate-pulse"
            }`}
          >
            {adminStatus === "disetujui" ? (
              <CheckCircle2 size={12} />
            ) : adminStatus === "perlu_perbaikan" ? (
              <AlertCircle size={12} />
            ) : adminStatus === "ditolak" ? (
              <XCircle size={12} />
            ) : (
              <UserCheck size={11} />
            )}
          </div>

          <div
            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
              adminStatus === "disetujui"
                ? "bg-emerald-50/60 border-emerald-200"
                : adminStatus === "perlu_perbaikan"
                ? "bg-amber-50/70 border-amber-200"
                : adminStatus === "ditolak"
                ? "bg-rose-50/70 border-rose-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                🛡️ Verifikasi Admin Dinas Kesehatan
                {adminDone && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 uppercase shrink-0 ${
                      adminStatus === "disetujui"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : adminStatus === "perlu_perbaikan"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}
                  >
                    {adminStatus}
                  </Badge>
                )}
              </span>

              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                <Calendar size={11} />
                {adminDone ? formatTimelineWIB(admin?.verified_at) : "Menunggu Antrean"}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2">
              <span>
                Verifikator:{" "}
                <b className="text-slate-800">
                  {admin?.verifikator_name || "Tim Verifikasi SHS Dinkes"}
                </b>
              </span>
              <span>•</span>
              <span>
                Status:{" "}
                {adminDone ? (
                  <b
                    className={
                      adminStatus === "disetujui"
                        ? "text-emerald-700"
                        : adminStatus === "perlu_perbaikan"
                        ? "text-amber-700"
                        : "text-rose-700"
                    }
                  >
                    {adminStatus === "disetujui"
                      ? "Disetujui ✓"
                      : adminStatus === "perlu_perbaikan"
                      ? "Perlu Perbaikan"
                      : "Ditolak ✗"}
                  </b>
                ) : isDraft ? (
                  <span className="text-slate-400">Belum diajukan</span>
                ) : (
                  <span className="text-blue-600 font-semibold animate-pulse">
                    Sedang Dalam Proses Review...
                  </span>
                )}
              </span>
            </div>

            {/* Catatan Admin jika ada */}
            {admin?.catatan && (
              <div
                className={`mt-1.5 p-2 rounded-lg text-[11px] leading-relaxed border ${
                  adminStatus === "perlu_perbaikan"
                    ? "bg-amber-100/70 border-amber-300 text-amber-950"
                    : adminStatus === "ditolak"
                    ? "bg-rose-100/70 border-rose-300 text-rose-950"
                    : "bg-emerald-100/70 border-emerald-300 text-emerald-950"
                }`}
              >
                <div className="font-bold text-[10px] uppercase mb-0.5">Catatan Admin:</div>
                <div className="whitespace-normal break-words">{admin.catatan}</div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAHAP 3: VERIFIKASI PENGURUS BARANG                      */}
        {/* ======================================================== */}
        <div className="relative group">
          {/* Node Icon */}
          <div
            className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs ${
              pengurusStatus === "disetujui"
                ? "bg-emerald-600"
                : pengurusStatus === "perlu_perbaikan"
                ? "bg-amber-500"
                : pengurusStatus === "ditolak"
                ? "bg-rose-600"
                : isDraft
                ? "bg-slate-300 text-slate-600"
                : "bg-blue-600 animate-pulse"
            }`}
          >
            {pengurusStatus === "disetujui" ? (
              <CheckCircle2 size={12} />
            ) : pengurusStatus === "perlu_perbaikan" ? (
              <AlertCircle size={12} />
            ) : pengurusStatus === "ditolak" ? (
              <XCircle size={12} />
            ) : (
              <Boxes size={11} />
            )}
          </div>

          <div
            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors ${
              pengurusStatus === "disetujui"
                ? "bg-emerald-50/60 border-emerald-200"
                : pengurusStatus === "perlu_perbaikan"
                ? "bg-amber-50/70 border-amber-200"
                : pengurusStatus === "ditolak"
                ? "bg-rose-50/70 border-rose-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                📦 Verifikasi Pengurus Barang Pengelola
                {pengurusDone && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 uppercase shrink-0 ${
                      pengurusStatus === "disetujui"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : pengurusStatus === "perlu_perbaikan"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}
                  >
                    {pengurusStatus}
                  </Badge>
                )}
              </span>

              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                <Calendar size={11} />
                {pengurusDone ? formatTimelineWIB(pengurus?.verified_at) : "Menunggu Antrean"}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2">
              <span>
                Verifikator:{" "}
                <b className="text-slate-800">
                  {pengurus?.verifikator_name || "Pengurus Barang Dinkes"}
                </b>
              </span>
              <span>•</span>
              <span>
                Status:{" "}
                {pengurusDone ? (
                  <b
                    className={
                      pengurusStatus === "disetujui"
                        ? "text-emerald-700"
                        : pengurusStatus === "perlu_perbaikan"
                        ? "text-amber-700"
                        : "text-rose-700"
                    }
                  >
                    {pengurusStatus === "disetujui"
                      ? "Disetujui ✓"
                      : pengurusStatus === "perlu_perbaikan"
                      ? "Perlu Perbaikan"
                      : "Ditolak ✗"}
                  </b>
                ) : isDraft ? (
                  <span className="text-slate-400">Belum diajukan</span>
                ) : (
                  <span className="text-blue-600 font-semibold animate-pulse">
                    Sedang Dalam Proses Review...
                  </span>
                )}
              </span>
            </div>

            {/* Catatan Pengurus Barang jika ada */}
            {pengurus?.catatan && (
              <div
                className={`mt-1.5 p-2 rounded-lg text-[11px] leading-relaxed border ${
                  pengurusStatus === "perlu_perbaikan"
                    ? "bg-amber-100/70 border-amber-300 text-amber-950"
                    : pengurusStatus === "ditolak"
                    ? "bg-rose-100/70 border-rose-300 text-rose-950"
                    : "bg-emerald-100/70 border-emerald-300 text-emerald-950"
                }`}
              >
                <div className="font-bold text-[10px] uppercase mb-0.5">Catatan Pengurus Barang:</div>
                <div className="whitespace-normal break-words">{pengurus.catatan}</div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAHAP 4: KESIMPULAN / HASIL AKHIR                        */}
        {/* ======================================================== */}
        <div className="relative group">
          {/* Node Icon */}
          <div
            className={`absolute -left-6 top-0 w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs ${
              isFullyApproved
                ? "bg-emerald-700"
                : isNeedRevision
                ? "bg-amber-600"
                : isRejected
                ? "bg-rose-700"
                : item.status === "diperbaiki"
                ? "bg-teal-600"
                : "bg-slate-400"
            }`}
          >
            {isFullyApproved ? (
              <CheckCircle2 size={13} />
            ) : isNeedRevision ? (
              <AlertCircle size={13} />
            ) : isRejected ? (
              <XCircle size={13} />
            ) : item.status === "diperbaiki" ? (
              <Sparkles size={12} />
            ) : (
              <Clock size={12} />
            )}
          </div>

          <div
            className={`p-3 rounded-xl border text-xs space-y-1 ${
              isFullyApproved
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : isNeedRevision
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : isRejected
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : item.status === "diperbaiki"
                ? "bg-teal-50 border-teal-300 text-teal-950"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>Status Akhir Usulan SHS:</span>
              <span className="font-bold uppercase tracking-wider text-[11px]">
                {item.status === "diperbaiki"
                  ? `Selesai Diperbaiki (Revisi #${item.revisi_ke || 1})`
                  : item.status.replace("_", " ")}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed">
              {isFullyApproved && (
                <>
                  🎉 <b>Usulan Telah Disetujui Penuh (2/2)</b> oleh Tim Admin Dinkes dan Pengurus
                  Barang. Usulan ini terkunci dan siap ditetapkan dalam dokumen Standar Satuan Harga
                  (SSH) Tahun Anggaran {item.tahun}.
                </>
              )}
              {isNeedRevision && (
                <>
                  ⚠️ <b>Usulan Memerlukan Perbaikan / Revisi.</b> Kunci usulan dibuka kembali untuk
                  unit kerja <b>{item.unit_kerja}</b>. Silakan perbaiki spesifikasi/harga sesuai
                  catatan di atas dan ajukan ulang.
                </>
              )}
              {isRejected && (
                <>
                  ❌ <b>Usulan Ditolak oleh Verifikator.</b> Usulan tidak dapat diakomodir ke dalam
                  dokumen Standar Harga Satuan.
                </>
              )}
              {item.status === "diperbaiki" && (
                <>
                  ✨ <b>Usulan Selesai Diperbaiki (Revisi #{item.revisi_ke || 1}).</b> Usulan
                  telah selesai diperbaiki oleh unit kerja <b>{item.unit_kerja}</b> dan saat ini resmi berstatus
                  <b> Selesai Diperbaiki</b>, siap untuk ditelaah ulang oleh Tim Verifikator.
                </>
              )}
              {isInReview && (
                <>
                  ⏳ <b>Usulan Terkunci Sementara.</b> Usulan telah dikirim dan sedang dalam proses
                  antrean penelaahan berkas oleh tim verifikator. Usulan baru dapat diedit jika
                  verifikator mengembalikan berkas (perlu perbaikan/ditolak).
                </>
              )}
              {isDraft && (
                <>
                  📝 Usulan masih berupa <b>Draf Awal</b>. Belum masuk ke proses verifikasi dan
                  dapat diubah kapan saja oleh unit kerja.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
