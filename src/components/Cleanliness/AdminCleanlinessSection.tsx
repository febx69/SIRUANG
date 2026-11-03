// src/components/Cleanliness/AdminCleanlinessSection.tsx
import { useState } from "react";
import { CleanlinessReport, CleanlinessComplaint } from "@/hooks/useCleanliness";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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
  FileText,
  Trash2,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  ShieldAlert,
  Loader2,
  FileCheck
} from "lucide-react";
import { calculateCleanlinessSummary, generateCleanlinessPdfReport } from "@/lib/pdfCleanlinessReport";
import { CleanlinessReportPdfModal } from "./CleanlinessReportPdfModal";
import { useToast } from "@/hooks/use-toast";

interface AdminCleanlinessSectionProps {
  reports: CleanlinessReport[];
  complaints: CleanlinessComplaint[];
  onBulkClean: (year: number, month: number) => Promise<boolean>;
}

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" }
];

export const AdminCleanlinessSection = ({
  reports,
  complaints,
  onBulkClean
}: AdminCleanlinessSectionProps) => {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "";
  const periodLabel = `${monthLabel} ${selectedYear}`;

  // Hitung analisis laporan & pengaduan untuk periode terpilih
  const summary = calculateCleanlinessSummary(
    reports,
    complaints,
    selectedYear,
    selectedMonth,
    monthLabel
  );

  const monthPrefix = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
  const periodReports = reports.filter(r => r.date.startsWith(monthPrefix));
  const periodComplaints = complaints.filter(c => c.date.startsWith(monthPrefix));

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await generateCleanlinessPdfReport(
        reports,
        complaints,
        selectedYear,
        selectedMonth,
        monthLabel
      );
      toast({
        title: "Laporan PDF Berhasil Diunduh",
        description: `File Laporan Monev Kebersihan ${periodLabel} telah tersimpan.`
      });
    } catch (err: any) {
      toast({
        title: "Gagal Mengunduh PDF",
        description: err.message || "Terjadi kesalahan saat memproses laporan PDF",
        variant: "destructive"
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCleanData = async () => {
    setIsCleaning(true);
    await onBulkClean(selectedYear, selectedMonth);
    setIsCleaning(false);
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. SELECTOR PERIODE BULAN & TAHUN ─── */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Pilih Periode Monev Kebersihan
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Pilih bulan dan tahun untuk menyusun laporan evaluasi resmi berformat PDF serta manajemen kuota data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <Select
                value={selectedMonth.toString()}
                onValueChange={v => setSelectedMonth(parseInt(v, 10))}
              >
                <SelectTrigger className="bg-slate-50 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <Select
                value={selectedYear.toString()}
                onValueChange={v => setSelectedYear(parseInt(v, 10))}
              >
                <SelectTrigger className="bg-slate-50 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-slate-600 font-medium bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <span>Data Terdeteksi:</span>
              <Badge variant="secondary" className="bg-white text-slate-800 font-bold text-[11px]">
                {periodReports.length} Laporan Harian
              </Badge>
              <Badge variant="secondary" className="bg-white text-slate-800 font-bold text-[11px]">
                {periodComplaints.length} Pengaduan
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. PANEL UTAMA: DOKUMEN LAPORAN PDF & SKEMA EVALUASI ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Cetak & Export PDF Resmi */}
        <Card className="md:col-span-2 border border-blue-200 bg-white shadow-sm flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    Laporan Resmi Monev Kebersihan (Format Dokumen PDF)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Dokumen cetak resmi berstandar Dinas Kesehatan Pamekasan dengan Kop Surat, rincian evaluasi, dan lembar pengesahan.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-blue-600 text-white border-none text-[11px] px-2.5 py-0.5 rounded-full">
                Dokumen Resmi PDF
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {/* Status Skema Yang Otomatis Diterapkan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Skema 1: Deteksi Laporan Harian / Bolong */}
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                summary.missedReports.length === 0
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}>
                {summary.missedReports.length === 0 ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {summary.missedReports.length === 0
                      ? "Skema: Kepatuhan 100% (Disiplin Lengkap)"
                      : `Skema: Terdeteksi ${summary.missedReports.length} Hari Tidak Lapor`}
                  </p>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    {summary.missedReports.length === 0
                      ? "Seluruh lantai dilaporkan setiap hari kerja tanpa ada yang bolong."
                      : "Sistem mencatat tanggal & lantai yang tidak melapor untuk evaluasi Kasubag Umum."}
                  </p>
                </div>
              </div>

              {/* Skema 2: Deteksi Pengaduan (Nihil vs Ada) */}
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                summary.totalComplaints === 0
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                {summary.totalComplaints === 0 ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {summary.totalComplaints === 0
                      ? "Skema: Kondisi Bersih Optimal (Nihil Pengaduan)"
                      : `Skema: ${summary.totalComplaints} Pengaduan (${summary.resolvedComplaints} Selesai)`}
                  </p>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    {summary.totalComplaints === 0
                      ? "Tidak ada keluhan pegawai, kebersihan gedung dinilai sangat baik."
                      : "Memuat tabel rincian tindak lanjut dan solusi dari pengaduan pegawai."}
                  </p>
                </div>
              </div>
            </div>

            {/* Tombol Aksi PDF */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => setIsPreviewOpen(true)}
                variant="outline"
                className="flex-1 text-xs h-10 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
              >
                <Printer size={15} /> Lihat & Cetak Laporan PDF
              </Button>
              <Button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex-1 text-xs h-10 gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-sm"
              >
                {isExportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {isExportingPdf ? "Menyiapkan PDF..." : `Unduh PDF (${periodLabel})`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Kolom 3: Pembersihan Arsip Lama Supabase */}
        <Card className="border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <CardHeader>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
              <Trash2 size={20} />
            </div>
            <CardTitle className="text-sm font-bold text-slate-800">
              Pembersihan Arsip Supabase
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Setelah dokumen PDF diunduh atau dicetak, hapus laporan dan file foto periode ini agar penyimpanan Supabase tetap hemat dan lega.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isCleaning || (periodReports.length === 0 && periodComplaints.length === 0)}
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs h-10 gap-1.5 font-medium"
                >
                  <Trash2 size={14} /> Bersihkan Data {periodLabel}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                    <ShieldAlert size={20} /> Konfirmasi Pembersihan Arsip
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 text-xs text-slate-600 pt-1">
                    <p>
                      Tindakan ini akan menghapus <b>{periodReports.length} laporan kebersihan</b> dan <b>{periodComplaints.length} pengaduan</b> untuk periode <b>{periodLabel}</b> beserta seluruh file fotonya di Supabase Storage.
                    </p>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-medium">
                      ⚠️ Pastikan Anda sudah mengunduh file PDF laporan sebelum menghapus data!
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-xs h-9">Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCleanData}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9"
                  >
                    Ya, Bersihkan Dari Supabase
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* ─── 3. MODAL PREVIEW DOKUMEN PDF ─── */}
      <CleanlinessReportPdfModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        reports={reports}
        complaints={complaints}
        year={selectedYear}
        month={selectedMonth}
        monthLabel={monthLabel}
      />
    </div>
  );
};
