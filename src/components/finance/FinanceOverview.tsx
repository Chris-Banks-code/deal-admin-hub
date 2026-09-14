import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Wallet, Percent, Users, Receipt, TrendingUp, Banknote, FileClock, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { StatCard } from './StatCard';
import {
  financeTotals, monthKey, monthLabel, num, type FinanceTotals,
} from '@/lib/finance';
import { commissionByOrder, isEarning, orderCommission, teamPayout } from '@/lib/sales-metrics';

interface Props {
  currency: string;
  orders: any[];
  items: any[];
  expenses: any[];
  payments: any[];
  payouts: any[];
  banks: any[];
}

export function FinanceOverview({ currency, orders, items, expenses, payments, payouts, banks }: Props) {
  const totals: FinanceTotals = useMemo(
    () => financeTotals({ orders, items, expenses, payments, payouts })[currency]
      ?? financeTotals({ orders: [], items: [], expenses: [], payments: [], payouts: [] }).LRD,
    [orders, items, expenses, payments, payouts, currency],
  );

  const cashPosition = useMemo(() => {
    const opening = banks
      .filter(b => (b.currency || 'LRD') === currency && b.is_active !== false)
      .reduce((s, b) => s + num(b.opening_balance), 0);
    return opening + totals.cashIn - totals.cashOut;
  }, [banks, currency, totals]);

  const monthly = useMemo(() => {
    const itemComm = commissionByOrder(items);
    const map = new Map<string, { month: string; income: number; payouts: number; expenses: number }>();
    const get = (k: string) => {
      const e = map.get(k) || { month: k, income: 0, payouts: 0, expenses: 0 };
      map.set(k, e);
      return e;
    };
    orders.filter(isEarning).filter(o => (o.currency || 'LRD') === currency).forEach(o => {
      const e = get(monthKey(o.created_at));
      e.income += orderCommission(o, itemComm);
      e.payouts += teamPayout(o);
    });
    expenses.filter(x => (x.currency || 'LRD') === currency && x.status !== 'rejected' && x.status !== 'draft')
      .forEach(x => { get(monthKey(x.expense_date || x.created_at)).expenses += num(x.amount); });
    return Array.from(map.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map(e => ({ ...e, label: monthLabel(e.month), profit: e.income - e.payouts - e.expenses }));
  }, [orders, items, expenses, currency]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.filter(x => (x.currency || 'LRD') === currency && x.status !== 'rejected' && x.status !== 'draft')
      .forEach(x => map.set(x.category || 'Other', (map.get(x.category || 'Other') || 0) + num(x.amount)));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [expenses, currency]);

  const fc = (v: number) => formatCurrency(v, currency);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Percent} label="Commission income" value={fc(totals.commissionIncome)}
          hint="Our percentage on completed sales" />
        <StatCard icon={Users} label="Paid to team" value={fc(totals.teamPayouts)} tone="warning"
          hint="Agents, supervisors and managers" />
        <StatCard icon={TrendingUp} label="Gross profit" value={fc(totals.grossProfit)}
          hint="Commission after team payouts" />
        <StatCard icon={Receipt} label="Operating expenses" value={fc(totals.expenses)} tone="destructive"
          hint="Recorded business costs" />
        <StatCard icon={PiggyBank} label="Net profit" value={fc(totals.netProfit)}
          tone={totals.netProfit >= 0 ? 'success' : 'destructive'}
          hint="Gross profit less expenses" />
        <StatCard icon={Banknote} label="Cash position" value={fc(cashPosition)}
          hint="Opening balances plus money in, less money out" />
        <StatCard icon={FileClock} label="Commission receivable" value={fc(totals.receivable)} tone="warning"
          hint="Earned but not yet collected" />
        <StatCard icon={Wallet} label="Sales value handled" value={fc(totals.salesValue)}
          hint="Supplier goods sold — not Deal Group money" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Income, payouts & expenses</CardTitle></CardHeader>
          <CardContent className="h-72">
            {monthly.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: any) => fc(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="income" name="Commission" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                  <Area type="monotone" dataKey="payouts" name="Team payouts" stroke="hsl(var(--warning))" fill="hsl(var(--warning)/0.15)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive)/0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Expenses by category</CardTitle></CardHeader>
          <CardContent className="h-72">
            {expenseByCategory.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No expenses recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fc(Number(v))} />
                  <Bar dataKey="value" name="Spent" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
