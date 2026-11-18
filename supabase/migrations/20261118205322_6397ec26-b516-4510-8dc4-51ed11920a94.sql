UPDATE public.product_commission_rules SET pool_amount=5, currency='LRD' WHERE product_id IN (SELECT id FROM public.products WHERE name ILIKE 'mineral water');
UPDATE public.products SET currency='LRD' WHERE name ILIKE 'mineral water';
REVOKE EXECUTE ON FUNCTION public.tg_refresh_allocations() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.refresh_deal_allocations(uuid) FROM authenticated;
REVOKE ALL ON public.app_settings, public.commission_allocations, public.product_commission_rules, public.retailer_ownership_log FROM anon;