import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Package, Clock, DollarSign, Users, Eye, Check, X, Plus, Box, FileText, TrendingUp, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, pending: 0, revenue: 0, activeAgents: 0 });
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingDealId, setRejectingDealId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealsRes, recentRes, agentsRes] = await Promise.all([
        supabase.from('deals').select('id, status, deal_value'),
        supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('profiles').select('id').eq('role', 'agent').eq('status', 'active'),
      ]);

      const deals = dealsRes.data || [];
      const totalOrders = deals.length;
      const pending = deals.filter(d => d.status === 'pending_admin' || d.status === 'pending').length;
      const revenue = deals.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.deal_value || 0), 0);
      const activeAgents = agentsRes.data?.length || 0;

      setStats({ totalOrders, pending, revenue, activeAgents });
      setRecentDeals(recentRes.data || []);
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
    setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
    setRejectingDealId(null);
  };

  const statCards = [
    { title: 'Total Orders', value: stats.totalOrders, icon: Package, gradient: 'from-blue-500/10 to-purple-500/10', borderHover: 'hover:border-primary/50', trend: '+12%' },
    { title: 'Pending Approvals', value: stats.pending, icon: Clock, gradient: 'from-orange-500/10 to-yellow-500/10', borderHover: 'hover:border-warning/50', trend: null, badge: true },
    { title: 'Total Revenue', value: formatCurrency(stats.revenue), icon: DollarSign, gradient: 'from-green-500/10 to-emerald-500/10', borderHover: 'hover:border-success/50', trend: '+8.3%' },
    { title: 'Active Agents', value: stats.activeAgents, icon: Users, gradient: 'from-purple-500/10 to-pink-500/10', borderHover: 'hover:border-accent/50', trend: '+2' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <DashboardLayout title="Dashboard">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Welcome */}
        <motion.div variants={item}>
          <p className="text-sm text-muted-foreground">Here's what's happening with your platform today.</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <motion.div key={card.title} variants={item}>
              <Card className={`group relative overflow-hidden glass-card-hover ${card.borderHover} transition-all duration-300`}>
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="p-5 relative z-10">
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-24 bg-white/[0.06]" />
                      <Skeleton className="h-8 w-20 bg-white/[0.06]" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                        <div className="rounded-xl p-2 bg-white/[0.06]">
                          <card.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-semibold tracking-tight font-mono-num">{card.value}</p>
                        {card.trend && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
                            <TrendingUp className="h-3 w-3" />
                            {card.trend}
                          </span>
                        )}
                        {card.badge && Number(card.value) > 0 && (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] font-medium glow-warning">
                            Needs review
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Orders */}
        <motion.div variants={item}>
          <Card className="glass-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 px-6">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Latest transactions across the platform</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium h-8 text-muted-foreground hover:text-foreground hover:bg-white/[0.08]" onClick={() => navigate('/orders')}>
                View All
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {loading ? (
                <div className="px-6 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/[0.04]" />)}
                </div>
              ) : recentDeals.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-sm">No orders yet</p>
                  <p className="text-xs mt-1 text-muted-foreground">Orders will appear here when agents start creating deals</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/[0.06]">
                      <TableHead className="text-xs font-medium text-muted-foreground">Deal #</TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground">Retailer</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-medium text-muted-foreground">Date</TableHead>
                      <TableHead className="text-right text-xs font-medium text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDeals.map(deal => (
                      <TableRow key={deal.id} className="group cursor-pointer border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-150" onClick={() => navigate('/orders')}>
                        <TableCell className="font-medium text-sm font-mono-num">{deal.deal_number}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{deal.retailer_name || '—'}</TableCell>
                        <TableCell className="text-sm font-medium font-mono-num">{formatCurrency(deal.deal_value)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-medium ${getStatusColor(deal.status)}`}>
                            {getStatusLabel(deal.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatDate(deal.created_at)}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/[0.08]" onClick={() => navigate('/orders')}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {(deal.status === 'pending_admin' || deal.status === 'pending') && (
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
        </motion.div>

        {/* Quick Actions - Admin only */}
        {isAdmin && (
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Add New User', icon: Plus, path: '/users' },
              { label: 'Add Product', icon: Box, path: '/products' },
              { label: 'Export Reports', icon: FileText, path: '/analytics' },
            ].map(action => (
              <Button
                key={action.label}
                variant="ghost"
                className="h-12 justify-start gap-3 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] text-sm font-medium transition-all duration-200 rounded-xl"
                onClick={() => navigate(action.path)}
              >
                <div className="rounded-lg p-1.5 bg-white/[0.06]">
                  <action.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {action.label}
              </Button>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Reject reason dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-card/95 glass border-white/10">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>Please provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={3} className="bg-white/[0.05] border-white/[0.08]" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)} className="hover:bg-white/[0.08]">Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Dashboard;
