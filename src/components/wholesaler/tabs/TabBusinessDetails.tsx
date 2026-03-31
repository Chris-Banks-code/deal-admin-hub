import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

import { WholesalerFormData, PRODUCT_CATEGORIES } from '../WholesalerFormTypes';

interface Props {
  form: WholesalerFormData;
  updateForm: (updates: Partial<WholesalerFormData>) => void;
}

export const TabBusinessDetails = ({ form, updateForm }: Props) => {
  const toggleCategory = (cat: string) => {
    const cats = form.product_categories.includes(cat)
      ? form.product_categories.filter(c => c !== cat)
      : [...form.product_categories, cat];
    updateForm({ product_categories: cats });
  };

  return (
    <div className="space-y-6">
      {/* Product Categories */}
      <div>
        <Label className="text-base font-semibold">Product Categories <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
          {PRODUCT_CATEGORIES.map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={form.product_categories.includes(cat)} onCheckedChange={() => toggleCategory(cat)} />
              {cat}
            </label>
          ))}
        </div>
        {form.product_categories.includes('Other') && (
          <Input className="mt-2 max-w-xs" placeholder="Specify other category" value={form.other_category} onChange={e => updateForm({ other_category: e.target.value })} />
        )}
      </div>

      {/* MOV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Minimum Order Value</Label>
          <div className="flex items-center gap-3">
            <Input type="number" step="0.01" value={form.minimum_order_value} onChange={e => updateForm({ minimum_order_value: e.target.value })} disabled={form.no_mov} placeholder="$0.00" className="flex-1" />
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <Checkbox checked={form.no_mov} onCheckedChange={(c) => updateForm({ no_mov: !!c, minimum_order_value: '' })} /> No MOV
            </label>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Payment Terms <span className="text-destructive">*</span></Label>
        <RadioGroup value={form.payment_terms} onValueChange={v => updateForm({ payment_terms: v })} className="flex gap-6">
          <div className="flex items-center gap-2"><RadioGroupItem value="cash_only" id="cash" /><Label htmlFor="cash">Cash Only</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="credit_only" id="credit" /><Label htmlFor="credit">Credit Only</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="both" id="both_pay" /><Label htmlFor="both_pay">Both</Label></div>
        </RadioGroup>
        {(form.payment_terms === 'credit_only' || form.payment_terms === 'both') && (
          <div className="space-y-2 max-w-xs">
            <Label>Credit Period (days)</Label>
            <Input type="number" value={form.credit_period} onChange={e => updateForm({ credit_period: e.target.value })} placeholder="e.g., 30" />
          </div>
        )}
      </div>

      {/* Delivery */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Delivery Options <span className="text-destructive">*</span></Label>
        <RadioGroup value={form.delivery_options} onValueChange={v => updateForm({ delivery_options: v })} className="flex gap-6">
          <div className="flex items-center gap-2"><RadioGroupItem value="own_delivery" id="own_del" /><Label htmlFor="own_del">Own Delivery</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="pickup_only" id="pickup" /><Label htmlFor="pickup">Pickup Only</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="both_delivery" id="both_del" /><Label htmlFor="both_del">Both</Label></div>
        </RadioGroup>
        <div className="space-y-2">
          <Label>Delivery Coverage Areas</Label>
          <Textarea value={form.delivery_coverage_areas} onChange={e => updateForm({ delivery_coverage_areas: e.target.value })} placeholder="e.g., Greater Monrovia, Paynesville, Sinkor..." rows={2} />
        </div>
      </div>

      {/* Operating Hours */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Operating Hours</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm w-28">Mon - Fri:</span>
            <Input type="time" value={form.operating_hours.weekday_start} onChange={e => updateForm({ operating_hours: { ...form.operating_hours, weekday_start: e.target.value } })} className="w-32" />
            <span className="text-sm">to</span>
            <Input type="time" value={form.operating_hours.weekday_end} onChange={e => updateForm({ operating_hours: { ...form.operating_hours, weekday_end: e.target.value } })} className="w-32" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm w-28">Saturday:</span>
            {form.operating_hours.saturday_closed ? (
              <span className="text-sm text-muted-foreground">Closed</span>
            ) : (
              <>
                <Input type="time" value={form.operating_hours.saturday_start} onChange={e => updateForm({ operating_hours: { ...form.operating_hours, saturday_start: e.target.value } })} className="w-32" />
                <span className="text-sm">to</span>
                <Input type="time" value={form.operating_hours.saturday_end} onChange={e => updateForm({ operating_hours: { ...form.operating_hours, saturday_end: e.target.value } })} className="w-32" />
              </>
            )}
            <label className="flex items-center gap-2 text-sm ml-2">
              <Checkbox checked={form.operating_hours.saturday_closed} onCheckedChange={(c) => updateForm({ operating_hours: { ...form.operating_hours, saturday_closed: !!c } })} /> Closed
            </label>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm w-28">Sunday:</span>
            {form.operating_hours.sunday_closed ? (
              <span className="text-sm text-muted-foreground">Closed</span>
            ) : (
              <>
                <Input type="time" value={form.operating_hours.sunday_start} onChange={e => updateForm({ operating_hours: { ...form.operating_hours, sunday_start: e.target.value } })} className="w-32" />
                <span className="text-sm">to</span>
                <Input type="time" value={form.operating_hours.sunday_end} onChange={e => updateForm({ operating_hours: { ...form.operating_hours, sunday_end: e.target.value } })} className="w-32" />
              </>
            )}
            <label className="flex items-center gap-2 text-sm ml-2">
              <Checkbox checked={form.operating_hours.sunday_closed} onCheckedChange={(c) => updateForm({ operating_hours: { ...form.operating_hours, sunday_closed: !!c } })} /> Closed
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
