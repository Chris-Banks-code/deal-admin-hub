import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, Edit2, Trash2, Box } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface ProductForm {
  product_name: string;
  category: string;
  unit_price: string;
  unit_type: string;
  commission_rate: string;
  wholesaler_id: string;
  wholesaler_location_id: string;
  stock_quantity: string;
  status: string;
}

const emptyForm: ProductForm = {
  product_name: '', category: '', unit_price: '', unit_type: 'unit',
  commission_rate: '4', wholesaler_id: '', wholesaler_location_id: '',
  stock_quantity: '0', status: 'available',
};

const ProductsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [wholesalers, setWholesalers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [productsRes, wholesalersRes, locationsRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('client_type', 'wholesaler'),
      supabase.from('wholesaler_locations').select('*'),
    ]);
    setProducts(productsRes.data || []);
    setWholesalers(wholesalersRes.data || []);
    setLocations(locationsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useRealtimeRefresh(['products', 'clients', 'wholesaler_locations'], fetchData, 'products-page');

  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.product_name?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, search, categoryFilter]);

  const getWholesalerName = (id: string) => wholesalers.find(w => w.id === id)?.company_name || '—';

  const openAdd = () => { setEditingProduct(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      product_name: p.product_name, category: p.category || '', unit_price: String(p.unit_price),
      unit_type: p.unit_type, commission_rate: String(p.commission_rate || 4),
      wholesaler_id: p.wholesaler_id, wholesaler_location_id: p.wholesaler_location_id || '',
      stock_quantity: String(p.stock_quantity || 0), status: p.status || 'available',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.product_name.trim() || !form.unit_price || !form.wholesaler_id) {
      toast({ title: 'Validation', description: 'Fill required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const data = {
      product_name: form.product_name.trim(),
      category: form.category || null,
      unit_price: Number(form.unit_price),
      unit_type: form.unit_type,
      commission_rate: Number(form.commission_rate),
      wholesaler_id: form.wholesaler_id,
      wholesaler_location_id: form.wholesaler_location_id || null,
      stock_quantity: Number(form.stock_quantity) || 0,
      status: form.status,
    };

    if (editingProduct) {
      const { error } = await supabase.from('products').update(data).eq('id', editingProduct.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Product updated' });
    } else {
      const { error } = await supabase.from('products').insert(data);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      toast({ title: 'Product created' });
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  };

  const deleteProduct = async () => {
    if (!deletingProductId) return;
    const { error } = await supabase.from('products').delete().eq('id', deletingProductId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setDeletingProductId(null); return; }
    toast({ title: 'Product deleted' });
    setDeletingProductId(null);
    fetchData();
  };

  return (
    <DashboardLayout title="Products">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No products found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead className="hidden lg:table-cell">Wholesaler</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="hidden sm:table-cell">Commission</TableHead>
                    <TableHead className="hidden md:table-cell">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">{p.product_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.category || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{getWholesalerName(p.wholesaler_id)}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(p.unit_price)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{formatPercent(p.commission_rate)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{p.stock_quantity || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${p.status === 'available' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}`}>
                          {p.status === 'available' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingProductId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>{editingProduct ? 'Update product details.' : 'Add a new product.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2"><Label>Product Name *</Label><Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Unit Price *</Label><Input type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Unit Type</Label><Input value={form.unit_type} onChange={e => setForm(f => ({ ...f, unit_type: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Commission Rate (%)</Label><Input type="number" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Wholesaler *</Label>
              <Select value={form.wholesaler_id} onValueChange={v => setForm(f => ({ ...f, wholesaler_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select wholesaler" /></SelectTrigger>
                <SelectContent>{wholesalers.map(w => <SelectItem key={w.id} value={w.id}>{w.company_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.wholesaler_id && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={form.wholesaler_location_id} onValueChange={v => setForm(f => ({ ...f, wholesaler_location_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>{locations.filter(l => l.wholesaler_id === form.wholesaler_id).map(l => <SelectItem key={l.id} value={l.id}>{l.branch_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Stock Quantity</Label><Input type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.status === 'available'} onCheckedChange={c => setForm(f => ({ ...f, status: c ? 'available' : 'inactive' }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editingProduct ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingProductId} onOpenChange={open => { if (!open) setDeletingProductId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the product. Any existing deals referencing it will retain their data, but it will no longer be available for new orders. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ProductsPage;
