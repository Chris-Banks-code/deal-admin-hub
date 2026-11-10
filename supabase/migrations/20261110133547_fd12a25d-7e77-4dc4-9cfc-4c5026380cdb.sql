ALTER TABLE public.products ADD COLUMN agent_pct numeric, ADD COLUMN supervisor_pct numeric, ADD COLUMN manager_pct numeric;
UPDATE public.products p SET agent_pct=r.agent_pct, supervisor_pct=r.supervisor_pct, manager_pct=r.manager_pct FROM (SELECT agent_pct, supervisor_pct, manager_pct FROM public.commission_rules LIMIT 1) r;
ALTER TABLE public.products ADD CONSTRAINT product_commission_split_valid CHECK ((agent_pct IS NULL AND supervisor_pct IS NULL AND manager_pct IS NULL) OR (agent_pct IS NOT NULL AND supervisor_pct IS NOT NULL AND manager_pct IS NOT NULL AND agent_pct BETWEEN 0 AND 100 AND supervisor_pct BETWEEN 0 AND 100 AND manager_pct BETWEEN 0 AND 100 AND agent_pct+supervisor_pct+manager_pct <= 100));
ALTER TABLE public.order_items ADD COLUMN agent_pct numeric, ADD COLUMN supervisor_pct numeric, ADD COLUMN manager_pct numeric, ADD COLUMN agent_commission numeric, ADD COLUMN supervisor_commission numeric, ADD COLUMN manager_commission numeric;
ALTER TABLE public.sales_order_items ADD COLUMN agent_pct numeric, ADD COLUMN supervisor_pct numeric, ADD COLUMN manager_pct numeric, ADD COLUMN agent_commission numeric, ADD COLUMN supervisor_commission numeric, ADD COLUMN manager_commission numeric;
CREATE OR REPLACE FUNCTION public.snapshot_product_commission() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.products%ROWTYPE;
BEGIN
 IF TG_OP='INSERT' OR NEW.product_id IS DISTINCT FROM OLD.product_id THEN
  SELECT * INTO p FROM public.products WHERE id=NEW.product_id;
  IF NOT FOUND OR p.agent_pct IS NULL OR p.supervisor_pct IS NULL OR p.manager_pct IS NULL THEN
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
END $$;
CREATE TRIGGER order_items_product_commission BEFORE INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.snapshot_product_commission();
CREATE TRIGGER sales_order_items_product_commission BEFORE INSERT OR UPDATE ON public.sales_order_items FOR EACH ROW EXECUTE FUNCTION public.snapshot_product_commission();
CREATE OR REPLACE FUNCTION public.apply_product_order_totals() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a numeric; s numeric; m numeric; pot numeric; n bigint; configured bigint;
BEGIN
 IF TG_TABLE_NAME='deals' THEN
  SELECT count(*),count(agent_pct),sum(agent_commission),sum(supervisor_commission),sum(manager_commission),sum(commission_amount) INTO n,configured,a,s,m,pot FROM public.order_items WHERE deal_id=NEW.id;
  IF n>0 AND n=configured THEN NEW.agent_commission=a; NEW.supervisor_commission=s; NEW.operation_manager_commission=m; NEW.commission_amount=pot; END IF;
 ELSE
  SELECT count(*),count(agent_pct),sum(agent_commission),sum(supervisor_commission),sum(manager_commission) INTO n,configured,a,s,m FROM public.sales_order_items WHERE sales_order_id=NEW.id;
  IF n>0 AND n=configured THEN NEW.agent_commission_total=a; NEW.supervisor_commission_total=s; NEW.manager_commission_total=m; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER deals_product_totals BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.apply_product_order_totals();
CREATE TRIGGER sales_orders_product_totals BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.apply_product_order_totals();
CREATE OR REPLACE FUNCTION public.refresh_product_order_totals() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_id uuid; previous_id uuid;
BEGIN
 IF TG_TABLE_NAME='order_items' THEN
  IF TG_OP<>'DELETE' THEN current_id=NEW.deal_id; END IF;
  IF TG_OP<>'INSERT' THEN previous_id=OLD.deal_id; END IF;
  UPDATE public.deals SET agent_commission=0,supervisor_commission=0,operation_manager_commission=0,commission_amount=0 WHERE id IN (current_id,previous_id) AND (EXISTS(SELECT 1 FROM public.order_items WHERE deal_id=deals.id AND agent_pct IS NOT NULL) OR (TG_OP='DELETE' AND OLD.agent_pct IS NOT NULL));
 ELSE
  IF TG_OP<>'DELETE' THEN current_id=NEW.sales_order_id; END IF;
  IF TG_OP<>'INSERT' THEN previous_id=OLD.sales_order_id; END IF;
  UPDATE public.sales_orders SET agent_commission_total=0,supervisor_commission_total=0,manager_commission_total=0 WHERE id IN (current_id,previous_id) AND (EXISTS(SELECT 1 FROM public.sales_order_items WHERE sales_order_id=sales_orders.id AND agent_pct IS NOT NULL) OR (TG_OP='DELETE' AND OLD.agent_pct IS NOT NULL));
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.refresh_product_order_totals() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER order_items_refresh_commission AFTER INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.refresh_product_order_totals();
CREATE TRIGGER sales_order_items_refresh_commission AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_items FOR EACH ROW EXECUTE FUNCTION public.refresh_product_order_totals();