import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Percent, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { num, type FinanceTotals } from '@/lib/finance';
import { StatCard } from './StatCard';

interface Props {
  currency: string;
  taxRates: any[];
  totals: FinanceTotals;
  onChanged: () => void;
}

export function TaxTab({ currency, taxRates, totals, onChanged }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>('');

  const active = useMemo(() => taxRates.filter(t => t.is_active !== false), [taxRates]);
  const rate = num(active.find(t => t.id === selected)?.rate);
  const taxable = Math.max(totals.netProfit, 0);
  const estimate = taxable * (rate / 100);

  const save = async () => {
    if (!form.name) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      name: form.name, rate: Number(form.rate || 0),
      description: form.description || null, is_active: form.is_active,
    };
    const t = (supabase.from as any)('tax_rates');
    const { error } = form.id ? await t.update(payload).eq('id', form.id) : await t.insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Tax rate saved' });
    setForm(null);
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Percent} label="Taxable profit" value={formatCurrency(taxable, currency)}
          hint="Net profit after team payouts and expenses" />
        <StatCard icon={Percent} label="Rate applied" value={`${rate.toFixed(1)}%`} />
        <StatCard icon={Percent} label="Estimated tax" value={formatCurrency(estimate, currency)} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estimate</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] space-y-1.5">
            <Label>Apply a rate</Label>
            <Select value={selected || 'none'} onValueChange={v => setSelected(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Choose a tax rate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No rate</SelectItem>
                {active.map(t => <SelectItem key={t.id} value={t.id}>{t.name} — {num(t.rate)}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            This is a guide only, based on the profit figures in this system.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">Tax rates</CardTitle>
          <Button size="sm" className="gap-2"
            onClick={() => setForm({ id: null, name: '', rate: '', description: '', is_active: true })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No tax rates set up.
                </TableCell></TableRow>
              )}
              {taxRates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={t.is_active
                      ? 'border-success/20 bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{num(t.rate)}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setForm({ ...t, rate: String(t.rate ?? ''), description: t.description || '' })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={o => { if (!o) setForm(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form?.id ? 'Edit tax rate' : 'New tax rate'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" value={form.rate}
                  onChange={e => setForm({ ...form, rate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.is_active ? 'active' : 'inactive'}
                  onValueChange={v => setForm({ ...form, is_active: v === 'active' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
