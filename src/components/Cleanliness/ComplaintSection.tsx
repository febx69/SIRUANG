// src/components/Cleanliness/ComplaintSection.tsx
import { useState } from "react";
import { CleanlinessComplaint } from "@/hooks/useCleanliness";
import { User } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Plus,
  Upload,
  Camera,
  Calendar,
  Clock,
  User as UserIcon,
  Trash2,
  CheckCircle2,
  Building2,
  Layers,
  Wrench,
  CheckCircle,
  ImageIcon,
  X,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { LightboxPhotoInfo } from "./PhotoLightboxModal";
import { formatBytes } from "@/lib/imageCompression";
import { useToast } from "@/hooks/use-toast";

interface ComplaintSectionProps {
  user: User;
  complaints: CleanlinessComplaint[];
  isLoading: boolean;
  onAddComplaint: (payload: {
    reporter_name: string;
    bidang: string;
    floor: string;
    description: string;
    files: File[];
  }) => Promise<boolean>;
  onUpdateStatus: (
    complaintId: string,
    payload: {
      status: 'pending' | 'in_progress' | 'resolved';
      handler_name?: string;
      handler_notes?: string;
      files?: File[];
    }
  ) => Promise<boolean>;
  onDeleteComplaint: (complaintId: string, photos: string[]) => Promise<boolean>;
  onOpenPhoto: (photo: LightboxPhotoInfo) => void;
  isOBUser: boolean;
}

const seksiOptions = [
  "Subag Umum & Kepegawaian", "Subag Perencanaan", "Subag Keuangan",
  "Seksi Kesga & Gizi", "Seksi Promkes", "Seksi Kesling",
  "Seksi Surveilans", "Seksi P2PM", "Seksi P2PTM",
  "Seksi Yankes Primer", "Seksi Yankes Rujukan", "Seksi Yankes Tradisional",
  "Seksi Farmasi", "Seksi Alkes", "Seksi SDMK", "Lainnya"
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  in_progress: { label: 'Sedang Dikerjakan', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Wrench },
  resolved: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
};

