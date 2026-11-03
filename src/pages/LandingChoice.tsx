// src/pages/LandingChoice.tsx
import { useNavigate } from "react-router-dom";
import { Building2, Video, LogOut, ChevronRight } from "lucide-react";
import { User } from "@/hooks/useSupabaseAuth";
import logoImage from "@/assets/logo-pamekasan.png";

interface LandingChoiceProps {
  user: User;
  onLogout: () => void;
}

const LandingChoice = ({ user, onLogout }: LandingChoiceProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={logoImage}
            alt="Logo"
            className="h-8 w-8 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <p className="font-bold text-primary text-sm leading-tight">SIRUANG</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              Dinas Kesehatan Kab. Pamekasan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">{user.username}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Selamat datang, <span className="text-primary">{user.username}</span>!
          </h1>
          <p className="text-slate-500 text-sm">
            Pilih layanan peminjaman yang Anda butuhkan
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {/* Pilihan: Pinjam Ruangan */}
          <button
            onClick={() => navigate("/ruangan")}
            className="group relative bg-white rounded-2xl border border-slate-200 hover:border-primary hover:shadow-lg transition-all duration-300 p-7 text-left overflow-hidden"
          >
            {/* Background accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <Building2 size={28} className="text-primary" />
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-1.5 group-hover:text-primary transition-colors">
                Peminjaman Ruangan
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Ajukan peminjaman aula atau ruang rapat yang tersedia di Dinas Kesehatan
              </p>

              <div className="mt-5 flex items-center gap-1 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300">
                Mulai booking <ChevronRight size={15} />
              </div>
            </div>
          </button>

          {/* Pilihan: Pinjam Zoom */}
          <button
            onClick={() => navigate("/zoom")}
            className="group relative bg-white rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all duration-300 p-7 text-left overflow-hidden"
          >
            {/* Background accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                <Video size={28} className="text-blue-500" />
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-1.5 group-hover:text-blue-600 transition-colors">
                Peminjaman Zoom
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Ajukan permohonan akun Zoom untuk rapat/kegiatan online. Admin akan mengirimkan link-nya
              </p>

              <div className="mt-5 flex items-center gap-1 text-blue-500 font-medium text-sm opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300">
                Ajukan permohonan <ChevronRight size={15} />
              </div>
            </div>
          </button>
        </div>

        {/* Admin shortcut */}
        {user.role === "admin" && (
          <div className="mt-8 w-full max-w-2xl">
            <p className="text-center text-xs text-slate-400 mb-3">Panel Admin</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/ruangan")}
                className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-sm text-slate-600"
              >
                <span>Kelola Data Ruangan</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
              <button
                onClick={() => navigate("/zoom")}
                className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-sm text-slate-600"
              >
                <span>Kelola Permohonan Zoom</span>
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-300">
        SIRUANG © {new Date().getFullYear()} · Dinas Kesehatan Kabupaten Pamekasan
      </footer>
    </div>
  );
};

export default LandingChoice;