import { useEffect, useState } from 'react';
import { FileText, Loader2, CheckCircle2, AlertCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import type { POA } from '@/lib/firmTypes';
import type { Client } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

interface POAFormData {
  poa_number: string; poa_type: string; client_id: string; issued_date: string;
  expiry_date: string; scope: string; notary_name: string; status: string;
}

const emptyForm: POAFormData = {
  poa_number: '', poa_type: 'عامة', client_id: '', issued_date: '',
  expiry_date: '', scope: '', notary_name: '', status: 'سارية',
};

export default function PowerOfAttorney({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [poas, setPoas] = useState<POA[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<POAFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, poa_number: cmd.fields.number || '', issued_date: new Date().toISOString().slice(0, 10) });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const fetchAll = async () => {
    setLoading(true);
    const [poaRes, clientRes] = await Promise.all([
      supabase.from('lf_poa').select('*, client:lf_clients(name, company)').order('issued_date', { ascending: false }),
      supabase.from('lf_clients').select('*').order('name'),
    ]);
    setPoas((poaRes.data as POA[]) || []);
    setClients((clientRes.data as Client[]) || []);
    setLoading(false);
  };

  const openAdd = () => { setForm({ ...emptyForm, issued_date: new Date().toISOString().slice(0, 10) }); setEditingId(null); setModalOpen(true); };
  const openEdit = (p: POA) => {
    setForm({
      poa_number: p.poa_number, poa_type: p.poa_type || 'عامة', client_id: p.client_id || '',
      issued_date: p.issued_date || '', expiry_date: p.expiry_date || '', scope: p.scope || '',
      notary_name: p.notary_name || '', status: p.status || 'سارية',
    });
    setEditingId(p.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.poa_number.trim() || !form.issued_date) return;
    setSaving(true);
    const payload = {
      poa_number: form.poa_number.trim(),
      poa_type: form.poa_type,
      client_id: form.client_id || null,
      issued_date: form.issued_date,
      expiry_date: form.expiry_date || null,
      scope: form.scope.trim() || null,
      notary_name: form.notary_name.trim() || null,
      status: form.status,
    };
    if (editingId) {
      await supabase.from('lf_poa').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lf_poa').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('lf_poa').delete().eq('id', deleteId);
    setDeleteId(null); fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const active = poas.filter((p) => p.status === 'سارية');
  const expired = poas.filter((p) => p.status === 'منتهية');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">التوكيلات</h2>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> إضافة توكيل
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي التوكيلات" value={String(poas.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="سارية المفعول" value={String(active.length)} valueClass="text-green-700" />
        <StatCard icon={<AlertCircle size={14} className="text-red-500" />} label="منتهية" value={String(expired.length)} valueClass="text-red-700" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">رقم التوكيل</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">العميل</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">النوع</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">النطاق</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">تاريخ الإصدار</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">تاريخ الانتهاء</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الشهر العقاري</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-ink/60 w-20">الحالة</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {poas.map((poa) => {
                const isExpiringSoon = poa.expiry_date && new Date(poa.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={poa.id} className="border-b border-gray-50 hover:bg-gray-50/50 group">
                    <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{poa.poa_number}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/70">{poa.client?.name || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-body ${poa.poa_type === 'عامة' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{poa.poa_type}</span></td>
                    <td className="px-4 py-3 font-body text-[10px] text-ink/60 max-w-[200px] truncate">{poa.scope}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{formatDate(poa.issued_date)}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{poa.expiry_date ? formatDate(poa.expiry_date) : '—'}</td>
                    <td className="px-4 py-3 font-body text-xs text-ink/60">{poa.notary_name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-body ${poa.status === 'سارية' && !isExpiringSoon ? 'bg-green-50 text-green-700' : poa.status === 'سارية' && isExpiringSoon ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{poa.status === 'سارية' && isExpiringSoon ? 'قارب الانتهاء' : poa.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(poa)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteId(poa.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EntityModal open={modalOpen} title={editingId ? 'تعديل توكيل' : 'إضافة توكيل جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم التوكيل" required><TextInput value={form.poa_number} onChange={(e) => setForm({ ...form, poa_number: e.target.value })} placeholder="مثال: 2024/123" /></Field>
          <Field label="نوع التوكيل">
            <Select value={form.poa_type} onChange={(e) => setForm({ ...form, poa_type: e.target.value })}>
              <option value="عامة">عامة</option><option value="خاصة">خاصة</option><option value="خصوصية">خصوصية</option>
            </Select>
          </Field>
        </div>
        <Field label="العميل">
          <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">— اختر العميل —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="نطاق التوكيل"><TextArea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="مثال: التوقيع على عقود البيع والشراء..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الإصدار" required><TextInput type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} /></Field>
          <Field label="تاريخ الانتهاء"><TextInput type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الشهر العقاري"><TextInput value={form.notary_name} onChange={(e) => setForm({ ...form, notary_name: e.target.value })} placeholder="مثال: شهر عقاري المعادي" /></Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="سارية">سارية</option><option value="منتهية">منتهية</option><option value="ملغاة">ملغاة</option>
            </Select>
          </Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
