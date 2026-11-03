// src/components/SHS/SHSPeriodBanner.tsx
import { useState, useEffect } from "react";
import { SHSPeriod, PeriodStatus } from "@/types/shs";
import { Clock, AlertTriangle, CheckCircle2, XCircle, Calendar, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SHSPeriodBannerProps {
  period: SHSPeriod;
  status: PeriodStatus;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const calculateTimeRemaining = (targetDate: string): TimeRemaining => {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, isExpired: false };
};

const formatWIB = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return (
      d.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  } catch {
    return isoString;
  }
};

export const SHSPeriodBanner = ({ period, status }: SHSPeriodBannerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(period.tutup_at)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(period.tutup_at));
    }, 1000);
    return () => clearInterval(timer);
  }, [period.tutup_at]);

  const effectiveStatus = timeLeft.isExpired ? "ditutup" : status;
  const isBuka = effectiveStatus === "dibuka";
  const isTutup = effectiveStatus === "ditutup";

  return (
    <div
      className={`rounded-2xl p-5 border shadow-sm transition-all duration-300 ${
        isBuka
          ? "bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-emerald-500/30 text-white"
          : isTutup
          ? "bg-gradient-to-r from-rose-950/80 via-slate-900 to-red-950/80 border-rose-500/30 text-white"
          : "bg-gradient-to-r from-amber-950/80 via-slate-900 to-yellow-950/80 border-amber-500/30 text-white"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Kolom Kiri: Info Periode & Status */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/10 flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-400" />
              Tahun Anggaran {period.tahun}
            </span>

            {isBuka && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 gap-1.5 px-3 py-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Periode Terbuka
              </Badge>
            )}

            {isTutup && (
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-400/30 gap-1.5 px-3 py-1 font-semibold">
                <XCircle size={14} className="text-rose-400" />
                Periode Ditutup
              </Badge>
            )}

            {!isBuka && !isTutup && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 gap-1.5 px-3 py-1 font-semibold">
                <Clock size={14} className="text-amber-400" />
                Belum Dibuka
              </Badge>
            )}
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              {period.nama}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-0.5 line-clamp-2">
              {period.deskripsi || "Silakan ajukan item Standar Harga Satuan (SHS) untuk diverifikasi oleh Tim Dinas Kesehatan."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 pt-1">
            <span>Buka: <strong className="text-slate-200">{formatWIB(period.buka_at)}</strong></span>
            <span>•</span>
            <span>Batas Akhir: <strong className="text-slate-200">{formatWIB(period.tutup_at)}</strong></span>
          </div>
        </div>

        {/* Kolom Kanan: Countdown Timer */}
        {isBuka && (
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3.5 sm:p-4 text-center shrink-0 min-w-[280px]">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
              <Clock size={14} className="animate-spin text-emerald-400" style={{ animationDuration: "6s" }} />
              <span>Sisa Waktu Pengusulan:</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-xl sm:text-2xl font-black text-white">{timeLeft.days}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Hari</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-xl sm:text-2xl font-black text-white">
                  {String(timeLeft.hours).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Jam</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-xl sm:text-2xl font-black text-white">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Menit</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <div className="text-xl sm:text-2xl font-black text-emerald-300">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Detik</div>
              </div>
            </div>
          </div>
        )}

        {isTutup && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5 sm:p-4 text-left shrink-0 max-w-sm flex items-start gap-3">
            <ShieldAlert size={24} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200">
              <div className="font-bold text-rose-100 text-sm">Penginputan Baru Ditutup</div>
              Pengusulan baru atau import berkas terkunci. Verifikasi oleh Tim Verifikator dan perbaikan usulan (revisi) tetap dapat dilakukan.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
