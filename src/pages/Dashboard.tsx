// src/pages/Dashboard.tsx
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSupabaseAuth, isUserOB } from "@/hooks/useSupabaseAuth";
import Header from "@/components/Layout/Header";
import { Building2, Video, Car, ChevronRight, Users, Calendar, Sparkles, Laptop, FileSpreadsheet } from "lucide-react";

const Dashboard = () => {
  const { user, logout, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  const isOB = isUserOB(user);
  const isPuskesmas = user.role === "puskesmas";
  const isPengurusBarang = user.role === "pengurus_barang" || (user.username || "").toLowerCase().startsWith("pengurus");
  const isSingleMenu = isPuskesmas || isPengurusBarang;
  const isAdmin = user.role === "admin";

  const allCards = [
    {
      id: "ruangan",
      path: "/ruangan",
      icon: Building2,
      iconBg: "rgba(11,19,41,0.06)",
      iconColor: "#0b1329",
      glowColor: "rgba(11,19,41,0.12)",
      borderHover: "rgba(11,19,41,0.25)",
      accentColor: "#0b1329",
      title: "Peminjaman Ruangan",
      desc: "Ajukan peminjaman Aula Mini atau Aula Bhakti Husada untuk kegiatan rapat dan acara dinas.",
      meta: "2 ruangan tersedia",
      metaIcon: Calendar,
    },
    {
      id: "mobil",
      path: "/mobil",
      icon: Car,
      iconBg: "rgba(239,68,68,0.08)",
      iconColor: "#ef4444",
      glowColor: "rgba(239,68,68,0.15)",
      borderHover: "rgba(239,68,68,0.3)",
      accentColor: "#ef4444",
      title: "Peminjaman Mobil Dinas",
      desc: "Ajukan peminjaman mobil dinas untuk keperluan perjalanan dinas luar kantor.",
      meta: "1 mobil tersedia",
      metaIcon: Car,
    },
    {
      id: "zoom",
      path: "/zoom",
      icon: Video,
      iconBg: "rgba(99,102,241,0.08)",
      iconColor: "#6366f1",
      glowColor: "rgba(99,102,241,0.15)",
      borderHover: "rgba(99,102,241,0.3)",
      accentColor: "#6366f1",
      title: "Peminjaman Zoom",
      desc: "Ajukan kebutuhan meeting Zoom untuk rapat online. Admin akan membalas dengan link Zoom.",
      meta: "Online meeting",
      metaIcon: Users,
    },
    {
      id: "kebersihan",
      path: "/kebersihan",
      icon: Sparkles,
      iconBg: "rgba(16,185,129,0.08)",
      iconColor: "#10b981",
      glowColor: "rgba(16,185,129,0.15)",
      borderHover: "rgba(16,185,129,0.3)",
      accentColor: "#10b981",
      title: "Monev Kebersihan",
      desc: "Laporan harian kebersihan Lantai 1, 2, 3 oleh petugas OB & layanan pengaduan kebersihan.",
      meta: isOB ? "Tugas OB & Aduan" : "Laporan & Pengaduan",
      metaIcon: Sparkles,
    },
    {
      id: "it-support",
      path: "/it-support",
      icon: Laptop,
      iconBg: "rgba(15,23,42,0.06)",
      iconColor: "#0f172a",
      glowColor: "rgba(15,23,42,0.12)",
      borderHover: "rgba(15,23,42,0.3)",
      accentColor: "#0f172a",
      title: "Layanan Tiket IT",
      desc: "Lapor kendala hardware & software unit kerja, monitor antrean servis, dan rekap data admin.",
      meta: "Hardware & Software",
      metaIcon: Laptop,
    },
    {
      id: "shs",
      path: "/usulan-shs",
      icon: FileSpreadsheet,
      iconBg: "rgba(13,148,136,0.08)",
      iconColor: "#0d9488",
      glowColor: "rgba(13,148,136,0.15)",
      borderHover: "rgba(13,148,136,0.3)",
      accentColor: "#0d9488",
      title: "Usulan Standar Harga Satuan (SHS)",
      desc: "Pengajuan usulan SHS oleh bidang & puskesmas, validasi rekening belanja, dan verifikasi periode.",
      meta: "Periode & Usulan SHS",
      metaIcon: Calendar,
    },
  ];

  // Jika login Puskesmas atau Pengurus Barang: Menu/kartu yang muncul HANYA SHS!
  // Jika login Petugas Kebersihan / Fathor: Menu/kartu yang muncul HANYA Monev Kebersihan dan Peminjaman Ruangan!
  let cards = allCards;
  if (isSingleMenu) {
    cards = allCards.filter(c => c.id === "shs");
  } else if (isOB) {
    cards = allCards.filter(c => c.id === "kebersihan" || c.id === "ruangan");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={logout} />

      <style>{`
        @keyframes fade-up-card {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .dash-card { animation: fade-up-card 0.5s cubic-bezier(0.4,0,0.2,1) both; }
        .dash-card:nth-child(1) { animation-delay: 0.1s; }
        .dash-card:nth-child(2) { animation-delay: 0.18s; }
        .dash-card:nth-child(3) { animation-delay: 0.26s; }
        .dash-card:nth-child(4) { animation-delay: 0.34s; }
        .dash-card:nth-child(5) { animation-delay: 0.42s; }
        .dash-card:nth-child(6) { animation-delay: 0.50s; }
      `}</style>

      <main style={{ maxWidth: "1050px", margin: "0 auto", padding: "40px 24px" }}>
        
        {/* BANNER KHUSUS ADMINISTRATOR */}
        {isAdmin && (
          <div
            className="mb-8 p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#0b1329] via-[#111f42] to-[#1e293b] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 animate-enter-from-bottom"
          >
            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[10px] tracking-wider uppercase">
                  Hak Akses Penuh
                </span>
                <span className="text-amber-300 text-xs font-semibold">Pusat Kontrol Utama</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Panel Administrator SIRUANG
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Kelola semua akun pengguna, buat role khusus Puskesmas, jadwal ruangan, mobil dinas, zoom, layanan IT, monev kebersihan, dan verifikasi usulan SHS dalam satu halaman terpadu.
              </p>
            </div>

            <div className="shrink-0 relative z-10">
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Buka Panel Admin</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Subtle glow background */}
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-amber-500/10 blur-3xl pointer-events-none" />
          </div>
        )}

        {/* Greeting */}
        <div style={{ textAlign:"center", marginBottom: isSingleMenu || isOB ? "28px" : "40px", animation:"fade-up-card 0.4s cubic-bezier(0.4,0,0.2,1) both" }}>
          <p style={{ fontSize:"0.8rem", color:"#64748b", letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600, marginBottom:"8px" }}>
            {isPuskesmas ? "Portal Khusus Puskesmas" : isPengurusBarang ? "Portal Verifikator SHS" : isOB ? "Petugas Kebersihan / OB" : "Selamat datang"}
          </p>
          <h2 style={{ fontSize:"1.75rem", fontWeight:800, color:"#0b1329", margin:"0 0 8px 0" }}>
            {user.username} 👋
          </h2>
          <p style={{ fontSize:"0.9rem", color:"#64748b", margin:0, maxWidth:"600px", marginInline:"auto" }}>
            {isPuskesmas
              ? "Akun Anda terdaftar untuk unit Puskesmas. Akses menu Anda dikhususkan untuk pengusulan Standar Harga Satuan (SHS)."
              : isPengurusBarang
              ? "Selamat bertugas Pengurus Barang. Akses menu Anda dikhususkan untuk verifikasi dan penelaahan usulan Standar Harga Satuan (SHS)."
              : isOB
              ? "Akun Anda terdaftar sebagai Petugas Kebersihan. Akses menu Anda dikhususkan untuk Monev Kebersihan dan Peminjaman Ruangan."
              : "Pilih layanan yang ingin Anda gunakan"}
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display:"grid",
          gridTemplateColumns: isSingleMenu ? "1fr" : isOB ? "repeat(auto-fit, minmax(280px, 1fr))" : "repeat(auto-fit, minmax(260px, 1fr))",
          maxWidth: isSingleMenu ? "560px" : isOB ? "720px" : "100%",
          margin: isSingleMenu || isOB ? "0 auto" : undefined,
          gap:"20px"
        }}>
          {cards.map(card => {
            const Icon = card.icon;
            const MetaIcon = card.metaIcon;
            const isHov = hovered === card.id;
            return (
              <button key={card.id} className="dash-card"
                onClick={() => navigate(card.path)}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background:"white",
                  border:`1.5px solid ${isHov ? card.borderHover : "rgba(226,232,240,1)"}`,
                  borderRadius:"20px", padding:"28px",
                  textAlign:"left", cursor:"pointer", outline:"none",
                  position:"relative", overflow:"hidden",
                  transform: isHov ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
                  boxShadow: isHov ? `0 20px 60px -12px ${card.glowColor}, 0 4px 16px rgba(0,0,0,0.06)` : "0 2px 8px rgba(0,0,0,0.04)",
                  transition:"all 0.25s cubic-bezier(0.4,0,0.2,1)",
                }}>
                {/* Glow */}
                <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 30% 30%, ${card.glowColor} 0%, transparent 60%)`, opacity: isHov ? 1 : 0, transition:"opacity 0.3s ease", pointerEvents:"none" }} />
                {/* Top accent */}
                <div style={{ position:"absolute", top:0, left:0, right:0, height:"3px", background:`linear-gradient(90deg, ${card.accentColor}, ${card.accentColor}88)`, opacity: isHov ? 1 : 0, transition:"opacity 0.25s ease", borderRadius:"20px 20px 0 0" }} />
                {/* Icon */}
                <div style={{ width:"52px", height:"52px", borderRadius:"14px", background:card.iconBg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"20px", transform: isHov ? "scale(1.1)" : "scale(1)", transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: isHov ? `0 4px 16px ${card.glowColor}` : "none" }}>
                  <Icon size={24} style={{ color:card.iconColor }} />
                </div>
                {/* Text */}
                <div style={{ position:"relative" }}>
                  <h3 style={{ fontSize:"1.05rem", fontWeight:700, color:"#1e293b", margin:"0 0 8px 0" }}>{card.title}</h3>
                  <p style={{ fontSize:"0.84rem", color:"#64748b", lineHeight:1.6, margin:"0 0 20px 0" }}>{card.desc}</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <MetaIcon size={13} style={{ color:card.accentColor }} />
                      <span style={{ fontSize:"0.75rem", color:card.accentColor, fontWeight:600 }}>{card.meta}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"4px", color:card.accentColor, fontSize:"0.8rem", fontWeight:600, transform: isHov ? "translateX(4px)" : "translateX(0)", transition:"transform 0.2s ease" }}>
                      Buka Layanan <ChevronRight size={15} />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <p style={{ textAlign:"center", marginTop:"40px", fontSize:"0.75rem", color:"#cbd5e1", animation:"fade-up-card 0.5s cubic-bezier(0.4,0,0.2,1) 0.4s both" }}>
          Dinas Kesehatan Kabupaten Pamekasan - SIRUANG v2.0
        </p>
      </main>
    </div>
  );
};

export default Dashboard;