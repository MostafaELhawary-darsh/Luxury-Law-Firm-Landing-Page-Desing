import { useEffect, useState } from 'react';
import { Receipt, Plus, CheckCircle2, Circle } from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { Disbursement, Matter } from '@/lib/financeTypes';

export default function Disbursements() {
  const [disbursements, setDisbursements] = useState<(Disbursement & { matter?: Matter })[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [disbRes, matRes] = await Promise.all([
      supabase.from('lf_disbursements').select('*, matter:lf_matters(*)').order('expense_date', { ascending: false }),
      supabase.from('lf_matters').select('*'),
    ]);
    setDisbursements((disbRes.data as (Disbursement & { matter?: Matter })[]) || []);
    setMatters(matRes.data || []);
    setLoading(false);
  };

  const categories = ['رسوم محاكم', 'خبراء', 'ترجمة', 'سفر', 'مراسلات', 'أخرى'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalAmount = disbursements.reduce((sum, d) => sum + d.amount, 0);
  const reimbursedAmount = disbursements.filter((d) => d.reimbursed).reduce((sum, d) => sum + d.amount, 0);
  const pendingAmount = totalAmount - reimbursedAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">المصروفات النثرية المستردة</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors"
        >
          <Plus size={14} />
          تسجيل مصروف
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="font-body text-xs text-ink/50 mb-1">إجمالي المصروفات</p>
          <p className="font-heading font-bold text-midnight text-xl">{formatCurrency(totalAmount)} ج.م</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
          <p className="font-body text-xs text-ink/50 mb-1">مستردة</p>
          <p className="font-heading font-bold text-green-700 text-xl">{formatCurrency(reimbursedAmount)} ج.م</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
          <p className="font-body text-xs text-ink/50 mb-1">بانتظار الاسترداد</p>
          <p className="font-heading font-bold text-amber-700 text-xl">{formatCurrency(pendingAmount)} ج.م</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="font-body text-xs text-blue-700 leading-[1.8]">
          تُسجل المصروفات النثرية (رسوم المحاكم، أتعاب الخبراء، الترجمات، السفر) مباشرة على كود القضية،
          وتُدرج تلقائياً في الفاتورة القادمة للعميل دون إغفال أي بنود.
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-heading font-bold text-midnight text-sm mb-4">تسجيل مصروف جديد</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">القضية</label>
              <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none">
                <option value="">— اختر —</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>{m.matter_code} — {m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">الفئة</label>
              <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none">
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">المبلغ</label>
              <input type="number" step="0.01" placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">التاريخ</label>
              <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block font-body text-xs text-ink/60 mb-2">الوصف</label>
              <input type="text" placeholder="وصف المصروف" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <button className="px-4 py-2 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors">
                حفظ المصروف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-sm">سجل المصروفات حسب القضايا</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">القضية</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">الفئة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">المبلغ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">التاريخ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">الحالة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الوصف</th>
              </tr>
            </thead>
            <tbody>
              {disbursements.map((d, i) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">
                    {d.matter?.matter_code || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-ink/70 rounded text-[10px] font-body">
                      {d.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">
                    {formatCurrency(d.amount)} ج.م
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(d.expense_date)}</td>
                  <td className="px-4 py-3">
                    {d.reimbursed ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-600 font-body">
                        <CheckCircle2 size={12} />
                        مسترد
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-600 font-body">
                        <Circle size={12} />
                        بانتظار
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{d.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
