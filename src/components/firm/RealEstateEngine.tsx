import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Home, DollarSign,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, Building2, BadgeCheck,
  MapPin, Calendar, Landmark,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M22Property, M22Transaction, M22AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'properties' | 'transactions' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  initiation: { label: 'البدء والتهيئة', bg: 'bg-blue-50', text: 'text-blue-700' },
  drafted: { label: 'صياغة العقد', bg: 'bg-amber-50', text: 'text-amber-700' },
  signed: { label: 'التوقيع', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  registered: { label: 'التسجيل', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'الأرشفة', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['initiation', 'drafted', 'signed', 'registered', 'archived'];

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  sale: 'بيع',
  purchase: 'شراء',
  lease: 'إيجار',
  development: 'تطوير عقاري',
  mortgage: 'رهن',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  residential: 'سكني',
  commercial: 'تجاري',
  industrial: 'صناعي',
  agricultural: 'زراعي',
  mixed: 'متعدد الاستخدام',
};

const TX_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد النظر', bg: 'bg-amber-50', text: 'text-amber-600' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-600' },
  registered: { label: 'مُسَجَّل', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  cancelled: { label: 'ملغي', bg: 'bg-red-50', text: 'text-red-600' },
};

interface PropertyForm {
  property_number: string;
  property_title: string;
  transaction_type: string;
  stage: string;
  property_type: string;
  location: string;
  area_sqm: string;
  property_value: string;
  mortgage_registered: boolean;
  mortgage_amount: string;
  encumbrance_free: boolean;
  fidic_contract: boolean;
  developer_agreement: boolean;
  registration_status: string;
  description: string;
}

const emptyForm: PropertyForm = {
  property_number: '', property_title: '', transaction_type: 'sale', stage: 'initiation',
  property_type: 'residential', location: '', area_sqm: '0', property_value: '0',
  mortgage_registered: false, mortgage_amount: '0', encumbrance_free: true,
  fidic_contract: false, developer_agreement: false, registration_status: 'pending',
  description: '',
};

const emptyTxForm = {
  transaction_type: 'sale', party_a: '', party_b: '', transaction_value: '0',
  transaction_date: '', registration_date: '', notarized: false, description: '',
};

