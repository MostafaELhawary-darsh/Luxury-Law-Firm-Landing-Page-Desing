import { useEffect, useState } from 'react';
import { Clock, FileText, Plus, DollarSign } from 'lucide-react';
import { supabase, formatCurrency, formatHours, formatDate } from '@/lib/financeUtils';
import type { TimeEntry, Matter, Attorney, Invoice, FeeAgreement } from '@/lib/financeTypes';

export default function TimeBilling() {
  const [timeEntries, setTimeEntries] = useState<(TimeEntry & { matter?: Matter; attorney?: Attorney })[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [invoices, setInvoices] = useState<(Invoice & { matter?: Matter; client?: { name: string } })[]>([]);
  const [feeAgreements, setFeeAgreements] = useState<FeeAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [teRes, matRes, attRes, invRes, feeRes] = await Promise.all([
      supabase.from('lf_time_entries').select('*, matter:lf_matters(*), attorney:lf_attorneys(*)').order('entry_date', { ascending: false }).limit(20),
      supabase.from('lf_matters').select('*'),
      supabase.from('lf_attorneys').select('*'),
      supabase.from('lf_invoices').select('*, matter:lf_matters(*), client:lf_clients(name)').order('issue_date', { ascending: false }),
      supabase.from('lf_fee_agreements').select('*'),
    ]);
    setTimeEntries((teRes.data as (TimeEntry & { matter?: Matter; attorney?: Attorney })[]) || []);
    setMatters(matRes.data || []);
    setAttorneys(attRes.data || []);
    setInvoices((invRes.data as (Invoice & { matter?: Matter; client?: { name: string } })[]) || []);
    setFeeAgreements(feeRes.data || []);
    setLoading(false);
  };

  const feeTypeLabels: Record<string, string> = {
    hourly: 'أتعاب بالساعة',
    fixed: 'أتعاب ثابتة',
    contingency: 'أتعاب نجاح (نسبة)',
    retainer: 'عقد ممتد (شهري)',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">محاسبة القضايا وتتبع الساعات</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTimeForm(!showTimeForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors"
          >
            <Plus size={14} />
            تسجيل ساعات
          </button>
          <button
            onClick={() => setShowInvoiceForm(!showInvoiceForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-xs hover:bg-gold-dark transition-colors"
          >
            <FileText size={14} />
            إصدار فاتورة
          </button>
        </div>
      </div>

      {/* Fee structures summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-heading font-bold text-midnight text-sm mb-4">شرائح الأتعاب حسب القضايا</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {matters.map((m) => {
            const fee = feeAgreements.find((f) => f.matter_id === m.id);
            if (!fee) return null;
            return (
              <div key={m.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="font-body text-[10px] text-ink/40 mb-1">{m.matter_code}</p>
                <p className="font-body text-xs text-ink/80 mb-2 truncate">{m.title}</p>
                <span className="inline-block px-2 py-1 bg-gold/10 text-gold rounded text-[10px] font-body">
                  {feeTypeLabels[fee.fee_type] || fee.fee_type}
                </span>
                {fee.hourly_rate && (
                  <p className="font-body text-xs text-ink/60 mt-2">{formatCurrency(fee.hourly_rate)} ج.م/ساعة</p>
                )}
                {fee.fixed_amount && (
                  <p className="font-body text-xs text-ink/60 mt-2">{formatCurrency(fee.fixed_amount)} ج.م (ثابت)</p>
                )}
                {fee.contingency_percentage && (
                  <p className="font-body text-xs text-ink/60 mt-2">{fee.contingency_percentage}% (نجاح)</p>
                )}
                {fee.monthly_retainer && (
                  <p className="font-body text-xs text-ink/60 mt-2">{formatCurrency(fee.monthly_retainer)} ج.م/شهر</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time entry form */}
      {showTimeForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-heading font-bold text-midnight text-sm mb-4">تسجيل ساعات عمل جديدة</h3>
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
              <label className="block font-body text-xs text-ink/60 mb-2">المحامي</label>
              <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none">
                <option value="">— اختر —</option>
                {attorneys.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">التاريخ</label>
              <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">عدد الساعات</label>
              <input type="number" step="0.25" placeholder="0.0" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block font-body text-xs text-ink/60 mb-2">الوصف</label>
              <input type="text" placeholder="وصف العمل المنجز" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-gold" />
                <span className="font-body text-xs text-ink/70">قابل للفوترة</span>
              </label>
              <button className="px-4 py-2 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice form */}
      {showInvoiceForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-heading font-bold text-midnight text-sm mb-4">إصدار فاتورة جديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block font-body text-xs text-ink/60 mb-2">تاريخ الاستحقاق</label>
              <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button className="w-full px-4 py-2 bg-gold text-midnight rounded-lg font-body text-xs hover:bg-gold-dark transition-colors">
                إنشاء الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time entries table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-sm">ساعات العمل المسجلة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">القضية</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">المحامي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">الساعات</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">الفوترة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">السعر</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">التاريخ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الوصف</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((te, i) => (
                <tr key={te.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">{te.matter?.matter_code || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">{te.attorney?.name || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatHours(te.hours)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                      te.is_billable ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-ink/50'
                    }`}>
                      {te.is_billable ? 'قابل' : 'غير قابل'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">
                    {te.rate ? `${formatCurrency(te.rate)} ج.م` : '—'}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(te.entry_date)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60 max-w-xs truncate">{te.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <DollarSign size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">الفواتير</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">رقم الفاتورة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">القضية</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">العميل</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">الإجمالي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">المدفوع</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">الحالة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">الاستحقاق</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">تحويل الأمانة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{inv.invoice_number}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">{inv.matter?.matter_code || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">{inv.client?.name || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatCurrency(inv.amount_paid)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                      inv.status === 'مدفوعة' ? 'bg-green-50 text-green-700' :
                      inv.status === 'متأخرة' ? 'bg-red-50 text-red-700' :
                      inv.status === 'جزئية' ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3">
                    {inv.trust_transfer_done ? (
                      <span className="text-[10px] text-green-600 font-body">تم التحويل</span>
                    ) : (
                      <span className="text-[10px] text-ink/40 font-body">بانتظار</span>
                    )}
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
