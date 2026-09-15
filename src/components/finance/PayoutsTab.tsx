import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BadgeCheck, Banknote, HandCoins, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CURRENCIES, earningsByPerson, num } from '@/lib/finance';
import { StatCard } from './StatCard';

const ROLE_LABEL: Record<string, string> = {
  agent: 'Agent',
  supervisor: 'Supervisor',
  operation_manager: 'Operation Manager',
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paid: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface Props {
  currency: string;
  deals: any[];
  salesOrders: any[];
  profiles: any[];
  payouts: any[];
  banks: any[];
  onChanged: () => void;
}

export function PayoutsTab({ currency, deals, salesOrders, profiles, payouts, banks, onChanged }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const name = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const earnings = useMemo(
    () => earningsByPerson(deals, salesOrders).filter(e => e.currency === currency),
    [deals, salesOrders, currency],
  );

  /** Everything already paid out to each person, in this currency. */
  const paidByPerson = useMemo(() => {
    const map: Record<string, number> = {};
    payouts.filter(p => (p.currency || 'LRD') === currency && p.status === 'paid')
      .forEach(p => { map[p.profile_id] = (map[p.profile_id] || 0) + num(p.amount); });
    return map;
  }, [payouts, currency]);

  const ledger = useMemo(() => {
    const map = new Map<string, { profile_id: string; roles: Set<string>; earned: number; orders: number }>();
    earnings.forEach(e => {
      const entry = map.get(e.profile_id) || { profile_id: e.profile_id, roles: new Set<string>(), earned: 0, orders: 0 };
      entry.roles.add(e.role);
      entry.earned += e.earned;
      entry.orders += e.orders;
      map.set(e.profile_id, entry);
    });
    return Array.from(map.values()).map(e => {
      const paid = paidByPerson[e.profile_id] || 0;
      return { ...e, paid, owed: Math.max(e.earned - paid, 0) };
    }).sort((a, b) => b.owed - a.owed);
  }, [earnings, paidByPerson]);

  const totalEarned = ledger.reduce((s, r) => s + r.earned, 0);
  const totalPaid = ledger.reduce((s, r) => s + r.paid, 0);
  const totalOwed = ledger.reduce((s, r) => s + r.owed, 0);

  const history = useMemo(
    () => payouts.filter(p => (p.currency || 'LRD') === currency),
    [payouts, currency],
  );

  const save = async () => {
    if (!form.profile_id) { toast({ title: 'Choose who is being paid', variant: 'destructive' }); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast({ title: 'Enter an amount', variant: 'destructive' }); return; }
    setSaving(true);

    let payment_id: string | null = null;
    if (form.status === 'paid') {
      const { data, error } = await (supabase.from as any)('payments').insert({
        direction: 'out',
        payment_date: new Date().toISOString().slice(0, 10),
        profile_id: form.profile_id,
        amount: Number(form.amount),
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

    const { error } = await (supabase.from as any)('commission_payouts').insert({
      profile_id: form.profile_id,
      period: form.period || null,
      amount: Number(form.amount),
      currency: form.currency,
      status: form.status,
      payment_id,
      paid_at: form.status === 'paid' ? new Date().toISOString() : null,
      notes: form.notes || null,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payout recorded' });
    setForm(null);
    onChanged();
  };

  const markPaid = async (row: any) => {
    const { error } = await (supabase.from as any)('commission_payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', row.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    await (supabase.from as any)('payments').insert({
      direction: 'out',
      payment_date: new Date().toISOString().slice(0, 10),
      profile_id: row.profile_id,
      amount: num(row.amount),
      currency: row.currency,
      method: 'cash',
      reference: `Commission payout — ${row.period || ''}`.trim(),
      created_by: profile?.id ?? null,
    });
    toast({ title: 'Marked as paid' });
    onChanged();
  };

  const openFor = (row?: any) => setForm({
    profile_id: row?.profile_id ?? '',
    amount: row ? String(Math.round(row.owed * 100) / 100) : '',
    currency,
    period: new Date().toISOString().slice(0, 7),
    status: 'paid',
    method: 'cash',
    bank_account_id: '',
    notes: '',
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={HandCoins} label="Commission earned by team" value={formatCurrency(totalEarned, currency)} />
        <StatCard icon={BadgeCheck} label="Already paid out" value={formatCurrency(totalPaid, currency)} tone="success" />
        <StatCard icon={Wallet} label="Still owed" value={formatCurrency(totalOwed, currency)} tone="warning" />
      </div>

      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => openFor()}>
          <Banknote className="h-4 w-4" /> Record payout
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Who is owed what</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role on sales</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Owed</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No commission earned in {currency} yet.
                </TableCell></TableRow>
              )}
              {ledger.map(r => (
                <TableRow key={r.profile_id}>
                  <TableCell className="text-sm font-medium">{name(r.profile_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {Array.from(r.roles).map(x => ROLE_LABEL[x] ?? x).join(', ')}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{r.orders}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(r.earned, currency)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-success">{formatCurrency(r.paid, currency)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(r.owed, currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={r.owed <= 0} onClick={() => openFor(r)}>Pay</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Payout history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No payouts recorded yet.
                </TableCell></TableRow>
              )}
              {history.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{name(p.profile_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.period || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${STATUS_STYLE[p.status] ?? ''}`}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(num(p.amount), p.currency)}</TableCell>
                  <TableCell className="text-right">
                    {p.status !== 'paid' && p.status !== 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={() => markPaid(p)}>Mark paid</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={o => { if (!o) setForm(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record commission payout</DialogTitle></DialogHeader>
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
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.status === 'paid' && (
                <div className="space-y-1.5 sm:col-span-2">
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
              )}
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
