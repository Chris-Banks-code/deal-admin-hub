import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Edit2, UserX, UserCheck, Users2, ShieldCheck, Activity, KeyRound, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { getInitials, getRoleBadgeColor, getRoleLabel } from '@/lib/formatters';
import { AgentModal, type AgentProfile } from '@/components/agents/AgentModal';
import { AgentDetailSheet } from '@/components/agents/AgentDetailSheet';
import { ResetPasswordDialog } from '@/components/agents/ResetPasswordDialog';

export default function AgentsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgentProfile | null>(null);
  const [detail, setDetail] = useState<AgentProfile | null>(null);
  const [pwAgent, setPwAgent] = useState<AgentProfile | null>(null);
  const [deleting, setDeleting] = useState<AgentProfile | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const fetchAgents = async () => {
    setLoading(true);
    const [profRes, custRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, email, phone, role, supervisor_id, status')
        .in('role', ['agent', 'supervisor'])
        .order('full_name', { ascending: true }),
      supabase.from('clients').select('assigned_agent_id').eq('client_type', 'retailer'),
    ]);
    if (profRes.error) {
      toast({ title: 'Error', description: profRes.error.message, variant: 'destructive' });
    }
    setAgents((profRes.data as AgentProfile[]) || []);
    const counts: Record<string, number> = {};
    (custRes.data || []).forEach((c: any) => {
      if (c.assigned_agent_id) counts[c.assigned_agent_id] = (counts[c.assigned_agent_id] || 0) + 1;
    });
    setCustomerCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, []);
  useRealtimeRefresh(['profiles', 'clients'], fetchAgents, 'agents-page');

  const supervisors = useMemo(() => agents.filter(a => a.role === 'supervisor'), [agents]);
  const nameById = useMemo(
    () => Object.fromEntries(agents.map(a => [a.id, a.full_name])) as Record<string, string | null>,
    [agents],
  );

  const filtered = useMemo(() => agents.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || [a.full_name, a.email, a.phone].some(f => f?.toLowerCase().includes(q));
    const matchRole = roleFilter === 'all' || a.role === roleFilter;
    const matchStatus = statusFilter === 'all' || (a.status || 'active') === statusFilter;
    const matchSup = supervisorFilter === 'all'
      || (supervisorFilter === 'unassigned' ? !a.supervisor_id : a.supervisor_id === supervisorFilter);
    return matchSearch && matchRole && matchStatus && matchSup;
  }), [agents, search, roleFilter, statusFilter, supervisorFilter]);

  const stats = useMemo(() => ({
    total: agents.filter(a => a.role === 'agent').length,
    active: agents.filter(a => a.role === 'agent' && (a.status || 'active') === 'active').length,
    suspended: agents.filter(a => (a.status || 'active') !== 'active').length,
    supervisors: supervisors.length,
  }), [agents, supervisors]);

  const toggleStatus = async (a: AgentProfile) => {
    const next = (a.status || 'active') === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('profiles').update({ status: next }).eq('id', a.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: next === 'active' ? 'Agent reactivated' : 'Agent suspended' });
    fetchAgents();
  };

  const deleteAgent = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ userId: deleting.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || 'Failed to delete agent');
      toast({ title: 'Agent deleted' });
      setDeleting(null);
      fetchAgents();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeletingBusy(false);
    }
  };

  const statCards = [
    { label: 'Field Agents', value: stats.total, icon: Users2 },
    { label: 'Active', value: stats.active, icon: Activity },
    { label: 'Suspended', value: stats.suspended, icon: UserX },
    { label: 'Supervisors', value: stats.supervisors, icon: ShieldCheck },
  ];

  return (
    <DashboardLayout title="Agents">
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(s => (
            <Card key={s.label} className="border-border/50 shadow-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold font-mono tabular-nums">{s.value}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><s.icon className="h-5 w-5" /></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search agents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="agent">Field Agent</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supervisors</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {supervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Agent
          </Button>
        </div>

        <Card className="border-border/50 shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                No agents match your filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden lg:table-cell">Supervisor</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-center">Customers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetail(a)}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(a.full_name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{a.full_name}</p>
                        <p className="text-xs text-muted-foreground lg:hidden">{a.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(a.role || '')}`}>
                          {getRoleLabel(a.role || '')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {a.supervisor_id ? nameById[a.supervisor_id] || '—' : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">{a.phone || '—'}</TableCell>
                      <TableCell className="text-center text-sm font-mono tabular-nums">{customerCounts[a.id] || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${(a.status || 'active') === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}`}>
                          {(a.status || 'active') === 'active' ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(a); setModalOpen(true); }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset password" onClick={() => setPwAgent(a)}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(a)}>
                            {(a.status || 'active') === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete agent" onClick={() => setDeleting(a)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AgentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        agent={editing}
        supervisors={supervisors}
        onSaved={fetchAgents}
      />
      <AgentDetailSheet
        agent={detail}
        supervisorName={detail?.supervisor_id ? nameById[detail.supervisor_id] : null}
        onOpenChange={open => { if (!open) setDetail(null); }}
      />
      <ResetPasswordDialog
        agent={pwAgent}
        open={!!pwAgent}
        onOpenChange={open => { if (!open) setPwAgent(null); }}
      />
      <AlertDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes their login and profile. Assigned customers and past
              orders remain, but will no longer link to an active agent. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingBusy}
              onClick={e => { e.preventDefault(); deleteAgent(); }}
            >
              {deletingBusy ? 'Deleting…' : 'Delete Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
