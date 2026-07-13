-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── COMPANY SETTINGS TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  address TEXT,
  gst_number TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  signature_url TEXT,
  seal_url TEXT,
  upi_qr_url TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  bank_ifsc TEXT,
  bank_swift TEXT,
  default_gst_rate NUMERIC DEFAULT 18,
  default_currency TEXT DEFAULT 'INR',
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_number_format TEXT DEFAULT '{prefix}-{year}-{seq:04d}',
  default_payment_terms TEXT DEFAULT 'Net 30',
  default_notes TEXT,
  default_terms TEXT,
  theme TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLIENTS TABLE ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  company_name TEXT,
  gst_number TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for client search
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING gin(
  (client_name || ' ' || COALESCE(company_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')) gin_trgm_ops
);

-- ─── INVOICES TABLE ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_year INTEGER NOT NULL,
  invoice_seq INTEGER NOT NULL DEFAULT 0,
  
  -- Company snapshot
  company_name TEXT NOT NULL,
  company_address TEXT,
  company_gst TEXT,
  company_email TEXT,
  company_phone TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  company_signature_url TEXT,
  company_seal_url TEXT,
  company_upi_qr_url TEXT,
  company_bank_account_name TEXT,
  company_bank_account_number TEXT,
  company_bank_name TEXT,
  company_bank_ifsc TEXT,
  company_bank_swift TEXT,
  
  -- Client info
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_company TEXT,
  client_gst TEXT,
  client_address TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_state TEXT,
  client_country TEXT,
  client_zip TEXT,
  
  -- Invoice details
  invoice_date DATE NOT NULL,
  due_date DATE,
  payment_terms TEXT,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Viewed', 'Paid', 'Pending', 'Partially Paid', 'Cancelled', 'Overdue')),
  
  -- Financial
  subtotal NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed', 'coupon')),
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  coupon_code TEXT,
  round_off NUMERIC DEFAULT 0,
  gst_enabled BOOLEAN DEFAULT false,
  cgst_rate NUMERIC DEFAULT 0,
  sgst_rate NUMERIC DEFAULT 0,
  igst_rate NUMERIC DEFAULT 0,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  total_gst NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  pending_amount NUMERIC DEFAULT 0,
  
  -- Payment details
  payment_method TEXT,
  transaction_id TEXT,
  payment_date DATE,
  payment_notes TEXT,
  
  -- Content
  notes TEXT,
  terms TEXT,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  printed_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  last_modified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invoice queries
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_year ON invoices(invoice_year);
CREATE INDEX IF NOT EXISTS idx_invoices_search ON invoices USING gin(
  (invoice_number || ' ' || client_name || ' ' || COALESCE(client_gst, '') || ' ' || COALESCE(client_phone, '') || ' ' || COALESCE(client_email, '') || ' ' || COALESCE(notes, '')) gin_trgm_ops
);

-- ─── INVOICE ITEMS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  hsn_sac TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT,
  rate NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  tax_percent NUMERIC DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for invoice items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_sort ON invoice_items(invoice_id, sort_order);

-- ─── INVOICE HISTORY TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for invoice history
CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice ON invoice_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created ON invoice_history(created_at DESC);

-- ─── RPC FUNCTION FOR INVOICE NUMBER GENERATION ────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_invoice_number(prefix TEXT DEFAULT 'INV')
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_num INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  seq_num INTEGER;
  result TEXT;
BEGIN
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(invoice_seq), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_year = year_num;
  
  -- Format: INV-2025-0001
  result := prefix || '-' || year_num || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN result;
END;
$$;

-- ─── UPDATED AT TRIGGER ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────────────
-- Enable RLS on all tables
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for anon key usage)
CREATE POLICY "Public read access on company_settings"
  ON company_settings FOR SELECT
  USING (true);

CREATE POLICY "Public read access on clients"
  ON clients FOR SELECT
  USING (true);

CREATE POLICY "Public read access on invoices"
  ON invoices FOR SELECT
  USING (true);

CREATE POLICY "Public read access on invoice_items"
  ON invoice_items FOR SELECT
  USING (true);

CREATE POLICY "Public read access on invoice_history"
  ON invoice_history FOR SELECT
  USING (true);

-- Allow public insert/update/delete (for development - restrict in production)
CREATE POLICY "Public insert on company_settings"
  ON company_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update on company_settings"
  ON company_settings FOR UPDATE
  USING (true);

CREATE POLICY "Public insert on clients"
  ON clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update on clients"
  ON clients FOR UPDATE
  USING (true);

CREATE POLICY "Public delete on clients"
  ON clients FOR DELETE
  USING (true);

CREATE POLICY "Public insert on invoices"
  ON invoices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update on invoices"
  ON invoices FOR UPDATE
  USING (true);

CREATE POLICY "Public delete on invoices"
  ON invoices FOR DELETE
  USING (true);

CREATE POLICY "Public insert on invoice_items"
  ON invoice_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update on invoice_items"
  ON invoice_items FOR UPDATE
  USING (true);

CREATE POLICY "Public delete on invoice_items"
  ON invoice_items FOR DELETE
  USING (true);

CREATE POLICY "Public insert on invoice_history"
  ON invoice_history FOR INSERT
  WITH CHECK (true);

-- ─── STORAGE BUCKETS ───────────────────────────────────────────────────────────────
-- Note: Storage buckets need to be created via Supabase dashboard or API
-- Run these commands in Supabase SQL editor or use the storage API:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-attachments', 'invoice-attachments', true);

-- Allow public access to storage buckets
-- CREATE POLICY "Public access to company-assets"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'company-assets');

-- CREATE POLICY "Public upload to company-assets"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'company-assets');

-- CREATE POLICY "Public access to invoice-attachments"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'invoice-attachments');

-- CREATE POLICY "Public upload to invoice-attachments"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'invoice-attachments');
