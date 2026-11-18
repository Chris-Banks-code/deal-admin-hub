// Per-product commission pool: shares are % of a fixed pool per delivered unit.
export type CreatorType = 'remote' | 'vehicle' | 'supervisor';
export interface PoolRule {
  unit: string; pool_amount: number; currency: string;
  creator_pct: number; delivery_pct: number; supervisor_pct: number; operations_pct: number;
  regional_pct: number; finance_pct: number; hr_pct: number; admin_pct: number;
}
export const SHARE_FIELDS = [
  { key: 'creator_pct', label: 'Order creator' },
  { key: 'delivery_pct', label: 'Vehicle agent delivery' },
  { key: 'supervisor_pct', label: 'Supervisor override' },
  { key: 'operations_pct', label: 'Operations Manager' },
  { key: 'regional_pct', label: 'Regional Manager' },
  { key: 'finance_pct', label: 'Finance & Compliance' },
  { key: 'hr_pct', label: 'Human Resources' },
  { key: 'admin_pct', label: 'Admin' },
] as const;
export const DEFAULT_POOL_RULE: PoolRule = {
  unit: 'unit', pool_amount: 0, currency: 'LRD', creator_pct: 35, delivery_pct: 10, supervisor_pct: 5,
  operations_pct: 5, regional_pct: 6, finance_pct: 4, hr_pct: 3, admin_pct: 9,
};
export interface OrderActors {
  creatorId: string; creatorType: CreatorType; deliveredBy?: string | null; creatorSupervisorId?: string | null;
}
export interface Allocation { role: string; profileId: string | null; pct: number; amount: number }

/** Mirrors refresh_deal_allocations() in the database. */
export function allocatePool(rule: PoolRule, actors: OrderActors, units: number): Allocation[] {
  const { creatorId, creatorType, deliveredBy, creatorSupervisorId } = actors;
  const delivery = deliveredBy && deliveredBy !== creatorId ? rule.delivery_pct : 0;
  const sup = creatorType !== 'supervisor' && creatorSupervisorId && creatorSupervisorId !== creatorId
    && creatorSupervisorId !== deliveredBy ? rule.supervisor_pct : 0;
  const rows: [string, string | null, number][] = [
    ['creator', creatorId, rule.creator_pct], ['delivery', delivery ? deliveredBy! : null, delivery],
    ['supervisor', sup ? creatorSupervisorId! : null, sup], ['operations', null, rule.operations_pct],
    ['regional', null, rule.regional_pct], ['finance', null, rule.finance_pct], ['hr', null, rule.hr_pct], ['admin', null, rule.admin_pct],
  ];
  const out = rows.filter(r => r[2] > 0).map(([role, profileId, pct]) => ({ role, profileId, pct, amount: rule.pool_amount * units * pct / 100 }));
  const used = out.reduce((s, a) => s + a.pct, 0);
  out.push({ role: 'deal', profileId: null, pct: 100 - used, amount: rule.pool_amount * units * (100 - used) / 100 });
  return out;
}
/** Largest scenario total (creator + delivery + override + fixed). Must be <= 100. */
export const maxScenarioPct = (r: PoolRule) => SHARE_FIELDS.reduce((s, f) => s + Number(r[f.key] || 0), 0);
export const isValidPoolRule = (r: PoolRule) => r.pool_amount >= 0 && SHARE_FIELDS.every(f => Number(r[f.key]) >= 0) && maxScenarioPct(r) <= 100;

export const SCENARIOS: { label: string; actors: OrderActors }[] = [
  { label: 'Remote creates, vehicle delivers', actors: { creatorId: 'R', creatorType: 'remote', deliveredBy: 'V', creatorSupervisorId: 'S' } },
  { label: 'Vehicle creates & delivers own order', actors: { creatorId: 'V', creatorType: 'vehicle', deliveredBy: 'V', creatorSupervisorId: 'S' } },
  { label: 'Vehicle creates, other vehicle delivers', actors: { creatorId: 'V1', creatorType: 'vehicle', deliveredBy: 'V2', creatorSupervisorId: 'S' } },
  { label: 'Supervisor creates, vehicle delivers', actors: { creatorId: 'S', creatorType: 'supervisor', deliveredBy: 'V', creatorSupervisorId: null } },
];
