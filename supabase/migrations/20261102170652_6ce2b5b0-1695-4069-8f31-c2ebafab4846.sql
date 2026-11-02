CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_pct numeric NOT NULL DEFAULT 60,
  supervisor_pct numeric NOT NULL DEFAULT 25,
  manager_pct numeric NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT commission_rules_pct_sum CHECK (agent_pct + supervisor_pct + manager_pct = 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_rules TO service_role;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY commissions_view_rules ON public.commission_rules FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), 'commissions', 'view') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY commissions_edit_rules ON public.commission_rules FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), 'commissions', 'edit') OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_permission(auth.uid(), 'commissions', 'edit') OR public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER commission_rules_set_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
INSERT INTO public.commission_rules (agent_pct, supervisor_pct, manager_pct)
SELECT 60, 25, 15 WHERE NOT EXISTS (SELECT 1 FROM public.commission_rules);