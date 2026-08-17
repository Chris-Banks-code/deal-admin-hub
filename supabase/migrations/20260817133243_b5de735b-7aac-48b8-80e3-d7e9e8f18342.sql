INSERT INTO public.parties (id, party_type, legal_name, display_name, phone, address, latitude, longitude, status)
SELECT c.id, 'customer', c.company_name, COALESCE(c.contact_person, c.company_name), c.phone, c.address, c.latitude, c.longitude, COALESCE(c.status,'active')
FROM public.clients c
WHERE c.client_type = 'retailer'
  AND NOT EXISTS (SELECT 1 FROM public.parties p WHERE p.id = c.id);

INSERT INTO public.customers (party_id, assigned_agent_id, verification_status, added_by, created_at)
SELECT c.id, c.assigned_agent_id,
       CASE WHEN c.verification_status IN ('unverified','pending','verified','rejected') THEN c.verification_status::verification_status ELSE 'unverified'::verification_status END,
       c.added_by_admin_id, COALESCE(c.created_at, now())
FROM public.clients c
WHERE c.client_type = 'retailer'
  AND NOT EXISTS (SELECT 1 FROM public.customers cu WHERE cu.party_id = c.id);