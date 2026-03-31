import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { WholesalerFormData } from '../WholesalerFormTypes';

interface Props {
  form: WholesalerFormData;
  updateForm: (updates: Partial<WholesalerFormData>) => void;
}

export const TabContacts = ({ form, updateForm }: Props) => {
  const [secondaryOpen, setSecondaryOpen] = useState(!!(form.secondary_contact_name || form.secondary_contact_phone));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Primary Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Contact Person Name <span className="text-destructive">*</span></Label>
            <Input value={form.contact_person} onChange={e => updateForm({ contact_person: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Phone Number <span className="text-destructive">*</span></Label>
            <Input value={form.phone} onChange={e => updateForm({ phone: e.target.value })} placeholder="+231 XXX XXXX" />
          </div>
          <div className="space-y-2">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={form.email} onChange={e => updateForm({ email: e.target.value })} />
          </div>
        </div>
      </div>

      <Collapsible open={secondaryOpen} onOpenChange={setSecondaryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            Secondary Contact
            <ChevronDown className={`h-4 w-4 transition-transform ${secondaryOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Person Name</Label>
              <Input value={form.secondary_contact_name} onChange={e => updateForm({ secondary_contact_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={form.secondary_contact_phone} onChange={e => updateForm({ secondary_contact_phone: e.target.value })} placeholder="+231 XXX XXXX" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
