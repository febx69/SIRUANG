// src/pages/AdminPanel.tsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSupabaseAuth, resolveRole, UserRole } from "@/hooks/useSupabaseAuth";
import { useUserManagement, ManagedUser } from "@/hooks/useUserManagement";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import { useFacilities } from "@/hooks/useFacilities";
import { useCarBookings } from "@/hooks/useCarBookings";
import { useZoomBookings } from "@/hooks/useZoomBookings";
import { useCleanliness } from "@/hooks/useCleanliness";
import { useITTickets } from "@/hooks/useITTickets";
import { useSHS } from "@/hooks/useSHS";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Layout/Header";
import FacilityManagementPanel from "@/components/Admin/FacilityManagementPanel";
import { SHSVerificationPanel } from "@/components/SHS/SHSVerificationPanel";
import { SHSAdminPeriodAndMaster } from "@/components/SHS/SHSAdminPeriodAndMaster";
import { SHSRecapExport } from "@/components/SHS/SHSRecapExport";
import { DAFTAR_UNIT_DINKES_PUSKESMAS } from "@/lib/shsMasterData";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";

import {
  ShieldAlert,
  Users,
  Building2,
  Car,
  Video,
  Sparkles,
  Laptop,
  FileSpreadsheet,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Layers,
  Settings,
  ShieldCheck,
  Building,
  User,
  AlertCircle,
  FileDown,
  CornerDownRight,
  Send,
  Sliders,
  ChevronRight,
  Info
} from "lucide-react";

// Filter role config
const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: any; desc: string }> = {
  admin: {
    label: "Admin",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: ShieldCheck,
    desc: "Akses penuh seluruh modul sistem & Panel Admin",
  },
  puskesmas: {
    label: "Puskesmas",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Building,
    desc: "Akses terkunci KHUSUS modul Usulan SHS",
  },
  bidang: {
    label: "Bidang",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Building2,
    desc: "Akses peminjaman & usulan internal bidang",
  },
  ob: {
    label: "Petugas OB",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Sparkles,
    desc: "Akses khusus monev kebersihan & tindak lanjut",
  },
  pengurus_barang: {
    label: "Pengurus Barang",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: ShieldCheck,
    desc: "Verifikator SHS, akses website dikhususkan ke Usulan SHS",
  },
  user: {
    label: "Staf",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: User,
    desc: "Pengguna umum pegawai dinas",
  },
};

// Daftar Puskesmas khusus di Kabupaten Pamekasan untuk preset pembuatan akun cepat
const PUSKESMAS_LIST = DAFTAR_UNIT_DINKES_PUSKESMAS.filter(
  (u) => u.startsWith("Puskesmas") || u.startsWith("Labkesda") || u.startsWith("Instalasi")
);

type AdminTab =
  | "overview"
  | "users"
  | "ruangan"
  | "mobil"
  | "zoom"
  | "kebersihan"
  | "it"
  | "shs"
  | "aspirasi";

