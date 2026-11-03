import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, HandCoins, BadgeCheck, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { buildWallet } from '@/lib/commissions';
import { StatCard } from '@/components/finance/StatCard';
import type { PayoutDraft } from './PayoutDialog';

const ROLE_LABEL: Record<string, string> = {
  agent: 'Agent',
  supervisor: 'Supervisor',
  operation_manager: 'Operation Manager',
};

interface Props {
  currency: string;
  deals: any[];
  salesOrders: any[];
  payouts: any[];
  bonuses: any[];
  profiles: any[];
  onPay: (draft: PayoutDraft) => void;
}

/** Each person's running commission balance: earned + bonuses − paid. */
export function WalletTab({ currency, deals, salesOrders, payouts, bonuses, profiles, onPay }: Props) {
  const name = (id: string) => profiles.find(p => p.id === id)?.full_name || 'Unknown';

  const rows = useMemo(
    () => buildWallet({ deals, salesOrders, payouts, bonuses, currency }),
    [deals, salesOrders, payouts, bonuses, currency],
  );

  const totals = rows.reduce(
    (t, r) => ({
      earned: t.earned + r.earned,
      bonuses: t.bonuses + r.bonuses,
      paid: t.paid + r.paid,
      owed: t.owed + r.owed,
    }),
    { earned: 0, bonuses: 0, paid: 0, owed: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HandCoins} label="Commission earned" value={formatCurrency(totals.earned, currency)} />
        <StatCard icon={BadgeCheck} label="Bonuses owed" value={formatCurrency(totals.bonuses, currency)} />
        <StatCard icon={Wallet} label="Already paid" value={formatCurrency(totals.paid, currency)} tone="success" />
        <StatCard icon={Clock} label="Balance still owed" value={formatCurrency(totals.owed, currency)} tone="warning" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Wallet balances — {currency}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role on sales</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Bonuses</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nobody has earned commission in {currency} yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(r => (
                <TableRow key={r.profile_id}>
                  <TableCell className="text-sm font-medium">{name(r.profile_id)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-wrap gap-1">
                      {r.roles.map(x => (
                        <Badge key={x} variant="outline" className="text-[10px]">{ROLE_LABEL[x] ?? x}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{r.orders}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(r.earned, currency)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(r.bonuses, currency)}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-success">{formatCurrency(r.paid, currency)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(r.owed, currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={r.owed <= 0}
                      onClick={() => onPay({
                        profile_id: r.profile_id,
                        amount: String(Math.round(r.owed * 100) / 100),
                        currency,
                        period: new Date().toISOString().slice(0, 7),
                        status: 'paid',
                        method: 'cash',
                        bank_account_id: '',
                        notes: '',
                      })}>
                      Pay
                    </Button>
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
