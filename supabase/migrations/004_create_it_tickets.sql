-- ============================================================
-- Migrasi: 004_create_it_tickets.sql
-- Layanan Tiket IT Dinas Kesehatan Kabupaten Pamekasan
-- ============================================================

CREATE TABLE IF NOT EXISTS public.it_tickets (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number     TEXT        NOT NULL UNIQUE,
  category          TEXT        NOT NULL CHECK (category IN ('hardware', 'software')),
  penanggung_jawab  TEXT        NOT NULL,
  unit_name         TEXT        NOT NULL,
  bidang            TEXT        NOT NULL,
  description       TEXT        NOT NULL,
  status            TEXT        DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  handler_name      TEXT        DEFAULT '',
  handler_notes     TEXT        DEFAULT '',
  completed_at      TIMESTAMPTZ,
  user_id           TEXT        NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_it_tickets_created_at ON public.it_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_it_tickets_status ON public.it_tickets(status);
CREATE INDEX IF NOT EXISTS idx_it_tickets_bidang ON public.it_tickets(bidang);

-- Enable Row Level Security (RLS)
ALTER TABLE public.it_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select it_tickets" ON public.it_tickets FOR SELECT USING (true);
CREATE POLICY "Allow insert it_tickets" ON public.it_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update it_tickets" ON public.it_tickets FOR UPDATE USING (true);
CREATE POLICY "Allow delete it_tickets" ON public.it_tickets FOR DELETE USING (true);
