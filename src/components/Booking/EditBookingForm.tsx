import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, Save, X, User } from "lucide-react"; // <-- Tambahkan User icon
import { BookingData } from "./BookingForm";
import { useToast } from "@/hooks/use-toast";

const rooms = [
  "Lantai 1 - Aula Mini",
  "Lantai 2",
  "Lantai 3 - Aula Bhakti Husada"
];

const hours = Array.from({ length: 15 }, (_, i) => (i + 7).toString().padStart(2, '0')); // 07 to 21
const minutes = ["00", "15", "30", "45"];

interface EditBookingFormProps {
  booking: BookingData;
  onSubmit: (data: Omit<BookingData, 'id' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

const EditBookingForm = ({ booking, onSubmit, onCancel }: EditBookingFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    date: booking.date,
    name: booking.name,
    room: booking.room,
    startTime: booking.startTime,
    endTime: booking.endTime,
    description: booking.description
  });

  const [startTimeParts, setStartTimeParts] = useState({
    hour: booking.startTime.slice(0, 2),
    minute: booking.startTime.slice(3, 5)
  });
  const [endTimeParts, setEndTimeParts] = useState({
    hour: booking.endTime.slice(0, 2),
    minute: booking.endTime.slice(3, 5)
  });

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
    
    if (!formData.date || !formData.name || !formData.room || !formData.startTime || !formData.endTime) {
      toast({ title: "Form tidak lengkap", description: "Mohon isi semua field yang diperlukan", variant: "destructive" });
      return;
    }

    if (formData.startTime >= formData.endTime) {
      toast({ title: "Waktu tidak valid", description: "Waktu mulai harus lebih awal dari waktu selesai", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(formData);
    
    if (result.success) {
      toast({ title: "Berhasil", description: "Peminjaman ruangan berhasil diperbarui" });
    } else {
      toast({ title: "Gagal memperbarui", description: result.error || "Terjadi kesalahan", variant: "destructive" });
    }
    
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-date" className="flex items-center space-x-1"><CalendarIcon size={16} /><span>Tanggal</span></Label>
          <Input id="edit-date" type="date" value={formData.date} onChange={(e) => setFormData(p => ({...p, date: e.target.value}))} required className="focus-visible-ring" />
        </div>
        {/* INI BAGIAN YANG DIPERBAIKI */}
        <div className="space-y-2">
          <Label htmlFor="edit-name" className="flex items-center space-x-1">
            <User size={16} />
            <span>Nama Peminjam</span>
          </Label>
          <Input id="edit-name" type="text" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} required className="focus-visible-ring" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-room">Ruangan</Label>
        <Select value={formData.room} onValueChange={(value) => setFormData(p => ({...p, room: value}))}>
          <SelectTrigger className="focus-visible-ring select-trigger"><SelectValue placeholder="Pilih ruangan" /></SelectTrigger>
          <SelectContent>{rooms.map((room) => <SelectItem key={room} value={room}>{room}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center space-x-1"><Clock size={16} /><span>Waktu Mulai</span></Label>
          <div className="flex gap-2">
            <Select value={startTimeParts.hour} onValueChange={(value) => setStartTimeParts(p => ({...p, hour: value}))}>
              <SelectTrigger className="focus-visible-ring select-trigger"><SelectValue placeholder="Jam" /></SelectTrigger>
              <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={startTimeParts.minute} onValueChange={(value) => setStartTimeParts(p => ({...p, minute: value}))}>
              <SelectTrigger className="focus-visible-ring select-trigger"><SelectValue placeholder="Menit" /></SelectTrigger>
              <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center space-x-1"><Clock size={16} /><span>Waktu Selesai</span></Label>
          <div className="flex gap-2">
            <Select value={endTimeParts.hour} onValueChange={(value) => setEndTimeParts(p => ({...p, hour: value}))}>
              <SelectTrigger className="focus-visible-ring select-trigger"><SelectValue placeholder="Jam" /></SelectTrigger>
              <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={endTimeParts.minute} onValueChange={(value) => setEndTimeParts(p => ({...p, minute: value}))}>
              <SelectTrigger className="focus-visible-ring select-trigger"><SelectValue placeholder="Menit" /></SelectTrigger>
              <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-description">Keterangan</Label>
        <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} placeholder="Keterangan tambahan (opsional)" rows={3} className="resize-none focus-visible-ring" />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X size={16} className="mr-2" />Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
          {isSubmitting ? "Memproses..." : <><Save size={16} className="mr-2" />Simpan Perubahan</>}
        </Button>
      </div>
    </form>
  );
};

export default EditBookingForm;
