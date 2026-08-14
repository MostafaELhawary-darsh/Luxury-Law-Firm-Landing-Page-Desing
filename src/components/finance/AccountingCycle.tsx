import { useEffect, useState, useMemo } from 'react';
import {
  BookCopy,
  ArrowRightLeft,
  FileText,
  Landmark,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { JournalEntry, JournalLine, AccountBalance } from '@/lib/accountingTypes';
import { stageInfo } from '@/lib/accountingTypes';

export default function AccountingCycle() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<number>(1);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lf_journal_entries')
      .select('*, lines:lf_journal_lines(*)')
      .order('stage', { ascending: true })
      .order('entry_date', { ascending: true });

    const sorted = (data || []) as JournalEntry[];
    sorted.forEach((entry) => {
      if (entry.lines) {
        entry.lines.sort((a, b) => a.sort_order - b.sort_order);
      }
    });
    setEntries(sorted);
    setLoading(false);
  };

  // Compute running balances after each stage
  const accountBalances = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number }> = {};

    entries.forEach((entry) => {
      if (!entry.is_posted) return;
      entry.lines?.forEach((line) => {
        if (!balances[line.account_code]) {
          balances[line.account_code] = { debit: 0, credit: 0 };
        }
        balances[line.account_code].debit += line.debit || 0;
        balances[line.account_code].credit += line.credit || 0;
      });
    });

    const accountMap: Record<string, { name: string; isTrust: boolean; type: string; normalBalance: string }> = {
      '1110': { name: 'بنك التشغيل الرئيسي', isTrust: false, type: 'asset', normalBalance: 'debit' },
      '1210': { name: 'بنك أمانات العملاء', isTrust: true, type: 'asset', normalBalance: 'debit' },
      '1130': { name: 'ذمم العملاء', isTrust: false, type: 'asset', normalBalance: 'debit' },
      '1140': { name: 'مصاريف قضايا مدفوعة نيابة عن العملاء', isTrust: false, type: 'asset', normalBalance: 'debit' },
      '2210': { name: 'أمانات عملاء - دفعات مقدمة', isTrust: true, type: 'liability', normalBalance: 'credit' },
      '2120': { name: 'ضريبة القيمة المضافة المستحقة', isTrust: false, type: 'liability', normalBalance: 'credit' },
      '4110': { name: 'إيرادات الأتعاب القانونية', isTrust: false, type: 'revenue', normalBalance: 'credit' },
    };

    return Object.entries(balances).map(([code, vals]) => {
      const meta = accountMap[code] || { name: code, isTrust: false, type: '', normalBalance: 'debit' };
      const net = meta.normalBalance === 'debit'
        ? vals.debit - vals.credit
        : vals.credit - vals.debit;
      return {
        account_code: code,
        account_name: meta.name,
        debit: vals.debit,
        credit: vals.credit,
        balance: net,
        is_trust: meta.isTrust,
        account_type: meta.type,
      } as AccountBalance;
    });
  }, [entries]);

  // Compute balances per stage (cumulative)
  const stageBalances = useMemo(() => {
    const stages: Record<number, Record<string, number>> = { 1: {}, 2: {}, 3: {} };
    const running: Record<string, number> = {};

    entries.forEach((entry) => {
      if (!entry.is_posted) return;
      const accountMeta: Record<string, string> = {
        '1110': 'debit', '1210': 'debit', '1130': 'debit', '1140': 'debit',
        '2210': 'credit', '2120': 'credit', '4110': 'credit',
      };

      entry.lines?.forEach((line) => {
        const normal = accountMeta[line.account_code] || 'debit';
        const delta = normal === 'debit'
          ? (line.debit || 0) - (line.credit || 0)
          : (line.credit || 0) - (line.debit || 0);
        running[line.account_code] = (running[line.account_code] || 0) + delta;
      });

      // Deep copy current running balance to this stage
      stages[entry.stage] = { ...running };
    });

    return stages;
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="text-gold animate-spin" />
      </div>
    );
  }

  const stageEntries = entries.filter((e) => e.stage === activeStage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookCopy size={20} className="text-gold" />
        <h2 className="font-heading font-bold text-midnight text-lg">دورة القيود المحاسبية — نقل الأمانات للتشغيلي</h2>
      </div>

      {/* Scenario banner */}
      <div className="bg-midnight rounded-xl p-5 text-cream">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-gold text-sm">السيناريو التطبيقي</h3>
        </div>
        <p className="font-body text-xs text-cream/70 leading-[1.9]">
          عميل «شركة الأمل» سدد <span className="text-gold font-bold">50,000</span> كدفعة أمانات مقدمة (القضية #102).
          بعد إنجاز جزء من العمل، صدرت فاتورة بمبلغ <span className="text-gold font-bold">30,000</span> أتعاب + <span className="text-gold font-bold">4,500</span> ضريبة قيمة مضافة (15%) + <span className="text-gold font-bold">2,000</span> استرداد مصاريف محاكم.
          إجمالي الفاتورة: <span className="text-gold font-bold">36,500</span>
        </p>
      </div>

      {/* Stage selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((stage) => {
          const info = stageInfo[stage];
          const isActive = activeStage === stage;
          const stageCount = entries.filter((e) => e.stage === stage).length;
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`rounded-xl p-4 text-right border transition-all duration-300 ${
                isActive
                  ? 'bg-white border-gold shadow-md'
                  : 'bg-white/50 border-gray-200 hover:border-gold/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${info.bgColor}`}>
                  {stage === 1 && <ShieldCheck size={16} className={info.color} />}
                  {stage === 2 && <FileText size={16} className={info.color} />}
                  {stage === 3 && <ArrowRightLeft size={16} className={info.color} />}
                </div>
                <span className={`font-body text-[10px] ${isActive ? 'text-gold' : 'text-ink/40'}`}>
                  {stageCount} {stageCount === 1 ? 'قيد' : 'قيود'}
                </span>
              </div>
              <p className={`font-heading font-bold text-sm mb-1 ${isActive ? 'text-midnight' : 'text-ink/70'}`}>
                المرحلة {stage === 1 ? 'الأولى' : stage === 2 ? 'الثانية' : 'الثالثة'}
              </p>
              <p className="font-body text-[10px] text-ink/50 leading-[1.7]">
                {stage === 1 && 'استلام دفعة الأمانات وتغذية حساب العميل'}
                {stage === 2 && 'إصدار الفاتورة واكتساب الإيراد'}
                {stage === 3 && 'تحويل الأموال وتسوية الفاتورة'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active stage description */}
      <div className={`rounded-xl p-4 border ${stageInfo[activeStage].bgColor} border-current/20`}>
        <h3 className={`font-heading font-bold text-sm mb-1 ${stageInfo[activeStage].color}`}>
          {stageInfo[activeStage].title}
        </h3>
        <p className="font-body text-xs text-ink/60 leading-[1.8]">
          {stageInfo[activeStage].subtitle}
        </p>
      </div>

      {/* Journal entries for active stage */}
      {stageEntries.map((entry) => (
        <JournalEntryCard key={entry.id} entry={entry} />
      ))}

      {/* Live account balances after all entries */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">الموقف المالي للحسابات بعد اكتمال الدورة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">كود الحساب</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">اسم الحساب</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">مدين</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">دائن</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-28">الرصيد</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">النوع</th>
              </tr>
            </thead>
            <tbody>
              {accountBalances.map((acc) => (
                <tr key={acc.account_code} className={`border-b border-gray-50 ${acc.is_trust ? 'bg-green-50/30' : ''}`}>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{acc.account_code}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/80">
                    {acc.is_trust && <ShieldCheck size={12} className="inline-block text-green-600 ml-1" />}
                    {acc.account_name}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{formatCurrency(acc.debit)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{formatCurrency(acc.credit)}</td>
                  <td className={`px-4 py-3 font-body text-xs font-bold ${acc.balance >= 0 ? 'text-midnight' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(acc.balance))}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body ${
                      acc.is_trust ? 'bg-green-50 text-green-700' :
                      acc.account_type === 'asset' ? 'bg-blue-50 text-blue-700' :
                      acc.account_type === 'liability' ? 'bg-amber-50 text-amber-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {acc.is_trust ? 'أمانات' :
                       acc.account_type === 'asset' ? 'أصول' :
                       acc.account_type === 'liability' ? 'التزامات' : 'إيرادات'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final position summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={16} className="text-green-700" />
            <p className="font-body text-xs text-ink/50">حساب أمانات العميل (2210)</p>
          </div>
          <p className="font-heading font-bold text-green-700 text-xl">13,500</p>
          <p className="font-body text-[10px] text-ink/40 mt-1">متبقي كأمانة جاهزة للفواتير القادمة</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Landmark size={16} className="text-blue-700" />
            <p className="font-body text-xs text-ink/50">ذمم العملاء (1130)</p>
          </div>
          <p className="font-heading font-bold text-midnight text-xl">0</p>
          <p className="font-body text-[10px] text-ink/40 mt-1">تمت تسوية الفاتورة بالكامل</p>
        </div>
        <div className="bg-white rounded-xl border border-gold/30 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-gold" />
            <p className="font-body text-xs text-ink/50">بنك التشغيل (1110)</p>
          </div>
          <p className="font-heading font-bold text-gold text-xl">36,500</p>
          <p className="font-body text-[10px] text-ink/40 mt-1">أموال حرة للاستخدام التشغيلي</p>
        </div>
      </div>
    </div>
  );
}

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const totalDebit = entry.lines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0;
  const totalCredit = entry.lines?.reduce((sum, l) => sum + (l.credit || 0), 0) || 0;
  const isBalanced = totalDebit === totalCredit;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Entry header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-body text-xs font-bold text-midnight">{entry.entry_number}</span>
            {entry.is_posted && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-body">
                <CheckCircle2 size={10} />
                مرحّل
              </span>
            )}
          </div>
          <p className="font-body text-xs text-ink/60">{entry.description}</p>
        </div>
        <div className="text-left">
          <p className="font-body text-[10px] text-ink/40">{formatDate(entry.entry_date)}</p>
          {entry.invoice_number && (
            <p className="font-body text-[10px] text-gold mt-1">فاتورة: {entry.invoice_number}</p>
          )}
        </div>
      </div>

      {/* Journal lines table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-20">كود الحساب</th>
              <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60">البيان / اسم الحساب</th>
              <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-32">مدين</th>
              <th className="px-4 py-2.5 font-body text-xs font-medium text-ink/60 w-32">دائن</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines?.map((line) => (
              <tr key={line.id} className="border-b border-gray-50">
                <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{line.account_code}</td>
                <td className="px-4 py-3 font-body text-xs text-ink/80">{line.line_description || line.account_name}</td>
                <td className="px-4 py-3 font-body text-xs text-ink/80">
                  {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                </td>
                <td className="px-4 py-3 font-body text-xs text-ink/80">
                  {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/80 border-t-2 border-gray-200">
              <td colSpan={2} className="px-4 py-3 font-body text-xs font-bold text-midnight text-left">
                الإجمالي
              </td>
              <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(totalDebit)}</td>
              <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Balance check */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBalanced ? (
            <span className="flex items-center gap-1 text-[10px] text-green-600 font-body">
              <CheckCircle2 size={12} />
              القيد متوازن — مجموع المدين = مجموع الدائن
            </span>
          ) : (
            <span className="text-[10px] text-red-600 font-body">القيد غير متوازن</span>
          )}
        </div>
        <span className="font-body text-[10px] text-ink/40">
          {entry.stage_name}
        </span>
      </div>
    </div>
  );
}
