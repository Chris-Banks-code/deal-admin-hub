import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WholesalerFormData, COMPANY_TYPES } from '../WholesalerFormTypes';

interface Props {
  form: WholesalerFormData;
  updateForm: (updates: Partial<WholesalerFormData>) => void;
}

export const TabCompanyInfo = ({ form, updateForm }: Props) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-foreground">Company Information</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2 md:col-span-2">
        <Label>Company Name <span className="text-destructive">*</span></Label>
        <Input value={form.company_name} onChange={e => updateForm({ company_name: e.target.value })} placeholder="e.g., Monrovia Trading Co." />
      </div>
      <div className="space-y-2">
        <Label>Business Registration Number <span className="text-destructive">*</span></Label>
        <Input value={form.business_registration_number} onChange={e => updateForm({ business_registration_number: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Tax ID / TIN Number <span className="text-destructive">*</span></Label>
        <Input value={form.tax_id} onChange={e => updateForm({ tax_id: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Company Type <span className="text-destructive">*</span></Label>
        <Select value={form.company_type} onValueChange={v => updateForm({ company_type: v })}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {COMPANY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Year Established</Label>
        <Input type="number" min={1900} max={new Date().getFullYear()} value={form.year_established} onChange={e => updateForm({ year_established: e.target.value })} placeholder="e.g., 2005" />
      </div>
      <div className="space-y-2">
        <Label>Company Email</Label>
        <Input type="email" value={form.company_email} onChange={e => updateForm({ company_email: e.target.value })} placeholder="info@company.com" />
      </div>
      <div className="space-y-2">
        <Label>Company Website</Label>
        <Input type="url" value={form.company_website} onChange={e => updateForm({ company_website: e.target.value })} placeholder="https://www.company.com" />
      </div>
    </div>
  </div>
);