export const ComplaintSection = ({
  user,
  complaints,
  isLoading,
  onAddComplaint,
  onUpdateStatus,
  onDeleteComplaint,
  onOpenPhoto,
  isOBUser
}: ComplaintSectionProps) => {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form pengaduan baru
  const [reporterName, setReporterName] = useState(user.username || "");
  const [bidang, setBidang] = useState(seksiOptions[0]);
  const [floor, setFloor] = useState("Lantai 1");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; size: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal respon penanganan (OB / Admin)
  const [selectedComplaintForResolve, setSelectedComplaintForResolve] = useState<CleanlinessComplaint | null>(null);
  const [handlerName, setHandlerName] = useState(user.username || "");
  const [handlerNotes, setHandlerNotes] = useState("");
  const [resolutionFiles, setResolutionFiles] = useState<{ file: File; preview: string; size: number }[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const resetForm = () => {
    setReporterName(user.username || "");
    setBidang(seksiOptions[0]);
    setFloor("Lantai 1");
    setDescription("");
    selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const totalCount = selectedFiles.length + filesArray.length;

    if (totalCount > 10) {
      toast({
        title: "Batas Maksimal 10 Foto",
        description: "Hanya 10 foto pertama yang akan dimasukkan ke pengaduan.",
        variant: "destructive"
      });
    }

    const availableSlots = Math.max(0, 10 - selectedFiles.length);
    const validFiles = filesArray.slice(0, availableSlots).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      size: file.size,
    }));

    setSelectedFiles(prev => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleResolutionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const totalCount = resolutionFiles.length + filesArray.length;

    if (totalCount > 10) {
      toast({
        title: "Batas Maksimal 10 Foto",
        description: "Hanya 10 foto pertama yang akan dimasukkan sebagai bukti selesai.",
        variant: "destructive"
      });
    }

    const availableSlots = Math.max(0, 10 - resolutionFiles.length);
    const validFiles = filesArray.slice(0, availableSlots).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      size: file.size,
    }));

    setResolutionFiles(prev => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const removeResolutionFile = (index: number) => {
    setResolutionFiles(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reporterName.trim()) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Nama pelapor wajib diisi.",
        variant: "destructive"
      });
      return;
    }

    if (!bidang.trim()) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Bidang / Seksi pelapor wajib dipilih.",
        variant: "destructive"
      });
      return;
    }

    if (!floor) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Lantai lokasi keluhan wajib dipilih.",
        variant: "destructive"
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Keterangan keluhan kebersihan wajib diisi (tidak boleh kosong).",
        variant: "destructive"
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "Foto Bukti Wajib Dilampirkan",
        description: "Harap lampirkan minimal 1 foto bukti keluhan kebersihan.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    const ok = await onAddComplaint({
      reporter_name: reporterName,
      bidang,
      floor,
      description,
      files: selectedFiles.map(f => f.file),
    });
    setIsSubmitting(false);

    if (ok) {
      resetForm();
      setIsFormOpen(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintForResolve) return;

    if (!handlerName.trim()) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Nama petugas penanganan wajib diisi.",
        variant: "destructive"
      });
      return;
    }

    if (!handlerNotes.trim()) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Catatan penyelesaian wajib diisi (tidak boleh kosong).",
        variant: "destructive"
      });
      return;
    }

    if (resolutionFiles.length === 0) {
      toast({
        title: "Foto Bukti Wajib Dilampirkan",
        description: "Harap lampirkan minimal 1 foto bukti setelah dibersihkan.",
        variant: "destructive"
      });
      return;
    }

    setIsResolving(true);
    const ok = await onUpdateStatus(selectedComplaintForResolve.id, {
      status: 'resolved',
      handler_name: handlerName,
      handler_notes: handlerNotes,
      files: resolutionFiles.map(f => f.file),
    });
    setIsResolving(false);

    if (ok) {
      setSelectedComplaintForResolve(null);
      setHandlerNotes("");
      resolutionFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setResolutionFiles([]);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesQuery =
      !searchQuery ||
      c.reporter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bidang.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.floor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Pengaduan & Titik Kebersihan
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Laporkan area atau fasilitas kotor/rusak agar segera ditindaklanjuti oleh petugas kebersihan (OB).
          </p>
        </div>

        {/* Tombol Buat Pengaduan */}
        <Button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm text-xs h-9 shrink-0"
        >
          <Plus size={15} /> Buat Pengaduan Baru
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white h-9 text-xs">
              <SelectValue placeholder="Status Pengaduan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
              <SelectItem value="resolved">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          placeholder="Cari pelapor, bidang, lantai, atau masalah..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full sm:w-[320px] bg-white h-9 text-xs"
        />
      </div>

      {/* List Pengaduan */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-xs">Memuat daftar pengaduan...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <CheckCircle size={36} className="text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Tidak Ada Pengaduan Aktif</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Semua area kantor dalam kondisi baik atau pengaduan telah diselesaikan.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map(complaint => {
            const sc = statusConfig[complaint.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            const canDelete = user.role === 'admin' || user.id === complaint.user_id;
            const canRespond = isOBUser || user.role === 'admin';

            return (
              <Card
                key={complaint.id}
                className="border border-slate-200/80 bg-white hover:border-blue-200 transition-all rounded-2xl overflow-hidden shadow-sm"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Info Pelapor & Keluhan */}
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${sc.color} border text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1`}>
                          <StatusIcon size={12} /> {sc.label}
                        </Badge>
                        <Badge variant="outline" className="text-slate-600 bg-slate-50 text-xs px-2.5 py-0.5 rounded-full">
                          <Layers size={11} className="mr-1" /> {complaint.floor}
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={11} /> {complaint.date} {complaint.time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <UserIcon size={13} className="text-primary" /> {complaint.reporter_name}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Building2 size={13} className="text-slate-400" /> {complaint.bidang}
                        </span>
                      </div>

                      {/* Keterangan keluhan bebas */}
                      <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                        <p className="font-semibold text-slate-800 mb-0.5">Keluhan / Temuan:</p>
                        {complaint.description}
                      </div>

                      {/* Foto Lampiran Keluhan (hingga 10 foto) */}
                      {complaint.photos && complaint.photos.length > 0 && (
                        <div className="pt-1">
                          <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <ImageIcon size={12} className="text-amber-500" />
                              Foto Bukti Keluhan ({complaint.photos.length})
                            </span>
                            <span className="text-[10px] text-primary font-normal">Klik untuk zoom</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {complaint.photos.map((photoUrl, idx) => (
                              <div
                                key={idx}
                                onClick={() =>
                                  onOpenPhoto({
                                    url: photoUrl,
                                    title: `Pengaduan: ${complaint.floor}`,
                                    subtitle: `Oleh ${complaint.reporter_name} (${complaint.bidang}) · ${complaint.date}`,
                                    note: complaint.description,
                                  })
                                }
                                className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-primary hover:shadow transition-all bg-slate-100 shrink-0"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Bukti ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Catatan & Foto Selesai (Jika resolved) */}
                      {complaint.status === 'resolved' && (
                        <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-900 mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              Telah Ditindaklanjuti oleh: {complaint.handler_name || 'Petugas OB'}
                            </span>
                            {complaint.resolved_at && (
                              <span className="text-[10px] text-emerald-700">
                                {new Date(complaint.resolved_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                          {complaint.handler_notes && (
                            <p className="text-[11px] text-emerald-800">{complaint.handler_notes}</p>
                          )}

                          {complaint.resolution_photos && complaint.resolution_photos.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[10px] font-semibold text-emerald-800 block mb-1">
                                Foto Bukti Selesai:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {complaint.resolution_photos.map((resUrl, rIdx) => (
                                  <div
                                    key={rIdx}
                                    onClick={() =>
                                      onOpenPhoto({
                                        url: resUrl,
                                        title: `Bukti Penanganan Selesai - ${complaint.floor}`,
                                        subtitle: `Ditangani oleh: ${complaint.handler_name}`,
                                        note: complaint.handler_notes,
                                      })
                                    }
                                    className="w-14 h-14 rounded-lg overflow-hidden border border-emerald-300 cursor-pointer hover:shadow-md transition-all shrink-0"
                                  >
                                    <img
                                      src={resUrl}
                                      alt="Bukti Selesai"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tombol Aksi Kanan */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      {/* Aksi OB / Admin: Cukup satu tombol Selesai */}
                      {canRespond && complaint.status !== 'resolved' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedComplaintForResolve(complaint);
                            setHandlerName(user.username || "");
                            setHandlerNotes("");
                            setResolutionFiles([]);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1 shadow-sm"
                        >
                          <CheckCircle2 size={13} /> Selesai
                        </Button>
                      )}

                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs h-8 gap-1"
                            >
                              <Trash2 size={13} /> Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Pengaduan Ini?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Pengaduan beserta foto-foto terkait akan dihapus secara permanen.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  onDeleteComplaint(
                                    complaint.id,
                                    [...(complaint.photos || []), ...(complaint.resolution_photos || [])]
                                  )
                                }
                                className="bg-rose-600 hover:bg-rose-700"
                              >
                                Ya, Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL BUAT PENGADUAN */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <AlertTriangle size={20} className="text-amber-500" /> Form Pengaduan Kebersihan
            </DialogTitle>
            <DialogDescription>
              Sampaikan pengaduan kondisi lantai atau fasilitas yang perlu dibersihkan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>Semua kolom bertanda bintang (<span className="text-rose-500 font-bold">*</span>) serta minimal 1 foto bukti keluhan wajib diisi sebelum mengirim pengaduan.</span>
            </div>

            {/* Nama Pelapor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Nama Pelapor <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                placeholder="Nama Anda..."
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                required
                className="bg-slate-50 text-xs h-9"
              />
            </div>

            {/* Bidang / Seksi */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Bidang / Seksi <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Select value={bidang} onValueChange={setBidang}>
                <SelectTrigger className="bg-slate-50 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seksiOptions.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lantai Berapa */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Lantai Berapa <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Select value={floor} onValueChange={setFloor}>
                <SelectTrigger className="bg-slate-50 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lantai 1">Lantai 1</SelectItem>
                  <SelectItem value="Lantai 2">Lantai 2</SelectItem>
                  <SelectItem value="Lantai 3">Lantai 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Keterangan ngetik bebas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Keterangan Keluhan <span className="text-rose-500 font-bold">*</span>
                <span className="text-slate-400 font-normal text-[11px]">(Ngetik Bebas)</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Contoh: Toilet Lt 2 airnya mati dan kotor, tempat sampah samping tangga Lt 3 sudah meluap..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                className="bg-slate-50 text-xs resize-none"
              />
            </div>

            {/* Upload Foto (Maksimal 10 Foto) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  Foto Bukti Keluhan <span className="text-rose-500 font-bold">*</span>
                  <span className="text-slate-400 font-normal text-[11px]">({selectedFiles.length}/10, Min. 1 Foto)</span>
                </Label>
                <span className="text-[11px] text-primary font-medium">Otomatis Dicompress</span>
              </div>

              {/* Upload Buttons: Kamera & Galeri */}
              {selectedFiles.length < 10 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Pilihan 1: Kamera Langsung */}
                  <label className="border-2 border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/70 hover:bg-blue-100/60 transition-all rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 text-blue-700 flex items-center justify-center transition-colors">
                      <Camera size={20} />
                    </div>
                    <span className="text-xs font-bold text-blue-900">
                      Ambil Foto (Kamera)
                    </span>
                    <span className="text-[10px] text-blue-700/80">
                      Buka kamera & jepret langsung
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>

                  {/* Pilihan 2: Pilih dari Galeri */}
                  <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100/70 transition-all rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-full bg-slate-200/80 group-hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Pilih dari Galeri
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Bisa pilih beberapa foto sekaligus
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-2">
                  {selectedFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group bg-slate-100"
                    >
                      <img
                        src={item.preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-0.5 shadow-md"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 font-mono">
                        {formatBytes(item.size)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-white text-xs h-9 gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    Mengirim Pengaduan...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} /> Kirim Pengaduan
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SELESAIKAN PENGADUAN (OB / ADMIN) */}
      <Dialog open={Boolean(selectedComplaintForResolve)} onOpenChange={open => { if (!open) setSelectedComplaintForResolve(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={18} /> Konfirmasi Penanganan Selesai
            </DialogTitle>
            <DialogDescription>
              Tandai bahwa keluhan kebersihan ini telah dibersihkan dan selesai ditangani.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResolveSubmit} className="space-y-4 py-2">
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>Semua kolom bertanda bintang (<span className="text-rose-500 font-bold">*</span>) serta minimal 1 foto bukti setelah dibersihkan wajib diisi.</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Nama Petugas Penanganan <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                value={handlerName}
                onChange={e => setHandlerName(e.target.value)}
                required
                placeholder="Masukkan nama petugas..."
                className="bg-slate-50 text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Catatan Penyelesaian <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Contoh: Toilet sudah dikuras dan dibersihkan, kran air sudah diperbaiki..."
                value={handlerNotes}
                onChange={e => setHandlerNotes(e.target.value)}
                required
                className="bg-slate-50 text-xs resize-none"
              />
            </div>

            {/* Upload Foto Bukti Selesai */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  Foto Bukti Setelah Dibersihkan <span className="text-rose-500 font-bold">*</span>
                  <span className="text-slate-400 font-normal text-[11px]">({resolutionFiles.length}/10, Min. 1 Foto)</span>
                </Label>
                <span className="text-[11px] text-emerald-600 font-medium">Otomatis Dicompress</span>
              </div>

              {/* Upload Buttons: Kamera & Galeri */}
              {resolutionFiles.length < 10 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Pilihan 1: Kamera Langsung */}
                  <label className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/70 hover:bg-emerald-100/60 transition-all rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors">
                      <Camera size={20} />
                    </div>
                    <span className="text-xs font-bold text-emerald-900">
                      Ambil Foto (Kamera)
                    </span>
                    <span className="text-[10px] text-emerald-700/80">
                      Buka kamera & jepret bukti bersih
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleResolutionFileChange}
                    />
                  </label>

                  {/* Pilihan 2: Pilih dari Galeri */}
                  <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100/70 transition-all rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-full bg-slate-200/80 group-hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Pilih dari Galeri
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Bisa pilih beberapa foto sekaligus
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleResolutionFileChange}
                    />
                  </label>
                </div>
              )}

              {resolutionFiles.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-2">
                  {resolutionFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group bg-slate-100"
                    >
                      <img
                        src={item.preview}
                        alt={`Bukti Selesai ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeResolutionFile(idx)}
                        className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-0.5 shadow-md"
                        title="Hapus foto ini"
                      >
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 font-mono">
                        {formatBytes(item.size)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedComplaintForResolve(null)}
                disabled={isResolving}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isResolving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5"
              >
                {isResolving ? "Menyimpan..." : "Simpan Selesai"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
