import { useEffect, useState } from 'react';
import { CheckSquare, Clock, AlertCircle, CheckCircle2, Loader2, Calendar, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { Task } from '@/lib/firmTypes';
import type { Client, Attorney } from '@/lib/financeTypes';
import type { Case } from '@/lib/firmTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';
import { useToast } from '@/components/Toast';

interface TaskFormData {
  title: string; description: string; task_type: string; priority: string; status: string;
  due_date: string; assigned_to: string; case_id: string; client_id: string;
}

const emptyForm: TaskFormData = {
  title: '', description: '', task_type: 'متابعة قضية', priority: 'متوسطة', status: 'بانتظار',
  due_date: '', assigned_to: '', case_id: '', client_id: '',
};

export default function TaskManagement({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, title: cmd.fields.title || '' });
      setEditingId(null); setModalOpen(true);
    }
  }, [voiceAdd]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [taskRes, attRes, clientRes, caseRes] = await Promise.all([
        supabase.from('lf_tasks').select('*, assignee:lf_attorneys(name), case:lf_cases(case_number, case_title), client:lf_clients(name)').order('due_date', { ascending: true }),
        supabase.from('lf_attorneys').select('*').order('name'),
        supabase.from('lf_clients').select('*').order('name'),
        supabase.from('lf_cases').select('id, case_number, case_title').order('case_number'),
      ]);
      setTasks((taskRes.data as Task[]) || []);
      setAttorneys((attRes.data as Attorney[]) || []);
      setClients((clientRes.data as Client[]) || []);
      setCases((caseRes.data as Case[]) || []);
    } catch (err) {
      console.error('Failed to fetch tasks data', err);
      try { showToast('فشل تحميل المهام. تحقق من الاتصال.', 'error'); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (t: Task) => {
    setForm({
      title: t.title, description: t.description || '', task_type: t.task_type || 'متابعة قضية',
      priority: t.priority || 'متوسطة', status: t.status || 'بانتظار', due_date: t.due_date || '',
      assigned_to: t.assigned_to || '', case_id: t.case_id || '', client_id: t.client_id || '',
    });
    setEditingId(t.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      task_type: form.task_type,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      case_id: form.case_id || null,
      client_id: form.client_id || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('lf_tasks').update(payload).eq('id', editingId);
        if (error) throw error;
        try { showToast('تم تحديث المهمة بنجاح', 'success'); } catch {}
      } else {
        const { error } = await supabase.from('lf_tasks').insert(payload);
        if (error) throw error;
        try { showToast('تم إنشاء المهمة بنجاح', 'success'); } catch {}
      }
      setModalOpen(false);
      fetchAll();
    } catch (err) {
      console.error('Save error', err);
      try { showToast('فشل حفظ المهمة. حاول مرة أخرى.', 'error'); } catch {}
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('lf_tasks').delete().eq('id', deleteId);
      if (error) throw error;
      try { showToast('تم حذف المهمة', 'success'); } catch {}
      setDeleteId(null);
      fetchAll();
    } catch (err) {
      console.error('Delete error', err);
      try { showToast('فشل حذف المهمة. حاول مرة أخرى.', 'error'); } catch {}
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const pending = tasks.filter((t) => t.status === 'بانتظار');
  const inProgress = tasks.filter((t) => t.status === 'قيد التنفيذ');
  const done = tasks.filter((t) => t.status === 'مكتملة');

  const priorityColor = (p: string) => p === 'عالية' ? 'bg-red-50 text-red-700' : p === 'متوسطة' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-ink/50';
  const statusColor = (s: string) => s === 'قيد التنفيذ' ? 'bg-blue-50 text-blue-700' : s === 'مكتملة' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-ink/50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckSquare size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">المهام والأعمال الإدارية</h2>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> إضافة مهمة
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<CheckSquare size={14} className="text-midnight" />} label="إجمالي المهام" value={String(tasks.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-blue-600" />} label="قيد التنفيذ" value={String(inProgress.length)} valueClass="text-blue-700" />
        <StatCard icon={<AlertCircle size={14} className="text-amber-600" />} label="بانتظار" value={String(pending.length)} valueClass="text-amber-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="مكتملة" value={String(done.length)} valueClass="text-green-700" />
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'مكتملة';
          return (
            <div key={task.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/20 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.status === 'مكتملة' ? 'bg-green-50' : task.status === 'قيد التنفيذ' ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    {task.status === 'مكتملة' ? <CheckCircle2 size={16} className="text-green-600" /> : task.status === 'قيد التنفيذ' ? <Clock size={16} className="text-blue-600" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs font-bold text-midnight">{task.title}</p>
                    {task.description && <p className="font-body text-[10px] text-ink/50 mt-1 leading-[1.6]">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body ${priorityColor(task.priority)}`}>{task.priority}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body ${statusColor(task.status)}`}>{task.status}</span>
                      <span className="font-body text-[10px] text-ink/40">{task.task_type}</span>
                      {task.assignee && <span className="font-body text-[10px] text-ink/50">المسؤول: {task.assignee.name}</span>}
                      {task.case && <span className="font-body text-[10px] text-ink/50">{task.case.case_number}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {task.due_date && (
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-ink/50'}`}>
                      <Calendar size={12} /><span className="font-body text-[10px]">{formatDate(task.due_date)}</span>
                      {isOverdue && <span className="font-body text-[9px] text-red-500">متأخرة</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(task)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteId(task.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EntityModal open={modalOpen} title={editingId ? 'تعديل مهمة' : 'إضافة مهمة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <Field label="عنوان المهمة" required><TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: إعداد مذكرة ا" /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="نوع المهمة">
            <Select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
              <option value="متابعة قضية">متابعة قضية</option><option value="إعداد مستند">إعداد مستند</option>
              <option value="اجتماع">اجتماع</option><option value="متابعة عميل">متابعة عميل</option><option value="أخرى">أخرى</option>
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="عالية">عالية</option><option value="متوسطة">متوسطة</option><option value="منخفضة">منخفضة</option>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="بانتظار">بانتظار</option><option value="قيد التنفيذ">قيد التنفيذ</option><option value="مكتملة">مكتملة</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الاستحقاق"><TextInput type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          <Field label="المسؤول">
            <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القضية المرتبطة">
            <Select value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })}>
              <option value="">— اختر —</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number} — {c.case_title}</option>)}
            </Select>
          </Field>
          <Field label="العميل المرتبط">
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— اختر —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
