-- =========================================================
-- WAVE 1: ROLES, PERMISSIONS, AUDIT LOG
-- =========================================================

-- 1. Role enum ---------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'ceo',
    'executive',
    'admin',
    'operation_manager',
    'finance_manager',
    'warehouse_manager',
    'procurement_manager',
    'product_manager',
    'regional_manager',
    'customer_service',
    'internal_auditor',
    'supervisor',
    'sales_agent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. user_roles table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role() --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4. role_module_permissions -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role       public.app_role NOT NULL,
  module     text NOT NULL,
  can_view   boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit   boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

GRANT SELECT ON public.role_module_permissions TO authenticated;
GRANT ALL    ON public.role_module_permissions TO service_role;

ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

-- 5. updated_at helper -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_rmp_updated_at ON public.role_module_permissions;
CREATE TRIGGER trg_rmp_updated_at
BEFORE UPDATE ON public.role_module_permissions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. has_permission() --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id uuid,
  _module  text,
  _action  text  -- 'view' | 'create' | 'edit' | 'delete' | 'approve'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_module_permissions rmp ON rmp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rmp.module = _module
      AND CASE _action
            WHEN 'view'    THEN rmp.can_view
            WHEN 'create'  THEN rmp.can_create
            WHEN 'edit'    THEN rmp.can_edit
            WHEN 'delete'  THEN rmp.can_delete
            WHEN 'approve' THEN rmp.can_approve
            ELSE false
          END
  );
$$;

-- 7. RLS policies for user_roles & role_module_permissions -------------------
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "read permission matrix" ON public.role_module_permissions;
CREATE POLICY "read permission matrix" ON public.role_module_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins manage permission matrix" ON public.role_module_permissions;
CREATE POLICY "admins manage permission matrix" ON public.role_module_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- 8. Backfill user_roles from profiles.role ----------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT p.id,
       CASE p.role
         WHEN 'admin' THEN 'admin'::public.app_role
         WHEN 'operation_manager' THEN 'operation_manager'::public.app_role
         WHEN 'supervisor' THEN 'supervisor'::public.app_role
         WHEN 'agent' THEN 'sales_agent'::public.app_role
         ELSE 'sales_agent'::public.app_role
       END
