// src/types/pbpu.ts
// Definisi tipe dan data referensi untuk Aplikasi Pendaftaran PBPU BP Dinas Kesehatan Kab. Pamekasan

export type PBPUSubmissionChannel = 'PUSKESMAS' | 'DINSOS';

export type PBPUNikStatus = 'TIDAK_BERMASALAH' | 'BERMASALAH';

export type PBPUVerificationStatus = 'MENUNGGU' | 'TERVERIFIKASI' | 'DITOLAK';

export type PBPUDocumentType =
  | 'KK'
  | 'KTP'
  | 'DIAGNOSA_DPJP'
  | 'SKTM'
  | 'BUKTI_DESIL'
  | 'LAINNYA';

export interface PBPUDocument {
  id: string;
  submission_id: string;
  document_type: PBPUDocumentType;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  created_at?: string;
}

export interface PBPUNikHistory {
  id: string;
  submission_id: string;
  old_status: PBPUNikStatus;
  new_status: PBPUNikStatus;
  note: string;
  updated_by: string;
  created_at: string;
}

export interface PBPUStatusHistory {
  id: string;
  submission_id: string;
  old_status: PBPUVerificationStatus;
  new_status: PBPUVerificationStatus;
  reason_or_note?: string | null;
  changed_by: string;
  created_at: string;
}

export interface PBPUSubmission {
  id: string;
  registration_no: string;
  applicant_name: string;
  nik: string;
  no_kk?: string | null;
  birth_place: string;
  birth_date: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
  village: string;
  district: string;
  phone?: string | null;

  submission_channel: PBPUSubmissionChannel;
  submitter_username: string;
  submitter_email?: string | null;
  submitter_unit: string;

  // Jalur Puskesmas
  condition_category?: string | null;
  health_facility?: string | null;
  dpjp_name?: string | null;

  // Jalur Dinsos
  desil?: number | null; // 1 | 2 | 3 | 4 | 5

  // Status Terpisah
  nik_status: PBPUNikStatus;
  nik_followup_note?: string | null;

  verification_status: PBPUVerificationStatus;
  rejection_reason?: string | null;
  verifier_username?: string | null;
  verifier_note?: string | null;
  verified_at?: string | null;

  notes?: string | null;
  documents?: PBPUDocument[];
  nik_history?: PBPUNikHistory[];
  status_history?: PBPUStatusHistory[];

  created_at: string;
  updated_at: string;
}

export interface PBPUSubmissionPayload {
  applicant_name: string;
  nik: string;
  no_kk?: string;
  birth_place: string;
  birth_date: string;
  gender: 'Laki-laki' | 'Perempuan';
  address: string;
  village: string;
  district: string;
  phone?: string;

  submission_channel: PBPUSubmissionChannel;
  submitter_unit: string;

  // Puskesmas specific
  condition_category?: string;
  health_facility?: string;
  dpjp_name?: string;

  // Dinsos specific
  desil?: number;

  nik_status: PBPUNikStatus;
  notes?: string;

  // Dokumen yang dilampirkan
  attachedDocuments: {
    document_type: PBPUDocumentType;
    file_name: string;
    file_url: string;
    file_size?: number;
    mime_type?: string;
  }[];
}

// 13 Kecamatan di Kabupaten Pamekasan
export const PAMEKASAN_DISTRICTS = [
  'Batumarmar',
  'Galis',
  'Kadur',
  'Larangan',
  'Pademawu',
  'Pakong',
  'Palengaan',
  'Pamekasan',
  'Pasean',
  'Pegantenan',
  'Proppo',
  'Tlanakan',
  'Waru',
] as const;

// 21 Puskesmas di Kabupaten Pamekasan
export const PAMEKASAN_PUSKESMAS = [
  'Puskesmas Kowel',
  'Puskesmas Teja',
  'Puskesmas Tlanakan',
  'Puskesmas Bandaran',
  'Puskesmas Pademawu',
  'Puskesmas Sopa\'ah',
  'Puskesmas Galis',
  'Puskesmas Larangan',
  'Puskesmas Panaguan',
  'Puskesmas Kadur',
  'Puskesmas Pakong',
  'Puskesmas Waru',
  'Puskesmas Tampojung Pregi',
  'Puskesmas Batumarmar',
  'Puskesmas Pegantenan',
  'Puskesmas Bulangan Haji',
  'Puskesmas Palengaan',
  'Puskesmas Rombasan',
  'Puskesmas Proppo',
  'Puskesmas Mapper',
  'Puskesmas Pasean',
] as const;

export const PUSKESMAS_CONDITION_CATEGORIES = [
  'Kondisi Tertentu: Penyakit Kronis / Ibu Hamil / Gawat Darurat',
  'Masyarakat Sakit di Luar Kondisi Tertentu',
] as const;

