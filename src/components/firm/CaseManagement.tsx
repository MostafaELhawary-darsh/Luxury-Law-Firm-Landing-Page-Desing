import { useEffect, useState } from 'react';
import { Briefcase, Gavel, Loader2, Calendar, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { Case } from '@/lib/firmTypes';
import type { Client, Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

interface CaseFormData {
  case_number: string; case_title: string; case_type: string; court_level: string;
  court_name: string; subject: string; client_id: string; responsible_attorney_id: string;
  opposing_party: string; status: string; filed_date: string; next_session_date: string;
}

const emptyForm: CaseFormData = {
  case_number: '', case_title: '', case_type: 'تجاري', court_level: 'ابتدائي', court_name: '',
  subject: '', client_id: '', responsible_attorney_id: '', opposing_party: '', status: 'نشطة', filed_date: '', next_session_date: '',
};

export default function CaseManagement({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, case_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const fetchAll = async () => {
    setLoading(true);
    const [caseRes, clientRes, attRes] = await Promise.all([
      supabase.from('lf_cases').select('*, client:lf_clients(name, company), attorney:lf_attorneys(name)').order('filed_date', { ascending: false }),
      supabase.from('lf_clients').select('*').order('name'),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    setCases((caseRes.data as Case[]) || []);
    setClients((clientRes.data as Client[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (c: Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_type: c.case_type || 'تجاري',
      court_level: c.court_level || 'ابتدائي', court_name: c.court_name || '', subject: c.subject || '',
      client_id: c.client_id || '', responsible_attorney_id: c.responsible_attorney_id || '',
      opposing_party: c.opposing_party || '', status: c.status || 'نشطة',
      filed_date: c.filed_date || '', next_session_date: c.next_session_date || '',
    });
    setEditingId(c.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.case_number.trim() || !form.case_title.trim()) return;
    setSaving(true);
    const payload = {
      case_number: form.case_number.trim(),
      case_title: form.case_title.trim(),
      case_type: form.case_type,
      court_level: form.court_level,
      court_name: form.court_name.trim() || null,
      subject: form.subject.trim() || null,
      client_id: form.client_id || null,
      responsible_attorney_id: form.responsible_attorney_id || null,
      opposing_party: form.opposing_party.trim() || null,
      status: form.status,
      filed_date: form.filed_date || null,
      next_session_date: form.next_session_date || null,
    };
    if (editingId) {
      await supabase.from('lf_cases').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lf_cases').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('lf_cases').delete().eq('id', deleteId);
    setDeleteId(null); fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const caseTypeColors: Record<string, string> = {
    'تجاري': 'bg-blue-50 text-blue-700', 'مدني': 'bg-amber-50 text-amber-700',
    'تحكيم': 'bg-purple-50 text-purple-700', 'إداري': 'bg-green-50 text-green-700',
    'أحوال شخصية': 'bg-pink-50 text-pink-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">الدعاوى القضائية</h2>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> إضافة قضية
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Briefcase size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Gavel size={14} className="text-green-600" />} label="محاكم مختلفة" value={String(new Set(cases.map((c) => c.court_level)).size)} valueClass="text-green-700" />
        <StatCard icon={<Calendar size={14} className="text-amber-600" />} label="جلسات قادمة" value={String(cases.filter((c) => c.next_session_date && new Date(c.next_session_date) >= new Date()).length)} valueClass="text-amber-700" />
        <StatCard icon={<User size={14} className="text-gold" />} label="أنواع القضايا" value={String(new Set(cases.map((c) => c.case_type)).size)} valueClass="text-gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cases.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-gold/20 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-midnight flex items-center justify-center"><Gavel size={18} className="text-gold" /></div>
                <div>
                  <p className="font-body text-xs font-bold text-midnight">{c.case_number}</p>
                  <p className="font-body text-[10px] text-ink/50">{c.case_title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors opacity-0 group-hover:opacity-100"><Pencil size={14} /></button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                <span className={`px-2 py-0.5 rounded text-[10px] font-body mr-1 ${caseTypeColors[c.case_type] || 'bg-gray-100 text-ink/50'}`}>{c.case_type}</span>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="font-body text-[9px] text-ink/40">المحكمة</p><p className="font-body text-[10px] text-ink/70">{c.court_name}</p></div>
                <div><p className="font-body text-[9px] text-ink/40">درجة التقاضي</p><p className="font-body text-[10px] text-ink/70">{c.court_level}</p></div>
                <div><p className="font-body text-[9px] text-ink/40">العميل</p><p className="font-body text-[10px] text-ink/70">{c.client?.name || '—'}</p></div>
                <div><p className="font-body text-[9px] text-ink/40">المحامي المسؤول</p><p className="font-body text-[10px] text-ink/70">{c.attorney?.name || '—'}</p></div>
              </div>
              {c.subject && <div className="bg-gray-50 rounded-lg p-2"><p className="font-body text-[9px] text-ink/40 mb-0.5">موضوع الدعوى</p><p className="font-body text-[10px] text-ink/70">{c.subject}</p></div>}
              {c.opposing_party && <div className="flex items-center gap-2"><span className="font-body text-[9px] text-ink/40">الخصم:</span><span className="font-body text-[10px] text-red-600">{c.opposing_party}</span></div>}
              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div><p className="font-body text-[9px] text-ink/40">تاريخ القيد</p><p className="font-body text-[10px] text-ink/60">{formatDate(c.filed_date)}</p></div>
                  {c.next_session_date && <div><p className="font-body text-[9px] text-ink/40">الجلسة القادمة</p><p className="font-body text-[10px] text-amber-700 font-bold">{formatDate(c.next_session_date)}</p></div>}
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-body ${c.status === 'نشطة' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-ink/50'}`}>{c.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EntityModal open={modalOpen} title={editingId ? 'تعديل قضية' : 'إضافة قضية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="مثال: 1234/2024" /></Field>
          <Field label="نوع الدعوى">
            <Select value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })}>
              <option value="تجاري">تجاري</option><option value="مدني">مدني</option><option value="تحكيم">تحكيم</option>
              <option value="إداري">إداري</option><option value="أحوال شخصية">أحوال شخصية</option>
            </Select>
          </Field>
        </div>
        <Field label="عنوان الدعوى" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="درجة المحكمة">
            <Select value={form.court_level} onChange={(e) => setForm({ ...form, court_level: e.target.value })}>
              <option value="ابتدائي">ابتدائي</option><option value="استئناف">استئناف</option><option value="نقض">نقض</option><option value="القضاء الإداري">القضاء الإداري</option>
            </Select>
          </Field>
          <Field label="اسم المحكمة"><TextInput value={form.court_name} onChange={(e) => setForm({ ...form, court_name: e.target.value })} placeholder="مثال: محكمة القاهرة الاقتصادية" /></Field>
        </div>
        <Field label="موضوع الدعوى"><TextArea value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="العميل">
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— اختر العميل —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="المحامي المسؤول">
            <Select value={form.responsible_attorney_id} onChange={(e) => setForm({ ...form, responsible_attorney_id: e.target.value })}>
              <option value="">— اختر المحامي —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الخصم"><TextInput value={form.opposing_party} onChange={(e) => setForm({ ...form, opposing_party: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="تاريخ القيد"><TextInput type="date" value={form.filed_date} onChange={(e) => setForm({ ...form, filed_date: e.target.value })} /></Field>
          <Field label="الجلسة القادمة"><TextInput type="date" value={form.next_session_date} onChange={(e) => setForm({ ...form, next_session_date: e.target.value })} /></Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="نشطة">نشطة</option><option value="معلقة">معلقة</option><option value="مغلقة">مغلقة</option>
            </Select>
          </Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="سيتم حذف القضية وجميع الجلسات المرتبطة بها." />
    </div>
  );
}
