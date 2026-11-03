REVOKE ALL ON public.commission_bonuses FROM anon;
REVOKE ALL ON public.commission_rules FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_bonuses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_bonuses TO service_role;
GRANT ALL ON public.commission_rules TO service_role;