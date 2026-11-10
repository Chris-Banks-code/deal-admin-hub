import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Percent } from 'lucide-react';
import { PeriodPicker } from '@/components/PeriodPicker';
import { CurrencyTabs } from '@/components/finance/CurrencyTabs';
import { useCommissionData } from '@/hooks/useCommissionData';
import { formatCurrency } from '@/lib/formatters';
import { currentWeekValue, inWindow, periodWindow, type PeriodMode } from '@/lib/finance';
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

const MONTH_LABEL = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  const names = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[mo - 1] ?? mo} ${y}`;
};

export default function Commissions() {
  const {
    loading, orders, deals, salesOrders, items, profiles, payouts, bonuses, banks, products, rules, refresh,
  } = useCommissionData();

  const [tab, setTab] = useState('overview');
  const [mode, setMode] = useState<PeriodMode>('overall');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [week, setWeek] = useState(currentWeekValue());
  const [currency, setCurrency] = useState('LRD');
  const [draft, setDraft] = useState<PayoutDraft | null>(null);

  // Everything time-sensitive is narrowed to the chosen period
  const p = useMemo(() => {
    const win = periodWindow(mode, month, week);
    return {
      orders: inWindow(orders, win, 'created_at'),
      deals: inWindow(deals, win, 'created_at'),
      salesOrders: inWindow(salesOrders, win, 'created_at'),
      payouts: inWindow(payouts, win, 'paid_at', 'created_at'),
      bonuses: inWindow(bonuses, win, 'created_at'),
    };
  }, [orders, deals, salesOrders, payouts, bonuses, mode, month, week]);

  // Only the currencies actually present in this period are offered
  const currencies = useMemo(() => {
    const set = new Set<string>();
    [...p.orders, ...p.payouts, ...p.bonuses].forEach((r: any) => set.add(r.currency || 'LRD'));
    return Array.from(set).sort();
  }, [p]);

  useEffect(() => {
    if (currencies.length && !currencies.includes(currency)) setCurrency(currencies[0]);
  }, [currencies, currency]);

  const pot = useMemo(() => commissionPot(p.orders, items, currency), [p.orders, items, currency]);

  const periodLabel = mode === 'month'
    ? MONTH_LABEL(month)
    : mode === 'week'
      ? `Week of ${week.split('-W')[0]}`
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
          <PeriodPicker mode={mode} month={month} week={week} onMode={setMode} onMonth={setMonth} onWeek={setWeek} />
          <CurrencyTabs currencies={currencies.length ? currencies : ['LRD']} value={currency} onChange={setCurrency} />
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
            orders={p.orders}
            items={items}
            deals={p.deals}
            salesOrders={p.salesOrders}
            payouts={p.payouts}
            bonuses={p.bonuses}
            profiles={profiles}
          />
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          <WalletTab
            currency={currency}
            deals={p.deals}
            salesOrders={p.salesOrders}
            payouts={p.payouts}
            bonuses={p.bonuses}
            profiles={profiles}
            onPay={setDraft}
          />
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <PayoutsTab
            currency={currency}
            deals={p.deals}
            salesOrders={p.salesOrders}
            payouts={p.payouts}
            bonuses={p.bonuses}
            profiles={profiles}
            onChanged={refresh}
            onPay={setDraft}
          />
        </TabsContent>

        <TabsContent value="bonuses" className="mt-4">
          <BonusesTab
            currency={currency}
            bonuses={p.bonuses}
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
