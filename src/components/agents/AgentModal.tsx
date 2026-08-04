import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgentProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  supervisor_id: string | null;
  status: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentProfile | null;
  supervisors: AgentProfile[];
  onSaved: () => void;
}

interface Form {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  supervisor_id: string;
  password: string;
  status: string;
}

const NONE = '__none__';

const empty: Form = {
  full_name: '', email: '', phone: '', role: 'agent',
  supervisor_id: NONE, password: '', status: 'active',
};

export function AgentModal({ open, onOpenChange, agent, supervisors, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(agent
      ? {
          full_name: agent.full_name ?? '',
          email: agent.email ?? '',
          phone: agent.phone ?? '',
          role: agent.role ?? 'agent',
          supervisor_id: agent.supervisor_id ?? NONE,
          password: '',
          status: agent.status ?? 'active',
        }
      : empty);
  }, [open, agent]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || (!agent && !form.email.trim())) {
      toast({ title: 'Validation', description: 'Name, email and phone are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (agent) {
        const { error } = await supabase.from('profiles').update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          role: form.role,
          status: form.status,
          supervisor_id: form.role === 'agent' && form.supervisor_id !== NONE ? form.supervisor_id : null,
        }).eq('id', agent.id);
        if (error) throw new Error(error.message);
        toast({ title: 'Agent updated' });
      } else {
        if (!form.password || form.password.length < 8) {
          toast({ title: 'Validation', description: 'Password must be at least 8 characters.', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            role: form.role,
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result?.error || 'Failed to create agent');

        // Attach supervisor if one was picked
        if (form.role === 'agent' && form.supervisor_id !== NONE && result?.user?.id) {
          await supabase.from('profiles').update({ supervisor_id: form.supervisor_id }).eq('id', result.user.id);
        }
        toast({ title: 'Agent created' });
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit Agent' : 'Add Agent'}</DialogTitle>
          <DialogDescription>
            {agent ? 'Update this agent\u2019s details, supervisor and status.' : 'Create a field agent or supervisor login.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. James Kollie" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} disabled={!!agent} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+231 XXX XXXX" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={v => set('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Field Agent</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === 'agent' && (
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Select value={form.supervisor_id} onValueChange={v => set('supervisor_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {supervisors.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {!agent && (
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" />
            </div>
          )}
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={form.status === 'active'} onCheckedChange={c => set('status', c ? 'active' : 'inactive')} />
            <Label className="cursor-pointer">{form.status === 'active' ? 'Active' : 'Suspended'}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : agent ? 'Save Changes' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
