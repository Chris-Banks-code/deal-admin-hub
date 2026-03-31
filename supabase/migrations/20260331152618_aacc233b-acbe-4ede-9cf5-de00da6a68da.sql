-- Add wholesaler-specific columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_registration_number text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS year_established integer,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS secondary_contact_name text,
  ADD COLUMN IF NOT EXISTS secondary_contact_phone text,
  ADD COLUMN IF NOT EXISTS product_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS minimum_order_value numeric,
  ADD COLUMN IF NOT EXISTS no_mov boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS credit_period integer,
  ADD COLUMN IF NOT EXISTS delivery_options text,
  ADD COLUMN IF NOT EXISTS delivery_coverage_areas text,
  ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS default_commission_rate numeric,
  ADD COLUMN IF NOT EXISTS bulk_discount_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_list_url text,
  ADD COLUMN IF NOT EXISTS business_license_url text,
  ADD COLUMN IF NOT EXISTS tax_certificate_url text,
  ADD COLUMN IF NOT EXISTS incorporation_cert_url text,
  ADD COLUMN IF NOT EXISTS product_catalog_url text,
  ADD COLUMN IF NOT EXISTS certifications text,
  ADD COLUMN IF NOT EXISTS storage_facilities boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_description text,
  ADD COLUMN IF NOT EXISTS cold_storage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS special_services text,
  ADD COLUMN IF NOT EXISTS credit_references text,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS added_by_admin_id uuid;

-- Create storage bucket for wholesaler documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('wholesaler-documents', 'wholesaler-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Admins can upload wholesaler docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wholesaler-documents' AND public.is_admin()
);

CREATE POLICY "Admins can view wholesaler docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wholesaler-documents' AND public.is_admin_or_manager()
);

CREATE POLICY "Admins can delete wholesaler docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wholesaler-documents' AND public.is_admin()
);

CREATE POLICY "Admins can update wholesaler docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wholesaler-documents' AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'wholesaler-documents' AND public.is_admin()
);