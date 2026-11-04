// src/pages/PBPUPage.tsx
import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
  FileCheck,
} from 'lucide-react';
import { PBPUVerificationPanel } from '@/components/PBPU/PBPUVerificationPanel';
import { PBPUSubmissionForm } from '@/components/PBPU/PBPUSubmissionForm';
import { PBPUNikFollowUpPanel } from '@/components/PBPU/PBPUNikFollowUpPanel';
import { PBPUDashboardStats } from '@/components/PBPU/PBPUDashboardStats';
import { PBPURecapExport } from '@/components/PBPU/PBPURecapExport';

export const PBPUPage: React.FC = () => {
  const { user, logout, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const {
    submissions,
    isLoading: dataLoading,
    isSubmitting,
    stats,
    submitNewApplication,
    verifySubmission,
    updateNikStatus,
  } = usePBPU(user);

  const uname = (user?.username || '').toLowerCase();
  const isYankes = uname === 'yankes' || uname.includes('yankes');
  const isAdmin = user?.role === 'admin';
  const isPuskesmas = user?.role === 'puskesmas' || uname.startsWith('puskesmas') || uname.startsWith('pkm_');
  const isDinsos = user?.role === 'dinsos' || uname === 'dinsos';
  const isDukcapil = user?.role === 'dukcapil' || uname === 'dukcapil';
  const isPengusul = isPuskesmas || isDinsos;
  const isVerifier = isYankes || isAdmin;

  // Default active tab based on role:
  // - Verifikator (Yankes & Admin): 'verifikasi'
  // - Pengusul (Puskesmas & Dinsos): 'form'
  // - Pemeriksa NIK (Dukcapil): 'dukcapil'
  const defaultTab = isDukcapil ? 'dukcapil' : isPengusul ? 'form' : 'verifikasi';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Filter usulan unit untuk Pengusul (Puskesmas & Dinsos)
  const unitSubmissions = React.useMemo(() => {
    if (!isPengusul) return submissions;
    if (isDinsos) {
      return submissions.filter(
        (s) => s.submission_channel === 'DINSOS' || s.submitter_unit.toLowerCase().includes('sosial')
      );
    }
    const cleanPkm = uname.replace(/puskesmas_?|pkm_?/i, '').toLowerCase();
    return submissions.filter((s) => {
      const unitLower = s.submitter_unit.toLowerCase();
      return (
        unitLower.includes(cleanPkm) ||
        (s.submitter_username && s.submitter_username.toLowerCase() === uname)
      );
    });
  }, [submissions, isPengusul, isDinsos, uname]);

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
                  : isPuskesmas
                  ? 'Jalur Kondisi Khusus & SKTM'
                  : 'Dinas Kesehatan Kab. Pamekasan'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isYankes
                ? 'Pusat Verifikasi Pendaftaran PBPU BP'
                : isDukcapil
                ? 'Pemeriksaan & Tindak Lanjut NIK PBPU BP'
                : isDinsos
                ? 'Pendaftaran PBPU BP — Jalur Dinas Sosial'
                : isPuskesmas
                ? 'Pendaftaran PBPU BP — Jalur Puskesmas'
                : 'Pendaftaran & Verifikasi PBPU BP'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
              {isYankes
                ? 'Pusat verifikasi dan telaah berkas calon peserta PBPU BP dari Puskesmas & Dinas Sosial. Putuskan persetujuan (Terima / Tolak dengan alasan wajib) dan koordinasikan data kependudukan dengan Dukcapil.'
                : isDukcapil
                ? 'Portal pemeriksaan dan pemutakhiran status NIK calon peserta PBPU BP yang dilaporkan bermasalah di database kependudukan. Ubah status menjadi Selesai/Valid setelah perbaikan di SIAK.'
                : isDinsos
                ? 'Pengajuan usulan calon peserta PBPU BP Pemerintah Daerah bagi warga miskin dan rentan pada kelompok Desil 1 sampai 5. Lampirkan dokumen bukti penetapan desil resmi.'
                : isPuskesmas
                ? 'Pengajuan usulan calon peserta PBPU BP Pemerintah Daerah untuk pasien berpenyakit kronis/kondisi tertentu (surat DPJP) atau SKTM Kepala Desa/Kelurahan.'
                : 'Sistem pendaftaran dan verifikasi terpadu PBPU BP Pemkab Pamekasan terintegrasi antara Puskesmas, Dinas Sosial, Dinas Kesehatan, dan Dukcapil.'}
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

        {/* TABS NAVIGATION PERSONA-BASED */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-sm inline-flex h-auto gap-1">
              
              {/* === TAB 1: VERIFIKASI (Khusus Verifikator Yankes & Admin) === */}
              {isVerifier && (
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
              )}

              {/* === TAB 2: FORM PENGAJUAN BARU (Pengusul & Verifikator) === */}
              {!isDukcapil && (
                <TabsTrigger
                  value="form"
                  className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                >
                  <FilePlus size={16} />
                  <span>Pengajuan Baru</span>
                </TabsTrigger>
              )}

              {/* === TAB 3: RIWAYAT USULAN UNIT SAYA (Khusus Pengusul: Puskesmas & Dinsos) === */}
              {isPengusul && (
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
              )}

              {/* === TAB 4: NIK DUKCAPIL === */}
              {/* Dukcapil: Tab utama pemeriksaan NIK; Yankes: Tab antrean NIK; Pengusul: Pantauan NIK usulan */}
              <TabsTrigger
                value="dukcapil"
                className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
              >
                <AlertCircle size={16} />
                <span>
                  {isDukcapil
                    ? 'Antrean NIK Bermasalah'
                    : isPengusul
                    ? 'Status NIK Bermasalah Unit'
                    : 'Antrean NIK Dukcapil'}
                </span>
                {isPengusul ? (
                  unitNikBermasalahCount > 0 && (
                    <Badge
                      className="ml-1 bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                    >
                      {unitNikBermasalahCount}
                    </Badge>
                  )
                ) : (
                  stats.nikBermasalah > 0 && (
                    <Badge
                      className="ml-1 bg-rose-500 text-white font-extrabold text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full"
                    >
                      {stats.nikBermasalah}
                    </Badge>
                  )
                )}
              </TabsTrigger>

              {/* === TAB 5: DASHBOARD & TREN (Yankes, Admin, & Dukcapil) === */}
              {!isPengusul && (
                <TabsTrigger
                  value="dashboard"
                  className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
                >
                  <BarChart3 size={16} />
                  <span>{isDukcapil ? 'Pantauan NIK' : 'Dashboard & Tren'}</span>
                </TabsTrigger>
              )}

              {/* === TAB 6: REKAP TERVERIFIKASI & EKSPOR (Khusus Verifikator Yankes & Admin) === */}
              {isVerifier && (
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
              )}
            </TabsList>
          </div>

          {/* === CONTENT 1: VERIFIKASI USULAN (Yankes & Admin) === */}
          {isVerifier && (
            <TabsContent value="verifikasi" className="mt-0 focus-visible:outline-none">
              <PBPUVerificationPanel
                submissions={submissions}
                user={user}
                onVerify={verifySubmission}
                isLoading={dataLoading}
                isReadOnly={false}
              />
            </TabsContent>
          )}

          {/* === CONTENT 2: FORM PENGAJUAN BARU === */}
          {!isDukcapil && (
            <TabsContent value="form" className="mt-0 focus-visible:outline-none">
              <PBPUSubmissionForm
                user={user}
                onSubmit={submitNewApplication}
                isSubmitting={isSubmitting}
                onSuccessNavigate={() => setActiveTab(isPengusul ? 'riwayat' : 'verifikasi')}
              />
            </TabsContent>
          )}

          {/* === CONTENT 3: RIWAYAT USULAN UNIT SAYA (Pengusul Puskesmas & Dinsos) === */}
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
              />
            </TabsContent>
          )}

          {/* === CONTENT 4: TINDAK LANJUT NIK DUKCAPIL === */}
          <TabsContent value="dukcapil" className="mt-0 focus-visible:outline-none">
            <PBPUNikFollowUpPanel
              submissions={isPengusul ? unitSubmissions : submissions}
              user={user}
              onUpdateNik={updateNikStatus}
              canUpdateNik={isDukcapil || isVerifier}
            />
          </TabsContent>

          {/* === CONTENT 5: DASHBOARD STATISTIK === */}
          {!isPengusul && (
            <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
              <PBPUDashboardStats submissions={submissions} stats={stats} />
            </TabsContent>
          )}

          {/* === CONTENT 6: REKAP TERVERIFIKASI & EKSPOR === */}
          {isVerifier && (
            <TabsContent value="rekap" className="mt-0 focus-visible:outline-none">
              <PBPURecapExport submissions={submissions} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default PBPUPage;
