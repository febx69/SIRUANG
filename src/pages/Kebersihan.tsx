// src/pages/Kebersihan.tsx
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import Header from "@/components/Layout/Header";
import { CleanlinessPanel } from "@/components/Cleanliness/CleanlinessPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";

const Kebersihan = () => {
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
    <div className="min-h-screen bg-slate-50/50">
      <Header user={user} onLogout={logout} />
      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </Button>

        <CleanlinessPanel user={user} />
      </main>
    </div>
  );
};

export default Kebersihan;
