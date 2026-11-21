CREATE OR REPLACE FUNCTION public.snapshot_product_commission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  p public.products%ROWTYPE;
  r public.product_commission_rules%ROWTYPE;
  d public.deals%ROWTYPE;
  sup uuid;
  ctype text;
  sup_pct numeric;
  units numeric;
  gross numeric;
BEGIN
  IF TG_TABLE_NAME = 'order_items' THEN
    SELECT * INTO r FROM public.product_commission_rules WHERE product_id = NEW.product_id;
    IF FOUND THEN
      SELECT * INTO d FROM public.deals WHERE id = NEW.deal_id;
      SELECT prof.supervisor_id,
        COALESCE(d.creator_type,
          CASE WHEN prof.role = 'supervisor' THEN 'supervisor' WHEN prof.agent_type = 'vehicle' THEN 'vehicle' ELSE 'remote' END)
      INTO sup, ctype
      FROM public.profiles prof WHERE prof.id = d.agent_id;
      ctype := COALESCE(ctype, 'remote');
      units := CASE
        WHEN d.status IN ('cancelled', 'returned', 'rejected') THEN 0
        WHEN d.status IN ('delivered', 'completed') THEN COALESCE(NEW.quantity_delivered, NEW.quantity, 0)
        ELSE COALESCE(NEW.quantity, 0) END;
      sup_pct := CASE WHEN ctype <> 'supervisor' AND sup IS NOT NULL
        AND sup IS DISTINCT FROM d.agent_id AND sup IS DISTINCT FROM d.delivered_by
        THEN r.supervisor_pct ELSE 0 END;
      gross := COALESCE(NEW.subtotal, NEW.quantity * NEW.unit_price, 0);

      NEW.commission_amount := r.pool_amount * units;
      NEW.agent_pct := r.creator_pct;
      NEW.supervisor_pct := sup_pct;
      NEW.manager_pct := r.operations_pct;
      NEW.agent_commission := r.pool_amount * units * r.creator_pct / 100;
      NEW.supervisor_commission := r.pool_amount * units * sup_pct / 100;
      NEW.manager_commission := r.pool_amount * units * r.operations_pct / 100;
      NEW.commission_rate := CASE WHEN gross > 0 THEN NEW.commission_amount * 100 / gross ELSE 0 END;
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.product_id IS DISTINCT FROM OLD.product_id THEN
    SELECT * INTO p FROM public.products WHERE id = NEW.product_id;
    IF NOT FOUND OR p.agent_pct IS NULL OR p.supervisor_pct IS NULL OR p.manager_pct IS NULL THEN
      RAISE EXCEPTION 'Set the commission split for this product before placing an order';
    END IF;
    NEW.agent_pct := p.agent_pct;
    NEW.supervisor_pct := p.supervisor_pct;
    NEW.manager_pct := p.manager_pct;
    NEW.commission_rate := COALESCE(p.commission_rate, 0);
  ELSIF OLD.agent_pct IS NULL THEN
    RETURN NEW;
  ELSE
    NEW.agent_pct := OLD.agent_pct;
    NEW.supervisor_pct := OLD.supervisor_pct;
    NEW.manager_pct := OLD.manager_pct;
    NEW.commission_rate := OLD.commission_rate;
  END IF;
  NEW.commission_amount := COALESCE(NEW.subtotal, NEW.quantity * NEW.unit_price, 0) * NEW.commission_rate / 100;
  NEW.agent_commission := NEW.commission_amount * NEW.agent_pct / 100;
  NEW.supervisor_commission := NEW.commission_amount * NEW.supervisor_pct / 100;
  NEW.manager_commission := NEW.commission_amount * NEW.manager_pct / 100;
  RETURN NEW;
END;
$$;