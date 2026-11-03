// src/components/Cleanliness/CleanlinessPanel.tsx
import { useState } from "react";
import { User, isUserOB } from "@/hooks/useSupabaseAuth";
import { useCleanliness } from "@/hooks/useCleanliness";
import { DailyReportSection } from "./DailyReportSection";
import { ComplaintSection } from "./ComplaintSection";
import { AdminCleanlinessSection } from "./AdminCleanlinessSection";
import { PhotoLightboxModal, LightboxPhotoInfo } from "./PhotoLightboxModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  Clock,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CleanlinessPanelProps {
  user: User;
}

export const CleanlinessPanel = ({ user }: CleanlinessPanelProps) => {
  const isOB = isUserOB(user);
  const isAdmin = user.role === 'admin';

  const {
    reports,
    complaints,
    isLoading,
    refreshAll,
    addReport,
    addComplaint,
    updateComplaintStatus,
    deleteReport,
    deleteComplaint,
    bulkCleanByPeriod,
    floorStatusToday,
    todayReportsCount,
    pendingComplaintsCount
  } = useCleanliness(user);

  const [activePhoto, setActivePhoto] = useState<LightboxPhotoInfo | null>(null);
  const [activeTab, setActiveTab] = useState<string>("reports");

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Statistik Cepat */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <Sparkles size={22} />
              </span>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                  Monev Kebersihan
                  {isOB && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">
                      Petugas OB
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Monitoring kebersihan Lantai 1, 2, 3 & Layanan pengaduan kebersihan Dinas Kesehatan Pamekasan
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Tombol Refresh Data */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={isLoading}
              className="text-xs h-8 text-slate-600 gap-1.5"
            >
              <RotateCcw size={13} className={isLoading ? "animate-spin" : ""} />
              Segarkan
            </Button>

            {/* Quick Stat Pill 1 */}
            <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <div className="text-left">
                <div className="text-[10px] text-emerald-700 font-medium leading-none">Laporan Hari Ini</div>
                <div className="text-sm font-bold text-emerald-900 leading-tight">{todayReportsCount}</div>
              </div>
            </div>

            {/* Quick Stat Pill 2 */}
            <div className="bg-amber-50 border border-amber-200/70 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <div className="text-left">
                <div className="text-[10px] text-amber-700 font-medium leading-none">Pengaduan Aktif</div>
                <div className="text-sm font-bold text-amber-900 leading-tight">{pendingComplaintsCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigasi Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100/90 p-1 rounded-xl h-auto flex flex-wrap gap-1 border border-slate-200/60 max-w-fit">
          <TabsTrigger
            value="reports"
            className="text-xs font-semibold py-2 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <Sparkles size={14} /> Laporan Harian OB (Lt 1, 2, 3)
          </TabsTrigger>

          <TabsTrigger
            value="complaints"
            className="text-xs font-semibold py-2 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm flex items-center gap-2"
          >
            <AlertTriangle size={14} />
            Pengaduan Kebersihan
            {pendingComplaintsCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingComplaintsCount}
              </span>
            )}
          </TabsTrigger>

          {isAdmin && (
            <TabsTrigger
              value="admin"
              className="text-xs font-semibold py-2 px-4 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <FileSpreadsheet size={14} /> Rekap & Arsip (Admin)
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Laporan Harian OB */}
        <TabsContent value="reports" className="m-0 focus-visible:outline-none">
          <DailyReportSection
            user={user}
            reports={reports}
            isLoading={isLoading}
            floorStatusToday={floorStatusToday}
            onAddReport={addReport}
            onDeleteReport={deleteReport}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            isOBUser={isOB}
          />
        </TabsContent>

        {/* Tab 2: Pengaduan Kebersihan */}
        <TabsContent value="complaints" className="m-0 focus-visible:outline-none">
          <ComplaintSection
            user={user}
            complaints={complaints}
            isLoading={isLoading}
            onAddComplaint={addComplaint}
            onUpdateStatus={updateComplaintStatus}
            onDeleteComplaint={deleteComplaint}
            onOpenPhoto={(photo) => setActivePhoto(photo)}
            isOBUser={isOB}
          />
        </TabsContent>

        {/* Tab 3: Admin Rekap & Pembersihan */}
        {isAdmin && (
          <TabsContent value="admin" className="m-0 focus-visible:outline-none">
            <AdminCleanlinessSection
              reports={reports}
              complaints={complaints}
              onBulkClean={bulkCleanByPeriod}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Lightbox Zoom Modal */}
      <PhotoLightboxModal
        photo={activePhoto}
        onClose={() => setActivePhoto(null)}
      />
    </div>
  );
};
