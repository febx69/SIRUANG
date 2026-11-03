// src/components/Cleanliness/CleanlinessReportPdfModal.tsx
import { useState } from "react";
import { CleanlinessReport, CleanlinessComplaint } from "@/hooks/useCleanliness";
import { calculateCleanlinessSummary, generateCleanlinessPdfReport, groupConsecutiveMissedDates } from "@/lib/pdfCleanlinessReport";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  Loader2,
  Camera,
  Image as ImageIcon,
  Check,
  ListFilter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CleanlinessReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: CleanlinessReport[];
  complaints: CleanlinessComplaint[];
  year: number;
  month: number;
  monthLabel: string;
}

export const CleanlinessReportPdfModal = ({
  isOpen,
  onClose,
  reports,
  complaints,
  year,
  month,
  monthLabel
}: CleanlinessReportPdfModalProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [isDetailedMissedView, setIsDetailedMissedView] = useState(false);

  const summary = calculateCleanlinessSummary(reports, complaints, year, month, monthLabel);
  const monthPrefix = `${year}-${month.toString().padStart(2, '0')}`;
  const periodReports = reports
    .filter(r => r.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const periodComplaints = complaints
    .filter(c => c.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date));

  const reportsWithPhotos = periodReports.filter(r => r.photos && r.photos.length > 0);
  const groupedMissed = groupConsecutiveMissedDates(summary.missedReports);

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    setDownloadProgress("Menyiapkan dokumen...");
    try {
      await generateCleanlinessPdfReport(
        reports,
        complaints,
        year,
        month,
        monthLabel,
        (progressText) => setDownloadProgress(progressText)
      );
      toast({
        title: "PDF Berhasil Diunduh",
        description: `Laporan Monev Kebersihan ${monthLabel} ${year} beserta seluruh lampiran foto telah disimpan.`
      });
    } catch (err: any) {
      toast({
        title: "Gagal Mengunduh PDF",
        description: err.message || "Terjadi kesalahan saat membuat file PDF",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      setDownloadProgress("");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100">
        {/* Modal Header */}
        <DialogHeader className="p-4 bg-white border-b border-slate-200 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              Preview Dokumen Laporan Resmi Monev Kebersihan (Lengkap dengan Lampiran Foto)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Periode: {monthLabel} {year} · Dokumen laporan resmi dengan bukti foto harian & bukti pengaduan
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5 border-slate-300 text-slate-700 font-medium"
            >
              <Printer size={13} /> Cetak
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white font-medium"
            >
              {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {isGenerating ? (downloadProgress || "Memproses...") : "Unduh File PDF (.pdf)"}
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body / Paper Sheet Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center">
          <div className="w-full max-w-3xl bg-white shadow-md rounded-xl p-6 md:p-10 space-y-7 text-slate-800 border border-slate-200 printable-area">
            {/* 1. KOP SURAT */}
            <div className="text-center pb-3 border-b-2 border-slate-800 relative">
              <div className="flex items-center justify-center gap-3">
                <img src="/logo-pamekasan.png" alt="Logo" className="w-12 h-14 object-contain shrink-0 hidden sm:block" />
                <div>
                  <h2 className="text-xs md:text-sm font-bold tracking-wider text-slate-900 uppercase">
                    Pemerintah Kabupaten Pamekasan
                  </h2>
                  <h1 className="text-base md:text-xl font-extrabold text-blue-900 tracking-wide mt-0.5">
                    DINAS KESEHATAN
                  </h1>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Jl. Jokotole No. 4, Barurambat Kota, Kec. Pamekasan, Kabupaten Pamekasan, Jawa Timur 69317
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Telepon: (0324) 322444 | Email: dinkes@pamekasantkab.go.id | Website: dinkes.pamekasantkab.go.id
                  </p>
                </div>
              </div>
            </div>

            {/* 2. JUDUL DOKUMEN */}
            <div className="text-center space-y-1">
              <h3 className="text-sm md:text-base font-bold text-slate-900 uppercase underline decoration-1 underline-offset-4">
                Laporan Monitoring dan Evaluasi (Monev) Kebersihan Gedung
              </h3>
              <p className="text-xs text-slate-600">
                Periode: <strong>{monthLabel} {year}</strong> · Lokasi: Gedung Kantor Dinas Kesehatan
              </p>
            </div>

            {/* 3. RINGKASAN CAPAIAN (DASHBOARD) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                <Sparkles size={14} className="text-primary" />
                I. Ringkasan Capaian Indikator Kebersihan
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Kepatuhan Laporan</p>
                  <p className="text-lg font-bold text-primary mt-0.5">{summary.complianceRate}%</p>
                  <p className="text-[10px] text-slate-500">{summary.actualSubmissions} dari {summary.expectedSubmissions} laporan</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Hari Kerja Aktif</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{summary.totalWorkingDays} Hari Kerja</p>
                  <p className="text-[10px] text-slate-500">
                    {summary.reportedDaysCount} Hari Ada Laporan ({Math.max(0, summary.totalWorkingDays - summary.reportedDaysCount)} Hari Nihil)
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Rekap per Lantai</p>
                  <p className="text-xs font-bold text-slate-800 mt-1">Lt 1: {summary.floorCounts["Lantai 1"]} · Lt 2: {summary.floorCounts["Lantai 2"]}</p>
                  <p className="text-xs font-bold text-slate-800">Lt 3: {summary.floorCounts["Lantai 3"]}</p>
                  <p className={`text-[10px] mt-0.5 font-medium ${
                    summary.floorCounts["Lantai 1"] > 0 && summary.floorCounts["Lantai 2"] > 0 && summary.floorCounts["Lantai 3"] > 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}>
                    {summary.floorCounts["Lantai 1"] > 0 && summary.floorCounts["Lantai 2"] > 0 && summary.floorCounts["Lantai 3"] > 0
                      ? "Seluruh lantai aktif"
                      : summary.floorCounts["Lantai 2"] === 0 && summary.floorCounts["Lantai 3"] === 0
                      ? "Lt 2 & 3 nihil laporan"
                      : "Sebagian lantai nihil"}
                  </p>
                </div>

                <div className={`p-3 rounded-lg border ${summary.totalComplaints === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Pengaduan Pegawai</p>
                  <p className={`text-lg font-bold mt-0.5 ${summary.totalComplaints === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {summary.totalComplaints === 0 ? "NIHIL (0)" : `${summary.totalComplaints} Masuk`}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {summary.totalComplaints === 0 ? "Kondisi Sangat Bersih" : `${summary.resolvedComplaints} Selesai, ${summary.pendingComplaints} Pending`}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. SKEMA 1: EVALUASI KEPATUHAN HARIAN & DETEKSI YANG TIDAK LAPOR */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" />
                  II. Evaluasi Kepatuhan Pelaporan & Deteksi Petugas Tidak Lapor
                </h4>
                {summary.missedReports.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDetailedMissedView(v => !v)}
                    className="h-6 text-[11px] text-primary hover:bg-primary/5 px-2 gap-1"
                  >
                    <ListFilter size={12} />
                    {isDetailedMissedView ? "Tampilkan Ringkasan Rentang" : "Tampilkan Rincian Harian"}
                  </Button>
                )}
              </div>

              {summary.missedReports.length === 0 ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-900">
                      Tingkat Kepatuhan 100% (Disiplin Lengkap & Nihil Keterlambatan)
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Seluruh lantai (Lantai 1, Lantai 2, dan Lantai 3) rutin dilaporkan dokumentasinya setiap hari kerja tanpa ada yang terlewat. Petugas kebersihan bekerja dengan tertib.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-900">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <p className="font-bold">
                        Peringatan: Terdapat {summary.missedReports.length} Hari Kerja dengan Laporan Kosong / Tidak Lapor!
                      </p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Petugas kebersihan pada lantai tertera tidak menyampaikan laporan dokumentasi pada tanggal berikut. Disarankan Kasubag Umum melakukan teguran atau konfirmasi kendala lapangan kepada petugas terkait.
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-rose-100/70 text-rose-900 border-b border-rose-200 font-semibold text-[11px]">
                        <tr>
                          <th className="p-2 w-10 text-center">No</th>
                          <th className="p-2 w-48">Tanggal / Periode Hari</th>
                          <th className="p-2">Lantai Yang Tidak Lapor</th>
                          <th className="p-2 w-48">Status / Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {isDetailedMissedView ? (
                          summary.missedReports.map((item, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/30">
                              <td className="p-2 text-center font-medium">{idx + 1}</td>
                              <td className="p-2 font-mono">{item.date} ({item.dayName})</td>
                              <td className="p-2 font-bold text-rose-700">{item.missingFloors.join(", ")}</td>
                              <td className="p-2 text-slate-600">
                                <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300 bg-rose-50">
                                  Nihil Laporan
                                </Badge>
                              </td>
                            </tr>
                          ))
                        ) : (
                          groupedMissed.map((item) => (
                            <tr key={item.no} className="hover:bg-rose-50/30">
                              <td className="p-2 text-center font-medium">{item.no}</td>
                              <td className="p-2 font-medium">{item.period}</td>
                              <td className="p-2 font-bold text-rose-700">{item.floors}</td>
                              <td className="p-2 text-slate-600">
                                <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300 bg-rose-50">
                                  {item.status}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 5. SKEMA 2: EVALUASI PENGADUAN KEBERSIHAN */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                <ShieldAlert size={14} className="text-primary" />
                III. Evaluasi & Tindak Lanjut Pengaduan Kebersihan Pegawai
              </h4>

              {summary.totalComplaints === 0 ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-emerald-900">
                      Kondisi Bersih Optimal: NIHIL PENGADUAN KEBERSIHAN
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Selama periode {monthLabel} {year}, tidak tercatat adanya pengaduan maupun komplain ketidakbersihan dari pegawai di seluruh lantai. Kebersihan kantor terjaga dengan prima sesuai standar operasional.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <p className="font-bold">
                      Tercatat {summary.totalComplaints} Pengaduan Pegawai ({summary.resolvedComplaints} Selesai, {summary.pendingComplaints} Pending)
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Rincian penanganan komplain kebersihan disajikan pada tabel berikut:
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-amber-100/70 text-amber-900 border-b border-amber-200 font-semibold text-[11px]">
                        <tr>
                          <th className="p-2 w-8 text-center">No</th>
                          <th className="p-2 w-24">Tanggal</th>
                          <th className="p-2 w-28">Pelapor</th>
                          <th className="p-2 w-20">Lokasi</th>
                          <th className="p-2">Uraian Masalah</th>
                          <th className="p-2 w-24">Status</th>
                          <th className="p-2 w-32">Solusi / Petugas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {periodComplaints.map((c, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/20">
                            <td className="p-2 text-center">{idx + 1}</td>
                            <td className="p-2 font-mono text-[10px]">{c.date}</td>
                            <td className="p-2 font-medium">{c.reporter_name}<br/><span className="text-[10px] text-slate-400">({c.bidang})</span></td>
                            <td className="p-2">{c.floor}</td>
                            <td className="p-2">{c.description}</td>
                            <td className="p-2">
                              <Badge className={`text-[10px] px-1.5 py-0 ${
                                c.status === 'resolved'
                                  ? 'bg-emerald-100 text-emerald-800 border-none'
                                  : c.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800 border-none'
                                  : 'bg-amber-100 text-amber-800 border-none'
                              }`}>
                                {c.status === 'resolved' ? 'SELESAI' : c.status === 'in_progress' ? 'PROSES' : 'MENUNGGU'}
                              </Badge>
                            </td>
                            <td className="p-2 text-[10px] text-slate-600">
                              {c.handler_name ? `${c.handler_name}: ${c.handler_notes || '-'}` : (c.handler_notes || '-')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 6. IV. KESIMPULAN */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b pb-1">
                IV. Kesimpulan dan Rekomendasi Monev
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                {summary.missedReports.length === 0 && summary.totalComplaints === 0
                  ? `Kinerja kebersihan kantor Dinas Kesehatan pada bulan ${monthLabel} ${year} BERPRESTASI SANGAT BAIK. Seluruh laporan harian tersampaikan 100% tepat waktu dan tidak ada komplain kebersihan dari pegawai. Disarankan memberikan apresiasi kerja kepada tim kebersihan.`
                  : summary.missedReports.length > 0 && summary.totalComplaints === 0
                  ? `Kondisi kebersihan gedung kantor terpelihara dengan baik tanpa keluhan pegawai, namun demikian terdapat ${summary.missedReports.length} tanggal laporan harian yang tidak diisi oleh petugas. Perlu penegakan disiplin pelaporan berkala.`
                  : summary.missedReports.length === 0 && summary.totalComplaints > 0
                  ? `Petugas kebersihan sangat rajin menyampaikan laporan harian (100%), namun terdapat ${summary.totalComplaints} pengaduan dari pegawai terkait titik-titik tertentu. Diharapkan pengawasan lebih difokuskan pada area yang sering diadukan.`
                  : `Perlu dilakukan evaluasi menyeluruh terhadap pengelolaan kebersihan gedung kantor, mengingat terdapat ${summary.missedReports.length} hari tanpa laporan harian dan ${summary.totalComplaints} keluhan pegawai yang masuk selama periode ini.`}
              </p>
            </div>

            {/* 7. V. LAMPIRAN FOTO BUKTI PENGADUAN & TINDAK LANJUT */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                <Camera size={14} className="text-primary" />
                V. Lampiran Dokumentasi Foto Bukti Pengaduan & Penyelesaian (Before & After)
              </h4>

              {periodComplaints.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
                  Nihil Pengaduan: Tidak ada bukti foto pengaduan yang perlu dilampirkan pada periode ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {periodComplaints.map((c, idx) => (
                    <div key={c.id} className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Pengaduan #{idx + 1}: {c.description}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Pelapor: {c.reporter_name} ({c.bidang}) · {c.floor} · {c.date} {c.time || ''}
                          </p>
                        </div>
                        <Badge className={`text-[10px] px-2 py-0.5 ${
                          c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border-none' : 'bg-amber-100 text-amber-800 border-none'
                        }`}>
                          {c.status === 'resolved' ? 'SELESAI DITINDAKLANJUTI' : 'MENUNGGU / PROSES'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                            <AlertTriangle size={12} /> Foto Saat Diadukan (Before):
                          </p>
                          {c.photos && c.photos.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {c.photos.map((pUrl, pIdx) => (
                                <img
                                  key={pIdx}
                                  src={pUrl}
                                  alt="Bukti Pengaduan"
                                  className="w-28 h-20 object-cover rounded-lg border border-slate-200 shadow-xs"
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">Tidak ada foto pengaduan terlampir</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Foto Bukti Selesai (After):
                          </p>
                          {c.resolution_photos && c.resolution_photos.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {c.resolution_photos.map((rUrl, rIdx) => (
                                <img
                                  key={rIdx}
                                  src={rUrl}
                                  alt="Bukti Selesai"
                                  className="w-28 h-20 object-cover rounded-lg border border-emerald-200 shadow-xs"
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              {c.status === 'resolved' ? 'Selesai tanpa foto' : 'Belum ada foto penyelesaian'}
                            </p>
                          )}
                        </div>
                      </div>

                      {c.handler_name && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                          <strong>Penindaklanjut:</strong> {c.handler_name} {c.handler_notes ? `— "${c.handler_notes}"` : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 8. VI. LAMPIRAN FOTO KEBERSIHAN HARIAN PETUGAS */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                <ImageIcon size={14} className="text-primary" />
                VI. Lampiran Dokumentasi Foto Kebersihan Harian Petugas (Lantai 1, 2, 3)
              </h4>

              {reportsWithPhotos.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 italic">
                  Belum ada dokumentasi foto laporan harian yang diunggah pada periode ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportsWithPhotos.map((rep) => (
                    <div key={rep.id} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-bold text-slate-800">
                          {rep.floor} · {rep.date} ({rep.time?.slice(0, 5) || '-'} WIB)
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Petugas: <strong>{rep.inspector_name}</strong>
                        </span>
                      </div>
                      {rep.description && (
                        <p className="text-[11px] text-slate-600 italic">
                          "{rep.description}"
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {rep.photos.map((pUrl, pIdx) => (
                          <img
                            key={pIdx}
                            src={pUrl}
                            alt={`Dokumentasi ${rep.floor}`}
                            className="w-32 h-24 object-cover rounded-lg border border-slate-200 shadow-xs"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 9. LEMBAR PENGESAHAN TANDA TANGAN */}
            <div className="pt-8 border-t border-slate-200">
              <div className="flex justify-between items-start text-xs text-slate-800">
                <div className="text-center space-y-1">
                  <p className="text-slate-500">Petugas Pelaksana,</p>
                  <p className="font-bold">Koordinator Kebersihan Kantor</p>
                  <div className="h-16 flex items-end justify-center">
                    <p className="font-bold underline">( .................................................... )</p>
                  </div>
                  <p className="text-[11px] text-slate-500">Dinas Kesehatan Kab. Pamekasan</p>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-slate-500">Pamekasan, {todayFormatted}</p>
                  <p className="font-bold">Kasubag Umum & Kepegawaian</p>
                  <div className="h-16 flex items-end justify-center">
                    <p className="font-bold underline">( .................................................... )</p>
                  </div>
                  <p className="text-[11px] text-slate-500">NIP. ....................................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between sm:justify-between">
          <p className="text-xs text-slate-500">
            Dokumen disusun otomatis oleh Sistem SIRUANG Pemerintah Kabupaten Pamekasan.
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Tutup Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
