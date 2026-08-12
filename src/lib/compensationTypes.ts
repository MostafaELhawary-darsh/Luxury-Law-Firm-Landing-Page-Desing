export type CompModelType = 'lockstep' | 'ewyk' | 'hale_dorr' | 'hybrid';

export interface CompModel {
  id: string;
  model_type: CompModelType;
  model_name: string;
  is_active: boolean;
  config: Record<string, unknown>;
}

export interface PartnerPoint {
  id: string;
  partner_id: string;
  year: number;
  points: number;
  max_points: number;
  years_as_partner: number;
}

export interface InvoiceRole {
  id: string;
  invoice_id: string;
  finder_attorney_id: string | null;
  finder_percentage: number;
  minder_attorney_id: string | null;
  minder_percentage: number;
  grinder_attorney_id: string | null;
  grinder_percentage: number;
  firm_reserve_percentage: number;
}

export interface BonusPoolEval {
  id: string;
  partner_id: string;
  year: number;
  new_clients_brought: number;
  billable_hours: number;
  cross_sell_score: number;
  client_retention_score: number;
  leadership_score: number;
  bonus_score: number;
}

export interface CapitalReserve {
  id: string;
  year: number;
  total_profit: number;
  holdback_percentage: number;
  holdback_amount: number;
  distributable_amount: number;
  status: string;
}

export interface YearEndSettlement {
  id: string;
  partner_id: string;
  year: number;
  model_type: string;
  earned_amount: number;
  total_draws: number;
  holdback_deducted: number;
  net_payable: number;
  settlement_status: string;
}

export interface CompJournalEntry {
  id: string;
  entry_number: string;
  entry_type: 'draw' | 'holdback' | 'trueup';
  description: string;
  partner_name: string | null;
  amount: number;
  debit_account: string | null;
  credit_account: string | null;
  entry_date: string;
  is_posted: boolean;
}

export interface PartnerWithAttorney {
  id: string;
  attorney_id: string;
  equity_share: number;
  origination_credit: number;
  production_credit: number;
  supervision_credit: number;
  ytd_revenue: number;
  ytd_draws: number;
  attorney?: {
    id: string;
    name: string;
    role: string;
    hourly_rate: number;
  };
  points?: PartnerPoint;
  bonusEval?: BonusPoolEval;
}

export const modelInfo: Record<CompModelType, {
  name: string;
  philosophy: string;
  pros: string;
  cons: string;
  color: string;
  bgColor: string;
}> = {
  lockstep: {
    name: 'نظام الأقدمية والنقاط',
    philosophy: 'توزيع بناءً على سنوات الشراكة — تعاون تام وتغليب روح المكتب الواحد',
    pros: 'تعاون كامل، تشجيع تحويل القضايا للأكفأ، استقرار',
    cons: 'إحباط الشركاء الجدد الاستثنائيين',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  ewyk: {
    name: 'نظام الإنتاجية المباشرة',
    philosophy: 'كل شريك يأكل ما يصطاد — مكافأة الإنتاجية الفردية',
    pros: 'شفافية كاملة، مكافأة الجهد الفردي',
    cons: 'ضعف ثقافة المؤسسة، منافسة حادة',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  hale_dorr: {
    name: 'نظام الأدوار الثلاثية',
    philosophy: 'توزيع كل فاتورة على الجالب والمشرف والمنفذ + احتياطي المؤسسة',
    pros: 'توازن بين التعاون والإنتاجية، عدالة في توزيع الأدوار',
    cons: 'تعقيد محاسبي، تتطلب تتبع أدوار كل قضية',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  hybrid: {
    name: 'النظام الهجين المعدل',
    philosophy: 'دمج أمان الأقدمية مع حافز الإنتاجية — شريحتان',
    pros: 'يجمع بين الاستقرار والتحفيز، مرن',
    cons: 'يتطلب تقييمات أداء دقيقة',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
};

export const comparisonData: { aspect: string; lockstep: string; ewyk: string; hale_dorr: string; hybrid: string }[] = [
  { aspect: 'مستوى التعاون', lockstep: 'مرتفع جداً', ewyk: 'منخفض (تنافسي)', hale_dorr: 'متوازن', hybrid: 'مرتفع' },
  { aspect: 'سهولة التطبيق المحاسبي', lockstep: 'بسيطة جداً', ewyk: 'متوسطة', hale_dorr: 'معقدة', hybrid: 'متوسطة' },
  { aspect: 'حماية المؤسسة من تقلب السوق', lockstep: 'عالية', ewyk: 'منخفضة', hale_dorr: 'متوسطة', hybrid: 'عالية' },
  { aspect: 'القدرة على جلب الشركاء الكبار', lockstep: 'صعبة', ewyk: 'سهلة جداً', hale_dorr: 'جاذبة للجميع', hybrid: 'جاذبة' },
];
