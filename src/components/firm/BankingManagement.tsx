import { useEffect, useState } from 'react';
import { Banknote, Loader2, Landmark, FileCheck, ArrowDownCircle, ArrowUpCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { BankAccount, Check } from '@/lib/firmTypes';
import type { Client } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type ModalType = 'account' | 'check' | null;

interface AccountFormData {
  bank_name: string; account_number: string; iban: string; account_type: string;
  currency: string; current_balance: string; status: string;
}
interface CheckFormData {
  check_number: string; bank_account_id: string; client_id: string; check_type: string;
  amount: string; issue_date: string; due_date: string; payee: string; status: string; notes: string;
}

const emptyAccount: AccountFormData = { bank_name: '', account_number: '', iban: '', account_type: 'جاري', currency: 'EGP', current_balance: '0', status: 'نشط' };
const emptyCheck: CheckFormData = { check_number: '', bank_account_id: '', client_id: '', check_type: 'وارد', amount: '0', issue_date: '', due_date: '', payee: '', status: 'بانتظار', notes: '' };

export default function BankingManagement({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<AccountFormData>(emptyAccount);
  const [checkForm, setCheckForm] = useState<CheckFormData>(emptyCheck);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'account' | 'check'>('account');

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (cmd.commandType === 'add_account') {
        setAccountForm({ ...emptyAccount, bank_name: cmd.fields.bank || '' });
        setEditingId(null); setModalType('account');
      } else {
        setCheckForm({ ...emptyCheck, check_number: cmd.fields.number || '', issue_date: new Date().toISOString().slice(0, 10) });
        setEditingId(null); setModalType('check');
      }
    }
  }, [voiceAdd]);

  const fetchAll = async () => {
    setLoading(true);
    const [accRes, checkRes, clientRes] = await Promise.all([
      supabase.from('lf_bank_accounts').select('*').order('current_balance', { ascending: false }),
      supabase.from('lf_checks').select('*, bank:lf_bank_accounts(bank_name), client:lf_clients(name)').order('due_date', { ascending: true }),
      supabase.from('lf_clients').select('*').order('name'),
    ]);
    setAccounts((accRes.data as BankAccount[]) || []);
    setChecks((checkRes.data as Check[]) || []);
    setClients((clientRes.data as Client[]) || []);
    setLoading(false);
  };

  const openAddAccount = () => { setAccountForm(emptyAccount); setEditingId(null); setModalType('account'); };
  const openEditAccount = (a: BankAccount) => {
    setAccountForm({ bank_name: a.bank_name, account_number: a.account_number, iban: a.iban || '', account_type: a.account_type || 'جاري', currency: a.currency || 'EGP', current_balance: String(a.current_balance), status: a.status || 'نشط' });
    setEditingId(a.id); setModalType('account');
  };
  const openAddCheck = () => { setCheckForm({ ...emptyCheck, issue_date: new Date().toISOString().slice(0, 10) }); setEditingId(null); setModalType('check'); };
  const openEditCheck = (c: Check) => {
    setCheckForm({ check_number: c.check_number, bank_account_id: c.bank_account_id || '', client_id: c.client_id || '', check_type: c.check_type, amount: String(c.amount), issue_date: c.issue_date, due_date: c.due_date, payee: c.payee || '', status: c.status || 'بانتظار', notes: c.notes || '' });
    setEditingId(c.id); setModalType('check');
  };

  const handleSave = async () => {
    setSaving(true);
    if (modalType === 'account') {
      if (!accountForm.bank_name.trim() || !accountForm.account_number.trim()) { setSaving(false); return; }
      const payload = { bank_name: accountForm.bank_name.trim(), account_number: accountForm.account_number.trim(), iban: accountForm.iban.trim() || null, account_type: accountForm.account_type, currency: accountForm.currency, current_balance: Number(accountForm.current_balance) || 0, status: accountForm.status };
      if (editingId) { await supabase.from('lf_bank_accounts').update(payload).eq('id', editingId); } else { await supabase.from('lf_bank_accounts').insert(payload); }
    } else if (modalType === 'check') {
      if (!checkForm.check_number.trim() || !checkForm.amount || !checkForm.due_date) { setSaving(false); return; }
      const payload = { check_number: checkForm.check_number.trim(), bank_account_id: checkForm.bank_account_id || null, client_id: checkForm.client_id || null, check_type: checkForm.check_type, amount: Number(checkForm.amount) || 0, issue_date: checkForm.issue_date, due_date: checkForm.due_date, payee: checkForm.payee.trim() || null, status: checkForm.status, notes: checkForm.notes.trim() || null };
      if (editingId) { await supabase.from('lf_checks').update(payload).eq('id', editingId); } else { await supabase.from('lf_checks').insert(payload); }
    }
    setSaving(false); setModalType(null); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'account') { await supabase.from('lf_bank_accounts').delete().eq('id', deleteId); }
    else { await supabase.from('lf_checks').delete().eq('id', deleteId); }
    setDeleteId(null); fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);
  const incomingChecks = checks.filter((c) => c.check_type === 'وارد');
  const pendingChecks = checks.filter((c) => c.status === 'بانتظار');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">الحسابات البنكية والشيكات</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAddCheck} className="flex items-center gap-2 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-sm font-bold hover:bg-midnight/90 transition-colors">
            <Plus size={16} /> إضافة شيك
          </button>
          <button onClick={openAddAccount} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> إضافة حساب
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Landmark size={14} className="text-midnight" />} label="إجمالي الأرصدة" value={formatCurrency(totalBalance)} valueClass="text-midnight" />
        <StatCard icon={<Landmark size={14} className="text-blue-600" />} label="حسابات نشطة" value={String(accounts.length)} valueClass="text-blue-700" />
        <StatCard icon={<ArrowDownCircle size={14} className="text-green-600" />} label="شيكات واردة" value={String(incomingChecks.length)} valueClass="text-green-700" />
        <StatCard icon={<ArrowUpCircle size={14} className="text-amber-600" />} label="شيكات بانتظار" value={String(pendingChecks.length)} valueClass="text-amber-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-gradient-to-br from-midnight to-midnight/90 rounded-xl p-5 shadow-sm group relative">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center"><Landmark size={18} className="text-gold" /></div>
                <div><p className="font-body text-xs font-bold text-cream">{acc.bank_name}</p><p className="font-body text-[10px] text-cream/40">{acc.account_number}</p></div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditAccount(acc)} className="p-1.5 rounded text-cream/40 hover:text-gold hover:bg-gold/10 transition-colors opacity-0 group-hover:opacity-100"><Pencil size={14} /></button>
                <button onClick={() => { setDeleteId(acc.id); setDeleteType('account'); }} className="p-1.5 rounded text-cream/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div><p className="font-body text-[10px] text-cream/40 mb-1">الرصيد الحالي</p><p className="font-heading font-bold text-gold text-xl">{formatCurrency(acc.current_balance)}</p></div>
              <div className="text-left">
                <span className={`px-2 py-0.5 rounded text-[10px] font-body ${acc.account_type === 'جاري' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'}`}>{acc.account_type}</span>
                <p className="font-body text-[10px] text-cream/40 mt-1">{acc.currency}</p>
              </div>
            </div>
            {acc.iban && <p className="font-body text-[9px] text-cream/30 mt-3 pt-3 border-t border-cream/10">IBAN: {acc.iban}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileCheck size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">سجل الشيكات البنكية</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">رقم الشيك</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">النوع</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">البنك</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">العميل</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">المستفيد</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">المبلغ</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">تاريخ الاستحقاق</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">الحالة</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {checks.map((chk) => (
                <tr key={chk.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{chk.check_number}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-body ${chk.check_type === 'وارد' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{chk.check_type}</span></td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{chk.bank?.bank_name || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{chk.client?.name || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{chk.payee}</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(chk.amount)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(chk.due_date)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-body ${chk.status === 'مصروف' ? 'bg-green-50 text-green-700' : chk.status === 'بانتظار' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{chk.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditCheck(chk)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => { setDeleteId(chk.id); setDeleteType('check'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EntityModal open={modalType === 'account'} title={editingId ? 'تعديل حساب بنكي' : 'إضافة حساب بنكي'} onClose={() => setModalType(null)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم البنك" required><TextInput value={accountForm.bank_name} onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })} placeholder="مثال: البنك الأهلي المصري" /></Field>
          <Field label="رقم الحساب" required><TextInput value={accountForm.account_number} onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })} /></Field>
        </div>
        <Field label="IBAN"><TextInput value={accountForm.iban} onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="نوع الحساب">
            <Select value={accountForm.account_type} onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value })}>
              <option value="جاري">جاري</option><option value="توفير">توفير</option><option value="استثمار">استثمار</option>
            </Select>
          </Field>
          <Field label="العملة">
            <Select value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}>
              <option value="EGP">ج.م</option><option value="USD">دولار</option><option value="EUR">يورو</option><option value="SAR">ريال</option>
            </Select>
          </Field>
          <Field label="الرصيد الحالي"><TextInput type="number" value={accountForm.current_balance} onChange={(e) => setAccountForm({ ...accountForm, current_balance: e.target.value })} /></Field>
        </div>
        <Field label="الحالة">
          <Select value={accountForm.status} onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value })}>
            <option value="نشط">نشط</option><option value="مجمد">مجمد</option><option value="مغلق">مغلق</option>
          </Select>
        </Field>
      </EntityModal>

      <EntityModal open={modalType === 'check'} title={editingId ? 'تعديل شيك' : 'إضافة شيك جديد'} onClose={() => setModalType(null)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الشيك" required><TextInput value={checkForm.check_number} onChange={(e) => setCheckForm({ ...checkForm, check_number: e.target.value })} /></Field>
          <Field label="النوع">
            <Select value={checkForm.check_type} onChange={(e) => setCheckForm({ ...checkForm, check_type: e.target.value })}>
              <option value="وارد">وارد</option><option value="صادر">صادر</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الحساب البنكي">
            <Select value={checkForm.bank_account_id} onChange={(e) => setCheckForm({ ...checkForm, bank_account_id: e.target.value })}>
              <option value="">— اختر —</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_number}</option>)}
            </Select>
          </Field>
          <Field label="العميل">
            <Select value={checkForm.client_id} onChange={(e) => setCheckForm({ ...checkForm, client_id: e.target.value })}>
              <option value="">— اختر —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المبلغ" required><TextInput type="number" value={checkForm.amount} onChange={(e) => setCheckForm({ ...checkForm, amount: e.target.value })} /></Field>
          <Field label="المستفيد"><TextInput value={checkForm.payee} onChange={(e) => setCheckForm({ ...checkForm, payee: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الإصدار" required><TextInput type="date" value={checkForm.issue_date} onChange={(e) => setCheckForm({ ...checkForm, issue_date: e.target.value })} /></Field>
          <Field label="تاريخ الاستحقاق" required><TextInput type="date" value={checkForm.due_date} onChange={(e) => setCheckForm({ ...checkForm, due_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الحالة">
            <Select value={checkForm.status} onChange={(e) => setCheckForm({ ...checkForm, status: e.target.value })}>
              <option value="بانتظار">بانتظار</option><option value="مصروف">مصروف</option><option value="مرتجع">مرتجع</option>
            </Select>
          </Field>
        </div>
        <Field label="ملاحظات"><TextArea value={checkForm.notes} onChange={(e) => setCheckForm({ ...checkForm, notes: e.target.value })} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message={deleteType === 'account' ? 'سيتم حذف هذا الحساب البنكي.' : 'سيتم حذف هذا الشيك.'} />
    </div>
  );
}
