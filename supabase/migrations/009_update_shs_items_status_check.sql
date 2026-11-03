-- ============================================================
-- Migrasi: 009_update_shs_items_status_check.sql
-- Memperbolehkan status 'diperbaiki' pada constraint CHECK tabel shs_items
-- agar konsisten dengan tipe status aplikasi dan riwayat perbaikan usulan.
-- ============================================================

DO $$
BEGIN
  -- Hapus check constraint lama jika ada
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shs_items_status_check'
  ) THEN
    ALTER TABLE public.shs_items DROP CONSTRAINT shs_items_status_check;
  END IF;

  -- Buat constraint baru yang mengizinkan 'diperbaiki'
  ALTER TABLE public.shs_items 
    ADD CONSTRAINT shs_items_status_check 
    CHECK (status IN ('draft', 'diajukan', 'diperbaiki', 'disetujui', 'perlu_perbaikan', 'ditolak'));
END $$;
