import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { num, type FinanceTotals } from '@/lib/finance';

interface Props {
  currency: string;
  totals: FinanceTotals;
  expenses: any[];
  banks: any[];
}

const Row = ({ label, value, bold, indent, tone }: { label: string; value: string; bold?: boolean; indent?: boolean; tone?: string }) => (
  <div className={`flex justify-between py-1.5 text-sm ${bold ? 'border-t border-border pt-2 font-semibold' : ''}`}>
    <span className={indent ? 'pl-4 text-muted-foreground' : ''}>{label}</span>
    <span className={`font-mono ${tone ?? ''}`}>{value}</span>
  </div>
);

export function StatementsTab({ currency, totals, expenses, banks }: Props) {
  const fc = (v: number) => formatCurrency(v, currency);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.filter(e => (e.currency || 'LRD') === currency && e.status !== 'rejected' && e.status !== 'draft')
      .forEach(e => map.set(e.category || 'Other', (map.get(e.category || 'Other') || 0) + num(e.amount)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses, currency]);

  const opening = banks.filter(b => (b.currency || 'LRD') === currency)
    .reduce((s, b) => s + num(b.opening_balance), 0);
  const cash = opening + totals.cashIn - totals.cashOut;
  const payoutsOwed = Math.max(totals.teamPayouts - totals.payoutsPaid, 0);
  const assets = cash + totals.receivable;
  const liabilities = payoutsOwed;
  const equity = assets - liabilities;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Profit & loss</CardTitle></CardHeader>
        <CardContent>
          <Row label="Commission income" value={fc(totals.commissionIncome)} />
          <Row label="Less: team commissions" value={`(${fc(totals.teamPayouts)})`} indent />
          <Row label="Gross profit" value={fc(totals.grossProfit)} bold />
          <p className="pt-3 text-xs font-medium uppercase text-muted-foreground">Operating expenses</p>
          {byCategory.length === 0 && <Row label="None recorded" value={fc(0)} indent />}
          {byCategory.map(([k, v]) => <Row key={k} label={k} value={fc(v)} indent />)}
          <Row label="Total expenses" value={`(${fc(totals.expenses)})`} bold />
          <Row label="Net profit" value={fc(totals.netProfit)} bold
            tone={totals.netProfit >= 0 ? 'text-success' : 'text-destructive'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Balance sheet</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs font-medium uppercase text-muted-foreground">Assets</p>
          <Row label="Bank & cash" value={fc(cash)} indent />
          <Row label="Commission receivable" value={fc(totals.receivable)} indent />
          <Row label="Total assets" value={fc(assets)} bold />
          <p className="pt-3 text-xs font-medium uppercase text-muted-foreground">Liabilities</p>
          <Row label="Commissions owed to team" value={fc(payoutsOwed)} indent />
          <Row label="Total liabilities" value={fc(liabilities)} bold />
          <Row label="Equity" value={fc(equity)} bold />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Cash flow</CardTitle></CardHeader>
        <CardContent>
          <Row label="Opening balances" value={fc(opening)} />
          <Row label="Money received" value={fc(totals.cashIn)} indent tone="text-success" />
          <Row label="Money paid out" value={`(${fc(totals.cashOut)})`} indent tone="text-destructive" />
          <Row label="Net cash movement" value={fc(totals.cashIn - totals.cashOut)} bold />
          <Row label="Closing cash" value={fc(cash)} bold />
          <p className="pt-3 text-xs text-muted-foreground">
            Figures come from recorded payments. Record money in and out to keep this accurate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
