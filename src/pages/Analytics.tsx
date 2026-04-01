import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, Users, Trophy } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, Area, AreaChart,
} from 'recharts';

const COLORS = ['hsl(39 45% 58%)', 'hsl(160 84% 39%)', 'hsl(0 84% 60%)', 'hsl(210 35% 16%)', 'hsl(270 50% 60%)', 'hsl(38 92% 50%)'];

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
      const date = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map.set(date, (map.get(date) || 0) + (d.deal_value || 0));
    });
    return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
  }, [completedDeals]);

  const ordersByStatus = useMemo(() => {
    const pending = filteredDeals.filter(d => d.status === 'pending' || d.status === 'pending_admin').length;
    const completed = filteredDeals.filter(d => d.status === 'completed').length;
    const rejected = filteredDeals.filter(d => d.status === 'rejected').length;
    return [
      { name: 'Pending', value: pending, color: 'hsl(38 92% 50%)' },
      { name: 'Completed', value: completed, color: 'hsl(160 84% 39%)' },
      { name: 'Rejected', value: rejected, color: 'hsl(0 84% 60%)' },
    ];
  }, [filteredDeals]);

  const topAgents = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; orders: number; commission: number }>();
    completedDeals.forEach(d => {
      const agent = profiles.find(p => p.id === d.agent_id);
      const name = agent?.full_name || 'Unknown';
      const current = map.get(d.agent_id) || { name, revenue: 0, orders: 0, commission: 0 };
      current.revenue += d.deal_value || 0;
      current.orders += 1;
      current.commission += d.agent_commission || 0;
      map.set(d.agent_id, current);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [completedDeals, profiles]);

  const metricCards = [
    { title: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, trend: '+12.5%', up: true, accent: 'bg-success/10 text-success' },
    { title: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: ShoppingCart, trend: '+3.2%', up: true, accent: 'bg-accent/10 text-accent' },
    { title: 'Total Orders', value: filteredDeals.length, icon: BarChart3, trend: '+8.1%', up: true, accent: 'bg-primary/8 text-primary' },
    { title: 'Active Agents', value: agents.length, icon: Users, trend: '', up: true, accent: 'bg-accent/10 text-accent' },
  ];

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {/* Header with date range */}
        <div className="flex items-center justify-between animate-in-up">
          <p className="text-sm text-muted-foreground">Performance overview and agent insights.</p>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-medium bg-card shadow-card border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            <Card key={card.title} className="shadow-card border-border/50 animate-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <CardContent className="p-5">
                {loading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.title}</p>
                      <div className={`rounded-lg p-2 ${card.accent}`}>
                        <card.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                    {card.trend && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {card.up ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                        <span className={`text-xs font-medium ${card.up ? 'text-success' : 'text-destructive'}`}>{card.trend}</span>
                        <span className="text-xs text-muted-foreground/60">vs last period</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Over Time - wider */}
          <Card className="lg:col-span-2 shadow-card border-border/50 animate-in-up" style={{ animationDelay: '200ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Revenue Over Time</CardTitle>
              <p className="text-xs text-muted-foreground">Completed deal revenue trend</p>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-72 w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueOverTime}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(39 45% 58%)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(39 45% 58%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)',
                        fontSize: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(39 45% 58%)" strokeWidth={2} fill="url(#revenueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Orders by Status - donut */}
          <Card className="shadow-card border-border/50 animate-in-up" style={{ animationDelay: '260ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Order Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">By current status</p>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-72 w-full" /> : (
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
                      style={{ fontSize: '11px' }}
                    >
                      {ordersByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Agents Bar Chart */}
        <Card className="shadow-card border-border/50 animate-in-up" style={{ animationDelay: '320ms' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm font-semibold">Top Performing Agents</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Revenue generated by each agent</p>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-72 w-full" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topAgents} barSize={32}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(210 35% 16%)" />
                      <stop offset="100%" stopColor="hsl(210 30% 28%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }}
                  />
                  <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agent Performance Table */}
        <Card className="shadow-card border-border/50 animate-in-up" style={{ animationDelay: '380ms' }}>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Agent Leaderboard</CardTitle>
            <p className="text-xs text-muted-foreground">Detailed performance metrics for each agent</p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">#</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Agent Name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Orders</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Revenue</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Avg Order</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAgents.map((agent, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {i < 3 ? (
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? 'bg-accent/15 text-accent' : i === 1 ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning'
                          }`}>
                            {i + 1}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground pl-1.5">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{agent.name}</TableCell>
                      <TableCell className="text-sm">{agent.orders}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(agent.revenue)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatCurrency(agent.orders ? agent.revenue / agent.orders : 0)}</TableCell>
                      <TableCell className="text-sm font-medium text-accent">{formatCurrency(agent.commission)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
