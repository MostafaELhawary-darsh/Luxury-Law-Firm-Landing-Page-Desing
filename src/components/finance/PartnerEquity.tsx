import { useEffect, useState } from 'react';
import { Users, Plus, TrendingUp, DollarSign } from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { Partner, Attorney, PartnerDraw } from '@/lib/financeTypes';

export default function PartnerEquity() {
  const [partners, setPartners] = useState<(Partner & { attorney?: Attorney })[]>([]);
  const [draws, setDraws] = useState<(PartnerDraw & { partner?: Partner & { attorney?: Attorney } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawForm, setShowDrawForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pRes, dRes] = await Promise.all([
      supabase.from('lf_partners').select('*, attorney:lf_attorneys(*)'),
      supabase.from('lf_partner_draws').select('*, partner:lf_partners(*, attorney:lf_attorneys(*))').order('draw_date', { ascending: false }),
    ]);
    setPartners((pRes.data as (Partner & { attorney?: Attorney })[]) || []);
    setDraws((dRes.data as (PartnerDraw & { partner?: Partner & { attorney?: Attorney } })[]) || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalRevenue = partners.reduce((sum, p) => sum + p.ytd_revenue, 0);
  const totalDraws = partners.reduce((sum, p) => sum + p.ytd_draws, 0);
  const totalEquity = partners.reduce((sum, p) => sum + p.equity_share, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">توزيع أرباح الشركاء وهيكل الملكية</h2>
        </div>
        <button
          onClick={() => setShowDrawForm(!showDrawForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors"
        >
          <Plus size={14} />
          تسجيل مسحوبات
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-green-600" />
            <p className="font-body text-xs text-ink/50">إجمالي الإيرادات (YTD)</p>
          </div>
          <p className="font-heading font-bold text-green-700 text-xl">{formatCurrency(totalRevenue)} ج.م</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-amber-600" />
            <p className="font-body text-xs text-ink/50">إجمالي المسحوبات (YTD)</p>
          </div>
          <p className="font-heading font-bold text-amber-700 text-xl">{formatCurrency(totalDraws)} ج.م</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-purple-600" />
            <p className="font-body text-xs text-ink/50">عدد الشركاء</p>
          </div>
          <p className="font-heading font-bold text-purple-700 text-xl">{partners.length} شريك</p>
        </div>
      </div>

      {/* Draw form */}
      {showDrawForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-heading font-bold text-midnight text-sm mb-4">تسجيل مسحوبات شريك</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">الشريك</label>
              <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none">
                <option value="">— اختر —</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.attorney?.name || '—'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">المبلغ</label>
              <input type="number" step="0.01" placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">الفترة</label>
              <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none">
                <option value="monthly">شهري</option>
                <option value="quarterly">فصلي</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <button className="px-4 py-2 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors">
                تأكيد المسحوبات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partners table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-sm">هيكل الملكية وأداء الشركاء</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الشريك</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">حصة الملكية</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">جلب القضايا</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">ساعات الإنتاج</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">ساعات الإشراف</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">إيرادات السنة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">المسحوبات</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">صافي المستحق</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p, i) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{p.attorney?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full" style={{ width: `${(p.equity_share / totalEquity) * 100}%` }} />
                      </div>
                      <span className="font-body text-xs text-ink/70">{p.equity_share}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{p.origination_credit}%</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{p.production_credit}%</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{p.supervision_credit}%</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-green-700">{formatCurrency(p.ytd_revenue)}</td>
                  <td className="px-4 py-3 font-body text-xs text-amber-700">{formatCurrency(p.ytd_draws)}</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(p.ytd_revenue - p.ytd_draws)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Draws history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-sm">سجل المسحوبات الدورية</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الشريك</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">المبلغ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">الفترة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">التاريخ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">التسوية</th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d, i) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">{d.partner?.attorney?.name || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(d.amount)} ج.م</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">
                    {d.period === 'monthly' ? 'شهري' : 'فصلي'}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(d.draw_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                      d.settled ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {d.settled ? 'تمت التسوية' : 'بانتظار'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
