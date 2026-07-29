
-- =========================================================================
-- WAVE 2: COMMERCE CORE ERP SCHEMA
-- =========================================================================

-- ---- ENUMS ----
DO $$ BEGIN
  CREATE TYPE public.party_type AS ENUM ('customer', 'supplier', 'both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.sales_order_status AS ENUM ('draft','pending_approval','approved','fulfilled','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 1. PARTIES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_type party_type NOT NULL DEFAULT 'customer',
  legal_name text NOT NULL,
  display_name text,
  tax_id text,
  registration_number text,
  email text,
  phone text,
  website text,
  address text,
  latitude numeric,
  longitude numeric,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parties read for authenticated" ON public.parties
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "parties admins manage" ON public.parties
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager')
  );

CREATE TRIGGER parties_set_updated_at BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER parties_audit AFTER INSERT OR UPDATE OR DELETE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.tg_write_audit();

-- =========================================================================
-- 2. CUSTOMERS (retailers)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  retailer_tier text,
  credit_limit numeric,
  payment_terms text,
  default_delivery_address text,
  assigned_agent_id uuid,
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  verified_by uuid,
  verified_at timestamptz,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(party_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers read all authenticated" ON public.customers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers admins manage" ON public.customers
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager')
  );
CREATE POLICY "customers agents insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'sales_agent') AND assigned_agent_id = auth.uid());

CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER customers_audit AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_write_audit();

-- =========================================================================
-- 3. SUPPLIERS (wholesalers)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  company_type text,
  year_established integer,
  secondary_contact_person text,
  secondary_contact_phone text,
  product_categories jsonb,
  minimum_order_value numeric,
  payment_terms text,
  credit_period_days integer,
  delivery_options text,
  delivery_coverage_areas text,
  operating_hours jsonb,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_branch text,
  default_commission_rate numeric,
  bulk_discount_available boolean DEFAULT false,
  storage_facilities_available boolean DEFAULT false,
  storage_facilities_description text,
  cold_storage_available boolean DEFAULT false,
  certifications text[],
  special_services text[],
  credit_references text,
  admin_notes text,
  business_license_url text,
  tax_certificate_url text,
  incorporation_certificate_url text,
  product_catalog_url text,
  price_list_url text,
  photo_urls text[],
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  verified_by uuid,
  verified_at timestamptz,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(party_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers read all authenticated" ON public.suppliers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers admins manage" ON public.suppliers
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager') OR has_role(auth.uid(),'procurement_manager')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager') OR has_role(auth.uid(),'procurement_manager')
  );

CREATE TRIGGER suppliers_set_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER suppliers_audit AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.tg_write_audit();

-- =========================================================================
-- 4. SUPPLIER LOCATIONS (branches)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.supplier_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  address text,
  latitude numeric,
  longitude numeric,
  is_primary boolean DEFAULT false,
  branch_manager_name text,
  branch_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_locations TO authenticated;
GRANT ALL ON public.supplier_locations TO service_role;
ALTER TABLE public.supplier_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_locations read authenticated" ON public.supplier_locations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "supplier_locations admins manage" ON public.supplier_locations
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager') OR has_role(auth.uid(),'procurement_manager')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager') OR has_role(auth.uid(),'procurement_manager')
  );

CREATE TRIGGER supplier_locations_set_updated_at BEFORE UPDATE ON public.supplier_locations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================================
-- 5. SALES ORDERS
-- =========================================================================
CREATE SEQUENCE IF NOT EXISTS public.sales_order_seq;

CREATE OR REPLACE FUNCTION public.generate_sales_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'SO-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.sales_order_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  agent_id uuid,
  status sales_order_status NOT NULL DEFAULT 'pending_approval',
  subtotal numeric DEFAULT 0,
  total numeric DEFAULT 0,
  agent_commission_total numeric DEFAULT 0,
  supervisor_commission_total numeric DEFAULT 0,
  manager_commission_total numeric DEFAULT 0,
  delivery_address text,
  delivery_date date,
  notes text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;
