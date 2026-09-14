/**
 * Shared finance helpers.
 *
 * Money rule for Deal Group: the value of an order is the supplier's goods —
 * it is NOT our money. Our money is the commission pot on that order, out of
 * which the agent / supervisor / operation manager are paid. What remains is
 * Deal Group revenue, and business expenses are deducted from that.
 */
import {
  commissionByOrder, isEarning, normalizeDeal, normalizeSalesOrder,
  teamPayout, orderCommission, type NormalizedOrder,
} from '@/lib/sales-metrics';

export const EXPENSE_CATEGORIES = [
  'Salaries & Wages', 'Rent', 'Utilities', 'Transport & Fuel', 'Marketing',
  'Office Supplies', 'Bank Charges', 'Licenses & Fees', 'Repairs', 'Miscellaneous',
] as const;

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'income', 'expense'] as const;

export const CURRENCIES = ['LRD', 'USD'];

export const num = (v: any) => Number(v ?? 0) || 0;

/** Group any list of rows by their currency field. */
export const byCurrency = <T extends { currency?: string | null }>(rows: T[]) => {
  const out: Record<string, T[]> = {};
  rows.forEach(r => {
    const c = r.currency || 'LRD';
    (out[c] ||= []).push(r);
  });
  return out;
};

export const sumBy = <T,>(rows: T[], get: (r: T) => number) =>
  rows.reduce((s, r) => s + get(r), 0);

export interface FinanceTotals {
  commissionIncome: number;   // our full percentage on completed sales
  teamPayouts: number;        // owed/earned by agents, supervisors, managers
  grossProfit: number;        // commissionIncome - teamPayouts
  expenses: number;           // operating expenses recorded
  netProfit: number;          // grossProfit - expenses
  salesValue: number;         // goods sold (supplier value, not our money)
  cashIn: number;
  cashOut: number;
  receivable: number;         // invoiced commission not yet collected
  payoutsPaid: number;
  payoutsOwed: number;
}

const EMPTY: FinanceTotals = {
  commissionIncome: 0, teamPayouts: 0, grossProfit: 0, expenses: 0, netProfit: 0,
  salesValue: 0, cashIn: 0, cashOut: 0, receivable: 0, payoutsPaid: 0, payoutsOwed: 0,
};

export const emptyTotals = () => ({ ...EMPTY });

/** Build normalized orders from the two order sources. */
export const buildOrders = (deals: any[], salesOrders: any[]): NormalizedOrder[] =>
  [...(salesOrders || []).map(normalizeSalesOrder), ...(deals || []).map(normalizeDeal)]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

export interface FinanceInput {
  orders: NormalizedOrder[];
  items: any[];
  expenses: any[];
  payments: any[];
  payouts: any[];
}

/** Per-currency finance roll-up. LRD and USD are never mixed. */
export const financeTotals = ({ orders, items, expenses, payments, payouts }: FinanceInput) => {
  const itemComm = commissionByOrder(items || []);
  const out: Record<string, FinanceTotals> = {};
  const bucket = (cur: string) => (out[cur] ||= emptyTotals());

  orders.filter(isEarning).forEach(o => {
    const t = bucket(o.currency || 'LRD');
    const commission = orderCommission(o, itemComm);
    t.salesValue += o.total;
    t.commissionIncome += commission;
    t.teamPayouts += teamPayout(o);
  });

  (expenses || []).forEach(e => {
    if (e.status === 'rejected' || e.status === 'draft') return;
    bucket(e.currency || 'LRD').expenses += num(e.amount);
  });

  (payments || []).forEach(p => {
    const t = bucket(p.currency || 'LRD');
    if (p.direction === 'in') t.cashIn += num(p.amount);
    else t.cashOut += num(p.amount);
  });

  (payouts || []).forEach(p => {
    const t = bucket(p.currency || 'LRD');
    if (p.status === 'paid') t.payoutsPaid += num(p.amount);
    else if (p.status !== 'cancelled') t.payoutsOwed += num(p.amount);
  });

  Object.values(out).forEach(t => {
    t.grossProfit = t.commissionIncome - t.teamPayouts;
    t.netProfit = t.grossProfit - t.expenses;
    t.receivable = Math.max(t.commissionIncome - t.cashIn, 0);
  });

  if (!Object.keys(out).length) out.LRD = emptyTotals();
  return out;
};

/** Commission earned per person (agent / supervisor / operation manager), per currency. */
export interface PersonEarning {
  profile_id: string;
  currency: string;
  role: string;
  earned: number;
  orders: number;
}

export const earningsByPerson = (deals: any[], salesOrders: any[]): PersonEarning[] => {
  const map = new Map<string, PersonEarning>();
  const add = (id: string | null, role: string, cur: string, amount: number) => {
    if (!id || !amount) return;
    const key = `${id}|${cur}|${role}`;
    const e = map.get(key) || { profile_id: id, currency: cur, role, earned: 0, orders: 0 };
    e.earned += amount;
    e.orders += 1;
    map.set(key, e);
  };

  (deals || []).forEach(d => {
    const o = normalizeDeal(d);
    if (!isEarning(o)) return;
    const cur = o.currency;
    add(d.agent_id, 'agent', cur, num(d.agent_commission));
    add(d.supervisor_id, 'supervisor', cur, num(d.supervisor_commission));
    add(d.operation_manager_id, 'operation_manager', cur, num(d.operation_manager_commission));
  });

  (salesOrders || []).forEach(s => {
    const o = normalizeSalesOrder(s);
    if (!isEarning(o)) return;
    add(s.agent_id, 'agent', o.currency, num(s.agent_commission_total));
  });

  return Array.from(map.values()).sort((a, b) => b.earned - a.earned);
};

export const monthKey = (d: string | Date) => String(new Date(d).toISOString()).slice(0, 7);

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString('en-US', { month: 'short', year: '2-digit' });
};
