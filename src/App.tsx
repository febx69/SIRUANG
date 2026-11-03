// src/App.tsx
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useSupabaseAuth, isUserOB } from "./hooks/useSupabaseAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Schedule from "./pages/Schedule";
import Zoom from "./pages/Zoom";
import Agenda from "./pages/Agenda";
import NotFound from "./pages/NotFound";
import Mobil from "./pages/Mobil";
import Kebersihan from "./pages/Kebersihan";
import ITSupport from "./pages/ITSupport";
import UsulanSHS from "./pages/UsulanSHS";
import PBPUPage from "./pages/PBPUPage";
import AdminPanel from "./pages/AdminPanel";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

// Guard Khusus Puskesmas & Pengurus Barang: Mengunci menu dan akses ke selain SHS
const PuskesmasRestriction = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useSupabaseAuth();
  if (isLoading) return null;
  const isLimitedToSHS =
    user?.role === "puskesmas" ||
    user?.role === "pengurus_barang" ||
    (user?.username || "").toLowerCase().startsWith("pengurus");
  if (isLimitedToSHS) {
    return <Navigate to="/usulan-shs" replace />;
  }
  return <>{children}</>;
};

// Guard Khusus Petugas Kebersihan / Fathor: Hanya boleh mengakses Ruangan dan Kebersihan
const OBRestriction = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useSupabaseAuth();
  if (isLoading) return null;
  if (isUserOB(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Guard Khusus Admin: Hanya dapat diakses oleh Administrator
const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useSupabaseAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppContent = ({ appReady }: { appReady: boolean }) => {
  const location = useLocation();
  const [pageVisible, setPageVisible] = useState(false);

  useEffect(() => {
    if (appReady) setTimeout(() => setPageVisible(true), 50);
  }, [appReady]);

  return (
    <div style={{
      opacity: pageVisible ? 1 : 0,
      transform: pageVisible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        
        {/* Halaman Khusus Administrator */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminPanel />
            </AdminGuard>
          }
        />

        {/* Modul Layanan Umum (Puskesmas otomatis dialihkan ke /usulan-shs, OB dibatasi ke Ruangan & Kebersihan) */}
        <Route path="/ruangan" element={<PuskesmasRestriction><Index /></PuskesmasRestriction>} />
        <Route path="/jadwal" element={<PuskesmasRestriction><Schedule /></PuskesmasRestriction>} />
        <Route path="/zoom" element={<PuskesmasRestriction><OBRestriction><Zoom /></OBRestriction></PuskesmasRestriction>} />
        <Route path="/mobil" element={<PuskesmasRestriction><OBRestriction><Mobil /></OBRestriction></PuskesmasRestriction>} />
        <Route path="/kebersihan" element={<PuskesmasRestriction><Kebersihan /></PuskesmasRestriction>} />
        <Route path="/it-support" element={<PuskesmasRestriction><OBRestriction><ITSupport /></OBRestriction></PuskesmasRestriction>} />
        <Route path="/agenda" element={<PuskesmasRestriction><OBRestriction><Agenda /></OBRestriction></PuskesmasRestriction>} />

        {/* Modul Standar Harga Satuan (Terbuka untuk Puskesmas, Bidang, & Admin; ditutup untuk OB) */}
        <Route path="/usulan-shs" element={<OBRestriction><UsulanSHS /></OBRestriction>} />
        
        {/* Modul Pendaftaran & Verifikasi PBPU BP (Terbuka untuk Yankes, Puskesmas, Dinsos, Admin; ditutup untuk OB) */}
        <Route path="/pbpu-bp" element={<OBRestriction><PBPUPage /></OBRestriction>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => {
  const alreadyShown = typeof window !== "undefined" && Boolean(sessionStorage.getItem("splash_shown"));
  const [appReady, setAppReady] = useState(alreadyShown);
  const [showSplash, setShowSplash] = useState(!alreadyShown);

  const handleSplashFinish = () => {
    sessionStorage.setItem("splash_shown", "true");
    setAppReady(true);
    setTimeout(() => setShowSplash(false), 100);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <HashRouter>
          <AppContent appReady={appReady} />
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;