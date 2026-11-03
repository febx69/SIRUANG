import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Clock, Plus, User, Briefcase, MapPin } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";

export interface BookingData {
  id: string;
  date: string;
  endDate: string;
  name: string;
  seksi: string; // <-- Tambahan kolom seksi
  room: string;
  startTime: string;
  endTime: string;
  description: string;
  createdAt?: string;
  userId?: string | null;
  user_id?: string | null;
}

interface BookingFormProps {
  onSubmit: (booking: Omit<BookingData, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
}

const rooms = [
  "Lantai 1 - Aula Mini",
  "Lantai 3 - Aula Bhakti Husada"
];

// Daftar 15 Seksi & Subag sesuai struktur organisasi Dinkes
const seksiOptions = [
  "Subag Umum & Kepegawaian",
  "Subag Perencanaan",
  "Subag Keuangan",
  "Seksi Kesga & Gizi",
  "Seksi Promkes",
  "Seksi Kesling",
  "Seksi Surveilans",
  "Seksi P2PM",
  "Seksi P2PTM",
  "Seksi Yankes Primer",
  "Seksi Yankes Rujukan",
  "Seksi Yankes Tradisional",
  "Seksi Farmasi",
  "Seksi Alkes",
  "Seksi SDMK"
];

const hours = Array.from({ length: 15 }, (_, i) => (i + 7).toString().padStart(2, '0')); 
const minutes = ["00", "15", "30", "45"];

const BookingForm = ({ onSubmit }: BookingFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    date: "", 
    endDate: "", 
    name: "", 
    seksi: "", // <-- Default kosong
    room: "", 
    startTime: "", 
    endTime: "", 
    description: ""
  });
  
  const [startTimeParts, setStartTimeParts] = useState({ hour: "", minute: "" });
  const [endTimeParts, setEndTimeParts] = useState({ hour: "", minute: "" });

  useEffect(() => {
    if (startTimeParts.hour && startTimeParts.minute) {
      setFormData(prev => ({ ...prev, startTime: `${startTimeParts.hour}:${startTimeParts.minute}:00` }));
    }
  }, [startTimeParts]);

  useEffect(() => {
    if (endTimeParts.hour && endTimeParts.minute) {
      setFormData(prev => ({ ...prev, endTime: `${endTimeParts.hour}:${endTimeParts.minute}:00` }));
    }
  }, [endTimeParts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi pastikan seksi juga wajib diisi
    if (!formData.date || !formData.name || !formData.seksi || !formData.room || !formData.startTime || !formData.endTime) {
      toast({ title: "Form tidak lengkap", description: "Mohon isi semua field yang diperlukan", variant: "destructive" });
      return;
    }
    
    const checkEndDate = formData.endDate || formData.date;
    if (formData.date === checkEndDate && formData.startTime >= formData.endTime) {
      toast({ title: "Waktu tidak valid", description: "Waktu mulai harus lebih awal dari waktu selesai", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    const result = await onSubmit({
        ...formData,
        endDate: formData.endDate || formData.date 
    });
    
    if (result.success) {
      setFormData({ date: "", endDate: "", name: "", seksi: "", room: "", startTime: "", endTime: "", description: "" });
      setStartTimeParts({ hour: "", minute: "" }); 
      setEndTimeParts({ hour: "", minute: "" });
      
      toast({ title: "Berhasil", description: "Peminjaman Ruangan Berhasil Ditambahkan" });
    } else {
      toast({ title: "Gagal Menyimpan", description: result.error, variant: "destructive" });
    }
    
    setIsSubmitting(false);
  };

  return (
    <Card className="shadow-government border-none">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-primary">
          <Plus size={20} />
          <span>Tambah Peminjaman Ruangan</span>
        </CardTitle>
        <CardDescription>
          Isi formulir di bawah untuk menambahkan peminjaman ruangan baru
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* KOLOM TANGGAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4 border-gray-100">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center space-x-1">
                <CalendarIcon size={16} />
                <span>Tanggal Mulai</span>
              </Label>
              <Input 
                id="date" 
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData(p => ({...p, date: e.target.value, endDate: p.endDate || e.target.value}))} 
                required 
                className="focus-visible-ring bg-slate-50" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center space-x-1">
                <CalendarIcon size={16} />
                <span>Tanggal Selesai</span>
              </Label>
              <Input 
                id="endDate" 
                type="date" 
                value={formData.endDate} 
                onChange={(e) => setFormData(p => ({...p, endDate: e.target.value}))} 
                min={formData.date} 
                required 
                className="focus-visible-ring bg-slate-50" 
              />
            </div>
          </div>

          {/* KOLOM NAMA & SEKSI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center space-x-1">
                <User size={16} />
                <span>Nama Pegawai</span>
              </Label>
              <Input 
                id="name" 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} 
                placeholder="Masukkan nama peminjam" 
                required 
                className="focus-visible-ring bg-slate-50" 
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center space-x-1">
                <Briefcase size={16} />
                <span>Seksi / Subag</span>
              </Label>
              <Select value={formData.seksi} onValueChange={(value) => setFormData(p => ({...p, seksi: value}))}>
                <SelectTrigger className="focus-visible-ring select-trigger bg-slate-50">
                  <SelectValue placeholder="Pilih Seksi/Subag" />
                </SelectTrigger>
                <SelectContent>
                  {seksiOptions.map((seksi) => <SelectItem key={seksi} value={seksi}>{seksi}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KOLOM RUANGAN (Full Width) */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-1">
              <MapPin size={16} />
              <span>Ruangan</span>
            </Label>
            <Select value={formData.room} onValueChange={(value) => setFormData(p => ({...p, room: value}))}>
              <SelectTrigger className="focus-visible-ring select-trigger bg-slate-50">
                <SelectValue placeholder="Pilih ruangan" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => <SelectItem key={room} value={room}>{room}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* KOLOM WAKTU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center space-x-1"><Clock size={16} /><span>Waktu Mulai</span></Label>
              <div className="flex gap-2">
                <Select value={startTimeParts.hour} onValueChange={(value) => setStartTimeParts(p => ({...p, hour: value}))}>
                  <SelectTrigger className="focus-visible-ring select-trigger bg-slate-50"><SelectValue placeholder="Jam" /></SelectTrigger>
                  <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={startTimeParts.minute} onValueChange={(value) => setStartTimeParts(p => ({...p, minute: value}))}>
                  <SelectTrigger className="focus-visible-ring select-trigger bg-slate-50"><SelectValue placeholder="Menit" /></SelectTrigger>
                  <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center space-x-1"><Clock size={16} /><span>Waktu Selesai</span></Label>
              <div className="flex gap-2">
                <Select value={endTimeParts.hour} onValueChange={(value) => setEndTimeParts(p => ({...p, hour: value}))}>
                  <SelectTrigger className="focus-visible-ring select-trigger bg-slate-50"><SelectValue placeholder="Jam" /></SelectTrigger>
                  <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={endTimeParts.minute} onValueChange={(value) => setEndTimeParts(p => ({...p, minute: value}))}>
                  <SelectTrigger className="focus-visible-ring select-trigger bg-slate-50"><SelectValue placeholder="Menit" /></SelectTrigger>
                  <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* KOLOM KETERANGAN */}
          <div className="space-y-2">
            <Label htmlFor="description">Keterangan</Label>
            <Textarea 
              id="description" 
              value={formData.description} 
              onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} 
              placeholder="Acara rapat apa? (opsional)" 
              rows={2} 
              className="resize-none focus-visible-ring bg-slate-50" 
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 transition-all duration-300 transform hover:scale-[1.02] text-white">
            {isSubmitting ? "Memproses..." : <><Plus size={16} className="mr-2" />Simpan Peminjaman</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;