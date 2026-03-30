import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Clock, DollarSign, Users, Eye, Check, X, Trash2, Plus, Box, FileText } from 'lucide-react';
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

  useEffect(() => {
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
        setRecentDeals(deals.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
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
    { title: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'text-primary' },
    { title: 'Pending Approvals', value: stats.pending, icon: Clock, color: 'text-warning', badge: true },
    { title: 'Total Revenue', value: formatCurrency(stats.revenue), icon: DollarSign, color: 'text-success' },
    { title: 'Active Agents', value: stats.activeAgents, icon: Users, color: 'text-accent' },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => (
            <Card key={card.title} className="relative overflow-hidden">
              <CardContent className="p-5">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className={`rounded-lg p-2.5 bg-muted ${card.color}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>View All</Button>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {loading ? (
              <div className="px-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentDeals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No orders yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal #</TableHead>
                    <TableHead className="hidden md:table-cell">Retailer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDeals.map(deal => (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium text-sm">{deal.deal_number}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{deal.retailer_name || '—'}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(deal.deal_value)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(deal.status)}`}>
                          {getStatusLabel(deal.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(deal.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/orders')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(deal.status === 'pending_admin' || deal.status === 'pending') && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success" onClick={() => handleApprove(deal.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleReject(deal.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button variant="outline" className="h-12 justify-start gap-3" onClick={() => navigate('/users')}>
              <Plus className="h-4 w-4" /> Add New User
            </Button>
            <Button variant="outline" className="h-12 justify-start gap-3" onClick={() => navigate('/products')}>
              <Box className="h-4 w-4" /> Add Product
            </Button>
            <Button variant="outline" className="h-12 justify-start gap-3" onClick={() => navigate('/analytics')}>
              <FileText className="h-4 w-4" /> Export Reports
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
