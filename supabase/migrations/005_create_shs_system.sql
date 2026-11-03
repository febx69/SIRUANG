-- ============================================================
-- Migrasi: 005_create_shs_system.sql
-- Sistem Usulan Standar Harga Satuan (SHS) Dinas Kesehatan Kab. Pamekasan
-- ============================================================

-- Tabel Periode Pengusulan SHS
CREATE TABLE IF NOT EXISTS public.shs_periods (
  id                  TEXT PRIMARY KEY,
  nama                TEXT NOT NULL,
  tahun               INTEGER NOT NULL,
  buka_at             TIMESTAMPTZ NOT NULL,
  tutup_at            TIMESTAMPTZ NOT NULL,
  masa_revisi_sampai  TIMESTAMPTZ,
  aktif               BOOLEAN DEFAULT true,
  deskripsi           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Usulan Item SHS
CREATE TABLE IF NOT EXISTS public.shs_items (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id             TEXT NOT NULL,
  tahun                 INTEGER NOT NULL,
  user_id               TEXT NOT NULL,
  nama_pengusul         TEXT NOT NULL,
  unit_kerja            TEXT NOT NULL,
  
  -- Spesifikasi
  kode_kategori         TEXT NOT NULL,
  kategori_nama         TEXT,
  uraian                TEXT NOT NULL,
  spek                  TEXT NOT NULL,
  satuan                TEXT NOT NULL,
  
  -- Harga
  harga                 NUMERIC NOT NULL,
  ongkir                NUMERIC DEFAULT 0,
  total                 NUMERIC NOT NULL,
  
  -- Rekening Belanja
  rekening_1            TEXT NOT NULL,
  rekening_2            TEXT,
  rekening_3            TEXT,
  
  -- Kelompok
  kelompok              TEXT NOT NULL,
  
  -- Katalog & TKDN
  link_katalog_1        TEXT NOT NULL,
  link_katalog_2        TEXT,
  link_katalog_3        TEXT,
  tkdn_1                NUMERIC DEFAULT 0,
  tkdn_2                NUMERIC,
  tkdn_3                NUMERIC,
  
  -- Status
  status                TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'diajukan', 'disetujui', 'perlu_perbaikan', 'ditolak')),
  catatan_verifikator   TEXT,
  verifikator_name      TEXT,
  verified_at           TIMESTAMPTZ,
  
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shs_items_period ON public.shs_items(period_id);
CREATE INDEX IF NOT EXISTS idx_shs_items_status ON public.shs_items(status);
CREATE INDEX IF NOT EXISTS idx_shs_items_unit ON public.shs_items(unit_kerja);
CREATE INDEX IF NOT EXISTS idx_shs_items_user ON public.shs_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shs_items_tahun ON public.shs_items(tahun);

-- Enable Row Level Security (RLS)
ALTER TABLE public.shs_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shs_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select shs_periods" ON public.shs_periods FOR SELECT USING (true);
CREATE POLICY "Allow insert shs_periods" ON public.shs_periods FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update shs_periods" ON public.shs_periods FOR UPDATE USING (true);
CREATE POLICY "Allow delete shs_periods" ON public.shs_periods FOR DELETE USING (true);

CREATE POLICY "Allow select shs_items" ON public.shs_items FOR SELECT USING (true);
CREATE POLICY "Allow insert shs_items" ON public.shs_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update shs_items" ON public.shs_items FOR UPDATE USING (true);
CREATE POLICY "Allow delete shs_items" ON public.shs_items FOR DELETE USING (true);
