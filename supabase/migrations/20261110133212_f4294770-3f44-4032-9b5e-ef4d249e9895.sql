REVOKE ALL ON public.commission_payouts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payouts TO authenticated;
GRANT ALL ON public.commission_payouts TO service_role;