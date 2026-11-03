-- ============================================================
-- Migrasi: 003_create_cleanliness_system.sql
-- Sistem Monev Kebersihan Dinas Kesehatan Kabupaten Pamekasan
-- ============================================================

-- 1. Tambah kolom is_ob pada tabel users (jika belum ada)
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS is_ob BOOLEAN DEFAULT false;

-- 2. Tabel Laporan Harian OB (Lantai 1, 2, 3)
CREATE TABLE IF NOT EXISTS public.cleanliness_reports (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  date            DATE        NOT NULL,
  time            TEXT        NOT NULL,
  inspector_name  TEXT        NOT NULL,
  floor           TEXT        NOT NULL, -- 'Lantai 1', 'Lantai 2', 'Lantai 3'
  description     TEXT        DEFAULT '',
  photos          JSONB       DEFAULT '[]'::jsonb, -- Array foto (hingga 10 foto)
  user_id         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleanliness_reports_date ON public.cleanliness_reports(date);
CREATE INDEX IF NOT EXISTS idx_cleanliness_reports_floor ON public.cleanliness_reports(floor);

-- 3. Tabel Pengaduan Kebersihan oleh Pegawai
CREATE TABLE IF NOT EXISTS public.cleanliness_complaints (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  date               DATE        NOT NULL,
  time               TEXT        NOT NULL,
  reporter_name      TEXT        NOT NULL,
  bidang             TEXT        NOT NULL,
  floor              TEXT        NOT NULL, -- 'Lantai 1', 'Lantai 2', 'Lantai 3'
  description        TEXT        NOT NULL,
  photos             JSONB       DEFAULT '[]'::jsonb, -- Array foto aduan (hingga 10 foto)
  status             TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  handler_name       TEXT        DEFAULT '',
  handler_notes      TEXT        DEFAULT '',
  resolution_photos  JSONB       DEFAULT '[]'::jsonb, -- Foto bukti tindak lanjut
  resolved_at        TIMESTAMPTZ,
  user_id            TEXT        NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleanliness_complaints_date ON public.cleanliness_complaints(date);
CREATE INDEX IF NOT EXISTS idx_cleanliness_complaints_status ON public.cleanliness_complaints(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.cleanliness_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanliness_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select cleanliness reports" ON public.cleanliness_reports FOR SELECT USING (true);
CREATE POLICY "Allow insert cleanliness reports" ON public.cleanliness_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update cleanliness reports" ON public.cleanliness_reports FOR UPDATE USING (true);
CREATE POLICY "Allow delete cleanliness reports" ON public.cleanliness_reports FOR DELETE USING (true);

CREATE POLICY "Allow select cleanliness complaints" ON public.cleanliness_complaints FOR SELECT USING (true);
CREATE POLICY "Allow insert cleanliness complaints" ON public.cleanliness_complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update cleanliness complaints" ON public.cleanliness_complaints FOR UPDATE USING (true);
CREATE POLICY "Allow delete cleanliness complaints" ON public.cleanliness_complaints FOR DELETE USING (true);

-- 5. Trigger updated_at pada pengaduan
CREATE OR REPLACE FUNCTION update_complaints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleanliness_complaints_updated_at ON public.cleanliness_complaints;
CREATE TRIGGER trigger_cleanliness_complaints_updated_at
  BEFORE UPDATE ON public.cleanliness_complaints
  FOR EACH ROW EXECUTE FUNCTION update_complaints_updated_at();

-- 6. Setup Bucket Storage (jika storage schema tersedia)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleanliness-photos', 'cleanliness-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read cleanliness photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'cleanliness-photos');

CREATE POLICY "Allow public insert cleanliness photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'cleanliness-photos');

CREATE POLICY "Allow public delete cleanliness photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'cleanliness-photos');
