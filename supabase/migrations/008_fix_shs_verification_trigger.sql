-- ============================================================
-- Migrasi: 008_fix_shs_verification_trigger.sql
-- Memperbaiki Trigger check_shs_item_period_deadline agar Verifikator 
-- (Admin Dinkes & Pengurus Barang) TETAP DAPAT memverifikasi usulan
-- meskipun batas waktu pengusulan (tutup_at) telah berakhir.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_shs_item_period_deadline()
RETURNS TRIGGER AS $$
DECLARE
  v_period public.shs_periods%ROWTYPE;
  v_is_content_changed BOOLEAN;
BEGIN
  -- Ambil data periode yang bersangkutan
  SELECT * INTO v_period 
  FROM public.shs_periods 
  WHERE id = NEW.period_id;

  -- Jika periode tidak ditemukan atau status aktif = false
  IF NOT FOUND OR NOT v_period.aktif THEN
    RAISE EXCEPTION 'Periode pengusulan tidak ditemukan atau tidak aktif.';
  END IF;

  -- 1. Pengecekan pada INSERT baru:
  -- Jika waktu server saat ini sudah melewati batas tutup_at
  IF TG_OP = 'INSERT' THEN
    IF NOW() > v_period.tutup_at THEN
      RAISE EXCEPTION 'Batas waktu pengusulan SHS telah berakhir pada % WIB. Input usulan baru ditolak.',
        to_char(v_period.tutup_at AT TIME ZONE 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI:SS');
    END IF;
  END IF;

  -- 2. Pengecekan pada UPDATE:
  IF TG_OP = 'UPDATE' THEN
    -- Cek apakah konten spesifikasi barang diubah oleh pengusul (uraian, spek, harga, rekening, kategori, dsb)
    v_is_content_changed := (
      OLD.uraian IS DISTINCT FROM NEW.uraian OR
      OLD.spek IS DISTINCT FROM NEW.spek OR
      OLD.satuan IS DISTINCT FROM NEW.satuan OR
      OLD.harga IS DISTINCT FROM NEW.harga OR
      OLD.ongkir IS DISTINCT FROM NEW.ongkir OR
      OLD.total IS DISTINCT FROM NEW.total OR
      OLD.kode_kategori IS DISTINCT FROM NEW.kode_kategori OR
      OLD.rekening_1 IS DISTINCT FROM NEW.rekening_1 OR
      OLD.rekening_2 IS DISTINCT FROM NEW.rekening_2 OR
      OLD.rekening_3 IS DISTINCT FROM NEW.rekening_3 OR
      OLD.link_katalog_1 IS DISTINCT FROM NEW.link_katalog_1 OR
      OLD.link_katalog_2 IS DISTINCT FROM NEW.link_katalog_2 OR
      OLD.link_katalog_3 IS DISTINCT FROM NEW.link_katalog_3
    );

    -- JIKA KONTEN BARANG DIUBAH:
    IF v_is_content_changed THEN
      -- Usulan yang berstatus 'perlu_perbaikan' TETAP BISA diperbaiki oleh pengusul!
      IF OLD.status = 'perlu_perbaikan' THEN
        NULL;
      -- Jika bukan usulan perbaikan dan waktu sudah melewati batas tutup pengusulan:
      ELSIF NOW() > v_period.tutup_at THEN
        RAISE EXCEPTION 'Periode pengusulan telah ditutup pada % WIB. Pengusulan baru tidak dapat disimpan.',
          to_char(v_period.tutup_at AT TIME ZONE 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI:SS');
      END IF;
    END IF;

    -- JIKA KONTEN BARANG TIDAK DIUBAH (Hanya status, catatan_verifikator, verifikator_name, verified_at, updated_at):
    -- Ini adalah aksi verifikasi oleh Admin Dinkes / Pengurus Barang -> SELALU DIIZINKAN!
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang ulang Trigger ke tabel shs_items
DROP TRIGGER IF EXISTS trg_enforce_shs_period_deadline ON public.shs_items;

CREATE TRIGGER trg_enforce_shs_period_deadline
  BEFORE INSERT OR UPDATE ON public.shs_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_shs_item_period_deadline();
