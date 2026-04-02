import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Target, Users, TrendingUp, Trophy, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { motion } from 'framer-motion';

interface AgentRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  target_id?: string;
  target_amount?: number;
  notes?: string;
  earnings: number;
}

interface TargetForm {
  agent_id: string;
  target_amount: string;
  notes: string;
}

const emptyForm: TargetForm = { agent_id: '', target_amount: '', notes: '' };

const toMonthLabel = (ym: string) => {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const currentYM = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const offsetMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthBounds = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const start = new Date(y, m - 1, 1).toISOString();
  const end = new Date(y, m, 1).toISOString();
  return { start, end };
};

const getStatus = (earnings: number, target?: number): 'surpassed' | 'reached' | 'below' | 'none' => {
  if (!target) return 'none';
  if (earnings >= target * 1.0 && earnings > target) return 'surpassed';
  if (earnings >= target) return 'reached';
  return 'below';
};

const StatusBadge = ({ earnings, target }: { earnings: number; target?: number }) => {
  const status = getStatus(earnings, target);
  const map = {
    surpassed: { label: '🏆 Surpassed', cls: 'bg-primary/10 text-primary border-primary/20 glow-blue' },
    reached:   { label: '🟢 Reached',   cls: 'bg-success/10 text-success border-success/20 glow-success' },
    below:     { label: '🔴 Below',      cls: 'bg-destructive/10 text-destructive border-destructive/20 glow-error' },
    none:      { label: '⚪ No Target',  cls: 'bg-white/[0.05] text-muted-foreground border-white/[0.08]' },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={`text-xs font-medium ${cls}`}>{label}</Badge>;
};

const TargetsPage = () => {
  const { profile, isAdmin, isOperationManager } = useAuth();
  const { toast } = useToast();
  const canEdit = isAdmin || isOperationManager;

  const [month, setMonth] = useState(currentYM());
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'progress' | 'status'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRow | null>(null);
  const [form, setForm] = useState<TargetForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [deletingAgent, setDeletingAgent] = useState<AgentRow | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = monthBounds(month);

    // Use explicit typing with supabase queries
    const [agentsRes, targetsRes, earningsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role').in('role', ['agent', 'supervisor']).eq('status', 'active').order('full_name'),
      supabase.from('monthly_targets' as any).select('*').eq('month', month),
      supabase.from('deals').select('agent_id, agent_commission').eq('status', 'completed').gte('created_at', start).lt('created_at', end),
    ]);

    if (agentsRes.error) console.error(agentsRes.error);

    const targetMap = new Map((targetsRes.data || []).map((t: any) => [t.agent_id, t]));
    const earningsMap = new Map<string, number>();
    (earningsRes.data || []).forEach((d: any) => {
      earningsMap.set(d.agent_id, (earningsMap.get(d.agent_id) || 0) + (d.agent_commission || 0));
    });

    const rows: AgentRow[] = (agentsRes.data || []).map((a: any) => {
      const t = targetMap.get(a.id) as any;
      return {
        id: a.id, full_name: a.full_name, email: a.email, role: a.role,
        target_id: t?.id, target_amount: t?.target_amount, notes: t?.notes,
        earnings: earningsMap.get(a.id) || 0,
      };
    });

    setAgents(rows);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month]);

  const stats = useMemo(() => {
    const withTarget = agents.filter(a => a.target_amount);
    const withoutTarget = agents.filter(a => !a.target_amount);
    const reached = withTarget.filter(a => getStatus(a.earnings, a.target_amount) !== 'below');
    const below = withTarget.filter(a => getStatus(a.earnings, a.target_amount) === 'below');
    return { withTarget: withTarget.length, withoutTarget: withoutTarget.length, reached: reached.length, below: below.length };
  }, [agents]);

  const filtered = useMemo(() => {
    let rows = agents.filter(a =>
      !search || a.full_name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
    );
    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.full_name.localeCompare(b.full_name);
      if (sortKey === 'progress') {
        const pa = a.target_amount ? (a.earnings / a.target_amount) : -1;
        const pb = b.target_amount ? (b.earnings / b.target_amount) : -1;
        cmp = pa - pb;
      }
      if (sortKey === 'status') {
        const order = { surpassed: 0, reached: 1, below: 2, none: 3 };
        cmp = order[getStatus(a.earnings, a.target_amount)] - order[getStatus(b.earnings, b.target_amount)];
      }
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [agents, search, sortKey, sortAsc]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(true); }
  };

  const openSet = (agent: AgentRow) => {
    setEditingAgent(agent);
    setForm({ agent_id: agent.id, target_amount: agent.target_amount ? String(agent.target_amount) : '', notes: agent.notes || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    const amount = Number(form.target_amount);
    if (!amount || amount <= 0) {
      toast({ title: 'Validation', description: 'Target amount must be greater than 0', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from('monthly_targets' as any) as any).upsert({
      agent_id: form.agent_id, target_amount: amount, month, set_by: profile?.id, notes: form.notes.trim() || null,
    }, { onConflict: 'agent_id,month' });

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
    toast({ title: 'Target saved' });
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const handleBulkSave = async () => {
    const amount = Number(bulkAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Validation', description: 'Target amount must be greater than 0', variant: 'destructive' });
      return;
    }
    setBulkSaving(true);

    const targets = agents
      .filter(a => a.role === 'agent')
      .filter(a => bulkOverwrite || !a.target_amount)
      .map(a => ({ agent_id: a.id, target_amount: amount, month, set_by: profile?.id, notes: bulkNotes.trim() || null }));

    if (targets.length === 0) {
      toast({ title: 'No agents to update', description: 'All agents already have a target. Enable "Overwrite existing" to replace them.' });
      setBulkSaving(false);
      return;
    }

    const { error } = await (supabase.from('monthly_targets' as any) as any).upsert(targets, { onConflict: 'agent_id,month' });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setBulkSaving(false); return; }
    toast({ title: `Targets set for ${targets.length} agent(s)` });
    setBulkSaving(false);
    setShowBulk(false);
    setBulkAmount('');
    setBulkNotes('');
    fetchData();
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;
    const { error } = await (supabase.from('monthly_targets' as any) as any).delete().eq('agent_id', deletingAgent.id).eq('month', month);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setDeletingAgent(null); return; }
    toast({ title: 'Target removed' });
    setDeletingAgent(null);
    fetchData();
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? <span className="ml-1 text-[10px]">{sortAsc ? '↑' : '↓'}</span> : null;

  return (
    <DashboardLayout title="Monthly Targets">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
        {/* Month navigator */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/[0.08] rounded-xl" onClick={() => setMonth(m => offsetMonth(m, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold w-36 text-center">{toMonthLabel(month)}</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/[0.08] rounded-xl" onClick={() => setMonth(m => offsetMonth(m, 1))} disabled={month >= currentYM()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {month !== currentYM() && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:bg-white/[0.08] rounded-lg" onClick={() => setMonth(currentYM())}>Today</Button>
            )}
          </div>
          {canEdit && (
            <Button onClick={() => { setBulkAmount(''); setBulkNotes(''); setBulkOverwrite(false); setShowBulk(true); }} variant="ghost" className="gap-2 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] rounded-xl">
              <Users className="h-4 w-4" /> Set for All Agents
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Targets Set', value: stats.withTarget, icon: Target, gradient: 'from-blue-500/10 to-purple-500/10' },
            { label: 'No Target', value: stats.withoutTarget, icon: Users, gradient: 'from-white/[0.02] to-white/[0.04]' },
            { label: 'On Track', value: stats.reached, icon: TrendingUp, gradient: 'from-green-500/10 to-emerald-500/10' },
            { label: 'Below Target', value: stats.below, icon: Trophy, gradient: 'from-red-500/10 to-orange-500/10' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
              <Card className="glass-card-hover group relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <CardContent className="p-5 relative z-10">
                  {loading ? <Skeleton className="h-14 w-full bg-white/[0.04]" /> : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                        <div className="rounded-xl p-2 bg-white/[0.06]"><s.icon className="h-4 w-4 text-muted-foreground" /></div>
                      </div>
                      <p className="text-2xl font-semibold tracking-tight font-mono-num">{s.value}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-3 px-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-sm font-semibold">Agent Targets — {toMonthLabel(month)}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search agents..." className="pl-9 h-8 text-sm bg-white/[0.05] border-white/[0.08] rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/[0.04]" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">No agents found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/[0.06]">
                    <TableHead className="cursor-pointer select-none text-xs font-medium text-muted-foreground" onClick={() => toggleSort('name')}>
                      Agent <SortIcon k="name" />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-medium text-muted-foreground">Role</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Target</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground">Earnings</TableHead>
                    <TableHead className="hidden lg:table-cell cursor-pointer select-none text-xs font-medium text-muted-foreground" onClick={() => toggleSort('progress')}>
                      Progress <SortIcon k="progress" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-xs font-medium text-muted-foreground" onClick={() => toggleSort('status')}>
                      Status <SortIcon k="status" />
                    </TableHead>
                    {canEdit && <TableHead className="text-right text-xs font-medium text-muted-foreground">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(agent => {
                    const pct = agent.target_amount ? Math.min((agent.earnings / agent.target_amount) * 100, 100) : 0;
                    return (
                      <TableRow key={agent.id} className="border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-150">
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{agent.full_name}</p>
                            <p className="text-xs text-muted-foreground">{agent.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs capitalize bg-white/[0.05] border-white/[0.08]">{agent.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium font-mono-num">
                          {agent.target_amount ? formatCurrency(agent.target_amount) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm font-mono-num">
                          {formatCurrency(agent.earnings)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell w-40">
                          {agent.target_amount ? (
                            <div className="space-y-1">
                              <Progress value={pct} className="h-1.5" />
                              <p className="text-xs text-muted-foreground font-mono-num">{formatPercent(pct)}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge earnings={agent.earnings} target={agent.target_amount} />
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/[0.08]" onClick={() => openSet(agent)}>
                                {agent.target_amount ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                              </Button>
                              {agent.target_amount && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeletingAgent(agent)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Set / Edit Target Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card/95 glass border-white/10">
          <DialogHeader>
            <DialogTitle>{editingAgent?.target_amount ? 'Edit Target' : 'Set Target'}</DialogTitle>
            <DialogDescription>{editingAgent?.full_name} — {toMonthLabel(month)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Amount (USD) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="e.g. 5000" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} className="bg-white/[0.05] border-white/[0.08] rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground font-normal">(visible to agent on mobile)</span></Label>
              <Textarea placeholder="e.g. Focus on wholesaler visits this month..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="bg-white/[0.05] border-white/[0.08] rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)} className="hover:bg-white/[0.08]">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary hover:opacity-90 rounded-lg">{saving ? 'Saving...' : 'Save Target'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Set Modal */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="bg-card/95 glass border-white/10">
          <DialogHeader>
            <DialogTitle>Set Target for All Agents</DialogTitle>
            <DialogDescription>Apply the same target to all active agents for {toMonthLabel(month)}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Amount (USD) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="e.g. 5000" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} className="bg-white/[0.05] border-white/[0.08] rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground font-normal">(visible to agents on mobile)</span></Label>
              <Textarea placeholder="e.g. Monthly target for April..." value={bulkNotes} onChange={e => setBulkNotes(e.target.value)} rows={2} className="bg-white/[0.05] border-white/[0.08] rounded-xl" />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <input type="checkbox" id="overwrite" checked={bulkOverwrite} onChange={e => setBulkOverwrite(e.target.checked)} className="h-4 w-4 rounded" />
              <div>
                <Label htmlFor="overwrite" className="cursor-pointer text-sm">Overwrite existing targets</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bulkOverwrite
                    ? `Will update all ${agents.filter(a => a.role === 'agent').length} active agents`
                    : `Will only set targets for ${agents.filter(a => a.role === 'agent' && !a.target_amount).length} agents without a target`}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBulk(false)} className="hover:bg-white/[0.08]">Cancel</Button>
            <Button onClick={handleBulkSave} disabled={bulkSaving} className="bg-gradient-primary hover:opacity-90 rounded-lg">{bulkSaving ? 'Saving...' : 'Set Targets'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingAgent} onOpenChange={open => { if (!open) setDeletingAgent(null); }}>
        <AlertDialogContent className="bg-card/95 glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Target</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the {toMonthLabel(month)} target for <strong>{deletingAgent?.full_name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-white/[0.08]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TargetsPage;
