-- ─── STORAGE BUCKETS ───────────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor to create storage buckets

-- Create company-assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create invoice-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-attachments', 'invoice-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ─── STORAGE POLICIES ───────────────────────────────────────────────────────────────
-- Drop policies if they exist (PostgreSQL doesn't support IF NOT EXISTS for policies)
DROP POLICY IF EXISTS "Public access to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public upload to company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public update company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public delete company-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public access to invoice-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public upload to invoice-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public update invoice-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public delete invoice-attachments" ON storage.objects;

-- Allow public access to company-assets bucket
CREATE POLICY "Public access to company-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "Public upload to company-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Public update company-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company-assets');

CREATE POLICY "Public delete company-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'company-assets');

-- Allow public access to invoice-attachments bucket
CREATE POLICY "Public access to invoice-attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoice-attachments');

CREATE POLICY "Public upload to invoice-attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoice-attachments');

CREATE POLICY "Public update invoice-attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'invoice-attachments');

CREATE POLICY "Public delete invoice-attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'invoice-attachments');
