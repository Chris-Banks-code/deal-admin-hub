CREATE OR REPLACE FUNCTION public.sync_product_pool_to_legacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET commission_rate = CASE
        WHEN COALESCE(unit_price, 0) > 0 THEN NEW.pool_amount * 100 / unit_price
        ELSE 0
      END,
      agent_pct = NEW.creator_pct,
      supervisor_pct = NEW.supervisor_pct,
      manager_pct = NEW.operations_pct
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pcr_sync_legacy ON public.product_commission_rules;
CREATE TRIGGER pcr_sync_legacy
AFTER INSERT OR UPDATE ON public.product_commission_rules
FOR EACH ROW EXECUTE FUNCTION public.sync_product_pool_to_legacy();

CREATE OR REPLACE FUNCTION public.sync_deal_commission_from_allocations(_deal uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH totals AS (
    SELECT order_item_id,
      COALESCE(SUM(amount) FILTER (WHERE status <> 'reversed'), 0) AS pot,
      COALESCE(SUM(pct) FILTER (WHERE recipient_role = 'creator' AND status <> 'reversed'), 0) AS creator_pct,
      COALESCE(SUM(pct) FILTER (WHERE recipient_role = 'supervisor' AND status <> 'reversed'), 0) AS supervisor_pct,
      COALESCE(SUM(pct) FILTER (WHERE recipient_role = 'operations' AND status <> 'reversed'), 0) AS operations_pct,
      COALESCE(SUM(amount) FILTER (WHERE recipient_role = 'creator' AND status <> 'reversed'), 0) AS creator_amount,
      COALESCE(SUM(amount) FILTER (WHERE recipient_role = 'supervisor' AND status <> 'reversed'), 0) AS supervisor_amount,
      COALESCE(SUM(amount) FILTER (WHERE recipient_role = 'operations' AND status <> 'reversed'), 0) AS operations_amount
    FROM public.commission_allocations
    WHERE deal_id = _deal
    GROUP BY order_item_id
  )
  UPDATE public.order_items i
  SET commission_amount = t.pot,
      agent_pct = t.creator_pct,
      supervisor_pct = t.supervisor_pct,
      manager_pct = t.operations_pct,
      agent_commission = t.creator_amount,
      supervisor_commission = t.supervisor_amount,
      manager_commission = t.operations_amount
  FROM totals t
  WHERE i.id = t.order_item_id
    AND (
      i.commission_amount IS DISTINCT FROM t.pot OR
      i.agent_pct IS DISTINCT FROM t.creator_pct OR
      i.supervisor_pct IS DISTINCT FROM t.supervisor_pct OR
      i.manager_pct IS DISTINCT FROM t.operations_pct OR
      i.agent_commission IS DISTINCT FROM t.creator_amount OR
      i.supervisor_commission IS DISTINCT FROM t.supervisor_amount OR
      i.manager_commission IS DISTINCT FROM t.operations_amount
    );

  WITH sums AS (
    SELECT deal_id,
      SUM(COALESCE(commission_amount, 0)) AS pot,
      SUM(COALESCE(agent_commission, 0)) AS agent,
      SUM(COALESCE(supervisor_commission, 0)) AS supervisor,
      SUM(COALESCE(manager_commission, 0)) AS operations
    FROM public.order_items
    WHERE deal_id = _deal
    GROUP BY deal_id
  )
  UPDATE public.deals d
  SET commission_amount = s.pot,
      agent_commission = s.agent,
      supervisor_commission = s.supervisor,
      operation_manager_commission = s.operations,
      supervisor_id = COALESCE(d.supervisor_id, (SELECT p.supervisor_id FROM public.profiles p WHERE p.id = d.agent_id))
  FROM sums s
  WHERE d.id = _deal
    AND s.deal_id = _deal
    AND (
      d.commission_amount IS DISTINCT FROM s.pot OR
      d.agent_commission IS DISTINCT FROM s.agent OR
      d.supervisor_commission IS DISTINCT FROM s.supervisor OR
      d.operation_manager_commission IS DISTINCT FROM s.operations OR
      d.supervisor_id IS NULL
    );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_deal_commission_from_allocations(uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.refresh_deal_allocations(_deal uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals%ROWTYPE;
  it record;
  r public.product_commission_rules%ROWTYPE;
  ctype text;
  sup uuid;
  units numeric;
  st text;
  used numeric;
BEGIN
  IF current_setting('deal_group.refreshing_allocations', true) = 'on' THEN RETURN; END IF;
  SELECT * INTO d FROM public.deals WHERE id = _deal;
  IF NOT FOUND THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.commission_allocations WHERE deal_id = _deal AND status = 'paid') THEN RETURN; END IF;

  PERFORM set_config('deal_group.refreshing_allocations', 'on', true);

  IF d.status IN ('cancelled', 'returned', 'rejected') THEN
    UPDATE public.commission_allocations
    SET status = 'reversed', updated_at = now()
    WHERE deal_id = _deal AND status <> 'paid';
    PERFORM public.sync_deal_commission_from_allocations(_deal);
    PERFORM set_config('deal_group.refreshing_allocations', 'off', true);
    RETURN;
  END IF;

  DELETE FROM public.commission_allocations WHERE deal_id = _deal;
  SELECT COALESCE(d.creator_type,
    CASE WHEN p.role = 'supervisor' THEN 'supervisor' WHEN p.agent_type = 'vehicle' THEN 'vehicle' ELSE 'remote' END),
    p.supervisor_id
  INTO ctype, sup
  FROM public.profiles p WHERE p.id = d.agent_id;
  ctype := COALESCE(ctype, 'remote');
  st := CASE WHEN d.status IN ('delivered', 'completed') THEN 'payable' ELSE 'pending' END;

  FOR it IN SELECT * FROM public.order_items WHERE deal_id = _deal LOOP
    SELECT * INTO r FROM public.product_commission_rules WHERE product_id = it.product_id;
    CONTINUE WHEN NOT FOUND;
    units := CASE WHEN st = 'payable' THEN COALESCE(it.quantity_delivered, it.quantity, 0) ELSE COALESCE(it.quantity, 0) END;
    used := 0;
    INSERT INTO public.commission_allocations(
      deal_id, order_item_id, product_id, recipient_role, profile_id, pct, units, amount, currency, status
    )
    SELECT _deal, it.id, it.product_id, x.role, x.pid, x.pct, units,
      r.pool_amount * units * x.pct / 100, r.currency, st
    FROM (VALUES
      ('creator', d.agent_id, r.creator_pct),
      ('delivery', d.delivered_by, CASE WHEN d.delivered_by IS NOT NULL AND d.delivered_by IS DISTINCT FROM d.agent_id THEN r.delivery_pct ELSE 0 END),
      ('supervisor', sup, CASE WHEN ctype <> 'supervisor' AND sup IS NOT NULL AND sup IS DISTINCT FROM d.agent_id AND sup IS DISTINCT FROM d.delivered_by THEN r.supervisor_pct ELSE 0 END),
      ('operations', d.operation_manager_id, r.operations_pct),
      ('regional', NULL::uuid, r.regional_pct),
      ('finance', NULL::uuid, r.finance_pct),
      ('hr', NULL::uuid, r.hr_pct),
      ('admin', NULL::uuid, r.admin_pct)
    ) AS x(role, pid, pct) WHERE x.pct > 0;
    SELECT COALESCE(SUM(pct), 0) INTO used FROM public.commission_allocations WHERE order_item_id = it.id;
    INSERT INTO public.commission_allocations(
      deal_id, order_item_id, product_id, recipient_role, profile_id, pct, units, amount, currency, status
    ) VALUES (
      _deal, it.id, it.product_id, 'deal', NULL, 100 - used, units,
      r.pool_amount * units * (100 - used) / 100, r.currency, st
    );
  END LOOP;

  PERFORM public.sync_deal_commission_from_allocations(_deal);
  PERFORM set_config('deal_group.refreshing_allocations', 'off', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.refresh_deal_allocations(uuid) FROM anon, authenticated, public;

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
      units := CASE WHEN d.status IN ('delivered', 'completed')
        THEN COALESCE(NEW.quantity_delivered, NEW.quantity, 0)
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

UPDATE public.products p
SET commission_rate = CASE WHEN COALESCE(p.unit_price, 0) > 0 THEN r.pool_amount * 100 / p.unit_price ELSE 0 END,
    agent_pct = r.creator_pct,
    supervisor_pct = r.supervisor_pct,
    manager_pct = r.operations_pct
FROM public.product_commission_rules r
WHERE r.product_id = p.id;

SELECT public.refresh_deal_allocations(x.deal_id)
FROM (SELECT DISTINCT deal_id FROM public.commission_allocations) AS x;