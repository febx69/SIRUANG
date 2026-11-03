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

  const isYankesOrAdmin = user?.username === 'yankes' || user?.role === 'admin';
  const isPuskesmas = user?.role === 'puskesmas' || user?.username.startsWith('puskesmas');

  // Default Tab: Jika login sebagai Yankes/Admin -> tab 'verifikasi'; jika Puskesmas -> tab 'form'
  const [activeTab, setActiveTab] = useState<string>(
    isPuskesmas ? 'form' : 'verifikasi'
  );

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

  // Khusus Akun Bidang Yankes dan Admin: Jika selain itu mencoba membuka, langsung lempar kembali ke Beranda
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
            <span className="text-xs text-slate-500">Masuk sebagai:</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 border border-teal-200 uppercase flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-teal-700" />
              {user.username} ({user.username === 'yankes' ? 'Bidang Yankes' : user.role})
            </span>
          </div>
        </div>

        {/* HEADER SECTION */}
        <div className="bg-gradient-to-r from-[#0b1329] via-[#0f243a] to-[#134e4a] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-teal-400 text-slate-950 font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                <HeartHandshake size={13} />
                Bidang Pelayanan Kesehatan
              </span>
              <span className="text-teal-200 text-xs font-semibold">
                Dinas Kesehatan Kab. Pamekasan
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pendaftaran PBPU BP
            </h1>

            <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
              Sistem pendaftaran dan verifikasi usulan kepesertaan Pekerja Bukan Penerima Upah dan Bukan Pekerja (PBPU BP) yang didaftarkan Pemerintah Daerah, terintegrasi antara Puskesmas, Dinas Sosial, Dinas Kesehatan, dan Dukcapil.
            </p>
          </div>

          <div className="relative z-10 shrink-0 flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-tight">{user.username}</p>
              <p className="text-[11px] text-teal-300 capitalize leading-tight mt-0.5">
                {user.username === 'yankes' ? 'Verifikator Yankes' : user.role}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-500/30 flex items-center justify-center font-black text-teal-200 text-sm border border-teal-400/30">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-white border border-slate-200/80 p-1.5 rounded-2xl shadow-sm inline-flex h-auto gap-1">
              {/* Tab 1: Verifikasi Usulan (Yankes & Admin) */}
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

              {/* Tab 2: Pengajuan Baru */}
              <TabsTrigger
                value="form"
                className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
              >
                <FilePlus size={16} />
                <span>Pengajuan Baru</span>
              </TabsTrigger>

              {/* Tab 3: Antrean NIK Dukcapil */}
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

              {/* Tab 4: Dashboard & Analisis Tren */}
              <TabsTrigger
                value="dashboard"
                className="rounded-xl px-4 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-teal-700 data-[state=active]:text-white transition-all"
              >
                <BarChart3 size={16} />
                <span>Dashboard & Tren</span>
              </TabsTrigger>

              {/* Tab 5: Rekap Terverifikasi & Ekspor */}
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
            </TabsList>
          </div>

          {/* TAB CONTENT 1: VERIFIKASI */}
          <TabsContent value="verifikasi" className="mt-0 focus-visible:outline-none">
            <PBPUVerificationPanel
              submissions={submissions}
              user={user}
              onVerify={verifySubmission}
              isLoading={dataLoading}
            />
          </TabsContent>

          {/* TAB CONTENT 2: FORM PENGAJUAN */}
          <TabsContent value="form" className="mt-0 focus-visible:outline-none">
            <PBPUSubmissionForm
              user={user}
              onSubmit={submitNewApplication}
              isSubmitting={isSubmitting}
              onSuccessNavigate={() => setActiveTab('verifikasi')}
            />
          </TabsContent>

          {/* TAB CONTENT 3: NIK DUKCAPIL */}
          <TabsContent value="dukcapil" className="mt-0 focus-visible:outline-none">
            <PBPUNikFollowUpPanel
              submissions={submissions}
              user={user}
              onUpdateNik={updateNikStatus}
            />
          </TabsContent>

          {/* TAB CONTENT 4: DASHBOARD STATS */}
          <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
            <PBPUDashboardStats submissions={submissions} stats={stats} />
          </TabsContent>

          {/* TAB CONTENT 5: REKAP TERVERIFIKASI & EKSPOR */}
          <TabsContent value="rekap" className="mt-0 focus-visible:outline-none">
            <PBPURecapExport submissions={submissions} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PBPUPage;

