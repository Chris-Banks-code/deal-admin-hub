import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole =
  | 'super_admin'
  | 'ceo'
  | 'executive'
  | 'admin'
  | 'operation_manager'
  | 'finance_manager'
  | 'warehouse_manager'
  | 'procurement_manager'
  | 'product_manager'
  | 'regional_manager'
  | 'customer_service'
  | 'internal_auditor'
  | 'supervisor'
  | 'sales_agent';

export type ModuleKey =
  | 'dashboard' | 'sales' | 'orders' | 'inventory' | 'products'
  | 'customers' | 'suppliers' | 'agents' | 'finance' | 'commissions'
  | 'analytics' | 'reports' | 'communications' | 'approvals'
  | 'security' | 'documents' | 'settings' | 'audit_logs';

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve';

interface PermRow {
  role: AppRole;
  module: ModuleKey;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

interface State {
  loading: boolean;
  roles: AppRole[];
  perms: PermRow[];
}

const COL: Record<Action, keyof PermRow> = {
  view: 'can_view',
  create: 'can_create',
  edit: 'can_edit',
  delete: 'can_delete',
  approve: 'can_approve',
};

export function usePermissions() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ loading: true, roles: [], perms: [] });

  useEffect(() => {
    if (!user) {
      setState({ loading: false, roles: [], perms: [] });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: rolesData } = await (supabase.from as any)('user_roles')
        .select('role').eq('user_id', user.id);
      const roles: AppRole[] = (rolesData || []).map((r: any) => r.role);
      let perms: PermRow[] = [];
      if (roles.length) {
        const { data: permData } = await (supabase.from as any)('role_module_permissions')
          .select('*').in('role', roles);
        perms = (permData || []) as PermRow[];
      }
      if (!cancelled) setState({ loading: false, roles, perms });
    })();
    return () => { cancelled = true; };
  }, [user]);

  const can = (module: ModuleKey, action: Action = 'view') =>
    state.perms.some(p => p.module === module && p[COL[action]] === true);

  const hasRole = (role: AppRole) => state.roles.includes(role);

  return { ...state, can, hasRole };
}
