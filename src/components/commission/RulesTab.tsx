import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Percent, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { num } from '@/lib/finance';
import { lineCommission, type CommissionRules } from '@/lib/commissions';

interface Props {
  rules: CommissionRules;
  products: any[];
  onChanged: () => void;
}

const ROLES = [
  { key: 'agent_pct', label: 'Agent' },
  { key: 'supervisor_pct', label: 'Supervisor' },
  { key: 'manager_pct', label: 'Operation Manager' },
] as const;

/** The rules every new sale is measured against. */
export function RulesTab({ rules, products, onChanged }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [form, setForm] = useState<CommissionRules>(rules);
  const [saving, setSaving] = useState(false);
  const [rate, setRate] = useState<Record<string, string>>({});

  useEffect(() => { setForm(rules); }, [rules]);

  const total = form.agent_pct + form.supervisor_pct + form.manager_pct;
  const valid = total === 100 && ROLES.every(r => form[r.key] >= 0);

  const saveSplit = async () => {
    if (!valid) { toast({ title: 'The shares must add up to 100', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      agent_pct: form.agent_pct,
      supervisor_pct: form.supervisor_pct,
      manager_pct: form.manager_pct,
      updated_by: profile?.id ?? null,
    };
    const { error } = rules.id
      ? await (supabase.from as any)('commission_rules').update(payload).eq('id', rules.id)
      : await (supabase.from as any)('commission_rules').insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Commission split updated' });
    onChanged();
  };

  const saveRate = async (product: any) => {
    const next = num(rate[product.id]);
    const { error } = await (supabase.from as any)('products')
      .update({ commission_rate: next }).eq('id', product.id);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `${product.name} — commission now ${next}%` });
    onChanged();
  };

  const preview = useMemo(() => {
    const sample = 1000;
    return {
      total: sample,
      agent: sample * (form.agent_pct / 100),
      supervisor: sample * (form.supervisor_pct / 100),
      manager: sample * (form.manager_pct / 100),
    };
  }, [form]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4" /> How the commission pot is shared</CardTitle>
          <CardDescription>
            Every sale earns a commission for Deal Group. That pot is split between the three roles below —
            whatever is left afterwards is Deal Group's own share.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {ROLES.map(r => (
              <div key={r.key} className="space-y-1.5">
                <Label>{r.label}</Label>
                <Input type="number" min="0" max="100" step="0.5" value={form[r.key]}
                  onChange={e => setForm({ ...form, [r.key]: num(e.target.value) })} />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={total === 100 ? 'border-success/30 text-success' : 'border-destructive/30 text-destructive'}>
                Adds up to {total}%
              </Badge>
              <span className="text-xs text-muted-foreground">Must be exactly 100%</span>
            </div>
            <Button className="gap-2" onClick={saveSplit} disabled={saving || !valid}>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save split'}
            </Button>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">On a commission of {formatCurrency(preview.total, 'LRD')}:</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 font-mono text-sm">
              <span>Agent {formatCurrency(preview.agent, 'LRD')}</span>
              <span>Supervisor {formatCurrency(preview.supervisor, 'LRD')}</span>
              <span>Operation Manager {formatCurrency(preview.manager, 'LRD')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Commission rate per product</CardTitle>
          <CardDescription>
            The percentage Deal Group earns when that product sells. Rates are charged in the product's own currency.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Commission on one unit</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No products yet.</TableCell></TableRow>
              )}
              {products.map(p => {
                const current = rate[p.id] ?? String(num(p.commission_rate));
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category || '—'}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(num(p.unit_price), p.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Input className="h-8 w-24 text-right font-mono text-sm" type="number" min="0" max="100" step="0.5"
                        value={current} onChange={e => setRate({ ...rate, [p.id]: e.target.value })} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {formatCurrency(lineCommission(num(p.unit_price), num(current)), p.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={num(current) === num(p.commission_rate)}
                        onClick={() => saveRate(p)}>Save</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
