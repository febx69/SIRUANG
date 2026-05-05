import { useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import Header from "@/components/Layout/Header";
import BookingList from "@/components/Booking/BookingList";
import EditBookingForm from "@/components/Booking/EditBookingForm";
import { BookingData } from "@/components/Booking/BookingForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom"; // 1. Tambah import Navigate

const Schedule = () => {
  // 2. Pastikan ambil 'isLoading' juga dari hook auth
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
    exportToExcel 
  } = useSupabaseBookings(user);
  
  const [editingBooking, setEditingBooking] = useState<BookingData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEdit = (booking: BookingData) => {
    setEditingBooking(booking);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (updatedData: Omit<BookingData, 'id' | 'createdAt'>) => {
    if (editingBooking) {
      const result = await updateBooking(editingBooking.id, updatedData);
      if (result.success) {
        setIsEditDialogOpen(false);
        setEditingBooking(null);
      }
      return result;
    }
    return { success: false, error: 'No booking selected' };
  };

  // --- BAGIAN PERBAIKAN UTAMA ---
  
  // 3. Tampilkan loading spinner jika status login masih dicek
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 4. JANGAN return null. Pindahkan user ke halaman Login ("/") jika sudah logout
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // --- AKHIR BAGIAN PERBAIKAN ---

  const displayBookings = user.role === 'admin' ? getAllBookings() : getActiveBookings();
  const listTitle = user.role === 'admin' ? 'Semua Peminjaman Ruangan' : 'Peminjaman Aktif';

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={logout} />
      
      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft size={16} /> Kembali ke Form Peminjaman
        </Button>

        <BookingList
          bookings={displayBookings}
          onDelete={user.role === 'admin' ? deleteBooking : undefined}
          onEdit={user.role === 'admin' ? handleEdit : undefined}
          onBulkDelete={user.role === 'admin' ? bulkDeleteByPeriod : undefined}
          onExport={user.role === 'admin' ? exportToExcel : undefined}
          userRole={user.role}
          title={listTitle}
          isLoading={bookingsLoading}
        />
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Peminjaman</DialogTitle>
            <DialogDescription>
              Ubah detail peminjaman ruangan
            </DialogDescription>
          </DialogHeader>
          {editingBooking && (
            <EditBookingForm
              booking={editingBooking}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;