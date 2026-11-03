// src/components/Cleanliness/DailyReportSection.tsx
import { useState } from "react";
import { CleanlinessReport } from "@/hooks/useCleanliness";
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
  Sparkles,
  Plus,
  Upload,
  Camera,
  Calendar,
  Clock,
  User as UserIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  X,
  Layers,
  Filter
} from "lucide-react";
import { LightboxPhotoInfo } from "./PhotoLightboxModal";
import { formatBytes } from "@/lib/imageCompression";
import { useToast } from "@/hooks/use-toast";

interface DailyReportSectionProps {
  user: User;
  reports: CleanlinessReport[];
  isLoading: boolean;
  floorStatusToday: { [floor: string]: boolean };
  onAddReport: (payload: {
    inspector_name: string;
    floor: string;
    description: string;
    files: File[];
  }) => Promise<boolean>;
  onDeleteReport: (reportId: string, photos: string[]) => Promise<boolean>;
  onOpenPhoto: (photo: LightboxPhotoInfo) => void;
  isOBUser: boolean;
}

const FLOORS = ["Lantai 1", "Lantai 2", "Lantai 3"];

export const DailyReportSection = ({
  user,
  reports,
  isLoading,
  floorStatusToday,
  onAddReport,
  onDeleteReport,
  onOpenPhoto,
  isOBUser
}: DailyReportSectionProps) => {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [inspectorName, setInspectorName] = useState(user.username || "");
  const [floor, setFloor] = useState<string>("Lantai 1");
  const [description, setDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; size: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setInspectorName(user.username || "");
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
        description: "Hanya 10 foto pertama yang akan dimasukkan ke laporan.",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inspectorName.trim()) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Nama petugas OB wajib diisi.",
        variant: "destructive"
      });
      return;
    }

    if (!floor) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Lantai yang dibersihkan wajib dipilih.",
        variant: "destructive"
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Kolom Belum Lengkap",
        description: "Keterangan kondisi kebersihan wajib diisi (tidak boleh kosong).",
        variant: "destructive"
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "Foto Wajib Dilampirkan",
        description: "Harap lampirkan minimal 1 foto bukti dokumentasi kebersihan.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    const ok = await onAddReport({
      inspector_name: inspectorName,
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

  // Filter laporan
  const filteredReports = reports.filter(r => {
    const matchesFloor = selectedFloorFilter === "all" || r.floor === selectedFloorFilter;
    const matchesQuery =
      !searchQuery ||
      r.inspector_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.date.includes(searchQuery);
    return matchesFloor && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* 1. Status Harian Lantai 1, 2, 3 */}
      <Card className="border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white shadow-sm overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm mb-1">
                <Sparkles size={16} className="text-emerald-600" />
                Status Monitoring Kebersihan Hari Ini
              </div>
              <p className="text-xs text-slate-500">
                Pemeriksaan rutin kebersihan Lantai 1, Lantai 2, dan Lantai 3 oleh petugas OB.
              </p>
            </div>

            {/* Tombol Buat Laporan untuk OB atau Admin */}
            {(isOBUser || user.role === 'admin') && (
              <Button
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm shrink-0"
              >
                <Plus size={16} /> Lapor Kebersihan Hari Ini
              </Button>
            )}
          </div>

          {/* Cards 3 Lantai Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {FLOORS.map(f => {
              const isDone = Boolean(floorStatusToday[f]);
              return (
                <div
                  key={f}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isDone
                      ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                      : "bg-amber-50/70 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isDone ? "bg-emerald-500 text-white" : "bg-amber-400 text-amber-950"
                      }`}
                    >
                      <Layers size={16} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{f}</div>
                      <div className="text-[11px] opacity-80">
                        {isDone ? "Sudah Diperiksa & Bersih" : "Belum Dilaporkan Hari Ini"}
                      </div>
                    </div>
                  </div>
                  {isDone ? (
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={20} className="text-amber-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400" />
          <Select value={selectedFloorFilter} onValueChange={setSelectedFloorFilter}>
            <SelectTrigger className="w-full sm:w-[170px] bg-white h-9 text-xs">
              <SelectValue placeholder="Pilih Lantai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Lantai</SelectItem>
              <SelectItem value="Lantai 1">Lantai 1</SelectItem>
              <SelectItem value="Lantai 2">Lantai 2</SelectItem>
              <SelectItem value="Lantai 3">Lantai 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input
          placeholder="Cari petugas, tanggal, atau keterangan..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full sm:w-[320px] bg-white h-9 text-xs"
        />
      </div>

      {/* 3. List Laporan Harian */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2" />
          <p className="text-xs">Memuat riwayat laporan kebersihan...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <Sparkles size={36} className="text-emerald-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Belum Ada Laporan Kebersihan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Laporan harian yang dikirim oleh petugas OB akan tampil di sini lengkap dengan foto dokumentasi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map(report => {
            const canDelete = user.role === 'admin' || user.id === report.user_id;

            return (
              <Card
                key={report.id}
                className="border border-slate-200/80 bg-white hover:border-emerald-200 hover:shadow-md transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {report.floor}
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Clock size={12} /> {report.time}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 mt-2">
                        <UserIcon size={14} className="text-slate-400" />
                        {report.inspector_name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {report.date}
                      </span>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                              <Trash2 size={13} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Laporan Kebersihan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Laporan ini beserta foto dokumentasinya akan dihapus dari sistem.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteReport(report.id, report.photos)}
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
                </CardHeader>

                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  {/* Keterangan ngetik bebas */}
                  {report.description ? (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      {report.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Tidak ada catatan tambahan.</p>
                  )}

                  {/* Grid Foto (Maksimal 10 foto) */}
                  {report.photos && report.photos.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <ImageIcon size={12} className="text-emerald-600" />
                          Dokumentasi Foto ({report.photos.length})
                        </span>
                        <span className="text-[10px] text-emerald-600 font-normal">Klik untuk zoom</span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {report.photos.map((photoUrl, pIdx) => (
                          <div
                            key={pIdx}
                            onClick={() =>
                              onOpenPhoto({
                                url: photoUrl,
                                title: `Dokumentasi ${report.floor}`,
                                subtitle: `Oleh ${report.inspector_name} · ${report.date} ${report.time}`,
                                note: report.description,
                              })
                            }
                            className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all bg-slate-100"
                          >
                            <img
                              src={photoUrl}
                              alt={`Dokumentasi ${pIdx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Sparkles size={14} className="text-white drop-shadow" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 4. MODAL DIALOG FORM LAPORAN OB */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Sparkles size={20} /> Form Laporan Kebersihan OB
            </DialogTitle>
            <DialogDescription>
              Laporkan kondisi kebersihan lantai hari ini dan lampirkan foto dokumentasi (maksimal 10 foto).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-amber-600" />
              <span>Semua kolom bertanda bintang (<span className="text-rose-500 font-bold">*</span>) serta minimal 1 foto dokumentasi wajib diisi sebelum mengirim laporan.</span>
            </div>

            {/* Nama Petugas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Nama Petugas OB <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                placeholder="Masukkan nama petugas..."
                value={inspectorName}
                onChange={e => setInspectorName(e.target.value)}
                required
                className="bg-slate-50 text-xs h-9"
              />
            </div>

            {/* Lantai */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                Lantai yang Dibersihkan <span className="text-rose-500 font-bold">*</span>
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
                Keterangan Kondisi <span className="text-rose-500 font-bold">*</span>
                <span className="text-slate-400 font-normal text-[11px]">(Ngetik Bebas)</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Contoh: Toilet sudah dibersihkan dan dipel, tempat sampah dikosongkan, lorong disapu bersih..."
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
                  Foto Dokumentasi <span className="text-rose-500 font-bold">*</span>
                  <span className="text-slate-400 font-normal text-[11px]">({selectedFiles.length}/10, Min. 1 Foto)</span>
                </Label>
                <span className="text-[11px] text-emerald-600 font-medium">Otomatis Dicompress</span>
              </div>

              {/* Upload Buttons: Kamera & Galeri */}
              {selectedFiles.length < 10 && (
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

              {/* Preview Grid Foto Terpilih */}
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
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    Mengompresi & Mengirim...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Kirim Laporan Kebersihan
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
