import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, MapPin, Search, Trash2, Edit, Users, Download, Archive, User, Briefcase } from "lucide-react";
import { BookingData } from "./BookingForm";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodOption } from "@/hooks/useSupabaseBookings";
import { supabase } from "@/lib/supabase";

interface BookingListProps {
  bookings: BookingData[];
  onDelete?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onEdit?: (booking: BookingData) => void;
  onBulkDelete?: (period: PeriodOption) => Promise<{ success: boolean; error?: string }>;
  onExport?: (period: PeriodOption) => void;
  userRole: 'admin' | 'user';
  title: string;
  isLoading?: boolean;
}

const seksiOptions = [
  "Subag Umum & Kepegawaian",
  "Subag Perencanaan",
  "Subag Keuangan",
  "Seksi Kesga & Gizi",
  "Seksi Promkes",
  "Seksi Kesling, Kesja & Orkes",
  "Seksi Surveilans & Imunisasi",
  "Seksi P2PM",
  "Seksi P2PTM, Keswa & Napza",
  "Seksi Yankes Primer",
  "Seksi Yankes Rujukan",
  "Seksi Yankes Tradisional",
  "Seksi Farmasi & Mamin",
  "Seksi Alkes & PKRT",
  "Seksi SDMK"
];

const BookingList = ({
  bookings = [],
  onDelete,
  onBulkDelete,
  onExport,
  userRole,
  title,
  isLoading = false
}: BookingListProps) => {
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'specific'>('all');
  const [specificDate, setSpecificDate] = useState<string>("");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BookingData>>({});

  const rooms = ["Lantai 1 - Aula Mini", "Lantai 3 - Aula Bhakti Husada"];
  const hours = Array.from({ length: 15 }, (_, i) => (i + 7).toString().padStart(2, '0')); 
  const minutes = ["00", "15", "30", "45"];

  const availableYears = useMemo(() => {
    if (!Array.isArray(bookings)) return [new Date().getFullYear().toString()];
    const yearsSet = new Set<string>();
    yearsSet.add(new Date().getFullYear().toString());
    bookings.forEach(b => {
      if (b && typeof b.date === 'string' && b.date.length >= 4) {
        yearsSet.add(b.date.substring(0, 4));
      }
    });
    return Array.from(yearsSet).sort((a, b) => parseInt(b) - parseInt(a));
  }, [bookings]);

  const getFormattedDate = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayString = getFormattedDate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = getFormattedDate(tomorrow);

  const formatDateLabel = (d1: string, d2?: string) => {
    try {
      const safeD2 = d2 || d1;
      if (d1 === safeD2) {
        return new Date(d1).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      } else {
        const date1 = new Date(d1).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const date2 = new Date(safeD2).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${date1} s/d ${date2}`;
      }
    } catch {
      return d1;
    }
  };

  const isActiveBooking = (b: BookingData) => {
    try {
      if (!b.date || !b.endTime) return false;
      const bEnd = b.endDate || b.date;
      return new Date(`${bEnd}T${b.endTime}`) > new Date();
    } catch { return false; }
  };

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    
    return bookings.filter(b => {
      if (!b) return false;
      
      if (userRole === 'user' && !isActiveBooking(b)) {
        return false;
      }

      const term = searchTerm.toLowerCase();
      const name = (b.name || "").toLowerCase();
      const seksi = (b.seksi || "").toLowerCase();
      const room = (b.room || "").toLowerCase();
      const desc = (b.description || "").toLowerCase();

      const matchesSearch = name.includes(term) || seksi.includes(term) || room.includes(term) || desc.includes(term);
      if (!matchesSearch) return false;

      const bStart = b.date || "";
      const bEnd = b.endDate || b.date || "";

      if (dateFilter === 'today') return (todayString >= bStart && todayString <= bEnd);
      if (dateFilter === 'tomorrow') return (tomorrowString >= bStart && tomorrowString <= bEnd);
      if (dateFilter === 'specific' && specificDate) return (specificDate >= bStart && specificDate <= bEnd);

      return true;
    }).sort((a, b) => {
      const dateComparison = (b.date || "").localeCompare(a.date || "");
      if (dateComparison !== 0) return dateComparison;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  }, [bookings, searchTerm, dateFilter, specificDate, userRole, todayString, tomorrowString]);

  const handleOpenEdit = (b: BookingData) => {
    setEditForm({
      id: b.id,
      date: b.date,
      endDate: b.endDate || b.date,
      name: b.name,
      seksi: b.seksi,
      room: b.room,
      startTime: b.startTime,
      endTime: b.endTime,
      description: b.description
    });
    setIsEditOpen(true);
  };

  // LOGIKA VALIDASI ADMIN SEBELUM NYIMPEN
  const saveEdit = async () => {
    if (!editForm.id) return;
    setIsSaving(true);
    
    const end = editForm.endDate || editForm.date;

    // VALIDASI ANTI-NABRAK KHUSUS POP-UP ADMIN
    const sTime = (editForm.startTime || "00:00").slice(0, 5);
    const eTime = (editForm.endTime || "00:00").slice(0, 5);

    const isConflict = bookings.some(b => {
      if (b.id === editForm.id) return false; // Abaikan jadwal sendiri yang lagi diedit
      if (b.room !== editForm.room) return false; // Beda ruangan mah bebas

      const bEndDate = b.endDate || b.date;
      const isDateOverlap = (editForm.date! <= bEndDate) && (end! >= b.date);
      
      if (isDateOverlap) {
        const bsTime = (b.startTime || "00:00").slice(0, 5);
        const beTime = (b.endTime || "00:00").slice(0, 5);
        // Cek jam nabrak
        return (
          (sTime >= bsTime && sTime < beTime) ||
          (eTime > bsTime && eTime <= beTime) ||
          (sTime <= bsTime && eTime >= beTime)
        );
      }
      return false;
    });

    if (isConflict) {
      toast({ 
        title: "Gagal Menyimpan", 
        description: "Jadwal ini bertabrakan dengan peminjaman lain di ruangan yang sama!", 
        variant: "destructive" 
      });
      setIsSaving(false);
      return; // STOP! Jangan dilanjutin nyimpen ke database
    }

    const { error } = await supabase.from('bookings').update({
      date: editForm.date,
      end_date: end,
      name: editForm.name,
      seksi: editForm.seksi,
      room: editForm.room,
      start_time: editForm.startTime,
      end_time: editForm.endTime,
      description: editForm.description
    }).eq('id', editForm.id);

    setIsSaving(false);
    
    if (error) {
      toast({ title: "Gagal Update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jadwal berhasil diperbarui." });
      setIsEditOpen(false);
    }
  };

  const handleBulkDelete = async () => {
    if (typeof onBulkDelete !== 'function') return;
    try {
      const y = parseInt(selectedYear);
      const m = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
      const q = selectedQuarter === "all" ? undefined : parseInt(selectedQuarter);

      const result = await onBulkDelete({ year: y, month: m, quarter: q });
      if (result?.success) toast({ title: "Berhasil", description: "Data massal berhasil dihapus" });
      else toast({ title: "Gagal", description: result?.error || "Gagal menghapus", variant: "destructive" });
    } catch (e) {
      toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (typeof onExport !== 'function') return;
    try {
      const y = parseInt(selectedYear);
      const m = selectedMonth === "all" ? undefined : parseInt(selectedMonth);
      const q = selectedQuarter === "all" ? undefined : parseInt(selectedQuarter);
      onExport({ year: y, month: m, quarter: q });
    } catch (e) {
      toast({ title: "Error", description: "Gagal memproses export", variant: "destructive" });
    }
  };

  const handleSingleDelete = async (id: string, name: string) => {
    if (!onDelete) return;
    try {
      const res = await onDelete(id);
      if (res.success) toast({ title: "Terhapus", description: `Jadwal ${name} dihapus` });
      else toast({ title: "Gagal", description: res.error, variant: "destructive" });
    } catch (e) {
      toast({ title: "Error", description: "Gagal menghapus item", variant: "destructive" });
    }
  };

  const getRoomColor = (room: string) => {
    const r = (room || "").toLowerCase();
    if (r.includes('mini')) return 'bg-blue-100 text-blue-800';
    if (r.includes('lantai 2')) return 'bg-green-100 text-green-800';
    if (r.includes('bhakti')) return 'bg-purple-100 text-purple-800 border-none';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <Card className="shadow-government border-none bg-white">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2 text-primary">
                <Users size={20} />
                <span>{title}</span>
              </CardTitle>
              <CardDescription>Total: {filteredBookings.length} jadwal peminjaman</CardDescription>
            </div>
            
            {userRole === 'admin' && (
              <div className="flex flex-wrap gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
                      <Archive size={16} className="mr-2" /> Hapus Data Lama
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Data Massal</AlertDialogTitle>
                      <AlertDialogDescription>Data peminjaman yang dihapus tidak bisa dikembalikan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Tahun</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger className="col-span-3"><SelectValue placeholder="Pilih Tahun" /></SelectTrigger>
                          <SelectContent>
                            {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Bulan</Label>
                        <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); if(v !== "all") setSelectedQuarter("all"); }}>
                          <SelectTrigger className="col-span-3"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Bulan</SelectItem>
                            {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right">Triwulan</Label>
                         <Select value={selectedQuarter} onValueChange={(v) => { setSelectedQuarter(v); if(v !== "all") setSelectedMonth("all"); }}>
                          <SelectTrigger className="col-span-3"><SelectValue placeholder="Semua Triwulan" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Triwulan</SelectItem>
                            <SelectItem value="1">Triwulan 1 (Jan-Mar)</SelectItem>
                            <SelectItem value="2">Triwulan 2 (Apr-Jun)</SelectItem>
                            <SelectItem value="3">Triwulan 3 (Jul-Sep)</SelectItem>
                            <SelectItem value="4">Triwulan 4 (Okt-Des)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">Hapus Sekarang</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground transition-all">
                      <Download size={16} className="mr-2" /> Export Excel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Export Laporan</AlertDialogTitle>
                      <AlertDialogDescription>Unduh rekap peminjaman ruangan dalam format Excel.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Tahun</Label>
                          <Select value={selectedYear} onValueChange={setSelectedYear}>
                              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label className="text-right">Bulan</Label>
                          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); if(v !== "all") setSelectedQuarter("all"); }}>
                              <SelectTrigger className="col-span-3"><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">Semua Bulan</SelectItem>
                                  {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m, i) => <SelectItem key={i+1} value={(i+1).toString()}>{m}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                         <Label className="text-right">Triwulan</Label>
                         <Select value={selectedQuarter} onValueChange={(v) => { setSelectedQuarter(v); if(v !== "all") setSelectedMonth("all"); }}>
                          <SelectTrigger className="col-span-3"><SelectValue placeholder="Semua Triwulan" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Semua Triwulan</SelectItem>
                            <SelectItem value="1">Triwulan 1 (Jan-Mar)</SelectItem>
                            <SelectItem value="2">Triwulan 2 (Apr-Jun)</SelectItem>
                            <SelectItem value="3">Triwulan 3 (Jul-Sep)</SelectItem>
                            <SelectItem value="4">Triwulan 4 (Okt-Des)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleExport}>Download Excel</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full xl:w-1/3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Cari nama pegawai, seksi, ruangan, dll..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9 bg-white focus-visible-ring border-slate-200" 
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <Button variant={dateFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('all'); setSpecificDate(""); }} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-100">
                Semua Jadwal
              </Button>
              <Button variant={dateFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('today'); setSpecificDate(""); }} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-100">
                Hari Ini
              </Button>
              <Button variant={dateFilter === 'tomorrow' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('tomorrow'); setSpecificDate(""); }} className="bg-white text-slate-700 border-slate-200 hover:bg-slate-100">
                Besok
              </Button>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={specificDate}
                  onChange={(e) => {
                    setSpecificDate(e.target.value);
                    if (e.target.value) setDateFilter('specific');
                    else setDateFilter('all');
                  }}
                  className={`h-9 px-3 py-1 text-sm bg-white cursor-pointer focus-visible-ring border-slate-200 ${dateFilter === 'specific' ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
               <div className="space-y-3">
                 <Skeleton className="h-24 w-full rounded-xl"/>
                 <Skeleton className="h-24 w-full rounded-xl"/>
               </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                 <h3 className="text-lg font-medium text-slate-700">Tidak ada jadwal ditemukan</h3>
                 <p className="text-slate-500 mt-1">Coba sesuaikan filter pencarian atau tanggal Anda.</p>
              </div>
            ) : (
              filteredBookings.map((booking, i) => {
                const active = isActiveBooking(booking);
                return (
                  <div key={booking.id || i} className="border border-blue-100 rounded-xl bg-[#f8faff] overflow-hidden">
                    <div className="p-4 flex flex-col gap-3">
                      
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-[15px] text-slate-800">{booking.name}</h3>
                        {booking.seksi && booking.seksi !== "-" && (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                            <Briefcase size={10} /> {booking.seksi}
                          </span>
                        )}
                        <Badge className={`${active ? 'bg-[#3b82f6] hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'} text-white border-none rounded-full px-3 py-0.5 text-xs font-medium`}>
                          {active ? "Akan Datang" : "Selesai"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-blue-400"/>
                          <span className="font-medium text-slate-700">{formatDateLabel(booking.date, booking.endDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-blue-400"/>
                          <span>{booking.startTime?.slice(0,5)} s/d {booking.endTime?.slice(0,5)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-blue-400"/>
                          <Badge variant="secondary" className={`${getRoomColor(booking.room)} font-normal rounded-full px-2.5`}>{booking.room}</Badge>
                        </div>
                      </div>
                      
                      {booking.description && (
                        <div className="mt-2 bg-[#f1f5f9] border border-[#e2e8f0] rounded-md p-2.5 text-[13px] text-slate-600 flex items-center gap-2 w-full">
                          <Edit size={14} className="text-slate-400 shrink-0"/>
                          <span>{booking.description}</span>
                        </div>
                      )}
                    </div>
                    
                    {userRole === 'admin' && (
                      <div className="bg-white px-4 py-3 border-t border-blue-50 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(booking)} className="text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600">
                          <Edit size={14} className="mr-1.5"/> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="outline" size="sm" className="text-red-500 border-slate-200 hover:bg-red-50 hover:text-red-600">
                               <Trash2 size={14} className="mr-1.5"/> Hapus
                             </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Jadwal {booking.name}?</AlertDialogTitle>
                                <AlertDialogDescription>Tindakan ini akan menghapus jadwal secara permanen dari database.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleSingleDelete(booking.id, booking.name)} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl text-primary flex items-center gap-2">
              <Edit size={20}/> Edit Jadwal Peminjaman
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Calendar size={14}/> Tanggal Mulai</Label>
                <Input type="date" value={editForm.date || ""} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="focus-visible-ring" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Calendar size={14}/> Tanggal Selesai</Label>
                <Input type="date" value={editForm.endDate || ""} onChange={(e) => setEditForm({...editForm, endDate: e.target.value})} className="focus-visible-ring" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><User size={14}/> Nama Peminjam</Label>
                <Input value={editForm.name || ""} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="focus-visible-ring" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Briefcase size={14}/> Seksi / Subag</Label>
                <Select value={editForm.seksi || ""} onValueChange={(v) => setEditForm({...editForm, seksi: v})}>
                  <SelectTrigger className="focus-visible-ring"><SelectValue/></SelectTrigger>
                  <SelectContent>{seksiOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MapPin size={14}/> Ruangan</Label>
              <Select value={editForm.room || ""} onValueChange={(v) => setEditForm({...editForm, room: v})}>
                <SelectTrigger className="focus-visible-ring"><SelectValue/></SelectTrigger>
                <SelectContent>{rooms.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <Label className="flex items-center gap-1"><Clock size={14}/> Jam Mulai</Label>
                 <div className="flex gap-2">
                    <Select value={editForm.startTime?.split(':')[0] || ""} onValueChange={(v) => setEditForm({...editForm, startTime: `${v}:${editForm.startTime?.split(':')[1] || '00'}:00`})}>
                      <SelectTrigger className="focus-visible-ring"><SelectValue/></SelectTrigger>
                      <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={editForm.startTime?.split(':')[1] || ""} onValueChange={(v) => setEditForm({...editForm, startTime: `${editForm.startTime?.split(':')[0] || '07'}:${v}:00`})}>
                      <SelectTrigger className="focus-visible-ring"><SelectValue/></SelectTrigger>
                      <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
              </div>
              <div className="space-y-2">
                 <Label className="flex items-center gap-1"><Clock size={14}/> Jam Selesai</Label>
                 <div className="flex gap-2">
                    <Select value={editForm.endTime?.split(':')[0] || ""} onValueChange={(v) => setEditForm({...editForm, endTime: `${v}:${editForm.endTime?.split(':')[1] || '00'}:00`})}>
                      <SelectTrigger className="focus-visible-ring"><SelectValue/></SelectTrigger>
                      <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={editForm.endTime?.split(':')[1] || ""} onValueChange={(v) => setEditForm({...editForm, endTime: `${editForm.endTime?.split(':')[0] || '08'}:${v}:00`})}>
                      <SelectTrigger className="focus-visible-ring"><SelectValue/></SelectTrigger>
                      <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea value={editForm.description || ""} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows={3} className="focus-visible-ring resize-none"/>
            </div>
          </div>
          
          <AlertDialogFooter className="border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={saveEdit} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BookingList;