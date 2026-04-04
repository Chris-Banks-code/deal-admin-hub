export const formatCurrency = (amount: number | null | undefined, currency: string = 'USD'): string => {
  if (amount == null) return `${currency} $0.00`;
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  return `${currency} ${formatted}`;
};

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
  } catch {
    return '—';
  }
};

export const formatPercent = (value: number | null | undefined): string => {
  if (value == null) return '0%';
  return `${value.toFixed(1)}%`;
};

export const getStatusColor = (status: string | null) => {
  switch (status) {
    case 'pending_admin':      return 'bg-warning/10 text-warning border-warning/20';
    case 'pending_wholesaler': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'confirmed':          return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'delivered':          return 'bg-accent/15 text-accent border-accent/30';
    case 'completed':          return 'bg-success/10 text-success border-success/20';
    case 'rejected':           return 'bg-destructive/10 text-destructive border-destructive/20';
    default:                   return 'bg-muted text-muted-foreground';
  }
};

export const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'pending_admin':      return 'Pending Approval';
    case 'pending_wholesaler': return 'Pending Wholesaler';
    case 'confirmed':          return 'Confirmed';
    case 'delivered':          return 'Delivered';
    case 'completed':          return 'Completed';
    case 'rejected':           return 'Rejected';
    default:                   return status || 'Unknown';
  }
};

export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'operation_manager': return 'bg-warning/10 text-warning border-warning/20';
    case 'supervisor': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'agent': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const getRoleLabel = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'operation_manager': return 'Operation Manager';
    case 'supervisor': return 'Supervisor';
    case 'agent': return 'Agent';
    default: return role;
  }
};

export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
};
