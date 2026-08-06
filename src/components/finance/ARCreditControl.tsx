import { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard, Ban, Clock } from 'lucide-react';
import { supabase, formatCurrency, formatDate, daysBetween, isOverdue } from '@/lib/financeUtils';
import type { Invoice, Matter, Client } from '@/lib/financeTypes';

export default function ARCreditControl() {
  const [invoices, setInvoices] = useState<(Invoice & { matter?: Matter; client?: Client })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [invRes, cliRes] = await Promise.all([
      supabase.from('lf_invoices').select('*, matter:lf_matters(*), client:lf_clients(*)').order('due_date', { ascending: false }),
      supabase.from('lf_clients').select('*'),
    ]);
    setInvoices((invRes.data as (Invoice & { matter?: Matter; client?: Client })[]) || []);
    setClients(cliRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const outstandingInvoices = invoices.filter((i) => i.status !== 'مدفوعة' && i.amount_paid < i.total);
  const overdueInvoices = invoices.filter((i) => isOverdue(i));
  const totalOutstanding = outstandingInvoices.reduce((sum, i) => sum + (i.total - i.amount_paid), 0);
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.total - i.amount_paid), 0);

  // Client AR summary
  const clientAR = clients.map((c) => {
    const clientInvoices = invoices.filter((i) => i.client_id === c.id);
    const outstanding = clientInvoices
      .filter((i) => i.status !== 'مدفوعة')
      .reduce((sum, i) => sum + (i.total - i.amount_paid), 0);
    const overdue = clientInvoices.filter((i) => isOverdue(i)).reduce((sum, i) => sum + (i.total - i.amount_paid), 0);
    return { client: c, outstanding, overdue, invoiceCount: clientInvoices.length };
  }).filter((item) => item.outstanding > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard size={20} className="text-gold" />
        <h2 className="font-heading font-bold text-midnight text-lg">المقبوضات وإدارة الائتمان</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-600" />
            <p className="font-body text-xs text-ink/50">إجمالي المبالغ المستحقة</p>
          </div>
          <p className="font-heading font-bold text-amber-700 text-xl">{formatCurrency(totalOutstanding)} ج.م</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="font-body text-xs text-ink/50">مبالغ متأخرة عن السداد</p>
          </div>
          <p className="font-heading font-bold text-red-700 text-xl">{formatCurrency(totalOverdue)} ج.م</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Ban size={16} className="text-red-600" />
            <p className="font-body text-xs text-ink/50">ملفات موقوفة</p>
          </div>
          <p className="font-heading font-bold text-red-700 text-xl">
            {invoices.filter((i) => i.matter?.work_suspended).length} ملف
          </p>
        </div>
      </div>

      {/* Auto-suspension alert */}
      {overdueInvoices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Ban size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-body text-sm text-red-700 font-bold mb-1">تنبيه: إيقاف العمل الآلي</p>
              <p className="font-body text-xs text-red-600 leading-[1.8]">
                القضايا التالية تجاوزت فترة السداد المسموح بها. يُنصح بإيقاف العمل على هذه الملفات حتى تسوية المبالغ المتأخرة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Client AR summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-sm">ملخص المبالغ المستحقة حسب العملاء</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">العميل</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">حد الائتمان</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">شروط السداد</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">المستحق</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">المتأخر</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {clientAR.map((item, i) => {
                const overLimit = item.outstanding > item.client.credit_limit;
                return (
                  <tr key={item.client.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                    <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{item.client.name}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{formatCurrency(item.client.credit_limit)}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{item.client.payment_terms_days} يوم</td>
                    <td className="px-4 py-3 font-body text-xs font-bold text-amber-700">{formatCurrency(item.outstanding)}</td>
                    <td className="px-4 py-3 font-body text-xs font-bold text-red-700">{formatCurrency(item.overdue)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                        overLimit ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {overLimit ? 'تجاوز الحد' : 'ضمن الحد'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outstanding invoices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-sm">الفواتير المستحقة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-10">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">رقم الفاتورة</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">العميل</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">القضية</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">الإجمالي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">المتبقي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">الاستحقاق</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">أيام التأخير</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-24">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {outstandingInvoices.map((inv, i) => {
                const overdue = isOverdue(inv);
                const daysLate = overdue ? daysBetween(inv.due_date, new Date().toISOString()) : 0;
                return (
                  <tr key={inv.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${overdue ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                    <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{inv.invoice_number}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/80">{inv.client?.name || '—'}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/80">{inv.matter?.matter_code || '—'}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/80">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 font-body text-xs font-bold text-red-700">{formatCurrency(inv.total - inv.amount_paid)}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3">
                      {overdue ? (
                        <span className="text-xs text-red-600 font-body font-bold">{daysLate} يوم</span>
                      ) : (
                        <span className="text-xs text-ink/40 font-body">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                        inv.status === 'متأخرة' ? 'bg-red-50 text-red-700' :
                        inv.status === 'جزئية' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {inv.status}
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
  );
}
