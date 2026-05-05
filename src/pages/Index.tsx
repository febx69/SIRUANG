import { useState, useMemo } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseBookings } from "@/hooks/useSupabaseBookings";
import LoginForm from "@/components/Auth/LoginForm";
import Header from "@/components/Layout/Header";
import BookingForm, { BookingData } from "@/components/Booking/BookingForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// PERBAIKAN FATAL: MapPin dan Briefcase sudah ditambahkan di sini!
import { CalendarDays, MessageSquare, Inbox, Trash2, Monitor, Reply, CornerDownRight, Users, Projector, Mic, Cable, Plug, TrendingUp, MapPin, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, login, logout, isLoading: authLoading } = useSupabaseAuth();
  const { bookings, addBooking, updateBooking, deleteBooking, bulkDeleteByPeriod, exportToExcel, getActiveBookings, getAllBookings, isLoading } = useSupabaseBookings(user);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSubmitFeedbackOpen, setIsSubmitFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [isViewFeedbackOpen, setIsViewFeedbackOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isFacilitiesOpen, setIsFacilitiesOpen] = useState(false);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    return await login(username, password);
  };

  const handleBookingSubmit = async (bookingData: Omit<BookingData, 'id' | 'createdAt'>) => {
    return await addBooking(bookingData);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    
    const { error } = await supabase.from('feedbacks').insert({
      message: feedbackText
    });
    
    setIsSubmittingFeedback(false);
    
    if (!error) {
      toast({ title: "Terima kasih!", description: "Kritik dan saran Anda telah terkirim." });
      setIsSubmitFeedbackOpen(false);
      setFeedbackText(""); 
    } else {
      toast({ title: "Gagal Mengirim", description: error.message, variant: "destructive" });
    }
  };

  const fetchFeedbacks = async () => {
    setIsLoadingFeedbacks(true);
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false }); 
      
    if (!error && data) {
      setFeedbacks(data);
    }
    setIsLoadingFeedbacks(false);
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from('feedbacks').delete().eq('id', id);
    if (!error) {
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      toast({ title: "Terhapus", description: "Pesan berhasil dihapus." });
    }
  };

  const handleReplySubmit = async (id: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    
    const { error } = await supabase.from('feedbacks').update({ admin_reply: replyText }).eq('id', id);
    
    setIsSubmittingReply(false);

    if (!error) {
      toast({ title: "Berhasil", description: "Balasan berhasil disimpan." });
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, admin_reply: replyText } : f));
      setReplyingTo(null);
      setReplyText("");
    } else {
      toast({ title: "Gagal Membalas", description: error.message, variant: "destructive" });
    }
  };

  // --- LOGIKA MENGHITUNG STATISTIK REALTIME (KHUSUS ADMIN) ---
  const stats = useMemo(() => {
    if (!bookings || bookings.length === 0) {
      return { total: 0, topRoom: "-", topRoomCount: 0, topSeksi: "-", topSeksiCount: 0 };
    }

    const roomCounts: Record<string, number> = {};
    const seksiCounts: Record<string, number> = {};

    bookings.forEach(b => {
      // Hitung ruangan (pastikan string valid agar tidak undefined)
      if (b.room) {
        roomCounts[b.room] = (roomCounts[b.room] || 0) + 1;
      }
      // Hitung seksi (abaikan jika kosong atau "-")
      if (b.seksi && b.seksi !== "-") {
        seksiCounts[b.seksi] = (seksiCounts[b.seksi] || 0) + 1;
      }
    });

    // Cari yang paling banyak
    const topRoom = Object.keys(roomCounts).sort((a, b) => roomCounts[b] - roomCounts[a])[0];
    const topSeksi = Object.keys(seksiCounts).sort((a, b) => seksiCounts[b] - seksiCounts[a])[0];

    return {
      total: bookings.length,
      topRoom: topRoom || "-",
      topRoomCount: roomCounts[topRoom] || 0,
      topSeksi: topSeksi || "-",
      topSeksiCount: seksiCounts[topSeksi] || 0,
    };
  }, [bookings]);

  if (authLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  if (!user) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={logout} />
      
      <main className="container mx-auto px-4 py-6 space-y-6 animate-fade-in">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsFacilitiesOpen(true)} className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white shadow-sm transition-all">
              <Monitor className="mr-2 h-4 w-4" /> Fasilitas Ruangan
            </Button>

            <Button variant="outline" onClick={() => setIsSubmitFeedbackOpen(true)} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-white shadow-sm transition-all">
              <MessageSquare className="mr-2 h-4 w-4" /> Kirim Masukan
            </Button>
            
            <Button variant="outline" onClick={() => { setIsViewFeedbackOpen(true); fetchFeedbacks(); }} className="text-amber-600 border-amber-200 hover:bg-amber-50 bg-white shadow-sm transition-all">
              <Inbox className="mr-2 h-4 w-4" /> Papan Aspirasi
            </Button>
          </div>

          <div className="flex justify-end">
              <Button onClick={() => navigate("/jadwal")} className="gap-2 bg-[#3b82f6] hover:bg-blue-600 text-white shadow-sm">
                  <CalendarDays size={18} /> Lihat Jadwal Ruangan
              </Button>
          </div>
        </div>

        {/* --- TAMPILAN STATISTIK KHUSUS ADMIN --- */}
        {user.role === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 animate-in fade-in slide-in-from-bottom-2">
            
            {/* Total Peminjaman */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0 flex items-center h-full">
                <div className="bg-blue-50 p-4 h-full flex items-center justify-center border-r border-slate-100">
                  <TrendingUp className="text-blue-500 h-6 w-6" />
                </div>
                <div className="p-4 py-3">
                  <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">Total Peminjaman</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.total} <span className="text-sm font-normal text-slate-400">kali</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Ruangan Terfavorit */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0 flex items-center h-full">
                <div className="bg-emerald-50 p-4 h-full flex items-center justify-center border-r border-slate-100">
                  <MapPin className="text-emerald-500 h-6 w-6" />
                </div>
                <div className="p-4 py-3 overflow-hidden w-full">
                  <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider truncate">Ruangan Terfavorit</p>
                  <p className="text-[15px] font-bold text-slate-800 truncate mt-1" title={stats.topRoom}>{stats.topRoom}</p>
                  <p className="text-[12px] text-emerald-600 font-medium">{stats.topRoomCount} peminjaman</p>
                </div>
              </CardContent>
            </Card>

            {/* Seksi Teraktif */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0 flex items-center h-full">
                <div className="bg-amber-50 p-4 h-full flex items-center justify-center border-r border-slate-100">
                  <Briefcase className="text-amber-500 h-6 w-6" />
                </div>
                <div className="p-4 py-3 overflow-hidden w-full">
                  <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider truncate">Seksi Teraktif</p>
                  <p className="text-[15px] font-bold text-slate-800 truncate mt-1" title={stats.topSeksi}>{stats.topSeksi}</p>
                  <p className="text-[12px] text-amber-600 font-medium">{stats.topSeksiCount} kali pinjam</p>
                </div>
              </CardContent>
            </Card>

          </div>
        )}

        <BookingForm onSubmit={handleBookingSubmit} />
      </main>

      {/* ========================================================================= */}
      {/* POP-UP: FASILITAS RUANGAN */}
      {/* ========================================================================= */}
      <AlertDialog open={isFacilitiesOpen} onOpenChange={setIsFacilitiesOpen}>
        <AlertDialogContent className="sm:max-w-2xl bg-slate-50">
          <AlertDialogHeader className="pb-2 border-b border-slate-200">
            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
              <Monitor size={20}/> Fasilitas Ruangan Dinkes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Informasi ketersediaan alat dan fasilitas di masing-masing ruangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            
            {/* AULA MINI */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-[16px] text-slate-800 border-b border-slate-100 pb-2 mb-3">
                Lantai 1 - Aula Mini
              </h3>
              <ul className="text-[14px] text-slate-600 space-y-3 mt-2">
                <li className="flex items-start gap-3">
                  <Users size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Kapasitas:</strong> 20 - 25 Orang</span>
                </li>
                <li className="flex items-start gap-3">
                  <Monitor size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Layar:</strong> Monitor 75 Inch</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mic size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Audio:</strong> Sound System & 2 buah Mikrofon</span>
                </li>
                <li className="flex items-start gap-3">
                  <Cable size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Konektivitas:</strong> Kabel HDMI</span>
                </li>
                <li className="flex items-start gap-3">
                  <Plug size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Listrik:</strong> Stop Kontak (Tersedia colokan terintegrasi di setiap meja rapat)</span>
                </li>
              </ul>
            </div>

            {/* AULA BHAKTI HUSADA */}
            <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-[16px] text-slate-800 border-b border-slate-100 pb-2 mb-3">
                Lantai 3 - Aula Bhakti Husada
              </h3>
              <ul className="text-[14px] text-slate-600 space-y-3 mt-2">
                <li className="flex items-start gap-3">
                  <Users size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Kapasitas:</strong> 45 - 50 Orang</span>
                </li>
                <li className="flex items-start gap-3">
                  <Projector size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Layar:</strong> LCD Proyektor</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mic size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Audio:</strong> Sound System & 2 buah Mikrofon</span>
                </li>
                <li className="flex items-start gap-3">
                  <Cable size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Konektivitas:</strong> Kabel HDMI</span>
                </li>
                <li className="flex items-start gap-3">
                  <Plug size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Listrik:</strong> Stop Kontak (4 Lubang)</span>
                </li>
              </ul>
            </div>

          </div>

          <AlertDialogFooter className="border-t border-slate-200 pt-4">
            <AlertDialogCancel onClick={() => setIsFacilitiesOpen(false)} className="w-full sm:w-auto">Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* POP-UP UNTUK USER: KIRIM KRITIK & SARAN */}
      {/* ========================================================================= */}
      <AlertDialog open={isSubmitFeedbackOpen} onOpenChange={setIsSubmitFeedbackOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
              <MessageSquare size={20}/> Kirim Kritik & Saran
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-slate-500">
              Pesan dikirim secara anonim (rahasia). Sampaikan keluhan, masukan, atau ide fitur baru untuk aplikasi SIRUANG di sini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea 
              rows={5} 
              placeholder="Ketik pesan Anda di sini..." 
              value={feedbackText} 
              onChange={e => setFeedbackText(e.target.value)} 
              className="bg-slate-50 resize-none focus-visible-ring" 
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsSubmitFeedbackOpen(false)}>Batal</AlertDialogCancel>
            <Button onClick={submitFeedback} disabled={isSubmittingFeedback || !feedbackText.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmittingFeedback ? "Mengirim..." : "Kirim Pesan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================================= */}
      {/* POP-UP PAPAN ASPIRASI (BISA DILIHAT SEMUA ORANG) */}
      {/* ========================================================================= */}
      <AlertDialog open={isViewFeedbackOpen} onOpenChange={setIsViewFeedbackOpen}>
        <AlertDialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col bg-slate-50">
          <AlertDialogHeader className="pb-4 border-b border-slate-200">
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Inbox size={20}/> Papan Aspirasi
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-[13px]">
              Daftar masukan anonim dari pegawai beserta tanggapan/status dari Admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 py-2 space-y-4">
            {isLoadingFeedbacks ? (
              <div className="text-center py-10 text-slate-400 animate-pulse">Memuat pesan...</div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-white">
                <Inbox size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">Belum ada aspirasi atau masukan yang masuk.</p>
              </div>
            ) : (
              feedbacks.map((f, index) => (
                <div key={f.id || index} className="p-4 bg-white rounded-lg border border-slate-200 relative group shadow-sm">
                  
                  <div className="pr-8">
                    <p className="text-[12px] text-slate-500 mb-2 font-medium flex items-center gap-2">
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Pesan Anonim</span> 
                      <span>•</span>
                      <span>{new Date(f.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                    </p>
                    <p className="text-[14px] text-slate-700 whitespace-pre-wrap leading-relaxed">{f.message}</p>
                  </div>

                  {user.role === 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={() => deleteFeedback(f.id)}
                      title="Hapus Pesan"
                    >
                      <Trash2 size={15}/>
                    </Button>
                  )}

                  {f.admin_reply ? (
                    <div className="mt-4 bg-amber-50 p-3 rounded-md border border-amber-100 flex gap-2">
                      <CornerDownRight size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[12px] font-bold text-amber-700 mb-1">Status / Balasan Admin:</p>
                        <p className="text-[13px] text-amber-900 leading-relaxed whitespace-pre-wrap">{f.admin_reply}</p>
                      </div>
                    </div>
                  ) : (
                    user.role === 'admin' && (
                      replyingTo === f.id ? (
                        <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-200 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                          <Textarea
                            placeholder="Ketik balasan atau status tindak lanjut..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="text-[13px] bg-white focus-visible-ring resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => { setReplyingTo(null); setReplyText(""); }} className="h-8">Batal</Button>
                            <Button size="sm" onClick={() => handleReplySubmit(f.id)} disabled={isSubmittingReply || !replyText.trim()} className="bg-amber-600 hover:bg-amber-700 text-white h-8">
                              {isSubmittingReply ? "Menyimpan..." : "Simpan Balasan"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-3 text-amber-600 hover:bg-amber-50 hover:text-amber-700 h-8 px-2" 
                          onClick={() => { setReplyingTo(f.id); setReplyText(""); }}
                        >
                          <Reply size={14} className="mr-1.5" /> Beri Balasan / Status
                        </Button>
                      )
                    )
                  )}

                </div>
              ))
            )}
          </div>
          <AlertDialogFooter className="border-t border-slate-200 pt-4">
             <AlertDialogCancel onClick={() => setIsViewFeedbackOpen(false)}>Tutup</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Index;