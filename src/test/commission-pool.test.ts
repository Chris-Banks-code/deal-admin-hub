import { describe, it, expect } from 'vitest';
import { allocatePool, DEFAULT_POOL_RULE, SCENARIOS, isValidPoolRule } from '@/lib/commission-pool';
const rule = { ...DEFAULT_POOL_RULE, pool_amount: 5 };
const deal = (i: number) => allocatePool(rule, SCENARIOS[i].actors, 1).find(a => a.role === 'deal')!.pct;
const total = (i: number) => allocatePool(rule, SCENARIOS[i].actors, 1).reduce((s, a) => s + a.pct, 0);
describe('commission pool scenarios', () => {
  it('remote creates, vehicle delivers: DEAL 23%', () => expect(deal(0)).toBe(23));
  it('vehicle own order: no delivery share, DEAL 33%', () => {
    expect(allocatePool(rule, SCENARIOS[1].actors, 1).some(a => a.role === 'delivery')).toBe(false);
    expect(deal(1)).toBe(33);
  });
  it('vehicle creates, other vehicle delivers: DEAL 23%', () => expect(deal(2)).toBe(23));
  it('supervisor own order: no override, DEAL 28%', () => {
    expect(allocatePool(rule, SCENARIOS[3].actors, 1).some(a => a.role === 'supervisor')).toBe(false);
    expect(deal(3)).toBe(28);
  });
  it('every scenario totals 100%', () => [0, 1, 2, 3].forEach(i => expect(total(i)).toBe(100)));
  it('uses delivered units x pool', () => expect(allocatePool(rule, SCENARIOS[0].actors, 4)[0].amount).toBe(7));
  it('changing pool keeps percentages', () => expect(allocatePool({ ...rule, pool_amount: 10 }, SCENARIOS[0].actors, 1)[0].pct).toBe(35));
  it('blocks shares over 100%', () => expect(isValidPoolRule({ ...rule, admin_pct: 40 })).toBe(false));
});
