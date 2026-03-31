import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Building2, Phone, MapPin, Briefcase, Landmark, FileText } from 'lucide-react';
import { WholesalerFormData } from '../WholesalerFormTypes';

interface Props {
  form: WholesalerFormData;
  uploadedFiles: Record<string, File | null>;
  editingWholesaler?: any;
  updateForm: (updates: Partial<WholesalerFormData>) => void;
}

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-semibold flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-sm space-y-1">{children}</CardContent>
  </Card>
);

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right max-w-[60%] truncate">{value || '—'}</span>
  </div>
);

const DOC_KEYS = [
  { key: 'business_license', label: 'Business License', required: true },
  { key: 'tax_certificate', label: 'Tax Certificate', required: true },
  { key: 'incorporation_cert', label: 'Certificate of Incorporation', required: true },
  { key: 'product_catalog', label: 'Product Catalog', required: false },
  { key: 'price_list', label: 'Price List', required: false },
];

export const TabReview = ({ form, uploadedFiles, editingWholesaler, updateForm }: Props) => {
  const maskAccount = (acc: string) => acc ? `****${acc.slice(-4)}` : '—';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={Building2} title="Company Information">
          <Field label="Name" value={form.company_name} />
          <Field label="Registration" value={form.business_registration_number} />
          <Field label="Tax ID" value={form.tax_id} />
          <Field label="Type" value={form.company_type} />
          <Field label="Year Est." value={form.year_established} />
        </Section>

        <Section icon={Phone} title="Contact Details">
          <Field label="Primary" value={form.contact_person} />
          <Field label="Phone" value={form.phone} />
          <Field label="Email" value={form.email} />
          {form.secondary_contact_name && <Field label="Secondary" value={form.secondary_contact_name} />}
        </Section>

        <Section icon={MapPin} title="Locations">
          <Field label="Primary Address" value={form.address} />
          <Field label="Coordinates" value={form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : undefined} />
          <Field label="Branches" value={`${form.branches.length} additional`} />
        </Section>

        <Section icon={Briefcase} title="Business Details">
          <Field label="Categories" value={form.product_categories.join(', ')} />
          <Field label="Payment" value={form.payment_terms?.replace('_', ' ')} />
          <Field label="Delivery" value={form.delivery_options?.replace('_', ' ')} />
        </Section>

        <Section icon={Landmark} title="Banking">
          <Field label="Bank" value={form.bank_name} />
          <Field label="Account" value={maskAccount(form.account_number)} />
          <Field label="Commission" value={form.default_commission_rate ? `${form.default_commission_rate}%` : undefined} />
        </Section>

        <Section icon={FileText} title="Documents">
          {DOC_KEYS.map(doc => {
            const hasNew = !!uploadedFiles[doc.key];
            const hasExisting = !!editingWholesaler?.[`${doc.key}_url`];
            const uploaded = hasNew || hasExisting;
            return (
              <div key={doc.key} className="flex items-center justify-between">
                <span className="text-muted-foreground">{doc.label}</span>
                {uploaded ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1"><Check className="h-3 w-3" /> Uploaded</Badge>
                ) : doc.required ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs gap-1"><X className="h-3 w-3" /> Missing</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Optional</span>
                )}
              </div>
            );
          })}
        </Section>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-sm font-semibold">Verification Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => updateForm({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending Verification</SelectItem>
                  <SelectItem value="inactive">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Verification</Label>
              <Select value={form.verification_status} onValueChange={v => updateForm({ verification_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {editingWholesaler?.verified_at && (
            <p className="text-xs text-muted-foreground">
              Verified on {new Date(editingWholesaler.verified_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
