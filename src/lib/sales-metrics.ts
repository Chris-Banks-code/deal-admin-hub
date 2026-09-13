/**
 * Single source of truth for order/sales figures.
 *
 * Both the Dashboard and the Sales page read from two places:
 *  - `deals`        (created by agents in the mobile app)
 *  - `sales_orders` (created by admins in this web app)
 *
 * They are normalised to the same shape and the same status vocabulary here so
 * the two pages can never show different numbers again.
 */

export type CanonicalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'fulfilled'
  | 'cancelled';

/** Legacy `deals.status` values → canonical sales-order statuses. */
export const DEAL_STATUS_MAP: Record<string, CanonicalStatus> = {
  pending_admin: 'pending_approval',
  pending_wholesaler: 'pending_approval',
  confirmed: 'approved',
  delivered: 'fulfilled',
  completed: 'fulfilled',
  rejected: 'cancelled',
};

export const toCanonicalStatus = (status?: string | null): CanonicalStatus =>
  (DEAL_STATUS_MAP[status ?? ''] ?? (status as CanonicalStatus) ?? 'draft');

/** Statuses that count as a real sale (money earned). */
export const EARNING_STATUSES: CanonicalStatus[] = ['approved', 'fulfilled'];

export const isEarning = (order: any) =>
  EARNING_STATUSES.includes(toCanonicalStatus(order?.status));

export interface NormalizedOrder {
  id: string;
  source: 'deal' | 'sales_order';
  order_number: string | null;
  customer_id: string | null;
  agent_id: string | null;
  status: CanonicalStatus;
  raw_status?: string | null;
  currency: string;
  subtotal: number;
  total: number;
  commission_total: number | null;
  agent_commission_total: number;
  supervisor_commission_total: number;
  manager_commission_total: number;
  delivery_address?: string | null;
  delivery_date?: string | null;
  notes?: string | null;
  created_at: string;
}

export const normalizeDeal = (d: any): NormalizedOrder => ({
  id: d.id,
  source: 'deal',
  order_number: d.deal_number ?? null,
  customer_id: d.retailer_id ?? null,
  agent_id: d.agent_id ?? null,
  status: toCanonicalStatus(d.status),
  raw_status: d.status,
  currency: d.currency || 'LRD',
  subtotal: Number(d.deal_value ?? 0),
  total: Number(d.deal_value ?? 0),
  commission_total: d.commission_amount != null ? Number(d.commission_amount) : null,
  agent_commission_total: Number(d.agent_commission ?? 0),
  supervisor_commission_total: Number(d.supervisor_commission ?? 0),
  manager_commission_total: Number(d.operation_manager_commission ?? 0),
  delivery_address: d.delivery_address ?? null,
  delivery_date: d.delivery_date ?? null,
  notes: d.notes ?? null,
  created_at: d.created_at,
});

export const normalizeSalesOrder = (o: any): NormalizedOrder => ({
  id: o.id,
  source: 'sales_order',
  order_number: o.order_number ?? null,
  customer_id: o.customer_id ?? null,
  agent_id: o.agent_id ?? null,
  status: toCanonicalStatus(o.status),
  raw_status: o.status,
  currency: o.currency || 'LRD',
  subtotal: Number(o.subtotal ?? 0),
  total: Number(o.total ?? o.subtotal ?? 0),
  commission_total: null,
  agent_commission_total: Number(o.agent_commission_total ?? 0),
  supervisor_commission_total: Number(o.supervisor_commission_total ?? 0),
  manager_commission_total: Number(o.manager_commission_total ?? 0),
  delivery_address: o.delivery_address ?? null,
  delivery_date: o.delivery_date ?? null,
  notes: o.notes ?? null,
  created_at: o.created_at,
});

/** Sum of the commission on the order's line items, keyed by order id. */
export const commissionByOrder = (items: any[]): Record<string, number> => {
  const map: Record<string, number> = {};
  items.forEach(i => {
    const key = i.sales_order_id ?? i.deal_id;
    if (!key) return;
    map[key] = (map[key] || 0) + Number(i.commission_amount || 0);
  });
  return map;
};

export const teamPayout = (o: NormalizedOrder) =>
  o.agent_commission_total + o.supervisor_commission_total + o.manager_commission_total;

/**
 * Total commission pot earned on an order (our percentage of the sale).
 * Prefers the line items, then the order-level field, then the payouts.
 */
export const orderCommission = (o: NormalizedOrder, itemComm: Record<string, number>) =>
  itemComm[o.id] || Number(o.commission_total || 0) || teamPayout(o);

export interface CurrencyTotals {
  orders: number;
  sales: number;
  commission: number;
  team: number;
  deal: number;
}

/** Per-currency totals for the orders that count as sales. USD and LRD are never summed. */
export const salesTotals = (
  orders: NormalizedOrder[],
  itemComm: Record<string, number>,
): Record<string, CurrencyTotals> => {
  const out: Record<string, CurrencyTotals> = {};
  orders.filter(isEarning).forEach(o => {
    const cur = o.currency || 'LRD';
    const t = (out[cur] ||= { orders: 0, sales: 0, commission: 0, team: 0, deal: 0 });
    const team = teamPayout(o);
    const commission = orderCommission(o, itemComm);
    t.orders += 1;
    t.sales += o.total;
    t.commission += commission;
    t.team += team;
    t.deal += Math.max(commission - team, 0);
  });
  return out;
};
