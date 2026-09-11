import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Package, Clock, DollarSign, Users, Eye, Check, X, Plus, Box, FileText, TrendingUp, ArrowUpRight, Wallet, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';

type DateRange = 'this_month' | 'last_30' | 'last_3m' | 'this_year' | 'all';

const getDateCutoff = (range: DateRange): Date | null => {
  const now = new Date();
  if (range === 'this_month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === 'last_30') { const d = new Date(); d.setDate(d.getDate() - 30); return d; }
  if (range === 'last_3m') { const d = new Date(); d.setMonth(d.getMonth() - 3); return d; }
  if (range === 'this_year') return new Date(now.getFullYear(), 0, 1);
  return null; // all time
};

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [activeAgents, setActiveAgents] = useState(0);
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('this_month');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingDealId, setRejectingDealId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsRes, recentRes, agentsRes] = await Promise.all([
        supabase.from('deals').select('id, status, deal_value, commission_amount, agent_commission, supervisor_commission, operation_manager_commission, created_at, currency'),
        supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('profiles').select('id').eq('role', 'agent').eq('status', 'active'),
      ]);

      if (dealsRes.error) console.error('Stats fetch error:', dealsRes.error);
      if (recentRes.error) console.error('Recent deals fetch error:', recentRes.error);

      setAllDeals(dealsRes.data || []);
      setActiveAgents(agentsRes.data?.length || 0);
      setRecentDeals(recentRes.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const stats = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    const filtered = cutoff
      ? allDeals.filter(d => new Date(d.created_at) >= cutoff)
      : allDeals;

    const totalOrders = filtered.length;
    const pending = allDeals.filter(d => d.status === 'pending_admin').length;
    const completed = filtered.filter(d => d.status === 'completed');

    // Totals kept strictly separate per currency (USD vs LRD are never added together).
    // sales     = value of the goods sold (belongs to the supplier, not to Deal)
    // commission = the percentage Deal earns on those sales — the only money we share
    // team      = commission paid out to agent + supervisor + operation manager
    // deal      = what remains for Deal Group after paying the team
    const byCurrency: Record<string, { sales: number; commission: number; team: number; deal: number }> = {};
    for (const d of completed) {
      const cur = d.currency || 'USD';
      if (!byCurrency[cur]) byCurrency[cur] = { sales: 0, commission: 0, team: 0, deal: 0 };
      const team = (d.agent_commission || 0) + (d.supervisor_commission || 0) + (d.operation_manager_commission || 0);
      const commission = d.commission_amount || 0;
      byCurrency[cur].sales      += d.deal_value || 0;
      byCurrency[cur].commission += commission;
      byCurrency[cur].team       += team;
      byCurrency[cur].deal       += Math.max(commission - team, 0);
    }

    return { totalOrders, pending, byCurrency };
  }, [allDeals, dateRange]);

  // Render one line per currency so USD and LRD are shown side by side, never summed
  const currencyLines = (key: 'sales' | 'commission' | 'team' | 'deal') => {
    const entries = Object.entries(stats.byCurrency);
    if (entries.length === 0) return <span>{formatCurrency(0, 'LRD')}</span>;
    return (
      <span className="flex flex-col gap-0.5">
        {entries.map(([cur, vals]) => (
          <span key={cur} className="font-mono">{formatCurrency(vals[key], cur)}</span>
        ))}
      </span>
    );
  };


  useEffect(() => { fetchData(); }, []);
  useRealtimeRefresh(['deals', 'profiles'], fetchData, 'dashboard-page');

  const handleApprove = async (dealId: string) => {
    // Approve moves pending_admin → pending_wholesaler, not completed
    const { error } = await supabase.from('deals').update({ status: 'pending_wholesaler' }).eq('id', dealId).eq('status', 'pending_admin');
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Order approved — awaiting wholesaler' });
    setRecentDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: 'pending_wholesaler' } : d));
    setAllDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: 'pending_wholesaler' } : d));
  };

  const openReject = (dealId: string) => {
    setRejectingDealId(dealId);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (!rejectingDealId || !rejectReason.trim()) return;
    const { error } = await supabase.from('deals').update({ status: 'rejected', rejection_reason: rejectReason.trim() }).eq('id', rejectingDealId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Order rejected' });
    setShowRejectDialog(false);
    setRecentDeals(prev => prev.map(d => d.id === rejectingDealId ? { ...d, status: 'rejected' } : d));
    setAllDeals(prev => prev.map(d => d.id === rejectingDealId ? { ...d, status: 'rejected' } : d));
    setRejectingDealId(null);
  };

  const statCards: { title: string; subtitle?: string; value: any; icon: any; accent: string; badge?: boolean }[] = [
    { title: 'Total Orders', value: stats.totalOrders, icon: Package, accent: 'bg-primary/8 text-primary' },
    { title: 'Pending Approvals', value: stats.pending, icon: Clock, accent: 'bg-warning/10 text-warning', badge: true },
    { title: 'Sales Value', subtitle: 'Goods sold for suppliers', value: currencyLines('sales'), icon: DollarSign, accent: 'bg-muted text-muted-foreground' },
    { title: 'Commission Earned', subtitle: 'Our share of those sales', value: currencyLines('commission'), icon: TrendingUp, accent: 'bg-success/10 text-success' },
    { title: 'Paid To Team', subtitle: 'Agents & managers', value: currencyLines('team'), icon: Wallet, accent: 'bg-accent/10 text-accent' },
    { title: 'Deal Group Share', subtitle: 'Commission left after payouts', value: currencyLines('deal'), icon: Building2, accent: 'bg-primary/8 text-primary' },
    { title: 'Active Agents', value: activeAgents, icon: Users, accent: 'bg-success/10 text-success' },
  ];


  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome + date range */}
        <div className="flex items-center justify-between animate-in-up">
          <p className="text-sm text-muted-foreground">Here's what's happening with your platform today.</p>
          <Select value={dateRange} onValueChange={v => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-medium bg-card shadow-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_30">Last 30 Days</SelectItem>
              <SelectItem value="last_3m">Last 3 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {statCards.map((card, i) => (
            <Card key={card.title} className="shadow-card hover:shadow-premium transition-shadow duration-300 border-border/50 animate-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{card.title}</p>
                      <div className={`rounded-md p-1.5 ${card.accent}`}>
                        <card.icon className="h-3 w-3" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-1">
                      <p className="text-base font-bold tracking-tight leading-tight">{card.value}</p>
                      {card.badge && Number(card.value) > 0 && (
                        <Badge className="bg-warning/15 text-warning border-warning/20 text-[9px] font-semibold px-1 py-0">
                          Review
                        </Badge>
                      )}
                    </div>
                    {card.subtitle && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-tight">{card.subtitle}</p>
                    )}
                  </>
                )}

              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card className="shadow-card border-border/50 animate-in-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4 px-6">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Latest transactions across the platform</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium h-8" onClick={() => navigate('/orders')}>
              View All
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {loading ? (
              <div className="px-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentDeals.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No orders yet</p>
                <p className="text-xs mt-1 text-muted-foreground/70">Orders will appear here when agents start creating deals</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Deal #</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Retailer</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Date</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDeals.map(deal => (
                    <TableRow key={deal.id} className="group cursor-pointer" onClick={() => navigate('/orders')}>
                      <TableCell className="font-semibold text-sm">{deal.deal_number}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{deal.retailer_name || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(deal.deal_value, deal.currency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${getStatusColor(deal.status)}`}>
                          {getStatusLabel(deal.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(deal.created_at)}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/orders')}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {deal.status === 'pending_admin' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success hover:bg-success/10" onClick={() => handleApprove(deal.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openReject(deal.id)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions - Admin only */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in-up" style={{ animationDelay: '300ms' }}>
            {[
              { label: 'Add New User', icon: Plus, path: '/users' },
              { label: 'Add Product', icon: Box, path: '/products' },
              { label: 'Export Reports', icon: FileText, path: '/analytics' },
            ].map(action => (
              <Button
                key={action.label}
                variant="outline"
                className="h-12 justify-start gap-3 border-border/50 hover:border-accent/30 hover:bg-accent/5 text-sm font-medium transition-all duration-200"
                onClick={() => navigate(action.path)}
              >
                <div className="rounded-md p-1.5 bg-muted">
                  <action.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      {/* Reject reason dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>Please provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Dashboard;
