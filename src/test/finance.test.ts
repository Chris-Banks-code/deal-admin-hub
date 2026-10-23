import { describe, it, expect } from 'vitest';
import { financeTotals, buildOrders } from '@/lib/finance';

const deal = { id: 'd1', status: 'delivered', currency: 'LRD', deal_value: 1000, agent_commission: 60, supervisor_commission: 25, operation_manager_commission: 15, created_at: '2026-09-01' };
const items = [{ deal_id: 'd1', sales_order_id: 'd1', commission_amount: 200 }];

describe('finance totals', () => {
  it('net profit = commission - team payouts - expenses', () => {
    const t = financeTotals({ orders: buildOrders([deal], []), items, expenses: [{ amount: 30, currency: 'LRD', status: 'approved' }], payments: [], payouts: [] }).LRD;
    expect(t.commissionIncome).toBe(200);
    expect(t.teamPayouts).toBe(100);
    expect(t.netProfit).toBe(70);
    expect(t.salesValue).toBe(1000);
  });

  it('never mixes USD into LRD', () => {
    const t = financeTotals({ orders: buildOrders([deal], []), items, expenses: [{ amount: 50, currency: 'USD', status: 'approved' }], payments: [], payouts: [] });
    expect(t.LRD.expenses).toBe(0);
    expect(t.USD.expenses).toBe(50);
  });

  it('draft and rejected expenses are not counted', () => {
    const t = financeTotals({ orders: [], items: [], expenses: [{ amount: 10, status: 'draft' }, { amount: 20, status: 'rejected' }], payments: [], payouts: [] });
    expect(t.LRD.expenses).toBe(0);
  });
});

import { periodWindow } from '@/lib/finance';
describe('dashboard period', () => {
  it('month covers the whole calendar month', () => {
    const [a, b] = periodWindow('month', '2026-09', '')!;
    expect(a.getDate()).toBe(1); expect(a.getMonth()).toBe(8); expect(b.getMonth()).toBe(9);
  });
  it('week starts on Monday and spans 7 days', () => {
    const [a, b] = periodWindow('week', '', '2026-W38')!;
    expect(a.getDay()).toBe(1); expect(a.getDate()).toBe(14); expect((b.getTime() - a.getTime()) / 864e5).toBe(7);
  });
  it('overall has no window', () => { expect(periodWindow('overall', '2026-09', '')).toBeNull(); });
});
