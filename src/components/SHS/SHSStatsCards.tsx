import { SHSRecapStats } from "@/types/shs";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Coins,
  FileEdit,
  Sparkles,
} from "lucide-react";

interface SHSStatsCardsProps {
  stats: SHSRecapStats;
  onFilterStatus?: (status: string) => void;
  activeStatusFilter?: string;
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
};

export const SHSStatsCards = ({
  stats,
  onFilterStatus,
  activeStatusFilter = "all",
}: SHSStatsCardsProps) => {
  const cards = [
    {
      id: "all",
      label: "Total Usulan",
      value: stats.total,
      icon: FileText,
      color: "text-slate-800",
      bg: "bg-slate-100",
      border: "border-slate-200",
      hoverBorder: "hover:border-slate-400",
    },
    {
      id: "draft",
      label: "Draft",
      value: stats.draft,
      icon: FileEdit,
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      hoverBorder: "hover:border-amber-400",
    },
    {
      id: "diajukan",
      label: "Diajukan (Baru)",
      value: stats.diajukan,
      icon: Clock,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      hoverBorder: "hover:border-blue-400",
    },
    {
      id: "diperbaiki",
      label: "Selesai Diperbaiki",
      value: stats.diperbaiki || 0,
      icon: Sparkles,
      color: "text-teal-700",
      bg: "bg-teal-50",
      border: "border-teal-200",
      hoverBorder: "hover:border-teal-400",
    },
    {
      id: "disetujui",
      label: "Disetujui",
      value: stats.disetujui,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      hoverBorder: "hover:border-emerald-400",
    },
    {
      id: "perlu_perbaikan",
      label: "Perlu Perbaikan",
      value: stats.perlu_perbaikan,
      icon: AlertCircle,
      color: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
      hoverBorder: "hover:border-orange-400",
    },
    {
      id: "ditolak",
      label: "Ditolak",
      value: stats.ditolak,
      icon: XCircle,
      color: "text-rose-700",
      bg: "bg-rose-50",
      border: "border-rose-200",
      hoverBorder: "hover:border-rose-400",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Grid Status Counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const isSelected = activeStatusFilter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onFilterStatus && onFilterStatus(c.id)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-blue-600 shadow-md bg-white " + c.border
                  : "bg-white/80 hover:bg-white " + c.border + " " + c.hoverBorder
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {c.label}
                </span>
                <div className={`p-1.5 rounded-lg ${c.bg} ${c.color}`}>
                  <Icon size={14} />
                </div>
              </div>
              <div className={`text-2xl font-black ${c.color}`}>{c.value}</div>
            </button>
          );
        })}
      </div>

      {/* Ringkasan Estimasi Nilai Anggaran */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Estimasi Nilai Seluruh Usulan
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatRupiah(stats.totalAnggaran)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Coins size={22} />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-teal-50/60 p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              Total Nilai Usulan Telah Disetujui
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-800">
              {formatRupiah(stats.totalAnggaranDisetujui)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};
