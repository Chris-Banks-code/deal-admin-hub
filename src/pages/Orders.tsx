import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Search, Eye, Check, X, Trash2, Download, Building2, Truck, DollarSign, Package, FileText, User, Phone, Mail, Store, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';

const Orders = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingDealId, setRejectingDealId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [adminNotes, setAdminNotes] = useState('');
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [dealAgent, setDealAgent] = useState<any>(null);
  const [dealWholesaler, setDealWholesaler] = useState<any>(null);

  const fetchDeals = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); }
    setDeals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, []);
  useRealtimeRefresh(['deals', 'order_items'], fetchDeals, 'orders-page');

  // Reset to page 0 whenever filters change so the user doesn't land on an empty page
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  const filtered = useMemo(() => {
    return deals.filter(d => {
      const matchSearch = !search || [d.deal_number, d.retailer_name, d.wholesaler_name, d.product_name]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [deals, search, statusFilter]);

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const statusCounts = useMemo(() => ({
    all:                deals.length,
    pending_admin:      deals.filter(d => d.status === 'pending_admin').length,
    pending_wholesaler: deals.filter(d => d.status === 'pending_wholesaler').length,
    confirmed:          deals.filter(d => d.status === 'confirmed').length,
    delivered:          deals.filter(d => d.status === 'delivered').length,
    completed:          deals.filter(d => d.status === 'completed').length,
    rejected:           deals.filter(d => d.status === 'rejected').length,
  }), [deals]);

  // Map each status to the next valid transition
  const NEXT_STATUS: Record<string, { status: string; label: string; completedAt?: boolean }> = {
    pending_admin:      { status: 'pending_wholesaler', label: 'Approve' },
    pending_wholesaler: { status: 'confirmed',          label: 'Mark Confirmed' },
    confirmed:          { status: 'delivered',          label: 'Mark Delivered' },
    delivered:          { status: 'completed',          label: 'Mark Completed', completedAt: true },
  };

  const nextAction = (status: string | null) => status ? NEXT_STATUS[status] ?? null : null;

  const handleTransition = async (dealId: string, current: string) => {
    const next = nextAction(current);
    if (!next) return;
    const update: Record<string, string> = { status: next.status };
    if (next.completedAt) update.completed_at = new Date().toISOString();
    const { error } = await supabase.from('deals').update(update).eq('id', dealId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Order ${next.label.toLowerCase().replace('mark ', '')}` });
    fetchDeals();
    if (showDetail) {
      setSelectedDeal((prev: any) => prev ? { ...prev, status: next.status, ...(next.completedAt ? { completed_at: update.completed_at } : {}) } : prev);
    }
  };

  const openReject = (dealId: string) => {
    setRejectingDealId(dealId);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return;

    if (bulkRejecting) {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(ids.map(id =>
        supabase.from('deals').update({ status: 'rejected', rejection_reason: rejectReason.trim() }).eq('id', id)
      ));
      const failed = results.filter(r => r.error).length;
      if (failed > 0) {
        toast({ title: 'Error', description: `${failed} order(s) failed to reject`, variant: 'destructive' });
      } else {
        toast({ title: `${ids.length} order(s) rejected` });
      }
      setSelectedIds(new Set());
      setBulkRejecting(false);
      setShowRejectDialog(false);
      fetchDeals();
      return;
    }

    if (!rejectingDealId) return;
    const { error } = await supabase.from('deals').update({ status: 'rejected', rejection_reason: rejectReason.trim() }).eq('id', rejectingDealId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Order rejected' });
    setShowRejectDialog(false);
    fetchDeals();
    if (showDetail) setShowDetail(false);
  };

  const handleDelete = async (dealId: string) => {
    const { error } = await supabase.from('deals').delete().eq('id', dealId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Order deleted' });
    fetchDeals();
    if (showDetail) setShowDetail(false);
  };

  const openDetail = async (deal: any) => {
    setSelectedDeal(deal);
    setAdminNotes(deal.admin_notes || '');
    setDealAgent(null);
    setDealWholesaler(null);

    // Fetch all related data in parallel
    const fetches: Promise<any>[] = [];

    if (deal.has_multiple_products) {
      fetches.push(
        supabase.from('order_items').select('*').eq('deal_id', deal.id)
          .then(({ data }) => setOrderItems(prev => ({ ...prev, [deal.id]: data || [] })))
      );
    }

    if (deal.agent_id) {
      fetches.push(
        supabase.from('profiles')
          .select('id, full_name, phone, email, role')
          .eq('id', deal.agent_id)
          .single()
          .then(({ data }) => setDealAgent(data))
      );
    }

    if (deal.wholesaler_id) {
      fetches.push(
        supabase.from('clients')
          .select('id, company_name, contact_person, phone, company_email, address, verification_status')
          .eq('id', deal.wholesaler_id)
          .single()
          .then(({ data }) => setDealWholesaler(data))
      );
    }

    await Promise.all(fetches);
    setShowDetail(true);
  };

  const saveAdminNotes = async () => {
    if (!selectedDeal) return;
    const { error } = await supabase.from('deals').update({ admin_notes: adminNotes }).eq('id', selectedDeal.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Notes saved' });
    setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, admin_notes: adminNotes } : d));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isActionable = (status: string | null) => !!nextAction(status ?? '');

  const exportCSV = () => {
    const headers = ['Deal #', 'Retailer', 'Wholesaler', 'Product', 'Amount', 'Agent Commission', 'Status', 'Date'];
    const rows = filtered.map(d => [
      d.deal_number ?? '',
      d.retailer_name ?? '',
      d.wholesaler_name ?? '',
      d.has_multiple_products ? `${d.total_items ?? 0} Products` : (d.product_name ?? ''),
      d.deal_value ?? 0,
      d.agent_commission ?? 0,
      d.status ?? '',
      formatDate(d.created_at),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout title="Orders">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_admin">Pending Approval</SelectItem>
              <SelectItem value="pending_wholesaler">Pending Wholesaler</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all',                label: 'All' },
            { key: 'pending_admin',      label: 'Pending Approval' },
            { key: 'pending_wholesaler', label: 'Pending Wholesaler' },
            { key: 'confirmed',          label: 'Confirmed' },
            { key: 'delivered',          label: 'Delivered' },
            { key: 'completed',          label: 'Completed' },
            { key: 'rejected',           label: 'Rejected' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {label}
              <span className="ml-0.5 opacity-70">({statusCounts[key]})</span>
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        {isAdmin && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={async () => {
              const ids = Array.from(selectedIds);
              // Bulk approve only moves pending_admin → pending_wholesaler
              const results = await Promise.all(ids.map(id =>
                supabase.from('deals').update({ status: 'pending_wholesaler' }).eq('id', id).eq('status', 'pending_admin')
              ));
              const failed = results.filter(r => r.error).length;
              if (failed > 0) {
                toast({ title: 'Error', description: `${failed} order(s) failed to approve`, variant: 'destructive' });
              } else {
                toast({ title: `${ids.length} order(s) approved` });
              }
              setSelectedIds(new Set());
              fetchDeals();
            }}>
              Approve ({selectedIds.size})
            </Button>
            <Button size="sm" variant="destructive" onClick={() => {
              // Open reject dialog for bulk; reuse single-reject dialog by setting a sentinel
              setBulkRejecting(true);
              setRejectReason('');
              setShowRejectDialog(true);
            }}>Reject ({selectedIds.size})</Button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No orders found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && <TableHead className="w-10"><Checkbox /></TableHead>}
                    <TableHead>Deal #</TableHead>
                    <TableHead className="hidden lg:table-cell">Retailer</TableHead>
                    <TableHead className="hidden md:table-cell">Wholesaler</TableHead>
                    <TableHead className="hidden xl:table-cell">Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(deal => (
                    <TableRow key={deal.id} className="cursor-pointer" onClick={() => openDetail(deal)}>
                      {isAdmin && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(deal.id)} onCheckedChange={() => toggleSelect(deal.id)} />
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-sm">{deal.deal_number}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{deal.retailer_name || '—'}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{deal.wholesaler_name || '—'}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">
                        {deal.has_multiple_products ? `${deal.total_items || 0} Products` : deal.product_name}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(deal.deal_value)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatCurrency(deal.agent_commission)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(deal.status)}`}>
                          {getStatusLabel(deal.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{formatDate(deal.created_at)}</TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(deal)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isActionable(deal.status) && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title={nextAction(deal.status)?.label} onClick={() => handleTransition(deal.id, deal.status)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openReject(deal.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select value={String(perPage)} onValueChange={v => { setPerPage(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDeal && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedDeal.deal_number}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`${getStatusColor(selectedDeal.status)}`}>
                        {getStatusLabel(selectedDeal.status)}
                      </Badge>
                      <span className="text-sm">{formatDate(selectedDeal.created_at)}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Status-aware action buttons */}
              {isActionable(selectedDeal.status) && (
                <div className="flex gap-2 flex-wrap items-center">
                  {/* Show the full transition chain for context */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                    <Badge variant="outline" className={`text-[10px] ${getStatusColor(selectedDeal.status)}`}>
                      {getStatusLabel(selectedDeal.status)}
                    </Badge>
                    <ChevronRight className="h-3 w-3" />
                    <Badge variant="outline" className={`text-[10px] ${getStatusColor(nextAction(selectedDeal.status)!.status)}`}>
                      {getStatusLabel(nextAction(selectedDeal.status)!.status)}
                    </Badge>
                  </div>
                  <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground gap-1" onClick={() => handleTransition(selectedDeal.id, selectedDeal.status)}>
                    <Check className="h-4 w-4" /> {nextAction(selectedDeal.status)?.label}
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => openReject(selectedDeal.id)}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="outline" className="gap-1 text-muted-foreground" onClick={() => handleDelete(selectedDeal.id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              )}

              {/* Agent + Wholesaler contact cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agent */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" /> Agent
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {dealAgent ? (
                      <>
                        <div className="font-semibold">{dealAgent.full_name}</div>
                        <Separator />
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{dealAgent.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span>{dealAgent.email || '—'}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">{selectedDeal.agent_id ? 'Loading...' : '—'}</div>
                    )}
                  </CardContent>
                </Card>

                {/* Wholesaler */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Store className="h-4 w-4" /> Wholesaler
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {dealWholesaler ? (
                      <>
                        <div className="font-semibold">{dealWholesaler.company_name}</div>
                        <Separator />
                        <div className="text-muted-foreground">Contact: <span className="text-foreground">{dealWholesaler.contact_person || '—'}</span></div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{dealWholesaler.phone || '—'}</span>
                        </div>
                        {dealWholesaler.company_email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span>{dealWholesaler.company_email}</span>
                          </div>
                        )}
                        {dealWholesaler.address && (
                          <div className="text-muted-foreground text-xs pt-1">{dealWholesaler.address}</div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground">{selectedDeal.wholesaler_id ? 'Loading...' : selectedDeal.wholesaler_name || '—'}</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div><span className="text-muted-foreground">Retailer:</span> <span className="font-medium">{selectedDeal.retailer_name || '—'}</span></div>
                    <Separator />
                    <div><span className="text-muted-foreground">Wholesaler:</span> <span className="font-medium">{selectedDeal.wholesaler_name || '—'}</span></div>
                  </CardContent>
                </Card>

                {/* Delivery */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4" /> Delivery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div><span className="text-muted-foreground">Address:</span> {selectedDeal.delivery_address || '—'}</div>
                    <div><span className="text-muted-foreground">Date:</span> {formatDate(selectedDeal.delivery_date)}</div>
                    {selectedDeal.notes && <div><span className="text-muted-foreground">Notes:</span> {selectedDeal.notes}</div>}
                  </CardContent>
                </Card>
              </div>

              {/* Products */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" /> Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDeal.has_multiple_products && orderItems[selectedDeal.id] ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead>Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems[selectedDeal.id].map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{item.product_name}</TableCell>
                            <TableCell className="text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(item.subtotal)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(item.commission_amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm space-y-1">
                      <div><span className="text-muted-foreground">Product:</span> {selectedDeal.product_name}</div>
                      <div><span className="text-muted-foreground">Quantity:</span> {selectedDeal.quantity || '—'}</div>
                      <div><span className="text-muted-foreground">Unit Price:</span> {formatCurrency(selectedDeal.unit_price)}</div>
                      <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{formatCurrency(selectedDeal.deal_value)}</span></div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Commission Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Commission Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between"><span>Total Order Value</span><span className="font-semibold">{formatCurrency(selectedDeal.deal_value)}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Agent Commission{selectedDeal.deal_value ? ` (${((selectedDeal.agent_commission || 0) / selectedDeal.deal_value * 100).toFixed(0)}%)` : ''}</span><span>{formatCurrency(selectedDeal.agent_commission)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Supervisor Override{selectedDeal.deal_value ? ` (${((selectedDeal.supervisor_commission || 0) / selectedDeal.deal_value * 100).toFixed(0)}%)` : ''}</span><span>{formatCurrency(selectedDeal.supervisor_commission)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Op Manager Override{selectedDeal.deal_value ? ` (${((selectedDeal.operation_manager_commission || 0) / selectedDeal.deal_value * 100).toFixed(0)}%)` : ''}</span><span>{formatCurrency(selectedDeal.operation_manager_commission)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Company Profit</span>
                    <span>{formatCurrency((selectedDeal.deal_value || 0) - (selectedDeal.agent_commission || 0) - (selectedDeal.supervisor_commission || 0) - (selectedDeal.operation_manager_commission || 0))}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notes */}
              {isAdmin && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Admin Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Internal notes..." rows={3} />
                    <Button size="sm" onClick={saveAdminNotes}>Save Notes</Button>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Activity</h4>
                <div className="text-xs text-muted-foreground space-y-1 border-l-2 border-border pl-4">
                  <p>Order created on {formatDate(selectedDeal.created_at)}</p>
                  {selectedDeal.confirmed_at && <p>Confirmed on {formatDate(selectedDeal.confirmed_at)}</p>}
                  {selectedDeal.completed_at && <p>Approved on {formatDate(selectedDeal.completed_at)}</p>}
                  {selectedDeal.status === 'rejected' && <p>Rejected — {selectedDeal.rejection_reason || 'No reason given'}</p>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>Please provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={confirmReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Orders;
