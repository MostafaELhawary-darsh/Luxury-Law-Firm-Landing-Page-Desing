import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
  Users,
  Banknote,
} from 'lucide-react';
import { supabase, formatCurrency, formatHours } from '@/lib/financeUtils';
import type { KPIData } from '@/lib/financeTypes';

interface DashboardProps {
  onNavigate: (module: string) => void;
}

export default function FinanceDashboard({ onNavigate }: DashboardProps) {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    setLoading(true);

    const [timeRes, attorneysRes, invoicesRes, trustRes, mattersRes, partnersRes] = await Promise.all([
      supabase.from('lf_time_entries').select('hours, is_billable, rate, invoiced'),
      supabase.from('lf_attorneys').select('target_hours'),
      supabase.from('lf_invoices').select('total, amount_paid, status, due_date, issue_date'),
      supabase.from('lf_trust_accounts').select('balance, account_name'),
      supabase.from('lf_matters').select('status, work_suspended'),
      supabase.from('lf_partners').select('ytd_revenue, ytd_draws'),
    ]);

    const timeEntries = timeRes.data || [];
    const attorneys = attorneysRes.data || [];
    const invoices = invoicesRes.data || [];
    const trustAccounts = trustRes.data || [];
    const matters = mattersRes.data || [];
    const partners = partnersRes.data || [];

    const billableHours = timeEntries
      .filter((t) => t.is_billable)
      .reduce((sum, t) => sum + t.hours, 0);
    const totalHours = timeEntries.reduce((sum, t) => sum + t.hours, 0);
    const totalTarget = attorneys.reduce((sum, a) => sum + (a.target_hours || 0), 0);
    const utilization = totalTarget > 0 ? (billableHours / totalTarget) * 100 : 0;

    const billedAmount = invoices.reduce((sum, i) => sum + i.total, 0);
    const collectedAmount = invoices.reduce((sum, i) => sum + i.amount_paid, 0);
    const realization = billedAmount > 0 ? (collectedAmount / billedAmount) * 100 : 0;

    const totalRevenue = partners.reduce((sum, p) => sum + p.ytd_revenue, 0);
    const partnerCount = partners.length;
    const rpe = partnerCount > 0 ? totalRevenue / partnerCount : 0;

    const outstanding = invoices
      .filter((i) => i.status !== 'مدفوعة')
      .reduce((sum, i) => sum + (i.total - i.amount_paid), 0);

    const trustBalance = trustAccounts
      .filter((a) => a.account_name.includes('أمانات'))
      .reduce((sum, a) => sum + a.balance, 0);
    const operatingBalance = trustAccounts
      .filter((a) => !a.account_name.includes('أمانات'))
      .reduce((sum, a) => sum + a.balance, 0);

    const overdueCount = invoices.filter((i) => {
      if (i.status === 'مدفوعة') return false;
      return new Date(i.due_date).getTime() < Date.now() && i.amount_paid < i.total;
    }).length;

    const activeMatters = matters.filter((m) => m.status === 'مفتوح').length;

    setKpi({
      utilizationRate: utilization,
      realizationRate: realization,
      revenuePerPartner: rpe,
      totalBillableHours: billableHours,
      totalRevenue,
      totalOutstanding: outstanding,
      trustBalance,
      operatingBalance,
      overdueCount,
      activeMatters,
    });
    setLoading(false);
  };

  if (loading || !kpi) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      label: 'معدل الاستغلال',
      value: `${kpi.utilizationRate.toFixed(1)}%`,
      sub: `${formatHours(kpi.totalBillableHours)} من الساعات القابلة للفوترة`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      module: 'billing',
    },
    {
      label: 'معدل التحصيل',
      value: `${kpi.realizationRate.toFixed(1)}%`,
      sub: 'نسبة الأتعاب المحصلة فعلياً',
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      module: 'ar',
    },
    {
      label: 'متوسط العائد لكل شريك',
      value: `${formatCurrency(kpi.revenuePerPartner)} ج.م`,
      sub: 'RPE - Revenue Per Partner',
      icon: Users,
      color: 'text-gold',
      bg: 'bg-amber-50',
      module: 'partners',
    },
    {
      label: 'الإيرادات السنوية',
      value: `${formatCurrency(kpi.totalRevenue)} ج.م`,
      sub: 'إجمالي إيرادات السنة المالية',
      icon: Banknote,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      module: 'billing',
    },
  ];

  const secondaryCards = [
    {
      label: 'رصيد حسابات الأمانات',
      value: `${formatCurrency(kpi.trustBalance)} ج.م`,
      icon: ShieldCheck,
      color: 'text-green-700',
      bg: 'bg-green-50',
      module: 'trust',
    },
    {
      label: 'الرصيد التشغيلي',
      value: `${formatCurrency(kpi.operatingBalance)} ج.م`,
      icon: Banknote,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      module: 'trust',
    },
    {
      label: 'المبالغ المستحقة',
      value: `${formatCurrency(kpi.totalOutstanding)} ج.م`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      module: 'ar',
    },
    {
      label: 'القضايا النشطة',
      value: String(kpi.activeMatters),
      icon: Briefcase,
      color: 'text-midnight',
      bg: 'bg-gray-100',
      module: 'billing',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Clock size={20} className="text-gold" />
        <h2 className="font-heading font-bold text-midnight text-lg">لوحة القيادة المالية</h2>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              onClick={() => onNavigate(card.module)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-right hover:border-gold/30 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon size={20} className={card.color} />
                </div>
              </div>
              <p className="font-body text-xs text-ink/50 mb-1">{card.label}</p>
              <p className="font-heading font-bold text-midnight text-xl mb-1">{card.value}</p>
              <p className="font-body text-[10px] text-ink/40">{card.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              onClick={() => onNavigate(card.module)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-right hover:border-gold/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bg} flex-shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div>
                  <p className="font-body text-[10px] text-ink/50">{card.label}</p>
                  <p className="font-heading font-bold text-midnight text-sm">{card.value}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Overdue alert */}
      {kpi.overdueCount > 0 && (
        <button
          onClick={() => onNavigate('ar')}
          className="w-full bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 hover:bg-red-100 transition-colors text-right"
        >
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="font-body text-sm text-red-700 font-bold">
              {kpi.overdueCount} فاتورة متأخرة عن السداد
            </p>
            <p className="font-body text-xs text-red-500">
              يُنصح بمراجعة الملفات المتأخرة ودراسة إيقاف العمل على القضايا المتجاوزة لحدود الائتمان
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
