import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Phone, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, getInitials, getRoleBadgeColor, getRoleLabel } from '@/lib/formatters';
import { buildOrders, earningsByPerson, num } from '@/lib/finance';
import type { AgentProfile } from './AgentModal';

interface Props {
  agent: AgentProfile | null;
  supervisorName?: string | null;
  onOpenChange: (open: boolean) => void;
}

interface CurrencyRow {
  currency: string;
  orders: number;
  sales: number;
  earned: number;
  bonuses: number;
  paid: number;
  owed: number;
}

interface Data {
  customers: any[];
  orders: any[];
  byCurrency: CurrencyRow[];
}

const emptyData: Data = { customers: [], orders: [], byCurrency: [] };

const CURRENCY_ORDER: Record<string, number> = { LRD: 0, USD: 1 };

export function AgentDetailSheet({ agent, supervisorName, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Data>(emptyData);

  useEffect(() => {
    if (!agent) { setData(emptyData); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [custRes, dealRes, soRes, poRes, bonRes] = await Promise.all([
        supabase.from('clients')
          .select('id, company_name, contact_person, retailer_tier, verification_status, created_at, phone, address')
          .eq('client_type', 'retailer')
          .eq('assigned_agent_id', agent.id)
          .order('created_at', { ascending: false }),
        supabase.from('deals')
          .select('id, status, currency, created_at, deal_value, commission_amount, commission_rate, agent_commission, supervisor_commission, operation_manager_commission')
          .eq('agent_id', agent.id),
        supabase.from('sales_orders')
          .select('id, order_number, status, currency, subtotal, total, delivery_date, created_at, agent_commission_total, supervisor_commission_total, manager_commission_total')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false }),
        supabase.from('commission_payouts')
          .select('amount, currency, status')
          .eq('profile_id', agent.id),
        supabase.from('commission_bonuses')
          .select('amount, currency, status')
          .eq('profile_id', agent.id),
      ]);

      if (cancelled) return;
      const deals = dealRes.data || [];
      const salesOrders = soRes.data || [];
      const payouts = poRes.data || [];
      const bonuses = bonRes.data || [];
      const orders = buildOrders(deals, salesOrders);

      const map: Record<string, CurrencyRow> = {};
      const bucket = (currency: string) =>
        (map[currency] ||= { currency, orders: 0, sales: 0, earned: 0, bonuses: 0, paid: 0, owed: 0 });

      orders.forEach(o => {
        const b = bucket(o.currency || 'LRD');
        b.orders += 1;
        b.sales += o.total;
      });

      earningsByPerson(deals, salesOrders)
        .filter(e => e.profile_id === agent.id)
        .forEach(e => { bucket(e.currency).earned += e.earned; });

      [...payouts, ...bonuses].forEach(r => {
        const amount = num(r.amount);
        if (r.status === 'paid') bucket(r.currency || 'LRD').paid += amount;
        else if (r.status !== 'cancelled' && (r.currency || 'LRD')) {
          // bonuses that have not been cancelled are part of what is owed
          if ((r as any).title !== undefined) bucket(r.currency || 'LRD').bonuses += amount;
        }
      });

      Object.values(map).forEach(b => { b.owed = Math.max(b.earned + b.bonuses - b.paid, 0); });

      setData({
        customers: custRes.data || [],
        orders,
        byCurrency: Object.values(map).sort(
          (a, b) => (CURRENCY_ORDER[a.currency] ?? 9) - (CURRENCY_ORDER[b.currency] ?? 9),
        ),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [agent]);

  const stat = (label: string, value: string) => (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold font-mono tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );

  const emptyState = (msg: string) => (
    <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
      {msg}
    </div>
  );

  const earningsTable = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Currency</TableHead>
          <TableHead className="text-right">Sales</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          <TableHead className="text-right">Bonuses</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.byCurrency.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
              No sales recorded for this person yet.
            </TableCell>
          </TableRow>
        )}
        {data.byCurrency.map(r => (
          <TableRow key={r.currency}>
            <TableCell className="text-sm font-medium">{r.currency}</TableCell>
            <TableCell className="text-right font-mono text-sm">{formatCurrency(r.sales, r.currency)}</TableCell>
            <TableCell className="text-right font-mono text-sm">{formatCurrency(r.earned, r.currency)}</TableCell>
            <TableCell className="text-right font-mono text-sm">{formatCurrency(r.bonuses, r.currency)}</TableCell>
            <TableCell className="text-right font-mono text-sm text-success">{formatCurrency(r.paid, r.currency)}</TableCell>
            <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(r.owed, r.currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Sheet open={!!agent} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {agent && (
          <>
            <SheetHeader className="space-y-0 text-left">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">{getInitials(agent.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-lg">{agent.full_name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(agent.role || '')}`}>
                      {getRoleLabel(agent.role || '')}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${agent.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}`}>
                      {agent.status === 'active' ? 'Active' : 'Suspended'}
                    </Badge>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" /> {agent.email || '—'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {agent.phone || '—'}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserCog className="h-4 w-4" /> Supervisor: {supervisorName || '—'}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {stat('Customers', String(data.customers.length))}
              {stat('Sales', String(data.orders.length))}
            </div>

            <Tabs defaultValue="earnings" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="earnings" className="mt-4">
                {loading ? <Skeleton className="h-24 w-full" /> : earningsTable}
              </TabsContent>

              <TabsContent value="customers" className="mt-4 space-y-2">
                {loading ? <Skeleton className="h-24 w-full" />
                  : data.customers.length === 0 ? emptyState('No customers assigned to this agent yet.')
                  : data.customers.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <div>
                        <p className="text-sm font-medium">{c.company_name || c.contact_person || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">{c.phone || c.address || '—'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{c.retailer_tier || c.verification_status}</Badge>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="orders" className="mt-4 space-y-2">
                {loading ? <Skeleton className="h-24 w-full" />
                  : data.orders.length === 0 ? emptyState('No sales recorded for this agent yet.')
                  : data.orders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <div>
                        <p className="text-sm font-medium font-mono">{o.order_number || String(o.id).slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono tabular-nums">{formatCurrency(o.total, o.currency)}</p>
                        <Badge variant="outline" className="text-xs mt-1">{o.status}</Badge>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
