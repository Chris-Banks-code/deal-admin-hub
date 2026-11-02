import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { financeTotals, periodWindow, currentWeekValue, inWindow, type PeriodMode } from '@/lib/finance';
import { PeriodPicker } from '@/components/PeriodPicker';
import { CurrencyTabs } from '@/components/finance/CurrencyTabs';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { ExpensesTab } from '@/components/finance/ExpensesTab';
import { PaymentsTab } from '@/components/finance/PaymentsTab';
import { PayoutsTab } from '@/components/finance/PayoutsTab';
import { JournalTab } from '@/components/finance/JournalTab';
import { AccountsTab } from '@/components/finance/AccountsTab';
import { StatementsTab } from '@/components/finance/StatementsTab';
import { TaxTab } from '@/components/finance/TaxTab';

const FinancePage = () => {
  const d = useFinanceData();
  useRealtimeRefresh(['deals', 'sales_orders', 'expenses', 'payments', 'commission_payouts'], d.refresh, 'finance-page');

  const [mode, setMode] = useState<PeriodMode>('overall');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [week, setWeek] = useState(currentWeekValue());

  // Everything time-sensitive is narrowed to the chosen period
  const p = useMemo(() => {
    const win = periodWindow(mode, month, week);
    return {
      orders: inWindow(d.orders, win, 'created_at'),
      deals: inWindow(d.deals, win, 'created_at'),
      salesOrders: inWindow(d.salesOrders, win, 'created_at'),
      expenses: inWindow(d.expenses, win, 'expense_date', 'created_at'),
      payments: inWindow(d.payments, win, 'payment_date', 'created_at'),
      payouts: inWindow(d.payouts, win, 'paid_at', 'created_at'),
      entries: inWindow(d.entries, win, 'entry_date', 'created_at'),
    };
  }, [d.orders, d.deals, d.salesOrders, d.expenses, d.payments, d.payouts, d.entries, mode, month, week]);

  const allTotals = useMemo(() => financeTotals({
    orders: p.orders, items: d.items, expenses: p.expenses, payments: p.payments, payouts: p.payouts,
  }), [p, d.items]);

  const currencies = useMemo(() => Object.keys(allTotals).sort(), [allTotals]);
  const [currency, setCurrency] = useState('LRD');
  useEffect(() => {
    if (!currencies.includes(currency)) setCurrency(currencies[0] ?? 'LRD');
  }, [currencies, currency]);
  const totals = allTotals[currency] ?? allTotals[currencies[0]];

  return (
    <DashboardLayout title="Finance">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Commission income, team payouts, expenses, payments and statements — LRD and USD kept separate.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker mode={mode} month={month} week={week} onMode={setMode} onMonth={setMonth} onWeek={setWeek} />
            <CurrencyTabs currencies={currencies} value={currency} onChange={setCurrency} />
          </div>
        </div>

        {d.loading ? <Skeleton className="h-96 w-full" /> : (
          <Tabs defaultValue="overview">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payouts">Commission payouts</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="statements">Statements</TabsTrigger>
              <TabsTrigger value="journal">Journal</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="tax">Tax</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <FinanceOverview currency={currency} orders={p.orders} items={d.items} expenses={p.expenses}
                payments={p.payments} payouts={p.payouts} banks={d.banks} />
            </TabsContent>
            <TabsContent value="payouts" className="mt-4">
              <PayoutsTab currency={currency} deals={p.deals} salesOrders={p.salesOrders} profiles={d.profiles}
                payouts={p.payouts} banks={d.banks} onChanged={d.refresh} />
            </TabsContent>
            <TabsContent value="expenses" className="mt-4">
              <ExpensesTab currency={currency} expenses={p.expenses} banks={d.banks} onChanged={d.refresh} />
            </TabsContent>
            <TabsContent value="payments" className="mt-4">
              <PaymentsTab currency={currency} payments={p.payments} clients={d.clients} banks={d.banks}
                receivable={totals.receivable} onChanged={d.refresh} />
            </TabsContent>
            <TabsContent value="statements" className="mt-4">
              <StatementsTab currency={currency} totals={totals} expenses={p.expenses} banks={d.banks} />
            </TabsContent>
            <TabsContent value="journal" className="mt-4">
              <JournalTab currency={currency} entries={p.entries} lines={d.lines} accounts={d.accounts} onChanged={d.refresh} />
            </TabsContent>
            <TabsContent value="accounts" className="mt-4">
              <AccountsTab accounts={d.accounts} banks={d.banks} onChanged={d.refresh} />
            </TabsContent>
            <TabsContent value="tax" className="mt-4">
              <TaxTab currency={currency} taxRates={d.taxRates} totals={totals} onChanged={d.refresh} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinancePage;
