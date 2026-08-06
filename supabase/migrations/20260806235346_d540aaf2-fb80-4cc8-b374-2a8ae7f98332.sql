
-- 1. Backfill clients rows for supplier parties missing from the legacy clients table
INSERT INTO public.clients (id, company_name, client_type, contact_person, phone, address, latitude, longitude, status, verification_status)
SELECT p.id, p.legal_name, 'wholesaler', p.display_name, p.phone, p.address, p.latitude, p.longitude, 'active',
       COALESCE(s.verification_status::text, 'unverified')
FROM public.parties p
JOIN public.suppliers s ON s.party_id = p.id
WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = p.id);

-- 2. Primary location for every wholesaler client lacking one
INSERT INTO public.wholesaler_locations (wholesaler_id, branch_name, address, latitude, longitude, is_primary, branch_phone)
SELECT c.id, 'Main Branch', c.address, c.latitude, c.longitude, true, c.phone
FROM public.clients c
WHERE c.client_type = 'wholesaler'
  AND NOT EXISTS (SELECT 1 FROM public.wholesaler_locations wl WHERE wl.wholesaler_id = c.id);

-- 3. Mirror into supplier_locations for the new schema
INSERT INTO public.supplier_locations (supplier_id, branch_name, address, latitude, longitude, is_primary, branch_phone)
SELECT s.id, 'Main Branch', p.address, p.latitude, p.longitude, true, p.phone
FROM public.suppliers s
JOIN public.parties p ON p.id = s.party_id
WHERE NOT EXISTS (SELECT 1 FROM public.supplier_locations sl WHERE sl.supplier_id = s.id);

-- 4. Attach products with no location to their wholesaler's primary branch
UPDATE public.products pr
SET wholesaler_location_id = wl.id
FROM public.wholesaler_locations wl
WHERE pr.wholesaler_location_id IS NULL
  AND wl.wholesaler_id = pr.wholesaler_id
  AND wl.is_primary = true;

-- 5. Keep future wizard-created suppliers in sync with the legacy tables
CREATE OR REPLACE FUNCTION public.tg_sync_supplier_to_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_party public.parties%ROWTYPE;
BEGIN
  SELECT * INTO v_party FROM public.parties WHERE id = NEW.party_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.clients (id, company_name, client_type, contact_person, phone, address, latitude, longitude, status, verification_status)
  VALUES (v_party.id, v_party.legal_name, 'wholesaler', v_party.display_name, v_party.phone, v_party.address, v_party.latitude, v_party.longitude, 'active', NEW.verification_status::text)
  ON CONFLICT (id) DO UPDATE
    SET company_name = EXCLUDED.company_name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        verification_status = EXCLUDED.verification_status;

  IF NOT EXISTS (SELECT 1 FROM public.wholesaler_locations wl WHERE wl.wholesaler_id = v_party.id) THEN
    INSERT INTO public.wholesaler_locations (wholesaler_id, branch_name, address, latitude, longitude, is_primary, branch_phone)
    VALUES (v_party.id, 'Main Branch', v_party.address, v_party.latitude, v_party.longitude, true, v_party.phone);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.supplier_locations sl WHERE sl.supplier_id = NEW.id) THEN
    INSERT INTO public.supplier_locations (supplier_id, branch_name, address, latitude, longitude, is_primary, branch_phone)
    VALUES (NEW.id, 'Main Branch', v_party.address, v_party.latitude, v_party.longitude, true, v_party.phone);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS suppliers_sync_client ON public.suppliers;
CREATE TRIGGER suppliers_sync_client
AFTER INSERT OR UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.tg_sync_supplier_to_client();
