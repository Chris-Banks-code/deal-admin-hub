import { describe, it, expect } from 'vitest';
import { buildOrders } from '@/lib/finance';
import {
  DEFAULT_RULES,
  buildWallet,
  commissionPot,
  isOwedStatus,
  lineCommission,
  roleSplitTotals,
  rulesFromRow,
  splitCommission,
} from '@/lib/commissions';

const deal = {
  id: 'd1',
  status: 'delivered',
  currency: 'LRD',
  deal_value: 1000,
  commission_amount: 200,
  agent_id: 'a1',
  supervisor_id: 's1',
  operation_manager_id: 'm1',
  agent_commission: 60,
  supervisor_commission: 25,
  operation_manager_commission: 15,
  created_at: '2026-09-01',
};

describe('commission split', () => {
  it('splits a commission pot 60 / 25 / 15 by default', () => {
    const s = splitCommission(1000);
    expect(s.agent).toBe(600);
    expect(s.supervisor).toBe(250);
    expect(s.operation_manager).toBe(150);
  });

  it('uses the saved percentages when rules are supplied', () => {
    const s = splitCommission(1000, { agent_pct: 50, supervisor_pct: 30, manager_pct: 20 });
    expect(s.agent).toBe(500);
    expect(s.supervisor).toBe(300);
    expect(s.operation_manager).toBe(200);
  });

  it('reads stored rules and falls back when they do not add up to 100', () => {
    expect(rulesFromRow({ agent_pct: 70, supervisor_pct: 20, manager_pct: 10 }))
      .toMatchObject({ agent_pct: 70, supervisor_pct: 20, manager_pct: 10 });
    expect(rulesFromRow({ agent_pct: 50, supervisor_pct: 20, manager_pct: 20 }))
      .toMatchObject(DEFAULT_RULES);
    expect(rulesFromRow(null)).toMatchObject(DEFAULT_RULES);
  });

  it('charges a line commission as a percentage of its subtotal', () => {
    expect(lineCommission(500, 10)).toBe(50);
    expect(lineCommission(500, null)).toBe(0);
  });
});

describe('wallet balances', () => {
  it('owes earned commission plus bonuses that have not been paid', () => {
    const rows = buildWallet({
      deals: [deal],
      salesOrders: [],
      payouts: [{ profile_id: 'a1', amount: 20, currency: 'LRD', status: 'paid' }],
      bonuses: [{ profile_id: 'a1', amount: 10, currency: 'LRD', status: 'approved' }],
      currency: 'LRD',
    });
    const me = rows.find(r => r.profile_id === 'a1');
    expect(me?.earned).toBe(60);
    expect(me?.bonuses).toBe(10);
    expect(me?.paid).toBe(20);
    expect(me?.owed).toBe(50);
  });

  it('never shows a negative balance when more was paid than earned', () => {
    const rows = buildWallet({
      deals: [deal],
      salesOrders: [],
      payouts: [{ profile_id: 'a1', amount: 500, currency: 'LRD', status: 'paid' }],
      bonuses: [],
      currency: 'LRD',
    });
    expect(rows.find(r => r.profile_id === 'a1')?.owed).toBe(0);
  });

  it('keeps USD payouts out of an LRD balance', () => {
    const rows = buildWallet({
      deals: [deal],
      salesOrders: [],
      payouts: [{ profile_id: 'a1', amount: 20, currency: 'USD', status: 'paid' }],
      bonuses: [],
      currency: 'LRD',
    });
    const me = rows.find(r => r.profile_id === 'a1');
    expect(me?.paid).toBe(0);
    expect(me?.owed).toBe(60);
  });

  it('only pending and approved records count as owed', () => {
    expect(isOwedStatus('pending')).toBe(true);
    expect(isOwedStatus('approved')).toBe(true);
    expect(isOwedStatus('paid')).toBe(false);
    expect(isOwedStatus('cancelled')).toBe(false);
  });
});

describe('commission pot', () => {
  it('is the commission on sales that count, split by role', () => {
    const orders = buildOrders([deal], []);
    expect(commissionPot(orders, [], 'LRD')).toBe(200);
    expect(roleSplitTotals(orders, 'LRD'))
      .toEqual({ agent: 60, supervisor: 25, operation_manager: 15 });
  });

  it('ignores cancelled sales and other currencies', () => {
    const orders = buildOrders([deal, { ...deal, id: 'd2', status: 'cancelled' }], []);
    expect(commissionPot(orders, [], 'LRD')).toBe(200);
    expect(commissionPot(orders, [], 'USD')).toBe(0);
    expect(roleSplitTotals(orders, 'USD')).toEqual({ agent: 0, supervisor: 0, operation_manager: 0 });
  });
});
