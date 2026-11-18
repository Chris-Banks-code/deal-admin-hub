import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { allocatePool, DEFAULT_POOL_RULE, isValidPoolRule, maxScenarioPct, SCENARIOS, SHARE_FIELDS, type PoolRule } from '@/lib/commission-pool';

const db = supabase as any;
const ROLE_LABEL: Record<string, string> = { creator: 'Creator', delivery: 'Delivery', supervisor: 'Supervisor', operations: 'Ops', regional: 'Regional', finance: 'Finance', hr: 'HR', admin: 'Admin', deal: 'DEAL' };

export function PoolRulesSection({ products }: { products: any[] }) {
  const { toast } = useToast();
  const [rules, setRules] = useState<Record<string, PoolRule>>({});
  const [productId, setProductId] = useState('');
  const load = async () => {
    const { data } = await db.from('product_commission_rules').select('*');
    setRules(Object.fromEntries((data || []).map((r: any) => [r.product_id, r])));
  };
  useEffect(() => { load(); }, []);
  const pid = productId || Object.keys(rules)[0] || products[0]?.id || '';
  const product = products.find(p => p.id === pid);
  const [draft, setDraft] = useState<PoolRule | null>(null);
  useEffect(() => { setDraft(rules[pid] ? { ...rules[pid] } : { ...DEFAULT_POOL_RULE, currency: product?.currency || 'LRD' }); }, [pid, rules]);
  if (!draft) return null;
  const r: PoolRule = { ...draft, pool_amount: Number(draft.pool_amount) } as PoolRule;
  SHARE_FIELDS.forEach(f => { (r as any)[f.key] = Number((draft as any)[f.key]); });
  const valid = isValidPoolRule(r);
  const save = async () => {
    const { unit, pool_amount, currency } = r;
    const row: any = { product_id: pid, unit, pool_amount, currency };
    SHARE_FIELDS.forEach(f => { row[f.key] = r[f.key]; });
    const { error } = await db.from('product_commission_rules').upsert(row, { onConflict: 'product_id' });
    if (error) return toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    toast({ title: `${product?.name} commission rules saved` }); load();
  };
  const set = (k: string, v: string) => setDraft({ ...draft, [k]: v } as any);
  return <section className="rounded-lg border border-border bg-card p-4 space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-base font-semibold">Commission pool rules</h2>
        <p className="text-xs text-muted-foreground">Fixed pool per delivered unit, split by percentage. Each product has its own rules.</p></div>
      <select aria-label="Product" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={pid} onChange={e => setProductId(e.target.value)}>
        {products.map(p => <option key={p.id} value={p.id}>{p.name}{rules[p.id] ? ' ✓' : ''}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="space-y-1.5"><Label>Unit</Label><Input value={draft.unit} onChange={e => set('unit', e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Pool per unit</Label><Input type="number" min="0" step="0.01" value={draft.pool_amount as any} onChange={e => set('pool_amount', e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Currency</Label>
        <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={draft.currency} onChange={e => set('currency', e.target.value)}>
          <option>LRD</option><option>USD</option></select></div>
      {SHARE_FIELDS.map(f => <div key={f.key} className="space-y-1.5"><Label>{f.label} (%)</Label>
        <Input type="number" min="0" max="100" step="0.01" value={(draft as any)[f.key]} onChange={e => set(f.key, e.target.value)} /></div>)}
    </div>
    <p className={valid ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
      {valid ? `DEAL Company gets the rest: at least ${(100 - maxScenarioPct(r)).toFixed(2)}% of the pool` : 'Shares add up to more than 100% in at least one scenario, so this can’t be saved.'}
    </p>
    {valid && <div className="overflow-x-auto"><table className="w-full text-xs">
      <thead><tr className="text-muted-foreground"><th className="text-left p-1">Scenario (per {r.unit})</th>{Object.values(ROLE_LABEL).map(l => <th key={l} className="text-right p-1">{l}</th>)}</tr></thead>
      <tbody>{SCENARIOS.map(s => { const a = allocatePool(r, s.actors, 1); return <tr key={s.label} className="border-t border-border">
        <td className="p-1">{s.label}</td>
        {Object.keys(ROLE_LABEL).map(k => { const x = a.find(y => y.role === k); return <td key={k} className="p-1 text-right font-mono">
          {x ? <>{formatCurrency(x.amount, r.currency)}<br /><span className="text-muted-foreground">{x.pct}%</span></> : '—'}</td>; })}
      </tr>; })}</tbody></table></div>}
    <Button size="sm" disabled={!valid || !pid} onClick={save}>Save rules</Button>
  </section>;
}
