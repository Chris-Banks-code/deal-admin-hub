import { useMemo, useState } from 'react';
import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Percent } from 'lucide-react';
import { PeriodPicker } from '@/components/PeriodPicker';
import { CurrencyTabs } from '@/components/finance/CurrencyTabs';
import { useCommissionData } from '@/hooks/useCommissionData';
import { formatCurrency } from '@/lib/formatters';
import { periodWindow } from '@/lib/finance';
import { commissionPot } from '@/lib/commissions';
import { CommissionOverview } from '@/components/commission/CommissionOverview';
import { WalletTab } from '@/components/commission/WalletTab';
import { PayoutsTab } from '@/components/commission/PayoutsTab';
import { BonusesTab } from '@/components/commission/BonusesTab';
import { RulesTab } from '@/components/commission/RulesTab';
import { PayoutDialog, type PayoutDraft } from '@/components/commission/PayoutDialog';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'bonuses', label: 'Bonuses' },
  { key: 'rules', label: 'Rules' },
];

const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function Commissions() {
  const {
    loading, orders, deals, salesOrders, items, profiles, payouts, bonuses, banks, products, rules, refresh,
  } = useCommissionData();

  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('all');
  const [currency, setCurrency] = useState('LRD');
  const [draft, setDraft] = useState<PayoutDraft | null>(null);

  const { start, end } = useMemo(() => {
    const now = new Date();
    if (period === 'month') return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === 'week') return { start: startOfWeek(now), end: endOfWeek(now) };
    return { start: subDays(now, 3650), end: now };
  }, [period]);

  const inWindow = (d: any) => {
    if (!d) return true;
    const t = new Date(d).getTime();
    return t >= start.getTime() && t <= end.getTime();
  };

  const scoped = useMemo(() => ({
    orders: orders.filter(o => inWindow(o.created_at)),
    deals: deals.filter(d => inWindow(d.created_at)),
    salesOrders: salesOrders.filter(s => inWindow(s.created_at)),
    payouts: payouts.filter(p => inWindow(p.created_at)),
    bonuses: bonuses.filter(b => inWindow(b.created_at)),
  }), [orders, deals, salesOrders, payouts, bonuses, start, end]);

  const pot = useMemo(() => commissionPot(scoped.orders, items, currency), [scoped.orders, items, currency]);

  const periodLabel = period === 'month'
    ? MONTH_LABEL(start)
    : period === 'week'
      ? `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : 'All time';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-card">
            <Percent className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Commissions</h1>
            <p className="text-sm text-muted-foreground">
              Commission earned on sales, what the team is owed, and the rules it is measured against.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          <CurrencyTabs value={currency} onChange={setCurrency} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Commission pot — {currency}</CardTitle>
          <CardDescription>
            {periodLabel}. What Deal Group earned on goods sold in this period; the split below is paid to the team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-3xl font-semibold">{formatCurrency(pot, currency)}</p>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          {TABS.map(t => <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <CommissionOverview
            currency={currency}
            orders={scoped.orders}
            items={items}
            deals={scoped.deals}
            salesOrders={scoped.salesOrders}
            payouts={scoped.payouts}
            bonuses={scoped.bonuses}
            profiles={profiles}
          />
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          <WalletTab
            currency={currency}
            deals={scoped.deals}
            salesOrders={scoped.salesOrders}
            payouts={scoped.payouts}
            bonuses={scoped.bonuses}
            profiles={profiles}
            onPay={setDraft}
          />
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <PayoutsTab
            currency={currency}
            deals={scoped.deals}
            salesOrders={scoped.salesOrders}
            payouts={scoped.payouts}
            bonuses={scoped.bonuses}
            profiles={profiles}
            onChanged={refresh}
            onPay={setDraft}
          />
        </TabsContent>

        <TabsContent value="bonuses" className="mt-4">
          <BonusesTab
            currency={currency}
            bonuses={scoped.bonuses}
            profiles={profiles}
            onChanged={refresh}
          />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <RulesTab rules={rules} products={products} onChanged={refresh} />
        </TabsContent>
      </Tabs>

      <PayoutDialog
        draft={draft}
        profiles={profiles}
        banks={banks}
        onClose={() => setDraft(null)}
        onSaved={refresh}
      />

      {loading && (
        <p className="text-sm text-muted-foreground">Loading commission records…</p>
      )}
    </div>
  );
}
