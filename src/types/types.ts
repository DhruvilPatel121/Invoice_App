export type InvoiceStatus =
  | 'Draft'
  | 'Sent'
  | 'Viewed'
  | 'Paid'
  | 'Pending'
  | 'Partially Paid'
  | 'Cancelled'
  | 'Overdue';

export type DiscountType = 'none' | 'percentage' | 'fixed' | 'coupon';

export interface CompanySettings {
  id: string;
  company_name: string;
  address: string;
  gst_number: string;
  email: string;
  phone: string;
  website: string;
  logo_url: string;
  signature_url: string;
  seal_url: string;
  upi_qr_url: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  bank_ifsc: string;
  bank_swift: string;
  default_gst_rate: number;
  default_currency: string;
  invoice_prefix: string;
  invoice_number_format: string;
  default_payment_terms: string;
  default_notes: string;
  default_terms: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  client_name: string;
  company_name: string;
  gst_number: string;
  address: string;
  email: string;
  phone: string;
  state: string;
  country: string;
  zip_code: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  sort_order: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  tax_percent: number;
  amount: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_year: number;
  invoice_seq: number;
  // Company snapshot
  company_name: string;
  company_address: string;
  company_gst: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_logo_url: string;
  company_signature_url: string;
  company_seal_url: string;
  company_upi_qr_url: string;
  company_bank_account_name: string;
  company_bank_account_number: string;
  company_bank_name: string;
  company_bank_ifsc: string;
  company_bank_swift: string;
  // Client info
  client_id: string | null;
  client_name: string;
  client_company: string;
  client_gst: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  client_state: string;
  client_country: string;
  client_zip: string;
  // Invoice details
  invoice_date: string;
  due_date: string | null;
  payment_terms: string;
  currency: string;
  status: InvoiceStatus;
  // Financial
  subtotal: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  coupon_code: string;
  round_off: number;
  gst_enabled: boolean;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_gst: number;
  grand_total: number;
  paid_amount: number;
  pending_amount: number;
  // Payment details
  payment_method: string;
  transaction_id: string;
  payment_date: string | null;
  payment_notes: string;
  // Content
  notes: string;
  terms: string;
  // Timestamps
  paid_at: string | null;
  printed_at: string | null;
  downloaded_at: string | null;
  last_modified_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  items?: InvoiceItem[];
}

export interface InvoiceHistory {
  id: string;
  invoice_id: string;
  action: string;
  description: string;
  created_at: string;
}

export interface InvoiceFormData {
  // Client
  client_id: string;
  client_name: string;
  client_company: string;
  client_gst: string;
  client_address: string;
  client_email: string;
  client_phone: string;
  client_state: string;
  client_country: string;
  client_zip: string;
  // Invoice details
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  currency: string;
  status: InvoiceStatus;
  // Items
  items: InvoiceItemFormData[];
  // GST
  gst_enabled: boolean;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  // Discount
  discount_type: DiscountType;
  discount_value: number;
  coupon_code: string;
  round_off: number;
  // Payment
  payment_method: string;
  transaction_id: string;
  payment_date: string;
  payment_notes: string;
  // Content
  notes: string;
  terms: string;
}

export interface InvoiceItemFormData {
  id?: string;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  tax_percent: number;
  amount: number;
}

export interface DashboardStats {
  total_invoices: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  total_clients: number;
  draft_count: number;
  overdue_count: number;
}

export interface MonthlyRevenue {
  month: string;
  year: number;
  month_num: number;
  paid: number;
  pending: number;
  total: number;
}

export interface InvoiceFilters {
  search: string;
  status: string;
  client_id: string;
  date_range: string;
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

export const PAYMENT_TERMS = ['Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', 'Custom'];

export const UNITS = ['Nos', 'Pcs', 'Kg', 'Ltr', 'Mtr', 'Hrs', 'Days', 'Months', 'Set', 'Box'];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Other'];

export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  Paid: 'status-paid',
  Pending: 'status-pending',
  Overdue: 'status-overdue',
  Draft: 'status-draft',
  Sent: 'status-sent',
  Viewed: 'status-viewed',
  'Partially Paid': 'status-partially-paid',
  Cancelled: 'status-cancelled',
};