const AdminPanel = () => {
  const { user, logout, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // User Management hook
  const {
    users,
    isLoading: usersLoading,
    addUser,
    updateUser,
    deleteUser,
    refetch: refetchUsers,
  } = useUserManagement();

  // Room bookings hook
  const {
    bookings: roomBookings,
    isLoading: roomLoading,
    deleteBooking: deleteRoomBooking,
    exportToExcel: exportRoomExcel,
    bulkDeleteByPeriod: bulkDeleteRoom,
  } = useSupabaseBookings(user);

  // Car bookings hook
  const {
    bookings: carBookings,
    isLoading: carLoading,
    updateBookingStatus: updateCarStatus,
    deleteBooking: deleteCarBooking,
    isCarInUse,
    getCurrentBooking: getCurrentCarBooking,
  } = useCarBookings(user);

  // Zoom hook
  const {
    zoomBookings,
    isLoading: zoomLoading,
    replyZoomBooking,
    deleteZoomBooking,
  } = useZoomBookings(user);

  // Cleanliness hook
  const {
    reports: cleanReports,
    complaints: cleanComplaints,
    isLoading: cleanLoading,
    updateComplaintStatus,
    deleteReport: deleteCleanReport,
    deleteComplaint: deleteCleanComplaint,
  } = useCleanliness(user);

  // IT Tickets hook
  const {
    tickets: itTickets,
    isLoading: itLoading,
    updateTicket: updateITTicket,
    deleteTicket: deleteITTicket,
    clearAllTickets,
  } = useITTickets(user);

  // SHS Hook
  const {
    items: shsItems,
    periods: shsPeriods,
    activePeriod: activeSHSPeriod,
    periodStatus: shsPeriodStatus,
    masterKategori,
    masterRekening,
    masterSatuan,
    masterKelompok,
    recapStats: shsStats,
    savePeriod: saveSHSPeriod,
    verifyItem: verifySHSItem,
    bulkApprove: bulkApproveSHS,
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

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [replyingFeedbackId, setReplyingFeedbackId] = useState<number | null>(null);
  const [feedbackReplyText, setFeedbackReplyText] = useState("");

  const fetchFeedbacks = async () => {
    setFeedbackLoading(true);
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setFeedbacks(data);
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleReplyFeedback = async (id: number) => {
    if (!feedbackReplyText.trim()) return;
    const { error } = await supabase
      .from("feedbacks")
      .update({ admin_reply: feedbackReplyText })
      .eq("id", id);
    if (!error) {
      toast({ title: "Tersimpan", description: "Balasan berhasil dikirim." });
      setReplyingFeedbackId(null);
      setFeedbackReplyText("");
      fetchFeedbacks();
    } else {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    const { error } = await supabase.from("feedbacks").delete().eq("id", id);
    if (!error) {
      toast({ title: "Terhapus", description: "Pesan berhasil dihapus." });
      fetchFeedbacks();
    }
  };

  // State User Management Filter & Forms
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userSearch, setUserSearch] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editUserTarget, setEditUserTarget] = useState<ManagedUser | null>(null);

  // Form Tambah User
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    role: "puskesmas" as UserRole,
    is_ob: false,
  });

  // Form Edit User
  const [editUserForm, setEditUserForm] = useState<Partial<ManagedUser>>({});
  const [showAddPwd, setShowAddPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);
  const [isUserSaving, setIsUserSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // State Zoom Reply Modal
  const [replyZoomTarget, setReplyZoomTarget] = useState<any | null>(null);
  const [zoomForm, setZoomForm] = useState({
    link: "",
    meetingId: "",
    passcode: "",
    note: "",
    status: "approved" as "approved" | "rejected",
  });

  // State Car Note Modal
  const [carActionTarget, setCarActionTarget] = useState<any | null>(null);
  const [carActionStatus, setCarActionStatus] = useState<"approved" | "rejected">("approved");
  const [carAdminNote, setCarAdminNote] = useState("");

  // Subtab Ruangan
  const [ruanganSubTab, setRuanganSubTab] = useState<"bookings" | "facilities">("bookings");
  const [roomFilterRoom, setRoomFilterRoom] = useState<string>("all");
  const [roomSearch, setRoomSearch] = useState("");

  // Subtab Kebersihan
  const [kebersihanSubTab, setKebersihanSubTab] = useState<"reports" | "complaints">("complaints");

  // Subtab SHS
  const [shsSubTab, setShsSubTab] = useState<"verification" | "period" | "recap">("verification");

  // Protection Guard: Halaman ini HANYA untuk Administrator!
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchSearch =
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.role && u.role.toLowerCase().includes(userSearch.toLowerCase()));
    return matchRole && matchSearch;
  });

  // Count stats by role
  const userRoleStats = {
    total: users.length,
    puskesmas: users.filter((u) => u.role === "puskesmas").length,
    pengurus: users.filter((u) => u.role === "pengurus_barang").length,
    bidang: users.filter((u) => u.role === "bidang").length,
    ob: users.filter((u) => u.role === "ob" || u.is_ob).length,
    admin: users.filter((u) => u.role === "admin").length,
    user: users.filter((u) => u.role === "user" && !u.is_ob).length,
  };

  const BIDANG_LIST = [
    { label: "Bidang Kesehatan Masyarakat (Kesmas)", username: "bidang_kesmas" },
    { label: "Bidang Pencegahan & Pengendalian Penyakit (P2P)", username: "bidang_p2p" },
    { label: "Bidang Pelayanan Kesehatan (Yankes)", username: "bidang_yankes" },
    { label: "Bidang Sumber Daya Kesehatan (SDK)", username: "bidang_sdk" },
    { label: "Sekretariat Dinas Kesehatan", username: "bidang_sekretariat" },
    { label: "Labkesda Kab. Pamekasan", username: "bidang_labkesda" },
    { label: "Instalasi Farmasi Kab. Pamekasan (IFK)", username: "bidang_ifk" },
  ];

  // Helper preset Bidang
  const handleSelectBidangPreset = (uname: string) => {
    setUserForm((prev) => ({
      ...prev,
      username: uname,
      role: "bidang",
      password: prev.password || "pamekasan2027#",
    }));
  };

  // Helper preset Puskesmas
  const handleSelectPuskesmasPreset = (unitName: string) => {
    const clean = unitName
      .toLowerCase()
      .replace(/[\s']/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    setUserForm((prev) => ({
      ...prev,
      username: clean,
      role: "puskesmas",
      password: prev.password || "pamekasan2027#",
    }));
  };

  const handleCreateUser = async () => {
    if (!userForm.username || !userForm.password) {
      toast({
        title: "Form Belum Lengkap",
        description: "Username dan password wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    setIsUserSaving(true);
    const ok = await addUser(userForm);
    setIsUserSaving(false);
    if (ok) {
      setIsAddUserOpen(false);
      setUserForm({
        username: "",
        password: "",
        role: "puskesmas",
        is_ob: false,
      });
    }
  };

  const openEditUser = (u: ManagedUser) => {
    setEditUserTarget(u);
    setEditUserForm({
      username: u.username,
      password: u.password,
      role: u.role,
      is_ob: Boolean(u.is_ob),
    });
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editUserTarget) return;
    setIsUserSaving(true);
    const ok = await updateUser(editUserTarget.id, editUserForm);
    setIsUserSaving(false);
    if (ok) {
      setIsEditUserOpen(false);
      setEditUserTarget(null);
    }
  };

  const copyCredentials = (u: ManagedUser) => {
    const text = `*AKUN RESMI SIRUANG DINKES PAMEKASAN*\nUsername: ${u.username}\nPassword: ${u.password}\nRole: ${u.role.toUpperCase()}`;
    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    toast({
      title: "Kredensial Disalin!",
      description: `Data login akun ${u.username} siap dibagikan via WhatsApp.`,
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Car in use status
  const carInUse = isCarInUse();
  const currentCarBooking = getCurrentCarBooking();

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      <Header user={user} onLogout={logout} />

      {/* Top Banner Executive Admin */}
      <div className="bg-[#0b1329] border-b border-slate-800 text-white py-6 px-4 sm:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
              title="Kembali ke Dashboard Utama"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black tracking-wider uppercase">
                  PUSAT KONTROL ADMIN
                </span>
                <span className="text-slate-400 text-xs">Dinas Kesehatan Kab. Pamekasan</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide mt-0.5">
                Panel Administrator Utama (Full Access)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">Sistem Aktif & Terhubung</span>
            </div>

            <Button
              size="sm"
              onClick={() => {
                refetchUsers();
                fetchFeedbacks();
                toast({ title: "Sinkronisasi Berhasil", description: "Data sistem diperbarui secara langsung." });
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs gap-1.5 border border-slate-700 h-8"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh Data</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs scrollbar-none">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sliders size={14} /> Ringkasan
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "users" ? "default" : "ghost"}
            onClick={() => setActiveTab("users")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "users"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Users size={14} /> Pengguna & Role ({users.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "ruangan" ? "default" : "ghost"}
            onClick={() => setActiveTab("ruangan")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "ruangan"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Building2 size={14} /> Ruangan & Jadwal ({roomBookings.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "mobil" ? "default" : "ghost"}
            onClick={() => setActiveTab("mobil")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "mobil"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Car size={14} /> Mobil Dinas ({carBookings.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "zoom" ? "default" : "ghost"}
            onClick={() => setActiveTab("zoom")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "zoom"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Video size={14} /> Zoom Meeting ({zoomBookings.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "kebersihan" ? "default" : "ghost"}
            onClick={() => setActiveTab("kebersihan")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "kebersihan"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sparkles size={14} /> Kebersihan ({cleanComplaints.length} Aduan)
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "it" ? "default" : "ghost"}
            onClick={() => setActiveTab("it")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "it"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Laptop size={14} /> Tiket IT ({itTickets.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "shs" ? "default" : "ghost"}
            onClick={() => setActiveTab("shs")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "shs"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet size={14} /> Usulan SHS ({shsItems.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === "aspirasi" ? "default" : "ghost"}
            onClick={() => setActiveTab("aspirasi")}
            className={`gap-2 text-xs font-bold rounded-xl shrink-0 ${
              activeTab === "aspirasi"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <MessageSquare size={14} /> Kritik & Aspirasi ({feedbacks.length})
          </Button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & RINGKASAN METRIK SISTEM               */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-enter-from-bottom">
            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Users */}
              <div
                onClick={() => setActiveTab("users")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pengguna</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{users.length}</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="font-semibold text-teal-600">{userRoleStats.puskesmas} Puskesmas</span> ·{" "}
                  <span className="font-semibold text-blue-600">{userRoleStats.bidang} Bidang</span>
                </div>
              </div>

              {/* Ruangan */}
              <div
                onClick={() => setActiveTab("ruangan")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jadwal Ruangan</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{roomBookings.length}</div>
                <div className="text-[11px] text-indigo-600 font-medium mt-1">Aula Mini & Bhakti Husada</div>
              </div>

              {/* Mobil */}
              <div
                onClick={() => setActiveTab("mobil")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobil Dinas</span>
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Car size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{carBookings.length}</div>
                <div className="text-[11px] mt-1 flex items-center gap-1">
                  {carInUse ? (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Sedang Dipakai
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Siap di Garasi
                    </span>
                  )}
                </div>
              </div>

              {/* Zoom */}
              <div
                onClick={() => setActiveTab("zoom")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peminjaman Zoom</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Video size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{zoomBookings.length}</div>
                <div className="text-[11px] text-amber-600 font-medium mt-1">
                  {zoomBookings.filter((z) => z.status === "pending").length} Menunggu Link
                </div>
              </div>

              {/* Kebersihan */}
              <div
                onClick={() => setActiveTab("kebersihan")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aduan Kebersihan</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{cleanComplaints.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {cleanComplaints.filter((c) => c.status === "pending").length} Perlu Penanganan
                </div>
              </div>

              {/* Tiket IT */}
              <div
                onClick={() => setActiveTab("it")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiket Servis IT</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Laptop size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{itTickets.length}</div>
                <div className="text-[11px] text-amber-600 font-semibold mt-1">
                  {itTickets.filter((t) => t.status === "pending").length} Menunggu Teknisi
                </div>
              </div>

              {/* Usulan SHS */}
              <div
                onClick={() => setActiveTab("shs")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Usulan SHS TA 2027</span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{shsItems.length}</div>
                <div className="text-[11px] text-teal-600 font-semibold mt-1">
                  {shsStats.diajukan} Diajukan {shsStats.diperbaiki > 0 ? `• ${shsStats.diperbaiki} Selesai Diperbaiki` : ""}
                </div>
              </div>

              {/* Feedback */}
              <div
                onClick={() => setActiveTab("aspirasi")}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kritik & Masukan</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare size={16} />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-2">{feedbacks.length}</div>
                <div className="text-[11px] text-amber-700 font-medium mt-1">
                  {feedbacks.filter((f) => !f.admin_reply).length} Belum Dibalas
                </div>
              </div>
            </div>

            {/* Quick Actions & Role Puskesmas Highlight Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom 1 & 2: Panduan & Pengaturan Khusus Puskesmas */}
              <Card className="lg:col-span-2 border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Building className="text-teal-600" size={18} />
                    Fitur Khusus Role Puskesmas (SHS Restricted Access)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Sistem keamanan otomatis membatasi akun Puskesmas agar hanya melihat menu Usulan SHS
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-teal-950 text-xs leading-relaxed space-y-2">
                    <p className="font-bold text-teal-900">
                      ✅ Kebijakan Akses Puskesmas Telah Aktif:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-teal-800">
                      <li>Akun dengan role <strong>Puskesmas</strong> hanya akan menampilkan menu <strong>Usulan SHS</strong> pada navigasi Header desktop dan mobile.</li>
                      <li>Pada Dashboard utama Puskesmas, seluruh kartu selain Standar Harga Satuan (SHS) otomatis disembunyikan.</li>
                      <li>Jika akun Puskesmas mencoba mengakses link ruangan, mobil, zoom, atau kebersihan secara manual, sistem otomatis mengalihkannya kembali ke lembar usulan SHS.</li>
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveTab("users");
                        setIsAddUserOpen(true);
                        setUserForm((p) => ({ ...p, role: "puskesmas" }));
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5 rounded-xl shadow-xs"
                    >
                      <Plus size={14} /> Tambah Akun Puskesmas Baru
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveTab("users");
                        setUserRoleFilter("puskesmas");
                      }}
                      className="text-xs text-slate-700 hover:text-slate-900 border-slate-300 rounded-xl"
                    >
                      Lihat Semua Akun Puskesmas ({userRoleStats.puskesmas})
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Kolom 3: Status Terkini Mobil Dinas & Zoom */}
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Car className="text-red-500" size={18} />
                    Status Operasional Langsung
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Status Mobil */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Mobil Dinas Dinkes</span>
                      <Badge className={carInUse ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>
                        {carInUse ? "Sedang Bertugas" : "Siap Dipinjam"}
                      </Badge>
                    </div>
                    {carInUse && currentCarBooking ? (
                      <p className="text-[11px] text-slate-600">
                        Dipinjam oleh: <strong>{currentCarBooking.name}</strong> ({currentCarBooking.seksi}) sampai jam {currentCarBooking.end_time}.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500">Mobil saat ini terparkir standby di kantor Dinas Kesehatan.</p>
                    )}
                  </div>

                  {/* Status Zoom */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Antrean Zoom Meeting</span>
                      <span className="text-xs font-bold text-purple-700">
                        {zoomBookings.filter((z) => z.status === "pending").length} Pengajuan Baru
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Segera kirimkan Link & Passcode Zoom bagi bidang yang telah mengajukan rapat dinas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: MANAJEMEN PENGGUNA & ROLE (PUSKESMAS, BIDANG, OB) */}
        {/* ======================================================== */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-enter-from-bottom">
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Users className="text-blue-600" size={20} />
                      Manajemen Pengguna & Pengaturan Hak Akses Role
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Kelola akun login untuk seluruh Puskesmas, Bidang Dinkes, Petugas Kebersihan (OB), dan Administrator.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setUserForm({
                          username: "",
                          password: "",
                          role: "puskesmas",
                          is_ob: false,
                        });
                        setIsAddUserOpen(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs"
                    >
                      <Plus size={15} /> Tambah Akun Baru
                    </Button>
                  </div>
                </div>

                {/* Filter Bar & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4">
                  {/* Role filter buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={userRoleFilter === "all" ? "default" : "outline"}
                      onClick={() => setUserRoleFilter("all")}
                      className={`h-8 text-xs rounded-lg ${
                        userRoleFilter === "all"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Semua Akun ({users.length})
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={userRoleFilter === "puskesmas" ? "default" : "outline"}
                      onClick={() => setUserRoleFilter("puskesmas")}
                      className={`h-8 text-xs rounded-lg gap-1.5 ${
                        userRoleFilter === "puskesmas"
                          ? "bg-teal-600 text-white"
                          : "text-teal-700 border-teal-200 hover:bg-teal-50"
                      }`}
                    >
                      <Building size={13} /> Puskesmas ({userRoleStats.puskesmas})
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={userRoleFilter === "pengurus_barang" ? "default" : "outline"}
                      onClick={() => setUserRoleFilter("pengurus_barang")}
                      className={`h-8 text-xs rounded-lg gap-1.5 ${
                        userRoleFilter === "pengurus_barang"
                          ? "bg-purple-600 text-white"
                          : "text-purple-700 border-purple-200 hover:bg-purple-50"
                      }`}
                    >
                      <ShieldCheck size={13} /> Pengurus Barang ({userRoleStats.pengurus})
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={userRoleFilter === "bidang" ? "default" : "outline"}
                      onClick={() => setUserRoleFilter("bidang")}
                      className={`h-8 text-xs rounded-lg gap-1.5 ${
                        userRoleFilter === "bidang"
                          ? "bg-blue-600 text-white"
                          : "text-blue-700 border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      <Building2 size={13} /> Bidang Dinkes ({userRoleStats.bidang})
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={userRoleFilter === "ob" ? "default" : "outline"}
                      onClick={() => setUserRoleFilter("ob")}
                      className={`h-8 text-xs rounded-lg gap-1.5 ${
                        userRoleFilter === "ob"
                          ? "bg-emerald-600 text-white"
                          : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      <Sparkles size={13} /> Petugas OB ({userRoleStats.ob})
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={userRoleFilter === "admin" ? "default" : "outline"}
                      onClick={() => setUserRoleFilter("admin")}
                      className={`h-8 text-xs rounded-lg gap-1.5 ${
                        userRoleFilter === "admin"
                          ? "bg-red-600 text-white"
                          : "text-red-700 border-red-200 hover:bg-red-50"
                      }`}
                    >
                      <ShieldCheck size={13} /> Admin ({userRoleStats.admin})
                    </Button>
                  </div>

                  {/* Search box */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <Input
                      placeholder="Cari username atau role..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-slate-50 rounded-xl"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {usersLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    Memuat daftar pengguna...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                    Tidak ada akun yang sesuai dengan filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredUsers.map((u) => {
                      const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
                      const RoleIcon = rc.icon;
                      const isTargetCopied = copiedId === u.id;

                      return (
                        <div
                          key={u.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 relative group"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge className={`${rc.color} border font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1.5`}>
                                <RoleIcon size={12} />
                                {rc.label}
                              </Badge>

                              {u.is_ob && u.role !== "ob" && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-2 rounded-full">
                                  +OB Kebersihan
                                </Badge>
                              )}
                            </div>

                            <div>
                              <div className="text-sm font-extrabold text-slate-800 tracking-wide font-mono">
                                {u.username}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {rc.desc}
                              </p>
                            </div>

                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-600 flex items-center justify-between">
                              <span className="truncate">Pwd: {u.password ? "••••••••" : "-"}</span>
                              <button
                                type="button"
                                onClick={() => copyCredentials(u)}
                                className="text-blue-600 hover:text-blue-800 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                title="Salin Info Login Akun"
                              >
                                {isTargetCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                <span>{isTargetCopied ? "Disalin!" : "Salin"}</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                            </span>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditUser(u)}
                                className="h-7 px-2 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg gap-1"
                              >
                                <Edit size={13} /> Edit
                              </Button>

                              {/* Hapus Akun */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    title="Hapus Akun"
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus akun '{u.username}'?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Akun ini tidak akan dapat login lagi. Seluruh data peminjaman dan riwayat usulan tetap tersimpan di database.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUser(u.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Ya, Hapus Akun
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal Tambah User */}
            <AlertDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                    <Plus size={18} className="text-blue-600" /> Tambah Akun Pengguna / Puskesmas
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    Buat akun baru untuk Puskesmas (otomatis terbatas hanya menu SHS), Bidang, OB, atau Admin.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Pilih Role Akun:</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(v) => {
                        const r = v as UserRole;
                        setUserForm((p) => ({
                          ...p,
                          role: r,
                          is_ob: r === "ob",
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-slate-50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="puskesmas">
                          🏥 Puskesmas (Menu Website Terkunci HANYA SHS)
                        </SelectItem>
                        <SelectItem value="pengurus_barang">
                          📦 Pengurus Barang (Verifikator SHS, Menu Terkunci HANYA SHS)
                        </SelectItem>
                        <SelectItem value="bidang">
                          🏢 Bidang Dinkes (Akses Ruangan, Mobil, Zoom, IT, SHS)
                        </SelectItem>
                        <SelectItem value="ob">
                          🧹 Petugas OB (Laporan Kebersihan & Aduan)
                        </SelectItem>
                        <SelectItem value="admin">
                          🛡️ Administrator (Akses Penuh Seluruh Sistem)
                        </SelectItem>
                        <SelectItem value="user">
                          👤 Staf Umum (Pegawai Dinas)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preset Dropdown jika Role Bidang */}
                  {userForm.role === "bidang" && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                      <Label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                        <Building2 size={13} className="text-blue-700" />
                        Pilih Cepat Nama Bidang di Dinkes Pamekasan:
                      </Label>
                      <Select onValueChange={handleSelectBidangPreset}>
                        <SelectTrigger className="bg-white text-xs h-8">
                          <SelectValue placeholder="-- Pilih nama Bidang Dinkes --" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {BIDANG_LIST.map((b) => (
                            <SelectItem key={b.username} value={b.username}>
                              {b.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-blue-700">
                        Memilih Bidang otomatis mengisi username standar dan mengisolasi usulan SHS khusus bidang tersebut.
                      </p>
                    </div>
                  )}

                  {/* Preset Dropdown jika Role Puskesmas */}
                  {userForm.role === "puskesmas" && (
                    <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1.5">
                      <Label className="text-[11px] font-bold text-teal-900 flex items-center gap-1.5">
                        <Building size={13} className="text-teal-700" />
                        Pilih Cepat Nama Puskesmas di Pamekasan:
                      </Label>
                      <Select onValueChange={handleSelectPuskesmasPreset}>
                        <SelectTrigger className="bg-white text-xs h-8">
                          <SelectValue placeholder="-- Pilih nama Puskesmas --" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {PUSKESMAS_LIST.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-teal-700">
                        Memilih Puskesmas otomatis mengisi username standar dan mengunci akses hanya ke SHS.
                      </p>
                    </div>
                  )}

                  {/* Input Username */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Username Login</Label>
                    <Input
                      placeholder="contoh: puskesmas_pademawu atau bidang_kesmas"
                      value={userForm.username}
                      onChange={(e) =>
                        setUserForm((p) => ({
                          ...p,
                          username: e.target.value.toLowerCase().replace(/\s/g, "_"),
                        }))
                      }
                      className="bg-slate-50 text-xs font-mono"
                    />
                  </div>

                  {/* Input Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700">Password</Label>
                      <button
                        type="button"
                        onClick={() =>
                          setUserForm((p) => ({
                            ...p,
                            password: "pamekasan" + Math.floor(1000 + Math.random() * 9000) + "#",
                          }))
                        }
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        Acak Password
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showAddPwd ? "text" : "password"}
                        placeholder="Masukkan password akun..."
                        value={userForm.password}
                        onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                        className="bg-slate-50 text-xs font-mono pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddPwd((p) => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showAddPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Checkbox Tugas OB Tambahan */}
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="add_is_ob_admin"
                      checked={userForm.is_ob || userForm.role === "ob"}
                      onCheckedChange={(c) => setUserForm((p) => ({ ...p, is_ob: Boolean(c) }))}
                    />
                    <label htmlFor="add_is_ob_admin" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Tugaskan juga sebagai Petugas Kebersihan (OB)
                    </label>
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <Button
                    onClick={handleCreateUser}
                    disabled={isUserSaving || !userForm.username || !userForm.password}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {isUserSaving ? "Menyimpan..." : "Buat Akun Sekarang"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Modal Edit User */}
            <AlertDialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                    <Edit size={18} className="text-blue-600" /> Edit Akun '{editUserTarget?.username}'
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    Perbarui role, ubah password, atau sesuaikan hak akses pengguna.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Username</Label>
                    <Input
                      value={editUserForm.username || ""}
                      onChange={(e) => setEditUserForm((p) => ({ ...p, username: e.target.value }))}
                      className="bg-slate-50 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Ganti Password Baru <span className="font-normal text-slate-400">(biarkan jika tetap)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showEditPwd ? "text" : "password"}
                        placeholder="Password baru..."
                        value={editUserForm.password || ""}
                        onChange={(e) => setEditUserForm((p) => ({ ...p, password: e.target.value }))}
                        className="bg-slate-50 text-xs font-mono pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPwd((p) => !p)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showEditPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Role Utama</Label>
                    <Select
                      value={editUserForm.role || "user"}
                      onValueChange={(v) => setEditUserForm((p) => ({ ...p, role: v as UserRole }))}
                    >
                      <SelectTrigger className="bg-slate-50 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="puskesmas">🏥 Puskesmas (Terkunci HANYA SHS)</SelectItem>
                        <SelectItem value="pengurus_barang">📦 Pengurus Barang (Verifikator SHS)</SelectItem>
                        <SelectItem value="bidang">🏢 Bidang Dinkes (Akses Penuh Dinas)</SelectItem>
                        <SelectItem value="ob">🧹 Petugas OB (Kebersihan)</SelectItem>
                        <SelectItem value="admin">🛡️ Administrator (Pusat Kontrol)</SelectItem>
                        <SelectItem value="user">👤 Staf Umum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="edit_is_ob_admin"
                      checked={editUserForm.is_ob || editUserForm.role === "ob"}
                      onCheckedChange={(c) => setEditUserForm((p) => ({ ...p, is_ob: Boolean(c) }))}
                    />
                    <label htmlFor="edit_is_ob_admin" className="text-xs font-medium text-slate-700 cursor-pointer">
                      Tugaskan sebagai Petugas Kebersihan (OB)
                    </label>
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <Button
                    onClick={handleUpdateUser}
                    disabled={isUserSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {isUserSaving ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PEMINJAMAN RUANGAN & MANAJEMEN FASILITAS          */}
        {/* ======================================================== */}
        {activeTab === "ruangan" && (
          <div className="space-y-4 animate-enter-from-bottom">
            {/* Sub-bar Ruangan */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={ruanganSubTab === "bookings" ? "default" : "outline"}
                  onClick={() => setRuanganSubTab("bookings")}
                  className={`text-xs rounded-xl ${
                    ruanganSubTab === "bookings" ? "bg-indigo-600 text-white" : "text-slate-700"
                  }`}
                >
                  Daftar Peminjaman Ruangan ({roomBookings.length})
                </Button>
                <Button
                  size="sm"
                  variant={ruanganSubTab === "facilities" ? "default" : "outline"}
                  onClick={() => setRuanganSubTab("facilities")}
                  className={`text-xs rounded-xl ${
                    ruanganSubTab === "facilities" ? "bg-indigo-600 text-white" : "text-slate-700"
                  }`}
                >
                  Manajemen Fasilitas Ruangan
                </Button>
              </div>

              {ruanganSubTab === "bookings" && (
                <Button
                  size="sm"
                  onClick={() => exportRoomExcel({ year: new Date().getFullYear() })}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl shadow-xs"
                >
                  <FileDown size={14} /> Ekspor Excel
                </Button>
              )}
            </div>

            {ruanganSubTab === "bookings" ? (
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <CardTitle className="text-base font-bold text-slate-800">
                      Seluruh Arsip Peminjaman Aula Mini & Aula Bhakti Husada
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Select value={roomFilterRoom} onValueChange={setRoomFilterRoom}>
                        <SelectTrigger className="w-48 text-xs h-8 bg-slate-50">
                          <SelectValue placeholder="Pilih Ruangan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua Ruangan</SelectItem>
                          <SelectItem value="Lantai 1 - Aula Mini">Aula Mini</SelectItem>
                          <SelectItem value="Lantai 3 - Aula Bhakti Husada">Aula Bhakti Husada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  {roomLoading ? (
                    <div className="py-8 text-center text-slate-400 text-xs">Memuat data ruangan...</div>
                  ) : roomBookings.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">Belum ada data peminjaman ruangan.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                            <th className="p-3">Tanggal & Waktu</th>
                            <th className="p-3">Ruangan</th>
                            <th className="p-3">Peminjam</th>
                            <th className="p-3">Seksi / Subag</th>
                            <th className="p-3">Keperluan / Keterangan</th>
                            <th className="p-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {roomBookings
                            .filter((b) => roomFilterRoom === "all" || b.room === roomFilterRoom)
                            .map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/60">
                                <td className="p-3 whitespace-nowrap font-medium text-slate-800">
                                  {b.date} {b.endDate && b.endDate !== b.date && `s/d ${b.endDate}`}
                                  <div className="text-[11px] text-slate-400">
                                    {b.startTime} - {b.endTime}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-[11px]">
                                    {b.room}
                                  </Badge>
                                </td>
                                <td className="p-3 font-semibold text-slate-800">{b.name}</td>
                                <td className="p-3 text-slate-600">{b.seksi}</td>
                                <td className="p-3 text-slate-600 max-w-xs truncate">{b.description || "-"}</td>
                                <td className="p-3 text-right">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 size={13} />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Hapus jadwal peminjaman ruangan?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Jadwal {b.name} pada {b.date} akan dibatalkan dan dihapus permanen.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteRoomBooking(b.id)}
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Hapus Jadwal
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <FacilityManagementPanel />
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: KONTROL MOBIL DINAS                               */}
        {/* ======================================================== */}
        {activeTab === "mobil" && (
          <div className="space-y-4 animate-enter-from-bottom">
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Car className="text-red-500" size={18} />
                      Persetujuan & Kontrol Peminjaman Mobil Dinas
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Kelola status persetujuan perjalanan dinas luar kantor dan monitor ketersediaan kendaraan.
                    </CardDescription>
                  </div>

                  <Badge className={carInUse ? "bg-red-100 text-red-800 font-bold" : "bg-emerald-100 text-emerald-800 font-bold"}>
                    {carInUse ? "🚨 Mobil Sedang Digunakan" : "✅ Mobil Siap Standby"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {carLoading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Memuat data mobil dinas...</div>
                ) : carBookings.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Belum ada pengajuan peminjaman mobil dinas.</div>
                ) : (
                  <div className="space-y-3">
                    {carBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{b.name}</span>
                            <Badge variant="outline" className="text-slate-600 text-[10px]">
                              {b.seksi}
                            </Badge>
                            <Badge
                              className={`text-[10px] font-bold ${
                                b.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "rejected"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {b.status === "approved" ? "Disetujui" : b.status === "rejected" ? "Ditolak" : "Pending"}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-3">
                            <span>📅 {b.date}</span>
                            <span>⏰ {b.start_time} - {b.end_time}</span>
                            <span>📍 Keperluan: {b.keperluan}</span>
                          </div>
                          {b.admin_note && (
                            <p className="text-[11px] text-amber-700 font-medium">Catatan Admin: {b.admin_note}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {b.status !== "approved" && (
                            <Button
                              size="sm"
                              onClick={() => {
                                updateCarStatus(b.id, "approved", "Disetujui oleh Administrator");
                                toast({ title: "Mobil Disetujui", description: `Pengajuan ${b.name} telah disetujui & notifikasi terkirim ke Telegram.` });
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-lg font-bold"
                            >
                              Setujui
                            </Button>
                          )}
                          {b.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateCarStatus(b.id, "rejected", "Ditolak oleh Administrator");
                                toast({ title: "Pengajuan Ditolak", description: `Pengajuan ${b.name} ditolak & notifikasi terkirim ke Telegram.` });
                              }}
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-8 rounded-lg"
                            >
                              Tolak
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCarBooking(b.id)}
                            className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: KONTROL ZOOM MEETING                              */}
        {/* ======================================================== */}
        {activeTab === "zoom" && (
          <div className="space-y-4 animate-enter-from-bottom">
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Video className="text-purple-600" size={18} />
                  Pusat Kelola & Pembagian Link Zoom Meeting Dinas
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Kirimkan link rapat dan meeting ID Zoom kepada pemohon rapat yang disetujui.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {zoomLoading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Memuat pengajuan zoom...</div>
                ) : zoomBookings.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Belum ada pengajuan Zoom meeting.</div>
                ) : (
                  <div className="space-y-3">
                    {zoomBookings.map((z) => (
                      <div
                        key={z.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{z.acara}</span>
                            <Badge
                              className={`text-[10px] font-bold ${
                                z.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : z.status === "rejected"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {z.status === "approved" ? "Disetujui" : z.status === "rejected" ? "Ditolak" : "Menunggu Link"}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-600 flex items-center gap-3">
                            <span>👤 {z.name} ({z.seksi})</span>
                            <span>📅 {z.date}</span>
                            <span>⏰ {z.startTime} - {z.endTime}</span>
                          </div>
                          {z.zoomLink && (
                            <div className="text-xs font-mono text-purple-700 bg-purple-50 p-2 rounded-lg mt-1 break-all">
                              🔗 Link Zoom: <a href={z.zoomLink} target="_blank" rel="noreferrer" className="underline">{z.zoomLink}</a>
                              {z.adminNote && <div className="text-slate-600 mt-0.5">{z.adminNote}</div>}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => {
                              setReplyZoomTarget(z);
                              setZoomForm({
                                link: z.zoomLink || "",
                                meetingId: "",
                                passcode: "",
                                note: z.adminNote || "",
                                status: "approved",
                              });
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 rounded-lg font-bold"
                          >
                            {z.zoomLink ? "Update Link Zoom" : "Kirim Link Zoom"}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteZoomBooking(z.id)}
                            className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal Input Link Zoom */}
            <AlertDialog open={Boolean(replyZoomTarget)} onOpenChange={(o) => !o && setReplyZoomTarget(null)}>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                    <Video size={18} className="text-purple-600" /> Balas Link Zoom Meeting
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    Kegiatan: <strong>{replyZoomTarget?.acara}</strong> ({replyZoomTarget?.name})
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 py-2 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Link URL Zoom Meeting:</Label>
                    <Input
                      placeholder="https://us05web.zoom.us/j/..."
                      value={zoomForm.link}
                      onChange={(e) => setZoomForm((p) => ({ ...p, link: e.target.value }))}
                      className="bg-slate-50 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Meeting ID (opsional)</Label>
                      <Input
                        placeholder="cth: 849 2938 1234"
                        value={zoomForm.meetingId}
                        onChange={(e) => setZoomForm((p) => ({ ...p, meetingId: e.target.value }))}
                        className="bg-slate-50 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Passcode (opsional)</Label>
                      <Input
                        placeholder="cth: dinkes123"
                        value={zoomForm.passcode}
                        onChange={(e) => setZoomForm((p) => ({ ...p, passcode: e.target.value }))}
                        className="bg-slate-50 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Catatan Tambahan untuk Pemohon:</Label>
                    <Textarea
                      placeholder="Host key atau pesan admin..."
                      value={zoomForm.note}
                      onChange={(e) => setZoomForm((p) => ({ ...p, note: e.target.value }))}
                      className="bg-slate-50 text-xs"
                      rows={2}
                    />
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <Button
                    onClick={async () => {
                      if (!replyZoomTarget) return;
                      const extra = [
                        zoomForm.meetingId ? `Meeting ID: ${zoomForm.meetingId}` : "",
                        zoomForm.passcode ? `Passcode: ${zoomForm.passcode}` : "",
                        zoomForm.note,
                      ]
                        .filter(Boolean)
                        .join(" | ");

                      await replyZoomBooking(replyZoomTarget.id, zoomForm.link, extra, zoomForm.status);
                      toast({ title: "Terkirim", description: "Link Zoom berhasil dibagikan." });
                      setReplyZoomTarget(null);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    Simpan & Kirim
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: KONTROL MONEV KEBERSIHAN & PENGADUAN              */}
        {/* ======================================================== */}
        {activeTab === "kebersihan" && (
          <div className="space-y-4 animate-enter-from-bottom">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Button
                size="sm"
                variant={kebersihanSubTab === "complaints" ? "default" : "outline"}
                onClick={() => setKebersihanSubTab("complaints")}
                className={`text-xs rounded-xl ${
                  kebersihanSubTab === "complaints" ? "bg-emerald-600 text-white" : "text-slate-700"
                }`}
              >
                Pengaduan Kebersihan ({cleanComplaints.length})
              </Button>
              <Button
                size="sm"
                variant={kebersihanSubTab === "reports" ? "default" : "outline"}
                onClick={() => setKebersihanSubTab("reports")}
                className={`text-xs rounded-xl ${
                  kebersihanSubTab === "reports" ? "bg-emerald-600 text-white" : "text-slate-700"
                }`}
              >
                Laporan Harian OB ({cleanReports.length})
              </Button>
            </div>

            {kebersihanSubTab === "complaints" ? (
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-base font-bold text-slate-800">
                    Daftar Pengaduan Kebersihan Masuk
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {cleanComplaints.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">Belum ada aduan kebersihan.</div>
                  ) : (
                    cleanComplaints.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs">
                              {c.floor} - {c.reporter_name} ({c.bidang})
                            </span>
                            <Badge
                              className={
                                c.status === "resolved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : c.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }
                            >
                              {c.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">{c.description}</p>
                          <div className="text-[11px] text-slate-400">📅 {c.date} jam {c.time}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={c.status}
                            onValueChange={(val) =>
                              updateComplaintStatus(c.id, val as any, { handler_name: user.username })
                            }
                          >
                            <SelectTrigger className="w-36 text-xs h-8 bg-slate-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
                              <SelectItem value="resolved">Selesai (Resolved)</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCleanComplaint(c.id)}
                            className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-base font-bold text-slate-800">
                    Laporan Harian Pemeriksaan Kebersihan OB
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  {cleanReports.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">Belum ada laporan harian.</div>
                  ) : (
                    cleanReports.map((r) => (
                      <div
                        key={r.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{r.floor} · Petugas: {r.inspector_name}</div>
                          <p className="text-xs text-slate-600 mt-0.5">{r.description || "Kebersihan telah diperiksa"}</p>
                          <div className="text-[11px] text-slate-400 mt-1">📅 {r.date} jam {r.time} ({r.photos?.length || 0} Foto)</div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCleanReport(r.id)}
                          className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: KONTROL LAYANAN TIKET IT                          */}
        {/* ======================================================== */}
        {activeTab === "it" && (
          <div className="space-y-4 animate-enter-from-bottom">
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Laptop className="text-slate-700" size={18} />
                      Manajemen Tiket Bantuan Servis IT Dinas
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Pantau antrean lapor kerusakan hardware & software unit kerja dan tentukan teknisi penangan.
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearAllTickets}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-8"
                  >
                    Bersihkan Riwayat Tiket
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-3">
                {itTickets.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Belum ada tiket kendala IT.</div>
                ) : (
                  itTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">#{t.ticket_number} - {t.title}</span>
                          <Badge
                            className={
                              t.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : t.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }
                          >
                            {t.status.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-slate-500">
                            {t.category.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">{t.description}</p>
                        <div className="text-[11px] text-slate-400">
                          Unit: {t.bidang} ({t.unit_name}) · Pelapor: {t.penanggung_jawab} · {t.contact_wa}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={t.status}
                          onValueChange={(val) =>
                            updateITTicket(t.id, { status: val as any, teknisi_name: user.username })
                          }
                        >
                          <SelectTrigger className="w-40 text-xs h-8 bg-slate-50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Menunggu</SelectItem>
                            <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
                            <SelectItem value="completed">Selesai Diperbaiki</SelectItem>
                            <SelectItem value="cancelled">Ditolak / Batal</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteITTicket(t.id)}
                          className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: KONTROL STANDAR HARGA SATUAN (SHS)                */}
        {/* ======================================================== */}
        {activeTab === "shs" && (
          <div className="space-y-4 animate-enter-from-bottom">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Button
                size="sm"
                variant={shsSubTab === "verification" ? "default" : "outline"}
                onClick={() => setShsSubTab("verification")}
                className={`text-xs rounded-xl ${
                  shsSubTab === "verification" ? "bg-teal-600 text-white" : "text-slate-700"
                }`}
              >
                Verifikasi Usulan Masuk ({shsItems.length})
              </Button>
              <Button
                size="sm"
                variant={shsSubTab === "period" ? "default" : "outline"}
                onClick={() => setShsSubTab("period")}
                className={`text-xs rounded-xl ${
                  shsSubTab === "period" ? "bg-teal-600 text-white" : "text-slate-700"
                }`}
              >
                Kelola Periode & Master Data
              </Button>
              <Button
                size="sm"
                variant={shsSubTab === "recap" ? "default" : "outline"}
                onClick={() => setShsSubTab("recap")}
                className={`text-xs rounded-xl ${
                  shsSubTab === "recap" ? "bg-teal-600 text-white" : "text-slate-700"
                }`}
              >
                Rekap & Ekspor Dokumen
              </Button>
            </div>

            {shsSubTab === "verification" && (
              <SHSVerificationPanel
                user={user}
                items={shsItems}
                verifyItem={verifySHSItem}
                bulkApprove={bulkApproveSHS}
              />
            )}

            {shsSubTab === "period" && (
              <SHSAdminPeriodAndMaster
                activePeriod={activeSHSPeriod}
                masterKategori={masterKategori}
                masterRekening={masterRekening}
                masterSatuan={masterSatuan}
                masterKelompok={masterKelompok}
                onSavePeriod={saveSHSPeriod}
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

            {shsSubTab === "recap" && (
              <SHSRecapExport
                user={user}
                items={shsItems}
                activePeriod={activeSHSPeriod}
                stats={shsStats}
              />
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 9: KRITIK, SARAN & ASPIRASI PENGGUNA                 */}
        {/* ======================================================== */}
        {activeTab === "aspirasi" && (
          <div className="space-y-4 animate-enter-from-bottom">
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="text-amber-500" size={18} />
                  Kritik, Saran & Aspirasi Pengguna Website
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Semua masukan dan keluhan yang dikirimkan pegawai melalui formulir aspirasi.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {feedbackLoading ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Memuat pesan aspirasi...</div>
                ) : feedbacks.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">Belum ada pesan kritik atau saran.</div>
                ) : (
                  <div className="space-y-3">
                    {feedbacks.map((f) => (
                      <div
                        key={f.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            📅 {new Date(f.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFeedback(f.id)}
                            className="text-slate-400 hover:text-rose-600 h-7 w-7 p-0"
                            title="Hapus Pesan"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-sans">{f.message}</p>

                        {/* Balasan Admin */}
                        {f.admin_reply ? (
                          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                            <span className="font-bold text-amber-800 flex items-center gap-1.5">
                              <CornerDownRight size={13} className="text-amber-600" />
                              Tindak Lanjut / Balasan Admin:
                            </span>
                            <p className="text-amber-950 font-sans">{f.admin_reply}</p>
                          </div>
                        ) : replyingFeedbackId === f.id ? (
                          <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <Textarea
                              placeholder="Tuliskan balasan atau status tindak lanjut admin..."
                              value={feedbackReplyText}
                              onChange={(e) => setFeedbackReplyText(e.target.value)}
                              rows={2}
                              className="text-xs bg-white"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setReplyingFeedbackId(null);
                                  setFeedbackReplyText("");
                                }}
                                className="h-7 text-xs"
                              >
                                Batal
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReplyFeedback(f.id)}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                              >
                                Kirim Balasan
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReplyingFeedbackId(f.id);
                                setFeedbackReplyText("");
                              }}
                              className="text-xs text-amber-700 border-amber-200 hover:bg-amber-50 h-7 rounded-lg gap-1"
                            >
                              <CornerDownRight size={13} /> Balas Masukan Ini
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminPanel;