GRANT ALL ON public.sales_orders TO service_role;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_orders admins manage" ON public.sales_orders
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager') OR has_role(auth.uid(),'finance_manager')
    OR has_role(auth.uid(),'ceo') OR has_role(auth.uid(),'executive')
    OR has_role(auth.uid(),'internal_auditor')
  )
  WITH CHECK (
    has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
    OR has_role(auth.uid(),'operation_manager')
  );
CREATE POLICY "sales_orders agents own" ON public.sales_orders
  FOR SELECT TO authenticated USING (agent_id = auth.uid());
CREATE POLICY "sales_orders agents insert own" ON public.sales_orders
  FOR INSERT TO authenticated WITH CHECK (agent_id = auth.uid());
CREATE POLICY "sales_orders agents update own drafts" ON public.sales_orders
  FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() AND status IN ('draft','pending_approval'))
  WITH CHECK (agent_id = auth.uid());
CREATE POLICY "sales_orders supervisors read team" ON public.sales_orders
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'supervisor')
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = sales_orders.agent_id AND p.supervisor_id = auth.uid())
  );

CREATE TRIGGER sales_orders_number BEFORE INSERT ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_sales_order_number();
CREATE TRIGGER sales_orders_set_updated_at BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER sales_orders_audit AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_write_audit();

-- =========================================================================
-- 6. SALES ORDER ITEMS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_location_id uuid REFERENCES public.supplier_locations(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_items TO authenticated;
GRANT ALL ON public.sales_order_items TO service_role;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_order_items via parent access" ON public.sales_order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales_orders o
      WHERE o.id = sales_order_items.sales_order_id
        AND (
          o.agent_id = auth.uid()
          OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
          OR has_role(auth.uid(),'operation_manager') OR has_role(auth.uid(),'finance_manager')
          OR has_role(auth.uid(),'ceo') OR has_role(auth.uid(),'executive')
          OR has_role(auth.uid(),'internal_auditor')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales_orders o
      WHERE o.id = sales_order_items.sales_order_id
        AND (
          o.agent_id = auth.uid()
          OR has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin')
          OR has_role(auth.uid(),'operation_manager')
        )
    )
  );

CREATE TRIGGER sales_order_items_set_updated_at BEFORE UPDATE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================================
-- 7. BACKFILL FROM LEGACY TABLES
-- =========================================================================

-- Parties + Suppliers from wholesaler clients
INSERT INTO public.parties (id, party_type, legal_name, display_name, tax_id, registration_number, email, phone, website, address, latitude, longitude, status, notes, created_at)
SELECT c.id, 'supplier'::party_type, c.company_name, c.company_name,
       c.tax_id, c.business_registration_number, c.company_email, c.phone, c.company_website,
       c.address, c.latitude, c.longitude, COALESCE(c.status,'active'), c.admin_notes,
       COALESCE(c.created_at, now())
FROM public.clients c
WHERE c.client_type = 'wholesaler'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.suppliers (party_id, company_type, year_established, secondary_contact_person, secondary_contact_phone,
  product_categories, minimum_order_value, payment_terms, credit_period_days, delivery_options, delivery_coverage_areas,
  operating_hours, bank_name, bank_account_name, bank_account_number, bank_branch, default_commission_rate,
  bulk_discount_available, storage_facilities_available, storage_facilities_description, cold_storage_available,
  certifications, special_services, credit_references, admin_notes,
  business_license_url, tax_certificate_url, incorporation_certificate_url, product_catalog_url, price_list_url, photo_urls,
  verification_status, verified_by, verified_at, added_by, created_at)
SELECT c.id, c.company_type, c.year_established, c.secondary_contact_person, c.secondary_contact_phone,
  c.product_categories, c.minimum_order_value, c.payment_terms, c.credit_period_days, c.delivery_options, c.delivery_coverage_areas,
  c.operating_hours, c.bank_name, c.bank_account_name, c.bank_account_number, c.bank_branch, c.default_commission_rate,
  COALESCE(c.bulk_discount_available,false), COALESCE(c.storage_facilities_available,false),
  c.storage_facilities_description, COALESCE(c.cold_storage_available,false),
  CASE WHEN c.certifications IS NULL THEN NULL ELSE ARRAY[c.certifications] END,
  CASE WHEN c.special_services IS NULL THEN NULL ELSE ARRAY[c.special_services] END,
  c.credit_references, c.admin_notes,
  c.business_license_url, c.tax_certificate_url, c.incorporation_certificate_url, c.product_catalog_url, c.price_list_url, c.photo_urls,
  COALESCE(c.verification_status,'unverified')::verification_status,
  c.verified_by_admin_id, c.verified_at, c.added_by_admin_id, COALESCE(c.created_at, now())
