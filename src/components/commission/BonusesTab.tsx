import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gift, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CURRENCIES, num } from '@/lib/finance';
import { isOwedStatus } from '@/lib/commissions';
import { StatCard } from '@/components/finance/StatCard';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paid: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface Props {
  currency: string;
  bonuses: any[];
  profiles: any[];
  onChanged: () => void;
}

const blank = (currency: string) => ({
  profile_id: '',
  title: '',
  reason: '',
  amount: '',
  currency,
  period: new Date().toISOString().slice(0, 7),
  status: 'pending' as 'pending' | 'approved' | 'paid',
  notes: '',
});

/** Bonuses and incentives on top of normal commission. */
export function BonusesTab({ currency, bonuses, profiles, onChanged }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<ReturnType<typeof blank> | null>(null);
  const [saving, setSaving] = useState(false);

  const name = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const rows = useMemo(() => bonuses.filter(b => (b.currency || 'LRD') === currency), [bonuses, currency]);
  const owed = rows.filter(b => isOwedStatus(b.status)).reduce((s, b) => s + num(b.amount), 0);
  const paid = rows.filter(b => b.status === 'paid').reduce((s, b) => s + num(b.amount), 0);

  const save = async () => {
    if (!form) return;
    if (!form.profile_id) { toast({ title: 'Choose who is being rewarded', variant: 'destructive' }); return; }
    if (!form.amount || num(form.amount) <= 0) { toast({ title: 'Enter an amount', variant: 'destructive' }); return; }
    setSaving(true);

    let payment_id: string | null = null;
    if (form.status === 'paid') {
      const { data, error } = await (supabase.from as any)('payments').insert({
        direction: 'out',
        payment_date: new Date().toISOString().slice(0, 10),
        profile_id: form.profile_id,
        amount: num(form.amount),
        currency: form.currency,
        method: 'cash',
        reference: `Bonus — ${form.title || form.period}`.trim(),
        created_by: profile?.id ?? null,
      }).select('id').single();
      if (error) {
        setSaving(false);
        toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
        return;
      }
      payment_id = data?.id ?? null;
    }

    const { error } = await (supabase.from as any)('commission_bonuses').insert({
      profile_id: form.profile_id,
      title: form.title.trim() || 'Bonus',
      reason: form.reason.trim() || null,
      amount: num(form.amount),
      currency: form.currency,
      period: form.period || null,
      status: form.status,
      payment_id,
      paid_at: form.status === 'paid' ? new Date().toISOString() : null,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Bonus added' });
    setForm(null);
    onChanged();
  };

  const setStatusOf = async (row: any, next: string) => {
    const patch: any = { status: next };
    if (next === 'paid') patch.paid_at = new Date().toISOString();
    const { error } = await (supabase.from as any)('commission_bonuses').update(patch).eq('id', row.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }

    if (next === 'paid' && !row.payment_id) {
      await (supabase.from as any)('payments').insert({
        direction: 'out',
        payment_date: new Date().toISOString().slice(0, 10),
        profile_id: row.profile_id,
        amount: num(row.amount),
        currency: row.currency,
        method: 'cash',
        reference: `Bonus — ${row.title || row.period || ''}`.trim(),
        created_by: profile?.id ?? null,
      });
    }
    toast({ title: `Bonus ${next}` });
    onChanged();
  };

  const remove = async (row: any) => {
    const { error } = await (supabase.from as any)('commission_bonuses').delete().eq('id', row.id);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Bonus removed' });
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Gift} label="Bonuses owed" value={formatCurrency(owed, currency)} tone="warning" />
        <StatCard icon={Gift} label="Bonuses paid" value={formatCurrency(paid, currency)} tone="success" />
        <StatCard icon={Gift} label="Records" value={String(rows.length)} hint="In this currency" />
      </div>

      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setForm(blank(currency))}>
          <Plus className="h-4 w-4" /> Add bonus
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Bonuses & incentives — {currency}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No bonuses recorded in {currency} yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-sm font-medium">{name(b.profile_id)}</TableCell>
                  <TableCell className="text-sm">{b.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.reason || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.period || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${STATUS_STYLE[b.status] ?? ''}`}>{b.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(num(b.amount), b.currency)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {b.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => setStatusOf(b, 'approved')}>Approve</Button>
                      )}
                      {isOwedStatus(b.status) && (
                        <Button size="sm" onClick={() => setStatusOf(b, 'paid')}>Pay</Button>
                      )}
                      {isOwedStatus(b.status) && (
                        <Button size="sm" variant="ghost" onClick={() => setStatusOf(b, 'cancelled')}>Cancel</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(b)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={o => { if (!o) setForm(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add a bonus or incentive</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Person</Label>
                <Select value={form.profile_id || 'none'}
                  onValueChange={v => setForm({ ...form, profile_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="none">Select a person</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={form.title} placeholder="e.g. October top seller"
                  onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Period</Label>
                <Input type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Input value={form.reason} placeholder="Why they earned it"
                  onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
