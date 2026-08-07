/**
 * Multi-tier commission split.
 *
 * Each line item earns a commission = subtotal * (commission_rate / 100).
 * That pot is then split between the agent, their supervisor and the
 * operation manager using the shares below.
 */
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

export const splitCommission = (total: number): CommissionSplit => ({
  total,
  agent: total * COMMISSION_SPLIT.agent,
  supervisor: total * COMMISSION_SPLIT.supervisor,
  operation_manager: total * COMMISSION_SPLIT.operation_manager,
});

export const lineCommission = (subtotal: number, rate: number | null | undefined) =>
  subtotal * ((rate ?? 0) / 100);