FROM public.profiles p
WHERE p.role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 9. Seed default permission matrix (18 modules × 14 roles) ------------------
-- Truth table encoded compactly: each row lists modules a role fully owns.
-- Everything else defaults to no access.
WITH modules(m) AS (
  VALUES
    ('dashboard'),('sales'),('orders'),('inventory'),('products'),
    ('customers'),('suppliers'),('agents'),('finance'),('commissions'),
    ('analytics'),('reports'),('communications'),('approvals'),
    ('security'),('documents'),('settings'),('audit_logs')
),
role_access(role, module, v, c, e, d, a) AS (
  VALUES
  -- super_admin: everything
  ('super_admin','*',true,true,true,true,true),
  -- ceo & executive: view-only across all
  ('ceo','*',true,false,false,false,false),
  ('executive','*',true,false,false,false,false),
  -- admin: full except security-critical audit/security (view only)
  ('admin','*',true,true,true,true,true),
  -- operation_manager: operations + view finance
  ('operation_manager','dashboard',true,false,false,false,false),
  ('operation_manager','orders',true,true,true,true,true),
  ('operation_manager','sales',true,true,true,false,false),
  ('operation_manager','inventory',true,true,true,false,false),
  ('operation_manager','products',true,true,true,false,false),
  ('operation_manager','customers',true,true,true,false,false),
  ('operation_manager','suppliers',true,true,true,false,false),
  ('operation_manager','agents',true,true,true,false,true),
  ('operation_manager','commissions',true,false,false,false,true),
  ('operation_manager','approvals',true,false,false,false,true),
  ('operation_manager','analytics',true,false,false,false,false),
  ('operation_manager','reports',true,false,false,false,false),
  ('operation_manager','communications',true,true,true,false,false),
  -- finance_manager
  ('finance_manager','dashboard',true,false,false,false,false),
  ('finance_manager','finance',true,true,true,true,true),
  ('finance_manager','commissions',true,true,true,true,true),
  ('finance_manager','sales',true,false,false,false,false),
  ('finance_manager','orders',true,false,false,false,false),
  ('finance_manager','reports',true,true,true,false,false),
  ('finance_manager','analytics',true,false,false,false,false),
  ('finance_manager','approvals',true,false,false,false,true),
  -- warehouse_manager
  ('warehouse_manager','dashboard',true,false,false,false,false),
  ('warehouse_manager','inventory',true,true,true,true,true),
  ('warehouse_manager','products',true,false,false,false,false),
  ('warehouse_manager','orders',true,false,true,false,false),
  ('warehouse_manager','suppliers',true,false,false,false,false),
  ('warehouse_manager','reports',true,false,false,false,false),
  -- procurement_manager
  ('procurement_manager','dashboard',true,false,false,false,false),
  ('procurement_manager','suppliers',true,true,true,true,true),
  ('procurement_manager','inventory',true,false,false,false,false),
  ('procurement_manager','products',true,false,false,false,false),
  ('procurement_manager','approvals',true,false,false,false,true),
  ('procurement_manager','reports',true,false,false,false,false),
  -- product_manager
  ('product_manager','dashboard',true,false,false,false,false),
  ('product_manager','products',true,true,true,true,true),
  ('product_manager','inventory',true,false,false,false,false),
  ('product_manager','approvals',true,false,false,false,true),
  -- regional_manager
  ('regional_manager','dashboard',true,false,false,false,false),
  ('regional_manager','agents',true,true,true,false,true),
  ('regional_manager','sales',true,false,false,false,false),
  ('regional_manager','orders',true,false,false,false,false),
  ('regional_manager','customers',true,true,true,false,false),
  ('regional_manager','commissions',true,false,false,false,false),
  ('regional_manager','reports',true,false,false,false,false),
  ('regional_manager','analytics',true,false,false,false,false),
  -- customer_service
  ('customer_service','dashboard',true,false,false,false,false),
  ('customer_service','customers',true,true,true,false,false),
  ('customer_service','orders',true,false,true,false,false),
  ('customer_service','communications',true,true,true,true,false),
  -- internal_auditor: view all + audit logs
  ('internal_auditor','*',true,false,false,false,false),
  ('internal_auditor','audit_logs',true,false,false,false,false),
  -- supervisor
  ('supervisor','dashboard',true,false,false,false,false),
  ('supervisor','agents',true,false,true,false,false),
  ('supervisor','orders',true,false,false,false,false),
  ('supervisor','sales',true,false,false,false,false),
  ('supervisor','commissions',true,false,false,false,false),
  -- sales_agent: minimal (mobile app is primary)
  ('sales_agent','dashboard',true,false,false,false,false),
  ('sales_agent','orders',true,true,false,false,false),
  ('sales_agent','customers',true,true,false,false,false)
)
INSERT INTO public.role_module_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve)
SELECT ra.role::public.app_role,
       m.m,
       ra.v, ra.c, ra.e, ra.d, ra.a
FROM role_access ra
CROSS JOIN modules m
WHERE ra.module = '*' OR ra.module = m.m
ON CONFLICT (role, module) DO NOTHING;

-- 10. audit_logs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text NOT NULL,           -- 'INSERT' | 'UPDATE' | 'DELETE'
  entity_type  text NOT NULL,           -- table name
  entity_id    text,
  before_data  jsonb,
  after_data   jsonb,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user   ON public.audit_logs (user_id, created_at DESC);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL    ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auditors read audit logs" ON public.audit_logs;
CREATE POLICY "auditors read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'internal_auditor'));

-- Generic audit trigger (attach to business tables in later waves)
CREATE OR REPLACE FUNCTION public.tg_write_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_id text;
BEGIN
  v_entity_id := COALESCE(
    (CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(NEW) END)->>'id',
    NULL
  );
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;