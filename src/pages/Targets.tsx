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
import { ChevronLeft, ChevronRight, Target, Users, TrendingUp, Trophy, Plus, Edit2, Trash2, Search, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { formatCurrency, formatPercent } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  target_id?: string;
  target_amount?: number;
  onboarding_target?: number;
  notes?: string;
  earnings: number;
  retailers_onboarded: number;
}

interface TargetForm {
  agent_id: string;
  target_amount: string;
  onboarding_target: string;
  notes: string;
}

const emptyForm: TargetForm = { agent_id: '', target_amount: '', onboarding_target: '', notes: '' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getOnboardingStatus = (count: number, target?: number): 'surpassed' | 'reached' | 'below' | 'none' => {
  if (!target) return 'none';
  if (count > target) return 'surpassed';
  if (count >= target) return 'reached';
  return 'below';
};

const StatusBadge = ({ earnings, target }: { earnings: number; target?: number }) => {
  const status = getStatus(earnings, target);
  const map = {
    surpassed: { label: '🏆 Surpassed', cls: 'bg-accent/15 text-accent border-accent/30' },
    reached:   { label: '🟢 Reached',   cls: 'bg-success/10 text-success border-success/20' },
    below:     { label: '🔴 Below',      cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    none:      { label: '⚪ No Target',  cls: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={`text-xs font-medium ${cls}`}>{label}</Badge>;
};

const OnboardingBadge = ({ count, target }: { count: number; target?: number }) => {
  const status = getOnboardingStatus(count, target);
  const map = {
    surpassed: { label: '🏆 Surpassed', cls: 'bg-accent/15 text-accent border-accent/30' },
    reached:   { label: '🟢 Reached',   cls: 'bg-success/10 text-success border-success/20' },
    below:     { label: '🔴 Below',      cls: 'bg-destructive/10 text-destructive border-destructive/20' },
    none:      { label: '⚪ No Target',  cls: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, cls } = map[status];
  return <Badge variant="outline" className={`text-xs font-medium ${cls}`}>{label}</Badge>;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Set/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRow | null>(null);
  const [form, setForm] = useState<TargetForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Bulk modal
  const [showBulk, setShowBulk] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkOnboarding, setBulkOnboarding] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkOverwrite, setBulkOverwrite] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Delete confirm
  const [deletingAgent, setDeletingAgent] = useState<AgentRow | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = monthBounds(month);

    const [agentsRes, targetsRes, earningsRes, retailersRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role').in('role', ['agent', 'supervisor']).eq('status', 'active').order('full_name'),
      supabase.from('monthly_targets').select('*').eq('month', month),
      supabase.from('deals').select('agent_id, agent_commission').eq('status', 'completed').gte('created_at', start).lt('created_at', end),
      supabase.from('clients').select('assigned_agent_id').gte('created_at', start).lt('created_at', end),
    ]);

    if (agentsRes.error) console.error(agentsRes.error);

    const targetMap = new Map((targetsRes.data || []).map((t: any) => [t.agent_id, t]));

    const earningsMap = new Map<string, number>();
    (earningsRes.data || []).forEach((d: any) => {
      earningsMap.set(d.agent_id, (earningsMap.get(d.agent_id) || 0) + (d.agent_commission || 0));
    });

    const retailersMap = new Map<string, number>();
    (retailersRes.data || []).forEach((c: any) => {
      if (c.assigned_agent_id) {
        retailersMap.set(c.assigned_agent_id, (retailersMap.get(c.assigned_agent_id) || 0) + 1);
      }
    });

    const rows: AgentRow[] = (agentsRes.data || []).map((a: any) => {
      const t = targetMap.get(a.id) as any;
      return {
        id: a.id,
        full_name: a.full_name,
        email: a.email,
        role: a.role,
        target_id: t?.id,
        target_amount: t?.target_amount,
        onboarding_target: t?.onboarding_target,
        notes: t?.notes,
        earnings: earningsMap.get(a.id) || 0,
        retailers_onboarded: retailersMap.get(a.id) || 0,
      };
    });

    setAgents(rows);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [month]);
  useRealtimeRefresh(['monthly_targets', 'deals', 'profiles', 'clients'], fetchData, 'targets-page');

  // ── Derived / stats ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const withRevTarget = agents.filter(a => a.target_amount);
    const withOnbTarget = agents.filter(a => a.onboarding_target);
    const revReached = withRevTarget.filter(a => getStatus(a.earnings, a.target_amount) !== 'below');
    const revBelow = withRevTarget.filter(a => getStatus(a.earnings, a.target_amount) === 'below');
    const onbReached = withOnbTarget.filter(a => getOnboardingStatus(a.retailers_onboarded, a.onboarding_target) !== 'below');
    const onbBelow = withOnbTarget.filter(a => getOnboardingStatus(a.retailers_onboarded, a.onboarding_target) === 'below');
    return {
      withRevTarget: withRevTarget.length,
      withOnbTarget: withOnbTarget.length,
      revReached: revReached.length,
      revBelow: revBelow.length,
      onbReached: onbReached.length,
      onbBelow: onbBelow.length,
    };
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

  // ── Set / Edit ────────────────────────────────────────────────────────────────

  const openSet = (agent: AgentRow) => {
    setEditingAgent(agent);
    setForm({
      agent_id: agent.id,
      target_amount: agent.target_amount ? String(agent.target_amount) : '',
      onboarding_target: agent.onboarding_target ? String(agent.onboarding_target) : '',
      notes: agent.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const amount = form.target_amount ? Number(form.target_amount) : null;
    const onboarding = form.onboarding_target ? Number(form.onboarding_target) : null;

    if (!amount && !onboarding) {
      toast({ title: 'Validation', description: 'Set at least a revenue target or an onboarding target.', variant: 'destructive' });
      return;
    }
    if (amount !== null && amount <= 0) {
      toast({ title: 'Validation', description: 'Revenue target must be greater than 0', variant: 'destructive' });
      return;
    }
    if (onboarding !== null && onboarding <= 0) {
      toast({ title: 'Validation', description: 'Onboarding target must be greater than 0', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('monthly_targets').upsert({
      agent_id: form.agent_id,
      target_amount: amount,
      onboarding_target: onboarding,
      month,
      set_by: profile?.id,
      notes: form.notes.trim() || null,
    }, { onConflict: 'agent_id,month' });

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
    toast({ title: 'Target saved' });
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  // ── Bulk set ──────────────────────────────────────────────────────────────────

  const handleBulkSave = async () => {
    const amount = bulkAmount ? Number(bulkAmount) : null;
    const onboarding = bulkOnboarding ? Number(bulkOnboarding) : null;

    if (!amount && !onboarding) {
      toast({ title: 'Validation', description: 'Set at least a revenue target or an onboarding target.', variant: 'destructive' });
      return;
    }

    setBulkSaving(true);

    const targets = agents
      .filter(a => a.role === 'agent')
      .filter(a => bulkOverwrite || !a.target_amount)
      .map(a => ({
        agent_id: a.id,
        target_amount: amount,
        onboarding_target: onboarding,
        month,
        set_by: profile?.id,
        notes: bulkNotes.trim() || null,
      }));

    if (targets.length === 0) {
      toast({ title: 'No agents to update', description: 'All agents already have a target. Enable "Overwrite existing" to replace them.' });
      setBulkSaving(false);
      return;
    }

    const { error } = await supabase.from('monthly_targets').upsert(targets, { onConflict: 'agent_id,month' });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setBulkSaving(false); return; }
    toast({ title: `Targets set for ${targets.length} agent(s)` });
    setBulkSaving(false);
    setShowBulk(false);
    setBulkAmount('');
    setBulkOnboarding('');
    setBulkNotes('');
    fetchData();
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deletingAgent) return;
    const { error } = await supabase.from('monthly_targets').delete().eq('agent_id', deletingAgent.id).eq('month', month);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setDeletingAgent(null); return; }
    toast({ title: 'Target removed' });
    setDeletingAgent(null);
    fetchData();
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? <span className="ml-1 text-[10px]">{sortAsc ? '↑' : '↓'}</span> : null;

  return (
    <DashboardLayout title="Monthly Targets">
      <div className="space-y-6">

        {/* Month navigator */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMonth(m => offsetMonth(m, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold w-36 text-center">{toMonthLabel(month)}</span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setMonth(m => offsetMonth(m, 1))} disabled={month >= currentYM()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {month !== currentYM() && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setMonth(currentYM())}>
                Today
              </Button>
            )}
          </div>
          {canEdit && (
            <Button onClick={() => { setBulkAmount(''); setBulkOnboarding(''); setBulkNotes(''); setBulkOverwrite(false); setShowBulk(true); }} variant="outline" className="gap-2">
              <Users className="h-4 w-4" /> Set for All Agents
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Revenue Targets Set',      value: stats.withRevTarget,  icon: Target,    accent: 'bg-primary/8 text-primary' },
            { label: 'Revenue On Track',          value: stats.revReached,     icon: TrendingUp, accent: 'bg-success/10 text-success' },
            { label: 'Revenue Below Target',      value: stats.revBelow,       icon: Trophy,    accent: 'bg-destructive/10 text-destructive' },
            { label: 'Onboarding Targets Set',    value: stats.withOnbTarget,  icon: Store,     accent: 'bg-primary/8 text-primary' },
            { label: 'Onboarding On Track',       value: stats.onbReached,     icon: TrendingUp, accent: 'bg-success/10 text-success' },
            { label: 'Onboarding Below Target',   value: stats.onbBelow,       icon: Store,     accent: 'bg-destructive/10 text-destructive' },
          ].map((s, i) => (
            <Card key={i} className="shadow-card border-border/50">
              <CardContent className="p-5">
                {loading ? <Skeleton className="h-14 w-full" /> : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <div className={`rounded-lg p-2 ${s.accent}`}><s.icon className="h-4 w-4" /></div>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3 px-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-sm font-semibold">Agent Targets — {toMonthLabel(month)}</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search agents..." className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No agents found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider" onClick={() => toggleSort('name')}>
                      Agent <SortIcon k="name" />
                    </TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Revenue Target</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider">Earnings</TableHead>
                    <TableHead className="hidden lg:table-cell cursor-pointer select-none text-xs font-semibold uppercase tracking-wider" onClick={() => toggleSort('progress')}>
                      Rev. Progress <SortIcon k="progress" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider">Onboarding</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider">Onb. Progress</TableHead>
                    <TableHead className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider" onClick={() => toggleSort('status')}>
                      Status <SortIcon k="status" />
                    </TableHead>
                    {canEdit && <TableHead className="text-right text-xs font-semibold uppercase tracking-wider">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(agent => {
                    const revPct = agent.target_amount ? Math.min((agent.earnings / agent.target_amount) * 100, 100) : 0;
                    const onbPct = agent.onboarding_target ? Math.min((agent.retailers_onboarded / agent.onboarding_target) * 100, 100) : 0;
                    return (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{agent.full_name}</p>
                            <p className="text-xs text-muted-foreground">{agent.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs capitalize">{agent.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {agent.target_amount ? formatCurrency(agent.target_amount) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {formatCurrency(agent.earnings)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell w-36">
                          {agent.target_amount ? (
                            <div className="space-y-1">
                              <Progress value={revPct} className="h-1.5" />
                              <p className="text-xs text-muted-foreground">{formatPercent(revPct)}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {agent.onboarding_target ? (
                            <div>
                              <span className="font-medium">{agent.retailers_onboarded}</span>
                              <span className="text-muted-foreground"> / {agent.onboarding_target}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell w-36">
                          {agent.onboarding_target ? (
                            <div className="space-y-1">
                              <Progress value={onbPct} className="h-1.5" />
                              <p className="text-xs text-muted-foreground">{formatPercent(onbPct)}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <StatusBadge earnings={agent.earnings} target={agent.target_amount} />
                            {agent.onboarding_target && (
                              <OnboardingBadge count={agent.retailers_onboarded} target={agent.onboarding_target} />
                            )}
                          </div>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openSet(agent)}>
                                {(agent.target_amount || agent.onboarding_target) ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                              </Button>
                              {(agent.target_amount || agent.onboarding_target) && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingAgent(agent)}>
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
      </div>

      {/* Set / Edit Target Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{(editingAgent?.target_amount || editingAgent?.onboarding_target) ? 'Edit Target' : 'Set Target'}</DialogTitle>
            <DialogDescription>
              {editingAgent?.full_name} — {toMonthLabel(month)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Revenue Target (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 5000"
                value={form.target_amount}
                onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Onboarding Target <span className="text-muted-foreground font-normal">(# retailers to onboard)</span></Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 10"
                value={form.onboarding_target}
                onChange={e => setForm(f => ({ ...f, onboarding_target: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground font-normal">(visible to agent on mobile)</span></Label>
              <Textarea
                placeholder="e.g. Focus on wholesaler visits this month..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Set Modal */}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Target for All Agents</DialogTitle>
            <DialogDescription>
              Apply the same target to all active agents for {toMonthLabel(month)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Revenue Target (USD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 5000"
                value={bulkAmount}
                onChange={e => setBulkAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Onboarding Target <span className="text-muted-foreground font-normal">(# retailers per agent)</span></Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 10"
                value={bulkOnboarding}
                onChange={e => setBulkOnboarding(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground font-normal">(visible to agents on mobile)</span></Label>
              <Textarea
                placeholder="e.g. Monthly target for April..."
                value={bulkNotes}
                onChange={e => setBulkNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <input
                type="checkbox"
                id="overwrite"
                checked={bulkOverwrite}
                onChange={e => setBulkOverwrite(e.target.checked)}
                className="h-4 w-4 rounded"
              />
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
            <Button variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
            <Button onClick={handleBulkSave} disabled={bulkSaving}>
              {bulkSaving ? 'Saving...' : 'Set Targets'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingAgent} onOpenChange={open => { if (!open) setDeletingAgent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Target</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the {toMonthLabel(month)} target for <strong>{deletingAgent?.full_name}</strong>?
              They will see "No target set" on their mobile dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TargetsPage;
