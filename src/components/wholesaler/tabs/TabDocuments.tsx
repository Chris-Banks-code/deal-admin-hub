import { useRef } from 'react';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileText, ExternalLink } from 'lucide-react';
import { WholesalerFormData } from '../WholesalerFormTypes';

interface Props {
  form: WholesalerFormData;
  updateForm: (updates: Partial<WholesalerFormData>) => void;
  uploadedFiles: Record<string, File | null>;
  setUploadedFiles: (files: Record<string, File | null>) => void;
  editingWholesaler?: any;
}

const DOC_TYPES = [
  { key: 'business_license', label: 'Business License', required: true },
  { key: 'tax_certificate', label: 'Tax Certificate', required: true },
  { key: 'incorporation_cert', label: 'Certificate of Incorporation', required: true },
  { key: 'product_catalog', label: 'Product Catalog', required: false },
  { key: 'price_list', label: 'Price List', required: false },
];

const FileUpload = ({ docType, label, required, file, existingUrl, onFileSelect, onRemove }: {
  docType: string; label: string; required: boolean; file: File | null;
  existingUrl?: string; onFileSelect: (f: File) => void; onRemove: () => void;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const hasFile = file || existingUrl;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{label} {required && <span className="text-destructive">*</span>}</p>
              {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
              {!file && existingUrl && <p className="text-xs text-emerald-600">Previously uploaded</p>}
              {!hasFile && <p className="text-xs text-muted-foreground">PDF, JPG, PNG, XLSX, DOCX (max 10MB)</p>}
            </div>
          </div>
          <div className="flex gap-2">
            {existingUrl && !file && (
              <Button variant="ghost" size="sm" asChild>
                <a href={existingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
              </Button>
            )}
            {hasFile && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onRemove}><X className="h-4 w-4" /></Button>
            )}
            <Button variant="outline" size="sm" onClick={() => ref.current?.click()} className="gap-1">
              <Upload className="h-4 w-4" /> {hasFile ? 'Replace' : 'Upload'}
            </Button>
          </div>
        </div>
        <input ref={ref} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
          onChange={e => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }} />
      </CardContent>
    </Card>
  );
};

export const TabDocuments = ({ form, updateForm, uploadedFiles, setUploadedFiles, editingWholesaler }: Props) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Document Uploads</h3>
      <div className="space-y-3">
        {DOC_TYPES.map(doc => (
          <FileUpload
            key={doc.key}
            docType={doc.key}
            label={doc.label}
            required={doc.required}
            file={uploadedFiles[doc.key] || null}
            existingUrl={editingWholesaler?.[`${doc.key}_url`]}
            onFileSelect={f => setUploadedFiles({ ...uploadedFiles, [doc.key]: f })}
            onRemove={() => setUploadedFiles({ ...uploadedFiles, [doc.key]: null })}
          />
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Additional Information</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Certifications</Label>
          <Textarea value={form.certifications} onChange={e => updateForm({ certifications: e.target.value })} placeholder="e.g., ISO 9001, HACCP" rows={2} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Storage Facilities</Label>
            <div className="flex items-center gap-3">
              <Switch checked={form.storage_facilities} onCheckedChange={c => updateForm({ storage_facilities: c })} />
              <span className="text-sm">{form.storage_facilities ? 'Yes' : 'No'}</span>
            </div>
            {form.storage_facilities && (
              <Textarea value={form.storage_description} onChange={e => updateForm({ storage_description: e.target.value })} placeholder="Describe facilities..." rows={2} className="mt-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>Cold Storage</Label>
            <div className="flex items-center gap-3">
              <Switch checked={form.cold_storage} onCheckedChange={c => updateForm({ cold_storage: c })} />
              <span className="text-sm">{form.cold_storage ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Special Services</Label>
          <Textarea value={form.special_services} onChange={e => updateForm({ special_services: e.target.value })} placeholder="e.g., Installation, Training, Warranty" rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Credit References</Label>
          <Textarea value={form.credit_references} onChange={e => updateForm({ credit_references: e.target.value })} placeholder="Optional credit references..." rows={2} />
        </div>
      </div>
    </div>

    <div className="border-t pt-4">
      <h3 className="text-lg font-semibold text-foreground mb-2">Admin Notes</h3>
      <p className="text-xs text-muted-foreground mb-2">Internal use only — not visible to wholesaler</p>
      <Textarea value={form.admin_notes} onChange={e => updateForm({ admin_notes: e.target.value })} placeholder="Internal notes..." rows={3} />
    </div>
  </div>
);
