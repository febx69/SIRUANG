// src/components/PBPU/PBPUDashboardStats.tsx
import React from 'react';
import { PBPUSubmission } from '@/types/pbpu';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  HeartPulse,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface PBPUDashboardStatsProps {
  submissions: PBPUSubmission[];
  stats: {
    total: number;
    menunggu: number;
    terverifikasi: number;
    ditolak: number;
    nikBermasalah: number;
    nikClear: number;
    jalurPuskesmas: number;
    jalurDinsos: number;
    byDistrict: Record<string, number>;
    byUnit: Record<string, number>;
  };
}

const STATUS_COLORS = ['#f59e0b', '#10b981', '#ef4444'];
const CHANNEL_COLORS = ['#0d9488', '#3b82f6'];

export const PBPUDashboardStats: React.FC<PBPUDashboardStatsProps> = ({
  submissions,
  stats,
}) => {
  // Chart Data: Status Verifikasi
  const statusPieData = [
    { name: 'Menunggu Verifikasi', value: stats.menunggu },
    { name: 'Terverifikasi', value: stats.terverifikasi },
    { name: 'Ditolak Dinkes', value: stats.ditolak },
  ].filter((d) => d.value > 0);

  // Chart Data: Jalur
  const channelPieData = [
    { name: 'Jalur Puskesmas', value: stats.jalurPuskesmas },
    { name: 'Jalur Dinsos', value: stats.jalurDinsos },
  ].filter((d) => d.value > 0);

  // Chart Data: Per Kecamatan (Top 7)
  const districtData = Object.entries(stats.byDistrict)
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Daftar usulan tertua yang masih Menunggu Verifikasi (PRD 11.3)
  const pendingSubmissions = submissions
    .filter((s) => s.verification_status === 'MENUNGGU')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. KARTU INDIKATOR KPI UTAMA (PRD 11.1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Usulan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Usulan</span>
            <FileText size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800 tracking-tight">{stats.total}</p>
          <p className="text-[10px] text-slate-400">Seluruh pendaftaran PBPU</p>
        </div>

        {/* Menunggu Verifikasi */}
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Menunggu</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-900 tracking-tight">{stats.menunggu}</p>
          <p className="text-[10px] text-amber-700">Antrean telaah Dinkes</p>
        </div>

        {/* Terverifikasi */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Terverifikasi</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-900 tracking-tight">
            {stats.terverifikasi}
          </p>
          <p className="text-[10px] text-emerald-700">Disetujui Bidang Yankes</p>
        </div>

        {/* Ditolak Dinkes */}
        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ditolak</span>
            <XCircle size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-900 tracking-tight">{stats.ditolak}</p>
          <p className="text-[10px] text-rose-700">Perlu perbaikan berkas</p>
        </div>

        {/* NIK Bermasalah */}
        <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">NIK Masalah</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-950 tracking-tight">{stats.nikBermasalah}</p>
          <p className="text-[10px] text-rose-700">Antrean Dukcapil</p>
        </div>

        {/* Jalur Puskesmas vs Dinsos */}
        <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jalur Usulan</span>
            <HeartPulse size={16} className="text-teal-600" />
          </div>
          <p className="text-lg font-black text-teal-950 tracking-tight mt-1">
            {stats.jalurPuskesmas} <span className="text-xs font-normal text-slate-500">PKM</span> / {stats.jalurDinsos} <span className="text-xs font-normal text-slate-500">DS</span>
          </p>
          <p className="text-[10px] text-teal-700">Puskesmas / Dinsos</p>
        </div>
      </div>

      {/* 2. GRAFIK TREN & DISTRIBUSI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafik Distribusi Status Keputusan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <TrendingUp size={16} className="text-teal-600" />
            Distribusi Keputusan Verifikasi
          </h4>
          <p className="text-xs text-slate-400">Rasio status verifikasi usulan masuk</p>

          <div className="h-52 flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={40}
                    paddingAngle={4}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name.includes('Menunggu')
                            ? '#f59e0b'
                            : entry.name.includes('Terverifikasi')
                            ? '#10b981'
                            : '#ef4444'
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data usulan</p>
            )}
          </div>
        </div>

        {/* Grafik Usulan per Kecamatan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 lg:col-span-2">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <MapPin size={16} className="text-teal-600" />
            Distribusi Usulan per Kecamatan (Kab. Pamekasan)
          </h4>
          <p className="text-xs text-slate-400">Sebaran wilayah domisili calon peserta</p>

          <div className="h-52">
            {districtData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="district" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jumlah Usulan" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada data usulan wilayah
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. DAFTAR USULAN TERTUA YANG MASIH MENUNGGU VERIFIKASI (PRD 11.3) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Clock size={16} className="text-amber-500" />
            Antrean Usulan Tertua yang Masih Menunggu Verifikasi
          </h4>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {stats.menunggu} Menunggu
          </span>
        </div>

        {pendingSubmissions.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Semua usulan telah selesai diverifikasi oleh Bidang Yankes.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingSubmissions.map((sub) => {
              const daysDiff = Math.floor(
                (Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-800">{sub.registration_no}</span>{' '}
                    — <strong className="text-slate-900">{sub.applicant_name}</strong>
                    <p className="text-[11px] text-slate-400">
                      {sub.submitter_unit} • {sub.district}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        daysDiff >= 3
                          ? 'bg-rose-100 text-rose-700'
                          : daysDiff >= 1
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {daysDiff === 0 ? 'Hari ini' : `${daysDiff} hari lalu`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
