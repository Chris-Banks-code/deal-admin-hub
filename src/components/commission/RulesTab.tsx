import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { productRules, productCommission, type CommissionRules } from '@/lib/commissions';

interface Props { rules: CommissionRules; products: any[]; onChanged: () => void }
const fields = [
  { key: 'commission_rate', label: 'Sale commission (%)' },
  { key: 'agent_pct', label: 'Agent share (%)' },
  { key: 'supervisor_pct', label: 'Supervisor share (%)' },
  { key: 'manager_pct', label: 'Operation Manager share (%)' },
] as const;

export function RulesTab({ products, onChanged }: Props) {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const save = async (product: any, values: Record<string, string>) => {
    const split = productRules(values);
    const rate = Number(values.commission_rate);
    if (!split || !Number.isFinite(rate) || rate < 0 || rate > 100 || values.commission_rate === '') return;
    setSaving(product.id);
    const { error } = await supabase.from('products').update({ ...split, commission_rate: rate }).eq('id', product.id);
    setSaving(null);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setDrafts(prev => { const next = { ...prev }; delete next[product.id]; return next; });
    toast({ title: `${product.name} commission saved` });
    onChanged();
  };
  return <section className="space-y-4">
    <h2 className="text-base font-semibold">Product commission rules</h2>
    {products.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      {products.map(product => {
        const values = drafts[product.id] ?? Object.fromEntries(fields.map(f => [f.key, product[f.key] == null ? '' : String(product[f.key])]));
        const split = productRules(values);
        const rate = Number(values.commission_rate);
        const valid = split && values.commission_rate !== '' && Number.isFinite(rate) && rate >= 0 && rate <= 100;
        const preview = productCommission(Number(product.unit_price || 0), values);
        const share = split ? 100 - split.agent_pct - split.supervisor_pct - split.manager_pct : null;
        return <article key={product.id} className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h3 className="font-medium">{product.name}</h3>
            <span className="font-mono text-sm text-muted-foreground">{formatCurrency(product.unit_price, product.currency)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`${product.id}-${f.key}`}>{f.label}</Label>
              <Input id={`${product.id}-${f.key}`} type="number" min="0" max="100" step="0.01" value={values[f.key]}
                onChange={e => setDrafts(prev => ({ ...prev, [product.id]: { ...values, [f.key]: e.target.value } }))} />
            </div>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={split ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
              {share == null ? 'Enter all shares; total cannot exceed 100%.' : `Deal Group share: ${share}%`}
            </span>
            <Button size="sm" onClick={() => save(product, values)} disabled={!valid || saving === product.id || !drafts[product.id]} className="gap-2">
              <Save className="h-4 w-4" />{saving === product.id ? 'Saving…' : 'Save'}
            </Button>
          </div>
          {preview && <dl className="grid grid-cols-2 gap-2 text-xs border-t border-border pt-3">
            <dt className="text-muted-foreground">Commission per unit</dt><dd className="text-right font-mono">{formatCurrency(preview.total, product.currency)}</dd>
            <dt className="text-muted-foreground">Agent</dt><dd className="text-right font-mono">{formatCurrency(preview.agent, product.currency)}</dd>
            <dt className="text-muted-foreground">Supervisor</dt><dd className="text-right font-mono">{formatCurrency(preview.supervisor, product.currency)}</dd>
            <dt className="text-muted-foreground">Operation Manager</dt><dd className="text-right font-mono">{formatCurrency(preview.operation_manager, product.currency)}</dd>
          </dl>}
        </article>;
      })}
    </div>
  </section>;
}
