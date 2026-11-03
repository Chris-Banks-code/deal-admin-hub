import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CURRENCIES, num } from '@/lib/finance';

const table = (name: string) => (supabase.from as any)(name);

export interface PayoutDraft {
  profile_id: string;
  amount: string;
  currency: string;
  period: string;
  status: 'pending' | 'approved' | 'paid';
  method: string;
  bank_account_id: string;
  notes: string;
}

interface Props {
  draft: PayoutDraft | null;
  profiles: any[];
  banks: any[];
  onClose: () => void;
  onSaved: () => void;
}

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'cheque', label: 'Cheque' },
];

/** One dialog for every "pay someone their commission" action. */
export function PayoutDialog({ draft, profiles, banks, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<PayoutDraft | null>(draft);
  const [saving, setSaving] = useState(false);

  if (draft && form !== draft) setForm(draft);
  if (!form) return null;

  const name = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const save = async () => {
    if (!form.profile_id) { toast({ title: 'Choose who is being paid', variant: 'destructive' }); return; }
    if (!form.amount || num(form.amount) <= 0) { toast({ title: 'Enter an amount', variant: 'destructive' }); return; }
    setSaving(true);

    let payment_id: string | null = null;
    if (form.status === 'paid') {
      const { data, error } = await table('payments').insert({
        direction: 'out',
        payment_date: new Date().toISOString().slice(0, 10),
        profile_id: form.profile_id,
        amount: num(form.amount),
        currency: form.currency,
        method: form.method,
        bank_account_id: form.bank_account_id || null,
        reference: `Commission payout — ${form.period || ''}`.trim(),
        created_by: profile?.id ?? null,
      }).select('id').single();
      if (error) {
        setSaving(false);
        toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
        return;
      }
      payment_id = data?.id ?? null;
    }

    const { error } = await table('commission_payouts').insert({
      profile_id: form.profile_id,
      period: form.period || null,
      amount: num(form.amount),
      currency: form.currency,
      status: form.status,
      payment_id,
      paid_at: form.status === 'paid' ? new Date().toISOString() : null,
      notes: form.notes || null,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `${name(form.profile_id)} — payout recorded` });
    onClose();
    onSaved();
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record commission payout</DialogTitle></DialogHeader>
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
            <Label>Period</Label>
            <Input type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
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
          {form.status === 'paid' && (
            <>
              <div className="space-y-1.5">
                <Label>Paid from</Label>
                <Select value={form.bank_account_id || 'none'}
                  onValueChange={v => setForm({ ...form, bank_account_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const table = (name: string) => (supabase.from as any)(name);
