import { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Gauge,
  Calendar,
  Banknote,
  Layers,
  Activity,
  Loader2,
  Lock,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  Calculator,
  RotateCcw,
  Sigma,
} from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import {
  fetchReserveData,
  calculateReserveRecommendation,
  getIndicatorStatusColor,
  getIndicatorBgColor,
  indicatorIcons,
} from '@/lib/reserveTypes';
import type {
  ReserveFactor,
  FinancialIndicator,
  HoldbackPolicy,
  ReserveHistoryItem,
  OpExItem,
} from '@/lib/reserveTypes';

export default function CapitalReserve() {
  const [factors, setFactors] = useState<ReserveFactor[]>([]);
  const [indicators, setIndicators] = useState<FinancialIndicator[]>([]);
  const [policies, setPolicies] = useState<HoldbackPolicy[]>([]);
  const [history, setHistory] = useState<ReserveHistoryItem[]>([]);
  const [opexItems, setOpexItems] = useState<OpExItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchReserveData();
    setFactors(data.factors);
    setIndicators(data.indicators);
    setPolicies(data.policies);
    setHistory(data.history);
    setOpexItems(data.opexItems);
    setLoading(false);
  };

  const totalMonthlyOpEx = useMemo(() => opexItems.reduce((sum, item) => sum + item.monthly_amount, 0), [opexItems]);
  const currentReserve = history.length > 0 ? history[history.length - 1].closing_balance : 0;
  const totalProfit = 21800000;

  const recommendation = useMemo(
    () => calculateReserveRecommendation(indicators, totalMonthlyOpEx, totalProfit, currentReserve),
    [indicators, totalMonthlyOpEx, currentReserve]
  );

  const activePolicy = policies.find((p) => p.is_active) || policies[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck size={20} className="text-gold" />
        <h2 className="font-heading font-bold text-midnight text-lg">إدارة الاحتياطي الرأسمالي</h2>
      </div>

      {/* Top summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={16} className="text-midnight" />
            <p className="font-body text-xs text-ink/50">الاحتياطي الحالي</p>
          </div>
          <p className="font-heading font-bold text-midnight text-xl">{formatCurrency(currentReserve)}</p>
          <p className="font-body text-[10px] text-ink/40 mt-1">
            يغطي {(currentReserve / totalMonthlyOpEx).toFixed(1)} شهر من المصاريف
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gold/30 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={16} className="text-gold" />
            <p className="font-body text-xs text-ink/50">الاحتياطي المستهدف</p>
          </div>
          <p className="font-heading font-bold text-gold text-xl">{formatCurrency(recommendation.recommendedReserve)}</p>
          <p className="font-body text-[10px] text-ink/40 mt-1">
            {recommendation.recommendedMonths} أشهر من المصاريف التشغيلية
          </p>
        </div>
        <div className={`bg-white rounded-xl border shadow-sm p-5 ${
          recommendation.shortfall > 0 ? 'border-red-200' : 'border-green-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {recommendation.shortfall > 0 ? (
              <ArrowDownCircle size={16} className="text-red-600" />
            ) : (
              <ArrowUpCircle size={16} className="text-green-600" />
            )}
            <p className="font-body text-xs text-ink/50">
              {recommendation.shortfall > 0 ? 'العجز المطلوب تغطيته' : 'الفائض القابل للتوزيع'}
            </p>
          </div>
          <p className={`font-heading font-bold text-xl ${
            recommendation.shortfall > 0 ? 'text-red-700' : 'text-green-700'
          }`}>
            {formatCurrency(recommendation.shortfall > 0 ? recommendation.shortfall : recommendation.surplus)}
          </p>
          <p className="font-body text-[10px] text-ink/40 mt-1">
            {recommendation.shortfall > 0 ? 'يلزم زيادة الاقتطاع' : 'آمن للتوزيع على الشركاء'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={16} className="text-blue-600" />
            <p className="font-body text-xs text-ink/50">نسبة الاقتطاع المقترحة</p>
          </div>
          <p className="font-heading font-bold text-blue-700 text-xl">{recommendation.holdbackPercentage.toFixed(1)}%</p>
          <p className="font-body text-[10px] text-ink/40 mt-1">من صافي الأرباح السنوية</p>
        </div>
      </div>

      {/* Recommendation banner */}
      {recommendation.shortfall > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm text-red-700 font-bold mb-1">تنبيه: عجز في الاحتياطي الرأسمالي</p>
            <p className="font-body text-xs text-red-600 leading-[1.8]">
              الاحتياطي الحالي ({formatCurrency(currentReserve)}) أقل من المستهدف ({formatCurrency(recommendation.recommendedReserve)}).
              يُنصح برفع نسبة الاقتطاع إلى {recommendation.holdbackPercentage.toFixed(1)}% من صافي الأرباح حتى الوصول للسقف المستهدف.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body text-sm text-green-700 font-bold mb-1">الاحتياطي ضمن المستوى الآمن</p>
            <p className="font-body text-xs text-green-600 leading-[1.8]">
              الاحتياطي الحالي يغطي أكثر من {recommendation.recommendedMonths} أشهر من المصاريف التشغيلية.
              الفائض البالغ {formatCurrency(recommendation.surplus)} ج.م يمكن توزيعه على الشركاء.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Governing factors */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-midnight text-cream flex items-center justify-center font-body text-[10px] font-bold">1</span>
          <h3 className="font-heading font-bold text-midnight text-sm">العوامل الحاكمة لتحديد حجم الاحتياطي</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factors.map((factor) => {
            const riskLevel = factor.risk_score >= 6 ? 'عالي' : factor.risk_score >= 4 ? 'متوسط' : 'منخفض';
            const riskColor = factor.risk_score >= 6 ? 'text-red-600' : factor.risk_score >= 4 ? 'text-amber-600' : 'text-green-600';
            const riskBg = factor.risk_score >= 6 ? 'bg-red-50' : factor.risk_score >= 4 ? 'bg-amber-50' : 'bg-green-50';
            const icons: Record<string, typeof TrendingUp> = {
              collection_lag: Calendar,
              seasonality: Activity,
              fixed_overhead: Banknote,
              bad_debt: AlertTriangle,
            };
            const Icon = icons[factor.factor_key] || TrendingUp;
            return (
              <div key={factor.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${riskBg}`}>
                      <Icon size={16} className={riskColor} />
                    </div>
                    <p className="font-body text-xs font-bold text-midnight">{factor.factor_name}</p>
                  </div>
                  <div className="text-left">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body ${riskBg} ${riskColor}`}>
                      {riskLevel}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="font-heading font-bold text-midnight text-lg">{formatCurrency(factor.factor_value)}</p>
                  <span className="font-body text-[10px] text-ink/40">درجة المخاطر: {factor.risk_score}/10</span>
                </div>
                <p className="font-body text-[10px] text-ink/50 leading-[1.7]">{factor.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Financial indicators */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-midnight text-cream flex items-center justify-center font-body text-[10px] font-bold">2</span>
          <h3 className="font-heading font-bold text-midnight text-sm">النسب والمؤشرات المحاسبية</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {indicators.map((ind) => {
            const Icon = indicatorIcons[ind.indicator_key] || Gauge;
            const statusColor = getIndicatorStatusColor(ind.status);
            const bgColor = getIndicatorBgColor(ind.status);
            const isInRange = ind.status === 'ضمن الحدود';
            const isLowerBetter = ind.indicator_key === 'dso';

            return (
              <div key={ind.id} className={`rounded-xl border border-gray-200 shadow-sm p-5 ${bgColor}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                    <Icon size={18} className={statusColor} />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-body bg-white ${statusColor}`}>
                    {ind.status}
                  </span>
                </div>
                <p className="font-body text-[10px] text-ink/50 mb-1">{ind.indicator_name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <p className={`font-heading font-bold text-xl ${statusColor}`}>{ind.current_value}</p>
                  <span className="font-body text-[10px] text-ink/40">{ind.unit}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isInRange ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{
                        width: isLowerBetter
                          ? `${Math.min((ind.target_max! / ind.current_value) * 100, 100)}%`
                          : `${Math.min((ind.current_value / (ind.target_max || 100)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-body text-[9px] text-ink/40">
                    {ind.target_min}–{ind.target_max}{ind.unit}
                  </span>
                </div>
                <p className="font-body text-[10px] text-ink/60 leading-[1.7]">{ind.recommendation}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: OpEx breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Banknote size={16} className="text-midnight" />
          <h3 className="font-heading font-bold text-midnight text-sm">المصاريف التشغيلية الثابتة (شهرياً)</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {opexItems.map((item) => (
              <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-body text-[10px] text-ink/40 mb-1">{item.category}</p>
                <p className="font-body text-xs text-ink/70 mb-1 truncate">{item.description}</p>
                <p className="font-heading font-bold text-midnight text-sm">{formatCurrency(item.monthly_amount)} ج.م</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between bg-midnight rounded-lg px-4 py-3">
            <p className="font-body text-xs text-cream/70">إجمالي المصاريف التشغيلية الشهرية</p>
            <p className="font-heading font-bold text-gold text-lg">{formatCurrency(totalMonthlyOpEx)} ج.م</p>
          </div>
        </div>
      </div>

      {/* Section 4: Holdback policies */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-midnight text-cream flex items-center justify-center font-body text-[10px] font-bold">3</span>
          <h3 className="font-heading font-bold text-midnight text-sm">آلية الاقتطاع المتبعة عملياً</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((policy) => {
            const isActive = policy.is_active;
            const icons: Record<string, typeof Lock> = { fixed: Lock, dynamic: Zap };
            const Icon = icons[policy.policy_type] || Lock;
            return (
              <div
                key={policy.id}
                className={`rounded-xl border-2 p-5 transition-all ${
                  isActive ? 'border-gold bg-white shadow-md' : 'border-gray-200 bg-white/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-gold/10' : 'bg-gray-100'}`}>
                      <Icon size={18} className={isActive ? 'text-gold' : 'text-ink/40'} />
                    </div>
                    <p className={`font-heading font-bold text-sm ${isActive ? 'text-midnight' : 'text-ink/60'}`}>
                      {policy.policy_name}
                    </p>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-body">
                      <CheckCircle2 size={10} />
                      مفعّل
                    </span>
                  )}
                </div>
                {policy.policy_type === 'fixed' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs text-ink/50">نسبة الاقتطاع</span>
                      <span className="font-heading font-bold text-midnight text-sm">{policy.fixed_percentage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs text-ink/50">سقف التغطية المستهدف</span>
                      <span className="font-heading font-bold text-midnight text-sm">{policy.target_coverage_months} أشهر</span>
                    </div>
                    <p className="font-body text-[10px] text-ink/50 leading-[1.7] pt-2 border-t border-gray-100">
                      اقتطاع نسبة محددة من صافي الأرباح السنوية وتوجيهها لحساب الاحتياطي حتى الوصول للسقف المستهدف.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs text-ink/50">حد السيولة الربع سنوي</span>
                      <span className="font-heading font-bold text-midnight text-sm">{formatCurrency(policy.dynamic_quarterly_threshold)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs text-ink/50">سقف التغطية المستهدف</span>
                      <span className="font-heading font-bold text-midnight text-sm">{policy.target_coverage_months} أشهر</span>
                    </div>
                    <p className="font-body text-[10px] text-ink/50 leading-[1.7] pt-2 border-t border-gray-100">
                      يرتبط الاقتطاع بمستوى السيولة في نهاية كل ربع سنة — إذا نقص الرصيد عن الحد تُقتطع نسبة آلياً.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: Quarterly history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">تطور الاحتياطي الرأسمالي — تتبع ربع سنوي</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-16">السنة/الربع</th>
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">رصيد الافتتاح</th>
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">اقتطاع</th>
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">توزيع</th>
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">رصيد الإغلاق</th>
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">الرصيد البنكي</th>
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">المصاريف</th>
                <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-24">التغطية</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">
                    {item.year} - Q{item.quarter}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{formatCurrency(item.opening_balance)}</td>
                  <td className="px-4 py-3 font-body text-xs text-green-700">+{formatCurrency(item.holdback_amount)}</td>
                  <td className="px-4 py-3 font-body text-xs text-amber-700">
                    {item.distributed_amount > 0 ? `-${formatCurrency(item.distributed_amount)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(item.closing_balance)}</td>
                  <td className="px-4 py-3 font-body text-xs text-blue-700">{formatCurrency(item.operating_bank_balance)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatCurrency(item.total_opex)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                      item.coverage_months >= 4 ? 'bg-green-50 text-green-700' :
                      item.coverage_months >= 3 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {item.coverage_months.toFixed(1)} شهر
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Calculator */}
      <ReserveCalculator defaultOpex={totalMonthlyOpEx} currentReserve={currentReserve} />
    </div>
  );
}

function ReserveCalculator({ defaultOpex, currentReserve }: { defaultOpex: number; currentReserve: number }) {
  const [opex, setOpex] = useState(defaultOpex || 100000);
  const [months, setMonths] = useState(4);
  const [realizationRate, setRealizationRate] = useState(85);
  const [dso, setDso] = useState(60);

  const reset = () => {
    setOpex(defaultOpex || 100000);
    setMonths(4);
    setRealizationRate(85);
    setDso(60);
  };

  const calc = useMemo(() => {
    const E = opex;
    const M = months;
    const R = realizationRate / 100;
    const D = Math.max(0, dso);

    const baseReserve = E * M;
    const realizationAdjusted = R > 0 ? baseReserve / R : baseReserve;
    const dsoFactor = D <= 30 ? 0 : D / 30;
    const dsoAdjustment = realizationAdjusted * dsoFactor;
    const totalReserve = realizationAdjusted + dsoAdjustment;

    const gap = totalReserve - currentReserve;
    const holdbackPct = gap > 0 && defaultOpex > 0 ? Math.min((gap / (defaultOpex * 12 * 1.5)) * 100, 30) : 0;

    return {
      baseReserve,
      realizationAdjusted,
      dsoFactor,
      dsoAdjustment,
      totalReserve,
      gap,
      holdbackPct,
      coverageMonths: E > 0 ? totalReserve / E : 0,
    };
  }, [opex, months, realizationRate, dso, currentReserve, defaultOpex]);

  return (
    <div className="bg-white rounded-xl border-2 border-gold/30 shadow-md overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">الحاسبة التفاعلية لتقدير الاحتياطي الرأسمالي</h3>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors font-body text-[10px] text-ink/60"
        >
          <RotateCcw size={12} />
          إعادة ضبط
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Inputs */}
        <div className="p-5 space-y-5 border-l border-gray-100">
          <CalcInput
            label="E — المصاريف التشغيلية الشهرية"
            value={opex}
            onChange={setOpex}
            min={10000}
            max={5000000}
            step={5000}
            unit="ريال"
            icon={<Banknote size={14} className="text-ink/40" />}
          />
          <CalcInput
            label="M — أشهر التغطية المستهدفة"
            value={months}
            onChange={(v) => setMonths(Math.round(v))}
            min={1}
            max={12}
            step={1}
            unit="شهر"
            icon={<Calendar size={14} className="text-ink/40" />}
          />
          <CalcInput
            label="R — معدل التحصيل (Realization Rate)"
            value={realizationRate}
            onChange={setRealizationRate}
            min={50}
            max={100}
            step={1}
            unit="%"
            icon={<Activity size={14} className="text-ink/40" />}
          />
          <CalcInput
            label="D — متوسط فترة التحصيل بالأيام (DSO)"
            value={dso}
            onChange={(v) => setDso(Math.round(v))}
            min={0}
            max={180}
            step={5}
            unit="يوم"
            icon={<Gauge size={14} className="text-ink/40" />}
          />

          {/* DSO note */}
          {dso <= 30 && (
            <div className="bg-green-50 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="font-body text-[10px] text-green-700 leading-[1.7]">
                DSO ≤ 30 يوماً — معامل تأخير التحصيل = 0 (لا حاجة لتعديل إضافي)
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="p-5 bg-gradient-to-br from-midnight to-midnight/95 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sigma size={16} className="text-gold" />
            <h4 className="font-heading font-bold text-gold text-sm">تفكيك مكونات الاحتياطي</h4>
          </div>

          {/* Formula steps */}
          <div className="space-y-3">
            <FormulaStep
              step="1"
              label="الاحتياطي الأساسي (E × M)"
              formula={`${formatCurrency(opex)} × ${months}`}
              value={calc.baseReserve}
            />
            <FormulaStep
              step="2"
              label="معدّل بالتحصيل (÷ R)"
              formula={`${formatCurrency(calc.baseReserve)} ÷ ${(realizationRate / 100).toFixed(2)}`}
              value={calc.realizationAdjusted}
            />
            <FormulaStep
              step="3"
              label={`معامل تأخير التحصيل (D/30 = ${calc.dsoFactor.toFixed(2)})`}
              formula={dso <= 30 ? '0 (DSO ≤ 30)' : `${formatCurrency(calc.realizationAdjusted)} × ${calc.dsoFactor.toFixed(2)}`}
              value={calc.dsoAdjustment}
            />
          </div>

          {/* Total */}
          <div className="bg-gold/10 rounded-xl p-4 border border-gold/30">
            <div className="flex items-center justify-between mb-2">
              <p className="font-body text-xs text-cream/70">إجمالي الاحتياطي المطلوب</p>
              <span className="font-body text-[10px] text-cream/40">
                يغطي {calc.coverageMonths.toFixed(1)} شهر
              </span>
            </div>
            <p className="font-heading font-bold text-gold text-2xl">{formatCurrency(calc.totalReserve)} ريال</p>
          </div>

          {/* Gap analysis */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="font-body text-[10px] text-cream/50 mb-1">الاحتياطي الحالي</p>
              <p className="font-heading font-bold text-cream text-sm">{formatCurrency(currentReserve)}</p>
            </div>
            <div className={`bg-white/5 rounded-lg p-3 ${calc.gap > 0 ? 'border border-red-400/30' : 'border border-green-400/30'}`}>
              <p className="font-body text-[10px] text-cream/50 mb-1">
                {calc.gap > 0 ? 'العجز' : 'الفائض'}
              </p>
              <p className={`font-heading font-bold text-sm ${calc.gap > 0 ? 'text-red-300' : 'text-green-300'}`}>
                {formatCurrency(Math.abs(calc.gap))}
              </p>
            </div>
          </div>

          {/* Recommendation */}
          {calc.gap > 0 ? (
            <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-300 flex-shrink-0 mt-0.5" />
              <p className="font-body text-[10px] text-red-200 leading-[1.7]">
                يلزم اقتطاع ~{calc.holdbackPct.toFixed(1)}% من صافي الأرباح السنوية لسد العجز وتحقيق المستهدف.
              </p>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-400/20 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 size={14} className="text-green-300 flex-shrink-0 mt-0.5" />
              <p className="font-body text-[10px] text-green-200 leading-[1.7]">
                الاحتياطي الحالي يغطي المستهدف. الفائض آمن للتوزيع على الشركاء.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalcInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  icon,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <label className="font-body text-xs text-ink/70">{label}</label>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-heading font-bold text-midnight text-sm">{value.toLocaleString('en-US')}</span>
          <span className="font-body text-[10px] text-ink/40">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gold"
      />
      <div className="flex items-center justify-between mt-1">
        <span className="font-body text-[9px] text-ink/30">{min.toLocaleString('en-US')}</span>
        <span className="font-body text-[9px] text-ink/30">{max.toLocaleString('en-US')}</span>
      </div>
    </div>
  );
}

function FormulaStep({
  step,
  label,
  formula,
  value,
}: {
  step: string;
  label: string;
  formula: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-body text-[10px] font-bold flex-shrink-0">
          {step}
        </span>
        <div className="min-w-0">
          <p className="font-body text-[10px] text-cream/60 truncate">{label}</p>
          <p className="font-body text-[9px] text-cream/40 truncate">{formula}</p>
        </div>
      </div>
      <p className="font-heading font-bold text-cream text-xs flex-shrink-0">{formatCurrency(value)}</p>
    </div>
  );
}
