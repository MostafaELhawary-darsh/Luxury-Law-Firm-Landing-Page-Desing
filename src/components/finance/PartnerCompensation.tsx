import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Calculator,
  ShieldCheck,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CheckCircle2,
  Loader2,
  Scale,
  Layers,
  GitBranch,
} from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { CompModelType } from '@/lib/compensationTypes';
import { modelInfo, comparisonData } from '@/lib/compensationTypes';
import type { Partner, Attorney, PartnerDraw } from '@/lib/financeTypes';

interface PartnerWithDetails extends Partner {
  attorney?: Attorney;
}

interface CompData {
  models: { id: string; model_type: CompModelType; model_name: string; is_active: boolean }[];
  partners: PartnerWithDetails[];
  points: Record<string, { points: number; max_points: number; years_as_partner: number }>;
  bonusEvals: Record<string, { new_clients_brought: number; billable_hours: number; bonus_score: number }>;
  reserve: { total_profit: number; holdback_percentage: number; holdback_amount: number; distributable_amount: number } | null;
  settlements: Array<{ partner_id: string; earned_amount: number; total_draws: number; holdback_deducted: number; net_payable: number; settlement_status: string }>;
  journalEntries: Array<{ id: string; entry_number: string; entry_type: string; description: string; partner_name: string | null; amount: number; debit_account: string | null; credit_account: string | null; entry_date: string; is_posted: boolean }>;
  draws: Array<PartnerDraw & { partner?: Partner & { attorney?: Attorney } }>;
}

