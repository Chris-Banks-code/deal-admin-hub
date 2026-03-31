export interface BranchForm {
  id?: string;
  branch_name: string;
  address: string;
  phone: string;
  manager_name: string;
  latitude: string;
  longitude: string;
}

export interface WholesalerFormData {
  // Tab 1: Company Info
  company_name: string;
  business_registration_number: string;
  tax_id: string;
  company_type: string;
  year_established: string;
  company_email: string;
  company_website: string;

  // Tab 2: Contacts
  contact_person: string;
  phone: string;
  email: string;
  secondary_contact_name: string;
  secondary_contact_phone: string;

  // Tab 3: Location
  address: string;
  latitude: string;
  longitude: string;
  branches: BranchForm[];

  // Tab 4: Business Details
  product_categories: string[];
  other_category: string;
  minimum_order_value: string;
  no_mov: boolean;
  payment_terms: string;
  credit_period: string;
  delivery_options: string;
  delivery_coverage_areas: string;
  operating_hours: {
    weekday_start: string;
    weekday_end: string;
    saturday_start: string;
    saturday_end: string;
    saturday_closed: boolean;
    sunday_start: string;
    sunday_end: string;
    sunday_closed: boolean;
  };

  // Tab 5: Banking
  bank_name: string;
  account_name: string;
  account_number: string;
  bank_branch: string;
  default_commission_rate: string;
  bulk_discount_available: boolean;

  // Tab 6: Documents
  certifications: string;
  storage_facilities: boolean;
  storage_description: string;
  cold_storage: boolean;
  special_services: string;
  credit_references: string;
  admin_notes: string;

  // Tab 7: Status
  status: string;
  verification_status: string;
}

export const PRODUCT_CATEGORIES = [
  'Food & Beverages',
  'Building Materials',
  'Electronics',
  'Pharmaceuticals',
  'Textiles & Clothing',
  'Hardware & Tools',
  'Agricultural Products',
  'Household Items',
  'Industrial Supplies',
  'Other',
];

export const LIBERIAN_BANKS = [
  'Central Bank of Liberia',
  'Ecobank Liberia',
  'LBDI (Liberian Bank for Development & Investment)',
  'GT Bank Liberia',
  'United Bank for Africa (UBA)',
  'AccessBank Liberia',
  'Afriland First Bank',
  'International Bank Liberia',
  'Sapelle International Bank',
  'Other',
];

export const COMPANY_TYPES = ['Importer', 'Distributor', 'Manufacturer', 'Other'];

export const emptyWholesalerForm: WholesalerFormData = {
  company_name: '',
  business_registration_number: '',
  tax_id: '',
  company_type: '',
  year_established: '',
  company_email: '',
  company_website: '',
  contact_person: '',
  phone: '',
  email: '',
  secondary_contact_name: '',
  secondary_contact_phone: '',
  address: '',
  latitude: '',
  longitude: '',
  branches: [],
  product_categories: [],
  other_category: '',
  minimum_order_value: '',
  no_mov: false,
  payment_terms: '',
  credit_period: '',
  delivery_options: '',
  delivery_coverage_areas: '',
  operating_hours: {
    weekday_start: '08:00',
    weekday_end: '18:00',
    saturday_start: '08:00',
    saturday_end: '14:00',
    saturday_closed: false,
    sunday_start: '',
    sunday_end: '',
    sunday_closed: true,
  },
  bank_name: '',
  account_name: '',
  account_number: '',
  bank_branch: '',
  default_commission_rate: '',
  bulk_discount_available: false,
  certifications: '',
  storage_facilities: false,
  storage_description: '',
  cold_storage: false,
  special_services: '',
  credit_references: '',
  admin_notes: '',
  status: 'active',
  verification_status: 'unverified',
};
