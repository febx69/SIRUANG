-- ============================================================
-- Tabel: car_bookings
-- Sistem Peminjaman Mobil Dinas Kesehatan Pamekasan
-- Auto-approved (tanpa proses approval)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.car_bookings (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  seksi         TEXT        NOT NULL,
  date          DATE        NOT NULL,
  start_time    TEXT        NOT NULL,
  end_time      TEXT        NOT NULL,
  keperluan     TEXT        NOT NULL,
  status        TEXT        DEFAULT 'approved' CHECK (status IN ('approved')),
  admin_note    TEXT        DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  user_id       TEXT        NOT NULL
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_car_bookings_date      ON public.car_bookings(date);
CREATE INDEX IF NOT EXISTS idx_car_bookings_user_id   ON public.car_bookings(user_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.car_bookings ENABLE ROW LEVEL SECURITY;

-- Semua user boleh INSERT
CREATE POLICY "Allow insert car bookings" ON public.car_bookings
  FOR INSERT WITH CHECK (true);

-- Semua user boleh SELECT
CREATE POLICY "Allow select car bookings" ON public.car_bookings
  FOR SELECT USING (true);

-- Admin & pemilik boleh UPDATE (edit jadwal)
CREATE POLICY "Allow update car bookings" ON public.car_bookings
  FOR UPDATE USING (true);

-- Admin & pemilik boleh DELETE
CREATE POLICY "Allow delete car bookings" ON public.car_bookings
  FOR DELETE USING (true);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_car_bookings_updated_at
  BEFORE UPDATE ON public.car_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
