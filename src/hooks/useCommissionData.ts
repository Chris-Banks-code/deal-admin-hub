import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildOrders } from '@/lib/finance';
import { rulesFromRow, type CommissionRules } from '@/lib/commissions';
import type { NormalizedOrder } from '@/lib/sales-metrics';

const table = (name: string) => (supabase.from as any)(name);

export interface CommissionData {
  loading: boolean;
  orders: NormalizedOrder[];
  deals: any[];
  salesOrders: any[];
  items: any[];
  profiles: any[];
  payouts: any[];
  bonuses: any[];
  banks: any[];
  products: any[];
  rules: CommissionRules;
  refresh: () => Promise<void>;
}

/** Everything the Commissions module reads, in one place. */
export function useCommissionData(): CommissionData {
  const [state, setState] = useState<Omit<CommissionData, 'refresh' | 'rules'>>({
    loading: true, orders: [], deals: [], salesOrders: [], items: [], profiles: [],
    payouts: [], bonuses: [], banks: [], products: [],
  });
  const [rules, setRules] = useState<CommissionRules>({ agent_pct: 60, supervisor_pct: 25, manager_pct: 15 });

  const refresh = useCallback(async () => {
    const [dealsR, soR, oiR, soiR, profR, poR, bonR, rulesR, bankR, prodR] = await Promise.all([
      table('deals').select('*').order('created_at', { ascending: false }),
      table('sales_orders').select('*').order('created_at', { ascending: false }),
      table('order_items').select('*'),
      table('sales_order_items').select('*'),
      table('profiles').select('id, full_name, role, email'),
      table('commission_payouts').select('*').order('created_at', { ascending: false }),
      table('commission_bonuses').select('*').order('created_at', { ascending: false }),
      table('commission_rules').select('*').limit(1),
      table('bank_accounts').select('*').order('name'),
      table('products').select('id, name, category, unit_price, commission_rate, currency, is_active').order('name'),
    ]);

    const deals = dealsR.data || [];
    const salesOrders = soR.data || [];
    const dealItems = (oiR.data || []).map((i: any) => ({ ...i, sales_order_id: i.deal_id }));

    setRules(rulesFromRow((rulesR.data || [])[0]));
    setState({
      loading: false,
      deals,
      salesOrders,
      orders: buildOrders(deals, salesOrders),
      items: [...(soiR.data || []), ...dealItems],
      profiles: profR.data || [],
      payouts: poR.data || [],
      bonuses: bonR.data || [],
      banks: bankR.data || [],
      products: prodR.data || [],
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, rules, refresh };
}
