// src/components/PBPU/PBPURecapExport.tsx
import React, { useState } from 'react';
import { PBPUSubmission, PBPUSubmissionChannel, PAMEKASAN_DISTRICTS } from '@/types/pbpu';
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
  Download,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PBPURecapExportProps {
  submissions: PBPUSubmission[];
}

export const PBPURecapExport: React.FC<PBPURecapExportProps> = ({ submissions }) => {
  // Hanya data berstatus TERVERIFIKASI sesuai Bagian 12 PRD
  const verifiedList = submissions.filter((s) => s.verification_status === 'TERVERIFIKASI');

  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | PBPUSubmissionChannel>('ALL');
  const [districtFilter, setDistrictFilter] = useState<'ALL' | string>('ALL');

  const filtered = verifiedList.filter((sub) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      sub.applicant_name.toLowerCase().includes(term) ||
      sub.nik.includes(term) ||
      sub.registration_no.toLowerCase().includes(term) ||
      sub.submitter_unit.toLowerCase().includes(term);

    const matchChannel = channelFilter === 'ALL' || sub.submission_channel === channelFilter;
    const matchDistrict = districtFilter === 'ALL' || sub.district === districtFilter;

    return matchSearch && matchChannel && matchDistrict;
  });

  // Ekspor ke format Excel (.xlsx) dengan kolom NIK/KK format teks murni
  const handleExportExcel = () => {
    if (filtered.length === 0) return;

    const exportRows = filtered.map((sub, idx) => ({
      No: idx + 1,
      'No. Registrasi': sub.registration_no,
      'Tanggal Pengajuan': new Date(sub.created_at).toLocaleDateString('id-ID'),
      'Nama Calon Peserta': sub.applicant_name,
      NIK: String(sub.nik), // Dijaga string
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
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);

    // Pastikan kolom NIK (kolom E) & Nomor KK (kolom F) diformat sebagai String
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:T1');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const nikCellRef = XLSX.utils.encode_cell({ c: 4, r: R });
      if (worksheet[nikCellRef]) {
        worksheet[nikCellRef].t = 's';
      }
      const kkCellRef = XLSX.utils.encode_cell({ c: 5, r: R });
      if (worksheet[kkCellRef]) {
        worksheet[kkCellRef].t = 's';
      }
    }

    // Set Column Widths
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
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Terverifikasi PBPU BP');

    const nowStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `REKAP_PBPU_BP_TERVERIFIKASI_${nowStr}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Banner Rekapitulasi */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm mt-0.5">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Rekapitulasi Data Usulan Terverifikasi (Dinkes Yankes)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Memuat seluruh data calon peserta PBPU BP yang telah disetujui (Terverifikasi) oleh Bidang Yankes Dinkes. Siap diekspor untuk pelaporan dan pendaftaran kepesertaan.
            </p>
          </div>
        </div>

        <Button
          onClick={handleExportExcel}
          disabled={filtered.length === 0}
          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1.5 h-9 shrink-0 shadow-sm"
        >
          <FileSpreadsheet size={15} /> Unduh Excel (.xlsx)
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Cari Nama, NIK, No. Registrasi, atau Unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Filter Jalur */}
          <Select
            value={channelFilter}
            onValueChange={(val: any) => setChannelFilter(val)}
          >
            <SelectTrigger className="w-[140px] text-xs h-9 bg-white">
              <SelectValue placeholder="Semua Jalur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Jalur</SelectItem>
              <SelectItem value="PUSKESMAS">Puskesmas</SelectItem>
              <SelectItem value="DINSOS">Dinas Sosial</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Kecamatan */}
          <Select
            value={districtFilter}
            onValueChange={(val: any) => setDistrictFilter(val)}
          >
            <SelectTrigger className="w-[150px] text-xs h-9 bg-white">
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
      </div>

      {/* Tabel Data Rekap */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileSpreadsheet size={42} className="mx-auto mb-2 opacity-30 text-emerald-600" />
            <p className="text-base font-semibold text-slate-700">Belum ada usulan terverifikasi</p>
            <p className="text-xs text-slate-400 mt-1">
              Data yang telah disetujui oleh Bidang Yankes akan otomatis tampil di rekap ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100 text-emerald-950 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">No. Reg</th>
                  <th className="py-3.5 px-4">Nama Peserta</th>
                  <th className="py-3.5 px-4">NIK (Teks)</th>
                  <th className="py-3.5 px-4">Kecamatan</th>
                  <th className="py-3.5 px-4">Jalur & Unit</th>
                  <th className="py-3.5 px-4">Kategori / Desil</th>
                  <th className="py-3.5 px-4">Tgl Verifikasi</th>
                  <th className="py-3.5 px-4">Verifikator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {sub.registration_no}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">{sub.applicant_name}</td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">{sub.nik}</td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{sub.district}</span>
                      <p className="text-[10px] text-slate-400">{sub.village}</p>
                    </td>

                    <td className="py-3.5 px-4">
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

                    <td className="py-3.5 px-4 text-slate-700">
                      {sub.submission_channel === 'PUSKESMAS'
                        ? sub.condition_category || '-'
                        : `Desil ${sub.desil || '-'}`}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {sub.verified_at
                        ? new Date(sub.verified_at).toLocaleDateString('id-ID')
                        : '-'}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-emerald-800">
                      {sub.verifier_username || 'Yankes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
