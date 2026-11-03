// src/pages/Mobil.tsx
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import Header from "@/components/Layout/Header";
import CarBookingPanel from "@/components/Car/CarBookingPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";

const Mobil = () => {
  const { user, logout, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={logout} />
      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </Button>
        <CarBookingPanel user={user} />
      </main>
    </div>
  );
};

export default Mobil;
