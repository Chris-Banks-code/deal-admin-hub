-- 1. Extend clients with retailer-side fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS retailer_tier text,
  ADD COLUMN IF NOT EXISTS credit_limit numeric,
  ADD COLUMN IF NOT EXISTS default_delivery_address text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Backfill any party that has no client row yet
INSERT INTO public.clients (id, company_name, client_type, contact_person, phone, address, latitude, longitude, status, created_at)
SELECT p.id,
       p.legal_name,
       CASE WHEN EXISTS (SELECT 1 FROM public.suppliers s WHERE s.party_id = p.id) THEN 'wholesaler' ELSE 'retailer' END,
       COALESCE(p.display_name, p.legal_name),
       p.phone, p.address, p.latitude, p.longitude,
       COALESCE(p.status, 'active'),
       p.created_at
FROM public.parties p
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.id);

-- 3. Merge supplier detail into clients
UPDATE public.clients c SET
  client_type = 'wholesaler',
  company_type = COALESCE(c.company_type, s.company_type),
  year_established = COALESCE(c.year_established, s.year_established),
  secondary_contact_person = COALESCE(c.secondary_contact_person, s.secondary_contact_person),
  secondary_contact_phone = COALESCE(c.secondary_contact_phone, s.secondary_contact_phone),
  product_categories = COALESCE(c.product_categories, s.product_categories),
  minimum_order_value = COALESCE(c.minimum_order_value, s.minimum_order_value),
  payment_terms = COALESCE(c.payment_terms, s.payment_terms),
  credit_period_days = COALESCE(c.credit_period_days, s.credit_period_days),
  delivery_options = COALESCE(c.delivery_options, s.delivery_options),
  delivery_coverage_areas = COALESCE(c.delivery_coverage_areas, s.delivery_coverage_areas),
  operating_hours = COALESCE(c.operating_hours, s.operating_hours),
  bank_name = COALESCE(c.bank_name, s.bank_name),
  bank_account_name = COALESCE(c.bank_account_name, s.bank_account_name),
  bank_account_number = COALESCE(c.bank_account_number, s.bank_account_number),
  bank_branch = COALESCE(c.bank_branch, s.bank_branch),
  default_commission_rate = COALESCE(c.default_commission_rate, s.default_commission_rate),
  bulk_discount_available = COALESCE(c.bulk_discount_available, s.bulk_discount_available),
  storage_facilities_available = COALESCE(c.storage_facilities_available, s.storage_facilities_available),
  storage_facilities_description = COALESCE(c.storage_facilities_description, s.storage_facilities_description),
  cold_storage_available = COALESCE(c.cold_storage_available, s.cold_storage_available),
  certifications = COALESCE(c.certifications, array_to_string(s.certifications, ', ')),
  special_services = COALESCE(c.special_services, array_to_string(s.special_services, ', ')),
  credit_references = COALESCE(c.credit_references, s.credit_references),
  admin_notes = COALESCE(c.admin_notes, s.admin_notes),
  business_license_url = COALESCE(c.business_license_url, s.business_license_url),
  tax_certificate_url = COALESCE(c.tax_certificate_url, s.tax_certificate_url),
  incorporation_certificate_url = COALESCE(c.incorporation_certificate_url, s.incorporation_certificate_url),
  product_catalog_url = COALESCE(c.product_catalog_url, s.product_catalog_url),
  price_list_url = COALESCE(c.price_list_url, s.price_list_url),
  photo_urls = COALESCE(c.photo_urls, s.photo_urls),
  verification_status = COALESCE(c.verification_status, s.verification_status::text),
  verified_by_admin_id = COALESCE(c.verified_by_admin_id, s.verified_by),
  verified_at = COALESCE(c.verified_at, s.verified_at::timestamp),
  added_by_admin_id = COALESCE(c.added_by_admin_id, s.added_by)
FROM public.suppliers s
WHERE c.id = s.party_id;

-- 4. Merge customer detail into clients
UPDATE public.clients c SET
  client_type = COALESCE(NULLIF(c.client_type, ''), 'retailer'),
  retailer_tier = COALESCE(c.retailer_tier, cu.retailer_tier),
  credit_limit = COALESCE(c.credit_limit, cu.credit_limit),
  payment_terms = COALESCE(c.payment_terms, cu.payment_terms),
  default_delivery_address = COALESCE(c.default_delivery_address, cu.default_delivery_address),
  assigned_agent_id = COALESCE(c.assigned_agent_id, cu.assigned_agent_id),
  verification_status = COALESCE(c.verification_status, cu.verification_status::text)
