export type FinanceModule =
  | 'dashboard'
  | 'trust'
  | 'billing'
  | 'disbursements'
  | 'partners'
  | 'ar'
  | 'cycle'
  | 'reserve';

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  credit_limit: number;
  payment_terms_days: number;
  status: string;
  created_at: string;
}

export interface Attorney {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  target_hours: number;
  is_partner: boolean;
  email: string | null;
  created_at: string;
}

export interface Matter {
  id: string;
  matter_code: string;
  title: string;
  client_id: string | null;
  originating_partner_id: string | null;
  responsible_attorney_id: string | null;
  status: string;
  opened_date: string | null;
  closed_date: string | null;
  work_suspended: boolean;
  created_at: string;
}

export interface FeeAgreement {
  id: string;
  matter_id: string;
  fee_type: 'hourly' | 'fixed' | 'contingency' | 'retainer';
  hourly_rate: number | null;
  fixed_amount: number | null;
  contingency_percentage: number | null;
  monthly_retainer: number | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  matter_id: string;
  attorney_id: string | null;
  entry_date: string;
  hours: number;
  description: string | null;
  is_billable: boolean;
  rate: number | null;
  invoiced: boolean;
  invoice_id: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  matter_id: string;
  client_id: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  disbursements_total: number;
  total: number;
  amount_paid: number;
  status: string;
  trust_transfer_done: boolean;
  created_at: string;
}

export interface TrustAccount {
  id: string;
  account_name: string;
  account_number: string | null;
  bank_name: string | null;
  balance: number;
  created_at: string;
}

export interface TrustTransaction {
  id: string;
  trust_account_id: string;
  matter_id: string;
  client_id: string | null;
  transaction_type: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  linked_invoice_id: string | null;
  created_at: string;
}

export interface Disbursement {
  id: string;
  matter_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  reimbursed: boolean;
  invoice_id: string | null;
  created_at: string;
}

export interface Partner {
  id: string;
  attorney_id: string;
  equity_share: number;
  origination_credit: number;
  production_credit: number;
  supervision_credit: number;
  ytd_revenue: number;
  ytd_draws: number;
  created_at: string;
}

export interface PartnerDraw {
  id: string;
  partner_id: string;
  draw_date: string;
  amount: number;
  period: string;
  settled: boolean;
  created_at: string;
}

export interface KPIData {
  utilizationRate: number;
  realizationRate: number;
  revenuePerPartner: number;
  totalBillableHours: number;
  totalRevenue: number;
  totalOutstanding: number;
  trustBalance: number;
  operatingBalance: number;
  overdueCount: number;
  activeMatters: number;
}