export default function PartnerCompensation() {
  const [data, setData] = useState<CompData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState<CompModelType>('lockstep');
  const [activeTab, setActiveTab] = useState<'models' | 'mechanisms'>('models');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [modelsRes, partnersRes, pointsRes, bonusRes, reserveRes, settlementsRes, journalRes, drawsRes] = await Promise.all([
      supabase.from('lf_comp_models').select('*'),
      supabase.from('lf_partners').select('*, attorney:lf_attorneys(*)'),
      supabase.from('lf_partner_points').select('*'),
      supabase.from('lf_bonus_pool_evals').select('*'),
      supabase.from('lf_capital_reserves').select('*').order('year', { ascending: false }).limit(1),
      supabase.from('lf_year_end_settlements').select('*'),
      supabase.from('lf_comp_journal_entries').select('*').order('entry_date', { ascending: false }),
      supabase.from('lf_partner_draws').select('*, partner:lf_partners(*, attorney:lf_attorneys(*))').order('draw_date', { ascending: false }),
    ]);

    const partners = (partnersRes.data as PartnerWithDetails[]) || [];
    const pointsMap: Record<string, { points: number; max_points: number; years_as_partner: number }> = {};
    (pointsRes.data || []).forEach((p: { partner_id: string; points: number; max_points: number; years_as_partner: number }) => {
      pointsMap[p.partner_id] = { points: p.points, max_points: p.max_points, years_as_partner: p.years_as_partner };
    });
    const bonusMap: Record<string, { new_clients_brought: number; billable_hours: number; bonus_score: number }> = {};
    (bonusRes.data || []).forEach((b: { partner_id: string; new_clients_brought: number; billable_hours: number; bonus_score: number }) => {
      bonusMap[b.partner_id] = { new_clients_brought: b.new_clients_brought, billable_hours: b.billable_hours, bonus_score: b.bonus_score };
    });

    setData({
      models: (modelsRes.data as CompData['models']) || [],
      partners,
      points: pointsMap,
      bonusEvals: bonusMap,
      reserve: (reserveRes.data?.[0] as CompData['reserve']) || null,
      settlements: (settlementsRes.data as CompData['settlements']) || [],
      journalEntries: (journalRes.data as CompData['journalEntries']) || [],
      draws: (drawsRes.data as CompData['draws']) || [],
    });
    setLoading(false);
  };

  // Lockstep calculation
  const lockstepCalc = useMemo(() => {
    if (!data) return [];
    const totalPoints = data.partners.reduce((sum, p) => sum + (data.points[p.id]?.points || 0), 0);
    const distributable = data.reserve?.distributable_amount || 0;
    const pointValue = totalPoints > 0 ? distributable / totalPoints : 0;
    return data.partners.map((p) => {
      const pts = data.points[p.id]?.points || 0;
      const years = data.points[p.id]?.years_as_partner || 0;
      return {
        partner: p,
        points: pts,
        yearsAsPartner: years,
        share: totalPoints > 0 ? (pts / totalPoints) * 100 : 0,
        amount: pts * pointValue,
        pointValue,
      };
    });
  }, [data]);

  // EWYK calculation
  const ewykCalc = useMemo(() => {
    if (!data) return [];
    const totalRevenue = data.partners.reduce((sum, p) => sum + p.ytd_revenue, 0);
    const overheadRate = 0.25;
    const overheadPerPartner = (totalRevenue * overheadRate) / data.partners.length;
    return data.partners.map((p) => {
      const production = p.ytd_revenue * 0.70;
      const origination = p.ytd_revenue * 0.30;
      const gross = production + origination;
      const net = gross - overheadPerPartner;
      return {
        partner: p,
        production,
        origination,
        gross,
        overhead: overheadPerPartner,
        net,
      };
    });
  }, [data]);

  // Hale & Dorr calculation
  const haleDorrCalc = useMemo(() => {
    if (!data) return [];
    const totalRevenue = data.reserve?.total_profit || 0;
    const finderPct = 0.15;
    const minderPct = 0.15;
    const grinderPct = 0.60;
    const firmPct = 0.10;
    return data.partners.map((p) => {
      const finderShare = p.ytd_revenue * finderPct;
      const minderShare = p.ytd_revenue * minderPct;
      const grinderShare = p.ytd_revenue * grinderPct;
      const firmReserve = p.ytd_revenue * firmPct;
      const totalShare = finderShare + minderShare + grinderShare;
      return {
        partner: p,
        finderShare,
        minderShare,
        grinderShare,
        firmReserve,
        totalShare,
      };
    });
  }, [data]);

  // Hybrid calculation
  const hybridCalc = useMemo(() => {
    if (!data) return [];
    const totalRevenue = data.reserve?.distributable_amount || 0;
    const baseEquityPct = 0.65;
    const bonusPoolPct = 0.35;
    const basePool = totalRevenue * baseEquityPct;
    const bonusPool = totalRevenue * bonusPoolPct;
    const totalPoints = data.partners.reduce((sum, p) => sum + (data.points[p.id]?.points || 0), 0);
    const totalBonusScore = data.partners.reduce((sum, p) => sum + (data.bonusEvals[p.id]?.bonus_score || 0), 0);
    return data.partners.map((p) => {
      const pts = data.points[p.id]?.points || 0;
      const bonusScore = data.bonusEvals[p.id]?.bonus_score || 0;
      const baseAmount = totalPoints > 0 ? (pts / totalPoints) * basePool : 0;
      const bonusAmount = totalBonusScore > 0 ? (bonusScore / totalBonusScore) * bonusPool : 0;
      return {
        partner: p,
        points: pts,
        bonusScore,
        baseAmount,
        bonusAmount,
        total: baseAmount + bonusAmount,
      };
    });
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  const activeModelInfo = modelInfo[activeModel];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator size={20} className="text-gold" />
        <h2 className="font-heading font-bold text-midnight text-lg">أنظمة توزيع أرباح الشركاء</h2>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2 rounded-lg font-body text-xs transition-colors ${
            activeTab === 'models' ? 'bg-midnight text-cream' : 'bg-gray-100 text-ink/60 hover:text-ink'
          }`}
        >
          نماذج التوزيع
        </button>
        <button
          onClick={() => setActiveTab('mechanisms')}
          className={`px-4 py-2 rounded-lg font-body text-xs transition-colors ${
            activeTab === 'mechanisms' ? 'bg-midnight text-cream' : 'bg-gray-100 text-ink/60 hover:text-ink'
          }`}
        >
          الآليات المحاسبية
        </button>
      </div>

      {activeTab === 'models' && (
        <>
          {/* Model selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(modelInfo) as CompModelType[]).map((type) => {
              const info = modelInfo[type];
              const isActive = activeModel === type;
              const modelRecord = data.models.find((m) => m.model_type === type);
              const isSystemActive = modelRecord?.is_active;
              const icons: Record<CompModelType, typeof Users> = {
                lockstep: Layers,
                ewyk: TrendingUp,
                hale_dorr: Scale,
                hybrid: GitBranch,
              };
              const Icon = icons[type];
              return (
                <button
                  key={type}
                  onClick={() => setActiveModel(type)}
                  className={`rounded-xl p-4 text-right border transition-all duration-300 ${
                    isActive ? 'bg-white border-gold shadow-md' : 'bg-white/50 border-gray-200 hover:border-gold/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${info.bgColor}`}>
                      <Icon size={18} className={info.color} />
                    </div>
                    {isSystemActive && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-body">
                        <CheckCircle2 size={10} />
                        مفعّل
                      </span>
                    )}
                  </div>
                  <p className={`font-heading font-bold text-sm mb-1 ${isActive ? 'text-midnight' : 'text-ink/70'}`}>
                    {info.name}
                  </p>
                  <p className="font-body text-[10px] text-ink/50 leading-[1.7]">{info.philosophy}</p>
                </button>
              );
            })}
          </div>

          {/* Active model philosophy */}
          <div className={`rounded-xl p-4 border ${activeModelInfo.bgColor}`}>
            <h3 className={`font-heading font-bold text-sm mb-2 ${activeModelInfo.color}`}>
              {activeModelInfo.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="font-body text-xs text-ink/70 leading-[1.8]">{activeModelInfo.pros}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-600 flex-shrink-0 mt-0.5 text-xs">✕</span>
                <p className="font-body text-xs text-ink/70 leading-[1.8]">{activeModelInfo.cons}</p>
              </div>
            </div>
          </div>

          {/* Lockstep table */}
          {activeModel === 'lockstep' && (
            <ModelTable
              title="توزيع الأرباح بنظام النقاط والأقدمية"
              subtitle="قيمة النقطة = إجمالي الأرباح القابلة للتوزيع ÷ إجمالي نقاط الشركاء"
              headers={['م', 'الشريك', 'سنوات الشراكة', 'النقاط', 'نسبة المشاركة', 'المبلغ المستحق']}
              rows={lockstepCalc.map((row, i) => [
                String(i + 1),
                row.partner.attorney?.name || '—',
                `${row.yearsAsPartner} سنة`,
                `${row.points} / ${data.points[row.partner.id]?.max_points || 50}`,
                `${row.share.toFixed(1)}%`,
                `${formatCurrency(row.amount)} ج.م`,
              ])}
              footerTotal={`قيمة النقطة: ${formatCurrency(lockstepCalc[0]?.pointValue || 0)} ج.م`}
            />
          )}

          {/* EWYK table */}
          {activeModel === 'ewyk' && (
            <ModelTable
              title="توزيع الأرباح بنظام الإنتاجية المباشرة"
              subtitle="الإنتاج (70%) + جلب العملاء (30%) - المصاريف العمومية (25% موزعة بالتساوي)"
              headers={['م', 'الشريك', 'إيرادات الإنتاج', 'إيرادات الجلب', 'المصاريف العمومية', 'صافي المستحق']}
              rows={ewykCalc.map((row, i) => [
                String(i + 1),
                row.partner.attorney?.name || '—',
                formatCurrency(row.production),
                formatCurrency(row.origination),
                `(${formatCurrency(row.overhead)})`,
                `${formatCurrency(row.net)} ج.م`,
              ])}
            />
          )}

          {/* Hale & Dorr table */}
          {activeModel === 'hale_dorr' && (
            <ModelTable
              title="توزيع الفواتير بنظام الأدوار الثلاثية"
              subtitle="الجالب (15%) + المشرف (15%) + المنفذ (60%) + احتياطي المؤسسة (10%)"
              headers={['م', 'الشريك', 'حصة الجالب', 'حصة المشرف', 'حصة المنفذ', 'احتياطي المؤسسة', 'إجمالي المستحق']}
              rows={haleDorrCalc.map((row, i) => [
                String(i + 1),
                row.partner.attorney?.name || '—',
                formatCurrency(row.finderShare),
                formatCurrency(row.minderShare),
                formatCurrency(row.grinderShare),
                formatCurrency(row.firmReserve),
                `${formatCurrency(row.totalShare)} ج.م`,
              ])}
            />
          )}

          {/* Hybrid table */}
          {activeModel === 'hybrid' && (
            <ModelTable
              title="التوزيع الهجين — الأساس + مجمع المكافآت"
              subtitle="65% بناءً على الأقدمية (نقاط) + 35% بناءً على تقييم الأداء (مكافآت)"
              headers={['م', 'الشريك', 'النقاط', 'درجة الأداء', 'حصة الأساس (65%)', 'حصة المكافآت (35%)', 'الإجمالي']}
              rows={hybridCalc.map((row, i) => [
                String(i + 1),
                row.partner.attorney?.name || '—',
                String(row.points),
                row.bonusScore.toFixed(1),
                formatCurrency(row.baseAmount),
                formatCurrency(row.bonusAmount),
                `${formatCurrency(row.total)} ج.م`,
              ])}
            />
          )}

          {/* Comparison table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-heading font-bold text-midnight text-sm">مقارنة بين الأنظمة</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">وجه المقارنة</th>
                    <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الأقدمية</th>
                    <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الإنتاج الفردي</th>
                    <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الأدوار الثلاثية</th>
                    <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الهجين</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{row.aspect}</td>
                      <td className="px-4 py-3 font-body text-xs text-ink/70">{row.lockstep}</td>
                      <td className="px-4 py-3 font-body text-xs text-ink/70">{row.ewyk}</td>
                      <td className="px-4 py-3 font-body text-xs text-ink/70">{row.hale_dorr}</td>
                      <td className="px-4 py-3 font-body text-xs text-ink/70">{row.hybrid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'mechanisms' && (
        <>
          {/* Capital reserve / holdback */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <ShieldCheck size={16} className="text-gold" />
              <h3 className="font-heading font-bold text-midnight text-sm">ب) اقتطاع الاحتياطي الرأسمالي</h3>
            </div>
            <div className="p-5">
              <p className="font-body text-xs text-ink/50 mb-4 leading-[1.8]">
                قبل توزيع صافي الأرباح، يستقطع النظام آلياً نسبة محددة لتغذية رأس المال العامل لمواجهة التوسعات أو فترات انخفاض التحصيل.
              </p>
              {data.reserve && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-body text-[10px] text-ink/40 mb-1">إجمالي الأرباح</p>
                    <p className="font-heading font-bold text-midnight text-sm">{formatCurrency(data.reserve.total_profit)} ج.م</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="font-body text-[10px] text-ink/40 mb-1">نسبة الاقتطاع</p>
                    <p className="font-heading font-bold text-amber-700 text-sm">{data.reserve.holdback_percentage}%</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="font-body text-[10px] text-ink/40 mb-1">مبلغ الاحتياطي</p>
                    <p className="font-heading font-bold text-amber-700 text-sm">{formatCurrency(data.reserve.holdback_amount)} ج.م</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="font-body text-[10px] text-ink/40 mb-1">القابل للتوزيع</p>
                    <p className="font-heading font-bold text-green-700 text-sm">{formatCurrency(data.reserve.distributable_amount)} ج.م</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Monthly draws */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Banknote size={16} className="text-blue-600" />
              <h3 className="font-heading font-bold text-midnight text-sm">أ) المسحوبات الشهرية تحت حساب الأرباح</h3>
            </div>
            <div className="p-5">
              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <p className="font-body text-xs text-blue-700 leading-[1.8]">
                  القيد المحاسبي: من حـ/ مسحوبات الشركاء الجارية (3210) إلى حـ/ بنك التشغيل الرئيسي (1110)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-10">م</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60">الشريك</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-32">المبلغ</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-24">الفترة</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-32">التاريخ</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-24">التسوية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.draws.map((draw, i) => (
                      <tr key={draw.id} className="border-b border-gray-50">
                        <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                        <td className="px-4 py-3 font-body text-xs text-ink/80">{draw.partner?.attorney?.name || '—'}</td>
                        <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(draw.amount)} ج.م</td>
                        <td className="px-4 py-3 font-body text-xs text-ink/60">{draw.period === 'monthly' ? 'شهري' : 'فصلي'}</td>
                        <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(draw.draw_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                            draw.settled ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {draw.settled ? 'تمت' : 'بانتظار'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Year-end true-up */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Scale size={16} className="text-gold" />
              <h3 className="font-heading font-bold text-midnight text-sm">ج) التسوية النهائية بنهاية السنة (True-Up)</h3>
            </div>
            <div className="p-5">
              <p className="font-body text-xs text-ink/50 mb-4 leading-[1.8]">
                عند إغلاق السنة المالية: تُحسب الحصة الفعلية المستحقة لكل شريك، تُخصم إجمالي المسحوبات الشهرية، والنتيجة: مستحق إضافي (يُصرف) أو فائض مسحوبات (يُخصم من السنة القادمة).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-10">م</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60">الشريك</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">المستحق</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">المسحوبات</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">الاقتطاع</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">صافي الدفعة</th>
                      <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-24">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.settlements.map((s, i) => {
                      const partner = data.partners.find((p) => p.id === s.partner_id);
                      return (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                          <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{partner?.attorney?.name || '—'}</td>
                          <td className="px-4 py-3 font-body text-xs text-ink/70">{formatCurrency(s.earned_amount)}</td>
                          <td className="px-4 py-3 font-body text-xs text-amber-700">({formatCurrency(s.total_draws)})</td>
                          <td className="px-4 py-3 font-body text-xs text-red-600">({formatCurrency(s.holdback_deducted)})</td>
                          <td className="px-4 py-3 font-body text-xs font-bold text-green-700">{formatCurrency(s.net_payable)} ج.م</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                              s.settlement_status === 'تمت' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {s.settlement_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Journal entries */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Calculator size={16} className="text-gold" />
              <h3 className="font-heading font-bold text-midnight text-sm">قيود التوزيع المحاسبية</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-20">رقم القيد</th>
                    <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-20">النوع</th>
                    <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60">البيان</th>
                    <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-28">المبلغ</th>
                    <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-24">التاريخ</th>
                    <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-20">الترحيل</th>
                  </tr>
                </thead>
                <tbody>
                  {data.journalEntries.map((je) => (
                    <tr key={je.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{je.entry_number}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                          je.entry_type === 'draw' ? 'bg-blue-50 text-blue-700' :
                          je.entry_type === 'holdback' ? 'bg-amber-50 text-amber-700' :
                          'bg-green-50 text-green-700'
                        }`}>
                          {je.entry_type === 'draw' ? 'مسحوبات' : je.entry_type === 'holdback' ? 'احتياطي' : 'تسوية'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-ink/70">{je.description}</td>
                      <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(je.amount)} ج.م</td>
                      <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(je.entry_date)}</td>
                      <td className="px-4 py-3">
                        {je.is_posted ? (
                          <span className="flex items-center gap-1 text-[10px] text-green-600 font-body">
                            <CheckCircle2 size={12} />
                            مرحّل
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-body">بانتظار</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModelTable({
  title,
  subtitle,
  headers,
  rows,
  footerTotal,
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
  footerTotal?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-heading font-bold text-midnight text-sm mb-1">{title}</h3>
        <p className="font-body text-[10px] text-ink/50">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {headers.map((h, i) => (
                <th key={i} className={`px-4 py-2.5 font-body text-xs font-medium text-ink/60 ${i === 0 ? 'w-10' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-3 font-body text-xs ${j === 0 ? 'text-ink/40' : j === 1 ? 'font-bold text-midnight' : 'text-ink/70'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footerTotal && (
            <tfoot>
              <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                <td colSpan={headers.length} className="px-4 py-3 font-body text-xs font-bold text-gold">
                  {footerTotal}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
