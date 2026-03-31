import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { WholesalerFormData, BranchForm } from '../WholesalerFormTypes';

interface Props {
  form: WholesalerFormData;
  updateForm: (updates: Partial<WholesalerFormData>) => void;
}

const emptyBranch: BranchForm = { branch_name: '', address: '', phone: '', manager_name: '', latitude: '', longitude: '' };

export const TabLocation = ({ form, updateForm }: Props) => {
  const addBranch = () => updateForm({ branches: [...form.branches, { ...emptyBranch }] });
  const removeBranch = (i: number) => updateForm({ branches: form.branches.filter((_, idx) => idx !== i) });
  const updateBranch = (i: number, field: keyof BranchForm, value: string) => {
    const updated = [...form.branches];
    updated[i] = { ...updated[i], [field]: value };
    updateForm({ branches: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Primary Location</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Business Address <span className="text-destructive">*</span></Label>
            <Textarea value={form.address} onChange={e => updateForm({ address: e.target.value })} placeholder="Full business address" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input type="number" step="any" value={form.latitude} onChange={e => updateForm({ latitude: e.target.value })} placeholder="e.g., 6.3156" />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input type="number" step="any" value={form.longitude} onChange={e => updateForm({ longitude: e.target.value })} placeholder="e.g., -10.8074" />
            </div>
          </div>
          <Button variant="outline" size="sm" disabled className="gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" /> Use Map Picker (Coming Soon)
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Additional Branches</h3>
          <Button variant="outline" size="sm" onClick={addBranch} className="gap-1">
            <Plus className="h-4 w-4" /> Add Branch
          </Button>
        </div>
        {form.branches.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No additional branches added yet.</p>
        )}
        <div className="space-y-3">
          {form.branches.map((branch, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Branch {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeBranch(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Branch Name</Label>
                    <Input value={branch.branch_name} onChange={e => updateBranch(i, 'branch_name', e.target.value)} placeholder="e.g., Downtown Branch" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Manager Name</Label>
                    <Input value={branch.manager_name} onChange={e => updateBranch(i, 'manager_name', e.target.value)} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs">Address</Label>
                    <Input value={branch.address} onChange={e => updateBranch(i, 'address', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={branch.phone} onChange={e => updateBranch(i, 'phone', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Latitude</Label>
                      <Input type="number" step="any" value={branch.latitude} onChange={e => updateBranch(i, 'latitude', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Longitude</Label>
                      <Input type="number" step="any" value={branch.longitude} onChange={e => updateBranch(i, 'longitude', e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
