// src/components/PageTransition.tsx
import { useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"in" | "out" | "idle">("idle");

  useEffect(() => {
    // Saat route berubah: fade out dulu, ganti konten, fade in
    setPhase("out");
    const t1 = setTimeout(() => {
      setDisplayChildren(children);
      setPhase("in");
    }, 180);
    const t2 = setTimeout(() => setPhase("idle"), 420);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [location.pathname]);

  // Update children saat idle (tidak ada transisi)
  useEffect(() => {
    if (phase === "idle") setDisplayChildren(children);
  }, [children, phase]);

  const styles: React.CSSProperties = {
    opacity: phase === "out" ? 0 : 1,
    transform: phase === "out"
      ? "translateY(8px)"
      : phase === "in"
      ? "translateY(0)"
      : "translateY(0)",
    transition: phase === "out"
      ? "opacity 0.18s ease, transform 0.18s ease"
      : phase === "in"
      ? "opacity 0.28s cubic-bezier(0.4,0,0.2,1), transform 0.28s cubic-bezier(0.4,0,0.2,1)"
      : "none",
    minHeight: "100vh",
  };

  return <div style={styles}>{displayChildren}</div>;
};

export default PageTransition;
