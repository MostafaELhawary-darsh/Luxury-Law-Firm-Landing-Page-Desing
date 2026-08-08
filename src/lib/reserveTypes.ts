import { ShieldCheck, TrendingUp, AlertTriangle, Gauge, Calendar, Banknote, Layers, Activity, Loader2 } from 'lucide-react';
import { supabase, formatCurrency } from '@/lib/financeUtils';

export interface ReserveFactor {
  id: string;
  factor_key: string;
  factor_name: string;
  factor_value: number;
  risk_score: number;
  description: string;
}

export interface FinancialIndicator {
  id: string;
  indicator_key: string;
  indicator_name: string;
  current_value: number;
  target_min: number | null;
  target_max: number | null;
  unit: string;
  status: string;
  recommendation: string;
}

export interface HoldbackPolicy {
  id: string;
  policy_type: 'fixed' | 'dynamic';
  policy_name: string;
  is_active: boolean;
  fixed_percentage: number;
  target_coverage_months: number;
  dynamic_quarterly_threshold: number;
}

export interface ReserveHistoryItem {
  id: string;
  year: number;
  quarter: number;
  opening_balance: number;
  holdback_amount: number;
  distributed_amount: number;
  closing_balance: number;
  operating_bank_balance: number;
  total_opex: number;
  coverage_months: number;
}

export interface OpExItem {
  id: string;
  category: string;
  description: string;
  monthly_amount: number;
  is_fixed: boolean;
}

export const indicatorIcons: Record<string, typeof Gauge> = {
  opex_coverage: Gauge,
  dso: Calendar,
  quick_ratio: TrendingUp,
  realization_rate: Activity,
};

export const indicatorColors: Record<string, { ok: string; warn: string; danger: string }> = {
  opex_coverage: { ok: 'text-green-700', warn: 'text-amber-700', danger: 'text-red-700' },
  dso: { ok: 'text-green-700', warn: 'text-amber-700', danger: 'text-red-700' },
  quick_ratio: { ok: 'text-green-700', warn: 'text-amber-700', danger: 'text-red-700' },
  realization_rate: { ok: 'text-green-700', warn: 'text-amber-700', danger: 'text-red-700' },
};

export function getIndicatorStatusColor(status: string): string {
  if (status === 'ضمن الحدود') return 'text-green-700';
  if (status === 'مخاطر') return 'text-red-700';
  return 'text-amber-700';
}

export function getIndicatorBgColor(status: string): string {
  if (status === 'ضمن الحدود') return 'bg-green-50';
  if (status === 'مخاطر') return 'bg-red-50';
  return 'bg-amber-50';
}

export async function fetchReserveData() {
  const [factorsRes, indicatorsRes, policiesRes, historyRes, opexRes] = await Promise.all([
    supabase.from('lf_reserve_factors').select('*'),
    supabase.from('lf_financial_indicators').select('*'),
    supabase.from('lf_holdback_policies').select('*'),
    supabase.from('lf_reserve_history').select('*').order('year', { ascending: true }).order('quarter', { ascending: true }),
    supabase.from('lf_opex_items').select('*'),
  ]);

  return {
    factors: (factorsRes.data as ReserveFactor[]) || [],
    indicators: (indicatorsRes.data as FinancialIndicator[]) || [],
    policies: (policiesRes.data as HoldbackPolicy[]) || [],
    history: (historyRes.data as ReserveHistoryItem[]) || [],
    opexItems: (opexRes.data as OpExItem[]) || [],
  };
}

export function calculateReserveRecommendation(
  indicators: FinancialIndicator[],
  totalMonthlyOpEx: number,
  totalProfit: number,
  currentReserve: number
): {
  recommendedMonths: number;
  recommendedReserve: number;
  holdbackPercentage: number;
  surplus: number;
  shortfall: number;
} {
  const dso = indicators.find((i) => i.indicator_key === 'dso');
  const quickRatio = indicators.find((i) => i.indicator_key === 'quick_ratio');
  const realizationRate = indicators.find((i) => i.indicator_key === 'realization_rate');
  const opexCoverage = indicators.find((i) => i.indicator_key === 'opex_coverage');

  let recommendedMonths = 3;

  if (dso && dso.current_value >= 90) {
    recommendedMonths = 6;
  } else if (dso && dso.current_value >= 60) {
    recommendedMonths = 5;
  } else if (dso && dso.current_value >= 45) {
    recommendedMonths = 4;
  }

  if (quickRatio && quickRatio.current_value < 1.2) {
    recommendedMonths = Math.max(recommendedMonths, 5);
  }

  if (realizationRate && realizationRate.current_value < 85) {
    recommendedMonths = Math.max(recommendedMonths, 4);
  }

  if (opexCoverage && opexCoverage.current_value < 3) {
    recommendedMonths = Math.max(recommendedMonths, 5);
  }

  const recommendedReserve = totalMonthlyOpEx * recommendedMonths;
  const holdbackPercentage = totalProfit > 0 ? Math.min(((recommendedReserve - currentReserve) / totalProfit) * 100, 30) : 0;
  const surplus = Math.max(currentReserve - recommendedReserve, 0);
  const shortfall = Math.max(recommendedReserve - currentReserve, 0);

  return { recommendedMonths, recommendedReserve, holdbackPercentage, surplus, shortfall };
}
