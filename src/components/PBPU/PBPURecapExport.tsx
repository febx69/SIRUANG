// src/components/PBPU/PBPURecapExport.tsx
import React, { useState, useMemo } from 'react';
import {
  PBPUSubmission,
  PBPUSubmissionChannel,
  PBPUDocument,
  PAMEKASAN_DISTRICTS,
} from '@/types/pbpu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Calendar,
  Archive,
  FolderArchive,
  Loader2,
  FileText,
  FolderOpen,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  isGoogleDriveUrl,
  getGoogleDriveDownloadUrl,
} from '@/lib/googleDriveHelper';

interface PBPURecapExportProps {
  submissions: PBPUSubmission[];
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const PBPURecapExport: React.FC<PBPURecapExportProps> = ({ submissions }) => {
  // Hanya data berstatus TERVERIFIKASI
  const verifiedList = useMemo(
    () => submissions.filter((s) => s.verification_status === 'TERVERIFIKASI'),
    [submissions]
  );

  // Filter States
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // 'ALL' atau '0'-'11'
  const [channelFilter, setChannelFilter] = useState<'ALL' | PBPUSubmissionChannel>('ALL');
  const [districtFilter, setDistrictFilter] = useState<'ALL' | string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Status Progress Pembuatan ZIP
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    status: string;
  }>({
    current: 0,
    total: 0,
    percent: 0,
    status: '',
  });

