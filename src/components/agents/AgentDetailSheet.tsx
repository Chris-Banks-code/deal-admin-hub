import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, getInitials, getRoleBadgeColor, getRoleLabel } from '@/lib/formatters';
import type { AgentProfile } from './AgentModal';

interface Props {
  agent: AgentProfile | null;
  supervisorName?: string | null;
  onOpenChange: (open: boolean) => void;
}

interface Data {
  customers: any[];
  orders: any[];
  commissionTotal: number;
  commissionPaid: number;
  orderTotal: number;
}

const emptyData: Data = { customers: [], orders: [], commissionTotal: 0, commissionPaid: 0, orderTotal: 0 };

export function AgentDetailSheet({ agent, supervisorName, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Data>(emptyData);

  useEffect(() => {
    if (!agent) { setData(emptyData); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [custRes, orderRes, commRes] = await Promise.all([
        supabase.from('customers')
          .select('id, retailer_tier, verification_status, created_at, parties(legal_name, display_name, phone, address)')
          .eq('assigned_agent_id', agent.id)
          .order('created_at', { ascending: false }),
        supabase.from('sales_orders')
          .select('id, order_number, status, total, delivery_date, created_at')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(25),
        supabase.from('commissions')
          .select('amount, status')
          .eq('profile_id', agent.id),
      ]);

      if (cancelled) return;
      const orders = orderRes.data || [];
      const comms = commRes.data || [];
      setData({
        customers: custRes.data || [],
        orders,
        orderTotal: orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0),
        commissionTotal: comms.reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
        commissionPaid: comms.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + Number(c.amount || 0), 0),
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
              {stat('Orders', String(data.orders.length))}
              {stat('Order Value', formatCurrency(data.orderTotal))}
              {stat('Commission Earned', formatCurrency(data.commissionTotal))}
            </div>

            <Tabs defaultValue="customers" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="customers">Customers</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="commissions">Commissions</TabsTrigger>
              </TabsList>

              <TabsContent value="customers" className="mt-4 space-y-2">
                {loading ? <Skeleton className="h-24 w-full" />
                  : data.customers.length === 0 ? emptyState('No customers assigned to this agent yet.')
                  : data.customers.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <div>
                        <p className="text-sm font-medium">{c.parties?.display_name || c.parties?.legal_name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground">{c.parties?.phone || c.parties?.address || '—'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{c.retailer_tier || c.verification_status}</Badge>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="orders" className="mt-4 space-y-2">
                {loading ? <Skeleton className="h-24 w-full" />
                  : data.orders.length === 0 ? emptyState('No sales orders recorded for this agent yet.')
                  : data.orders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <div>
                        <p className="text-sm font-medium font-mono">{o.order_number || o.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono tabular-nums">{formatCurrency(Number(o.total || 0))}</p>
                        <Badge variant="outline" className="text-xs mt-1">{o.status}</Badge>
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="commissions" className="mt-4">
                {loading ? <Skeleton className="h-24 w-full" />
                  : data.commissionTotal === 0 ? emptyState('No commissions recorded yet.')
                  : (
                    <div className="grid grid-cols-2 gap-3">
                      {stat('Total Earned', formatCurrency(data.commissionTotal))}
                      {stat('Paid Out', formatCurrency(data.commissionPaid))}
                      {stat('Outstanding', formatCurrency(data.commissionTotal - data.commissionPaid))}
                    </div>
                  )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
