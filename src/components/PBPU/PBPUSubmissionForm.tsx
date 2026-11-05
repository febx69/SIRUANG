// src/components/PBPU/PBPUSubmissionForm.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  User as UserIcon,
  Building,
  HeartPulse,
  CreditCard,
  FileSpreadsheet,
  X,
  FileCheck,
  RotateCcw,
  AlertTriangle,
  XCircle,
  Cloud,
  Link as LinkIcon,
  FolderOpen,
} from 'lucide-react';
import { User } from '@/hooks/useSupabaseAuth';
import {
  PBPUSubmission,
  PBPUSubmissionPayload,
  PBPUSubmissionChannel,
  PBPUNikStatus,
  PBPUDocumentType,
  PAMEKASAN_DISTRICTS,
  PAMEKASAN_PUSKESMAS,
  PAMEKASAN_RSUD,
  PUSKESMAS_CONDITION_CATEGORIES,
} from '@/types/pbpu';
import { compressImage } from '@/lib/imageCompression';
import {
  isGoogleDriveUrl,
  extractGoogleDriveFileId,
  getGoogleDrivePreviewUrl,
  uploadFileToGoogleDrive,
  DEFAULT_GAS_WEBAPP_URL,
} from '@/lib/googleDriveHelper';

interface PBPUSubmissionFormProps {
  user: User | null;
  onSubmit: (payload: PBPUSubmissionPayload) => Promise<{ success: boolean; regNo?: string; error?: string }>;
  isSubmitting: boolean;
  onSuccessNavigate?: () => void;
  editSubmission?: PBPUSubmission | null;
  onCancelEdit?: () => void;
  onResubmit?: (
    submissionId: string,
    payload: PBPUSubmissionPayload,
    revisionNote?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

interface UploadedDocState {
  document_type: PBPUDocumentType;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
}

export const PBPUSubmissionForm: React.FC<PBPUSubmissionFormProps> = ({
  user,
  onSubmit,
  isSubmitting,
  onSuccessNavigate,
  editSubmission,
  onCancelEdit,
  onResubmit,
}) => {
  const uname = (user?.username || '').toLowerCase();
  const isPuskesmasUser = user?.role === 'puskesmas' || uname.startsWith('puskesmas') || uname.startsWith('pkm_');
  const isRsudUser = user?.role === 'rsud' || uname === 'rsud' || uname.startsWith('rsud');
  const isDinsosUser = user?.role === 'dinsos' || uname.includes('dinsos');

  // Jalur Pengusulan
  const [channel, setChannel] = useState<PBPUSubmissionChannel>(
    isDinsosUser ? 'DINSOS' : 'PUSKESMAS'
  );

  // Unit Pengusul
  const [submitterUnit, setSubmitterUnit] = useState(() => {
    if (isDinsosUser) return 'Dinas Sosial Kabupaten Pamekasan';
    if (isRsudUser) return PAMEKASAN_RSUD[0] || 'RSUD SMART';
    return PAMEKASAN_PUSKESMAS[0] || 'Puskesmas Proppo';
  });

  // Data Calon Peserta
  const [applicantName, setApplicantName] = useState('');
  const [nik, setNik] = useState('');
  const [noKk, setNoKk] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [address, setAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState<string>(PAMEKASAN_DISTRICTS[0]);
  const [phone, setPhone] = useState('');

  // Jalur Puskesmas / RSUD
  const [conditionCategory, setConditionCategory] = useState<string>(
    PUSKESMAS_CONDITION_CATEGORIES[0]
  );
  const [healthFacility, setHealthFacility] = useState(
    isRsudUser ? (PAMEKASAN_RSUD[0] || 'RSUD SMART') : ''
  );
  const [dpjpName, setDpjpName] = useState('');

  // Jalur Dinsos
  const [desil, setDesil] = useState<number>(1);

  // Status NIK
  const [nikStatus, setNikStatus] = useState<PBPUNikStatus>('TIDAK_BERMASALAH');
  const [notes, setNotes] = useState('');

  // Dokumen Terunggah
  const [documents, setDocuments] = useState<UploadedDocState[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [uploadingDocType, setUploadingDocType] = useState<PBPUDocumentType | null>(null);

  // Sinkronisasi data saat editSubmission aktif (Mode Perbaikan Berkas Ditolak)
  useEffect(() => {
    if (editSubmission) {
      setApplicantName(editSubmission.applicant_name || '');
      setNik(editSubmission.nik || '');
      setNoKk(editSubmission.no_kk || '');
      setBirthPlace(editSubmission.birth_place || '');
      setBirthDate(editSubmission.birth_date || '');
      setGender(editSubmission.gender || 'Laki-laki');
      setAddress(editSubmission.address || '');
      setVillage(editSubmission.village || '');
      setDistrict(editSubmission.district || PAMEKASAN_DISTRICTS[0]);
      setPhone(editSubmission.phone || '');
      setChannel(editSubmission.submission_channel);
      setSubmitterUnit(editSubmission.submitter_unit);
      setConditionCategory(editSubmission.condition_category || PUSKESMAS_CONDITION_CATEGORIES[0]);
      setHealthFacility(editSubmission.health_facility || '');
      setDpjpName(editSubmission.dpjp_name || '');
      setDesil(editSubmission.desil || 1);
      setNikStatus(editSubmission.nik_status || 'TIDAK_BERMASALAH');
      setNotes(editSubmission.notes || '');

      // Load dokumen lama yang telah diunggah sebelumnya
      if (editSubmission.documents && editSubmission.documents.length > 0) {
        setDocuments(
          editSubmission.documents.map((d) => ({
            document_type: d.document_type,
            file_name: d.file_name,
            file_url: d.file_url,
            file_size: d.file_size,
            mime_type: d.mime_type,
          }))
        );
      }
    }
  }, [editSubmission]);

  // File upload handler - Otomatis langsung masuk ke Google Drive
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: PBPUDocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Validasi Ukuran (maks 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`Ukuran file "${file.name}" melebihi batas 10MB.`);
      return;
    }

    setUploadingDocType(docType);

    try {
      let fileUrl = '';
      let fileSize = file.size;
      const mimeType = file.type || 'application/octet-stream';

      // 1. Jika gambar, kompres terlebih dahulu agar upload super cepat
      let uploadPayload: any = file;
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 1600, 1600, 0.85);
        fileSize = compressed.file.size;
        uploadPayload = {
          filename: file.name,
          mimetype: 'image/jpeg',
          base64: compressed.dataUrl,
        };
      }

      // 2. Upload otomatis ke Google Drive dinas
      const driveRes = await uploadFileToGoogleDrive(uploadPayload);

      if (driveRes.success && driveRes.previewUrl) {
        fileUrl = driveRes.previewUrl;
      } else {
        console.warn('Google Drive notice, fallback to local:', driveRes.error);
        if (typeof uploadPayload === 'object' && 'base64' in uploadPayload) {
          fileUrl = uploadPayload.base64;
        } else {
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      }

      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.document_type !== docType);
        return [
          ...filtered,
          {
            document_type: docType,
            file_name: file.name,
            file_url: fileUrl,
            file_size: fileSize,
            mime_type: mimeType,
          },
        ];
      });
    } catch (err: any) {
      setUploadError(`Gagal mengunggah file: ${err.message}`);
    } finally {
      setUploadingDocType(null);
      e.target.value = '';
    }
  };

  const removeDoc = (docType: PBPUDocumentType) => {
    setDocuments((prev) => prev.filter((d) => d.document_type !== docType));
  };

  const hasDoc = (docType: PBPUDocumentType) => documents.some((d) => d.document_type === docType);
  const getDoc = (docType: PBPUDocumentType) => documents.find((d) => d.document_type === docType);

  // Status kelengkapan dokumen
  const hasIdCard = hasDoc('KK') || hasDoc('KTP');
  const isKondisiTertentu = conditionCategory.includes('Kondisi Tertentu');
  const hasPuskesmasDoc = isKondisiTertentu ? hasDoc('DIAGNOSA_DPJP') : hasDoc('SKTM');
  const hasDinsosDoc = hasDoc('BUKTI_DESIL');

  const isDocsComplete = channel === 'PUSKESMAS' ? hasIdCard && hasPuskesmasDoc : hasIdCard && hasDinsosDoc;

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!applicantName.trim()) {
      setUploadError('Nama lengkap calon peserta wajib diisi.');
      return;
    }

    if (!/^\d{16}$/.test(nik.trim())) {
      setUploadError('NIK harus terdiri dari tepat 16 digit angka.');
      return;
    }

    if (noKk.trim() && !/^\d{16}$/.test(noKk.trim())) {
      setUploadError('Nomor KK harus 16 digit angka jika diisi.');
      return;
    }

    if (!birthPlace.trim() || !birthDate) {
      setUploadError('Tempat dan tanggal lahir wajib diisi.');
      return;
    }

    if (!address.trim() || !village.trim()) {
      setUploadError('Alamat domisili dan Desa/Kelurahan wajib diisi.');
      return;
    }

    if (!isDocsComplete) {
      setUploadError('Persyaratan dokumen belum lengkap sesuai ketentuan jalur pengusulan.');
      return;
    }

    const payload: PBPUSubmissionPayload = {
      applicant_name: applicantName.trim(),
      nik: nik.trim(),
      no_kk: noKk.trim() || undefined,
      birth_place: birthPlace.trim(),
      birth_date: birthDate,
      gender,
      address: address.trim(),
      village: village.trim(),
      district,
      phone: phone.trim() || undefined,

      submission_channel: channel,
      submitter_unit: submitterUnit,

      condition_category: channel === 'PUSKESMAS' ? conditionCategory : undefined,
      health_facility: channel === 'PUSKESMAS' ? ((healthFacility.trim() || submitterUnit)) || undefined : undefined,
      dpjp_name: channel === 'PUSKESMAS' ? dpjpName.trim() || undefined : undefined,

      desil: channel === 'DINSOS' ? desil : undefined,

      nik_status: nikStatus,
      notes: notes.trim() || undefined,

      attachedDocuments: documents,
    };

    if (editSubmission && onResubmit) {
      const result = await onResubmit(editSubmission.id, payload, notes.trim());
      if (result.success) {
        setApplicantName('');
        setNik('');
        setNoKk('');
        setBirthPlace('');
        setBirthDate('');
        setAddress('');
        setVillage('');
        setPhone('');
        setHealthFacility('');
        setDpjpName('');
        setNotes('');
        setDocuments([]);
        if (onSuccessNavigate) {
          onSuccessNavigate();
        }
      }
      return;
    }

    const result = await onSubmit(payload);
    if (result.success) {
      // Reset form
      setApplicantName('');
      setNik('');
      setNoKk('');
      setBirthPlace('');
      setBirthDate('');
      setAddress('');
      setVillage('');
      setPhone('');
      setHealthFacility('');
      setDpjpName('');
      setNotes('');
      setDocuments([]);
      if (onSuccessNavigate) {
        onSuccessNavigate();
      }
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Banner Informasi Persyaratan / Banner Mode Perbaikan */}
      {editSubmission ? (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 text-amber-950 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm mt-0.5 font-bold">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[11px] uppercase tracking-wide">
                    Mode Perbaikan Usulan
                  </span>
                  <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-amber-200">
                    {editSubmission.registration_no}
                  </span>
                </div>
                <h3 className="font-black text-amber-950 text-base">
                  Perbaiki Berkas: {editSubmission.applicant_name}
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Usulan ini sebelumnya ditolak oleh Bidang Pelayanan Kesehatan Dinkes. Data lama telah dimuat otomatis ke formulir di bawah. Silakan periksa kembali dan unggah dokumen pengganti sesuai alasan penolakan.
                </p>
              </div>
            </div>

            {onCancelEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold shrink-0 cursor-pointer"
              >
                Batal Perbaikan (Input Baru)
              </Button>
            )}
          </div>

          {editSubmission.rejection_reason && (
            <div className="p-3.5 bg-white rounded-xl border border-rose-200 text-xs space-y-1">
              <span className="font-bold text-rose-700 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <XCircle size={14} className="text-rose-600" />
                Alasan Penolakan dari Bidang Yankes Dinkes:
              </span>
              <p className="font-black text-slate-900 pl-5 text-sm whitespace-pre-wrap">
                "{editSubmission.rejection_reason}"
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-900/10 via-emerald-900/5 to-transparent p-5 text-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-teal-600 text-white shadow-sm mt-0.5">
              <HeartPulse size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">
                Formulir Pendaftaran Calon Peserta PBPU BP
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Pendaftaran peserta Pekerja Bukan Penerima Upah dan Bukan Pekerja (PBPU BP) yang didaftarkan Pemerintah Daerah (Dinas Kesehatan Kab. Pamekasan). Usulan akan diverifikasi oleh Tim Bidang Yankes Dinkes.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: Data Identitas & Jalur Pengusulan */}
        <div className="lg:col-span-7 space-y-6">
          {/* KARTU 1: JALUR PENGUSULAN */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Building size={18} />
              <span>1. Jalur & Instansi Pengusul</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Jalur Pengusulan *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isDinsosUser}
                  onClick={() => setChannel('PUSKESMAS')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channel === 'PUSKESMAS'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-bold shadow-sm'
                      : isDinsosUser
                      ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <p className="text-xs uppercase font-extrabold tracking-wide text-teal-700">
                    {isRsudUser ? 'Jalur RSUD' : 'Jalur Puskesmas'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isRsudUser ? 'Kondisi Khusus & SKTM RSUD' : 'Kondisi Khusus & SKTM'}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={isPuskesmasUser || isRsudUser}
                  onClick={() => setChannel('DINSOS')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channel === 'DINSOS'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-sm'
                      : isPuskesmasUser || isRsudUser
                      ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <p className="text-xs uppercase font-extrabold tracking-wide text-blue-700">Jalur Dinas Sosial</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Data Desil 1–5</p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Unit / Instansi Pengusul *</Label>
              {isRsudUser ? (
                <Select
                  value={submitterUnit}
                  onValueChange={(val) => {
                    setSubmitterUnit(val);
                    setHealthFacility(val);
                  }}
                >
                  <SelectTrigger className="w-full bg-white font-medium">
                    <SelectValue placeholder="Pilih RSUD" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAMEKASAN_RSUD.map((rs) => (
                      <SelectItem key={rs} value={rs}>
                        {rs}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : channel === 'PUSKESMAS' ? (
                <Select
                  value={submitterUnit}
                  onValueChange={(val) => {
                    setSubmitterUnit(val);
                    if (val.toLowerCase().includes('rsud') || val.toLowerCase().includes('smart') || val.toLowerCase().includes('waru') || val.toLowerCase().includes('noer')) {
                      setHealthFacility(val);
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-white font-medium">
                    <SelectValue placeholder="Pilih Instansi Pengusul" />
                  </SelectTrigger>
                  <SelectContent>
                    {!isPuskesmasUser && (
                      <>
                        <div className="px-2 py-1.5 text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50">
                          Rumah Sakit Umum Daerah (RSUD)
                        </div>
                        {PAMEKASAN_RSUD.map((rs) => (
                          <SelectItem key={rs} value={rs}>
                            {rs}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 mt-1">
                          Puskesmas Kabupaten Pamekasan
                        </div>
                      </>
                    )}
                    {PAMEKASAN_PUSKESMAS.map((pkm) => (
                      <SelectItem key={pkm} value={pkm}>
                        {pkm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={submitterUnit}
                  onChange={(e) => setSubmitterUnit(e.target.value)}
                  readOnly={isDinsosUser}
                  placeholder="Dinas Sosial Kab. Pamekasan"
                  className={isDinsosUser ? "bg-slate-100 font-semibold cursor-not-allowed" : "bg-slate-50"}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* KARTU 2: IDENTITAS CALON PESERTA */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <UserIcon size={18} />
              <span>2. Identitas Calon Peserta</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nama Lengkap (sesuai KTP/KK) *</Label>
                <Input
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Contoh: Achmad Syafi'i"
                  className="font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700">NIK (Nomor Induk Kependudukan) *</Label>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      nik.length === 16 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {nik.length}/16 digit
                  </span>
                </div>
                <Input
                  required
                  maxLength={16}
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                  placeholder="3528xxxxxxxxxxxx"
                  className="font-mono text-sm tracking-wider"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700">Nomor Kartu Keluarga (KK)</Label>
                  {noKk && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        noKk.length === 16 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {noKk.length}/16 digit
                    </span>
                  )}
                </div>
                <Input
                  maxLength={16}
                  value={noKk}
                  onChange={(e) => setNoKk(e.target.value.replace(/\D/g, ''))}
                  placeholder="3528xxxxxxxxxxxx (opsional)"
                  className="font-mono text-sm tracking-wider"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tempat Lahir *</Label>
                <Input
                  required
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="Pamekasan"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tanggal Lahir *</Label>
                <Input
                  required
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Jenis Kelamin *</Label>
                <Select
                  value={gender}
                  onValueChange={(val: 'Laki-laki' | 'Perempuan') => setGender(val)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Kecamatan (Kab. Pamekasan) *</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAMEKASAN_DISTRICTS.map((kec) => (
                      <SelectItem key={kec} value={kec}>
                        {kec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Desa / Kelurahan *</Label>
                <Input
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Contoh: Barurambat Kota"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Alamat Lengkap (RT/RW/Dusun) *</Label>
                <Input
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Raya No. ..., RT 01 / RW 02"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Nomor Telepon / WhatsApp</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx (opsional)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KARTU 3: SPESIFIKASI JALUR PUSKESMAS ATAU DINSOS */}
        {channel === 'PUSKESMAS' ? (
          <Card className="border-teal-200 bg-teal-50/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-teal-100">
              <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
                <HeartPulse size={18} />
                <span>3. Detail Kondisi Pasien ({isRsudUser ? 'Jalur RSUD' : 'Jalur Puskesmas'})</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Kategori Kondisi Masyarakat *</Label>
                <Select value={conditionCategory} onValueChange={setConditionCategory}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PUSKESMAS_CONDITION_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isKondisiTertentu
                    ? '⚠️ Wajib melampirkan Surat Keterangan Diagnosa dari Dokter DPJP.'
                    : '⚠️ Wajib melampirkan Surat Keterangan Tidak Mampu (SKTM).'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Fasilitas Pelayanan Kesehatan</Label>
                  <Input
                    value={healthFacility}
                    onChange={(e) => setHealthFacility(e.target.value)}
                    placeholder={isRsudUser ? "RSUD SMART" : "Puskesmas / RSUD SMART Pamekasan"}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Nama DPJP (Dokter Penanggung Jawab)</Label>
                  <Input
                    value={dpjpName}
                    onChange={(e) => setDpjpName(e.target.value)}
                    placeholder="dr. ..., Sp...."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-blue-200 bg-blue-50/20 shadow-sm">
            <CardHeader className="pb-3 border-b border-blue-100">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <CreditCard size={18} />
                <span>3. Detail Kategori Desil (Jalur Dinas Sosial)</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Kelompok Desil (1–5) *</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDesil(d)}
                      className={`py-2.5 rounded-xl border font-bold text-sm transition-all ${
                        desil === d
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Desil {d}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ⚠️ Wajib mengunggah Bukti Surat/Keterangan Desil 1–5 dari Dinas Sosial.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        </div>

        {/* KOLOM KANAN: Dokumen Wajib, Status NIK, & Tombol Kirim */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          {/* KARTU 4: DOKUMEN PERSYARATAN WAJIB */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <FileCheck size={18} />
                <span>4. Dokumen Persyaratan Wajib (PDF / JPG / PNG, Max 5MB)</span>
              </div>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  isDocsComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isDocsComplete ? 'Dokumen Lengkap' : 'Menunggu Dokumen'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* 1. Identitas: KK atau KTP */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    A. Dokumen Identitas (Minimal salah satu: KK atau KTP) *
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Foto KTP Elektronik atau Kartu Keluarga yang jelas dan terbaca.
                  </p>
                </div>
                {hasIdCard ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 size={13} /> Terunggah
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                    Wajib diisi
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Upload KTP */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                  <div className="overflow-hidden pr-1">
                    <p className="text-xs font-semibold text-slate-700">Kartu Tanda Penduduk (KTP)</p>
                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                      {hasDoc('KTP') ? (
                        <>
                          <Cloud size={11} className="text-sky-600 shrink-0" />
                          <span className="font-semibold text-slate-700">{getDoc('KTP')?.file_name}</span>
                          <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">Drive</span>
                        </>
                      ) : (
                        'Belum diunggah'
                      )}
                    </p>
                  </div>
                  {hasDoc('KTP') ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDoc('KTP')}
                      className="text-red-500 hover:text-red-700 h-8 px-2"
                    >
                      <X size={15} />
                    </Button>
                  ) : uploadingDocType === 'KTP' ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-md border border-sky-200 shrink-0">
                      <div className="h-3.5 w-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px]">Ke Drive...</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0 transition-all">
                      <Upload size={13} /> Unggah
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'KTP')}
                      />
                    </label>
                  )}
                </div>

                {/* Upload KK */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                  <div className="overflow-hidden pr-1">
                    <p className="text-xs font-semibold text-slate-700">Kartu Keluarga (KK)</p>
                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                      {hasDoc('KK') ? (
                        <>
                          <Cloud size={11} className="text-sky-600 shrink-0" />
                          <span className="font-semibold text-slate-700">{getDoc('KK')?.file_name}</span>
                          <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">Drive</span>
                        </>
                      ) : (
                        'Belum diunggah'
                      )}
                    </p>
                  </div>
                  {hasDoc('KK') ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDoc('KK')}
                      className="text-red-500 hover:text-red-700 h-8 px-2"
                    >
                      <X size={15} />
                    </Button>
                  ) : uploadingDocType === 'KK' ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-md border border-sky-200 shrink-0">
                      <div className="h-3.5 w-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px]">Ke Drive...</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0 transition-all">
                      <Upload size={13} /> Unggah
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'KK')}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Dokumen Kategori Khusus */}
            {channel === 'PUSKESMAS' && isKondisiTertentu && (
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-teal-950">
                    B. Surat Keterangan Diagnosa DPJP *
                  </p>
                  <p className="text-[11px] text-teal-700">
                    Surat resmi diagnosa penyakit kronis/ibu hamil/gadart bertandatangan DPJP.
                  </p>
                  {hasDoc('DIAGNOSA_DPJP') && (
                    <p className="text-[10px] text-teal-700 font-mono mt-1 flex items-center gap-1">
                      <Cloud size={11} className="text-sky-600 shrink-0" />
                      <span className="font-semibold">{getDoc('DIAGNOSA_DPJP')?.file_name}</span>
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">Google Drive</span>
                    </p>
                  )}
                </div>
                {hasDoc('DIAGNOSA_DPJP') ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDoc('DIAGNOSA_DPJP')}
                    className="text-red-500 hover:text-red-700 h-8 px-2"
                  >
                    <X size={15} />
                  </Button>
                ) : uploadingDocType === 'DIAGNOSA_DPJP' ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-md border border-sky-200 shrink-0">
                    <div className="h-3.5 w-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                    <span>Mengunggah ke Drive...</span>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0 transition-all">
                    <Upload size={13} /> Unggah Surat
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'DIAGNOSA_DPJP')}
                    />
                  </label>
                )}
              </div>
            )}

            {channel === 'PUSKESMAS' && !isKondisiTertentu && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    B. Surat Keterangan Tidak Mampu (SKTM) *
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Surat keterangan tidak mampu yang diterbitkan oleh Kepala Desa/Kelurahan.
                  </p>
                  {hasDoc('SKTM') && (
                    <p className="text-[10px] text-emerald-700 font-mono mt-1 flex items-center gap-1">
                      <Cloud size={11} className="text-sky-600 shrink-0" />
                      <span className="font-semibold">{getDoc('SKTM')?.file_name}</span>
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">Google Drive</span>
                    </p>
                  )}
                </div>
                {hasDoc('SKTM') ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDoc('SKTM')}
                    className="text-red-500 hover:text-red-700 h-8 px-2"
                  >
                    <X size={15} />
                  </Button>
                ) : uploadingDocType === 'SKTM' ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-md border border-sky-200 shrink-0">
                    <div className="h-3.5 w-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                    <span>Mengunggah ke Drive...</span>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0 transition-all">
                    <Upload size={13} /> Unggah SKTM
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'SKTM')}
                    />
                  </label>
                )}
              </div>
            )}

            {channel === 'DINSOS' && (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-blue-950">
                    B. Bukti Data Desil 1–5 *
                  </p>
                  <p className="text-[11px] text-blue-700">
                    Dokumen penetapan/keterangan Desil 1–5 dari Dinas Sosial.
                  </p>
                  {hasDoc('BUKTI_DESIL') && (
                    <p className="text-[10px] text-blue-700 font-mono mt-1 flex items-center gap-1">
                      <Cloud size={11} className="text-sky-600 shrink-0" />
                      <span className="font-semibold">{getDoc('BUKTI_DESIL')?.file_name}</span>
                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">Google Drive</span>
                    </p>
                  )}
                </div>
                {hasDoc('BUKTI_DESIL') ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDoc('BUKTI_DESIL')}
                    className="text-red-500 hover:text-red-700 h-8 px-2"
                  >
                    <X size={15} />
                  </Button>
                ) : uploadingDocType === 'BUKTI_DESIL' ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-md border border-sky-200 shrink-0">
                    <div className="h-3.5 w-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                    <span>Mengunggah ke Drive...</span>
                  </div>
                ) : (
                  <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-sm shrink-0 transition-all">
                    <Upload size={13} /> Unggah Bukti Desil
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'BUKTI_DESIL')}
                    />
                  </label>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KARTU 5: STATUS NIK AWAL & CATATAN */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <FileSpreadsheet size={18} />
              <span>5. Status NIK Awal & Catatan Tambahan</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Hasil Pemeriksaan Awal Status NIK *
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNikStatus('TIDAK_BERMASALAH')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    nikStatus === 'TIDAK_BERMASALAH'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <p className="text-xs font-extrabold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> NIK Valid / Tidak Bermasalah
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    NIK aktif & sinkron SIAK. Usulan <strong>langsung diteruskan ke antrean Verifikasi Bidang Yankes Dinkes</strong>.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setNikStatus('BERMASALAH')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    nikStatus === 'BERMASALAH'
                      ? 'border-rose-600 bg-rose-50/70 text-rose-900 font-bold shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <p className="text-xs font-extrabold text-rose-700 flex items-center gap-1.5">
                    <AlertCircle size={14} /> NIK Bermasalah (Ke Dukcapil Dahulu)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    NIK tidak aktif/anomali. Usulan <strong>masuk ke Dukcapil terlebih dahulu</strong>, belum masuk ke akun Yankes.
                  </p>
                </button>
              </div>

              {nikStatus === 'BERMASALAH' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Penting:</strong> Usulan ini akan masuk ke antrean <strong>Dinas Kependudukan dan Pencatatan Sipil (Dukcapil)</strong> terlebih dahulu untuk disinkronkan di SIAK. Berkas <em>tidak akan masuk ke akun Verifikator Yankes</em> sampai pihak Dukcapil menyelesaikan penanganan dan mengubah status NIK menjadi Valid.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Catatan Pengusul (opsional)</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan mengenai kondisi pasien atau permohonan..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {uploadError && (
          <Alert variant="destructive" className="animate-shake">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Perhatian</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* TOMBOL AKSI */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || !isDocsComplete}
            className={`w-full gap-2 font-bold py-3.5 h-auto text-sm shadow-md transition-all hover:shadow-lg cursor-pointer ${
              editSubmission
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white'
                : 'bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{editSubmission ? 'Mengirim Ulang Berkas Perbaikan...' : 'Mengirim Usulan...'}</span>
              </>
            ) : editSubmission ? (
              <>
                <RotateCcw size={18} />
                <span>Kirim Ulang Usulan Perbaikan (Ajukan Ulang ke Yankes)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Kirim Usulan PBPU BP</span>
              </>
            )}
          </Button>
          {!isDocsComplete && (
            <p className="text-[11px] text-amber-600 text-center mt-2 font-medium">
              * Tombol kirim akan aktif setelah dokumen wajib diunggah.
            </p>
          )}
        </div>
      </div>
    </form>
  </div>
  );
};

export default PBPUSubmissionForm;