  // Ambil daftar tahun unik dari data usulan yang ada
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYear);
    verifiedList.forEach((sub) => {
      const d = new Date(sub.verified_at || sub.created_at);
      if (!isNaN(d.getTime())) {
        yearsSet.add(d.getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [verifiedList, currentYear]);

  // Data Terfilter
  const filtered = useMemo(() => {
    return verifiedList.filter((sub) => {
      const dateRef = new Date(sub.verified_at || sub.created_at);
      const subYear = dateRef.getFullYear().toString();
      const subMonth = dateRef.getMonth().toString();

      if (selectedYear !== 'ALL' && subYear !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && subMonth !== selectedMonth) return false;

      if (channelFilter !== 'ALL' && sub.submission_channel !== channelFilter) return false;
      if (districtFilter !== 'ALL' && sub.district !== districtFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchSearch =
          sub.applicant_name.toLowerCase().includes(term) ||
          sub.nik.includes(term) ||
          sub.registration_no.toLowerCase().includes(term) ||
          sub.submitter_unit.toLowerCase().includes(term);
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [verifiedList, selectedYear, selectedMonth, channelFilter, districtFilter, searchTerm]);

  // Hitung total berkas dalam data yang difilter
  const totalFilesCount = useMemo(() => {
    return filtered.reduce((acc, sub) => acc + (sub.documents?.length || 0), 0);
  }, [filtered]);

  // Helper: Format baris data untuk Excel
  const formatSubmissionRow = (sub: PBPUSubmission, idx: number) => ({
    No: idx + 1,
    'No. Registrasi': sub.registration_no,
    'Tanggal Pengajuan': new Date(sub.created_at).toLocaleDateString('id-ID'),
    'Nama Calon Peserta': sub.applicant_name,
    NIK: String(sub.nik),
    'Nomor KK': sub.no_kk ? String(sub.no_kk) : '-',
    'Tempat Lahir': sub.birth_place,
    'Tanggal Lahir': sub.birth_date,
    'Jenis Kelamin': sub.gender,
    Alamat: sub.address,
    'Desa/Kelurahan': sub.village,
    Kecamatan: sub.district,
    'No. Telepon': sub.phone || '-',
    'Jalur Pengusulan': sub.submission_channel,
    'Unit Pengusul': sub.submitter_unit,
    'Kategori Kondisi / Desil':
      sub.submission_channel === 'PUSKESMAS'
        ? sub.condition_category || '-'
        : `Desil ${sub.desil || '-'}`,
    Faskes: sub.health_facility || '-',
    'Dokter DPJP': sub.dpjp_name || '-',
    'Status NIK': sub.nik_status === 'TIDAK_BERMASALAH' ? 'Valid' : 'Bermasalah',
    'Tanggal Verifikasi': sub.verified_at
      ? new Date(sub.verified_at).toLocaleDateString('id-ID')
      : '-',
    Verifikator: sub.verifier_username || 'Bidang Yankes',
    'Catatan Verifikator': sub.verifier_note || '-',
    'Jumlah Berkas Terlampir': sub.documents?.length || 0,
  });

  // Helper: Membuat Buffer Uint8Array dari file Excel
  const generateExcelBuffer = (rows: any[], sheetTitle = 'Rekap Terverifikasi'): Uint8Array => {
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Format kolom NIK & KK sebagai string teks murni
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:U1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const nikCellRef = XLSX.utils.encode_cell({ c: 4, r: R });
      if (worksheet[nikCellRef]) worksheet[nikCellRef].t = 's';
      const kkCellRef = XLSX.utils.encode_cell({ c: 5, r: R });
      if (worksheet[kkCellRef]) worksheet[kkCellRef].t = 's';
    }

    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 18 }, // No. Reg
      { wch: 15 }, // Tanggal
      { wch: 25 }, // Nama
      { wch: 20 }, // NIK
      { wch: 20 }, // KK
      { wch: 15 }, // Tempat Lahir
      { wch: 13 }, // Tgl Lahir
      { wch: 13 }, // JK
      { wch: 30 }, // Alamat
      { wch: 18 }, // Desa
      { wch: 15 }, // Kecamatan
      { wch: 15 }, // No Telp
      { wch: 15 }, // Jalur
      { wch: 22 }, // Unit
      { wch: 28 }, // Kategori/Desil
      { wch: 20 }, // Faskes
      { wch: 18 }, // DPJP
      { wch: 12 }, // NIK Status
      { wch: 16 }, // Tgl Verif
      { wch: 15 }, // Verifikator
      { wch: 25 }, // Catatan
      { wch: 15 }, // Jml Berkas
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 31));
    const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(out);
  };

  // Helper: Mengambil konten berkas dokumen (ArrayBuffer / Base64 / Text Fallback)
  const fetchDocumentContent = async (
    doc: PBPUDocument
  ): Promise<{ data: Uint8Array | ArrayBuffer | string; fileName: string } | null> => {
    const rawFileName = doc.file_name || `Dokumen_${doc.document_type}.pdf`;
    const cleanFileName = rawFileName.replace(/[\\/:*?"<>|]/g, '_');
    const finalFileName = `${doc.document_type}_${cleanFileName}`;
    const url = doc.file_url;

    if (!url) return null;

    // 1. Jika Base64 Data URL
    if (url.startsWith('data:')) {
      const base64Index = url.indexOf(';base64,');
      if (base64Index !== -1) {
        const base64Data = url.slice(base64Index + 8);
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return { data: bytes, fileName: finalFileName };
      }
    }

    // 2. Jika Google Drive URL
    if (isGoogleDriveUrl(url)) {
      const downloadUrl = getGoogleDriveDownloadUrl(url);
      try {
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          return { data: buf, fileName: finalFileName };
        }
      } catch (err) {
        console.warn(`Gagal fetch langsung Google Drive (${finalFileName}):`, err);
      }
    }

    // 3. Jika URL http biasa
    if (url.startsWith('http')) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          return { data: buf, fileName: finalFileName };
        }
      } catch (err) {
        console.warn(`Gagal fetch direct URL (${finalFileName}):`, err);
      }
    }

    // Fallback: Jika berkas terhalang jaringan/CORS, buat file rujukan teks agar zip tetap utuh
    const infoText = `DOKUMEN PERSYARATAN PBPU BP\n--------------------------------\nJenis Dokumen : ${doc.document_type}\nNama Berkas   : ${doc.file_name}\nTautan Cloud  : ${url}\nDiunggah Oleh : ${doc.uploaded_by || '-'}\nWaktu Unggah  : ${doc.created_at || '-'}\n\n* File fisik dapat diakses langsung melalui tautan cloud Google Drive di atas.`;
    return {
      data: infoText,
      fileName: `${doc.document_type}_Tautan_GoogleDrive.txt`,
    };
  };

  // 1. EKSPOR EXCEL BIASA (.xlsx)
  const handleExportExcelOnly = () => {
    if (filtered.length === 0) return;

    const isSingleMonth = selectedMonth !== 'ALL';
    const monthName = isSingleMonth ? MONTH_NAMES[parseInt(selectedMonth, 10)] : 'SEMUA_BULAN';
    const yearLabel = selectedYear !== 'ALL' ? selectedYear : 'SEMUA_TAHUN';

    const rows = filtered.map((sub, idx) => formatSubmissionRow(sub, idx));
    const buf = generateExcelBuffer(rows, `Rekap PBPU ${monthName}`);
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const fileName = `REKAP_PBPU_BP_${monthName.toUpperCase()}_${yearLabel}.xlsx`;
    saveAs(blob, fileName);
  };

  // 2. EKSPOR PAKET LENGKAP ARSIP (.ZIP) BERKAS & EXCEL
  const handleExportZip = async () => {
    if (filtered.length === 0) return;

    setIsExportingZip(true);
    setZipProgress({
      current: 0,
      total: filtered.length,
      percent: 5,
      status: 'Mempersiapkan struktur arsip paket ZIP...',
    });

    try {
      const zip = new JSZip();
      const isSingleMonth = selectedMonth !== 'ALL';
      const monthName = isSingleMonth ? MONTH_NAMES[parseInt(selectedMonth, 10)] : 'Keseluruhan';
      const yearLabel = selectedYear !== 'ALL' ? selectedYear : 'SemuaTahun';

      if (isSingleMonth) {
        // =========================================================================
        // KASUS A: REKAP 1 BULAN TERTENTU (misal: November 2026)
        // Di dalam zip:
        //  - Rekap_PBPU_BP_November_2026.xlsx
        //  - [NIK] Nama Pemohon/
        //     ├── Dokumen_1.pdf
        //     └── Dokumen_2.jpg
        // =========================================================================
        const excelRows = filtered.map((s, idx) => formatSubmissionRow(s, idx));
        const excelBuf = generateExcelBuffer(excelRows, `Rekap PBPU ${monthName}`);
        zip.file(`Rekap_PBPU_BP_${monthName}_${yearLabel}.xlsx`, excelBuf);

        for (let i = 0; i < filtered.length; i++) {
          const sub = filtered[i];
          const pct = Math.round(10 + (i / filtered.length) * 80);
          setZipProgress({
            current: i + 1,
            total: filtered.length,
            percent: pct,
            status: `Mengunduh berkas (${i + 1}/${filtered.length}): ${sub.applicant_name}...`,
          });

          const safeName = sub.applicant_name.replace(/[\\/:*?"<>|]/g, '_').trim();
          const personFolderName = `${sub.nik}_${safeName}`;
          const personFolder = zip.folder(personFolderName);

          if (personFolder && sub.documents && sub.documents.length > 0) {
            for (const doc of sub.documents) {
              const fileResult = await fetchDocumentContent(doc);
              if (fileResult) {
                personFolder.file(fileResult.fileName, fileResult.data);
              }
            }
          }
        }
      } else {
        // =========================================================================
        // KASUS B: REKAP KESELURUHAN / SEMUA BULAN
        // Di dalam zip:
        //  - Rekap_PBPU_BP_Keseluruhan_2026.xlsx (Excel induk)
        //  - 01_Januari/
        //     ├── Rekap_Januari_2026.xlsx
        //     └── [NIK] Nama Pemohon/
        //          └── Berkas...
        //  - 11_November/
        //     ├── Rekap_November_2026.xlsx
        //     └── [NIK] Nama Pemohon/
        //          └── Berkas...
        // =========================================================================
        const allRows = filtered.map((s, idx) => formatSubmissionRow(s, idx));
        const allExcelBuf = generateExcelBuffer(allRows, `Rekap Keseluruhan`);
        zip.file(`Rekap_PBPU_BP_Keseluruhan_${yearLabel}.xlsx`, allExcelBuf);

        // Kelompokkan usulan berdasarkan bulan
        const subsByMonth: { [monthIdx: number]: PBPUSubmission[] } = {};
        filtered.forEach((sub) => {
          const m = new Date(sub.verified_at || sub.created_at).getMonth();
          if (!subsByMonth[m]) subsByMonth[m] = [];
          subsByMonth[m].push(sub);
        });

        let processedTotal = 0;
        const sortedMonthKeys = Object.keys(subsByMonth).map(Number).sort((a, b) => a - b);

        for (const m of sortedMonthKeys) {
          const mName = MONTH_NAMES[m];
          const mPrefix = String(m + 1).padStart(2, '0');
          const monthFolderName = `${mPrefix}_${mName}`;
          const monthFolder = zip.folder(monthFolderName);

          if (monthFolder) {
            const mSubs = subsByMonth[m];
            // 1 File Excel per folder bulan
            const mExcelRows = mSubs.map((s, idx) => formatSubmissionRow(s, idx));
            const mExcelBuf = generateExcelBuffer(mExcelRows, `Rekap ${mName}`);
            monthFolder.file(`Rekap_${mName}_${yearLabel}.xlsx`, mExcelBuf);

            // Folder per pemohon di dalam folder bulan
            for (const sub of mSubs) {
              processedTotal++;
              const pct = Math.round(10 + (processedTotal / filtered.length) * 80);
              setZipProgress({
                current: processedTotal,
                total: filtered.length,
                percent: pct,
                status: `Mengunduh berkas (${processedTotal}/${filtered.length}) [Bulan ${mName}]: ${sub.applicant_name}...`,
              });

              const safeName = sub.applicant_name.replace(/[\\/:*?"<>|]/g, '_').trim();
              const personFolderName = `${sub.nik}_${safeName}`;
              const personFolder = monthFolder.folder(personFolderName);

              if (personFolder && sub.documents && sub.documents.length > 0) {
                for (const doc of sub.documents) {
                  const fileResult = await fetchDocumentContent(doc);
                  if (fileResult) {
                    personFolder.file(fileResult.fileName, fileResult.data);
                  }
                }
              }
            }
          }
        }
      }

      setZipProgress({
        current: filtered.length,
        total: filtered.length,
        percent: 92,
        status: 'Mengompresi seluruh berkas dan folder ke file .ZIP...',
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        const compPct = Math.round(92 + (metadata.percent / 100) * 7);
        setZipProgress((prev) => ({
          ...prev,
          percent: compPct,
          status: `Kompresi ZIP: ${Math.round(metadata.percent)}%`,
        }));
      });

      const zipFileName = isSingleMonth
        ? `REKAP_PBPU_BP_${monthName.toUpperCase()}_${yearLabel}.zip`
        : `REKAP_PBPU_BP_KESELURUHAN_${yearLabel}.zip`;

      setZipProgress({
        current: filtered.length,
        total: filtered.length,
        percent: 100,
        status: 'Selesai! Mengunduh paket arsip ZIP...',
      });

      saveAs(zipBlob, zipFileName);
    } catch (err: any) {
      console.error('Error generate ZIP:', err);
      alert(`Terjadi kendala saat menyusun paket ZIP: ${err.message}`);
    } finally {
      setTimeout(() => {
        setIsExportingZip(false);
      }, 1000);
    }
  };

  const getPeriodeLabel = () => {
    const isSingleMonth = selectedMonth !== 'ALL';
    const monthName = isSingleMonth ? MONTH_NAMES[parseInt(selectedMonth, 10)] : 'Semua Bulan';
    const yearLabel = selectedYear !== 'ALL' ? `Tahun ${selectedYear}` : 'Semua Tahun';
    return `${monthName} (${yearLabel})`;
  };

  return (
    <div className="space-y-4">
      {/* BANNER UTAMA DENGAN DUA TOMBOL EKSPOR */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white p-5 text-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="p-3 rounded-2xl bg-emerald-700 text-white shadow-md shrink-0">
            <Archive size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                Bidang Yankes Dinkes
              </span>
              <span className="text-xs font-bold text-emerald-800">
                Arsip Rekapitulasi & Dokumen
              </span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
              Rekapitulasi Paket Lengkap (Excel + Berkas ZIP)
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Pilih tahun dan bulan usulan. Sistem akan mengemas laporan Excel beserta seluruh folder berkas dokumen warga (KTP, KK, Surat DPJP, SKTM) ke dalam satu file arsip <strong>.ZIP</strong> yang tersusun rapi.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
          {/* Tombol Unduh ZIP Lengkap */}
          <Button
            onClick={handleExportZip}
            disabled={filtered.length === 0 || isExportingZip}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs gap-2 h-11 px-4 rounded-xl shadow-md transition-all hover:shadow-lg cursor-pointer flex-1 sm:flex-initial"
          >
            {isExportingZip ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Memproses ZIP...</span>
              </>
            ) : (
              <>
                <FolderArchive size={17} />
                <span>Unduh Paket Lengkap (.ZIP)</span>
              </>
            )}
          </Button>

          {/* Tombol Unduh Excel Saja */}
          <Button
            onClick={handleExportExcelOnly}
            variant="outline"
            disabled={filtered.length === 0 || isExportingZip}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs gap-1.5 h-11 px-3.5 rounded-xl transition-all cursor-pointer flex-1 sm:flex-initial"
            title="Unduh hanya file Excel (.xlsx) tanpa berkas dokumen"
          >
            <FileSpreadsheet size={16} className="text-emerald-700" />
            <span>Excel Saja (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* FILTER BAR: PERIODE TAHUN, BULAN, JALUR, KECAMATAN & CARI */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter size={15} className="text-emerald-600" />
            <span>Filter Periode & Kriteria Rekap:</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Hasil Filter:</span>
            <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {filtered.length} Peserta Terverifikasi
            </span>
            <span className="font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
              {totalFilesCount} Berkas Terlampir
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Filter Tahun */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Calendar size={12} className="text-emerald-600" />
              Tahun Rekap
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200 font-semibold">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Tahun</SelectItem>
                {availableYears.map((yr) => (
                  <SelectItem key={yr} value={yr}>
                    Tahun {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Filter Bulan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Calendar size={12} className="text-teal-600" />
              Bulan Rekap
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200 font-semibold">
                <SelectValue placeholder="Pilih Bulan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Bulan (Keseluruhan)</SelectItem>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem key={name} value={idx.toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Filter Jalur */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Jalur Pengusulan</label>
            <Select
              value={channelFilter}
              onValueChange={(val: any) => setChannelFilter(val)}
            >
              <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Semua Jalur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Jalur</SelectItem>
                <SelectItem value="PUSKESMAS">Jalur Puskesmas</SelectItem>
                <SelectItem value="DINSOS">Jalur Dinas Sosial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Filter Kecamatan */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Kecamatan</label>
            <Select
              value={districtFilter}
              onValueChange={(val: any) => setDistrictFilter(val)}
            >
              <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Semua Kecamatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kecamatan</SelectItem>
                {PAMEKASAN_DISTRICTS.map((kec) => (
                  <SelectItem key={kec} value={kec}>
                    {kec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Pencarian Teks */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="text-[11px] font-bold text-slate-600">Pencarian Nama / NIK</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <Input
                placeholder="Nama, NIK, No. Reg..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-slate-50 border-slate-200 text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Info Format Output ZIP */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FolderOpen size={15} className="text-emerald-700 shrink-0" />
            <span>
              Format Paket ZIP Terpilih: <strong>{getPeriodeLabel()}</strong>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 italic">
            {selectedMonth !== 'ALL'
              ? '📂 1 Excel Rekap Bulan + Folder Dokumen per Nama Pemohon'
              : '📂 1 Excel Rekap Induk + Sub-Folder per Bulan (di dalamnya ada Excel & Berkas)'}
          </span>
        </div>
      </div>

      {/* TABEL DATA REKAP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileSpreadsheet size={42} className="mx-auto mb-2 opacity-30 text-emerald-600" />
            <p className="text-base font-semibold text-slate-700">
              Tidak ada data terverifikasi untuk periode ini
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Coba ganti pilihan tahun atau bulan pada filter di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-emerald-950 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">No. Reg</th>
                  <th className="py-3.5 px-4">Nama Peserta</th>
                  <th className="py-3.5 px-4">NIK</th>
                  <th className="py-3.5 px-4">Kecamatan</th>
                  <th className="py-3.5 px-4">Jalur & Unit</th>
                  <th className="py-3.5 px-4">Kategori / Desil</th>
                  <th className="py-3.5 px-4 text-center">Berkas</th>
                  <th className="py-3.5 px-4">Tgl Verifikasi</th>
                  <th className="py-3.5 px-4">Verifikator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {sub.registration_no}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">{sub.applicant_name}</td>

                    <td className="py-3 px-4 font-mono text-slate-700">{sub.nik}</td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{sub.district}</span>
                      <p className="text-[10px] text-slate-400">{sub.village}</p>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          sub.submission_channel === 'PUSKESMAS'
                            ? 'border-teal-300 text-teal-800 bg-teal-50'
                            : 'border-blue-300 text-blue-800 bg-blue-50'
                        }`}
                      >
                        {sub.submission_channel}
                      </Badge>
                      <p className="text-[10px] text-slate-500 mt-0.5">{sub.submitter_unit}</p>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {sub.submission_channel === 'PUSKESMAS'
                        ? sub.condition_category || '-'
                        : `Desil ${sub.desil || '-'}`}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {sub.documents?.length || 0} File
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {sub.verified_at
                        ? new Date(sub.verified_at).toLocaleDateString('id-ID')
                        : '-'}
                    </td>

                    <td className="py-3 px-4 font-semibold text-emerald-800">
                      {sub.verifier_username || 'Yankes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DIALOG PROGRESS BAR PENYUSUNAN ZIP */}
      <Dialog open={isExportingZip}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-emerald-700">
              <Archive size={22} className="animate-bounce" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Menyusun Paket Arsip ZIP PBPU BP
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Status Proses:</span>
                <span className="text-emerald-800 font-mono">{zipProgress.percent}%</span>
              </div>

              {/* Progress Bar Visual */}
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(5, zipProgress.percent))}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-600 truncate mt-1" title={zipProgress.status}>
                {zipProgress.status}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">💡 Informasi:</p>
              <p className="text-[11px] leading-relaxed">
                Sistem sedang mengunduh berkas fisik (KTP, KK, Surat DPJP/SKTM) dari cloud Google Drive dan menyusun struktur folder otomatis beserta spreadsheet Excel rekapitulasi.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PBPURecapExport;
