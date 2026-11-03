// src/components/PBPU/PBPUSubmissionForm.tsx
import React, { useState, useId } from 'react';
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
} from 'lucide-react';
import { User } from '@/hooks/useSupabaseAuth';
import {
  PBPUSubmissionPayload,
  PBPUSubmissionChannel,
  PBPUNikStatus,
  PBPUDocumentType,
  PAMEKASAN_DISTRICTS,
  PAMEKASAN_PUSKESMAS,
  PUSKESMAS_CONDITION_CATEGORIES,
} from '@/types/pbpu';
import { compressImage } from '@/lib/imageCompression';

interface PBPUSubmissionFormProps {
  user: User | null;
  onSubmit: (payload: PBPUSubmissionPayload) => Promise<{ success: boolean; regNo?: string; error?: string }>;
  isSubmitting: boolean;
  onSuccessNavigate?: () => void;
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
}) => {
  const isPuskesmasUser = user?.role === 'puskesmas' || user?.username.startsWith('puskesmas');
  const isDinsosUser = user?.username.toLowerCase().includes('dinsos');

  // Jalur Pengusulan
  const [channel, setChannel] = useState<PBPUSubmissionChannel>(
    isDinsosUser ? 'DINSOS' : 'PUSKESMAS'
  );

  // Unit Pengusul
  const [submitterUnit, setSubmitterUnit] = useState(() => {
    if (isPuskesmasUser) {
      const match = PAMEKASAN_PUSKESMAS.find((p) =>
        p.toLowerCase().replace(/[\s']/g, '').includes(user?.username.replace(/puskesmas_?/i, '') || '')
      );
      return match || user?.username || 'Puskesmas';
    }
    if (isDinsosUser) return 'Dinas Sosial Kabupaten Pamekasan';
    return 'Puskesmas Proppo';
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

  // Jalur Puskesmas
  const [conditionCategory, setConditionCategory] = useState<string>(
    PUSKESMAS_CONDITION_CATEGORIES[0]
  );
  const [healthFacility, setHealthFacility] = useState('');
  const [dpjpName, setDpjpName] = useState('');

  // Jalur Dinsos
  const [desil, setDesil] = useState<number>(1);

  // Status NIK
  const [nikStatus, setNikStatus] = useState<PBPUNikStatus>('TIDAK_BERMASALAH');
  const [notes, setNotes] = useState('');

  // Dokumen Terunggah
  const [documents, setDocuments] = useState<UploadedDocState[]>([]);
  const [uploadError, setUploadError] = useState('');

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: PBPUDocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    // Validasi Ukuran (maks 5MB sesuai Bagian 6.1 PRD)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(`Ukuran file "${file.name}" melebihi batas 5MB.`);
      return;
    }

    try {
      let fileUrl = '';
      let fileSize = file.size;
      const mimeType = file.type || 'application/octet-stream';

      if (file.type.startsWith('image/')) {
        // Kompresi gambar otomatis
        const compressed = await compressImage(file, 1600, 1600, 0.8);
        fileUrl = compressed.dataUrl;
        fileSize = compressed.file.size;
      } else {
        // PDF atau dokumen lain: baca sebagai Base64 Data URL
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setDocuments((prev) => {
        // Ganti jika jenis dokumen yang sama sudah ada
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
      setUploadError(`Gagal memproses file: ${err.message}`);
    } finally {
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
      health_facility: channel === 'PUSKESMAS' ? healthFacility.trim() || undefined : undefined,
      dpjp_name: channel === 'PUSKESMAS' ? dpjpName.trim() || undefined : undefined,

      desil: channel === 'DINSOS' ? desil : undefined,

      nik_status: nikStatus,
      notes: notes.trim() || undefined,

      attachedDocuments: documents,
    };

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
      {/* Banner Informasi Persyaratan */}
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
                  onClick={() => setChannel('PUSKESMAS')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channel === 'PUSKESMAS'
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-bold shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <p className="text-xs uppercase font-extrabold tracking-wide text-teal-700">Jalur Puskesmas</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kondisi Khusus & SKTM</p>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('DINSOS')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channel === 'DINSOS'
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-sm'
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
              {channel === 'PUSKESMAS' ? (
                <Select value={submitterUnit} onValueChange={setSubmitterUnit}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Pilih Puskesmas" />
                  </SelectTrigger>
                  <SelectContent>
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
                  placeholder="Dinas Sosial Kab. Pamekasan"
                  className="bg-slate-50"
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
                <span>3. Detail Kondisi Pasien (Jalur Puskesmas)</span>
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
                    placeholder="Puskesmas / RSUD SMART Pamekasan"
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
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-semibold text-slate-700">Kartu Tanda Penduduk (KTP)</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {hasDoc('KTP') ? getDoc('KTP')?.file_name : 'Belum diunggah'}
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
                  ) : (
                    <label className="cursor-pointer inline-flex items-center justify-center h-8 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium gap-1">
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
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-semibold text-slate-700">Kartu Keluarga (KK)</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {hasDoc('KK') ? getDoc('KK')?.file_name : 'Belum diunggah'}
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
                  ) : (
                    <label className="cursor-pointer inline-flex items-center justify-center h-8 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium gap-1">
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
              <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-teal-950">
                    B. Surat Keterangan Diagnosa DPJP *
                  </p>
                  <p className="text-[11px] text-teal-700">
                    Surat resmi diagnosa penyakit kronis/ibu hamil/gadart bertandatangan DPJP.
                  </p>
                  {hasDoc('DIAGNOSA_DPJP') && (
                    <p className="text-[10px] text-teal-600 font-mono mt-1">
                      File: {getDoc('DIAGNOSA_DPJP')?.file_name}
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
                ) : (
                  <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-sm">
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
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    B. Surat Keterangan Tidak Mampu (SKTM) *
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Surat keterangan tidak mampu yang diterbitkan oleh Kepala Desa/Kelurahan.
                  </p>
                  {hasDoc('SKTM') && (
                    <p className="text-[10px] text-emerald-600 font-mono mt-1">
                      File: {getDoc('SKTM')?.file_name}
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
                ) : (
                  <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-sm">
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
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-950">
                    B. Bukti Data Desil 1–5 *
                  </p>
                  <p className="text-[11px] text-blue-700">
                    Dokumen penetapan/keterangan Desil 1–5 dari Dinas Sosial.
                  </p>
                  {hasDoc('BUKTI_DESIL') && (
                    <p className="text-[10px] text-blue-600 font-mono mt-1">
                      File: {getDoc('BUKTI_DESIL')?.file_name}
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
                ) : (
                  <label className="cursor-pointer inline-flex items-center justify-center h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-sm">
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
                    <CheckCircle2 size={14} /> Tidak Bermasalah
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    NIK valid, aktif di SIAK Dukcapil dan tidak ada anomali.
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
                    <AlertCircle size={14} /> Bermasalah (Perlu Dukcapil)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    NIK tidak aktif, ganda, atau belum terkonsolidasi pusat.
                  </p>
                </button>
              </div>
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
            className="w-full gap-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold py-3.5 h-auto text-sm shadow-md transition-all hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Mengirim Usulan...</span>
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

