import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HandCoins, Wallet, Clock, Gift, TrendingUp, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { num } from '@/lib/finance';
import {
  buildWallet,
  commissionByMonth,
  commissionPot,
  isOwedStatus,
  roleSplitTotals,
} from '@/lib/commissions';
import { StatCard } from '@/components/finance/StatCard';
import type { NormalizedOrder } from '@/lib/sales-metrics';

const MONTH_LABEL = (m: string) => {
  const [y, mo] = m.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(mo) - 1] ?? mo} ${y}`;
};

interface Props {
  currency: string;
  orders: NormalizedOrder[];
  items: any[];
  deals: any[];
  salesOrders: any[];
  payouts: any[];
  bonuses: any[];
  profiles: any[];
}

/** The commission position in one currency: pot, splits, payouts and what is left. */
export function CommissionOverview({
  currency, orders, items, deals, salesOrders, payouts, bonuses, profiles,
}: Props) {
  const name = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const pot = useMemo(() => commissionPot(orders, items, currency), [orders, items, currency]);
  const split = useMemo(() => roleSplitTotals(orders, currency), [orders, currency]);
  const months = useMemo(() => commissionByMonth(orders, items, currency), [orders, items, currency]);
  const wallet = useMemo(
    () => buildWallet({ deals, salesOrders, payouts, bonuses, currency }),
    [deals, salesOrders, payouts, bonuses, currency],
  );

  const team = split.agent + split.supervisor + split.operation_manager;
  const paid = payouts
    .filter(p => (p.currency || 'LRD') === currency && p.status === 'paid')
    .reduce((s, p) => s + num(p.amount), 0);
  const owed = wallet.reduce((s, r) => s + r.owed, 0);
  const bonusOwed = bonuses
    .filter(b => (b.currency || 'LRD') === currency && isOwedStatus(b.status))
    .reduce((s, b) => s + num(b.amount), 0);
  const dealShare = Math.max(pot - team, 0);

  const byMonth = months.map(m => ({ ...m, label: MONTH_LABEL(m.month) }));
  const byRole = [
    { role: 'Agent', amount: split.agent },
    { role: 'Supervisor', amount: split.supervisor },
    { role: 'Ops Manager', amount: split.operation_manager },
    { role: 'Deal Group', amount: dealShare },
  ];
  const top = wallet.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={HandCoins} label="Commission earned" value={formatCurrency(pot, currency)}
          hint="Deal Group's cut of the goods sold" />
        <StatCard icon={Wallet} label="Paid to team" value={formatCurrency(paid, currency)} tone="success" />
        <StatCard icon={Clock} label="Owed to team" value={formatCurrency(owed, currency)} tone="warning" />
        <StatCard icon={Gift} label="Bonuses owed" value={formatCurrency(bonusOwed, currency)} tone="warning" />
        <StatCard icon={Building2} label="Deal Group share" value={formatCurrency(dealShare, currency)} />
        <StatCard icon={TrendingUp} label="Team share of pot"
          value={pot > 0 ? `${Math.round((team / pot) * 100)}%` : '0%'}
          hint={`${formatCurrency(team, currency)} to the three roles`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Commission by month — {currency}</CardTitle>
            <CardDescription>The whole pot against what the team is owed on those sales.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {byMonth.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No commission earned in {currency} yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={byMonth}>
                    <defs>
                      <linearGradient id="pot" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v), currency)} />
                    <Area type="monotone" dataKey="commission" name="Commission pot"
                      stroke="hsl(var(--primary))" fill="url(#pot)" strokeWidth={2} />
                    <Area type="monotone" dataKey="team" name="Owed to team"
                      stroke="hsl(var(--warning))" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Who the pot goes to</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRole} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="role" fontSize={11} width={80} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v), currency)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Biggest balances still owed — {currency}</CardTitle>
          <CardDescription>Commission and bonuses not yet paid out.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {top.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nobody is owed anything in {currency}.</p>
          )}
          {top.map(r => (
            <div key={r.profile_id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{name(r.profile_id)}</span>
                {r.roles.map(x => <Badge key={x} variant="outline" className="text-[10px] capitalize">{x}</Badge>)}
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold">{formatCurrency(r.owed, currency)}</span>
                <span className="ml-2 text-xs text-muted-foreground">of {formatCurrency(r.accrued, currency)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
