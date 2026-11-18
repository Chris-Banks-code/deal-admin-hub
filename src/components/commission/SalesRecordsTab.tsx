import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

const db = supabase as any;
const REASONS = [['original_agent_inactive', 'Original agent inactive'], ['retailer_request', 'Retailer requested'], ['management_approval', 'Management approved'], ['retailer_inactive', 'Retailer inactive']];

export function SalesRecordsTab({ profiles }: { profiles: any[] }) {
  const { toast } = useToast();
  const [deals, setDeals] = useState<any[]>([]); const [items, setItems] = useState<any[]>([]); const [allocs, setAllocs] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]); const [log, setLog] = useState<any[]>([]); const [days, setDays] = useState(30);
  const [form, setForm] = useState({ client: '', agent: '', reason: 'retailer_request' });
  const load = async () => {
    const [d, i, a, c, l, s] = await Promise.all([
      db.from('deals').select('*').order('created_at', { ascending: false }).limit(300),
      db.from('order_items').select('*'), db.from('commission_allocations').select('*'),
      db.from('clients').select('id,company_name,assigned_agent_id').eq('client_type', 'retailer').order('company_name'),
      db.from('retailer_ownership_log').select('*').order('created_at', { ascending: false }),
      db.from('app_settings').select('value').eq('key', 'reassignment_inactive_days').maybeSingle()]);
    setDeals(d.data || []); setItems(i.data || []); setAllocs(a.data || []); setRetailers(c.data || []); setLog(l.data || []);
    if (s.data) setDays(Number(s.data.value));
  };
  useEffect(() => { load(); }, []);
  const name = (id?: string) => profiles.find(p => p.id === id)?.full_name || '—';
  const client = (id?: string) => retailers.find(c => c.id === id)?.company_name || '—';
  const rows = useMemo(() => deals.filter(d => allocs.some(a => a.deal_id === d.id)).map(d => {
    const a = allocs.filter(x => x.deal_id === d.id); const sum = (f: (x: any) => boolean) => a.filter(f).reduce((s, x) => s + Number(x.amount), 0);
    const its = items.filter(i => i.deal_id === d.id);
    return { d, its, cur: a[0]?.currency, pending: sum(x => x.status === 'pending'), payable: sum(x => x.status === 'payable'), paid: sum(x => x.status === 'paid'), deal: sum(x => x.role === 'deal' || x.recipient_role === 'deal') };
  }), [deals, allocs, items]);
  const reassign = async () => {
    const { error } = await db.rpc('reassign_retailer', { _client: form.client, _new_agent: form.agent, _reason: form.reason });
    if (error) return toast({ title: 'Could not reassign', description: error.message, variant: 'destructive' });
    toast({ title: 'Retailer reassigned' }); load();
  };
  const saveDays = async () => {
    const { error } = await db.from('app_settings').upsert({ key: 'reassignment_inactive_days', value: days });
    toast(error ? { title: 'Could not save', description: error.message, variant: 'destructive' } : { title: 'Setting saved' });
  };
  const sel = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
  return <div className="space-y-6">
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h2 className="text-base font-semibold">Sales records (pool products)</h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No orders for pool-rule products yet.</p> :
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="text-muted-foreground"><tr>
        {['Order', 'Retailer', 'Owner', 'Creator', 'Type', 'Supervisor', 'Region', 'Vehicle agent', 'Product', 'Ordered', 'Delivered', 'Ordered on', 'Delivered on', 'Status', 'Pending', 'Payable', 'Paid', 'DEAL'].map(h => <th key={h} className="p-1 text-left whitespace-nowrap">{h}</th>)}
      </tr></thead><tbody>{rows.map(({ d, its, cur, pending, payable, paid, deal }) => <tr key={d.id} className="border-t border-border whitespace-nowrap">
        <td className="p-1 font-mono">{d.deal_number}</td><td className="p-1">{d.retailer_name || client(d.retailer_id)}</td><td className="p-1">{name(d.retailer_owner_id)}</td>
        <td className="p-1">{name(d.agent_id)}</td><td className="p-1">{d.creator_type || profiles.find(p => p.id === d.agent_id)?.agent_type || 'remote'}</td>
        <td className="p-1">{name(profiles.find(p => p.id === d.agent_id)?.supervisor_id)}</td><td className="p-1">{d.region || '—'}</td><td className="p-1">{name(d.delivered_by)}</td>
        <td className="p-1">{its.map((i: any) => i.product_name).join(', ')}</td><td className="p-1">{its.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}</td>
        <td className="p-1">{its.reduce((s: number, i: any) => s + (i.quantity_delivered ?? (d.status === 'delivered' ? i.quantity : 0) ?? 0), 0)}</td>
        <td className="p-1">{d.created_at?.slice(0, 10)}</td><td className="p-1">{d.delivered_at?.slice(0, 10) || d.delivery_date || '—'}</td><td className="p-1">{d.status}</td>
        {[pending, payable, paid, deal].map((v, k) => <td key={k} className="p-1 font-mono text-right">{formatCurrency(v, cur)}</td>)}
      </tr>)}</tbody></table></div>}
    </section>
    <section className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h2 className="text-base font-semibold">Retailer ownership</h2>
      <div className="flex flex-wrap gap-2 items-center">
        <select aria-label="Retailer" className={sel} value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}>
          <option value="">Retailer…</option>{retailers.map(c => <option key={c.id} value={c.id}>{c.company_name} ({name(c.assigned_agent_id)})</option>)}</select>
        <select aria-label="New agent" className={sel} value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })}>
          <option value="">New owner…</option>{profiles.filter(p => p.role === 'agent' || p.role === 'supervisor').map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
        <select aria-label="Reason" className={sel} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}{v === 'retailer_inactive' ? ` ${days}+ days` : ''}</option>)}</select>
        <Button size="sm" disabled={!form.client || !form.agent} onClick={reassign}>Reassign</Button>
        <span className="ml-auto flex items-center gap-2 text-xs">Inactive after
          <input aria-label="Inactive days" type="number" min="1" className={`${sel} w-20`} value={days} onChange={e => setDays(Number(e.target.value))} /> days
          <Button size="sm" variant="outline" onClick={saveDays}>Save</Button></span>
      </div>
      {log.length > 0 && <table className="w-full text-xs"><thead className="text-muted-foreground"><tr>{['Date', 'Retailer', 'From', 'To', 'Reason', 'Approved by'].map(h => <th key={h} className="p-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{log.map(l => <tr key={l.id} className="border-t border-border"><td className="p-1">{l.created_at.slice(0, 10)}</td><td className="p-1">{client(l.client_id)}</td>
          <td className="p-1">{name(l.previous_agent_id)}</td><td className="p-1">{name(l.new_agent_id)}</td><td className="p-1">{REASONS.find(r => r[0] === l.reason)?.[1]}</td><td className="p-1">{name(l.approved_by)}</td></tr>)}</tbody></table>}
    </section>
  </div>;
}
