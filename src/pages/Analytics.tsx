import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, Users, Trophy } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Area, AreaChart,
} from 'recharts';
import { motion } from 'framer-motion';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [dealsRes, profilesRes] = await Promise.all([
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);
      setDeals(dealsRes.data || []);
      setProfiles(profilesRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filteredDeals = useMemo(() => {
    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return deals.filter(d => new Date(d.created_at) >= cutoff);
  }, [deals, dateRange]);

  const completedDeals = filteredDeals.filter(d => d.status === 'completed');
  const totalRevenue = completedDeals.reduce((s, d) => s + (d.deal_value || 0), 0);
  const avgOrderValue = completedDeals.length ? totalRevenue / completedDeals.length : 0;
  const agents = profiles.filter(p => p.role === 'agent' && p.status === 'active');

  const revenueOverTime = useMemo(() => {
    const map = new Map<string, number>();
    completedDeals.forEach(d => {
      const isoDay = d.created_at.slice(0, 10);
      map.set(isoDay, (map.get(isoDay) || 0) + (d.deal_value || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([isoDay, revenue]) => ({
        date: new Date(isoDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
      }));
  }, [completedDeals]);

  const ordersByStatus = useMemo(() => {
    const pending = filteredDeals.filter(d => d.status === 'pending' || d.status === 'pending_admin').length;
    const completed = filteredDeals.filter(d => d.status === 'completed').length;
    const rejected = filteredDeals.filter(d => d.status === 'rejected').length;
    return [
      { name: 'Pending', value: pending, color: '#F59E0B' },
      { name: 'Completed', value: completed, color: '#10B981' },
      { name: 'Rejected', value: rejected, color: '#EF4444' },
    ];
  }, [filteredDeals]);

  const topAgents = useMemo(() => {
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const map = new Map<string, { name: string; revenue: number; orders: number; commission: number }>();
    completedDeals.forEach(d => {
      if (!d.agent_id) return;
      const name = profileMap.get(d.agent_id)?.full_name || 'Unknown';
      const current = map.get(d.agent_id) || { name, revenue: 0, orders: 0, commission: 0 };
      current.revenue += d.deal_value || 0;
      current.orders += 1;
      current.commission += d.agent_commission || 0;
      map.set(d.agent_id, current);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [completedDeals, profiles]);

  const metricCards = [
    { title: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, trend: '+12.5%', up: true, gradient: 'from-green-500/10 to-emerald-500/10', borderHover: 'hover:border-success/50' },
    { title: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: ShoppingCart, trend: '+3.2%', up: true, gradient: 'from-blue-500/10 to-cyan-500/10', borderHover: 'hover:border-primary/50' },
    { title: 'Total Orders', value: filteredDeals.length, icon: BarChart3, trend: '+8.1%', up: true, gradient: 'from-purple-500/10 to-pink-500/10', borderHover: 'hover:border-accent/50' },
    { title: 'Active Agents', value: agents.length, icon: Users, trend: '', up: true, gradient: 'from-orange-500/10 to-yellow-500/10', borderHover: 'hover:border-warning/50' },
  ];

  const chartTooltipStyle = {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(17,17,19,0.95)',
    backdropFilter: 'blur(24px)',
    fontSize: '12px',
    color: '#FAFAFA',
  };

  return (
    <DashboardLayout title="Analytics">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Performance overview and agent insights.</p>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-medium bg-white/[0.05] border-white/[0.08] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card/95 glass border-white/10">
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
              <Card className={`group relative overflow-hidden glass-card-hover ${card.borderHover}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="p-5 relative z-10">
                  {loading ? (
                    <Skeleton className="h-20 w-full bg-white/[0.04]" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                        <div className="rounded-xl p-2 bg-white/[0.06]"><card.icon className="h-4 w-4 text-muted-foreground" /></div>
                      </div>
                      <p className="text-2xl font-semibold tracking-tight font-mono-num">{card.value}</p>
                      {card.trend && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {card.up ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                          <span className={`text-xs font-medium ${card.up ? 'text-success' : 'text-destructive'}`}>{card.trend}</span>
                          <span className="text-xs text-muted-foreground">vs last period</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue Over Time</CardTitle>
              <p className="text-xs text-muted-foreground">Completed deal revenue trend</p>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-72 w-full bg-white/[0.04]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueOverTime}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" fontSize={11} tick={{ fill: '#71717A' }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} tick={{ fill: '#71717A' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#revenueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Order Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">By current status</p>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-72 w-full bg-white/[0.04]" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      dataKey="value"
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      style={{ fontSize: '11px', fill: '#A1A1AA' }}
                    >
                      {ordersByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#A1A1AA' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Agents Bar Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Top Performing Agents</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Revenue generated by each agent</p>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-72 w-full bg-white/[0.04]" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topAgents} barSize={32}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} tick={{ fill: '#71717A' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agent Leaderboard */}
        <Card className="glass-card overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Agent Leaderboard</CardTitle>
            <p className="text-xs text-muted-foreground">Detailed performance metrics</p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/[0.04]" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/[0.06]">
                    <TableHead className="w-12 text-xs font-medium text-muted-foreground">#</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Agent Name</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Orders</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Revenue</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Avg Order</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAgents.map((agent, i) => (
                    <TableRow key={i} className="border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-150">
                      <TableCell>
                        {i < 3 ? (
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? 'bg-gradient-primary text-white shadow-glow-blue' : i === 1 ? 'bg-white/[0.1] text-muted-foreground' : 'bg-warning/10 text-warning'
                          }`}>
                            {i + 1}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground pl-1.5 font-mono-num">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{agent.name}</TableCell>
                      <TableCell className="text-sm font-mono-num">{agent.orders}</TableCell>
                      <TableCell className="text-sm font-medium font-mono-num">{formatCurrency(agent.revenue)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono-num">{formatCurrency(agent.orders ? agent.revenue / agent.orders : 0)}</TableCell>
                      <TableCell className="text-sm font-medium text-primary font-mono-num">{formatCurrency(agent.commission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default Analytics;
