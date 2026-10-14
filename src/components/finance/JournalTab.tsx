import { Fragment, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { CURRENCIES, num } from '@/lib/finance';

interface Props {
  currency: string;
  entries: any[];
  lines: any[];
  accounts: any[];
  onChanged: () => void;
}

const emptyLine = () => ({ account_id: '', description: '', debit: '', credit: '' });

export function JournalTab({ currency, entries, lines, accounts, onChanged }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    entry_date: new Date().toISOString().slice(0, 10),
    memo: '',
    currency,
    rows: [emptyLine(), emptyLine()],
  });

  const rows = useMemo(() => entries.filter(e => (e.currency || 'LRD') === currency), [entries, currency]);
  const linesOf = (id: string) => lines.filter(l => l.entry_id === id);
  const accountName = (id: string) => {
    const a = accounts.find(x => x.id === id);
    return a ? `${a.code} · ${a.name}` : '—';
  };
  const entryTotal = (id: string) => linesOf(id).reduce((s, l) => s + num(l.debit), 0);

  const debit = form.rows.reduce((s: number, r: any) => s + num(r.debit), 0);
  const credit = form.rows.reduce((s: number, r: any) => s + num(r.credit), 0);
  const balanced = debit > 0 && Math.abs(debit - credit) < 0.005;

  const reset = () => setForm({
    entry_date: new Date().toISOString().slice(0, 10), memo: '', currency, rows: [emptyLine(), emptyLine()],
  });

  const save = async () => {
    if (!balanced) { toast({ title: 'Debits and credits must match', variant: 'destructive' }); return; }
    setSaving(true);
    const { data, error } = await (supabase.from as any)('journal_entries').insert({
      entry_date: form.entry_date,
      memo: form.memo || null,
      currency: form.currency,
      status: 'posted',
      created_by: profile?.id ?? null,
    }).select('id').single();
    if (error || !data) {
      setSaving(false);
      toast({ title: 'Could not save', description: error?.message, variant: 'destructive' });
      return;
    }
    const payload = form.rows
      .filter((r: any) => r.account_id && (num(r.debit) || num(r.credit)))
      .map((r: any) => ({
        entry_id: data.id,
        account_id: r.account_id,
        description: r.description || null,
        debit: num(r.debit),
        credit: num(r.credit),
      }));
    const { error: lineErr } = await (supabase.from as any)('journal_lines').insert(payload);
    setSaving(false);
    if (lineErr) { toast({ title: 'Could not save lines', description: lineErr.message, variant: 'destructive' }); return; }
    toast({ title: 'Journal entry posted' });
    setOpen(false);
    reset();
    onChanged();
  };

  const setRow = (i: number, patch: any) =>
    setForm({ ...form, rows: form.rows.map((r: any, idx: number) => (idx === i ? { ...r, ...patch } : r)) });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => { reset(); setOpen(true); }}>
          <Plus className="h-4 w-4" /> New journal entry
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" /> General ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No journal entries yet.
                </TableCell></TableRow>
              )}
              {rows.map(e => (
                <Fragment key={e.id}>
                  <TableRow key={e.id} className="cursor-pointer"
                    onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                    <TableCell className="font-mono text-xs">{e.entry_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(e.entry_date)}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm">{e.memo || '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{e.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(entryTotal(e.id), e.currency)}</TableCell>
                  </TableRow>
                  {expanded === e.id && (
                    <TableRow key={`${e.id}-lines`} className="bg-muted/30">
                      <TableCell colSpan={5} className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Account</TableHead>
                              <TableHead className="text-xs">Description</TableHead>
                              <TableHead className="text-right text-xs">Debit</TableHead>
                              <TableHead className="text-right text-xs">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {linesOf(e.id).map(l => (
                              <TableRow key={l.id}>
                                <TableCell className="text-xs">{accountName(l.account_id)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{l.description || '—'}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{num(l.debit) ? formatCurrency(num(l.debit), e.currency) : '—'}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{num(l.credit) ? formatCurrency(num(l.credit), e.currency) : '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>New journal entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.entry_date}
                  onChange={e => setForm({ ...form, entry_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Memo</Label>
                <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              {form.rows.map((r: any, i: number) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-5">
                    <Select value={r.account_id || 'none'}
                      onValueChange={v => setRow(i, { account_id: v === 'none' ? '' : v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Account" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="none">Select account</SelectItem>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input className="col-span-3 h-9" placeholder="Description" value={r.description}
                    onChange={e => setRow(i, { description: e.target.value })} />
                  <Input className="col-span-2 h-9 font-mono" placeholder="Debit" type="number" step="0.01"
                    value={r.debit} onChange={e => setRow(i, { debit: e.target.value, credit: '' })} />
                  <Input className="col-span-1 h-9 font-mono" placeholder="Credit" type="number" step="0.01"
                    value={r.credit} onChange={e => setRow(i, { credit: e.target.value, debit: '' })} />
                  <Button variant="ghost" size="icon" className="col-span-1 h-9 w-9 text-destructive"
                    onClick={() => setForm({ ...form, rows: form.rows.filter((_: any, x: number) => x !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-2"
                onClick={() => setForm({ ...form, rows: [...form.rows, emptyLine()] })}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>

            <div className="flex justify-end gap-6 border-t border-border pt-3 text-sm">
              <span>Debits <b className="font-mono">{formatCurrency(debit, form.currency)}</b></span>
              <span>Credits <b className="font-mono">{formatCurrency(credit, form.currency)}</b></span>
              <span className={balanced ? 'text-success' : 'text-destructive'}>
                {balanced ? 'Balanced' : 'Out of balance'}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !balanced}>{saving ? 'Posting…' : 'Post entry'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
