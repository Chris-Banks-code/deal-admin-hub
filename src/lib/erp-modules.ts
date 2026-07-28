import {
  Home, ShoppingCart, Package, Boxes, Box, Users, Truck, UserCheck,
  Wallet, Percent, BarChart3, FileBarChart, MessageSquare, CheckSquare,
  ShieldCheck, FolderLock, Settings, ScrollText,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey } from '@/hooks/usePermissions';

export type NavGroup = 'operations' | 'commerce' | 'finance' | 'admin';

export interface ModuleDef {
  key: ModuleKey;
  title: string;
  url: string;
  icon: LucideIcon;
  group: NavGroup;
  description: string;
  features: string[];
}

export const MODULES: ModuleDef[] = [
  // Operations
  { key: 'dashboard', title: 'Dashboard', url: '/dashboard', icon: Home, group: 'operations',
    description: 'Executive control center with KPIs, alerts and quick actions.',
    features: ['Sales KPIs', 'Revenue & profit', 'Pending approvals', 'Low stock alerts', 'Sales graph', 'Recent transactions'] },
  { key: 'orders', title: 'Orders', url: '/orders', icon: Package, group: 'operations',
    description: 'End-to-end order lifecycle from submission to delivery.',
    features: ['Pending / approved / dispatched', 'Delivery tracking', 'Order timeline', 'Returns & refunds'] },
  { key: 'inventory', title: 'Inventory', url: '/inventory', icon: Boxes, group: 'operations',
    description: 'Stock across warehouses, transfers, batches and audits.',
    features: ['Warehouses', 'Stock levels & movements', 'Batch & barcode', 'Damaged / expired', 'Purchase orders'] },
  { key: 'agents', title: 'Agents', url: '/agents', icon: UserCheck, group: 'operations',
    description: 'Field agent directory, territory, attendance and rankings.',
    features: ['Territories', 'Attendance & GPS', 'Wallet & commissions', 'Rankings', 'Suspension'] },
  { key: 'communications', title: 'Communications', url: '/communications', icon: MessageSquare, group: 'operations',
    description: 'Broadcasts, tickets, announcements and customer chat.',
    features: ['SMS / Email / Push', 'WhatsApp', 'Announcements', 'Support tickets', 'Feedback & surveys'] },

  // Commerce
  { key: 'sales', title: 'Sales', url: '/sales', icon: ShoppingCart, group: 'commerce',
    description: 'Every sale — POS, agent, retail, wholesale, credit, cash.',
    features: ['New sale / POS', 'Invoices & receipts', 'Returns & discounts', 'Sales targets'] },
  { key: 'products', title: 'Products', url: '/products', icon: Box, group: 'commerce',
    description: 'Product catalog, pricing tiers, variants and approvals.',
    features: ['Categories & brands', 'Wholesale / retail pricing', 'Variants & UoM', 'Product approval'] },
  { key: 'customers', title: 'Customers', url: '/customers', icon: Users, group: 'commerce',
    description: 'Wholesalers, retailers and individuals with full CRM.',
    features: ['Wallet & credit limit', 'Purchase history', 'Loyalty points', 'Complaints', 'Blacklist'] },
  { key: 'suppliers', title: 'Suppliers', url: '/suppliers', icon: Truck, group: 'commerce',
    description: 'Supplier directory, contracts, POs and performance.',
    features: ['Contracts', 'Purchase orders', 'Supplier payments', 'Delivery performance', 'Ratings'] },

  // Finance
  { key: 'finance', title: 'Finance', url: '/finance', icon: Wallet, group: 'finance',
    description: 'Full accounting: ledger, AR/AP, statements and tax.',
    features: ['Chart of accounts', 'AR / AP', 'Bank & cash', 'Journal entries', 'P&L, Balance sheet, Cash flow', 'Tax'] },
  { key: 'commissions', title: 'Commissions', url: '/commissions', icon: Percent, group: 'finance',
    description: 'Rules engine and payouts for every commission and bonus.',
    features: ['Commission rules', 'Pending / approved / paid', 'Agent wallet', 'Bonuses & incentives'] },
  { key: 'reports', title: 'Reports', url: '/reports', icon: FileBarChart, group: 'finance',
    description: 'Central reporting hub with export and scheduling.',
    features: ['Sales / inventory / finance', 'Commission & audit', 'Export PDF / Excel', 'Scheduled reports'] },
  { key: 'analytics', title: 'Analytics', url: '/analytics', icon: BarChart3, group: 'finance',
    description: 'Business intelligence and forecasting.',
    features: ['Revenue & profit', 'Customer / agent / product', 'Regional heat maps', 'Forecasting', 'KPI dashboard'] },

  // Admin
  { key: 'approvals', title: 'Approvals', url: '/approvals', icon: CheckSquare, group: 'admin',
    description: 'Central approval workflow across every module.',
    features: ['Agent / customer / supplier', 'Product & price', 'Expense / refund', 'Commission & purchase'] },
  { key: 'security', title: 'Security', url: '/security', icon: ShieldCheck, group: 'admin',
    description: 'Roles, permission matrix, sessions and audit trail.',
    features: ['User roles', 'Permission matrix', 'Sessions & devices', '2FA', 'IP restrictions', 'Password policy'] },
  { key: 'documents', title: 'Documents', url: '/documents', icon: FolderLock, group: 'admin',
    description: 'Digital repository for policies, contracts and licenses.',
    features: ['Policies & SOPs', 'Contracts & minutes', 'Licenses & insurance', 'Version history', 'Search'] },
  { key: 'settings', title: 'Settings', url: '/settings', icon: Settings, group: 'admin',
    description: 'Company profile, branding, integrations and preferences.',
    features: ['Company profile', 'Branches & regions', 'Currency & tax', 'Templates', 'Integrations', 'Backups'] },
  { key: 'audit_logs', title: 'Audit Logs', url: '/audit-logs', icon: ScrollText, group: 'admin',
    description: 'Complete monitoring of every activity on the platform.',
    features: ['User & login activity', 'Sales & inventory changes', 'Deleted / restored records', 'Failed logins', 'Security events'] },
];

export const GROUP_LABEL: Record<NavGroup, string> = {
  operations: 'Operations',
  commerce: 'Commerce',
  finance: 'Finance',
  admin: 'Administration',
};
