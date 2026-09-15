import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CURRENCIES, PAYMENT_METHODS, num } from '@/lib/finance';
import { StatCard } from './StatCard';

const blank = (currency: string, direction: 'in' | 'out') => ({
  id: null as string | null,
  direction,
  payment_date: new Date().toISOString().slice(0, 10),
  client_id: '',
  amount: '',
  currency,
  method: 'cash',
  bank_account_id: '',
  reference: '',
  notes: '',
});

interface Props {
  currency: string;
  payments: any[];
  clients: any[];
  banks: any[];
  receivable: number;
  onChanged: () => void;
}

export function PaymentsTab({ currency, payments, clients, banks, receivable, onChanged }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.company_name || '—';

  const rows = useMemo(() => payments
    .filter(p => (p.currency || 'LRD') === currency)
    .filter(p => filter === 'all' || p.direction === filter), [payments, currency, filter]);

  const cashIn = rows.filter(p => p.direction === 'in').reduce((s, p) => s + num(p.amount), 0);
  const cashOut = rows.filter(p => p.direction === 'out').reduce((s, p) => s + num(p.amount), 0);

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: 'Enter an amount', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from as any)('payments').insert({
      direction: form.direction,
      payment_date: form.payment_date,
      client_id: form.client_id || null,
      amount: Number(form.amount),
      currency: form.currency,
      method: form.method,
      bank_account_id: form.bank_account_id || null,
      reference: form.reference || null,
      notes: form.notes || null,
      created_by: profile?.id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: form.direction === 'in' ? 'Money in recorded' : 'Money out recorded' });
    setForm(null);
    onChanged();
  };

  const remove = async (row: any) => {
    const { error } = await (supabase.from as any)('payments').delete().eq('id', row.id);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment deleted' });
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={ArrowDownLeft} label="Money in" value={formatCurrency(cashIn, currency)} tone="success" />
        <StatCard icon={ArrowUpRight} label="Money out" value={formatCurrency(cashOut, currency)} tone="destructive" />
        <StatCard icon={ArrowDownLeft} label="Still to collect" value={formatCurrency(receivable, currency)} tone="warning"
          hint="Commission earned but not yet received" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="in">Money in</SelectItem>
            <SelectItem value="out">Money out</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" className="gap-2" onClick={() => setForm(blank(currency, 'out'))}>
          <ArrowUpRight className="h-4 w-4" /> Money out
        </Button>
        <Button className="gap-2" onClick={() => setForm(blank(currency, 'in'))}>
          <Plus className="h-4 w-4" /> Money in
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Payment history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No payments recorded yet.
                </TableCell></TableRow>
              )}
              {rows.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(p.payment_date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={p.direction === 'in'
                      ? 'border-success/20 bg-success/10 text-success'
                      : 'border-destructive/20 bg-destructive/10 text-destructive'}>
                      {p.direction === 'in' ? 'In' : 'Out'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{clientName(p.client_id)}</TableCell>
                  <TableCell className="text-sm capitalize">{String(p.method || '').replace('_', ' ')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.reference || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(num(p.amount), p.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={o => { if (!o) setForm(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.direction === 'in' ? 'Record money received' : 'Record money paid out'}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.payment_date}
                  onChange={e => setForm({ ...form, payment_date: e.target.value })} />
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
                <Label>Method</Label>
                <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Customer or supplier</Label>
                <Select value={form.client_id || 'none'}
                  onValueChange={v => setForm({ ...form, client_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="none">Not linked</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Account</Label>
                <Select value={form.bank_account_id || 'none'}
                  onValueChange={v => setForm({ ...form, bank_account_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Reference</Label>
                <Input value={form.reference} placeholder="Receipt or transfer number"
                  onChange={e => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Note</Label>
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
