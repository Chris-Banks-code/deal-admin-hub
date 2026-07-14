import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WholesalerFormData, LIBERIAN_BANKS } from '../WholesalerFormTypes';

interface Props {
  form: WholesalerFormData;
  updateForm: (updates: Partial<WholesalerFormData>) => void;
}

export const TabBanking = ({ form, updateForm }: Props) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Banking Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bank Name</Label>
          <Select value={form.bank_name} onValueChange={v => updateForm({ bank_name: v })}>
            <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
            <SelectContent>
              {LIBERIAN_BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Account Name</Label>
          <Input value={form.account_name} onChange={e => updateForm({ account_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Account Number</Label>
          <Input value={form.account_number} onChange={e => updateForm({ account_number: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Bank Branch</Label>
          <Input value={form.bank_branch} onChange={e => updateForm({ bank_branch: e.target.value })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">All banking fields are optional and can be added later.</p>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Commission & Pricing</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Default Commission Rate (%)</Label>
          <Input type="number" min={0} max={100} step={0.1} value={form.default_commission_rate} onChange={e => updateForm({ default_commission_rate: e.target.value })} placeholder="e.g., 5.5" />
        </div>
        <div className="space-y-2">
          <Label>Bulk Discount Available</Label>
          <div className="flex items-center gap-3 pt-1">
            <Switch checked={form.bulk_discount_available} onCheckedChange={c => updateForm({ bulk_discount_available: c })} />
            <span className="text-sm">{form.bulk_discount_available ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
