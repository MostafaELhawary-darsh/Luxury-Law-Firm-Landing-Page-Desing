import { useEffect, useState } from 'react';
import { ShieldCheck, ArrowDownCircle, ArrowUpCircle, Landmark } from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { TrustAccount, TrustTransaction, Matter } from '@/lib/financeTypes';

export default function TrustAccounting() {
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [transactions, setTransactions] = useState<(TrustTransaction & { matter?: Matter })[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [accRes, txRes, matRes] = await Promise.all([
      supabase.from('lf_trust_accounts').select('*').order('created_at'),
      supabase.from('lf_trust_transactions').select('*, matter:lf_matters(*)').order('transaction_date', { ascending: false }),
      supabase.from('lf_matters').select('*'),
    ]);
    setAccounts(accRes.data || []);
    setTransactions((txRes.data as (TrustTransaction & { matter?: Matter })[]) || []);
    setMatters(matRes.data || []);
    setLoading(false);
  };

  const trustAccounts = accounts.filter((a) => a.account_name.includes('أمانات'));
  const operatingAccount = accounts.find((a) => !a.account_name.includes('أمانات'));

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
          <ShieldCheck size={20} className="text-green-700" />
          <h2 className="font-heading font-bold text-midnight text-lg">حسابات الأمانات والودائع</h2>
        </div>
        <button
          onClick={() => setShowTransfer(!showTransfer)}
          className="px-4 py-2 bg-midnight text-cream rounded-lg font-body text-xs hover:bg-midnight-light transition-colors"
        >
          تحويل من الأمانات للتشغيلي
        </button>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-body text-xs text-amber-800 font-bold">تنبيه مهني</p>
          <p className="font-body text-xs text-amber-700 leading-[1.8]">
            فصل أموال العملاء عن أموال المؤسسة هو شرط قانوني وأخلاقي صارم. حسابات الأمانات مستقلة تماماً عن الحساب التشغيلي.
          </p>
        </div>
      </div>

      {/* Account balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trustAccounts.map((acc) => (
          <div key={acc.id} className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={16} className="text-green-700" />
              <p className="font-body text-xs text-ink/60">{acc.account_name}</p>
            </div>
            <p className="font-heading font-bold text-green-700 text-2xl mb-1">
              {formatCurrency(acc.balance)} ج.م
            </p>
            <p className="font-body text-[10px] text-ink/40">
              {acc.bank_name} — {acc.account_number}
            </p>
          </div>
        ))}
        {operatingAccount && (
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={16} className="text-blue-700" />
              <p className="font-body text-xs text-ink/60">{operatingAccount.account_name}</p>
            </div>
            <p className="font-heading font-bold text-blue-700 text-2xl mb-1">
              {formatCurrency(operatingAccount.balance)} ج.م
            </p>
            <p className="font-body text-[10px] text-ink/40">
              {operatingAccount.bank_name} — {operatingAccount.account_number}
            </p>
          </div>
        )}
      </div>

      {/* Transfer form */}
      {showTransfer && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-heading font-bold text-midnight text-sm mb-4">سحب من الأمانات للتشغيلي (مستند للإنجاز)</h3>
          <p className="font-body text-xs text-ink/50 mb-4">
            عند إصدار فاتورة مؤكدة، يتم سحب المبلغ المنسوب للأتعاب من حساب الأمانات وتغذيته في الحساب التشغيلي تلقائياً.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">القضية</label>
              <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none">
                <option value="">— اختر القضية —</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>{m.matter_code} — {m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-body text-xs text-ink/60 mb-2">المبلغ</label>
              <input type="number" placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-body focus:border-gold focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button className="w-full px-4 py-2 bg-green-700 text-white rounded-lg font-body text-xs hover:bg-green-800 transition-colors">
                تأكيد التحويل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-sm">حركات حسابات الأمانات حسب القضايا</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-12">م</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">القضية</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">النوع</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">المبلغ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-32">التاريخ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">البيان</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-body text-xs text-ink/40">{i + 1}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">
                    {tx.matter?.matter_code || '—'} — {tx.matter?.title || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-body ${
                      tx.transaction_type === 'إيداع'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {tx.transaction_type === 'إيداع' ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">
                    {formatCurrency(tx.amount)} ج.م
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(tx.transaction_date)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{tx.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
