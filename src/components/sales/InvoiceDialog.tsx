import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface Props {
  order: any | null;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ order, onOpenChange }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);

  useEffect(() => {
    if (!order) { setItems([]); setCustomer(null); setAgent(null); return; }
    (async () => {
      const [itemsRes, custRes, agentRes] = await Promise.all([
        (supabase.from as any)('sales_order_items').select('*').eq('sales_order_id', order.id),
        order.customer_id
          ? (supabase.from as any)('customers').select('id, default_delivery_address, parties(legal_name, display_name, address, phone, email)').eq('id', order.customer_id).maybeSingle()
          : Promise.resolve({ data: null }),
        order.agent_id
          ? supabase.from('profiles').select('full_name, phone, email').eq('id', order.agent_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setItems(itemsRes.data || []);
      setCustomer(custRes.data || null);
      setAgent(agentRes.data || null);
    })();
  }, [order]);

  const currency = 'LRD';
  const party = customer?.parties;

  const print = () => {
    const node = document.getElementById('invoice-printable');
    if (!node) return;
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) return;
    w.document.write(`<html><head><title>Invoice ${order?.order_number ?? ''}</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,sans-serif;padding:32px;color:#111}
        h1{font-size:20px;margin:0 0 4px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
        th,td{border-bottom:1px solid #e5e5e5;padding:8px;text-align:left}
        td:last-child,th:last-child{text-align:right}
        .muted{color:#666;font-size:12px}
        .totals{margin-top:16px;font-size:14px}
      </style></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice {order?.order_number}</DialogTitle>
          <DialogDescription>Receipt for this sales order.</DialogDescription>
        </DialogHeader>

        <div id="invoice-printable" className="space-y-4 max-h-[62vh] overflow-y-auto text-sm">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-lg font-semibold">Deal Group</h1>
              <p className="muted text-xs text-muted-foreground">Monrovia, Liberia</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold">{order?.order_number}</p>
              <p className="text-xs text-muted-foreground">{formatDate(order?.created_at)}</p>
              <Badge variant="outline" className="mt-1 text-xs capitalize">{String(order?.status ?? '').replace('_', ' ')}</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill to</p>
              <p className="font-medium">{party?.display_name || party?.legal_name || '—'}</p>
              <p className="text-xs text-muted-foreground">{order?.delivery_address || customer?.default_delivery_address || party?.address || '—'}</p>
              {party?.phone && <p className="text-xs text-muted-foreground">{party.phone}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Agent</p>
              <p className="font-medium">{agent?.full_name || '—'}</p>
              {agent?.phone && <p className="text-xs text-muted-foreground">{agent.phone}</p>}
              {order?.delivery_date && <p className="text-xs text-muted-foreground">Delivery: {formatDate(order.delivery_date)}</p>}
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="text-left py-2">Product</th>
                <th className="text-left py-2">Qty</th>
                <th className="text-left py-2">Unit</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t">
                  <td className="py-2">{it.product_name}</td>
                  <td className="py-2">{it.quantity}</td>
                  <td className="py-2 font-mono">{formatCurrency(it.unit_price, currency)}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(it.subtotal, currency)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No items</td></tr>
              )}
            </tbody>
          </table>

          <div className="totals flex justify-end">
            <div className="w-56 space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatCurrency(order?.subtotal, currency)}</span></div>
              <Separator />
              <div className="flex justify-between font-semibold"><span>Total</span>
                <span className="font-mono">{formatCurrency(order?.total ?? order?.subtotal, currency)}</span></div>
            </div>
          </div>

          {order?.notes && <p className="text-xs text-muted-foreground">Notes: {order.notes}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={print} className="gap-2"><Printer className="h-4 w-4" /> Print / Save PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
