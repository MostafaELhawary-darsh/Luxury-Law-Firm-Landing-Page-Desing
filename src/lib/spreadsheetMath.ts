// Local Spreadsheet Math Engine — legal-financial calculations
// All evaluations run in-browser. No external API calls.

export interface FormulaTemplate {
  id: string;
  label: string;
  category: 'compensation' | 'deadline' | 'fee' | 'tax' | 'penalty' | 'custom';
  description: string;
  inputs: { key: string; label: string; placeholder: string }[];
  compute: (vals: Record<string, number>) => { value: number; display: string };
}

export const FORMULA_TEMPLATES: FormulaTemplate[] = [
  {
    id: 'delay_compensation',
    label: 'تعويض التأخير في السداد',
    category: 'compensation',
    description: 'يحسب التعويض المستحق عن فترة التأخير وفقاً للسعر القانوني',
    inputs: [
      { key: 'principal', label: 'المبلغ الأصلي', placeholder: '100000' },
      { key: 'rate', label: 'سعر الفائدة القانونية %', placeholder: '5' },
      { key: 'days', label: 'أيام التأخير', placeholder: '30' },
    ],
    compute: (v) => {
      const value = v.principal * (v.rate / 100) * (v.days / 365);
      return { value, display: `${value.toFixed(2)} جنيه` };
    },
  },
  {
    id: 'court_fee',
    label: 'رسوم الدعوى',
    category: 'fee',
    description: 'يحسب الرسوم القضائية المستحقة على قيمة الدعوى',
    inputs: [
      { key: 'claim_value', label: 'قيمة الدعوى', placeholder: '50000' },
      { key: 'fee_rate', label: 'نسبة الرسوم %', placeholder: '4' },
    ],
    compute: (v) => {
      const value = v.claim_value * (v.rate / 100 || v.fee_rate / 100);
      return { value, display: `${value.toFixed(2)} جنيه` };
    },
  },
  {
    id: 'compound_interest',
    label: 'فائدة مركبة',
    category: 'penalty',
    description: 'يحسب الفائدة المركبة على مدى فترات',
    inputs: [
      { key: 'principal', label: 'رأس المال', placeholder: '100000' },
      { key: 'rate', label: 'نسبة الفائدة %', placeholder: '12' },
      { key: 'periods', label: 'عدد الفترات', placeholder: '5' },
    ],
    compute: (v) => {
      const value = v.principal * Math.pow(1 + v.rate / 100, v.periods) - v.principal;
      return { value, display: `${value.toFixed(2)} جنيه` };
    },
  },
  {
    id: 'inheritance_share',
    label: 'حصص الإرث (فرض شرعي)',
    category: 'custom',
    description: 'يحسب حصة الوارث من التركة',
    inputs: [
      { key: 'estate', label: 'قيمة التركة', placeholder: '1000000' },
      { key: 'share_numerator', label: 'بسط الحصة', placeholder: '1' },
      { key: 'share_denominator', label: 'مقام الحصة', placeholder: '8' },
    ],
    compute: (v) => {
      const value = v.estate * (v.share_numerator / v.share_denominator);
      return { value, display: `${value.toFixed(2)} جنيه` };
    },
  },
  {
    id: 'rent_indexation',
    label: 'Indexation الإيجار السنوي',
    category: 'custom',
    description: 'يحسب قيمة الزيادة السنوية للإيجار وفقاً لمؤشر التضخم',
    inputs: [
      { key: 'current_rent', label: 'الإيجار الحالي', placeholder: '24000' },
      { key: 'inflation_rate', label: 'نسبة التضخم %', placeholder: '10' },
    ],
    compute: (v) => {
      const increase = v.current_rent * (v.inflation_rate / 100);
      const newRent = v.current_rent + increase;
      return { value: increase, display: `الزيادة: ${increase.toFixed(2)} | الإيجار الجديد: ${newRent.toFixed(2)} جنيه` };
    },
  },
  {
    id: 'penalty_clause',
    label: 'شرط جزائي',
    category: 'penalty',
    description: 'يحسب قيمة الشرط الجزائي المستحق',
    inputs: [
      { key: 'contract_value', label: 'قيمة العقد', placeholder: '200000' },
      { key: 'penalty_pct', label: 'نسبة الشرط الجزائي %', placeholder: '10' },
    ],
    compute: (v) => {
      const value = v.contract_value * (v.penalty_pct / 100);
      return { value, display: `${value.toFixed(2)} جنيه` };
    },
  },
  {
    id: 'tax_stamp_duty',
    label: 'ضريبة الدمغة (الدمغة النسبية)',
    category: 'tax',
    description: 'يحسب ضريبة الدمغة المستحقة على المستند',
    inputs: [
      { key: 'doc_value', label: 'قيمة المستند', placeholder: '100000' },
      { key: 'stamp_rate', label: 'نسبة الدمغة %', placeholder: '0.6' },
    ],
    compute: (v) => {
      const value = v.doc_value * (v.stamp_rate / 100);
      return { value, display: `${value.toFixed(2)} جنيه` };
    },
  },
  {
    id: 'legal_deadline',
    label: 'حساب ميعاد قانوني',
    category: 'deadline',
    description: 'يحسب تاريخ انتهاء ميعاد قانوني بعد عدد أيام',
    inputs: [
      { key: 'start_year', label: 'سنة البدء', placeholder: '2026' },
      { key: 'start_month', label: 'شهر البدء (1-12)', placeholder: '8' },
      { key: 'start_day', label: 'يوم البدء', placeholder: '12' },
      { key: 'deadline_days', label: 'الميعاد (أيام)', placeholder: '15' },
    ],
    compute: (v) => {
      const start = new Date(Math.round(v.start_year), Math.round(v.start_month) - 1, Math.round(v.start_day));
      start.setDate(start.getDate() + Math.round(v.deadline_days));
      const display = start.toLocaleDateString('ar-EG');
      return { value: v.deadline_days, display: `تاريخ الانتهاء: ${display}` };
    },
  },
];

export function evaluateFormula(
  template: FormulaTemplate,
  inputValues: Record<string, string>
): { value: number; display: string } | { error: string } {
  const vals: Record<string, number> = {};
  for (const input of template.inputs) {
    const raw = inputValues[input.key];
    if (raw === undefined || raw === '') {
      return { error: `الحقل مطلوب: ${input.label}` };
    }
    const num = Number(raw);
    if (isNaN(num)) {
      return { error: `قيمة غير صالحة: ${input.label}` };
    }
    vals[input.key] = num;
  }
  try {
    return template.compute(vals);
  } catch {
    return { error: 'خطأ في حساب النتيجة' };
  }
}
