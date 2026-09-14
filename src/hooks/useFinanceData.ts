import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buildOrders } from '@/lib/finance';
import type { NormalizedOrder } from '@/lib/sales-metrics';

const table = (name: string) => (supabase.from as any)(name);

export interface FinanceData {
  loading: boolean;
  orders: NormalizedOrder[];
  deals: any[];
  salesOrders: any[];
  items: any[];
  profiles: any[];
  clients: any[];
  expenses: any[];
  payments: any[];
  payouts: any[];
  accounts: any[];
  banks: any[];
  entries: any[];
  lines: any[];
  taxRates: any[];
  refresh: () => Promise<void>;
}

export function useFinanceData(): FinanceData {
  const [state, setState] = useState<Omit<FinanceData, 'refresh'>>({
    loading: true, orders: [], deals: [], salesOrders: [], items: [], profiles: [],
    clients: [], expenses: [], payments: [], payouts: [], accounts: [], banks: [],
    entries: [], lines: [], taxRates: [],
  });

  const refresh = useCallback(async () => {
    const [
      dealsR, soR, oiR, soiR, profR, cliR,
      expR, payR, poR, acctR, bankR, jeR, jlR, taxR,
    ] = await Promise.all([
      table('deals').select('*').order('created_at', { ascending: false }),
      table('sales_orders').select('*').order('created_at', { ascending: false }),
      table('order_items').select('*'),
      table('sales_order_items').select('*'),
      table('profiles').select('id, full_name, role, email'),
      table('clients').select('id, company_name, client_type'),
      table('expenses').select('*').order('expense_date', { ascending: false }),
      table('payments').select('*').order('payment_date', { ascending: false }),
      table('commission_payouts').select('*').order('created_at', { ascending: false }),
      table('chart_of_accounts').select('*').order('code'),
      table('bank_accounts').select('*').order('name'),
      table('journal_entries').select('*').order('entry_date', { ascending: false }),
      table('journal_lines').select('*'),
      table('tax_rates').select('*').order('name'),
    ]);

    const deals = dealsR.data || [];
    const salesOrders = soR.data || [];
    const dealItems = (oiR.data || []).map((i: any) => ({ ...i, sales_order_id: i.deal_id }));

    setState({
      loading: false,
      deals,
      salesOrders,
      orders: buildOrders(deals, salesOrders),
      items: [...(soiR.data || []), ...dealItems],
      profiles: profR.data || [],
      clients: cliR.data || [],
      expenses: expR.data || [],
      payments: payR.data || [],
      payouts: poR.data || [],
      accounts: acctR.data || [],
      banks: bankR.data || [],
      entries: jeR.data || [],
      lines: jlR.data || [],
      taxRates: taxR.data || [],
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, refresh };
}
