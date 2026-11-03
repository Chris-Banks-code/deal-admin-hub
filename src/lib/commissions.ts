/**
 * Multi-tier commission split.
 *
 * Deal Group sells other businesses' goods. The value of an order belongs to
 * the supplier — our money is the commission on it. That pot is then split
 * between the agent who made the sale, their supervisor and the operation
 * manager. What is left after those payouts is Deal Group's own share.
 *
 * The percentages live in the database (commission_rules) so they can be
 * changed without a code change. The constants below are only the fallback
 * used before that row is read.
 */
import { earningsByPerson, num } from '@/lib/finance';
import { commissionByOrder, isEarning, orderCommission, type NormalizedOrder } from '@/lib/sales-metrics';

export const COMMISSION_SPLIT = {
  agent: 0.6,
  supervisor: 0.25,
  operation_manager: 0.15,
} as const;

export interface CommissionSplit {
  total: number;
  agent: number;
  supervisor: number;
  operation_manager: number;
}

export interface CommissionRules {
  id?: string;
  agent_pct: number;
  supervisor_pct: number;
  manager_pct: number;
}

export const DEFAULT_RULES: CommissionRules = {
  agent_pct: COMMISSION_SPLIT.agent * 100,
  supervisor_pct: COMMISSION_SPLIT.supervisor * 100,
  manager_pct: COMMISSION_SPLIT.operation_manager * 100,
};

/** Read the saved split, falling back to 60 / 25 / 15 when nothing is stored. */
export const rulesFromRow = (row: any): CommissionRules => {
  if (!row) return { ...DEFAULT_RULES };
  const agent = num(row.agent_pct);
  const supervisor = num(row.supervisor_pct);
  const manager = num(row.manager_pct);
  if (agent + supervisor + manager !== 100) return { ...DEFAULT_RULES };
  return { id: row.id, agent_pct: agent, supervisor_pct: supervisor, manager_pct: manager };
};

export const splitCommission = (total: number, rules: CommissionRules = DEFAULT_RULES): CommissionSplit => ({
  total,
  agent: total * (rules.agent_pct / 100),
  supervisor: total * (rules.supervisor_pct / 100),
  operation_manager: total * (rules.manager_pct / 100),
});

export const lineCommission = (subtotal: number, rate: number | null | undefined) =>
  subtotal * ((rate ?? 0) / 100);

/** Payout and bonus records share this status vocabulary. */
export const LEDGER_STATUSES = ['pending', 'approved', 'paid', 'cancelled'] as const;

/** Anything still owed counts; cancelled records and paid records do not. */
export const isOwedStatus = (status: string) => status === 'pending' || status === 'approved';

const MONTH = (d: any) => String(d).slice(0, 7);

export interface WalletRow {
  profile_id: string;
  roles: string[];
  orders: number;
  earned: number;
  bonuses: number;
  accrued: number;
  paid: number;
  owed: number;
}

/**
 * What each person is owed in one currency: commission earned on sales that
 * count, plus bonuses that have not been cancelled, minus what was paid out.
 */
export const buildWallet = ({
  deals,
  salesOrders,
  payouts,
  bonuses,
  currency,
}: {
  deals: any[];
  salesOrders: any[];
  payouts: any[];
  bonuses: any[];
  currency: string;
}): WalletRow[] => {
  const paid: Record<string, number> = {};
  (payouts || [])
    .filter(p => (p.currency || 'LRD') === currency && p.status === 'paid')
    .forEach(p => { paid[p.profile_id] = (paid[p.profile_id] || 0) + num(p.amount); });
  (bonuses || [])
    .filter(b => (b.currency || 'LRD') === currency && b.status === 'paid')
    .forEach(b => { paid[b.profile_id] = (paid[b.profile_id] || 0) + num(b.amount); });

  const accrued: Record<string, { earned: number; bonuses: number; orders: number; roles: Set<string> }> = {};
  const bucket = (id: string) => (accrued[id] ||= { earned: 0, bonuses: 0, orders: 0, roles: new Set<string>() });

  earningsByPerson(deals, salesOrders)
    .filter(e => e.currency === currency)
    .forEach(e => {
      const b = bucket(e.profile_id);
      b.earned += e.earned;
      b.orders += e.orders;
      b.roles.add(e.role);
    });

  (bonuses || [])
    .filter(b => (b.currency || 'LRD') === currency && b.status !== 'cancelled')
    .forEach(b => {
      const t = isOwedStatus(b.status) ? 'bonuses' : 'bonuses';
      bucket(b.profile_id)[t] += num(b.amount);
    });

  return Object.entries(accrued)
    .map(([profile_id, v]) => {
      const total = v.earned + v.bonuses;
      const p = paid[profile_id] || 0;
      return {
        profile_id,
        roles: Array.from(v.roles),
        orders: v.orders,
        earned: v.earned,
        bonuses: v.bonuses,
        accrued: total,
        paid: p,
        owed: Math.max(total - p, 0),
      };
    })
    .sort((a, b) => b.owed - a.owed || b.accrued - a.accrued);
};

export interface MonthPoint {
  month: string;
  commission: number;
  team: number;
  deal: number;
}

/** Commission pot, team payouts and Deal's own share, grouped by calendar month. */
export const commissionByMonth = (
  orders: NormalizedOrder[],
  items: any[],
  currency: string,
): MonthPoint[] => {
  const itemComm = commissionByOrder(items || []);
  const map: Record<string, MonthPoint> = {};
  orders
    .filter(o => (o.currency || 'LRD') === currency && isEarning(o))
    .forEach(o => {
      const key = MONTH(o.created_at);
      const point = (map[key] ||= { month: key, commission: 0, team: 0, deal: 0 });
      const commission = orderCommission(o, itemComm);
      const team = o.agent_commission_total + o.supervisor_commission_total + o.manager_commission_total;
      point.commission += commission;
      point.team += team;
      point.deal += Math.max(commission - team, 0);
    });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
};

/** How the pot divided between the three roles on sales that count. */
export const roleSplitTotals = (orders: NormalizedOrder[], currency: string) => {
  const out = { agent: 0, supervisor: 0, operation_manager: 0 };
  orders
    .filter(o => (o.currency || 'LRD') === currency && isEarning(o))
    .forEach(o => {
      out.agent += o.agent_commission_total;
      out.supervisor += o.supervisor_commission_total;
      out.operation_manager += o.manager_commission_total;
    });
  return out;
};

/** Sum of every commission pot on sales that count, in one currency. */
export const commissionPot = (orders: NormalizedOrder[], items: any[], currency: string) => {
  const itemComm = commissionByOrder(items || []);
  return orders
    .filter(o => (o.currency || 'LRD') === currency && isEarning(o))
    .reduce((s, o) => s + orderCommission(o, itemComm), 0);
};
