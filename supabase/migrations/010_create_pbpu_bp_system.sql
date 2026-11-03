-- ============================================================
-- Migrasi: 010_create_pbpu_bp_system.sql
-- Aplikasi Pendaftaran PBPU BP (Pekerja Bukan Penerima Upah & Bukan Pekerja)
-- Dinas Kesehatan Kabupaten Pamekasan
-- Sesuai PRD Aplikasi Pendaftaran PBPU BP Versi 1.0
-- ============================================================

-- 1. Tabel Utama Usulan PBPU BP
CREATE TABLE IF NOT EXISTS public.pbpu_submissions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_no       TEXT UNIQUE NOT NULL,
  
  -- Identitas Calon Peserta
  applicant_name        TEXT NOT NULL,
  nik                   VARCHAR(16) NOT NULL,
  no_kk                 VARCHAR(16),
  birth_place           TEXT NOT NULL,
  birth_date            DATE NOT NULL,
  gender                VARCHAR(10) NOT NULL CHECK (gender IN ('Laki-laki', 'Perempuan')),
  address               TEXT NOT NULL,
  village               TEXT NOT NULL,
  district              TEXT NOT NULL,
  phone                 TEXT,
  
  -- Jalur Pengusulan & Unit Pengusul
  submission_channel    VARCHAR(20) NOT NULL CHECK (submission_channel IN ('PUSKESMAS', 'DINSOS')),
  submitter_username    TEXT NOT NULL,
  submitter_email       TEXT,
  submitter_unit        TEXT NOT NULL,
  
  -- Data Khusus Jalur Puskesmas
  condition_category    TEXT, -- 'Kondisi Tertentu: Penyakit Kronis / Ibu Hamil / Gawat Darurat' ATAU 'Masyarakat Sakit di Luar Kondisi Tertentu'
  health_facility       TEXT,
  dpjp_name             TEXT,
  
  -- Data Khusus Jalur Dinsos
  desil                 INTEGER CHECK (desil BETWEEN 1 AND 5),
  
  -- Status NIK (Atribut Proses Terpisah)
  nik_status            VARCHAR(20) NOT NULL DEFAULT 'TIDAK_BERMASALAH' CHECK (nik_status IN ('TIDAK_BERMASALAH', 'BERMASALAH')),
  nik_followup_note     TEXT,
  
  -- Status Verifikasi Dinkes (Atribut Keputusan Utama)
  verification_status   VARCHAR(30) NOT NULL DEFAULT 'MENUNGGU' CHECK (verification_status IN ('MENUNGGU', 'TERVERIFIKASI', 'DITOLAK')),
  rejection_reason      TEXT,
  verifier_username     TEXT,
  verifier_note         TEXT,
  verified_at           TIMESTAMPTZ,
  
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks Pencarian & Performa
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_reg_no ON public.pbpu_submissions(registration_no);
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_nik ON public.pbpu_submissions(nik);
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_verif_status ON public.pbpu_submissions(verification_status);
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_nik_status ON public.pbpu_submissions(nik_status);
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_channel ON public.pbpu_submissions(submission_channel);
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_unit ON public.pbpu_submissions(submitter_unit);
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_district ON public.pbpu_submissions(district);
CREATE INDEX IF NOT EXISTS idx_pbpu_sub_created ON public.pbpu_submissions(created_at DESC);

-- 2. Tabel Dokumen Persyaratan
CREATE TABLE IF NOT EXISTS public.pbpu_documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   UUID NOT NULL REFERENCES public.pbpu_submissions(id) ON DELETE CASCADE,
  document_type   VARCHAR(30) NOT NULL CHECK (document_type IN ('KK', 'KTP', 'DIAGNOSA_DPJP', 'SKTM', 'BUKTI_DESIL', 'LAINNYA')),
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  uploaded_by     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pbpu_doc_sub ON public.pbpu_documents(submission_id);

-- 3. Tabel Riwayat Status NIK (Dukcapil Follow-up)
CREATE TABLE IF NOT EXISTS public.pbpu_nik_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   UUID NOT NULL REFERENCES public.pbpu_submissions(id) ON DELETE CASCADE,
  old_status      VARCHAR(20) NOT NULL,
  new_status      VARCHAR(20) NOT NULL,
  note            TEXT NOT NULL,
  updated_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pbpu_nik_hist_sub ON public.pbpu_nik_history(submission_id);

-- 4. Tabel Riwayat Status Verifikasi (Audit Trail Dinkes)
CREATE TABLE IF NOT EXISTS public.pbpu_status_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id   UUID NOT NULL REFERENCES public.pbpu_submissions(id) ON DELETE CASCADE,
  old_status      VARCHAR(30) NOT NULL,
  new_status      VARCHAR(30) NOT NULL,
  reason_or_note  TEXT,
  changed_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pbpu_stat_hist_sub ON public.pbpu_status_history(submission_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.pbpu_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbpu_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbpu_nik_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbpu_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select pbpu_submissions" ON public.pbpu_submissions FOR SELECT USING (true);
CREATE POLICY "Allow insert pbpu_submissions" ON public.pbpu_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update pbpu_submissions" ON public.pbpu_submissions FOR UPDATE USING (true);
CREATE POLICY "Allow delete pbpu_submissions" ON public.pbpu_submissions FOR DELETE USING (true);

CREATE POLICY "Allow select pbpu_documents" ON public.pbpu_documents FOR SELECT USING (true);
CREATE POLICY "Allow insert pbpu_documents" ON public.pbpu_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update pbpu_documents" ON public.pbpu_documents FOR UPDATE USING (true);
CREATE POLICY "Allow delete pbpu_documents" ON public.pbpu_documents FOR DELETE USING (true);

CREATE POLICY "Allow select pbpu_nik_history" ON public.pbpu_nik_history FOR SELECT USING (true);
CREATE POLICY "Allow insert pbpu_nik_history" ON public.pbpu_nik_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select pbpu_status_history" ON public.pbpu_status_history FOR SELECT USING (true);
CREATE POLICY "Allow insert pbpu_status_history" ON public.pbpu_status_history FOR INSERT WITH CHECK (true);