FROM public.customers cu
WHERE c.id = cu.party_id AND c.client_type IS DISTINCT FROM 'wholesaler';

-- 5. Also pull richer party contact info where clients is missing it
UPDATE public.clients c SET
  company_name = COALESCE(NULLIF(c.company_name, ''), p.legal_name),
  contact_person = COALESCE(c.contact_person, p.display_name),
  phone = COALESCE(c.phone, p.phone),
  address = COALESCE(c.address, p.address),
  latitude = COALESCE(c.latitude, p.latitude),
  longitude = COALESCE(c.longitude, p.longitude),
  company_email = COALESCE(c.company_email, p.email),
  company_website = COALESCE(c.company_website, p.website),
  tax_id = COALESCE(c.tax_id, p.tax_id),
  business_registration_number = COALESCE(c.business_registration_number, p.registration_number)
FROM public.parties p
WHERE c.id = p.id;

-- 6. Move supplier_locations into wholesaler_locations (keeping ids where possible)
INSERT INTO public.wholesaler_locations (id, wholesaler_id, branch_name, address, latitude, longitude, is_primary, branch_manager_name, branch_phone, created_at)
SELECT sl.id, s.party_id, sl.branch_name, sl.address, sl.latitude, sl.longitude, sl.is_primary, sl.branch_manager_name, sl.branch_phone, sl.created_at
FROM public.supplier_locations sl
JOIN public.suppliers s ON s.id = sl.supplier_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.wholesaler_locations wl
  WHERE wl.wholesaler_id = s.party_id AND COALESCE(wl.branch_name,'') = COALESCE(sl.branch_name,'')
)
ON CONFLICT (id) DO NOTHING;

-- 7. Repoint sales orders at clients
ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_customer_id_fkey;
ALTER TABLE public.sales_order_items DROP CONSTRAINT IF EXISTS sales_order_items_supplier_id_fkey;
ALTER TABLE public.sales_order_items DROP CONSTRAINT IF EXISTS sales_order_items_supplier_location_id_fkey;

UPDATE public.sales_orders so SET customer_id = cu.party_id
FROM public.customers cu WHERE so.customer_id = cu.id;

UPDATE public.sales_order_items soi SET supplier_id = s.party_id
FROM public.suppliers s WHERE soi.supplier_id = s.id;

UPDATE public.sales_order_items soi
SET supplier_location_id = wl.id
FROM public.supplier_locations sl
JOIN public.suppliers s2 ON s2.id = sl.supplier_id
JOIN public.wholesaler_locations wl
  ON wl.wholesaler_id = s2.party_id AND COALESCE(wl.branch_name,'') = COALESCE(sl.branch_name,'')
WHERE soi.supplier_location_id = sl.id;

UPDATE public.sales_order_items SET supplier_location_id = NULL
WHERE supplier_location_id IS NOT NULL
  AND supplier_location_id NOT IN (SELECT id FROM public.wholesaler_locations);

UPDATE public.sales_orders SET customer_id = NULL
WHERE customer_id IS NOT NULL AND customer_id NOT IN (SELECT id FROM public.clients);

UPDATE public.sales_order_items SET supplier_id = NULL
WHERE supplier_id IS NOT NULL AND supplier_id NOT IN (SELECT id FROM public.clients);

ALTER TABLE public.sales_orders
  ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.clients(id) ON DELETE SET NULL;
ALTER TABLE public.sales_order_items
  ADD CONSTRAINT sales_order_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_order_items_supplier_location_id_fkey FOREIGN KEY (supplier_location_id) REFERENCES public.wholesaler_locations(id) ON DELETE SET NULL;

-- 8. Drop the duplicated structures
DROP TRIGGER IF EXISTS suppliers_sync_client ON public.suppliers;
DROP FUNCTION IF EXISTS public.tg_sync_supplier_to_client();
DROP TABLE IF EXISTS public.supplier_locations CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.parties CASCADE;

-- 9. Lock clients down to exactly two categories
UPDATE public.clients SET client_type = 'retailer' WHERE client_type IS NULL OR client_type NOT IN ('retailer','wholesaler');
ALTER TABLE public.clients ALTER COLUMN client_type SET DEFAULT 'retailer';
ALTER TABLE public.clients ALTER COLUMN client_type SET NOT NULL;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_client_type_check CHECK (client_type IN ('retailer','wholesaler'));

DROP TRIGGER IF EXISTS clients_set_updated_at ON public.clients;
CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesaler_locations TO authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.wholesaler_locations TO service_role;