import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, Edit2, Trash2, Building2, MapPin, CheckCircle, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WholesalerModal } from '@/components/wholesaler/WholesalerModal';
import { motion } from 'framer-motion';

interface ClientForm {
  client_type: string; company_name: string; contact_person: string;
  phone: string; address: string; assigned_agent_id: string; status: string;
}

const emptyForm: ClientForm = { client_type: 'retailer', company_name: '', contact_person: '', phone: '', address: '', assigned_agent_id: '', status: 'active' };

const ClientsPage = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showWholesalerModal, setShowWholesalerModal] = useState(false);
  const [editingWholesaler, setEditingWholesaler] = useState<any>(null);
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, agentsRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'agent'),
    ]);
    setClients(clientsRes.data || []);
    setAgents(agentsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = !search || [c.company_name, c.contact_person].some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchTab = tab === 'all' || c.client_type === tab;
      const matchVerification = verificationFilter === 'all' || c.verification_status === verificationFilter;
      return matchSearch && matchTab && matchVerification;
    });
  }, [clients, search, tab, verificationFilter]);

  const retailerCount = useMemo(() => clients.filter(c => c.client_type === 'retailer').length, [clients]);
  const wholesalerCount = useMemo(() => clients.filter(c => c.client_type === 'wholesaler').length, [clients]);
  const getAgentName = (id: string | null) => agents.find(a => a.id === id)?.full_name || '—';

  const openAdd = () => { setEditingClient(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c: any) => {
    if (c.client_type === 'wholesaler') { setEditingWholesaler(c); setShowWholesalerModal(true); return; }
    setEditingClient(c);
    setForm({ client_type: c.client_type, company_name: c.company_name, contact_person: c.contact_person, phone: c.phone, address: c.address || '', assigned_agent_id: c.assigned_agent_id || '', status: c.status || 'active' });
    setShowModal(true);
  };

  const openAddWholesaler = () => { setEditingWholesaler(null); setShowWholesalerModal(true); };

  const handleSave = async () => {
    if (!form.company_name.trim() || !form.contact_person.trim() || !form.phone.trim()) {
      toast({ title: 'Validation', description: 'Fill required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const data = { client_type: form.client_type, company_name: form.company_name.trim(), contact_person: form.contact_person.trim(), phone: form.phone.trim(), address: form.address || null, assigned_agent_id: form.client_type === 'retailer' && form.assigned_agent_id ? form.assigned_agent_id : null, status: form.status };

    if (editingClient) {
      const { error } = await supabase.from('clients').update(data).eq('id', editingClient.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Client updated' });
    } else {
      const { error } = await supabase.from('clients').insert(data);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Client created' });
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const deleteClient = async () => {
    if (!deletingClientId) return;
    const { error } = await supabase.from('clients').delete().eq('id', deletingClientId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setDeletingClientId(null); return; }
    toast({ title: 'Client deleted' });
    setDeletingClientId(null);
    fetchData();
  };

  const getVerificationBadge = (status: string | null) => {
    switch (status) {
      case 'verified': return <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 glow-success">Verified</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20 glow-warning">Pending</Badge>;
      default: return <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">Unverified</Badge>;
    }
  };

  return (
    <DashboardLayout title="Clients">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-1 gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-9 bg-white/[0.05] border-white/[0.08] rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === 'wholesaler' && (
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger className="w-[160px] bg-white/[0.05] border-white/[0.08] rounded-xl"><SelectValue placeholder="Verification" /></SelectTrigger>
                <SelectContent className="bg-card/95 glass border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button onClick={openAddWholesaler} variant="ghost" className="gap-2 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] rounded-xl text-primary">
                <Store className="h-4 w-4" /> Add Wholesaler
              </Button>
            )}
            <Button onClick={openAdd} className="gap-2 bg-gradient-primary hover:opacity-90 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Add Client
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={v => { setTab(v); setVerificationFilter('all'); }}>
          <TabsList className="bg-white/[0.05] border border-white/[0.08] rounded-xl">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white/[0.1]">All ({clients.length})</TabsTrigger>
            <TabsTrigger value="retailer" className="rounded-lg data-[state=active]:bg-white/[0.1]">Retailers ({retailerCount})</TabsTrigger>
            <TabsTrigger value="wholesaler" className="rounded-lg data-[state=active]:bg-white/[0.1]">Wholesalers ({wholesalerCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/[0.04]" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No clients found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-muted-foreground">Company</TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">Type</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs font-medium text-muted-foreground">Phone</TableHead>
                    <TableHead className="hidden xl:table-cell text-xs font-medium text-muted-foreground">Location</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground">Agent</TableHead>
                    {(tab === 'wholesaler' || tab === 'all') && <TableHead className="hidden lg:table-cell text-xs font-medium text-muted-foreground">Verification</TableHead>}
                    <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className={`border-white/[0.04] hover:bg-white/[0.04] transition-colors duration-150 group ${c.client_type === 'wholesaler' ? 'cursor-pointer' : ''}`} onClick={() => c.client_type === 'wholesaler' ? openEdit(c) : undefined}>
                      <TableCell className="font-medium text-sm">{c.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${c.client_type === 'wholesaler' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                          {c.client_type === 'wholesaler' ? 'Wholesaler' : 'Retailer'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.contact_person}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{c.phone}</TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {c.latitude && c.longitude ? (
                          <span className="flex items-center gap-1 text-xs text-success"><CheckCircle className="h-3 w-3" /> Mapped</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Unmapped</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.client_type === 'retailer' ? getAgentName(c.assigned_agent_id) : '—'}</TableCell>
                      {(tab === 'wholesaler' || tab === 'all') && (
                        <TableCell className="hidden lg:table-cell">
                          {c.client_type === 'wholesaler' ? getVerificationBadge(c.verification_status) : '—'}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${c.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-white/[0.05] text-muted-foreground border-white/[0.08]'}`}>
                          {c.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/[0.08]" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeletingClientId(c.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card/95 glass border-white/10">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle>
            <DialogDescription>{editingClient ? 'Update client details.' : 'Add a new client.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Type</Label>
              <RadioGroup value={form.client_type} onValueChange={v => setForm(f => ({ ...f, client_type: v }))} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="retailer" id="retailer" /><Label htmlFor="retailer">Retailer</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="wholesaler" id="wholesaler" /><Label htmlFor="wholesaler">Wholesaler</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2"><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="bg-white/[0.05] border-white/[0.08] rounded-xl" /></div>
            <div className="space-y-2"><Label>Contact Person *</Label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} className="bg-white/[0.05] border-white/[0.08] rounded-xl" /></div>
            <div className="space-y-2"><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-white/[0.05] border-white/[0.08] rounded-xl" /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-white/[0.05] border-white/[0.08] rounded-xl" /></div>
            {form.client_type === 'retailer' && (
              <div className="space-y-2">
                <Label>Assigned Agent</Label>
                <Select value={form.assigned_agent_id} onValueChange={v => setForm(f => ({ ...f, assigned_agent_id: v }))}>
                  <SelectTrigger className="bg-white/[0.05] border-white/[0.08] rounded-xl"><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent className="bg-card/95 glass border-white/10">{agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={form.status === 'active'} onCheckedChange={c => setForm(f => ({ ...f, status: c ? 'active' : 'inactive' }))} />
              <Label>{form.status === 'active' ? 'Active' : 'Inactive'}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)} className="hover:bg-white/[0.08]">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary hover:opacity-90 rounded-lg">{editingClient ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingClientId} onOpenChange={open => { if (!open) setDeletingClientId(null); }}>
        <AlertDialogContent className="bg-card/95 glass border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the client. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-white/[0.08]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WholesalerModal open={showWholesalerModal} onOpenChange={setShowWholesalerModal} editingWholesaler={editingWholesaler} onSaved={fetchData} />
    </DashboardLayout>
  );
};

export default ClientsPage;