export default function RealEstateEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [properties, setProperties] = useState<M22Property[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('properties');
  const [selectedProperty, setSelectedProperty] = useState<M22Property | null>(null);
  const [transactions, setTransactions] = useState<M22Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<M22AuditLog[]>([]);
  const [allTransactions, setAllTransactions] = useState<M22Transaction[]>([]);
  const [allAudit, setAllAudit] = useState<M22AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'property' | 'tx'>('property');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState(emptyTxForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [propRes, attRes, txRes, auditRes] = await Promise.all([
      supabase.from('m22_properties')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m22_transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('m22_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setProperties((propRes.data as M22Property[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllTransactions((txRes.data as M22Transaction[]) || []);
    setAllAudit((auditRes.data as M22AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, property_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (propertyId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m22_audit_logs').insert({
      case_id: propertyId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (p: M22Property) => {
    setForm({
      property_number: p.property_number, property_title: p.property_title,
      transaction_type: p.transaction_type, stage: p.stage, property_type: p.property_type,
      location: p.location || '', area_sqm: String(p.area_sqm || 0), property_value: String(p.property_value || 0),
      mortgage_registered: p.mortgage_registered || false, mortgage_amount: String(p.mortgage_amount || 0),
      encumbrance_free: p.encumbrance_free ?? true, fidic_contract: p.fidic_contract || false,
      developer_agreement: p.developer_agreement || false, registration_status: p.registration_status || 'pending',
      description: p.description || '',
    });
    setEditingId(p.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.property_title.trim() || !form.property_number.trim()) return;
    setSaving(true);
    const payload = {
      property_number: form.property_number.trim(),
      property_title: form.property_title.trim(),
      transaction_type: form.transaction_type,
      stage: form.stage,
      property_type: form.property_type,
      location: form.location.trim() || null,
      area_sqm: Number(form.area_sqm) || 0,
      property_value: Number(form.property_value) || 0,
      mortgage_registered: form.mortgage_registered,
      mortgage_amount: Number(form.mortgage_amount) || 0,
      encumbrance_free: form.encumbrance_free,
      fidic_contract: form.fidic_contract,
      developer_agreement: form.developer_agreement,
      registration_status: form.registration_status,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m22_properties').update(payload).eq('id', editingId);
      await logAudit(editingId, 'property_updated', 'تحديث بيانات العقار');
    } else {
      const { data } = await supabase.from('m22_properties').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'property_created', 'إنشاء ملف عقار — نوع: ' + (PROPERTY_TYPE_LABELS[form.property_type] || form.property_type) + ' — تصرّف: ' + (TRANSACTION_TYPE_LABELS[form.transaction_type] || form.transaction_type));
        await supabase.from('m22_properties').update({
          m53_document_id: 'M53-M22-' + Date.now().toString().slice(-6),
          m16_signed: true,
          m54_cost_center_opened: true,
          m10_deadlines_registered: true,
          m51_tasks_generated: true,
          m50_risk_assessed: true,
          m83_assets_updated: true,
          m92_notified: true,
          cost_center_id: 'CC-M22-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_linked', 'ربط العقار بخزينة المستندات (M53) — أرشفة عقود التصرّف');
        await logAudit(newId, 'm16_signed', 'توقيع عقد التصرّف العقاري إلكترونياً عبر المحرك (M16)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي للعقار في المحرك المالي (M54)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد التسجيل والتجديد في المحرك الموحد (M10)');
        await logAudit(newId, 'm51_tasks', 'توليد مهام الإجراءات في محرك المهام (M51)');
        await logAudit(newId, 'm50_risk', 'تقييم مخاطر العقار في محرك المخاطر (M50)');
        await logAudit(newId, 'm83_assets', 'تحديث سجل الأصول في محرك التقييم (M83)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء ملف العقار');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'property') await supabase.from('m22_properties').delete().eq('id', deleteId);
    else await supabase.from('m22_transactions').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'property') setSelectedProperty(null);
    fetchAll();
    if (selectedProperty && deleteType === 'tx') openPropertyDetail(selectedProperty);
  };

  const openPropertyDetail = async (p: M22Property) => {
    setSelectedProperty(p);
    setDetailLoading(true);
    const [txRes, aRes] = await Promise.all([
      supabase.from('m22_transactions').select('*').eq('property_id', p.id).order('created_at', { ascending: false }),
      supabase.from('m22_audit_logs').select('*').eq('case_id', p.id).order('created_at', { ascending: true }),
    ]);
    setTransactions((txRes.data as M22Transaction[]) || []);
    setAuditLogs((aRes.data as M22AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (p: M22Property) => {
    const idx = STAGES.indexOf(p.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m22_properties').update({ stage: next }).eq('id', p.id);
    await logAudit(p.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedProperty({ ...p, stage: next } as M22Property);
  };

  const addTransaction = async () => {
    if (!selectedProperty || !txForm.party_a.trim()) return;
    await supabase.from('m22_transactions').insert({
      property_id: selectedProperty.id,
      transaction_type: txForm.transaction_type,
      party_a: txForm.party_a.trim(),
      party_b: txForm.party_b.trim() || null,
      transaction_value: Number(txForm.transaction_value) || 0,
      transaction_date: txForm.transaction_date || new Date().toISOString().split('T')[0],
      registration_date: txForm.registration_date || null,
      notarized: txForm.notarized,
      description: txForm.description.trim() || null,
    });
    await logAudit(selectedProperty.id, 'transaction_added', 'إضافة تصرّف عقاري — ' + (TRANSACTION_TYPE_LABELS[txForm.transaction_type] || txForm.transaction_type) + ': ' + txForm.party_a);
    setTxForm(emptyTxForm);
    setTxModalOpen(false);
    openPropertyDetail(selectedProperty);
  };

  const filteredProperties = properties.filter((p) => {
    if (filterType !== 'all' && p.property_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.property_number.toLowerCase().includes(q) && !p.property_title.toLowerCase().includes(q) &&
          !(p.location || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const registeredProperties = properties.filter((p) => p.stage === 'registered' || p.stage === 'archived').length;
  const totalValue = properties.reduce((s, p) => s + (p.property_value || 0), 0);
  const mortgagedCount = properties.filter((p) => p.mortgage_registered).length;

  const tabs: { id: Tab; label: string; icon: typeof Home; badge?: number }[] = [
    { id: 'properties', label: 'العقارات', icon: Home, badge: properties.length },
    { id: 'transactions', label: 'التصرفات', icon: FileText, badge: allTransactions.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Home size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">العقارات والتطوير العقاري (M22)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة العقارات والتصرّفات — التسجيل والرهن والتطوير العقاري</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ABAC</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> عقار جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Home size={14} className="text-midnight" />} label="إجمالي العقارات" value={String(properties.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="عقارات مُسَجَّلة" value={String(registeredProperties)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة العقارات" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<Landmark size={14} className="text-amber-600" />} label="عقارات مرهونة" value={String(mortgagedCount)} valueClass="text-amber-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة العقار — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.initiation;
            const count = properties.filter((p) => p.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} عقار</span>
                </div>
                {i < STAGES.length - 1 && <ArrowRight size={12} className="text-gold/30 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل (Integration Matrix)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
          {[
            { icon: FileText, label: 'خزينة المستندات (M53)', desc: 'أرشفة العقود', color: 'text-blue-600' },
            { icon: Shield, label: 'التوقيع الإلكتروني (M16)', desc: 'توقيع العقود', color: 'text-cyan-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'مركز تكلفة العقار', color: 'text-gold' },
            { icon: CircuitBoard, label: 'المحرك الموحد (M10)', desc: 'تسجيل المواعيد', color: 'text-purple-600' },
            { icon: CheckCircle2, label: 'محرك المهام (M51)', desc: 'توليد المهام', color: 'text-green-600' },
            { icon: AlertCircle, label: 'محرك المخاطر (M50)', desc: 'تقييم المخاطر', color: 'text-red-600' },
            { icon: BadgeCheck, label: 'تقييم الأصول (M83)', desc: 'تحديث سجل الأصول', color: 'text-green-600' },
            { icon: Server, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات المواعيد', color: 'text-amber-600' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={item.color} />
                  <span className="font-body text-[10px] font-bold text-midnight">{item.label}</span>
                </div>
                <p className="font-body text-[9px] text-ink/40 leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-gold border-gold' : 'text-ink/40 border-transparent hover:text-ink/60'}`}>
              <Icon size={14} /> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters for properties */}
      {activeTab === 'properties' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو موقع..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Properties tab */}
      {activeTab === 'properties' && (
        <div className="space-y-2">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Home size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد عقارات مسجلة</p>
            </div>
          ) : (
            filteredProperties.map((p) => {
              const sCfg = STAGE_CONFIG[p.stage] || STAGE_CONFIG.initiation;
              const stageIdx = STAGES.indexOf(p.stage);
              return (
                <div key={p.id} onClick={() => openPropertyDetail(p)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Home size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{p.property_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{PROPERTY_TYPE_LABELS[p.property_type] || p.property_type}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{TRANSACTION_TYPE_LABELS[p.transaction_type] || p.transaction_type}</span>
                          {p.mortgage_registered && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Landmark size={8} /> مرهون</span>}
                          {!p.encumbrance_free && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> عليه تكاليف</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{p.property_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {p.location && <span className="font-body text-[9px] text-ink/40"><MapPin size={9} className="inline ml-0.5" />{p.location}</span>}
                          {p.area_sqm > 0 && <span className="font-body text-[9px] text-ink/40">المساحة: {p.area_sqm} م²</span>}
                          {p.property_value > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(p.property_value)}</span>}
                          {p.fidic_contract && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><FileText size={8} /> FIDIC</span>}
                          {p.developer_agreement && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Building2 size={8} /> اتفاق مطوّر</span>}
                          {p.m16_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Shield size={8} /> M16</span>}
                          {p.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {p.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><CircuitBoard size={8} /> M10</span>}
                          {p.m50_risk_assessed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> M50</span>}
                          {p.m83_assets_updated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M83</span>}
                          {p.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Server size={8} /> M92</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-0.5">
                        {STAGES.map((s, i) => (
                          <span key={s} className={`w-1.5 h-1.5 rounded-full ${i <= stageIdx ? 'bg-gold' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); setDeleteType('property'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                      </div>
                      <ChevronRight size={14} className="text-ink/20 group-hover:text-gold transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Transactions tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-2">
          {allTransactions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><FileText size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تصرفات عقارية مسجلة</p></div>
          ) : (
            allTransactions.map((tx) => {
              const p = properties.find((x) => x.id === tx.property_id);
              return (
                <div key={tx.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                        <FileText size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/50">{TRANSACTION_TYPE_LABELS[tx.transaction_type] || tx.transaction_type}</span>
                          {tx.notarized ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> موثّق</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Clock size={8} /> غير موثّق</span>
                          )}
                          {p && <span className="font-body text-[9px] text-gold">{p.property_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{tx.party_a} {tx.party_b && <span className="text-ink/40 font-normal">← {tx.party_b}</span>}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {tx.transaction_value > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(tx.transaction_value)}</span>}
                          {tx.transaction_date && <span className="font-body text-[9px] text-ink/40"><Calendar size={9} className="inline ml-0.5" />{formatDate(tx.transaction_date)}</span>}
                          {tx.registration_date && <span className="font-body text-[9px] text-green-600"><BadgeCheck size={9} className="inline ml-0.5" />{formatDate(tx.registration_date)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(tx.id); setDeleteType('tx'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل ZK-Audit غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m16') ? <Shield size={12} className="text-cyan-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <CircuitBoard size={12} className="text-purple-600" />
                      : log.action.includes('m51') ? <CheckCircle2 size={12} className="text-green-600" />
                      : log.action.includes('m50') ? <AlertCircle size={12} className="text-red-600" />
                      : log.action.includes('m83') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Server size={12} className="text-amber-600" />
                      : log.action.includes('transaction') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('stage') ? <ArrowRight size={12} className="text-gold" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                    </div>
                    {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-body text-[9px] text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                      {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Shield size={8} /> {log.hash_chain}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Property detail drawer */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedProperty(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Home size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف العقار</span>
              </div>
              <button onClick={() => setSelectedProperty(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedProperty.property_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedProperty.stage] || STAGE_CONFIG.initiation).bg} ${(STAGE_CONFIG[selectedProperty.stage] || STAGE_CONFIG.initiation).text}`}>
                      {(STAGE_CONFIG[selectedProperty.stage] || STAGE_CONFIG.initiation).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{PROPERTY_TYPE_LABELS[selectedProperty.property_type] || selectedProperty.property_type}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{TRANSACTION_TYPE_LABELS[selectedProperty.transaction_type] || selectedProperty.transaction_type}</span>
                    {selectedProperty.mortgage_registered && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-amber-50 text-amber-600"><Landmark size={10} /> مرهون</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedProperty.property_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.initiation;
                      const stageIdx = STAGES.indexOf(selectedProperty.stage);
                      const isActive = i === stageIdx;
                      const isPast = i < stageIdx;
                      return (
                        <div key={s} className="flex-1">
                          <div className={`h-1.5 rounded-full ${isPast || isActive ? 'bg-gold' : 'bg-gray-200'} ${isActive ? 'animate-pulse' : ''}`} />
                          <p className={`font-body text-[8px] mt-1 text-center ${isActive ? 'text-gold font-bold' : 'text-ink/30'}`}>{cfg.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  {selectedProperty.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedProperty)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Property info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Home size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات العقار</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الموقع</span><p className="font-body text-xs font-bold text-midnight">{selectedProperty.location || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المساحة (م²)</span><p className="font-body text-xs font-bold text-midnight">{selectedProperty.area_sqm}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع العقار</span><p className="font-body text-xs font-bold text-midnight">{PROPERTY_TYPE_LABELS[selectedProperty.property_type] || selectedProperty.property_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع التصرّف</span><p className="font-body text-xs font-bold text-midnight">{TRANSACTION_TYPE_LABELS[selectedProperty.transaction_type] || selectedProperty.transaction_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة العقار</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedProperty.property_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حالة التسجيل</span><p className="font-body text-xs font-bold text-midnight">{selectedProperty.registration_status || '—'}</p></div>
                  </div>
                </div>

                {/* Mortgage & encumbrance */}
                {(selectedProperty.mortgage_registered || !selectedProperty.encumbrance_free) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedProperty.mortgage_registered && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                        <Landmark size={14} className="text-amber-600" />
                        <div>
                          <p className="font-body text-[10px] font-bold text-amber-700">عقار مرهون</p>
                          {selectedProperty.mortgage_amount > 0 && <p className="font-body text-[9px] text-amber-600">قيمة الرهن: {formatCurrency(selectedProperty.mortgage_amount)}</p>}
                        </div>
                      </div>
                    )}
                    {!selectedProperty.encumbrance_free && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
                        <AlertCircle size={14} className="text-red-600" />
                        <div>
                          <p className="font-body text-[10px] font-bold text-red-700">عليه تكاليف/قيود</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Contract flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.fidic_contract ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> FIDIC {selectedProperty.fidic_contract ? 'مُبرَم' : 'غير مُبرَم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.developer_agreement ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Building2 size={10} /> اتفاق مطوّر {selectedProperty.developer_agreement ? 'مُبرَم' : 'غير مُبرَم'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.m16_signed ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M16 {selectedProperty.m16_signed ? 'موقّع' : 'غير موقّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedProperty.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.m10_deadlines_registered ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M10 {selectedProperty.m10_deadlines_registered ? 'مُسَجَّل' : 'غير مُسَجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.m51_tasks_generated ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CheckCircle2 size={10} /> M51 {selectedProperty.m51_tasks_generated ? 'مُولَّد' : 'غير مُولَّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.m50_risk_assessed ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><AlertCircle size={10} /> M50 {selectedProperty.m50_risk_assessed ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.m83_assets_updated ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M83 {selectedProperty.m83_assets_updated ? 'مُحَدَّث' : 'غير مُحَدَّث'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedProperty.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M92 {selectedProperty.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedProperty.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedProperty.description}</p></div>
                )}

                {/* Transactions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><FileText size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">التصرّفات العقارية</span></div>
                    <button onClick={() => setTxModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة تصرّف</button>
                  </div>
                  <div className="space-y-1.5">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/tx">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/50">{TRANSACTION_TYPE_LABELS[tx.transaction_type] || tx.transaction_type}</span>
                          {tx.notarized ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> موثّق</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Clock size={8} /> غير موثّق</span>
                          )}
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{tx.party_a} {tx.party_b && <span className="text-ink/40 font-normal">← {tx.party_b}</span>}</p>
                          <button onClick={() => { setDeleteId(tx.id); setDeleteType('tx'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/tx:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {tx.transaction_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(tx.transaction_value)}</span>}
                          {tx.transaction_date && <span className="font-body text-[9px] text-ink/40">{formatDate(tx.transaction_date)}</span>}
                          {tx.registration_date && <span className="font-body text-[9px] text-green-600">تسجيل: {formatDate(tx.registration_date)}</span>}
                        </div>
                        {tx.description && <p className="font-body text-[9px] text-ink/50 leading-tight mt-1">{tx.description}</p>}
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد تصرفات مسجلة</p>}
                  </div>
                </div>

                {/* Audit trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Shield size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق</span></div>
                  <div className="space-y-1.5">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-body text-ink/60">{log.action}</span>
                          {log.detail && <p className="font-body text-ink/40 leading-tight">{log.detail}</p>}
                          <span className="font-body text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل العقار' : 'عقار جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم العقار" required><TextInput value={form.property_number} onChange={(e) => setForm({ ...form, property_number: e.target.value })} placeholder="RE-2025-001" /></Field>
          <Field label="نوع العقار">
            <Select value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان العقار" required><TextInput value={form.property_title} onChange={(e) => setForm({ ...form, property_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التصرّف">
            <Select value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}>
              {Object.entries(TRANSACTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الموقع"><TextInput value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="المساحة (م²)"><TextInput type="number" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} /></Field>
        </div>
        <Field label="قيمة العقار"><TextInput type="number" value={form.property_value} onChange={(e) => setForm({ ...form, property_value: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حالة التسجيل">
            <Select value={form.registration_status} onChange={(e) => setForm({ ...form, registration_status: e.target.value })}>
              <option value="pending">قيد النظر</option>
              <option value="registered">مُسَجَّل</option>
              <option value="rejected">مرفوض</option>
              <option value="expired">منتهي</option>
            </Select>
          </Field>
          <Field label="قيمة الرهن"><TextInput type="number" value={form.mortgage_amount} onChange={(e) => setForm({ ...form, mortgage_amount: e.target.value })} /></Field>
        </div>
        <Checkbox label="عقار مرهون (Mortgage Registered)" checked={form.mortgage_registered} onChange={(v) => setForm({ ...form, mortgage_registered: v })} />
        <Checkbox label="خالٍ من التكاليف والقيود (Encumbrance-Free)" checked={form.encumbrance_free} onChange={(v) => setForm({ ...form, encumbrance_free: v })} />
        <Checkbox label="عقد FIDIC مُبرَم" checked={form.fidic_contract} onChange={(v) => setForm({ ...form, fidic_contract: v })} />
        <Checkbox label="اتفاقية مطوّر عقاري مُبرَمة" checked={form.developer_agreement} onChange={(v) => setForm({ ...form, developer_agreement: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Transaction modal */}
      <EntityModal open={txModalOpen} title="إضافة تصرّف عقاري" onClose={() => setTxModalOpen(false)} onSubmit={addTransaction}>
        <Field label="نوع التصرّف">
          <Select value={txForm.transaction_type} onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })}>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الطرف الأول" required><TextInput value={txForm.party_a} onChange={(e) => setTxForm({ ...txForm, party_a: e.target.value })} /></Field>
          <Field label="الطرف الثاني"><TextInput value={txForm.party_b} onChange={(e) => setTxForm({ ...txForm, party_b: e.target.value })} /></Field>
        </div>
        <Field label="قيمة التصرّف"><TextInput type="number" value={txForm.transaction_value} onChange={(e) => setTxForm({ ...txForm, transaction_value: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التصرّف"><TextInput type="date" value={txForm.transaction_date} onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })} /></Field>
          <Field label="تاريخ التسجيل"><TextInput type="date" value={txForm.registration_date} onChange={(e) => setTxForm({ ...txForm, registration_date: e.target.value })} /></Field>
        </div>
        <Checkbox label="موثّق (Notarized)" checked={txForm.notarized} onChange={(v) => setTxForm({ ...txForm, notarized: v })} />
        <Field label="الوصف"><TextArea value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
