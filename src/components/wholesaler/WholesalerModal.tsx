import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WholesalerFormData, emptyWholesalerForm, BranchForm } from './WholesalerFormTypes';
import { TabCompanyInfo } from './tabs/TabCompanyInfo';
import { TabContacts } from './tabs/TabContacts';
import { TabLocation } from './tabs/TabLocation';
import { TabBusinessDetails } from './tabs/TabBusinessDetails';
import { TabBanking } from './tabs/TabBanking';
import { TabDocuments } from './tabs/TabDocuments';
import { TabReview } from './tabs/TabReview';

const TAB_LABELS = ['Company', 'Contacts', 'Location', 'Business', 'Banking', 'Documents', 'Review'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWholesaler?: any;
  onSaved: () => void;
}

export const WholesalerModal = ({ open, onOpenChange, editingWholesaler, onSaved }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState<WholesalerFormData>(emptyWholesalerForm);
  const [saving, setSaving] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({});
  const [existingBranches, setExistingBranches] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setActiveTab(0);
      if (editingWholesaler) {
        populateForm(editingWholesaler);
        fetchBranches(editingWholesaler.id);
      } else {
        setForm(emptyWholesalerForm);
        setExistingBranches([]);
        setUploadedFiles({});
      }
    }
  }, [open, editingWholesaler]);

  const fetchBranches = async (wholesalerId: string) => {
    const { data } = await supabase.from('wholesaler_locations').select('*').eq('wholesaler_id', wholesalerId);
    setExistingBranches(data || []);
    if (data && data.length > 0) {
      setForm(f => ({
        ...f,
        branches: data.map((b: any) => ({
          id: b.id,
          branch_name: b.branch_name || '',
          address: b.address || '',
          phone: '',
          manager_name: '',
          latitude: b.latitude?.toString() || '',
          longitude: b.longitude?.toString() || '',
        })),
      }));
    }
  };

  const populateForm = (w: any) => {
    const hours = w.operating_hours || {};
    setForm({
      company_name: w.company_name || '',
      business_registration_number: w.business_registration_number || '',
      tax_id: w.tax_id || '',
      company_type: w.company_type || '',
      year_established: w.year_established?.toString() || '',
      company_email: w.company_email || '',
      company_website: w.company_website || '',
      contact_person: w.contact_person || '',
      phone: w.phone || '',
      email: w.company_email || '',
      secondary_contact_name: w.secondary_contact_name || '',
      secondary_contact_phone: w.secondary_contact_phone || '',
      address: w.address || '',
      latitude: w.latitude?.toString() || '',
      longitude: w.longitude?.toString() || '',
      branches: [],
      product_categories: w.product_categories || [],
      other_category: '',
      minimum_order_value: w.minimum_order_value?.toString() || '',
      no_mov: w.no_mov || false,
      payment_terms: w.payment_terms || '',
      credit_period: w.credit_period?.toString() || '',
      delivery_options: w.delivery_options || '',
      delivery_coverage_areas: w.delivery_coverage_areas || '',
      operating_hours: {
        weekday_start: hours.weekday_start || '08:00',
        weekday_end: hours.weekday_end || '18:00',
        saturday_start: hours.saturday_start || '08:00',
        saturday_end: hours.saturday_end || '14:00',
        saturday_closed: hours.saturday_closed || false,
        sunday_start: hours.sunday_start || '',
        sunday_end: hours.sunday_end || '',
        sunday_closed: hours.sunday_closed ?? true,
      },
      bank_name: w.bank_name || '',
      account_name: w.account_name || '',
      account_number: w.account_number || '',
      bank_branch: w.bank_branch || '',
      default_commission_rate: w.default_commission_rate?.toString() || '',
      bulk_discount_available: w.bulk_discount_available || false,
      certifications: w.certifications || '',
      storage_facilities: w.storage_facilities || false,
      storage_description: w.storage_description || '',
      cold_storage: w.cold_storage || false,
      special_services: w.special_services || '',
      credit_references: w.credit_references || '',
      admin_notes: w.notes || '',
      status: w.status || 'active',
      verification_status: w.verification_status || 'unverified',
    });
    setUploadedFiles({});
  };

  const updateForm = (updates: Partial<WholesalerFormData>) => {
    setForm(f => ({ ...f, ...updates }));
  };

  const validateTab = (tabIndex: number): boolean => {
    switch (tabIndex) {
      case 0:
        return !!(form.company_name && form.business_registration_number && form.tax_id && form.company_type);
      case 1:
        return !!(form.contact_person && form.phone && form.email);
      case 2:
        return !!form.address;
      case 3:
        return form.product_categories.length > 0 && !!form.payment_terms && !!form.delivery_options;
      case 4:
        return !!(form.bank_name && form.account_name && form.account_number && form.default_commission_rate);
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!validateTab(activeTab)) {
      toast({ title: 'Incomplete', description: 'Please fill all required fields before proceeding.', variant: 'destructive' });
      return;
    }
    setActiveTab(t => Math.min(t + 1, 6));
  };

  const goPrev = () => setActiveTab(t => Math.max(t - 1, 0));

  const uploadFile = async (file: File, wholesalerId: string, docType: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${wholesalerId}/${docType}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('wholesaler-documents').upload(path, file);
    if (error) {
      console.error('Upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('wholesaler-documents').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSave = async (verify: boolean = false) => {
    if (!validateTab(0) || !validateTab(1) || !validateTab(2)) {
      toast({ title: 'Validation Error', description: 'Please complete all required tabs.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const categories = form.product_categories.includes('Other') && form.other_category
        ? [...form.product_categories.filter(c => c !== 'Other'), form.other_category]
        : form.product_categories;

      const clientData: Record<string, any> = {
        client_type: 'wholesaler',
        company_name: form.company_name.trim(),
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        business_registration_number: form.business_registration_number.trim() || null,
        tax_id: form.tax_id.trim() || null,
        company_type: form.company_type || null,
        year_established: form.year_established ? parseInt(form.year_established) : null,
        company_email: form.company_email.trim() || form.email.trim() || null,
        company_website: form.company_website.trim() || null,
        secondary_contact_name: form.secondary_contact_name.trim() || null,
        secondary_contact_phone: form.secondary_contact_phone.trim() || null,
        product_categories: categories,
        minimum_order_value: form.minimum_order_value ? parseFloat(form.minimum_order_value) : null,
        no_mov: form.no_mov,
        payment_terms: form.payment_terms || null,
        credit_period: form.credit_period ? parseInt(form.credit_period) : null,
        delivery_options: form.delivery_options || null,
        delivery_coverage_areas: form.delivery_coverage_areas.trim() || null,
        operating_hours: form.operating_hours,
        bank_name: form.bank_name || null,
        account_name: form.account_name.trim() || null,
        account_number: form.account_number.trim() || null,
        bank_branch: form.bank_branch.trim() || null,
        default_commission_rate: form.default_commission_rate ? parseFloat(form.default_commission_rate) : null,
        bulk_discount_available: form.bulk_discount_available,
        certifications: form.certifications.trim() || null,
        storage_facilities: form.storage_facilities,
        storage_description: form.storage_facilities ? form.storage_description.trim() || null : null,
        cold_storage: form.cold_storage,
        special_services: form.special_services.trim() || null,
        credit_references: form.credit_references.trim() || null,
        notes: form.admin_notes.trim() || null,
        status: form.status,
        verification_status: verify ? 'verified' : form.verification_status,
      };

      if (verify && user) {
        clientData.verified_by_admin_id = user.id;
        clientData.verified_at = new Date().toISOString();
      }

      if (!editingWholesaler && user) {
        clientData.added_by_admin_id = user.id;
      }

      let wholesalerId: string;

      if (editingWholesaler) {
        const { error } = await supabase.from('clients').update(clientData).eq('id', editingWholesaler.id);
        if (error) throw error;
        wholesalerId = editingWholesaler.id;
      } else {
        const { data, error } = await supabase.from('clients').insert(clientData).select('id').single();
        if (error) throw error;
        wholesalerId = data.id;
      }

      // Upload files
      for (const [docType, file] of Object.entries(uploadedFiles)) {
        if (file) {
          const url = await uploadFile(file, wholesalerId, docType);
          if (url) {
            const urlField = `${docType}_url`;
            await supabase.from('clients').update({ [urlField]: url } as any).eq('id', wholesalerId);
          }
        }
      }

      // Save branches
      for (const branch of form.branches) {
        if (!branch.branch_name || !branch.address) continue;
        const branchData = {
          wholesaler_id: wholesalerId,
          branch_name: branch.branch_name,
          address: branch.address,
          latitude: branch.latitude ? parseFloat(branch.latitude) : 0,
          longitude: branch.longitude ? parseFloat(branch.longitude) : 0,
        };
        if (branch.id) {
          await supabase.from('wholesaler_locations').update(branchData).eq('id', branch.id);
        } else {
          await supabase.from('wholesaler_locations').insert(branchData);
        }
      }

      toast({ title: editingWholesaler ? 'Wholesaler updated' : 'Wholesaler registered', description: verify ? 'Wholesaler has been verified.' : undefined });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const tabContent = [
    <TabCompanyInfo key={0} form={form} updateForm={updateForm} />,
    <TabContacts key={1} form={form} updateForm={updateForm} />,
    <TabLocation key={2} form={form} updateForm={updateForm} />,
    <TabBusinessDetails key={3} form={form} updateForm={updateForm} />,
    <TabBanking key={4} form={form} updateForm={updateForm} />,
    <TabDocuments key={5} form={form} updateForm={updateForm} uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles} editingWholesaler={editingWholesaler} />,
    <TabReview key={6} form={form} uploadedFiles={uploadedFiles} editingWholesaler={editingWholesaler} updateForm={updateForm} />,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold">
            {editingWholesaler ? 'Edit Wholesaler' : 'Register Wholesaler'}
          </DialogTitle>
          <DialogDescription>
            {editingWholesaler ? 'Update wholesaler business information.' : 'Complete all tabs to register a new wholesaler.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex gap-1 overflow-x-auto">
          {TAB_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === i
                  ? 'bg-primary text-primary-foreground'
                  : validateTab(i)
                  ? 'bg-muted text-foreground hover:bg-muted/80'
                  : 'bg-background text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {validateTab(i) && i < 6 && (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              )}
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tabContent[activeTab]}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button variant="outline" onClick={goPrev} disabled={activeTab === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            {activeTab === 6 ? (
              <>
                <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save as Draft
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save & Verify
                </Button>
              </>
            ) : (
              <Button onClick={goNext}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
