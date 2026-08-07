
CREATE TABLE IF NOT EXISTS public.monthly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month text NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  onboarding_target integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_targets TO authenticated;
GRANT ALL ON public.monthly_targets TO service_role;

ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_targets read authenticated"
  ON public.monthly_targets FOR SELECT TO authenticated USING (true);

CREATE POLICY "monthly_targets managers manage"
  ON public.monthly_targets FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operation_manager') OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'executive')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operation_manager') OR public.has_role(auth.uid(), 'ceo')
    OR public.has_role(auth.uid(), 'executive')
  );

CREATE TRIGGER monthly_targets_set_updated_at
BEFORE UPDATE ON public.monthly_targets
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
