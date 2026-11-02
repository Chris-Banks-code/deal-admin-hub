REVOKE SELECT ON public.commission_rules FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;

CREATE TABLE public.commission_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  period text,
  title text NOT NULL DEFAULT 'Bonus',
  reason text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LRD',
  status text NOT NULL DEFAULT 'pending',
  payment_id uuid,
  paid_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_bonuses TO authenticated;
GRANT ALL ON public.commission_bonuses TO service_role;
ALTER TABLE public.commission_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY commissions_view_bonuses ON public.commission_bonuses FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'commissions', 'view') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY commissions_create_bonuses ON public.commission_bonuses FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), 'commissions', 'create') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY commissions_edit_bonuses ON public.commission_bonuses FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'commissions', 'edit') OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_permission(auth.uid(), 'commissions', 'edit') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY commissions_delete_bonuses ON public.commission_bonuses FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), 'commissions', 'delete') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER commission_bonuses_set_updated_at BEFORE UPDATE ON public.commission_bonuses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_bonuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_payouts;