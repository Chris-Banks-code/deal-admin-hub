import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WholesalerFormData, emptyWholesalerForm } from './WholesalerFormTypes';
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
  const [, setExistingBranches] = useState<any[]>([]);

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

  const fetchBranches = async (partyId: string) => {
    // Look up supplier by party_id, then load its supplier_locations
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('party_id', partyId)
      .maybeSingle();
    if (!supplier) {
      setExistingBranches([]);
      return;
    }
    const { data } = await supabase
      .from('supplier_locations')
      .select('*')
      .eq('supplier_id', supplier.id);
    setExistingBranches(data || []);
    if (data && data.length > 0) {
      setForm(f => ({
        ...f,
        branches: data.map((b: any) => ({
          id: b.id,
          branch_name: b.branch_name || '',
          address: b.address || '',
          phone: b.branch_phone || '',
          manager_name: b.branch_manager_name || '',
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
        return true;
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

      // --- 1. Upsert party ---
      const partyData: Record<string, any> = {
        party_type: 'supplier',
        legal_name: form.company_name.trim(),
        display_name: form.company_name.trim(),
        tax_id: form.tax_id.trim() || null,
        registration_number: form.business_registration_number.trim() || null,
        email: form.company_email.trim() || form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.company_website.trim() || null,
        address: form.address.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        status: form.status,
        notes: form.admin_notes.trim() || null,
      };

      let partyId: string;
      if (editingWholesaler) {
        partyId = editingWholesaler.party_id || editingWholesaler.id;
        const { error } = await supabase.from('parties').update(partyData).eq('id', partyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('parties').insert(partyData as any).select('id').single();
        if (error) throw error;
        partyId = data.id;
      }

      // --- 2. Upsert supplier ---
      const supplierData: Record<string, any> = {
        party_id: partyId,
        company_type: form.company_type || null,
        year_established: form.year_established ? parseInt(form.year_established) : null,
        secondary_contact_person: form.secondary_contact_name.trim() || null,
        secondary_contact_phone: form.secondary_contact_phone.trim() || null,
        product_categories: categories,
        minimum_order_value: form.no_mov ? null : (form.minimum_order_value ? parseFloat(form.minimum_order_value) : null),
        payment_terms: form.payment_terms || null,
        credit_period_days: form.credit_period ? parseInt(form.credit_period) : null,
        delivery_options: form.delivery_options || null,
        delivery_coverage_areas: form.delivery_coverage_areas.trim() || null,
        operating_hours: form.operating_hours,
        bank_name: form.bank_name || null,
        bank_account_name: form.account_name.trim() || null,
        bank_account_number: form.account_number.trim() || null,
        bank_branch: form.bank_branch.trim() || null,
        default_commission_rate: form.default_commission_rate ? parseFloat(form.default_commission_rate) : null,
        bulk_discount_available: form.bulk_discount_available,
        storage_facilities_available: form.storage_facilities,
        storage_facilities_description: form.storage_facilities ? form.storage_description.trim() || null : null,
        cold_storage_available: form.cold_storage,
        certifications: form.certifications.trim() ? [form.certifications.trim()] : null,
        special_services: form.special_services.trim() ? [form.special_services.trim()] : null,
        credit_references: form.credit_references.trim() || null,
        admin_notes: form.admin_notes.trim() || null,
        verification_status: verify ? 'verified' : (form.verification_status as any),
      };

      if (verify && user) {
        supplierData.verified_by = user.id;
        supplierData.verified_at = new Date().toISOString();
      }
      if (!editingWholesaler && user) {
        supplierData.added_by = user.id;
      }

      // Look up existing supplier by party_id
      const { data: existingSupplier } = await supabase
        .from('suppliers').select('id').eq('party_id', partyId).maybeSingle();

      let supplierId: string;
      if (existingSupplier) {
        const { error } = await supabase.from('suppliers').update(supplierData).eq('id', existingSupplier.id);
        if (error) throw error;
        supplierId = existingSupplier.id;
      } else {
        const { data, error } = await supabase.from('suppliers').insert(supplierData as any).select('id').single();
        if (error) throw error;
        supplierId = data.id;
      }

      // --- 3. Upload files → supplier url columns ---
      for (const [docType, file] of Object.entries(uploadedFiles)) {
        if (file) {
          const url = await uploadFile(file, supplierId, docType);
          if (url) {
            const urlField = `${docType}_url`;
            await supabase.from('suppliers').update({ [urlField]: url } as any).eq('id', supplierId);
          }
        }
      }

      // --- 4. Upsert supplier_locations (branches) ---
      for (const branch of form.branches) {
        if (!branch.branch_name || !branch.address) continue;
        const branchData: Record<string, any> = {
          supplier_id: supplierId,
          branch_name: branch.branch_name,
          address: branch.address,
          branch_phone: branch.phone || null,
          branch_manager_name: branch.manager_name || null,
          latitude: branch.latitude ? parseFloat(branch.latitude) : null,
          longitude: branch.longitude ? parseFloat(branch.longitude) : null,
        };
        if (branch.id) {
          await supabase.from('supplier_locations').update(branchData).eq('id', branch.id);
        } else {
          await supabase.from('supplier_locations').insert(branchData as any);
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
