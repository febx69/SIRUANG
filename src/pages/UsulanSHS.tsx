// src/pages/UsulanSHS.tsx
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import Header from "@/components/Layout/Header";
import { useSHS } from "@/hooks/useSHS";
import { SHSPeriodBanner } from "@/components/SHS/SHSPeriodBanner";
import { SHSStatsCards } from "@/components/SHS/SHSStatsCards";
import { SHSItemList } from "@/components/SHS/SHSItemList";
import { SHSItemForm } from "@/components/SHS/SHSItemForm";
import { SHSImportModal } from "@/components/SHS/SHSImportModal";
import { SHSVerificationPanel } from "@/components/SHS/SHSVerificationPanel";
import { SHSAdminPeriodAndMaster } from "@/components/SHS/SHSAdminPeriodAndMaster";
import { SHSRecapExport } from "@/components/SHS/SHSRecapExport";
import { SHSItem } from "@/types/shs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileSpreadsheet,
  PlusCircle,
  Upload,
  ShieldCheck,
  Settings,
  FileText,
  BarChart3,
  Calendar,
  Building2,
} from "lucide-react";
import { inferUnitFromUser } from "@/lib/shsVerificationHelper";

type MainTab = "list" | "form" | "import" | "verification" | "admin" | "recap";

const UsulanSHS = () => {
  const { user, logout, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  const {
    items,
    periods,
    activePeriod,
    periodStatus,
    isLoading: shsLoading,
    masterKategori,
    masterRekening,
    masterSatuan,
    masterKelompok,
    recapStats,
    fetchItems,
    createItem,
    createBatchItems,
    importItems,
    updateItem,
    deleteItem,
    submitDrafts,
    verifyItem,
    bulkApprove,
    savePeriod,
    updateMasterKategori,
    updateMasterRekening,
    updateMasterSatuan,
    updateMasterKelompok,
    isDatabaseMasterConnected,
    isSyncingMasters,
    fetchMasterData,
    addMasterKategori,
    deleteMasterKategori,
    addMasterRekening,
    deleteMasterRekening,
    syncAllMastersToDatabase,
  } = useSHS(user);

  const isPengurusBarang =
    user?.role === "pengurus_barang" ||
    (user?.username || "").toLowerCase().startsWith("pengurus");
  const isAdmin = user?.role === "admin";
  const isVerifikator = isAdmin || isPengurusBarang;
  const isPeriodOpen = periodStatus === "dibuka";

  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    if (isPengurusBarang) return "verification";
    return "list";
  });
  const [editingItem, setEditingItem] = useState<SHSItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const handleEditItem = (item: SHSItem) => {
    setEditingItem(item);
    setActiveTab("form");
  };

  const handleFormSuccess = () => {
    setEditingItem(null);
    setActiveTab("list");
    fetchItems(true);
  };

  const handleFormCancel = () => {
    setEditingItem(null);
    setActiveTab("list");
  };

  const handleImportComplete = () => {
    setActiveTab("list");
    fetchItems(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Header user={user} onLogout={logout} />

      <main className="container mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fade-in max-w-[1600px]">
        {/* Navigation & Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 self-start"
          >
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Masuk sebagai:</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 uppercase flex items-center gap-1.5">
              <Building2 size={13} className="text-blue-700" />
              {user.username} ({user.role})
              {user.role === "bidang" && (
                <span className="normal-case font-semibold text-blue-700 bg-white/80 px-1.5 py-0.2 rounded border border-blue-200">
                  {inferUnitFromUser(user.username)}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Banner Periode Pengusulan & Countdown */}
        <SHSPeriodBanner period={activePeriod} status={periodStatus} />

        {/* Kartu Ringkasan Statistik */}
        <SHSStatsCards
          stats={recapStats}
          onFilterStatus={(s) => {
            setStatusFilter(s);
            setActiveTab("list");
          }}
          activeStatusFilter={statusFilter}
        />

        {/* Tab Navigasi Menu SHS */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white p-1.5 rounded-xl shadow-xs">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "list" ? "default" : "ghost"}
            onClick={() => {
              setEditingItem(null);
              setActiveTab("list");
            }}
            className={`gap-2 text-xs font-semibold ${
              activeTab === "list"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet size={15} />
            {user.role === "bidang" ? `Usulan Bidang (${items.length})` : `Daftar Usulan (${items.length})`}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "form" ? "default" : "ghost"}
            onClick={() => {
              setEditingItem(null);
              setActiveTab("form");
            }}
            className={`gap-2 text-xs font-semibold ${
              activeTab === "form"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PlusCircle size={15} />
            {editingItem ? "Edit Usulan" : "Input Usulan Baru"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "import" ? "default" : "ghost"}
            onClick={() => {
              setEditingItem(null);
              setActiveTab("import");
            }}
            className={`gap-2 text-xs font-semibold ${
              activeTab === "import"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload size={15} />
            Import Excel / CSV
          </Button>

          {/* Tab Verifikasi (Untuk Admin atau Verifikator) */}
          {isVerifikator && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === "verification" ? "default" : "ghost"}
              onClick={() => {
                setEditingItem(null);
                setActiveTab("verification");
              }}
              className={`gap-2 text-xs font-semibold ${
                activeTab === "verification"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={15} />
              Verifikasi Usulan
              {recapStats.diajukan > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
                  {recapStats.diajukan}
                </span>
              )}
            </Button>
          )}

          {/* Tab Kelola Periode & Master (Admin Only) */}
          {isAdmin && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === "admin" ? "default" : "ghost"}
              onClick={() => {
                setEditingItem(null);
                setActiveTab("admin");
              }}
              className={`gap-2 text-xs font-semibold ${
                activeTab === "admin"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings size={15} />
              Periode & Master
            </Button>
          )}

          {/* Tab Rekapitulasi & Ekspor */}
          <Button
            type="button"
            size="sm"
            variant={activeTab === "recap" ? "default" : "ghost"}
            onClick={() => {
              setEditingItem(null);
              setActiveTab("recap");
            }}
            className={`gap-2 text-xs font-semibold ${
              activeTab === "recap"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 size={15} />
            Rekap & Ekspor
          </Button>
        </div>

        {/* Tab Content Display with Smooth Transitions */}
        <div key={activeTab} className="animate-enter-from-bottom">
          {activeTab === "list" && (
            <SHSItemList
              user={user}
              items={items}
              isPeriodOpen={isPeriodOpen}
              onEditItem={handleEditItem}
              onDeleteItem={deleteItem}
              onSubmitDrafts={submitDrafts}
              onRefresh={() => fetchItems(true)}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          )}

          {activeTab === "form" && (
            <SHSItemForm
              key={editingItem ? `edit-${editingItem.id}` : "new-shs-form"}
              user={user}
              activePeriod={activePeriod}
              isPeriodOpen={isPeriodOpen}
              masterKategori={masterKategori}
              masterRekening={masterRekening}
              masterSatuan={masterSatuan}
              masterKelompok={masterKelompok}
              editingItem={editingItem}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              createItem={createItem}
              createBatchItems={createBatchItems}
              updateItem={updateItem}
            />
          )}

          {activeTab === "import" && (
            <SHSImportModal
              user={user}
              activePeriod={activePeriod}
              isPeriodOpen={isPeriodOpen}
              masterKategori={masterKategori}
              masterRekening={masterRekening}
              masterSatuan={masterSatuan}
              masterKelompok={masterKelompok}
              onImportComplete={handleImportComplete}
              importItems={importItems}
            />
          )}

          {activeTab === "verification" && isVerifikator && (
            <SHSVerificationPanel
              user={user}
              items={items}
              verifyItem={verifyItem}
              bulkApprove={bulkApprove}
            />
          )}

          {activeTab === "admin" && isAdmin && (
            <SHSAdminPeriodAndMaster
              activePeriod={activePeriod}
              masterKategori={masterKategori}
              masterRekening={masterRekening}
              masterSatuan={masterSatuan}
              masterKelompok={masterKelompok}
              onSavePeriod={savePeriod}
              onUpdateMasterKategori={updateMasterKategori}
              onUpdateMasterRekening={updateMasterRekening}
              onUpdateMasterSatuan={updateMasterSatuan}
              onUpdateMasterKelompok={updateMasterKelompok}
              isDatabaseConnected={isDatabaseMasterConnected}
              isSyncingMasters={isSyncingMasters}
              onAddMasterKategori={addMasterKategori}
              onDeleteMasterKategori={deleteMasterKategori}
              onAddMasterRekening={addMasterRekening}
              onDeleteMasterRekening={deleteMasterRekening}
              onSyncAllMastersToDatabase={syncAllMastersToDatabase}
              onRefreshMasterData={fetchMasterData}
            />
          )}

          {activeTab === "recap" && (
            <SHSRecapExport user={user} items={items} activePeriod={activePeriod} stats={recapStats} />
          )}
        </div>
      </main>
    </div>
  );
};

export default UsulanSHS;
