import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { lineCommission, splitCommission } from '@/lib/commissions';

interface Line {
  product_id: string;
  quantity: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function NewSaleDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ product_id: '', quantity: '1' }]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const [custRes, agentRes, prodRes] = await Promise.all([
        (supabase.from as any)('customers').select('id, party_id, default_delivery_address, assigned_agent_id, parties(legal_name, display_name, address)'),
        supabase.from('profiles').select('id, full_name, role').in('role', ['agent', 'sales_agent', 'supervisor']).eq('status', 'active').order('full_name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
      ]);
      setCustomers(custRes.data || []);
      setAgents(agentRes.data || []);
      setProducts(prodRes.data || []);
      setLoading(false);
    })();
  }, [open]);

  const reset = () => {
    setCustomerId(''); setAgentId(''); setDeliveryAddress(''); setDeliveryDate('');
    setNotes(''); setLines([{ product_id: '', quantity: '1' }]);
  };

  const customerName = (c: any) => c?.parties?.display_name || c?.parties?.legal_name || 'Unnamed';

  const onCustomerChange = (id: string) => {
    setCustomerId(id);
    const c = customers.find(x => x.id === id);
    if (c) {
      setDeliveryAddress(c.default_delivery_address || c.parties?.address || '');
      if (c.assigned_agent_id) setAgentId(c.assigned_agent_id);
    }
  };

  const computed = useMemo(() => {
    const rows = lines.map(l => {
      const p = products.find(x => x.id === l.product_id);
      const qty = Number(l.quantity) || 0;
      const unit = Number(p?.unit_price) || 0;
      const subtotal = unit * qty;
      const commission = lineCommission(subtotal, p?.commission_rate);
      return { line: l, product: p, qty, unit, subtotal, commission };
    });
    const subtotal = rows.reduce((s, r) => s + r.subtotal, 0);
    const commission = rows.reduce((s, r) => s + r.commission, 0);
    const currency = rows.find(r => r.product)?.product?.currency || 'LRD';
    return { rows, subtotal, commission, split: splitCommission(commission), currency };
  }, [lines, products]);

  const addLine = () => setLines(l => [...l, { product_id: '', quantity: '1' }]);
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines(l => l.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const save = async (status: 'draft' | 'pending_approval') => {
    if (!customerId) { toast({ title: 'Select a customer', variant: 'destructive' }); return; }
    if (!agentId) { toast({ title: 'Select an agent', variant: 'destructive' }); return; }
    const valid = computed.rows.filter(r => r.product && r.qty > 0);
    if (!valid.length) { toast({ title: 'Add at least one product', variant: 'destructive' }); return; }

    setSaving(true);
    const { data: order, error } = await (supabase.from as any)('sales_orders').insert({
      customer_id: customerId,
      agent_id: agentId,
      status,
      subtotal: computed.subtotal,
      total: computed.subtotal,
      agent_commission_total: computed.split.agent,
      supervisor_commission_total: computed.split.supervisor,
      manager_commission_total: computed.split.operation_manager,
      delivery_address: deliveryAddress || null,
      delivery_date: deliveryDate || null,
      notes: notes.trim() || null,
    }).select().single();

    if (error || !order) {
      toast({ title: 'Error', description: error?.message ?? 'Could not create sale', variant: 'destructive' });
      setSaving(false);
      return;
    }

    const items = valid.map(r => ({
      sales_order_id: order.id,
      product_id: r.product.id,
      supplier_id: null,
      product_name: r.product.name,
      quantity: r.qty,
      unit_price: r.unit,
      subtotal: r.subtotal,
      commission_rate: r.product.commission_rate ?? 0,
      commission_amount: r.commission,
    }));

    const { error: itemsError } = await (supabase.from as any)('sales_order_items').insert(items);
    if (itemsError) {
      toast({ title: 'Error saving items', description: itemsError.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    toast({ title: status === 'draft' ? 'Draft saved' : 'Sale submitted for approval', description: order.order_number });
    setSaving(false);
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> New Sale</DialogTitle>
          <DialogDescription>Create a sales order for a customer and submit it for approval.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={customerId} onValueChange={onCustomerChange}>
                <SelectTrigger><SelectValue placeholder={loading ? 'Loading…' : 'Select customer'} /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{customerName(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agent *</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addLine}>
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>

            {computed.rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7 space-y-1">
                  <Select value={r.line.product_id} onValueChange={v => updateLine(i, { product_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.unit_price, p.currency || 'LRD')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input type="number" min={1} value={r.line.quantity} onChange={e => updateLine(i, { quantity: e.target.value })} />
                </div>
                <div className="col-span-2 text-sm text-right font-mono text-muted-foreground truncate">
                  {formatCurrency(r.subtotal, r.product?.currency || computed.currency)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive"
                    onClick={() => removeLine(i)} disabled={lines.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Delivery address</Label>
              <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Delivery date</Label>
              <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-semibold">{formatCurrency(computed.subtotal, computed.currency)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total commission</span>
              <span className="font-mono">{formatCurrency(computed.commission, computed.currency)}</span></div>
            <Separator className="my-1" />
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Agent (60%)</span>
              <span className="font-mono">{formatCurrency(computed.split.agent, computed.currency)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Supervisor (25%)</span>
              <span className="font-mono">{formatCurrency(computed.split.supervisor, computed.currency)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Operation manager (15%)</span>
              <span className="font-mono">{formatCurrency(computed.split.operation_manager, computed.currency)}</span></div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => save('draft')} disabled={saving}>Save draft</Button>
          <Button onClick={() => save('pending_approval')} disabled={saving}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
