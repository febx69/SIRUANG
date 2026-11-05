// src/pages/PBPUPage.tsx
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseAuth, isUserPBPU } from '@/hooks/useSupabaseAuth';
import { usePBPU } from '@/hooks/usePBPU';
import Header from '@/components/Layout/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  FilePlus,
  AlertCircle,
  BarChart3,
  FileSpreadsheet,
  HeartHandshake,
  Building,
  ArrowLeft,
  History,
  FileText,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { PBPUVerificationPanel } from '@/components/PBPU/PBPUVerificationPanel';
import { PBPUSubmissionForm } from '@/components/PBPU/PBPUSubmissionForm';
import { PBPUNikFollowUpPanel } from '@/components/PBPU/PBPUNikFollowUpPanel';
import { PBPUDashboardStats } from '@/components/PBPU/PBPUDashboardStats';
import { PBPURecapExport } from '@/components/PBPU/PBPURecapExport';

export const PBPUPage: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    submissions,
    isLoading: dataLoading,
    isSubmitting,
    stats,
    submitNewApplication,
    resubmitApplication,
    verifySubmission,
    updateNikStatus,
  } = usePBPU(user);

  const uname = (user?.username || '').toLowerCase();
  const isYankes = uname === 'yankes' || uname.includes('yankes');
  const isAdmin = user?.role === 'admin';
  const isPuskesmas = user?.role === 'puskesmas' || uname.startsWith('puskesmas') || uname.startsWith('pkm_');
  const isRSUD = user?.role === 'rsud' || uname === 'rsud' || uname.startsWith('rsud');
  const isDinsos = user?.role === 'dinsos' || uname === 'dinsos';
  const isDukcapil = user?.role === 'dukcapil' || uname === 'dukcapil';
  const isPengusul = isPuskesmas || isDinsos || isRSUD;
  const isVerifier = isYankes || isAdmin;

  // State untuk menangani usulan yang ditolak dan sedang diperbaiki oleh pengusul
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);

  // Tab awal: baca query param ?tab= atau gunakan default per peran
  const queryTab = searchParams.get('tab');
  const defaultTab = queryTab || (isDukcapil ? 'dukcapil' : isPengusul ? 'form' : 'verifikasi');
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  useEffect(() => {
    if (queryTab && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  // Filter usulan unit untuk Pengusul (Puskesmas, Dinsos, & RSUD)
  const unitSubmissions = React.useMemo(() => {
    if (!isPengusul) return submissions;
    if (isDinsos) {
      return submissions.filter(
        (s) => s.submission_channel === 'DINSOS' || s.submitter_unit.toLowerCase().includes('sosial')
      );
    }
    if (isRSUD) {
      return submissions.filter(
        (s) =>
          s.submitter_unit.toLowerCase().includes('rsud') ||
          s.submitter_unit.toLowerCase().includes('smart') ||
          s.submitter_unit.toLowerCase().includes('waru') ||
          s.submitter_unit.toLowerCase().includes('noer') ||
          (s.submitter_username && s.submitter_username.toLowerCase().includes('rsud'))
      );
    }
    // Akun tunggal Puskesmas: menampilkan usulan jalur Puskesmas (bukan RSUD)
    return submissions.filter(
      (s) =>
        (s.submission_channel === 'PUSKESMAS' &&
          !s.submitter_unit.toLowerCase().includes('rsud') &&
          !s.submitter_unit.toLowerCase().includes('smart') &&
          !s.submitter_unit.toLowerCase().includes('waru') &&
          !s.submitter_unit.toLowerCase().includes('noer')) ||
        (s.submitter_username && s.submitter_username.toLowerCase().includes('puskesmas'))
    );
  }, [submissions, isPengusul, isDinsos, isRSUD]);

  // Usulan yang masuk ke antrean Verifikasi Yankes:
  // HANYA usulan yang status NIK-nya TIDAK_BERMASALAH (sudah divalidasi Dukcapil atau tidak bermasalah sejak awal)
  const yankesVerificationSubmissions = React.useMemo(() => {
    return submissions.filter((s) => s.nik_status === 'TIDAK_BERMASALAH');
  }, [submissions]);

  const unitNikBermasalahCount = React.useMemo(() => {
    return unitSubmissions.filter((s) => s.nik_status === 'BERMASALAH').length;
  }, [unitSubmissions]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Khusus Akun Berwenang PBPU BP: Jika selain itu (SDK, Kesmas, P2P, dll), lempar kembali ke Beranda
  if (!isUserPBPU(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header user={user} onLogout={logout} />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Navigation & Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 self-start"
          >
            <ArrowLeft size={16} /> Kembali ke Beranda
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Peran Akun:</span>
            <span className="text-xs font-bold px-3 py-1 rounded-lg bg-teal-100 text-teal-900 border border-teal-200 uppercase flex items-center gap-1.5 shadow-sm">
              <ShieldCheck size={13} className="text-teal-700" />
              {isYankes
                ? 'Bidang Yankes (Verifikator)'
                : isDinsos
                ? 'Dinas Sosial (Pengusul)'
                : isRSUD
                ? 'RSUD (Pengusul)'
                : isPuskesmas
                ? 'Puskesmas (Pengusul)'
                : isDukcapil
                ? 'Dukcapil (Pemeriksa NIK)'
                : isAdmin
                ? 'Administrator (Supervisi)'
                : user.username}
            </span>
          </div>
        </div>

        {/* HEADER SECTION PERSONA-BASED */}
        <div className="bg-gradient-to-r from-[#0b1329] via-[#0f243a] to-[#134e4a] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-teal-400 text-slate-950 font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                <HeartHandshake size={13} />
                {isYankes
                  ? 'Bidang Pelayanan Kesehatan'
                  : isDinsos
                  ? 'Dinas Sosial Kab. Pamekasan'
                  : isRSUD
                  ? 'Rumah Sakit Umum Daerah'
                  : isPuskesmas
                  ? 'Fasilitas Pelayanan Kesehatan'
                  : isDukcapil
                  ? 'Dinas Kependudukan & Pencatatan Sipil'
                  : 'Pemerintah Kabupaten Pamekasan'}
              </span>
              <span className="text-teal-200 text-xs font-semibold">
                {isDukcapil
                  ? 'Penanganan & Konsolidasi NIK SIAK'
                  : isDinsos
                  ? 'Jalur Desil 1–5 PBPU BP'
                  : isRSUD
                  ? 'Jalur Pasien RSUD & Kondisi Khusus'
                  : isPuskesmas
                  ? 'Jalur Kondisi Khusus & SKTM'
                  : 'Dinas Kesehatan Kab. Pamekasan'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isYankes
                ? 'Pusat Verifikasi, Dashboard & Rekap PBPU BP'
                : isDukcapil
                ? 'Pemeriksaan & Tindak Lanjut NIK PBPU BP'
                : isDinsos
                ? 'Pendaftaran PBPU BP — Jalur Dinas Sosial'
                : isRSUD
                ? 'Pendaftaran PBPU BP — Jalur RSUD'
                : isPuskesmas
                ? 'Pendaftaran PBPU BP — Jalur Puskesmas'
                : 'Pendaftaran & Verifikasi PBPU BP'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
              {isYankes
                ? 'Pusat operasional verifikasi usulan kepesertaan PBPU BP dari Puskesmas & Dinsos, monitoring dasbor indikator dan tren wilayah, serta pengunduhan rekapitulasi data terverifikasi resmi untuk pendaftaran ke BPJS Kesehatan.'
                : isDukcapil
                ? 'Portal pemeriksaan dan pemutakhiran status NIK calon peserta PBPU BP yang dilaporkan bermasalah di database kependudukan. Ubah status menjadi Selesai/Valid setelah perbaikan di SIAK.'
                : isDinsos
                ? 'Pengajuan usulan calon peserta PBPU BP Pemerintah Daerah bagi warga miskin dan rentan pada kelompok Desil 1 sampai 5. Lampirkan dokumen bukti penetapan desil resmi.'
                : isRSUD
                ? 'Pengajuan usulan calon peserta PBPU BP Pemerintah Daerah untuk pasien rawat inap/jalan RSUD berpenyakit kronis/kondisi tertentu (surat DPJP) atau SKTM.'
                : isPuskesmas
                ? 'Pengajuan usulan calon peserta PBPU BP Pemerintah Daerah untuk pasien berpenyakit kronis/kondisi tertentu (surat DPJP) atau SKTM Kepala Desa/Kelurahan.'
                : 'Sistem pendaftaran dan verifikasi terpadu PBPU BP Pemkab Pamekasan terintegrasi antara RSUD, Puskesmas, Dinas Sosial, Dinas Kesehatan, dan Dukcapil.'}
            </p>
          </div>

          <div className="relative z-10 shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-tight">{user.username}</p>
              <p className="text-[11px] text-teal-300 capitalize leading-tight mt-0.5">
                {isYankes
                  ? 'Verifikator Yankes'
                  : isDinsos
                  ? 'Pengusul Dinsos'
                  : isRSUD
                  ? 'Pengusul RSUD'
                  : isPuskesmas
                  ? 'Pengusul Puskesmas'
                  : isDukcapil
                  ? 'Pemeriksa NIK Dukcapil'
                  : user.role}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-500/30 flex items-center justify-center font-black text-teal-200 text-sm border border-teal-400/30">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* STRIP RINGKASAN KPI YANKES & ADMIN */}
        {isVerifier && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => handleTabChange('verifikasi')}
              className={`text-left p-4 rounded-2xl bg-white border transition-all shadow-sm hover:shadow-md cursor-pointer ${
                activeTab === 'verifikasi'
                  ? 'border-teal-600 ring-2 ring-teal-500/20'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Masuk</span>
                <FileText size={16} className="text-slate-400" />
              </div>
              <p className="text-2xl font-black text-slate-800 tracking-tight mt-1">{stats.total}</p>
              <p className="text-[10px] text-slate-400">Seluruh pendaftaran</p>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('verifikasi')}
              className={`text-left p-4 rounded-2xl bg-amber-50/70 border transition-all shadow-sm hover:shadow-md cursor-pointer ${
                activeTab === 'verifikasi'
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-amber-200/80 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Menunggu Telaah</span>
                <Clock size={16} className="text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-900 tracking-tight mt-1">{stats.menunggu}</p>
              <p className="text-[10px] text-amber-700">Antrean keputusan Yankes</p>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('rekap')}
              className={`text-left p-4 rounded-2xl bg-emerald-50/70 border transition-all shadow-sm hover:shadow-md cursor-pointer ${
                activeTab === 'rekap'
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                  : 'border-emerald-200/80 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Terverifikasi</span>
                <FileSpreadsheet size={16} className="text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-900 tracking-tight mt-1">{stats.terverifikasi}</p>
              <p className="text-[10px] text-emerald-700">Siap diekspor ke BPJS</p>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('dashboard')}
              className={`text-left p-4 rounded-2xl bg-teal-50/70 border transition-all shadow-sm hover:shadow-md cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-teal-600 ring-2 ring-teal-500/20'
                  : 'border-teal-200/80 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between text-teal-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">Dashboard & Tren</span>
                <BarChart3 size={16} className="text-teal-600" />
              </div>
              <p className="text-lg font-black text-teal-950 tracking-tight mt-1.5">
                {stats.jalurPuskesmas} <span className="text-xs font-semibold text-slate-500">PKM</span> / {stats.jalurRSUD || 0} <span className="text-xs font-semibold text-purple-600">RS</span> / {stats.jalurDinsos} <span className="text-xs font-semibold text-slate-500">DS</span>
              </p>
              <p className="text-[10px] text-teal-700">Grafik & distribusi wilayah</p>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('dukcapil')}
              className={`text-left p-4 rounded-2xl bg-rose-50/70 border transition-all shadow-sm hover:shadow-md cursor-pointer ${
                activeTab === 'dukcapil'
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-rose-200/80 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-[11px] font-bold uppercase tracking-wider">NIK Bermasalah</span>
                <AlertCircle size={16} className="text-rose-600" />
              </div>
              <p className="text-2xl font-black text-rose-900 tracking-tight mt-1">{stats.nikBermasalah}</p>
              <p className="text-[10px] text-rose-700">Antrean koordinasi Dukcapil</p>
            </button>
          </div>
        )}

        {/* TABS NAVIGATION PERSONA-BASED */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-sm inline-flex h-auto gap-1">
              
              {/* === VERIFIKATOR YANKES & ADMIN === */}
              {isVerifier ? (
                <>
                  {/* TAB 1: VERIFIKASI USULAN */}
                  <TabsTrigger
                    value="verifikasi"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <ShieldCheck size={16} />
                    <span>Verifikasi Usulan</span>
                    {stats.menunggu > 0 && (
                      <Badge
                        className="ml-1 bg-amber-400 text-slate-900 font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                      >
                        {stats.menunggu}
                      </Badge>
                    )}
                  </TabsTrigger>

                  {/* TAB 2: DASHBOARD & TREN */}
                  <TabsTrigger
                    value="dashboard"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <BarChart3 size={16} />
                    <span>Dashboard & Tren</span>
                  </TabsTrigger>

                  {/* TAB 3: REKAP TERVERIFIKASI & EKSPOR */}
                  <TabsTrigger
                    value="rekap"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <FileSpreadsheet size={16} />
                    <span>Rekap Terverifikasi</span>
                    {stats.terverifikasi > 0 && (
                      <Badge
                        className="ml-1 bg-emerald-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                      >
                        {stats.terverifikasi}
                      </Badge>
                    )}
                  </TabsTrigger>

                  {/* TAB 4: ANTREAN NIK DUKCAPIL */}
                  <TabsTrigger
                    value="dukcapil"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <AlertCircle size={16} />
                    <span>Antrean NIK Dukcapil</span>
                    {stats.nikBermasalah > 0 && (
                      <Badge
                        className="ml-1 bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                      >
                        {stats.nikBermasalah}
                      </Badge>
                    )}
                  </TabsTrigger>

                  {/* TAB 5: PENGAJUAN BARU (OPSIONAL) */}
                  <TabsTrigger
                    value="form"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <FilePlus size={16} />
                    <span>{editingSubmission ? 'Perbaikan Usulan' : 'Input Pengajuan Baru'}</span>
                    {editingSubmission && (
                      <Badge className="ml-1 bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0 h-4">
                        Revisi
                      </Badge>
                    )}
                  </TabsTrigger>
                </>
              ) : isPengusul ? (
                <>
                  {/* === PENGUSUL: PUSKESMAS & DINSOS === */}
                  <TabsTrigger
                    value="form"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <FilePlus size={16} />
                    <span>{editingSubmission ? 'Perbaikan Usulan' : 'Form Pengajuan Baru'}</span>
                    {editingSubmission && (
                      <Badge className="ml-1 bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0 h-4">
                        Revisi
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="riwayat"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <History size={16} />
                    <span>Riwayat Usulan Unit Saya</span>
                    <Badge
                      className="ml-1 bg-slate-100 text-slate-700 font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                    >
                      {unitSubmissions.length}
                    </Badge>
                  </TabsTrigger>

                  <TabsTrigger
                    value="dukcapil"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <AlertCircle size={16} />
                    <span>Status NIK Bermasalah</span>
                    {unitNikBermasalahCount > 0 && (
                      <Badge
                        className="ml-1 bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                      >
                        {unitNikBermasalahCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                </>
              ) : (
                <>
                  {/* === PEMERIKSA NIK DUKCAPIL === */}
                  <TabsTrigger
                    value="dukcapil"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <AlertCircle size={16} />
                    <span>Antrean NIK Bermasalah</span>
                    {stats.nikBermasalah > 0 && (
                      <Badge
                        className="ml-1 bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                      >
                        {stats.nikBermasalah}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="dashboard"
                    className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                  >
                    <BarChart3 size={16} />
                    <span>Pantauan Status NIK</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* === CONTENT 1: VERIFIKASI USULAN (Yankes & Admin) === */}
          {isVerifier && (
            <TabsContent value="verifikasi" className="mt-0 focus-visible:outline-none">
              <PBPUVerificationPanel
                submissions={yankesVerificationSubmissions}
                user={user}
                onVerify={verifySubmission}
                isLoading={dataLoading}
                isReadOnly={false}
              />
            </TabsContent>
          )}

          {/* === CONTENT 2: DASHBOARD STATISTIK & TREN (Yankes, Admin, & Dukcapil) === */}
          {!isPengusul && (
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
              <PBPUDashboardStats submissions={submissions} stats={stats} />
            </TabsContent>
          )}

          {/* === CONTENT 3: REKAP TERVERIFIKASI & EKSPOR (Yankes & Admin) === */}
          {isVerifier && (
            <TabsContent value="rekap" className="mt-0 focus-visible:outline-none">
              <PBPURecapExport submissions={submissions} />
            </TabsContent>
          )}

          {/* === CONTENT 4: TINDAK LANJUT NIK DUKCAPIL === */}
          <TabsContent value="dukcapil" className="mt-0 focus-visible:outline-none">
            <PBPUNikFollowUpPanel
              submissions={isPengusul ? unitSubmissions : submissions}
              user={user}
              onUpdateNik={updateNikStatus}
              canUpdateNik={isDukcapil}
            />
          </TabsContent>

          {/* === CONTENT 5: FORM PENGAJUAN BARU / PERBAIKAN BERKAS === */}
          {!isDukcapil && (
            <TabsContent value="form" className="mt-0 focus-visible:outline-none">
              <PBPUSubmissionForm
                user={user}
                onSubmit={submitNewApplication}
                editSubmission={editingSubmission}
                onCancelEdit={() => setEditingSubmission(null)}
                onResubmit={resubmitApplication}
                isSubmitting={isSubmitting}
                onSuccessNavigate={() => {
                  setEditingSubmission(null);
                  handleTabChange(isPengusul ? 'riwayat' : 'verifikasi');
                }}
              />
            </TabsContent>
          )}

          {/* === CONTENT 6: RIWAYAT USULAN UNIT SAYA (Pengusul Puskesmas & Dinsos) === */}
          {isPengusul && (
            <TabsContent value="riwayat" className="mt-0 focus-visible:outline-none">
              <PBPUVerificationPanel
                submissions={unitSubmissions}
                user={user}
                onVerify={verifySubmission}
                isLoading={dataLoading}
                isReadOnly={true}
                panelTitle="Riwayat Usulan Unit Saya"
                panelSubtitle="Daftar seluruh usulan calon peserta PBPU BP yang diajukan oleh unit Anda beserta status telaah dari Bidang Yankes Dinas Kesehatan."
                onEditSubmission={(sub) => {
                  setEditingSubmission(sub);
                  handleTabChange('form');
                }}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default PBPUPage;
