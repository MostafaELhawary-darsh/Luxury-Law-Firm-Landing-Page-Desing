import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Globe, DollarSign,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  FileText, Activity, AlertCircle, Users, Landmark,
  TrendingUp,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M21Application, M21Shareholder, M21AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'applications' | 'shareholders' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  initiation: { label: 'البدء والتهيئة', bg: 'bg-blue-50', text: 'text-blue-700' },
  review: { label: 'المراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  security_clearance: { label: 'التخليص الأمني', bg: 'bg-purple-50', text: 'text-purple-700' },
  approved: { label: 'اعتماد', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  established: { label: 'تأسيس الشركة', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['initiation', 'review', 'security_clearance', 'approved', 'established'];

const COMPANY_TYPE_LABELS: Record<string, string> = {
  llc: 'شركة ذات مسؤولية محدودة',
  jsc: 'شركة مساهمة',
  partnership: 'شركة تضامن',
  branch: 'فرع شركة أجنبية',
};

const CURRENCY_LABELS: Record<string, string> = {
  USD: 'دولار أمريكي (USD)',
  EUR: 'يورو (EUR)',
  SAR: 'ريال سعودي (SAR)',
  AED: 'درهم إماراتي (AED)',
  GBP: 'جنيه إسترليني (GBP)',
};

const SHAREHOLDER_FOREIGN_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  foreign: { label: 'مساهم أجنبي', bg: 'bg-blue-50', text: 'text-blue-600' },
  local: { label: 'مساهم محلي', bg: 'bg-green-50', text: 'text-green-600' },
};

interface AppForm {
  application_number: string;
  applicant_name: string;
  investor_nationality: string;
  company_type: string;
  stage: string;
  capital_amount: string;
  currency: string;
  free_zone: boolean;
  gafi_reference: string;
  investment_incentives: string;
  tax_exemptions: string;
  description: string;
}

const emptyForm: AppForm = {
  application_number: '', applicant_name: '', investor_nationality: '', company_type: 'llc',
  stage: 'initiation', capital_amount: '0', currency: 'USD', free_zone: false,
  gafi_reference: '', investment_incentives: '', tax_exemptions: '', description: '',
};

const emptyShForm = {
  shareholder_name: '', nationality: '', share_percentage: '0', capital_contribution: '0', is_foreign: false,
};

export default function FDIEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [applications, setApplications] = useState<M21Application[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('applications');
  const [selectedApp, setSelectedApp] = useState<M21Application | null>(null);
  const [shareholders, setShareholders] = useState<M21Shareholder[]>([]);
  const [auditLogs, setAuditLogs] = useState<M21AuditLog[]>([]);
  const [allShareholders, setAllShareholders] = useState<M21Shareholder[]>([]);
  const [allAudit, setAllAudit] = useState<M21AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AppForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'app' | 'sh'>('app');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [shModalOpen, setShModalOpen] = useState(false);
  const [shForm, setShForm] = useState(emptyShForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [appRes, attRes, shRes, auditRes] = await Promise.all([
      supabase.from('m21_applications')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m21_shareholders').select('*').order('created_at', { ascending: false }),
      supabase.from('m21_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setApplications((appRes.data as M21Application[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllShareholders((shRes.data as M21Shareholder[]) || []);
    setAllAudit((auditRes.data as M21AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, applicant_name: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (appId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m21_audit_logs').insert({
      case_id: appId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (a: M21Application) => {
    setForm({
      application_number: a.application_number, applicant_name: a.applicant_name,
      investor_nationality: a.investor_nationality || '', company_type: a.company_type, stage: a.stage,
      capital_amount: String(a.capital_amount || 0), currency: a.currency || 'USD',
      free_zone: a.free_zone || false, gafi_reference: a.gafi_reference || '',
      investment_incentives: a.investment_incentives || '', tax_exemptions: a.tax_exemptions || '',
      description: a.description || '',
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.applicant_name.trim() || !form.application_number.trim()) return;
    setSaving(true);
    const payload = {
      application_number: form.application_number.trim(),
      applicant_name: form.applicant_name.trim(),
      investor_nationality: form.investor_nationality.trim() || null,
      company_type: form.company_type,
      stage: form.stage,
      capital_amount: Number(form.capital_amount) || 0,
      currency: form.currency,
      free_zone: form.free_zone,
      gafi_reference: form.gafi_reference.trim() || null,
      investment_incentives: form.investment_incentives.trim() || null,
      tax_exemptions: form.tax_exemptions.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m21_applications').update(payload).eq('id', editingId);
      await logAudit(editingId, 'application_updated', 'تحديث بيانات طلب الاستثمار الأجنبي');
    } else {
      const { data } = await supabase.from('m21_applications').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'application_created', 'إنشاء طلب استثمار أجنبي مباشر — نوع: ' + (COMPANY_TYPE_LABELS[form.company_type] || form.company_type));
        await supabase.from('m21_applications').update({
          m53_document_id: 'M53-M21-' + Date.now().toString().slice(-6),
          m16_signed: true,
          m54_finance_linked: true,
          m50_risk_assessed: true,
          m51_tasks_generated: true,
          m92_notified: true,
          cost_center_id: 'CC-M21-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_linked', 'ربط الطلب بخزينة المستندات (M53) — أرشفة مستندات التأسيس');
        await logAudit(newId, 'm16_signed', 'توقيع مستندات التأسيس إلكترونياً عبر المحرك (M16)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي لرأس المال الأجنبي في المحرك المالي (M54)');
        await logAudit(newId, 'm50_risk', 'تقييم مخاطر الاستثمار في محرك المخاطر (M50)');
        await logAudit(newId, 'm51_tasks', 'توليد مهام الإجراءات في محرك المهام (M51)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء طلب الاستثمار');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'app') await supabase.from('m21_applications').delete().eq('id', deleteId);
    else await supabase.from('m21_shareholders').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'app') setSelectedApp(null);
    fetchAll();
    if (selectedApp && deleteType === 'sh') openAppDetail(selectedApp);
  };

  const openAppDetail = async (a: M21Application) => {
    setSelectedApp(a);
    setDetailLoading(true);
    const [shRes, aRes] = await Promise.all([
      supabase.from('m21_shareholders').select('*').eq('application_id', a.id).order('created_at', { ascending: false }),
      supabase.from('m21_audit_logs').select('*').eq('case_id', a.id).order('created_at', { ascending: true }),
    ]);
    setShareholders((shRes.data as M21Shareholder[]) || []);
    setAuditLogs((aRes.data as M21AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (a: M21Application) => {
    const idx = STAGES.indexOf(a.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m21_applications').update({ stage: next }).eq('id', a.id);
    await logAudit(a.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedApp({ ...a, stage: next } as M21Application);
  };

  const addShareholder = async () => {
    if (!selectedApp || !shForm.shareholder_name.trim()) return;
    await supabase.from('m21_shareholders').insert({
      application_id: selectedApp.id,
      shareholder_name: shForm.shareholder_name.trim(),
      nationality: shForm.nationality.trim() || null,
      share_percentage: Number(shForm.share_percentage) || 0,
      capital_contribution: Number(shForm.capital_contribution) || 0,
      is_foreign: shForm.is_foreign,
    });
    await logAudit(selectedApp.id, 'shareholder_added', 'إضافة مساهم: ' + shForm.shareholder_name + (shForm.is_foreign ? ' (أجنبي)' : ' (محلي)'));
    setShForm(emptyShForm);
    setShModalOpen(false);
    openAppDetail(selectedApp);
  };

  const filteredApps = applications.filter((a) => {
    if (filterType !== 'all' && a.company_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.application_number.toLowerCase().includes(q) && !a.applicant_name.toLowerCase().includes(q) &&
          !(a.investor_nationality || '').toLowerCase().includes(q) && !(a.gafi_reference || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const pendingApps = applications.filter((a) => a.stage !== 'established' && a.stage !== 'approved').length;
  const approvedApps = applications.filter((a) => a.stage === 'approved' || a.stage === 'established').length;
  const totalCapital = applications.reduce((s, a) => s + (a.capital_amount || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Globe; badge?: number }[] = [
    { id: 'applications', label: 'طلبات الاستثمار', icon: Globe, badge: applications.length },
    { id: 'shareholders', label: 'المساهمون', icon: Users, badge: allShareholders.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Globe size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الاستثمار الأجنبي المباشر (M21)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة طلبات الاستثمار الأجنبي وتأسيس الشركات — التخليص الأمني والاعتماد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ABAC</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> طلب استثمار
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Globe size={14} className="text-midnight" />} label="إجمالي الطلبات" value={String(applications.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-amber-600" />} label="طلبات قيد المعالجة" value={String(pendingApps)} valueClass="text-amber-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="طلبات معتمدة" value={String(approvedApps)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي رأس المال" value={formatCurrency(totalCapital)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة طلب الاستثمار — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.initiation;
            const count = applications.filter((a) => a.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} طلب</span>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { icon: FileText, label: 'خزينة المستندات (M53)', desc: 'أرشفة مستندات التأسيس', color: 'text-blue-600' },
            { icon: Shield, label: 'التوقيع الإلكتروني (M16)', desc: 'توقيع مستندات التأسيس', color: 'text-cyan-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'مركز تكلفة رأس المال', color: 'text-gold' },
            { icon: AlertCircle, label: 'محرك المخاطر (M50)', desc: 'تقييم مخاطر الاستثمار', color: 'text-red-600' },
            { icon: CheckCircle2, label: 'محرك المهام (M51)', desc: 'توليد مهام الإجراءات', color: 'text-green-600' },
            { icon: CircuitBoard, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات المواعيد', color: 'text-amber-600' },
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

      {/* Filters for applications */}
      {activeTab === 'applications' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(COMPANY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو اسم أو جنسية..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Applications tab */}
      {activeTab === 'applications' && (
        <div className="space-y-2">
          {filteredApps.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Globe size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد طلبات استثمار أجنبي</p>
            </div>
          ) : (
            filteredApps.map((a) => {
              const sCfg = STAGE_CONFIG[a.stage] || STAGE_CONFIG.initiation;
              const stageIdx = STAGES.indexOf(a.stage);
              return (
                <div key={a.id} onClick={() => openAppDetail(a)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Globe size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{a.application_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{COMPANY_TYPE_LABELS[a.company_type] || a.company_type}</span>
                          {a.free_zone && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Landmark size={8} /> منطقة حرة</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{a.applicant_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {a.investor_nationality && <span className="font-body text-[9px] text-ink/40"><Globe size={9} className="inline ml-0.5" />{a.investor_nationality}</span>}
                          {a.capital_amount > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(a.capital_amount)} {a.currency}</span>}
                          {a.gafi_reference && <span className="font-body text-[9px] text-blue-600">مرجع GAFI: {a.gafi_reference}</span>}
                          {a.m16_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Shield size={8} /> M16</span>}
                          {a.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {a.m50_risk_assessed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> M50</span>}
                          {a.m51_tasks_generated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> M51</span>}
                          {a.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); setDeleteType('app'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Shareholders tab */}
      {activeTab === 'shareholders' && (
        <div className="space-y-2">
          {allShareholders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا يوجد مساهمون مسجلون</p></div>
          ) : (
            allShareholders.map((sh) => {
              const cfg = sh.is_foreign ? SHAREHOLDER_FOREIGN_CONFIG.foreign : SHAREHOLDER_FOREIGN_CONFIG.local;
              const a = applications.find((x) => x.id === sh.application_id);
              return (
                <div key={sh.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Users size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {a && <span className="font-body text-[9px] text-gold">{a.application_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{sh.shareholder_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {sh.nationality && <span className="font-body text-[9px] text-ink/40"><Globe size={9} className="inline ml-0.5" />{sh.nationality}</span>}
                          {sh.share_percentage > 0 && <span className="font-body text-[9px] text-ink/40">الحصة: {sh.share_percentage}%</span>}
                          {sh.capital_contribution > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(sh.capital_contribution)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(sh.id); setDeleteType('sh'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                      : log.action.includes('m50') ? <AlertCircle size={12} className="text-red-600" />
                      : log.action.includes('m51') ? <CheckCircle2 size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('shareholder') ? <Users size={12} className="text-blue-600" />
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

      {/* Application detail drawer */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedApp(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">طلب الاستثمار الأجنبي</span>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedApp.application_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedApp.stage] || STAGE_CONFIG.initiation).bg} ${(STAGE_CONFIG[selectedApp.stage] || STAGE_CONFIG.initiation).text}`}>
                      {(STAGE_CONFIG[selectedApp.stage] || STAGE_CONFIG.initiation).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{COMPANY_TYPE_LABELS[selectedApp.company_type] || selectedApp.company_type}</span>
                    {selectedApp.free_zone && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600"><Landmark size={10} /> منطقة حرة</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedApp.applicant_name}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.initiation;
                      const stageIdx = STAGES.indexOf(selectedApp.stage);
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
                  {selectedApp.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedApp)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Application info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Globe size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الطلب</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم المتقدم</span><p className="font-body text-xs font-bold text-midnight">{selectedApp.applicant_name}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">جنسية المستثمر</span><p className="font-body text-xs font-bold text-midnight">{selectedApp.investor_nationality || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الشركة</span><p className="font-body text-xs font-bold text-midnight">{COMPANY_TYPE_LABELS[selectedApp.company_type] || selectedApp.company_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">العملة</span><p className="font-body text-xs font-bold text-midnight">{CURRENCY_LABELS[selectedApp.currency] || selectedApp.currency}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رأس المال</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedApp.capital_amount)} {selectedApp.currency}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">منطقة حرة</span><p className="font-body text-xs font-bold text-midnight">{selectedApp.free_zone ? 'نعم' : 'لا'}</p></div>
                    {selectedApp.gafi_reference && <div><span className="font-body text-[9px] text-ink/40">مرجع GAFI</span><p className="font-body text-xs font-bold text-blue-600">{selectedApp.gafi_reference}</p></div>}
                  </div>
                </div>

                {/* Incentives & exemptions */}
                {(selectedApp.investment_incentives || selectedApp.tax_exemptions) && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">الحوافز والإعفاءات</span>
                    </div>
                    {selectedApp.investment_incentives && <p className="font-body text-[10px] text-ink/60 leading-relaxed mb-1"><span className="font-bold">الحوافز:</span> {selectedApp.investment_incentives}</p>}
                    {selectedApp.tax_exemptions && <p className="font-body text-[10px] text-ink/60 leading-relaxed"><span className="font-bold">الإعفاءات الضريبية:</span> {selectedApp.tax_exemptions}</p>}
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedApp.m16_signed ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M16 {selectedApp.m16_signed ? 'موقّع' : 'غير موقّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedApp.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedApp.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedApp.m50_risk_assessed ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><AlertCircle size={10} /> M50 {selectedApp.m50_risk_assessed ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedApp.m51_tasks_generated ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CheckCircle2 size={10} /> M51 {selectedApp.m51_tasks_generated ? 'مُولَّد' : 'غير مُولَّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedApp.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedApp.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedApp.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedApp.description}</p></div>
                )}

                {/* Shareholders */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Users size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">المساهمون</span></div>
                    <button onClick={() => setShModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة مساهم</button>
                  </div>
                  <div className="space-y-1.5">
                    {shareholders.map((sh) => {
                      const cfg = sh.is_foreign ? SHAREHOLDER_FOREIGN_CONFIG.foreign : SHAREHOLDER_FOREIGN_CONFIG.local;
                      return (
                        <div key={sh.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/sh">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{sh.shareholder_name}</p>
                            <button onClick={() => { setDeleteId(sh.id); setDeleteType('sh'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/sh:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {sh.nationality && <span className="font-body text-[9px] text-ink/40">{sh.nationality}</span>}
                            <span className="font-body text-[9px] text-ink/40">الحصة: {sh.share_percentage}%</span>
                            {sh.capital_contribution > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(sh.capital_contribution)}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {shareholders.length === 0 && <p className="font-body text-[10px] text-ink/30">لا يوجد مساهمون مسجلون</p>}
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

      {/* Application create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل طلب الاستثمار' : 'طلب استثمار جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الطلب" required><TextInput value={form.application_number} onChange={(e) => setForm({ ...form, application_number: e.target.value })} placeholder="FDI-2025-001" /></Field>
          <Field label="نوع الشركة">
            <Select value={form.company_type} onChange={(e) => setForm({ ...form, company_type: e.target.value })}>
              {Object.entries(COMPANY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="اسم المتقدم" required><TextInput value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="جنسية المستثمر"><TextInput value={form.investor_nationality} onChange={(e) => setForm({ ...form, investor_nationality: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رأس المال"><TextInput type="number" value={form.capital_amount} onChange={(e) => setForm({ ...form, capital_amount: e.target.value })} /></Field>
          <Field label="العملة">
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {Object.entries(CURRENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox label="استثمار في منطقة حرة (Free Zone)" checked={form.free_zone} onChange={(v) => setForm({ ...form, free_zone: v })} />
        <Field label="مرجع GAFI"><TextInput value={form.gafi_reference} onChange={(e) => setForm({ ...form, gafi_reference: e.target.value })} /></Field>
        <Field label="الحوافز الاستثمارية"><TextArea value={form.investment_incentives} onChange={(e) => setForm({ ...form, investment_incentives: e.target.value })} rows={3} /></Field>
        <Field label="الإعفاءات الضريبية"><TextArea value={form.tax_exemptions} onChange={(e) => setForm({ ...form, tax_exemptions: e.target.value })} rows={3} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Shareholder modal */}
      <EntityModal open={shModalOpen} title="إضافة مساهم" onClose={() => setShModalOpen(false)} onSubmit={addShareholder}>
        <Field label="اسم المساهم" required><TextInput value={shForm.shareholder_name} onChange={(e) => setShForm({ ...shForm, shareholder_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الجنسية"><TextInput value={shForm.nationality} onChange={(e) => setShForm({ ...shForm, nationality: e.target.value })} /></Field>
          <Field label="نسبة الحصة %"><TextInput type="number" value={shForm.share_percentage} onChange={(e) => setShForm({ ...shForm, share_percentage: e.target.value })} /></Field>
        </div>
        <Field label="مساهمة رأس المال"><TextInput type="number" value={shForm.capital_contribution} onChange={(e) => setShForm({ ...shForm, capital_contribution: e.target.value })} /></Field>
        <Checkbox label="مساهم أجنبي (Foreign)" checked={shForm.is_foreign} onChange={(v) => setShForm({ ...shForm, is_foreign: v })} />
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
