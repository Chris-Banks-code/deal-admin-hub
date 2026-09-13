import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, CheckCircle2, XCircle, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { NewSaleDialog } from '@/components/sales/NewSaleDialog';
import { InvoiceDialog } from '@/components/sales/InvoiceDialog';
import { SalesPerformance } from '@/components/sales/SalesPerformance';
import TargetsPage from '@/pages/Targets';
import { normalizeDeal, normalizeSalesOrder } from '@/lib/sales-metrics';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  fulfilled: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};


const SalesPage = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    const [ordersRes, itemsRes, dealsRes, dealItemsRes, profilesRes, customersRes] = await Promise.all([
      (supabase.from as any)('sales_orders').select('*').order('created_at', { ascending: false }),
      (supabase.from as any)('sales_order_items').select('*'),
      supabase.from('deals').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*'),
      supabase.from('profiles').select('id, full_name, role'),
      supabase.from('clients').select('id, company_name').eq('client_type', 'retailer'),
    ]);

    const mappedDeals = (dealsRes.data || []).map(normalizeDeal);

    const mappedOrders = (ordersRes.data || []).map(normalizeSalesOrder);

    const mappedDealItems = (dealItemsRes.data || []).map((i: any) => ({ ...i, sales_order_id: i.deal_id }));

    setOrders([...mappedOrders, ...mappedDeals].sort(
      (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    ));
    setItems([...(itemsRes.data || []), ...mappedDealItems]);
    setProfiles(profilesRes.data || []);
    const names: Record<string, string> = {};
    (customersRes.data || []).forEach((c: any) => {
      names[c.id] = c.company_name || 'Unnamed';
    });
    setCustomerNames(names);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeRefresh(['sales_orders', 'sales_order_items', 'deals', 'order_items'], fetchData, 'sales-page');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      const agent = profiles.find(p => p.id === o.agent_id)?.full_name ?? '';
      return [o.order_number, customerNames[o.customer_id] ?? '', agent]
        .join(' ').toLowerCase().includes(q);
    });
  }, [orders, search, statusFilter, profiles, customerNames]);

  const setStatus = async (order: any, status: string) => {
    let error: any = null;
    if (order.source === 'deal') {
      const dealStatus = ({ approved: 'confirmed', fulfilled: 'delivered', cancelled: 'rejected' } as Record<string, string>)[status];
      if (!dealStatus) return;
      const patch: any = { status: dealStatus };
      if (dealStatus === 'delivered') patch.delivered_at = new Date().toISOString();
      ({ error } = await supabase.from('deals').update(patch).eq('id', order.id));
    } else {
      const patch: any = { status };
      if (status === 'approved') {
        patch.approved_by = profile?.id ?? null;
        patch.approved_at = new Date().toISOString();
      }
      ({ error } = await (supabase.from as any)('sales_orders').update(patch).eq('id', order.id));
    }
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Sale ${status.replace('_', ' ')}`, description: order.order_number });
    fetchData();
  };

  return (
    <DashboardLayout title="Sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Create sales, track performance and manage monthly targets.
          </p>
          <Button className="gap-2" onClick={() => setNewSaleOpen(true)}>
            <Plus className="h-4 w-4" /> New Sale
          </Button>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Sales Orders</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <SalesPerformance orders={orders} items={items} profiles={profiles} customerNames={customerNames} />
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-4 space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search order, customer or agent…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && [...Array(4)].map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                    ))}
                    {!loading && filtered.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No sales found. Click “New Sale” to create one.
                      </TableCell></TableRow>
                    )}
                    {!loading && filtered.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="text-sm">{customerNames[o.customer_id] || '—'}</TableCell>
                        <TableCell className="text-sm">{profiles.find(p => p.id === o.agent_id)?.full_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize ${STATUS_STYLES[o.status] ?? ''}`}>
                            {String(o.status).replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(o.total ?? o.subtotal, o.currency || 'LRD')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(o.status === 'draft' || o.status === 'pending_approval') && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success"
                                title="Approve" onClick={() => setStatus(o, 'approved')}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {o.status === 'approved' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500"
                                title="Mark fulfilled" onClick={() => setStatus(o, 'fulfilled')}>
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            {o.status !== 'cancelled' && o.status !== 'fulfilled' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                title="Cancel" onClick={() => setStatus(o, 'cancelled')}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              title="Invoice" onClick={() => setInvoiceOrder(o)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="targets" className="mt-4">
            <TargetsPage embedded />
          </TabsContent>
        </Tabs>
      </div>

      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} onCreated={fetchData} />
      <InvoiceDialog order={invoiceOrder} onOpenChange={o => { if (!o) setInvoiceOrder(null); }} />
    </DashboardLayout>
  );
};

export default SalesPage;
