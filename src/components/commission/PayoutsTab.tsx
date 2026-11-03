import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, BadgeCheck, Clock, Wallet, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { num } from '@/lib/finance';
import { buildWallet } from '@/lib/commissions';
import { StatCard } from '@/components/finance/StatCard';
import type { PayoutDraft } from './PayoutDialog';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  paid: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

interface Props {
  currency: string;
  deals: any[];
  salesOrders: any[];
  payouts: any[];
  bonuses: any[];
  profiles: any[];
  onChanged: () => void;
  onPay: (draft: PayoutDraft) => void;
}

const emptyDraft = (currency: string): PayoutDraft => ({
  profile_id: '',
  amount: '',
  currency,
  period: new Date().toISOString().slice(0, 7),
  status: 'paid',
  method: 'cash',
  bank_account_id: '',
  notes: '',
});

/** The payout ledger: what is queued, what is paid, and the history. */
export function PayoutsTab({ currency, deals, salesOrders, payouts, bonuses, profiles, onChanged, onPay }: Props) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const name = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const owed = useMemo(
    () => buildWallet({ deals, salesOrders, payouts, bonuses, currency }).reduce((s, r) => s + r.owed, 0),
    [deals, salesOrders, payouts, bonuses, currency],
  );

  const rows = useMemo(() => payouts.filter(p => (p.currency || 'LRD') === currency), [payouts, currency]);

  const paid = rows.filter(p => p.status === 'paid').reduce((s, p) => s + num(p.amount), 0);
  const queued = rows.filter(p => p.status === 'pending' || p.status === 'approved').reduce((s, p) => s + num(p.amount), 0);

  const visible = useMemo(() => rows.filter(p => {
    if (status !== 'all' && p.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (name(p.profile_id) || '').toLowerCase().includes(q) || (p.period || '').toLowerCase().includes(q);
  }), [rows, status, search, profiles]);

  const setStatusOf = async (row: any, next: string) => {
    const { error } = await (supabase.from as any)('commission_payouts').update({ status: next }).eq('id', row.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Payout ${next}` });
    onChanged();
  };

  const markPaid = async (row: any) => {
    const { error } = await (supabase.from as any)('commission_payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', row.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); return; }
    await (supabase.from as any)('payments').insert({
      direction: 'out',
      payment_date: new Date().toISOString().slice(0, 10),
      profile_id: row.profile_id,
      amount: num(row.amount),
      currency: row.currency,
      method: 'cash',
      reference: `Commission payout — ${row.period || ''}`.trim(),
      created_by: profile?.id ?? null,
    });
    toast({ title: 'Marked as paid' });
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Clock} label="Owed to the team" value={formatCurrency(owed, currency)} tone="warning"
          hint="Earned on sales, not yet paid" />
        <StatCard icon={Wallet} label="Queued payouts" value={formatCurrency(queued, currency)}
          hint="Pending and approved records" />
        <StatCard icon={BadgeCheck} label="Paid out" value={formatCurrency(paid, currency)} tone="success" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search person or period"
              className="h-9 w-[220px] pl-8 text-sm" />
          </div>
          <div className="inline-flex rounded-md border border-border/50 bg-card p-0.5">
            {['all', 'pending', 'approved', 'paid', 'cancelled'].map(s => (
              <Button key={s} size="sm" variant={status === s ? 'secondary' : 'ghost'}
                className="h-8 px-3 text-xs capitalize" onClick={() => setStatus(s)}>{s}</Button>
            ))}
          </div>
        </div>
        <Button className="gap-2" onClick={() => onPay(emptyDraft(currency))}>
          <Banknote className="h-4 w-4" /> Record payout
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Payout history — {currency}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid on</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No payouts match this filter.
                  </TableCell>
                </TableRow>
              )}
              {visible.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium">{name(p.profile_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.period || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${STATUS_STYLE[p.status] ?? ''}`}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(num(p.amount), p.currency)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => setStatusOf(p, 'approved')}>Approve</Button>
                      )}
                      {(p.status === 'pending' || p.status === 'approved') && (
                        <>
                          <Button size="sm" onClick={() => markPaid(p)}>Mark paid</Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatusOf(p, 'cancelled')}>Cancel</Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
