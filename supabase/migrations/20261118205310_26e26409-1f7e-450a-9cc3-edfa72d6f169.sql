ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agent_type text, ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS creator_type text, ADD COLUMN IF NOT EXISTS delivered_by uuid REFERENCES public.profiles(id), ADD COLUMN IF NOT EXISTS region text, ADD COLUMN IF NOT EXISTS retailer_owner_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity_delivered integer;

CREATE TABLE public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated; GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'commissions','edit')) WITH CHECK (public.has_permission(auth.uid(),'commissions','edit'));
INSERT INTO public.app_settings VALUES ('reassignment_inactive_days','30'::jsonb, now()) ON CONFLICT DO NOTHING;

CREATE TABLE public.product_commission_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
 unit text NOT NULL DEFAULT 'unit', pool_amount numeric NOT NULL DEFAULT 0, currency text NOT NULL DEFAULT 'USD',
 creator_pct numeric NOT NULL DEFAULT 35, delivery_pct numeric NOT NULL DEFAULT 10, supervisor_pct numeric NOT NULL DEFAULT 5,
 operations_pct numeric NOT NULL DEFAULT 5, regional_pct numeric NOT NULL DEFAULT 6, finance_pct numeric NOT NULL DEFAULT 4,
 hr_pct numeric NOT NULL DEFAULT 3, admin_pct numeric NOT NULL DEFAULT 9,
 updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_commission_rules TO authenticated; GRANT ALL ON public.product_commission_rules TO service_role;
ALTER TABLE public.product_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read pool rules" ON public.product_commission_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "edit pool rules" ON public.product_commission_rules FOR ALL TO authenticated USING (public.has_permission(auth.uid(),'commissions','edit')) WITH CHECK (public.has_permission(auth.uid(),'commissions','edit'));
CREATE TRIGGER pcr_updated BEFORE UPDATE ON public.product_commission_rules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_pool_rule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.pool_amount < 0 OR LEAST(NEW.creator_pct,NEW.delivery_pct,NEW.supervisor_pct,NEW.operations_pct,NEW.regional_pct,NEW.finance_pct,NEW.hr_pct,NEW.admin_pct) < 0 THEN
  RAISE EXCEPTION 'Pool and shares cannot be negative'; END IF;
 IF NEW.creator_pct+NEW.delivery_pct+NEW.supervisor_pct+NEW.operations_pct+NEW.regional_pct+NEW.finance_pct+NEW.hr_pct+NEW.admin_pct > 100 THEN
  RAISE EXCEPTION 'Shares exceed 100%% of the pool in at least one scenario'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pcr_validate BEFORE INSERT OR UPDATE ON public.product_commission_rules FOR EACH ROW EXECUTE FUNCTION public.validate_pool_rule();

CREATE TABLE public.commission_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
 order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
 product_id uuid, recipient_role text NOT NULL, profile_id uuid REFERENCES public.profiles(id),
 pct numeric NOT NULL, units numeric NOT NULL, amount numeric NOT NULL, currency text NOT NULL,
 status text NOT NULL DEFAULT 'pending', paid_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.commission_allocations TO authenticated; GRANT ALL ON public.commission_allocations TO service_role;
ALTER TABLE public.commission_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read allocations" ON public.commission_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "mark allocations paid" ON public.commission_allocations FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(),'commissions','edit')) WITH CHECK (public.has_permission(auth.uid(),'commissions','edit'));
CREATE INDEX ON public.commission_allocations(deal_id);

