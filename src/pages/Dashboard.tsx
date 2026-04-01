import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Clock, DollarSign, Users, Eye, Check, X, Plus, Box, FileText, TrendingUp, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, pending: 0, revenue: 0, activeAgents: 0 });
  const [recentDeals, setRecentDeals] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsRes, agentsRes] = await Promise.all([
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id').eq('role', 'agent').eq('status', 'active'),
      ]);

      const deals = dealsRes.data || [];
      const totalOrders = deals.length;
      const pending = deals.filter(d => d.status === 'pending_admin' || d.status === 'pending').length;
      const revenue = deals.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.deal_value || 0), 0);
      const activeAgents = agentsRes.data?.length || 0;

      setStats({ totalOrders, pending, revenue, activeAgents });
      setRecentDeals(deals.slice(0, 6));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('dashboard-deals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApprove = async (dealId: string) => {
    const { error } = await supabase.from('deals').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', dealId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Order approved' });
    setRecentDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: 'completed' } : d));
    setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
  };

  const handleReject = async (dealId: string) => {
    const { error } = await supabase.from('deals').update({ status: 'rejected', rejection_reason: 'Rejected from dashboard' }).eq('id', dealId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Order rejected' });
    setRecentDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: 'rejected' } : d));
    setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
  };

  const statCards = [
    { title: 'Total Orders', value: stats.totalOrders, icon: Package, accent: 'bg-primary/8 text-primary', trend: '+12%' },
    { title: 'Pending Approvals', value: stats.pending, icon: Clock, accent: 'bg-warning/10 text-warning', trend: null, badge: true },
    { title: 'Total Revenue', value: formatCurrency(stats.revenue), icon: DollarSign, accent: 'bg-success/10 text-success', trend: '+8.3%' },
    { title: 'Active Agents', value: stats.activeAgents, icon: Users, accent: 'bg-accent/10 text-accent', trend: '+2' },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome */}
        <div className="animate-in-up">
          <p className="text-sm text-muted-foreground">Here's what's happening with your platform today.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <Card key={card.title} className="shadow-card hover:shadow-premium transition-shadow duration-300 border-border/50 animate-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <CardContent className="p-5">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.title}</p>
                      <div className={`rounded-lg p-2 ${card.accent}`}>
                        <card.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                      {card.trend && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
                          <TrendingUp className="h-3 w-3" />
                          {card.trend}
                        </span>
                      )}
                      {card.badge && Number(card.value) > 0 && (
                        <Badge className="bg-warning/15 text-warning border-warning/20 text-[10px] font-semibold">
                          Needs review
                        </Badge>
                      )}
                    </div>
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
                      <TableCell className="text-sm font-medium">{formatCurrency(deal.deal_value)}</TableCell>
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
                          {(deal.status === 'pending_admin' || deal.status === 'pending') && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success hover:bg-success/10" onClick={() => handleApprove(deal.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleReject(deal.id)}>
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
    </DashboardLayout>
  );
};

export default Dashboard;
