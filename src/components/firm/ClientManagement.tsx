import { useEffect, useState } from 'react';
import { Users, Building2, Phone, Mail, Loader2, CreditCard, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { supabase, formatCurrency } from '@/lib/financeUtils';
import type { Client } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, Select } from './EntityModal';
import type { PendingAddCommand } from '@/lib/voiceTypes';

interface ClientFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  credit_limit: string;
  payment_terms_days: string;
  status: string;
}

const emptyForm: ClientFormData = {
  name: '', company: '', email: '', phone: '', credit_limit: '0', payment_terms_days: '30', status: 'نشط',
};

export default function ClientManagement({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { fetchClients(); }, []);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, name: cmd.fields.name || '', company: cmd.fields.company || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('lf_clients').select('*').order('name');
    setClients((data as Client[]) || []);
    setLoading(false);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (c: Client) => {
    setForm({
      name: c.name, company: c.company || '', email: c.email || '', phone: c.phone || '',
      credit_limit: String(c.credit_limit || 0), payment_terms_days: String(c.payment_terms_days || 30), status: c.status,
    });
    setEditingId(c.id); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      credit_limit: Number(form.credit_limit) || 0,
      payment_terms_days: Number(form.payment_terms_days) || 30,
      status: form.status,
    };
    if (editingId) {
      await supabase.from('lf_clients').update(payload).eq('id', editingId);
    } else {
      await supabase.from('lf_clients').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchClients();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('lf_clients').delete().eq('id', deleteId);
    setDeleteId(null); fetchClients();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeClients = clients.filter((c) => c.status === 'نشط');
  const totalCreditLimit = clients.reduce((sum, c) => sum + (c.credit_limit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">العملاء والموكلون</h2>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> إضافة عميل
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<Users size={14} className="text-midnight" />} label="إجمالي العملاء" value={String(clients.length)} valueClass="text-midnight" />
        <StatCard icon={<Building2 size={14} className="text-green-600" />} label="عملاء نشطون" value={String(activeClients.length)} valueClass="text-green-700" />
        <StatCard icon={<CreditCard size={14} className="text-gold" />} label="إجمالي حدود الائتمان" value={formatCurrency(totalCreditLimit)} valueClass="text-gold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-gold/30 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-midnight flex items-center justify-center">
                  <Building2 size={18} className="text-gold" />
                </div>
                <div>
                  <p className="font-body text-xs font-bold text-midnight">{client.name}</p>
                  <p className="font-body text-[10px] text-ink/40">{client.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(client)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors opacity-0 group-hover:opacity-100">
                  <Pencil size={14} />
                </button>
                <button onClick={() => setDeleteId(client.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-gray-100">
              {client.email && <InfoRow icon={<Mail size={12} className="text-ink/30" />} text={client.email} />}
              {client.phone && <InfoRow icon={<Phone size={12} className="text-ink/30" />} text={client.phone} />}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-body text-[9px] text-ink/40">حد الائتمان</p>
                  <p className="font-heading font-bold text-midnight text-xs">{formatCurrency(client.credit_limit || 0)}</p>
                </div>
                <div className="text-left">
                  <p className="font-body text-[9px] text-ink/40">شروط السداد</p>
                  <p className="font-body text-xs text-ink/60">{client.payment_terms_days || 0} يوم</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-body ${client.status === 'نشط' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-ink/50'}`}>
                  {client.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EntityModal open={modalOpen} title={editingId ? 'تعديل عميل' : 'إضافة عميل جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <Field label="اسم العميل" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: شركة النيل للتجارة" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الشركة"><TextInput value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="البريد الإلكتروني"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الهاتف"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="نشط">نشط</option>
              <option value="غير نشط">غير نشط</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حد الائتمان (ج.م)"><TextInput type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} /></Field>
          <Field label="شروط السداد (أيام)"><TextInput type="number" value={form.payment_terms_days} onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })} /></Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

export function StatCard({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: string; valueClass: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">{icon}<p className="font-body text-xs text-ink/50">{label}</p></div>
      <p className={`font-heading font-bold text-xl ${valueClass}`}>{value}</p>
    </div>
  );
}

export function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2">{icon}<p className="font-body text-[10px] text-ink/60 truncate">{text}</p></div>;
}

export function DeleteConfirm({ open, onClose, onConfirm, message }: { open: boolean; onClose: () => void; onConfirm: () => void; message?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <h3 className="font-heading font-bold text-midnight text-base">تأكيد الحذف</h3>
        </div>
        <p className="font-body text-sm text-ink/60 mb-6">{message || 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.'}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors">إلغاء</button>
          <button onClick={onConfirm} className="px-5 py-2 rounded-lg font-body text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">حذف</button>
        </div>
      </div>
    </div>
  );
}
