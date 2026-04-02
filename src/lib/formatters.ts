export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
    case 'completed': return 'bg-success/10 text-success border-success/20 glow-success';
    case 'pending': case 'pending_admin': return 'bg-warning/10 text-warning border-warning/20 glow-warning';
    case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/20 glow-error';
    default: return 'bg-white/[0.05] text-muted-foreground border-white/[0.08]';
  }
};

export const getStatusLabel = (status: string | null) => {
  switch (status) {
    case 'completed': return 'Completed';
    case 'pending': case 'pending_admin': return 'Pending';
    case 'rejected': return 'Rejected';
    default: return status || 'Unknown';
  }
};

export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'operation_manager': return 'bg-warning/10 text-warning border-warning/20';
    case 'supervisor': return 'bg-accent/10 text-accent border-accent/20';
    case 'agent': return 'bg-primary/10 text-primary border-primary/20';
    default: return 'bg-white/[0.05] text-muted-foreground border-white/[0.08]';
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
