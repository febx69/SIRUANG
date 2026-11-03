// src/components/PBPU/PBPUVerificationPanel.tsx
import React, { useState } from 'react';
import {
  PBPUSubmission,
  PBPUVerificationStatus,
  PBPUNikStatus,
  PBPUSubmissionChannel,
  PBPUDocument,
} from '@/types/pbpu';
import { User } from '@/hooks/useSupabaseAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  FileText,
  AlertCircle,
  Building,
  User as UserIcon,
  MapPin,
  Calendar,
  ShieldCheck,
  Download,
  ExternalLink,
  History,
  Check,
  X,
} from 'lucide-react';
import { PBPUDocumentViewerModal } from './PBPUDocumentViewerModal';

interface PBPUVerificationPanelProps {
  submissions: PBPUSubmission[];
  user: User | null;
  onVerify: (
    submissionId: string,
    decision: 'TERVERIFIKASI' | 'DITOLAK',
    reasonOrNote?: string
  ) => Promise<boolean>;
  isLoading: boolean;
}

export const PBPUVerificationPanel: React.FC<PBPUVerificationPanelProps> = ({
  submissions,
  user,
  onVerify,
  isLoading,
}) => {
  const isVerifier = user?.username === 'yankes' || user?.role === 'admin';

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PBPUVerificationStatus>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | PBPUSubmissionChannel>('ALL');
  const [nikStatusFilter, setNikStatusFilter] = useState<'ALL' | PBPUNikStatus>('ALL');

  // Privacy: Masking NIK
  const [maskNik, setMaskNik] = useState(false);

  // Detail Modal
  const [selectedSubmission, setSelectedSubmission] = useState<PBPUSubmission | null>(null);

  // Document Viewer Modal
  const [activeDoc, setActiveDoc] = useState<PBPUDocument | null>(null);

  // Action Verification Dialog
  const [actionType, setActionType] = useState<'TERVERIFIKASI' | 'DITOLAK' | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const formatMaskedNik = (nikStr: string) => {
    if (!maskNik) return nikStr;
    if (nikStr.length < 8) return '****************';
    return `${nikStr.slice(0, 4)}********${nikStr.slice(-4)}`;
  };

  // Filtered submissions
  const filtered = submissions.filter((sub) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      sub.applicant_name.toLowerCase().includes(term) ||
      sub.nik.includes(term) ||
      sub.registration_no.toLowerCase().includes(term) ||
      sub.submitter_unit.toLowerCase().includes(term);

    const matchStatus = statusFilter === 'ALL' || sub.verification_status === statusFilter;
    const matchChannel = channelFilter === 'ALL' || sub.submission_channel === channelFilter;
    const matchNikStatus = nikStatusFilter === 'ALL' || sub.nik_status === nikStatusFilter;

    return matchSearch && matchStatus && matchChannel && matchNikStatus;
  });

  const handleOpenAction = (type: 'TERVERIFIKASI' | 'DITOLAK') => {
    setActionType(type);
    setVerificationNote('');
  };

  const handleExecuteVerification = async () => {
    if (!selectedSubmission || !actionType) return;
    setActionLoading(true);

    const ok = await onVerify(selectedSubmission.id, actionType, verificationNote);
    setActionLoading(false);

    if (ok) {
      setActionType(null);
      // Update selectedSubmission locally for modal
      setSelectedSubmission((prev) =>
        prev
          ? {
              ...prev,
              verification_status: actionType,
              rejection_reason: actionType === 'DITOLAK' ? verificationNote : null,
              verifier_note: actionType === 'TERVERIFIKASI' ? verificationNote : null,
              verifier_username: user?.username || 'yankes',
              verified_at: new Date().toISOString(),
            }
          : null
      );
    }
  };

  const getStatusBadge = (status: PBPUVerificationStatus) => {
    switch (status) {
      case 'MENUNGGU':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 gap-1 font-semibold">
            <Clock size={12} /> Menunggu Verifikasi
          </Badge>
        );
      case 'TERVERIFIKASI':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 gap-1 font-semibold">
            <CheckCircle2 size={12} /> Terverifikasi
          </Badge>
        );
      case 'DITOLAK':
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-200 gap-1 font-semibold">
            <XCircle size={12} /> Ditolak Dinkes
          </Badge>
        );
    }
  };

  const getNikBadge = (nikStat: PBPUNikStatus) => {
    if (nikStat === 'TIDAK_BERMASALAH') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 size={11} /> NIK Valid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
        <AlertCircle size={11} /> NIK Bermasalah
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* FILTER & PENCARIAN */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            placeholder="Cari Nama, NIK 16 digit, No. Registrasi, atau Unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Status Verifikasi */}
          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="w-[160px] text-xs h-9 bg-white">
              <SelectValue placeholder="Status Verifikasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Keputusan</SelectItem>
              <SelectItem value="MENUNGGU">Menunggu Verifikasi</SelectItem>
              <SelectItem value="TERVERIFIKASI">Terverifikasi</SelectItem>
              <SelectItem value="DITOLAK">Ditolak Dinkes</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Jalur */}
          <Select
            value={channelFilter}
            onValueChange={(val: any) => setChannelFilter(val)}
          >
            <SelectTrigger className="w-[140px] text-xs h-9 bg-white">
              <SelectValue placeholder="Jalur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Jalur</SelectItem>
              <SelectItem value="PUSKESMAS">Jalur Puskesmas</SelectItem>
              <SelectItem value="DINSOS">Jalur Dinsos</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter Status NIK */}
          <Select
            value={nikStatusFilter}
            onValueChange={(val: any) => setNikStatusFilter(val)}
          >
            <SelectTrigger className="w-[150px] text-xs h-9 bg-white">
              <SelectValue placeholder="Status NIK" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua NIK</SelectItem>
              <SelectItem value="TIDAK_BERMASALAH">NIK Valid</SelectItem>
              <SelectItem value="BERMASALAH">NIK Bermasalah</SelectItem>
            </SelectContent>
          </Select>

          {/* Toggle Masking NIK */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMaskNik(!maskNik)}
            className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-700 gap-1 border border-slate-200 bg-white"
            title={maskNik ? 'Tampilkan NIK lengkap' : 'Sensor NIK untuk privasi'}
          >
            {maskNik ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{maskNik ? 'Buka NIK' : 'Mask NIK'}</span>
          </Button>
        </div>
      </div>

      {/* DAFTAR USULAN TABLE / LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText size={42} className="mx-auto mb-2 opacity-30" />
            <p className="text-base font-semibold text-slate-600">Tidak ada data usulan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter yang aktif.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">No. Registrasi</th>
                  <th className="py-3.5 px-4">Calon Peserta</th>
                  <th className="py-3.5 px-4">Kecamatan</th>
                  <th className="py-3.5 px-4">Jalur & Pengusul</th>
                  <th className="py-3.5 px-4">Status NIK</th>
                  <th className="py-3.5 px-4">Keputusan Dinkes</th>
                  <th className="py-3.5 px-4 text-center">Dokumen</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sub) => {
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {sub.registration_no}
                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                          {new Date(sub.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 text-sm">{sub.applicant_name}</p>
                        <p className="font-mono text-slate-500 text-[11px] mt-0.5">
                          NIK: {formatMaskedNik(sub.nik)}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700">{sub.district}</span>
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
                        <p className="text-[11px] font-medium text-slate-600 mt-1">
                          {sub.submitter_unit}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">{getNikBadge(sub.nik_status)}</td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(sub.verification_status)}
                        {sub.verification_status === 'DITOLAK' && sub.rejection_reason && (
                          <p className="text-[10px] text-rose-600 line-clamp-1 mt-0.5 italic">
                            "{sub.rejection_reason}"
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {sub.documents?.length || 0} File
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSubmission(sub);
                          }}
                          className="h-8 text-xs font-bold text-teal-800 hover:text-teal-900 border-teal-200 hover:bg-teal-50 gap-1"
                        >
                          Telaah
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL PEMERIKSAAN & VERIFIKASI */}
      <Dialog
        open={Boolean(selectedSubmission)}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      >
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
          {selectedSubmission && (
            <>
              <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                      {selectedSubmission.registration_no}
                    </span>
                    {getStatusBadge(selectedSubmission.verification_status)}
                    {getNikBadge(selectedSubmission.nik_status)}
                  </div>
                  <DialogTitle className="text-xl font-bold text-slate-900 mt-2">
                    {selectedSubmission.applicant_name}
                  </DialogTitle>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
                {/* 1. INFORMASI CALON PESERTA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-slate-800 text-[13px] border-b pb-1 flex items-center gap-1.5">
                      <UserIcon size={14} className="text-teal-600" /> Identitas Diri
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">NIK:</span>
                      <span className="col-span-2 font-mono font-bold text-slate-800">
                        {formatMaskedNik(selectedSubmission.nik)}
                      </span>
                    </div>
                    {selectedSubmission.no_kk && (
                      <div className="grid grid-cols-3 gap-1">
                        <span className="text-slate-500">Nomor KK:</span>
                        <span className="col-span-2 font-mono text-slate-700">
                          {selectedSubmission.no_kk}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">TTL:</span>
                      <span className="col-span-2 text-slate-800">
                        {selectedSubmission.birth_place},{' '}
                        {new Date(selectedSubmission.birth_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">Jenis Kelamin:</span>
                      <span className="col-span-2 text-slate-800">{selectedSubmission.gender}</span>
                    </div>
                    {selectedSubmission.phone && (
                      <div className="grid grid-cols-3 gap-1">
                        <span className="text-slate-500">Telepon/WA:</span>
                        <span className="col-span-2 text-slate-800">{selectedSubmission.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <p className="font-bold text-slate-800 text-[13px] border-b pb-1 flex items-center gap-1.5">
                      <MapPin size={14} className="text-teal-600" /> Domisili & Pengusul
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">Kecamatan:</span>
                      <span className="col-span-2 font-bold text-slate-800">
                        {selectedSubmission.district}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">Desa/Kelurahan:</span>
                      <span className="col-span-2 text-slate-800">{selectedSubmission.village}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">Alamat:</span>
                      <span className="col-span-2 text-slate-800">{selectedSubmission.address}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">Jalur / Unit:</span>
                      <span className="col-span-2 text-slate-800 font-semibold">
                        {selectedSubmission.submission_channel} ({selectedSubmission.submitter_unit})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500">Diajukan Pada:</span>
                      <span className="col-span-2 text-slate-600">
                        {new Date(selectedSubmission.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. SPESIFIKASI KATEGORI JALUR */}
                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider text-slate-500">
                    Spesifikasi Pengajuan
                  </p>
                  {selectedSubmission.submission_channel === 'PUSKESMAS' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Kategori Kondisi:</span>
                        <span className="font-bold text-teal-900">
                          {selectedSubmission.condition_category || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Fasilitas Kesehatan:</span>
                        <span className="font-medium text-slate-800">
                          {selectedSubmission.health_facility || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Dokter DPJP:</span>
                        <span className="font-medium text-slate-800">
                          {selectedSubmission.dpjp_name || '-'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs">
                      <span className="text-slate-400 block text-[11px]">Tingkat Desil:</span>
                      <span className="font-bold text-blue-900 text-sm">
                        Desil {selectedSubmission.desil || '-'} (Dinas Sosial)
                      </span>
                    </div>
                  )}

                  {selectedSubmission.notes && (
                    <div className="mt-3 pt-3 border-t text-xs">
                      <span className="text-slate-400 block text-[11px]">Catatan Pengusul:</span>
                      <p className="text-slate-700 italic mt-0.5">"{selectedSubmission.notes}"</p>
                    </div>
                  )}
                </div>

                {/* 3. DOKUMEN PERSYARATAN TERLAMPIR */}
                <div className="space-y-2">
                  <p className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    Dokumen Persyaratan ({selectedSubmission.documents?.length || 0})
                  </p>
                  {(!selectedSubmission.documents || selectedSubmission.documents.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">Tidak ada file dokumen terlampir.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedSubmission.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
                        >
                          <div>
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 uppercase">
                              {doc.document_type}
                            </span>
                            <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1" title={doc.file_name}>
                              {doc.file_name}
                            </p>
                            {doc.file_size && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {(doc.file_size / 1024).toFixed(0)} KB
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs font-semibold h-7 gap-1"
                            onClick={() => setActiveDoc(doc)}
                          >
                            <Eye size={12} /> Buka Pratinjau
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. RIWAYAT KEPUTUSAN & TINDAK LANJUT NIK */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Riwayat Verifikasi Dinkes */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <ShieldCheck size={14} className="text-teal-600" /> Hasil Verifikasi Dinkes
                    </p>
                    {selectedSubmission.verified_at ? (
                      <div className="space-y-1">
                        <p>
                          <span className="text-slate-500">Verifikator:</span>{' '}
                          <strong className="text-slate-800">{selectedSubmission.verifier_username}</strong>
                        </p>
                        <p>
                          <span className="text-slate-500">Waktu:</span>{' '}
                          {new Date(selectedSubmission.verified_at).toLocaleString('id-ID')}
                        </p>
                        {selectedSubmission.rejection_reason && (
                          <div className="p-2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-xs">
                            <strong>Alasan Penolakan:</strong> {selectedSubmission.rejection_reason}
                          </div>
                        )}
                        {selectedSubmission.verifier_note && (
                          <div className="p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                            <strong>Catatan:</strong> {selectedSubmission.verifier_note}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">Belum ada keputusan verifikasi dari Dinkes.</p>
                    )}
                  </div>

                  {/* Riwayat NIK Dukcapil */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <History size={14} className="text-blue-600" /> Status NIK Dukcapil
                    </p>
                    <p>
                      <span className="text-slate-500">Status Saat Ini:</span>{' '}
                      <strong>{selectedSubmission.nik_status}</strong>
                    </p>
                    {selectedSubmission.nik_followup_note && (
                      <div className="p-2 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs">
                        <strong>Catatan Tindak Lanjut:</strong> {selectedSubmission.nik_followup_note}
                      </div>
                    )}
                    {selectedSubmission.nik_history && selectedSubmission.nik_history.length > 0 && (
                      <div className="space-y-1 pt-1 max-h-24 overflow-y-auto">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Log Perubahan NIK:</p>
                        {selectedSubmission.nik_history.map((nh) => (
                          <p key={nh.id} className="text-[11px] text-slate-600">
                            • {new Date(nh.created_at).toLocaleDateString('id-ID')} oleh {nh.updated_by}: {nh.note}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FOOTER AKSI VERIFIKASI (Khusus Verifikator Yankes & Admin) */}
              <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSubmission(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>

                {isVerifier && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1"
                      onClick={() => handleOpenAction('DITOLAK')}
                    >
                      <XCircle size={14} /> Tolak Usulan
                    </Button>

                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 shadow-sm"
                      onClick={() => handleOpenAction('TERVERIFIKASI')}
                    >
                      <CheckCircle2 size={14} /> Setujui (Terverifikasi)
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI / ALASAN PENOLAKAN */}
      <Dialog
        open={Boolean(actionType)}
        onOpenChange={(open) => !open && setActionType(null)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {actionType === 'TERVERIFIKASI' ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>Setujui Usulan PBPU BP</span>
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-rose-600" />
                  <span>Tolak Usulan PBPU BP</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              {actionType === 'TERVERIFIKASI'
                ? `Usulan atas nama "${selectedSubmission?.applicant_name}" (No. Reg: ${selectedSubmission?.registration_no}) akan ditetapkan sebagai Terverifikasi oleh Bidang Yankes Dinkes.`
                : `Sesuai PRD Bagian 8.2 & FR-011, Anda WAJIB mencantumkan alasan penolakan secara jelas agar diketahui oleh unit pengusul.`}
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                {actionType === 'DITOLAK' ? 'Alasan Penolakan (Wajib) *' : 'Catatan Verifikator (Opsional)'}
              </Label>
              <Textarea
                rows={3}
                required={actionType === 'DITOLAK'}
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                placeholder={
                  actionType === 'DITOLAK'
                    ? 'Contoh: Dokumen diagnosa DPJP tidak bertandatangan / NIK tidak sesuai KTP...'
                    : 'Catatan rekomendasi...'
                }
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionType(null)}
              disabled={actionLoading}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={actionLoading || (actionType === 'DITOLAK' && !verificationNote.trim())}
              onClick={handleExecuteVerification}
              className={
                actionType === 'TERVERIFIKASI'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  : 'bg-rose-600 hover:bg-rose-700 text-white font-bold'
              }
            >
              {actionLoading ? 'Menyimpan...' : actionType === 'TERVERIFIKASI' ? 'Konfirmasi Setuju' : 'Konfirmasi Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DOCUMENT PREVIEW MODAL */}
      <PBPUDocumentViewerModal
        document={activeDoc}
        isOpen={Boolean(activeDoc)}
        onClose={() => setActiveDoc(null)}
      />
    </div>
  );
};
