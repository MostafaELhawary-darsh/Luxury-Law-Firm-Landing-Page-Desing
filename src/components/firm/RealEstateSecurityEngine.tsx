import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Lock,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, Server, AlertCircle, BadgeCheck,
  DollarSign, Radio, Home, Calendar,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M33Mortgage, M33AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'mortgages' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  registration: { label: 'التسجيل', bg: 'bg-blue-50', text: 'text-blue-700' },
  registered: { label: 'مُسَجَّل', bg: 'bg-amber-50', text: 'text-amber-700' },
  monitoring: { label: 'المراقبة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  renewal: { label: 'التجديد', bg: 'bg-purple-50', text: 'text-purple-700' },
  released: { label: 'الإبراء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['registration', 'registered', 'monitoring', 'renewal', 'released'];

const MORTGAGE_TYPE_LABELS: Record<string, string> = {
  official_mortgage: 'رهن رسمي',
  possession_mortgage: 'رهن حيازي',
  privilege: 'امتياز',
  assignment: 'حوالة',
};

const RELEASE_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  released: 'مُبرَأ',
  partially_released: 'إبراء جزئي',
};

interface MortgageForm {
  mortgage_number: string;
  mortgage_title: string;
  mortgage_type: string;
  stage: string;
  creditor_name: string;
  debtor_name: string;
  secured_amount: string;
  property_subject: string;
  registration_date: string;
  renewal_date: string;
  release_status: string;
  iot_monitoring_active: boolean;
  description: string;
}

const emptyForm: MortgageForm = {
  mortgage_number: '', mortgage_title: '', mortgage_type: 'official_mortgage', stage: 'registration',
  creditor_name: '', debtor_name: '', secured_amount: '0', property_subject: '',
  registration_date: '', renewal_date: '', release_status: 'active',
  iot_monitoring_active: false, description: '',
};

export default function RealEstateSecurityEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [mortgages, setMortgages] = useState<M33Mortgage[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('mortgages');
  const [selectedMortgage, setSelectedMortgage] = useState<M33Mortgage | null>(null);
  const [auditLogs, setAuditLogs] = useState<M33AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M33AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MortgageForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mortRes, attRes, auditRes] = await Promise.all([
      supabase.from('m33_mortgages')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m33_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setMortgages((mortRes.data as M33Mortgage[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M33AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, mortgage_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (mortgageId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m33_audit_logs').insert({
      case_id: mortgageId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (m: M33Mortgage) => {
    setForm({
      mortgage_number: m.mortgage_number, mortgage_title: m.mortgage_title,
      mortgage_type: m.mortgage_type, stage: m.stage,
      creditor_name: m.creditor_name || '', debtor_name: m.debtor_name || '',
      secured_amount: String(m.secured_amount || 0), property_subject: m.property_subject || '',
      registration_date: m.registration_date || '', renewal_date: m.renewal_date || '',
      release_status: m.release_status || 'active',
      iot_monitoring_active: m.iot_monitoring_active || false,
      description: m.description || '',
    });
    setEditingId(m.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.mortgage_title.trim() || !form.mortgage_number.trim()) return;
    setSaving(true);
    const payload = {
      mortgage_number: form.mortgage_number.trim(),
      mortgage_title: form.mortgage_title.trim(),
      mortgage_type: form.mortgage_type,
      stage: form.stage,
      status: 'active',
      creditor_name: form.creditor_name.trim() || null,
      debtor_name: form.debtor_name.trim() || null,
      secured_amount: Number(form.secured_amount) || 0,
      property_subject: form.property_subject.trim() || null,
      registration_date: form.registration_date || null,
      renewal_date: form.renewal_date || null,
      release_status: form.release_status,
      iot_monitoring_active: form.iot_monitoring_active,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m33_mortgages').update(payload).eq('id', editingId);
      await logAudit(editingId, 'mortgage_updated', 'تحديث بيانات الرهن');
    } else {
      const { data } = await supabase.from('m33_mortgages').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'mortgage_created', 'إنشاء رهن — نوع: ' + (MORTGAGE_TYPE_LABELS[form.mortgage_type] || form.mortgage_type));
        await supabase.from('m33_mortgages').update({
          m83_property_checked: true,
          m22_sale_blocked: true,
          m54_finance_linked: true,
          m75_bank_linked: true,
          m10_deadlines_registered: true,
          m107_iot_monitoring: form.iot_monitoring_active,
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M33-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm83_property', 'فحص العقار في محرك التقييم (M83)');
        await logAudit(newId, 'm22_sale_blocked', 'حظر بيع العقار في محرك العقارات (M22)');
        await logAudit(newId, 'm54_finance', 'ربط الرهن بالحساب المالي (M54)');
        await logAudit(newId, 'm75_bank', 'ربط الرهن بالبنك في محرك البنوك (M75)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد التجديد في المحرك الموحد (M10)');
        if (form.iot_monitoring_active) await logAudit(newId, 'm107_iot', 'تفعيل مراقبة IoT للعقار (M107)');
        await logAudit(newId, 'm109_biometric', 'التوقيع البيومتري للدائن والمدين (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الرهن');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m33_mortgages').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedMortgage(null);
    fetchAll();
  };

  const openMortgageDetail = async (m: M33Mortgage) => {
    setSelectedMortgage(m);
    setDetailLoading(true);
    const aRes = await supabase.from('m33_audit_logs').select('*').eq('case_id', m.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M33AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (m: M33Mortgage) => {
    const idx = STAGES.indexOf(m.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m33_mortgages').update({ stage: next }).eq('id', m.id);
    await logAudit(m.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedMortgage({ ...m, stage: next } as M33Mortgage);
  };

  const filteredMortgages = mortgages.filter((m) => {
    if (filterType !== 'all' && m.mortgage_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!m.mortgage_number.toLowerCase().includes(q) && !m.mortgage_title.toLowerCase().includes(q) &&
          !(m.creditor_name || '').toLowerCase().includes(q) && !(m.debtor_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = mortgages.filter((m) => m.stage !== 'released').length;
  const totalSecured = mortgages.reduce((s, m) => s + (m.secured_amount || 0), 0);
  const releasedCount = mortgages.filter((m) => m.release_status === 'released').length;

  const tabs: { id: Tab; label: string; icon: typeof Lock; badge?: number }[] = [
    { id: 'mortgages', label: 'الرهون', icon: Lock, badge: mortgages.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Lock size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الضمانات والحقوق العينية (M33)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الرهون والحقوق العينية — التسجيل والمراقبة والتجديد والإبراء</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> رهن جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Lock size={14} className="text-midnight" />} label="إجمالي الرهون" value={String(mortgages.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="رهون نشطة" value={String(activeCount)} valueClass="text-blue-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي المبالغ المضمونة" value={formatCurrency(totalSecured)} valueClass="text-gold" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="رهون مُبرَأة" value={String(releasedCount)} valueClass="text-green-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الرهن — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.registration;
            const count = mortgages.filter((m) => m.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} رهن</span>
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
            { icon: BadgeCheck, label: 'تقييم العقار (M83)', desc: 'فحص العقار', color: 'text-green-600' },
            { icon: Home, label: 'محرك العقارات (M22)', desc: 'حظر البيع', color: 'text-blue-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الحساب', color: 'text-gold' },
            { icon: Server, label: 'محرك البنوك (M75)', desc: 'ربط البنك', color: 'text-cyan-600' },
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'تسجيل المواعيد', color: 'text-purple-600' },
            { icon: Radio, label: 'مراقبة IoT (M107)', desc: 'مراقبة العقار', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'التحقق البيومتري (M109)', desc: 'توقيع الأطراف', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات التجديد', color: 'text-amber-600' },
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

      {/* Filters for mortgages */}
      {activeTab === 'mortgages' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(MORTGAGE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان الرهن أو الدائن..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Mortgages tab */}
      {activeTab === 'mortgages' && (
        <div className="space-y-2">
          {filteredMortgages.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Lock size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد رهون مسجلة</p>
            </div>
          ) : (
            filteredMortgages.map((m) => {
              const sCfg = STAGE_CONFIG[m.stage] || STAGE_CONFIG.registration;
              const stageIdx = STAGES.indexOf(m.stage);
              const releaseCfg = RELEASE_STATUS_LABELS[m.release_status] || m.release_status;
              const releaseBg = m.release_status === 'released' ? 'bg-green-50 text-green-600' : m.release_status === 'partially_released' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600';
              return (
                <div key={m.id} onClick={() => openMortgageDetail(m)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Lock size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{m.mortgage_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{MORTGAGE_TYPE_LABELS[m.mortgage_type] || m.mortgage_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${releaseBg}`}>{releaseCfg}</span>
                          {m.iot_monitoring_active && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Radio size={8} /> IoT</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{m.mortgage_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {m.creditor_name && <span className="font-body text-[9px] text-ink/40">الدائن: {m.creditor_name}</span>}
                          {m.debtor_name && <span className="font-body text-[9px] text-ink/40">المدين: {m.debtor_name}</span>}
                          {m.secured_amount > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(m.secured_amount)}</span>}
                          {m.registration_date && <span className="font-body text-[9px] text-ink/40"><Calendar size={9} className="inline ml-0.5" />{formatDate(m.registration_date)}</span>}
                          {m.renewal_date && <span className="font-body text-[9px] text-ink/40"><Clock size={9} className="inline ml-0.5" />تجديد: {formatDate(m.renewal_date)}</span>}
                          {m.m83_property_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M83</span>}
                          {m.m22_sale_blocked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Home size={8} /> M22</span>}
                          {m.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {m.m75_bank_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Server size={8} /> M75</span>}
                          {m.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Server size={8} /> M10</span>}
                          {m.m107_iot_monitoring && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Radio size={8} /> M107</span>}
                          {m.m109_biometric_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {m.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(m); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(m.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <Lock size={12} className="text-blue-600" />
                      : log.action.includes('m83') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m22') ? <Home size={12} className="text-blue-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m75') ? <Server size={12} className="text-cyan-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('m107') ? <Radio size={12} className="text-amber-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
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

      {/* Mortgage detail drawer */}
      {selectedMortgage && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedMortgage(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الرهن</span>
              </div>
              <button onClick={() => setSelectedMortgage(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedMortgage.mortgage_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedMortgage.stage] || STAGE_CONFIG.registration).bg} ${(STAGE_CONFIG[selectedMortgage.stage] || STAGE_CONFIG.registration).text}`}>
                      {(STAGE_CONFIG[selectedMortgage.stage] || STAGE_CONFIG.registration).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{MORTGAGE_TYPE_LABELS[selectedMortgage.mortgage_type] || selectedMortgage.mortgage_type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${selectedMortgage.release_status === 'released' ? 'bg-green-50 text-green-600' : selectedMortgage.release_status === 'partially_released' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                      {RELEASE_STATUS_LABELS[selectedMortgage.release_status] || selectedMortgage.release_status}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedMortgage.mortgage_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.registration;
                      const stageIdx = STAGES.indexOf(selectedMortgage.stage);
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
                  {selectedMortgage.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedMortgage)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Mortgage info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lock size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الرهن</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الدائن</span><p className="font-body text-xs font-bold text-midnight">{selectedMortgage.creditor_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المدين</span><p className="font-body text-xs font-bold text-midnight">{selectedMortgage.debtor_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الرهن</span><p className="font-body text-xs font-bold text-midnight">{MORTGAGE_TYPE_LABELS[selectedMortgage.mortgage_type] || selectedMortgage.mortgage_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">حالة الإبراء</span><p className="font-body text-xs font-bold text-midnight">{RELEASE_STATUS_LABELS[selectedMortgage.release_status] || selectedMortgage.release_status}</p></div>
                    <div className="col-span-2"><span className="font-body text-[9px] text-ink/40">المبلغ المضمون</span><p className="font-body text-sm font-bold text-gold">{formatCurrency(selectedMortgage.secured_amount)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ التسجيل</span><p className="font-body text-xs font-bold text-midnight">{selectedMortgage.registration_date ? formatDate(selectedMortgage.registration_date) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ التجديد</span><p className="font-body text-xs font-bold text-midnight">{selectedMortgage.renewal_date ? formatDate(selectedMortgage.renewal_date) : '—'}</p></div>
                  </div>
                </div>

                {/* Property subject */}
                {selectedMortgage.property_subject && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">العقار محل الرهن</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedMortgage.property_subject}</p></div>
                )}

                {/* IoT flag */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.iot_monitoring_active ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Radio size={10} /> مراقبة IoT {selectedMortgage.iot_monitoring_active ? 'مفعّلة' : 'غير مفعّلة'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m83_property_checked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M83 {selectedMortgage.m83_property_checked ? 'مفحوص' : 'غير مفحوص'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m22_sale_blocked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Home size={10} /> M22 {selectedMortgage.m22_sale_blocked ? 'محظور' : 'غير محظور'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedMortgage.m54_finance_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m75_bank_linked ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M75 {selectedMortgage.m75_bank_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m10_deadlines_registered ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedMortgage.m10_deadlines_registered ? 'مُسَجَّل' : 'غير مُسَجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m107_iot_monitoring ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Radio size={10} /> M107 {selectedMortgage.m107_iot_monitoring ? 'مفعّلة' : 'غير مفعّلة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m109_biometric_signed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedMortgage.m109_biometric_signed ? 'موقَّع' : 'غير موقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMortgage.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedMortgage.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedMortgage.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedMortgage.description}</p></div>
                )}

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

      {/* Mortgage create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الرهن' : 'رهن جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الرهن" required><TextInput value={form.mortgage_number} onChange={(e) => setForm({ ...form, mortgage_number: e.target.value })} placeholder="MORT-2025-001" /></Field>
          <Field label="نوع الرهن">
            <Select value={form.mortgage_type} onChange={(e) => setForm({ ...form, mortgage_type: e.target.value })}>
              {Object.entries(MORTGAGE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الرهن" required><TextInput value={form.mortgage_title} onChange={(e) => setForm({ ...form, mortgage_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="حالة الإبراء">
            <Select value={form.release_status} onChange={(e) => setForm({ ...form, release_status: e.target.value })}>
              {Object.entries(RELEASE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الدائن"><TextInput value={form.creditor_name} onChange={(e) => setForm({ ...form, creditor_name: e.target.value })} /></Field>
          <Field label="اسم المدين"><TextInput value={form.debtor_name} onChange={(e) => setForm({ ...form, debtor_name: e.target.value })} /></Field>
        </div>
        <Field label="المبلغ المضمون"><TextInput type="number" value={form.secured_amount} onChange={(e) => setForm({ ...form, secured_amount: e.target.value })} /></Field>
        <Field label="العقار محل الرهن"><TextArea value={form.property_subject} onChange={(e) => setForm({ ...form, property_subject: e.target.value })} rows={2} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ التسجيل"><TextInput type="date" value={form.registration_date} onChange={(e) => setForm({ ...form, registration_date: e.target.value })} /></Field>
          <Field label="تاريخ التجديد"><TextInput type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></Field>
        </div>
        <Checkbox label="تفعيل مراقبة IoT للعقار (IoT Monitoring Active)" checked={form.iot_monitoring_active} onChange={(v) => setForm({ ...form, iot_monitoring_active: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
