import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Landmark, ListTree, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { ACCOUNT_TYPES, CURRENCIES, num } from '@/lib/finance';

interface Props {
  accounts: any[];
  banks: any[];
  onChanged: () => void;
}

export function AccountsTab({ accounts, banks, onChanged }: Props) {
  const { toast } = useToast();
  const [acct, setAcct] = useState<any | null>(null);
  const [bank, setBank] = useState<any | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(
    () => accounts.filter(a => typeFilter === 'all' || a.type === typeFilter),
    [accounts, typeFilter],
  );

  const saveAccount = async () => {
    if (!acct.code || !acct.name) { toast({ title: 'Code and name are required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { code: acct.code, name: acct.name, type: acct.type, subtype: acct.subtype || null, is_active: acct.is_active };
    const t = (supabase.from as any)('chart_of_accounts');
    const { error } = acct.id ? await t.update(payload).eq('id', acct.id) : await t.insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Account saved' });
    setAcct(null);
    onChanged();
  };

  const saveBank = async () => {
    if (!bank.name) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      name: bank.name, kind: bank.kind, bank_name: bank.bank_name || null,
      account_number: bank.account_number || null, currency: bank.currency,
      opening_balance: Number(bank.opening_balance || 0), is_active: bank.is_active,
    };
    const t = (supabase.from as any)('bank_accounts');
    const { error } = bank.id ? await t.update(payload).eq('id', bank.id) : await t.insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Account saved' });
    setBank(null);
    onChanged();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" /> Bank & cash accounts</CardTitle>
          <Button size="sm" className="gap-2" onClick={() => setBank({
            id: null, name: '', kind: 'bank', bank_name: '', account_number: '',
            currency: 'LRD', opening_balance: '0', is_active: true,
          })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Number</TableHead>
                <TableHead className="text-right">Opening balance</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No bank or cash accounts yet.
                </TableCell></TableRow>
              )}
              {banks.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-sm font-medium">{b.name}</TableCell>
                  <TableCell className="text-sm capitalize">{String(b.kind).replace('_', ' ')}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.bank_name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{b.account_number || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(num(b.opening_balance), b.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setBank({ ...b, opening_balance: String(b.opening_balance ?? 0) })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><ListTree className="h-4 w-4" /> Chart of accounts</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-2"
              onClick={() => setAcct({ id: null, code: '', name: '', type: 'expense', subtype: '', is_active: true })}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.code}</TableCell>
                  <TableCell className="text-sm">{a.name}</TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">{a.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={a.is_active
                      ? 'border-success/20 bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAcct({ ...a, subtype: a.subtype || '' })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!acct} onOpenChange={o => { if (!o) setAcct(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{acct?.id ? 'Edit account' : 'New account'}</DialogTitle></DialogHeader>
          {acct && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={acct.code} onChange={e => setAcct({ ...acct, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={acct.type} onValueChange={v => setAcct({ ...acct, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name</Label>
                <Input value={acct.name} onChange={e => setAcct({ ...acct, name: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Status</Label>
                <Select value={acct.is_active ? 'active' : 'inactive'}
                  onValueChange={v => setAcct({ ...acct, is_active: v === 'active' })}>
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
            <Button variant="outline" onClick={() => setAcct(null)}>Cancel</Button>
            <Button onClick={saveAccount} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!bank} onOpenChange={o => { if (!o) setBank(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{bank?.id ? 'Edit account' : 'New bank or cash account'}</DialogTitle></DialogHeader>
          {bank && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name</Label>
                <Input value={bank.name} placeholder="Main cash box"
                  onChange={e => setBank({ ...bank, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={bank.kind} onValueChange={v => setBank({ ...bank, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={bank.currency} onValueChange={v => setBank({ ...bank, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bank name</Label>
                <Input value={bank.bank_name} onChange={e => setBank({ ...bank, bank_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Account number</Label>
                <Input value={bank.account_number} onChange={e => setBank({ ...bank, account_number: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Opening balance</Label>
                <Input type="number" step="0.01" value={bank.opening_balance}
                  onChange={e => setBank({ ...bank, opening_balance: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBank(null)}>Cancel</Button>
            <Button onClick={saveBank} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
