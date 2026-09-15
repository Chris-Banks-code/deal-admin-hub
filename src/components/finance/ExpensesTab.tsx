import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CURRENCIES, EXPENSE_CATEGORIES, num } from '@/lib/finance';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paid: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const blank = (currency: string) => ({
  id: null as string | null,
  expense_date: new Date().toISOString().slice(0, 10),
  category: 'Miscellaneous',
  vendor: '',
  description: '',
  amount: '',
  currency,
  bank_account_id: '',
  status: 'approved',
  notes: '',
});

interface Props {
  currency: string;
  expenses: any[];
  banks: any[];
  onChanged: () => void;
}

export function ExpensesTab({ currency, expenses, banks, onChanged }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses
      .filter(e => (e.currency || 'LRD') === currency)
      .filter(e => statusFilter === 'all' || e.status === statusFilter)
      .filter(e => !q || [e.category, e.vendor, e.description].join(' ').toLowerCase().includes(q));
  }, [expenses, currency, statusFilter, search]);

  const total = rows.filter(r => r.status !== 'rejected' && r.status !== 'draft')
    .reduce((s, r) => s + num(r.amount), 0);

  const save = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: 'Enter an amount', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload: any = {
      expense_date: form.expense_date,
      category: form.category,
      vendor: form.vendor || null,
      description: form.description || null,
      amount: Number(form.amount),
      currency: form.currency,
      bank_account_id: form.bank_account_id || null,
      status: form.status,
      notes: form.notes || null,
    };
    const t = (supabase.from as any)('expenses');
    const { error } = form.id
      ? await t.update(payload).eq('id', form.id)
      : await t.insert({ ...payload, created_by: profile?.id ?? null });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: form.id ? 'Expense updated' : 'Expense recorded' });
    setForm(null);
    onChanged();
  };

  const remove = async () => {
    const { error } = await (supabase.from as any)('expenses').delete().eq('id', deleting.id);
    setDeleting(null);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Expense deleted' });
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search category, vendor or note…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button className="gap-2" onClick={() => setForm(blank(currency))}>
          <Plus className="h-4 w-4" /> Record expense
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid to</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No expenses recorded yet.
                </TableCell></TableRow>
              )}
              {rows.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(e.expense_date)}</TableCell>
                  <TableCell className="text-sm">{e.category}</TableCell>
                  <TableCell className="text-sm">{e.vendor || '—'}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{e.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${STATUS_STYLE[e.status] ?? ''}`}>{e.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(num(e.amount), e.currency)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setForm({ ...blank(currency), ...e, amount: String(e.amount ?? ''), bank_account_id: e.bank_account_id || '' })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(e)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={5} className="text-sm font-medium">Total (excluding drafts & rejected)</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(total, currency)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={o => { if (!o) setForm(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? 'Edit expense' : 'Record expense'}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.expense_date}
                  onChange={e => setForm({ ...form, expense_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                <Label>Paid to</Label>
                <Input value={form.vendor} placeholder="Vendor or person"
                  onChange={e => setForm({ ...form, vendor: e.target.value })} />
              </div>
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This removes the record permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
