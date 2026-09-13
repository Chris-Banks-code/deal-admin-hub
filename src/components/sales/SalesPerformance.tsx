import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Percent, Wallet, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { commissionByOrder, isEarning, salesTotals } from '@/lib/sales-metrics';

interface Props {
  orders: any[];
  items: any[];
  profiles: any[];
  customerNames: Record<string, string>;
}

const curOf = (o: any) => o.currency || 'LRD';

export function SalesPerformance({ orders, items, profiles, customerNames }: Props) {
  const sold = useMemo(() => orders.filter(isEarning), [orders]);

  const currencies = useMemo(() => {
    const set = Array.from(new Set(sold.map(curOf))).sort();
    return set.length ? set : ['LRD'];
  }, [sold]);

  const [currency, setCurrency] = useState(currencies[0]);
  useEffect(() => {
    if (!currencies.includes(currency)) setCurrency(currencies[0]);
  }, [currencies, currency]);

  const rows = useMemo(() => sold.filter(o => curOf(o) === currency), [sold, currency]);

  const itemComm = useMemo(() => commissionByOrder(items), [items]);
  const totals = useMemo(() => salesTotals(orders as any, itemComm), [orders, itemComm]);
  const t = totals[currency] ?? { orders: 0, sales: 0, commission: 0, team: 0, deal: 0 };

  const revenue = t.sales;
  const commission = t.commission;
  const avg = t.orders ? revenue / t.orders : 0;

  const revenueOverTime = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(o => {
      const day = String(o.created_at).slice(0, 10);
      map.set(day, (map.get(day) || 0) + Number(o.total ?? o.subtotal ?? 0));
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({ day: day.slice(5), value }));
  }, [rows]);

  const byAgent = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; orders: number }>();
    rows.forEach(o => {
      const name = profiles.find(p => p.id === o.agent_id)?.full_name || 'Unassigned';
      const entry = map.get(o.agent_id ?? 'none') || { name, revenue: 0, orders: 0 };
      entry.revenue += Number(o.total ?? o.subtotal ?? 0);
      entry.orders += 1;
      map.set(o.agent_id ?? 'none', entry);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [rows, profiles]);

  const byProduct = useMemo(() => {
    const soldIds = new Set(rows.map(o => o.id));
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    items.filter(i => soldIds.has(i.sales_order_id)).forEach(i => {
      const entry = map.get(i.product_name) || { name: i.product_name, qty: 0, revenue: 0 };
      entry.qty += Number(i.quantity || 0);
      entry.revenue += Number(i.subtotal || 0);
      map.set(i.product_name, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [items, rows]);

  const byCustomer = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; orders: number }>();
    rows.forEach(o => {
      const key = o.customer_id ?? 'none';
      const entry = map.get(key) || { name: customerNames[key] || 'Unknown', revenue: 0, orders: 0 };
      entry.revenue += Number(o.total ?? o.subtotal ?? 0);
      entry.orders += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [rows, customerNames]);

  const kpis = [
    { label: 'Sales value', value: formatCurrency(revenue, currency), icon: DollarSign },
    { label: 'Sales', value: String(t.orders), icon: ShoppingCart },
    { label: 'Avg order value', value: formatCurrency(avg, currency), icon: TrendingUp },
    { label: 'Commission earned', value: formatCurrency(commission, currency), icon: Percent },
    { label: 'Paid to team', value: formatCurrency(t.team, currency), icon: Wallet },
    { label: 'Deal Group share', value: formatCurrency(t.deal, currency), icon: Building2 },
  ];

  return (
    <div className="space-y-4">
      {currencies.length > 1 && (
        <div className="flex gap-1">
          {currencies.map(c => (
            <Button key={c} size="sm" variant={c === currency ? 'default' : 'outline'} onClick={() => setCurrency(c)}>
              {c}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-semibold font-mono mt-1">{k.value}</p>
              </div>
              <k.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue over time ({currency})</CardTitle></CardHeader>
          <CardContent className="h-64">
            {revenueOverTime.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">No completed sales yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v), currency)} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top products</CardTitle></CardHeader>
          <CardContent className="h-64">
            {byProduct.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">No product sales yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProduct}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v), currency)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top agents</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
              <TableBody>
                {byAgent.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                {byAgent.map(a => (
                  <TableRow key={a.name}>
                    <TableCell className="text-sm">{a.name}</TableCell>
                    <TableCell className="text-sm">{a.orders}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{formatCurrency(a.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top customers</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Sales</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
              <TableBody>
                {byCustomer.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>}
                {byCustomer.map(c => (
                  <TableRow key={c.name}>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.orders}</TableCell>
                    <TableCell className="text-sm text-right font-mono">{formatCurrency(c.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
