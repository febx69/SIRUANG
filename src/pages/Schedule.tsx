// src/pages/Schedule.tsx
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import Header from "@/components/Layout/Header";
import BookingList from "@/components/Booking/BookingList";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";

const Schedule = () => {
  const { user, logout, isLoading: authLoading } = useSupabaseAuth(); 
  const navigate = useNavigate();
  
  const { 
    bookings,
    isLoading: bookingsLoading,
    updateBooking, 
    deleteBooking, 
    bulkDeleteByPeriod, 
    getActiveBookings, 
    getAllBookings, 
    exportToExcel,
    canModify
  } = useSupabaseBookings(user);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'admin';
  const isBidang = user.role === 'bidang';
  const displayBookings = (isAdmin || isBidang) ? getAllBookings() : getActiveBookings();
  const listTitle = isAdmin ? 'Semua Peminjaman Ruangan (Admin)' : 'Jadwal Peminjaman Ruangan';

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={logout} />
      
      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/ruangan")} 
            className="gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium"
          >
            <ArrowLeft size={16} /> Kembali ke Form Peminjaman
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/")} 
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border-slate-200 shadow-sm"
          >
            <Home size={14} /> Beranda
          </Button>
        </div>

        <BookingList
          bookings={displayBookings}
          onDelete={deleteBooking}
          onUpdate={updateBooking}
          onBulkDelete={user.role === 'admin' ? bulkDeleteByPeriod : undefined}
          onExport={user.role === 'admin' ? exportToExcel : undefined}
          userRole={user.role}
          currentUserId={user.id}
          canModify={canModify}
          title={listTitle}
          isLoading={bookingsLoading}
        />
      </main>
    </div>
  );
};

export default Schedule;