// src/components/Layout/Header.tsx - Dark Navy Executive Header as in screenshot
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { isUserPBPU } from "@/hooks/useSupabaseAuth";
import {
  Home,
  Armchair,
  Car,
  Video,
  Sparkles,
  Laptop,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  LogIn,
  ShieldCheck,
  HeartHandshake
} from "lucide-react";
import logoImage from "@/assets/logo-pamekasan.png";

export interface HeaderUser {
  username: string;
  role: string;
  is_ob?: boolean;
}

interface HeaderProps {
  user: HeaderUser | null;
  onLogout?: () => void;
}

const getInitials = (name?: string) => {
  if (!name) return "AD";
  const trimmed = name.trim();
  const parts = trimmed.split(/[\s_-]+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

const getRoleLabel = (role?: string, is_ob?: boolean, username?: string) => {
  const uname = (username || '').toLowerCase();
  if (role === "admin") return "Admin";
  if (uname === "yankes") return "Bidang Yankes (Verifikator)";
  if (uname === "dinsos") return "Dinas Sosial (Pengusul)";
  if (uname === "dukcapil") return "Dukcapil (Pemeriksa NIK)";
  if (role === "pengurus_barang") return "Pengurus Barang (Verifikator)";
  if (role === "puskesmas" || uname.startsWith("puskesmas")) return "Puskesmas (Pengusul)";
  if (is_ob || role === "ob" || uname === "fathor") return "Petugas OB";
  if (role === "bidang") return "Bidang";
  if (!role) return "Bidang";
  if (role.toLowerCase() === "user") return "Staf";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const Header = ({ user, onLogout }: HeaderProps) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const uname = (user?.username || "").toLowerCase();
  const isPuskesmas = user?.role === "puskesmas" || uname.startsWith("puskesmas") || uname.startsWith("pkm_");
  const isDinsos = user?.role === "dinsos" || uname === "dinsos";
  const isDukcapil = user?.role === "dukcapil" || uname === "dukcapil";
  const isPengurusBarang = user?.role === "pengurus_barang" || uname.startsWith("pengurus");
  const isOB = Boolean(user?.is_ob) || user?.role === "ob" || uname === "fathor";
  const isAdmin = user?.role === "admin";
  const isYankes = uname === "yankes" || uname.includes("yankes");

  let navItems: {
    name: string;
    path: string;
    icon: any;
    isActive: (pathname: string) => boolean;
  }[] = [];

  if (isPengurusBarang) {
    // Pengurus Barang: HANYA Beranda dan Usulan SHS
    navItems = [
      { name: "Beranda", path: "/", icon: Home, isActive: (p) => p === "/" },
      { name: "Usulan SHS", path: "/usulan-shs", icon: FileSpreadsheet, isActive: (p) => p === "/usulan-shs" },
    ];
  } else if (isPuskesmas) {
    // Puskesmas: Beranda, PBPU BP (Pengusul), dan Usulan SHS
    navItems = [
      { name: "Beranda", path: "/", icon: Home, isActive: (p) => p === "/" },
      { name: "PBPU BP", path: "/pbpu-bp", icon: HeartHandshake, isActive: (p) => p === "/pbpu-bp" },
      { name: "Usulan SHS", path: "/usulan-shs", icon: FileSpreadsheet, isActive: (p) => p === "/usulan-shs" },
    ];
  } else if (isDinsos || isDukcapil) {
    // Dinsos (Pengusul) atau Dukcapil (Pemeriksa NIK): Beranda dan PBPU BP
    navItems = [
      { name: "Beranda", path: "/", icon: Home, isActive: (p) => p === "/" },
      { name: "PBPU BP", path: "/pbpu-bp", icon: HeartHandshake, isActive: (p) => p === "/pbpu-bp" },
    ];
  } else if (isOB) {
    // Petugas Kebersihan / Fathor: Beranda, Ruangan, Kebersihan
    navItems = [
      { name: "Beranda", path: "/", icon: Home, isActive: (p) => p === "/" },
      { name: "Ruangan", path: "/ruangan", icon: Armchair, isActive: (p) => p === "/ruangan" || p === "/jadwal" },
      { name: "Kebersihan", path: "/kebersihan", icon: Sparkles, isActive: (p) => p === "/kebersihan" },
    ];
  } else if (isYankes) {
    // Bidang Yankes: Beranda, PBPU BP (Verifikator), Ruangan, Mobil, Zoom, Kebersihan, Layanan IT (Tanpa SHS)
    navItems = [
      { name: "Beranda", path: "/", icon: Home, isActive: (p) => p === "/" },
      { name: "PBPU BP", path: "/pbpu-bp", icon: HeartHandshake, isActive: (p) => p === "/pbpu-bp" },
      { name: "Ruangan", path: "/ruangan", icon: Armchair, isActive: (p) => p === "/ruangan" || p === "/jadwal" },
      { name: "Mobil Dinas", path: "/mobil", icon: Car, isActive: (p) => p === "/mobil" },
      { name: "Zoom", path: "/zoom", icon: Video, isActive: (p) => p === "/zoom" },
      { name: "Kebersihan", path: "/kebersihan", icon: Sparkles, isActive: (p) => p === "/kebersihan" },
      { name: "Layanan IT", path: "/it-support", icon: Laptop, isActive: (p) => p === "/it-support" },
    ];
  } else if (isAdmin) {
    // Administrator: Akses penuh
    navItems = [
      { name: "Beranda", path: "/", icon: Home, isActive: (p) => p === "/" },
      { name: "PBPU BP", path: "/pbpu-bp", icon: HeartHandshake, isActive: (p) => p === "/pbpu-bp" },
      { name: "Ruangan", path: "/ruangan", icon: Armchair, isActive: (p) => p === "/ruangan" || p === "/jadwal" },
      { name: "Mobil Dinas", path: "/mobil", icon: Car, isActive: (p) => p === "/mobil" },
      { name: "Zoom", path: "/zoom", icon: Video, isActive: (p) => p === "/zoom" },
      { name: "Kebersihan", path: "/kebersihan", icon: Sparkles, isActive: (p) => p === "/kebersihan" },
      { name: "Layanan IT", path: "/it-support", icon: Laptop, isActive: (p) => p === "/it-support" },
      { name: "Usulan SHS", path: "/usulan-shs", icon: FileSpreadsheet, isActive: (p) => p === "/usulan-shs" },
      { name: "Panel Admin", path: "/admin", icon: ShieldCheck, isActive: (p) => p === "/admin" },
    ];
  } else {
    // Bidang lain di Dinkes (SDK, Kesmas, P2P, Sekretariat, dll): Layanan umum Dinkes (TANPA PBPU BP dan TANPA SHS)
    navItems = [
      { name: "Beranda", path: "/", icon: Home, isActive: (p) => p === "/" },
      { name: "Ruangan", path: "/ruangan", icon: Armchair, isActive: (p) => p === "/ruangan" || p === "/jadwal" },
      { name: "Mobil Dinas", path: "/mobil", icon: Car, isActive: (p) => p === "/mobil" },
      { name: "Zoom", path: "/zoom", icon: Video, isActive: (p) => p === "/zoom" },
      { name: "Kebersihan", path: "/kebersihan", icon: Sparkles, isActive: (p) => p === "/kebersihan" },
      { name: "Layanan IT", path: "/it-support", icon: Laptop, isActive: (p) => p === "/it-support" },
    ];
  }

  return (
    <header className="bg-[#0b1329] border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* SISI KIRI: Logo & Identitas Pemkab */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group select-none">
            <img 
              src={logoImage} 
              alt="Logo Kabupaten Pamekasan" 
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain drop-shadow transition-transform duration-200 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
                  PEMERINTAH KAB. PAMEKASAN
                </span>
                <span className="bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                  SIRUANG
                </span>
              </div>
              <span className="text-[14px] sm:text-[16px] font-extrabold text-white tracking-wide leading-tight mt-0.5">
                DINAS KESEHATAN
              </span>
            </div>
          </Link>

          {/* SISI TENGAH: Menu Navigasi Desktop */}
          <nav className="hidden xl:flex items-center gap-1.5">
            {navItems.map((item) => {
              const active = item.isActive(location.pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    active
                      ? "bg-slate-800/90 text-white shadow-sm font-semibold border border-slate-700"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      active ? "text-blue-400" : "text-slate-400 group-hover:text-white"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* SISI KANAN: User Profile, Panel Admin & Tombol Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <>
                {/* Tombol Panel Admin Khusus Administrator */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition-all shadow-xs"
                    title="Buka Pusat Kontrol Panel Admin"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Panel Admin</span>
                  </Link>
                )}

                {/* Profile Box */}
                <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-1 rounded-xl select-none">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0 border ${
                    isAdmin ? 'bg-amber-900/60 border-amber-500/60 text-amber-300' :
                    isPuskesmas ? 'bg-teal-900/60 border-teal-500/60 text-teal-300' :
                    'bg-slate-800 border-slate-700 text-white'
                  }`}>
                    {getInitials(user.username)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-white leading-tight">
                      {user.username}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize leading-tight mt-0.5">
                      {getRoleLabel(user.role, user.is_ob, user.username)}
                    </span>
                  </div>
                </div>

                {/* Tombol Logout */}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 bg-transparent hover:bg-slate-800 text-white text-xs font-medium transition-all duration-200 cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-medium transition-all duration-200"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
            )}

            {/* Tombol Toggle Mobile Menu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 sm:p-2 rounded-lg border border-slate-700 text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Sub-bar scrollable horizontal untuk layar medium (md s.d lg) jika tidak xl */}
        <div className="hidden md:flex xl:hidden items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 border-t border-slate-800 mt-2 scrollbar-none">
          {navItems.map((item) => {
            const active = item.isActive(location.pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  active
                    ? "bg-slate-800 text-white shadow-sm font-semibold border border-slate-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    active ? "text-blue-400" : "text-slate-400"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Menu Dropdown untuk Mobile (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0b1329] px-4 py-3 space-y-2.5 shadow-2xl animate-enter-from-bottom text-white">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const active = item.isActive(location.pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? "bg-slate-800 text-white font-semibold border border-slate-700"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-blue-400" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {user && (
            <div className="sm:hidden pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                  {getInitials(user.username)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{user.username}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{getRoleLabel(user.role, user.is_ob, user.username)}</div>
                </div>
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
