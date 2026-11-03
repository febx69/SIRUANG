// src/pages/RuanganPage.tsx  ← FILE BARU untuk halaman peminjaman ruangan
import { Navigate, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import LoginForm from "@/components/Auth/LoginForm";
import BookingForm from "@/components/Booking/BookingForm";
import BookingList from "@/components/Booking/BookingList";
import Header from "@/components/Layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays } from "lucide-react";

const RuanganPage = () => {
  const { user, login, logout, isLoading: authLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  const {
    bookings,
    isLoading: bookingsLoading,
    addBooking,
    updateBooking,
    deleteBooking,
    bulkDeleteByPeriod,
    getActiveBookings,
    getAllBookings,
    exportToExcel,
    canModify,
  } = useSupabaseBookings(user);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const isAdmin = user.role === "admin";
  const isBidang = user.role === "bidang";

  const displayBookings =
    isAdmin || isBidang ? getAllBookings() : getActiveBookings();

  const listTitle =
    isAdmin
      ? "Semua Peminjaman Ruangan"
      : isBidang
      ? "Jadwal Peminjaman Ruangan"
      : "Peminjaman Aktif";

  const canDeleteOrEdit = isAdmin || isBidang;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={logout} />

      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Nav atas */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/pilih")}
            className="gap-2"
          >
            <ArrowLeft size={16} /> Kembali ke Pilihan Layanan
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/jadwal")}
            className="gap-2"
          >
            <CalendarDays size={16} /> Lihat Jadwal Lengkap
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Kolom kiri: Form tambah booking */}
          <div>
            <BookingForm onSubmit={addBooking} />
          </div>

          {/* Kolom kanan: Daftar booking */}
          <div>
            <BookingList
              bookings={displayBookings}
              onDelete={canDeleteOrEdit ? deleteBooking : undefined}
              onUpdate={canDeleteOrEdit ? updateBooking : undefined}
              onBulkDelete={isAdmin ? bulkDeleteByPeriod : undefined}
              onExport={isAdmin ? exportToExcel : undefined}
              userRole={user.role}
              currentUserId={user.id}
              canModify={canModify}
              title={listTitle}
              isLoading={bookingsLoading}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default RuanganPage;