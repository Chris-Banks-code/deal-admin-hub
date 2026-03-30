import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, BarChart3, Users } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';

const COLORS = ['#C6A561', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b'];

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

  // Revenue over time
  const revenueOverTime = useMemo(() => {
    const map = new Map<string, number>();
    completedDeals.forEach(d => {
      const date = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map.set(date, (map.get(date) || 0) + (d.deal_value || 0));
    });
    return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
  }, [completedDeals]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const pending = filteredDeals.filter(d => d.status === 'pending' || d.status === 'pending_admin').length;
    const completed = filteredDeals.filter(d => d.status === 'completed').length;
    const rejected = filteredDeals.filter(d => d.status === 'rejected').length;
    return [
      { name: 'Pending', value: pending, color: '#f59e0b' },
      { name: 'Completed', value: completed, color: '#22c55e' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
    ];
  }, [filteredDeals]);

  // Top agents
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
    { title: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, trend: '+12.5%', up: true },
    { title: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: ShoppingCart, trend: '+3.2%', up: true },
    { title: 'Total Orders', value: filteredDeals.length, icon: BarChart3, trend: '+8.1%', up: true },
    { title: 'Active Agents', value: agents.length, icon: Users, trend: '', up: true },
  ];

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {/* Date Range */}
        <div className="flex justify-end">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
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
          {metricCards.map(card => (
            <Card key={card.title}>
              <CardContent className="p-5">
                {loading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                      {card.trend && (
                        <div className="flex items-center gap-1 mt-1">
                          {card.up ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                          <span className={`text-xs ${card.up ? 'text-success' : 'text-destructive'}`}>{card.trend}</span>
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg p-2.5 bg-muted">
                      <card.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Over Time */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue Over Time</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="revenue" stroke="#C6A561" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Orders by Status */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Orders by Status</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {ordersByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Agents */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Performing Agents</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64 w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topAgents}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#1B2838" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance Table */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Agent Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Agent Name</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg Order</TableHead>
                    <TableHead>Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topAgents.map((agent, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.orders}</TableCell>
                      <TableCell>{formatCurrency(agent.revenue)}</TableCell>
                      <TableCell>{formatCurrency(agent.orders ? agent.revenue / agent.orders : 0)}</TableCell>
                      <TableCell>{formatCurrency(agent.commission)}</TableCell>
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
