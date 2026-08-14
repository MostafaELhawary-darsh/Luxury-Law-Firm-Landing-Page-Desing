export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  is_trust_account: boolean;
  normal_balance: string;
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  line_description: string | null;
  sort_order: number;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  stage: number;
  stage_name: string;
  description: string;
  matter_id: string | null;
  client_name: string | null;
  invoice_number: string | null;
  total_amount: number;
  entry_date: string;
  is_posted: boolean;
  lines?: JournalLine[];
}

export interface AccountBalance {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
  is_trust: boolean;
  account_type: string;
}

export const stageInfo: Record<number, { title: string; subtitle: string; color: string; bgColor: string }> = {
  1: {
    title: 'المرحلة الأولى: استلام دفعة الأمانات',
    subtitle: 'إيداع أموال العميل في حساب الأمانات — لا يُعتبر إيراداً للمكتب',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  2: {
    title: 'المرحلة الثانية: إصدار الفاتورة واكتساب الإيراد',
    subtitle: 'إثبات الإيراد المستحق والضريبة والمصاريف المستردة عند إنجاز العمل',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  3: {
    title: 'المرحلة الثالثة: تحويل الأموال وتسوية الفاتورة',
    subtitle: 'تسوية حساب الأمانات وتحصيل الحساب التشغيلي — قيدان متزامنان',
    color: 'text-gold',
    bgColor: 'bg-amber-50',
  },
};
