-- ============ CHART OF ACCOUNTS ============
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  subtype text,
  parent_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chart_of_accounts TO authenticated;
GRANT ALL ON public.chart_of_accounts TO service_role;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- ============ BANK & CASH ACCOUNTS ============
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'bank' CHECK (kind IN ('bank','cash','mobile_money')),
  bank_name text,
  account_number text,
  currency text NOT NULL DEFAULT 'LRD',
  opening_balance numeric NOT NULL DEFAULT 0,
  ledger_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- ============ JOURNAL ENTRIES ============
CREATE SEQUENCE IF NOT EXISTS public.journal_entry_seq;

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text UNIQUE,
  entry_date date NOT NULL DEFAULT current_date,
  memo text,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  currency text NOT NULL DEFAULT 'LRD',
  source_type text,
  source_id uuid,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description text,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_lines TO authenticated;
GRANT ALL ON public.journal_lines TO service_role;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_journal_lines_entry ON public.journal_lines(entry_id);

CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.entry_number IS NULL THEN
    NEW.entry_number := 'JE-' || to_char(now(),'YYYYMM') || '-' || lpad(nextval('public.journal_entry_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER journal_entries_number BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.generate_journal_entry_number();

-- ============ EXPENSES ============
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT current_date,
  category text NOT NULL DEFAULT 'general',
  vendor text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LRD',
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  expense_account_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('draft','approved','paid','rejected')),
  receipt_url text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ============ PAYMENTS (AR / AP) ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  payment_date date NOT NULL DEFAULT current_date,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LRD',
  method text NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','bank_transfer','mobile_money','cheque','other')),
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  reference text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============ COMMISSION PAYOUTS ============
CREATE TABLE public.commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  period text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'LRD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  paid_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payouts TO authenticated;
GRANT ALL ON public.commission_payouts TO service_role;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;

-- ============ TAX RATES ============
CREATE TABLE public.tax_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rates TO authenticated;
GRANT ALL ON public.tax_rates TO service_role;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chart_of_accounts','bank_accounts','journal_entries','journal_lines','expenses','payments','commission_payouts','tax_rates']
  LOOP
    EXECUTE format('CREATE POLICY "finance_view_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.has_permission(auth.uid(), ''finance'', ''view'') OR public.has_role(auth.uid(), ''super_admin''))', t);
    EXECUTE format('CREATE POLICY "finance_create_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.has_permission(auth.uid(), ''finance'', ''create'') OR public.has_role(auth.uid(), ''super_admin''))', t);
    EXECUTE format('CREATE POLICY "finance_edit_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.has_permission(auth.uid(), ''finance'', ''edit'') OR public.has_role(auth.uid(), ''super_admin''))', t);
    EXECUTE format('CREATE POLICY "finance_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.has_permission(auth.uid(), ''finance'', ''delete'') OR public.has_role(auth.uid(), ''super_admin''))', t);
  END LOOP;
END $$;

-- ============ UPDATED_AT TRIGGERS ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chart_of_accounts','bank_accounts','journal_entries','expenses','payments','commission_payouts','tax_rates']
  LOOP
    EXECUTE format('CREATE TRIGGER %1$s_set_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', t);
  END LOOP;
END $$;

-- ============ SEED CHART OF ACCOUNTS ============
INSERT INTO public.chart_of_accounts (code, name, type, subtype) VALUES
  ('1000','Cash on Hand','asset','cash'),
  ('1010','Bank Accounts','asset','bank'),
  ('1100','Accounts Receivable','asset','receivable'),
  ('1200','Inventory','asset','inventory'),
  ('2000','Accounts Payable','liability','payable'),
  ('2100','Commissions Payable','liability','payable'),
  ('2200','Tax Payable','liability','tax'),
  ('3000','Owner Equity','equity','equity'),
  ('3100','Retained Earnings','equity','equity'),
  ('4000','Commission Income','income','operating'),
  ('4100','Other Income','income','other'),
  ('5000','Agent Commission Expense','expense','commission'),
  ('5010','Supervisor Commission Expense','expense','commission'),
  ('5020','Manager Commission Expense','expense','commission'),
  ('6000','Salaries & Wages','expense','operating'),
  ('6010','Rent','expense','operating'),
  ('6020','Utilities','expense','operating'),
  ('6030','Transport & Fuel','expense','operating'),
  ('6040','Marketing','expense','operating'),
  ('6050','Office Supplies','expense','operating'),
  ('6060','Bank Charges','expense','operating'),
  ('6900','Miscellaneous','expense','operating');

INSERT INTO public.tax_rates (name, rate, description) VALUES
  ('GST 10%', 10, 'Liberia Goods & Services Tax'),
  ('Withholding 10%', 10, 'Withholding tax on services'),
  ('Zero rated', 0, 'No tax');
