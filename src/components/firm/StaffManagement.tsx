import { useEffect, useState } from 'react';
import { UserCog, Loader2, Banknote, Calendar, BadgeCheck, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type { StaffMember, Salary } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type ModalType = 'staff' | 'salary' | null;

interface StaffFormData {
  attorney_id: string; staff_type: string; department: string; hire_date: string;
  base_salary: string; allowances: string; bank_account: string; tax_id: string;
  social_insurance_number: string; status: string;
}
interface SalaryFormData {
  staff_id: string; month: string; year: string; base_amount: string;
  allowances_amount: string; deductions: string; payment_date: string; status: string;
}

const emptyStaff: StaffFormData = { attorney_id: '', staff_type: 'محامي', department: '', hire_date: '', base_salary: '0', allowances: '0', bank_account: '', tax_id: '', social_insurance_number: '', status: 'نشط' };
const emptySalary: SalaryFormData = { staff_id: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()), base_amount: '0', allowances_amount: '0', deductions: '0', payment_date: '', status: 'بانتظار' };

const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export default function StaffManagement({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<StaffFormData>(emptyStaff);
  const [salaryForm, setSalaryForm] = useState<SalaryFormData>(emptySalary);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'staff' | 'salary'>('staff');

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (cmd.commandType === 'add_salary') {
        setSalaryForm({ ...emptySalary, payment_date: new Date().toISOString().slice(0, 10) });
        setEditingId(null); setModalType('salary');
      } else {
        setStaffForm({ ...emptyStaff, hire_date: new Date().toISOString().slice(0, 10) });
        setEditingId(null); setModalType('staff');
      }
    }
  }, [voiceAdd]);

  const fetchAll = async () => {
    setLoading(true);
    const [staffRes, salaryRes, attRes] = await Promise.all([
      supabase.from('lf_staff').select('*, attorney:lf_attorneys(name, role)').order('hire_date'),
      supabase.from('lf_salaries').select('*, staff:lf_staff(*, attorney:lf_attorneys(name))').order('year', { ascending: false }).order('month', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    setStaff((staffRes.data as StaffMember[]) || []);
    setSalaries((salaryRes.data as Salary[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  };

  const openAddStaff = () => { setStaffForm({ ...emptyStaff, hire_date: new Date().toISOString().slice(0, 10) }); setEditingId(null); setModalType('staff'); };
  const openEditStaff = (s: StaffMember) => {
    setStaffForm({ attorney_id: s.attorney_id || '', staff_type: s.staff_type, department: s.department || '', hire_date: s.hire_date || '', base_salary: String(s.base_salary), allowances: String(s.allowances), bank_account: s.bank_account || '', tax_id: s.tax_id || '', social_insurance_number: s.social_insurance_number || '', status: s.status || 'نشط' });
    setEditingId(s.id); setModalType('staff');
  };
  const openAddSalary = () => { setSalaryForm({ ...emptySalary, payment_date: new Date().toISOString().slice(0, 10) }); setEditingId(null); setModalType('salary'); };
  const openEditSalary = (s: Salary) => {
    setSalaryForm({ staff_id: s.staff_id, month: String(s.month), year: String(s.year), base_amount: String(s.base_amount), allowances_amount: String(s.allowances_amount), deductions: String(s.deductions), payment_date: s.payment_date || '', status: s.status || 'بانتظار' });
    setEditingId(s.id); setModalType('salary');
  };

  const handleSave = async () => {
    setSaving(true);
    if (modalType === 'staff') {
      if (!staffForm.attorney_id) { setSaving(false); return; }
      const payload = { attorney_id: staffForm.attorney_id, staff_type: staffForm.staff_type, department: staffForm.department.trim() || null, hire_date: staffForm.hire_date || null, base_salary: Number(staffForm.base_salary) || 0, allowances: Number(staffForm.allowances) || 0, bank_account: staffForm.bank_account.trim() || null, tax_id: staffForm.tax_id.trim() || null, social_insurance_number: staffForm.social_insurance_number.trim() || null, status: staffForm.status };
      if (editingId) { await supabase.from('lf_staff').update(payload).eq('id', editingId); } else { await supabase.from('lf_staff').insert(payload); }
    } else if (modalType === 'salary') {
      if (!salaryForm.staff_id) { setSaving(false); return; }
      const base = Number(salaryForm.base_amount) || 0;
      const allow = Number(salaryForm.allowances_amount) || 0;
      const ded = Number(salaryForm.deductions) || 0;
      const payload = { staff_id: salaryForm.staff_id, month: Number(salaryForm.month), year: Number(salaryForm.year), base_amount: base, allowances_amount: allow, deductions: ded, net_amount: base + allow - ded, payment_date: salaryForm.payment_date || null, status: salaryForm.status };
      if (editingId) { await supabase.from('lf_salaries').update(payload).eq('id', editingId); } else { await supabase.from('lf_salaries').insert(payload); }
    }
    setSaving(false); setModalType(null); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'staff') { await supabase.from('lf_staff').delete().eq('id', deleteId); } else { await supabase.from('lf_salaries').delete().eq('id', deleteId); }
    setDeleteId(null); fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const totalMonthlyPayroll = staff.reduce((sum, s) => sum + s.base_salary + s.allowances, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">المستشارون والموظفون</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAddSalary} className="flex items-center gap-2 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-sm font-bold hover:bg-midnight/90 transition-colors">
            <Plus size={16} /> إضافة مرتب
          </button>
          <button onClick={openAddStaff} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> إضافة موظف
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<UserCog size={14} className="text-midnight" />} label="إجمالي الموظفين" value={String(staff.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="نشطون" value={String(staff.filter((s) => s.status === 'نشط').length)} valueClass="text-green-700" />
        <StatCard icon={<Banknote size={14} className="text-gold" />} label="إجمالي المرتبات الشهرية" value={formatCurrency(totalMonthlyPayroll)} valueClass="text-gold" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-heading font-bold text-midnight text-sm">سجل المستشارين والموظفين</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الاسم</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">المنصب</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">القسم</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">المرتب الأساسي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">البدلات</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الإجمالي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">تاريخ التعيين</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">الحالة</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{s.attorney?.name || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{s.staff_type}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{s.department}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{formatCurrency(s.base_salary)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{formatCurrency(s.allowances)}</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(s.base_salary + s.allowances)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(s.hire_date)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-body ${s.status === 'نشط' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-ink/50'}`}>{s.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditStaff(s)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => { setDeleteId(s.id); setDeleteType('staff'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><Banknote size={16} className="text-gold" /><h3 className="font-heading font-bold text-midnight text-sm">سجل المرتبات</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الموظف</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الشهر</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الأساسي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">البدلات</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الخصومات</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الصافي</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">تاريخ الصرف</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">الحالة</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((sal) => (
                <tr key={sal.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{sal.staff?.attorney?.name || '—'}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{monthNames[sal.month - 1]} {sal.year}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/70">{formatCurrency(sal.base_amount)}</td>
                  <td className="px-4 py-3 font-body text-xs text-green-700">{formatCurrency(sal.allowances_amount)}</td>
                  <td className="px-4 py-3 font-body text-xs text-red-600">({formatCurrency(sal.deductions)})</td>
                  <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{formatCurrency(sal.net_amount)}</td>
                  <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(sal.payment_date)}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-body ${sal.status === 'مدفوعة' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{sal.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditSalary(sal)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => { setDeleteId(sal.id); setDeleteType('salary'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EntityModal open={modalType === 'staff'} title={editingId ? 'تعديل موظف' : 'إضافة موظف جديد'} onClose={() => setModalType(null)} onSubmit={handleSave} loading={saving}>
        <Field label="الاسم (من قائمة المحامين)" required>
          <Select value={staffForm.attorney_id} onChange={(e) => setStaffForm({ ...staffForm, attorney_id: e.target.value })}>
            <option value="">— اختر —</option>
            {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المنصب">
            <Select value={staffForm.staff_type} onChange={(e) => setStaffForm({ ...staffForm, staff_type: e.target.value })}>
              <option value="محامي">محامي</option><option value="مستشار قانوني">مستشار قانوني</option>
              <option value="محاسب">محاسب</option><option value="إداري">إداري</option><option value="سكرتير">سكرتير</option>
            </Select>
          </Field>
          <Field label="القسم"><TextInput value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} placeholder="مثال: التقاضي" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرتب الأساسي"><TextInput type="number" value={staffForm.base_salary} onChange={(e) => setStaffForm({ ...staffForm, base_salary: e.target.value })} /></Field>
          <Field label="البدلات"><TextInput type="number" value={staffForm.allowances} onChange={(e) => setStaffForm({ ...staffForm, allowances: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التعيين"><TextInput type="date" value={staffForm.hire_date} onChange={(e) => setStaffForm({ ...staffForm, hire_date: e.target.value })} /></Field>
          <Field label="الحالة">
            <Select value={staffForm.status} onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}>
              <option value="نشط">نشط</option><option value="غير نشط">غير نشط</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الحساب البنكي"><TextInput value={staffForm.bank_account} onChange={(e) => setStaffForm({ ...staffForm, bank_account: e.target.value })} /></Field>
          <Field label="الرقم الضريبي"><TextInput value={staffForm.tax_id} onChange={(e) => setStaffForm({ ...staffForm, tax_id: e.target.value })} /></Field>
        </div>
        <Field label="رقم التأمين الاجتماعي"><TextInput value={staffForm.social_insurance_number} onChange={(e) => setStaffForm({ ...staffForm, social_insurance_number: e.target.value })} /></Field>
      </EntityModal>

      <EntityModal open={modalType === 'salary'} title={editingId ? 'تعديل مرتب' : 'إضافة مرتب جديد'} onClose={() => setModalType(null)} onSubmit={handleSave} loading={saving}>
        <Field label="الموظف" required>
          <Select value={salaryForm.staff_id} onChange={(e) => setSalaryForm({ ...salaryForm, staff_id: e.target.value })}>
            <option value="">— اختر —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.attorney?.name || '—'}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الشهر">
            <Select value={salaryForm.month} onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}>
              {monthNames.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
            </Select>
          </Field>
          <Field label="السنة"><TextInput type="number" value={salaryForm.year} onChange={(e) => setSalaryForm({ ...salaryForm, year: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="الأساسي"><TextInput type="number" value={salaryForm.base_amount} onChange={(e) => setSalaryForm({ ...salaryForm, base_amount: e.target.value })} /></Field>
          <Field label="البدلات"><TextInput type="number" value={salaryForm.allowances_amount} onChange={(e) => setSalaryForm({ ...salaryForm, allowances_amount: e.target.value })} /></Field>
          <Field label="الخصومات"><TextInput type="number" value={salaryForm.deductions} onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الصرف"><TextInput type="date" value={salaryForm.payment_date} onChange={(e) => setSalaryForm({ ...salaryForm, payment_date: e.target.value })} /></Field>
          <Field label="الحالة">
            <Select value={salaryForm.status} onChange={(e) => setSalaryForm({ ...salaryForm, status: e.target.value })}>
              <option value="بانتظار">بانتظار</option><option value="مدفوعة">مدفوعة</option>
            </Select>
          </Field>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="font-body text-xs text-ink/40">الصافي المستحق</p>
          <p className="font-heading font-bold text-gold text-lg">
            {formatCurrency((Number(salaryForm.base_amount) || 0) + (Number(salaryForm.allowances_amount) || 0) - (Number(salaryForm.deductions) || 0))}
          </p>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message={deleteType === 'staff' ? 'سيتم حذف هذا الموظف.' : 'سيتم حذف هذا السجل المرتبي.'} />
    </div>
  );
}
