// src/components/SplashScreen.tsx
import { useEffect, useState } from "react";
import logoImage from "@/assets/logo-pamekasan.png";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 900),
      setTimeout(() => setPhase(4), 1300),
      setTimeout(() => setPhase(5), 2400),
      setTimeout(() => onFinish(), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes bar-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #f8faff 0%, #eef4ff 40%, #f0f7ff 100%)",
        opacity: phase === 5 ? 0 : 1,
        transition: phase === 5 ? "opacity 0.5s ease" : "none",
        pointerEvents: phase === 5 ? "none" : "all",
        overflow: "hidden",
      }}>
        {/* Grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: phase >= 1 ? 1 : 0, transition: "opacity 1s ease",
        }} />

        {/* Glow blobs */}
        <div style={{
          position: "absolute", top: "-80px", right: "-80px",
          width: "350px", height: "350px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)",
          opacity: phase >= 1 ? 1 : 0, transition: "opacity 1.5s ease",
        }} />
        <div style={{
          position: "absolute", bottom: "-80px", left: "-80px",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
          opacity: phase >= 1 ? 1 : 0, transition: "opacity 1.5s ease 0.3s",
        }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>

          {/* Logo */}
          <div style={{ position: "relative", width: "120px", height: "120px", marginBottom: "28px" }}>
            {/* Outer dashed ring spinning */}
            <div style={{
              position: "absolute", inset: "-18px", borderRadius: "50%",
              border: "1.5px dashed rgba(59,130,246,0.2)",
              opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.5s ease",
              animation: phase >= 2 ? "spin-slow 12s linear infinite" : "none",
            }} />
            {/* Pulse ring */}
            <div style={{
              position: "absolute", inset: "-6px", borderRadius: "50%",
              border: "2px solid rgba(59,130,246,0.12)",
              opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.5s ease",
              animation: phase >= 2 ? "pulse-ring 2.5s ease-in-out infinite" : "none",
            }} />
            {/* Logo card */}
            <div style={{
              width: "120px", height: "120px", borderRadius: "28px",
              background: "white",
              boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(59,130,246,0.14), 0 0 0 1px rgba(59,130,246,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: phase >= 1 ? 1 : 0,
              transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(30px) scale(0.8)",
              transition: "all 0.7s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              <img src={logoImage} alt="Logo" style={{ width: "72px", height: "72px", objectFit: "contain" }} />
            </div>
            {/* Accent dot */}
            <div style={{
              position: "absolute", top: "-4px", right: "-4px",
              width: "16px", height: "16px", borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              boxShadow: "0 2px 8px rgba(59,130,246,0.4)",
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2 ? "scale(1)" : "scale(0)",
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.2s",
            }} />
          </div>

          {/* App name */}
          <div style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s cubic-bezier(0.4,0,0.2,1) 0.1s",
            marginBottom: "6px",
          }}>
            <h1 style={{
              fontSize: "2.6rem", fontWeight: 800, letterSpacing: "0.1em",
              background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #6366f1 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              margin: 0, lineHeight: 1,
            }}>SIRUANG</h1>
          </div>

          {/* Divider */}
          <div style={{
            height: "2px", borderRadius: "999px",
            background: "linear-gradient(90deg, transparent, #3b82f6 30%, #6366f1 70%, transparent)",
            width: phase >= 3 ? "180px" : "0px",
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
            marginBottom: "16px",
            boxShadow: "0 0 12px rgba(59,130,246,0.3)",
          }} />

          {/* Subtitle */}
          <div style={{
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease 0.15s",
            textAlign: "center", marginBottom: "28px",
          }}>
            <p style={{ fontSize: "0.7rem", color: "#3b82f6", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, margin: 0 }}>
              Sistem Informasi Reservasi Ruangan
            </p>
            <p style={{ fontSize: "0.68rem", color: "#94a3b8", letterSpacing: "0.05em", marginTop: "5px" }}>
              Dinas Kesehatan Kabupaten Pamekasan
            </p>
          </div>

          {/* Progress bar */}
          <div style={{
            width: "160px", height: "3px", borderRadius: "999px",
            background: "rgba(59,130,246,0.1)", overflow: "hidden",
            opacity: phase >= 4 ? 1 : 0, transition: "opacity 0.3s ease",
            marginBottom: "14px",
          }}>
            <div style={{
              height: "100%", borderRadius: "999px",
              background: "linear-gradient(90deg, #3b82f6, #6366f1, #3b82f6)",
              backgroundSize: "200% 100%",
              width: phase >= 4 ? "100%" : "0%",
              transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)",
              animation: phase >= 4 ? "bar-shimmer 1.5s linear infinite" : "none",
            }} />
          </div>

          {/* Dots */}
          <div style={{ display: "flex", gap: "6px", opacity: phase >= 4 ? 1 : 0, transition: "opacity 0.3s ease" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: "5px", height: "5px", borderRadius: "50%", background: "#3b82f6",
                animation: phase >= 4 ? "dot-bounce 1.2s ease-in-out infinite" : "none",
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SplashScreen;