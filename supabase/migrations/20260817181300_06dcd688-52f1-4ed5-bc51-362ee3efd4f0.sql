ALTER TABLE public.monthly_targets
  ADD COLUMN IF NOT EXISTS target_currency text NOT NULL DEFAULT 'USD',
  ALTER COLUMN target_amount DROP NOT NULL,
  ALTER COLUMN onboarding_target DROP NOT NULL;