CREATE OR REPLACE FUNCTION public.refresh_deal_allocations(_deal uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals%ROWTYPE; it record; r public.product_commission_rules%ROWTYPE; ctype text; sup uuid; units numeric; st text; used numeric;
BEGIN
 SELECT * INTO d FROM deals WHERE id=_deal; IF NOT FOUND THEN RETURN; END IF;
 IF d.status IN ('cancelled','returned','rejected') THEN
  UPDATE commission_allocations SET status='reversed', updated_at=now() WHERE deal_id=_deal AND status<>'paid'; RETURN; END IF;
 IF EXISTS (SELECT 1 FROM commission_allocations WHERE deal_id=_deal AND status='paid') THEN RETURN; END IF;
 DELETE FROM commission_allocations WHERE deal_id=_deal;
 SELECT coalesce(d.creator_type, CASE WHEN p.role='supervisor' THEN 'supervisor' WHEN p.agent_type='vehicle' THEN 'vehicle' ELSE 'remote' END), p.supervisor_id
  INTO ctype, sup FROM profiles p WHERE p.id=d.agent_id;
 ctype := coalesce(ctype,'remote');
 st := CASE WHEN d.status IN ('delivered','completed') THEN 'payable' ELSE 'pending' END;
 FOR it IN SELECT * FROM order_items WHERE deal_id=_deal LOOP
  SELECT * INTO r FROM product_commission_rules WHERE product_id=it.product_id; CONTINUE WHEN NOT FOUND;
  units := CASE WHEN st='payable' THEN coalesce(it.quantity_delivered,it.quantity,0) ELSE coalesce(it.quantity,0) END;
  used := 0;
  INSERT INTO commission_allocations(deal_id,order_item_id,product_id,recipient_role,profile_id,pct,units,amount,currency,status)
  SELECT _deal,it.id,it.product_id,x.role,x.pid,x.pct,units,r.pool_amount*units*x.pct/100,r.currency,st FROM (VALUES
   ('creator',d.agent_id,r.creator_pct),
   ('delivery',d.delivered_by, CASE WHEN d.delivered_by IS NOT NULL AND d.delivered_by IS DISTINCT FROM d.agent_id THEN r.delivery_pct ELSE 0 END),
   ('supervisor',sup, CASE WHEN ctype<>'supervisor' AND sup IS NOT NULL AND sup IS DISTINCT FROM d.agent_id AND sup IS DISTINCT FROM d.delivered_by THEN r.supervisor_pct ELSE 0 END),
   ('operations',d.operation_manager_id,r.operations_pct),('regional',NULL::uuid,r.regional_pct),('finance',NULL::uuid,r.finance_pct),
   ('hr',NULL::uuid,r.hr_pct),('admin',NULL::uuid,r.admin_pct)) AS x(role,pid,pct) WHERE x.pct>0;
  SELECT coalesce(sum(pct),0) INTO used FROM commission_allocations WHERE order_item_id=it.id;
  INSERT INTO commission_allocations(deal_id,order_item_id,product_id,recipient_role,profile_id,pct,units,amount,currency,status)
  VALUES(_deal,it.id,it.product_id,'deal',NULL,100-used,units,r.pool_amount*units*(100-used)/100,r.currency,st);
 END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.refresh_deal_allocations(uuid) FROM anon, public;

CREATE OR REPLACE FUNCTION public.tg_refresh_allocations() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='deals' THEN PERFORM refresh_deal_allocations(NEW.id);
 ELSE PERFORM refresh_deal_allocations(COALESCE(NEW.deal_id,OLD.deal_id)); END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
CREATE TRIGGER deals_allocations AFTER INSERT OR UPDATE OF status, agent_id, delivered_by, creator_type, operation_manager_id ON public.deals FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_allocations();
CREATE TRIGGER order_items_allocations AFTER INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.tg_refresh_allocations();

-- products on pool rules don't need legacy percentage split
CREATE OR REPLACE FUNCTION public.snapshot_product_commission() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE p public.products%ROWTYPE;
BEGIN
 IF TG_OP='INSERT' OR NEW.product_id IS DISTINCT FROM OLD.product_id THEN
  SELECT * INTO p FROM public.products WHERE id=NEW.product_id;
  IF NOT FOUND OR p.agent_pct IS NULL OR p.supervisor_pct IS NULL OR p.manager_pct IS NULL THEN
   IF EXISTS (SELECT 1 FROM public.product_commission_rules WHERE product_id=NEW.product_id) THEN RETURN NEW; END IF;
   RAISE EXCEPTION 'Set the commission split for this product before placing an order';
  END IF;
  NEW.agent_pct=p.agent_pct; NEW.supervisor_pct=p.supervisor_pct; NEW.manager_pct=p.manager_pct;
  NEW.commission_rate=coalesce(p.commission_rate,0);
 ELSIF OLD.agent_pct IS NULL THEN
  RETURN NEW;
 ELSE
  NEW.agent_pct=OLD.agent_pct; NEW.supervisor_pct=OLD.supervisor_pct; NEW.manager_pct=OLD.manager_pct; NEW.commission_rate=OLD.commission_rate;
 END IF;
 NEW.commission_amount=coalesce(NEW.subtotal,NEW.quantity*NEW.unit_price,0)*NEW.commission_rate/100;
 NEW.agent_commission=NEW.commission_amount*NEW.agent_pct/100;
 NEW.supervisor_commission=NEW.commission_amount*NEW.supervisor_pct/100;
 NEW.manager_commission=NEW.commission_amount*NEW.manager_pct/100;
 RETURN NEW;
END $function$;

CREATE TABLE public.retailer_ownership_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 previous_agent_id uuid REFERENCES public.profiles(id), new_agent_id uuid NOT NULL REFERENCES public.profiles(id),
 reason text NOT NULL, approved_by uuid REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.retailer_ownership_log TO authenticated; GRANT ALL ON public.retailer_ownership_log TO service_role;
ALTER TABLE public.retailer_ownership_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read ownership log" ON public.retailer_ownership_log FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.reassign_retailer(_client uuid, _new_agent uuid, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prev uuid;
BEGIN
 IF NOT public.has_permission(auth.uid(),'commissions','edit') THEN RAISE EXCEPTION 'Only a supervisor or manager can approve reassignment'; END IF;
 IF _reason NOT IN ('original_agent_inactive','retailer_request','management_approval','retailer_inactive') THEN RAISE EXCEPTION 'Invalid reason'; END IF;
 SELECT assigned_agent_id INTO prev FROM clients WHERE id=_client AND client_type='retailer';
 IF NOT FOUND THEN RAISE EXCEPTION 'Retailer not found'; END IF;
 IF prev IS NOT DISTINCT FROM _new_agent THEN RAISE EXCEPTION 'Retailer already belongs to this agent'; END IF;
 UPDATE clients SET assigned_agent_id=_new_agent WHERE id=_client;
 INSERT INTO retailer_ownership_log(client_id,previous_agent_id,new_agent_id,reason,approved_by) VALUES(_client,prev,_new_agent,_reason,auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public.reassign_retailer(uuid,uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reassign_retailer(uuid,uuid,text) TO authenticated;

-- stamp retailer owner on new orders (delivery never changes it)
CREATE OR REPLACE FUNCTION public.stamp_retailer_owner() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.retailer_owner_id IS NULL AND NEW.retailer_id IS NOT NULL THEN SELECT assigned_agent_id INTO NEW.retailer_owner_id FROM clients WHERE id=NEW.retailer_id; END IF;
 IF NEW.region IS NULL THEN SELECT region INTO NEW.region FROM profiles WHERE id=NEW.agent_id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER deals_stamp_owner BEFORE INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION public.stamp_retailer_owner();

INSERT INTO public.products(name,currency,is_active,commission_rate) SELECT 'Mineral Water','USD',true,0 WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name ILIKE 'mineral water');
INSERT INTO public.product_commission_rules(product_id,unit,pool_amount,currency) SELECT id,'sack',1,'USD' FROM public.products WHERE name ILIKE 'mineral water' LIMIT 1 ON CONFLICT DO NOTHING;