FROM public.clients c
WHERE c.client_type = 'wholesaler'
ON CONFLICT (party_id) DO NOTHING;

-- Parties + Customers from retailer clients (anything not wholesaler)
INSERT INTO public.parties (id, party_type, legal_name, display_name, email, phone, address, latitude, longitude, status, notes, created_at)
SELECT c.id, 'customer'::party_type, c.company_name, c.company_name,
       c.company_email, c.phone, c.address, c.latitude, c.longitude,
       COALESCE(c.status,'active'), c.admin_notes, COALESCE(c.created_at, now())
FROM public.clients c
WHERE COALESCE(c.client_type,'retailer') <> 'wholesaler'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (party_id, payment_terms, assigned_agent_id, verification_status, verified_by, verified_at, added_by, created_at)
SELECT c.id, c.payment_terms, c.assigned_agent_id,
       COALESCE(c.verification_status,'unverified')::verification_status,
       c.verified_by_admin_id, c.verified_at, c.added_by_admin_id, COALESCE(c.created_at, now())
FROM public.clients c
WHERE COALESCE(c.client_type,'retailer') <> 'wholesaler'
ON CONFLICT (party_id) DO NOTHING;

-- Supplier locations from wholesaler_locations
INSERT INTO public.supplier_locations (id, supplier_id, branch_name, address, latitude, longitude, is_primary, branch_manager_name, branch_phone, created_at)
SELECT wl.id, s.id, COALESCE(wl.branch_name,'Main'), wl.address, wl.latitude, wl.longitude,
       COALESCE(wl.is_primary,false), wl.branch_manager_name, wl.branch_phone, COALESCE(wl.created_at, now())
FROM public.wholesaler_locations wl
JOIN public.suppliers s ON s.party_id = wl.wholesaler_id
ON CONFLICT (id) DO NOTHING;

-- Sales orders from deals
INSERT INTO public.sales_orders (id, order_number, customer_id, agent_id, status, subtotal, total,
  agent_commission_total, supervisor_commission_total, manager_commission_total,
  delivery_address, delivery_date, notes, created_at)
SELECT d.id,
       d.deal_number,
       cu.id,
       d.agent_id,
       CASE d.status
         WHEN 'pending_admin' THEN 'pending_approval'::sales_order_status
         WHEN 'approved' THEN 'approved'::sales_order_status
         WHEN 'fulfilled' THEN 'fulfilled'::sales_order_status
         WHEN 'cancelled' THEN 'cancelled'::sales_order_status
         ELSE 'pending_approval'::sales_order_status
       END,
       COALESCE(d.deal_value,0), COALESCE(d.deal_value,0),
       COALESCE(d.agent_commission,0), COALESCE(d.supervisor_commission,0), COALESCE(d.operation_manager_commission,0),
       d.delivery_address, d.delivery_date, d.notes, COALESCE(d.created_at, now())
FROM public.deals d
LEFT JOIN public.customers cu ON cu.party_id = d.retailer_id
ON CONFLICT (id) DO NOTHING;

-- Sales order items from order_items
INSERT INTO public.sales_order_items (id, sales_order_id, product_id, supplier_id, supplier_location_id,
  product_name, quantity, unit_price, subtotal, commission_rate, commission_amount, created_at)
SELECT oi.id, oi.deal_id, oi.product_id,
       s.id, oi.wholesaler_location_id,
       COALESCE(oi.product_name,'Item'),
       COALESCE(oi.quantity,1), COALESCE(oi.unit_price,0), COALESCE(oi.subtotal,0),
       COALESCE(oi.commission_rate,0), COALESCE(oi.commission_amount,0), now()
FROM public.order_items oi
LEFT JOIN public.suppliers s ON s.party_id = oi.wholesaler_id
WHERE EXISTS (SELECT 1 FROM public.sales_orders so WHERE so.id = oi.deal_id)
ON CONFLICT (id) DO NOTHING;
