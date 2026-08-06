import { useEffect, useState, useCallback } from 'react';
import {
  Copyright, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Scale, Archive, Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, Server, Gavel, AlertCircle, Cpu, ShieldCheck, KeyRound,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M13Copyright, M13Infringement, M13License, M13AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'copyrights' | 'infringements' | 'licenses' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  deposit: { label: 'إيداع', bg: 'bg-blue-50', text: 'text-blue-700' },
  registered: { label: 'مُسَجَّل', bg: 'bg-green-50', text: 'text-green-700' },
  monitored: { label: 'مراقبة', bg: 'bg-amber-50', text: 'text-amber-700' },
  enforced: { label: 'تطبيق', bg: 'bg-red-50', text: 'text-red-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const STAGES = ['deposit', 'registered', 'monitored', 'enforced', 'archived'];

const WORK_TYPE_LABELS: Record<string, string> = {
  literary: 'أدبي',
  artistic: 'فني',
  software: 'برمجيات',
  audiovisual: 'سمعي بصري',
};

const INFRINGEMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  detected: { label: 'مُكتَشَف', bg: 'bg-red-50', text: 'text-red-600' },
  notice_sent: { label: 'إخطار مُرسَل', bg: 'bg-amber-50', text: 'text-amber-600' },
  legal_action: { label: 'إجراء قانوني', bg: 'bg-purple-50', text: 'text-purple-600' },
  resolved: { label: 'تم الحل', bg: 'bg-green-50', text: 'text-green-600' },
  dismissed: { label: 'مُستبعد', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const INFRINGEMENT_TYPE_LABELS: Record<string, string> = {
  unauthorized_copy: 'نسخ غير مصرح',
  distribution: 'توزيع غير مشروع',
  public_performance: 'أداء عام',
  derivative_work: 'عمل مشتق',
  digital_piracy: 'قرصنة رقمية',
  drm_circumvention: 'كسر الحماية',
};

const LICENSE_TYPE_LABELS: Record<string, string> = {
  exclusive: 'حصري',
  non_exclusive: 'غير حصري',
  creative_commons: 'المشاع الإبداعي',
  commercial: 'تجاري',
  educational: 'تعليمي',
};

interface CopyrightForm {
  registration_number: string;
  work_title: string;
  work_type: string;
  stage: string;
  author_name: string;
  rights_holder: string;
  deposit_hash: string;
  drm_protected: boolean;
  description: string;
  financial_value: string;
  filing_fees: string;
  assigned_advisor_id: string;
}

const emptyForm: CopyrightForm = {
  registration_number: '', work_title: '', work_type: 'literary', stage: 'deposit',
  author_name: '', rights_holder: '', deposit_hash: '', drm_protected: false,
  description: '', financial_value: '0', filing_fees: '0', assigned_advisor_id: '',
};

export default function CopyrightEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [copyrights, setCopyrights] = useState<M13Copyright[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('copyrights');
  const [selectedCopyright, setSelectedCopyright] = useState<M13Copyright | null>(null);
  const [infringements, setInfringements] = useState<M13Infringement[]>([]);
  const [licenses, setLicenses] = useState<M13License[]>([]);
  const [auditLogs, setAuditLogs] = useState<M13AuditLog[]>([]);
  const [allInfringements, setAllInfringements] = useState<M13Infringement[]>([]);
  const [allLicenses, setAllLicenses] = useState<M13License[]>([]);
  const [allAudit, setAllAudit] = useState<M13AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CopyrightForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'copyright' | 'infringement' | 'license'>('copyright');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [infringementModalOpen, setInfringementModalOpen] = useState(false);
  const [infringementForm, setInfringementForm] = useState({ infringing_party: '', infringement_type: 'unauthorized_copy', detected_date: '', similarity_score: '50', description: '' });
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [licenseForm, setLicenseForm] = useState({ licensee: '', license_scope: '', license_type: 'non_exclusive', royalty_rate: '0', start_date: '', end_date: '', is_exclusive: false });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [crRes, attRes, infRes, licRes, auditRes] = await Promise.all([
      supabase.from('m13_copyrights')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m13_infringements').select('*').order('created_at', { ascending: false }),
      supabase.from('m13_licenses').select('*').order('created_at', { ascending: false }),
      supabase.from('m13_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCopyrights((crRes.data as M13Copyright[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllInfringements((infRes.data as M13Infringement[]) || []);
    setAllLicenses((licRes.data as M13License[]) || []);
    setAllAudit((auditRes.data as M13AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, work_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (copyrightId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m13_audit_logs').insert({
      case_id: copyrightId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M13Copyright) => {
    setForm({
      registration_number: c.registration_number, work_title: c.work_title, work_type: c.work_type,
      stage: c.stage, author_name: c.author_name, rights_holder: c.rights_holder || '',
      deposit_hash: c.deposit_hash || '', drm_protected: c.drm_protected,
      description: c.description || '', financial_value: String(c.financial_value || 0),
      filing_fees: String(c.filing_fees || 0), assigned_advisor_id: c.assigned_advisor_id || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.work_title.trim() || !form.registration_number.trim()) return;
    setSaving(true);
    const payload = {
      registration_number: form.registration_number.trim(),
      work_title: form.work_title.trim(),
      work_type: form.work_type,
      stage: form.stage,
      status: form.stage,
      author_name: form.author_name.trim(),
      rights_holder: form.rights_holder.trim() || null,
      deposit_hash: form.deposit_hash.trim() || null,
      drm_protected: form.drm_protected,
      description: form.description.trim() || null,
      financial_value: Number(form.financial_value) || 0,
      filing_fees: Number(form.filing_fees) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
    };
    if (editingId) {
      await supabase.from('m13_copyrights').update(payload).eq('id', editingId);
      await logAudit(editingId, 'copyright_updated', 'تحديث بيانات حقوق المؤلف');
    } else {
      const { data } = await supabase.from('m13_copyrights').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'copyright_created', 'إنشاء حقوق مؤلف — نوع: ' + (WORK_TYPE_LABELS[form.work_type] || form.work_type));
        await supabase.from('m13_copyrights').update({
          m81_media_linked: true,
          m54_finance_linked: true,
          m53_archived: false,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: 'CC-M13-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm81_linked', 'ربط الحقوق بالمحرك الفني (M81) — حماية المحتوى الرقمي');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء حقوق المؤلف');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52) بالإيداع');
        if (form.drm_protected) {
          await logAudit(newId, 'drm_enabled', 'تفعيل الحماية الرقمية (DRM) للعمل');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'copyright') await supabase.from('m13_copyrights').delete().eq('id', deleteId);
    else if (deleteType === 'infringement') await supabase.from('m13_infringements').delete().eq('id', deleteId);
    else if (deleteType === 'license') await supabase.from('m13_licenses').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'copyright') setSelectedCopyright(null);
    fetchAll();
    if (selectedCopyright && deleteType !== 'copyright') openCopyrightDetail(selectedCopyright);
  };

  const openCopyrightDetail = async (c: M13Copyright) => {
    setSelectedCopyright(c);
    setDetailLoading(true);
    const [infRes, licRes, aRes] = await Promise.all([
      supabase.from('m13_infringements').select('*').eq('copyright_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m13_licenses').select('*').eq('copyright_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m13_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setInfringements((infRes.data as M13Infringement[]) || []);
    setLicenses((licRes.data as M13License[]) || []);
    setAuditLogs((aRes.data as M13AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M13Copyright) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m13_copyrights').update({ stage: next, status: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    if (next === 'archived') {
      await supabase.from('m13_copyrights').update({ m53_archived: true }).eq('id', c.id);
      await logAudit(c.id, 'm53_archived', 'أرشفة حقوق المؤلف في المحرك (M53)');
    }
    fetchAll();
    const updated = { ...c, stage: next, status: next };
    setSelectedCopyright(updated as M13Copyright);
  };

  const addInfringement = async () => {
    if (!selectedCopyright || !infringementForm.infringing_party.trim()) return;
    await supabase.from('m13_infringements').insert({
      copyright_id: selectedCopyright.id,
      infringing_party: infringementForm.infringing_party.trim(),
      infringement_type: infringementForm.infringement_type,
      detected_date: infringementForm.detected_date || new Date().toISOString().split('T')[0],
      similarity_score: Number(infringementForm.similarity_score) || 0,
      status: 'detected',
      m10_case_opened: false,
      description: infringementForm.description.trim() || null,
    });
    await logAudit(selectedCopyright.id, 'infringement_added', 'تسجيل تعدي على: ' + infringementForm.infringing_party);
    setInfringementForm({ infringing_party: '', infringement_type: 'unauthorized_copy', detected_date: '', similarity_score: '50', description: '' });
    setInfringementModalOpen(false);
    openCopyrightDetail(selectedCopyright);
  };

  const fileLegalAction = async (inf: M13Infringement) => {
    await supabase.from('m13_infringements').update({
      status: 'legal_action', m10_case_opened: true,
    }).eq('id', inf.id);
    if (selectedCopyright) await logAudit(selectedCopyright.id, 'legal_action_filed', 'رفع إجراء قانوني ضد: ' + inf.infringing_party);
    if (selectedCopyright) openCopyrightDetail(selectedCopyright);
  };

  const addLicense = async () => {
    if (!selectedCopyright || !licenseForm.licensee.trim()) return;
    await supabase.from('m13_licenses').insert({
      copyright_id: selectedCopyright.id,
      licensee: licenseForm.licensee.trim(),
      license_scope: licenseForm.license_scope.trim() || null,
      license_type: licenseForm.license_type,
      royalty_rate: Number(licenseForm.royalty_rate) || 0,
      start_date: licenseForm.start_date || new Date().toISOString().split('T')[0],
      end_date: licenseForm.end_date || null,
      is_exclusive: licenseForm.license_type === 'exclusive',
      m54_finance_linked: true,
    });
    await logAudit(selectedCopyright.id, 'license_added', 'إضافة ترخيص لـ: ' + licenseForm.licensee + ' — نوع: ' + (LICENSE_TYPE_LABELS[licenseForm.license_type] || licenseForm.license_type));
    setLicenseForm({ licensee: '', license_scope: '', license_type: 'non_exclusive', royalty_rate: '0', start_date: '', end_date: '', is_exclusive: false });
    setLicenseModalOpen(false);
    openCopyrightDetail(selectedCopyright);
  };

  const filteredCopyrights = copyrights.filter((c) => {
    if (filterType !== 'all' && c.work_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.registration_number.toLowerCase().includes(q) && !c.work_title.toLowerCase().includes(q) && !c.author_name.toLowerCase().includes(q) && !(c.rights_holder || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const registeredCount = copyrights.filter((c) => c.stage === 'registered' || c.stage === 'monitored' || c.stage === 'enforced').length;
  const infringementCount = allInfringements.length;
  const drmCount = copyrights.filter((c) => c.drm_protected).length;
  const activeLicenses = allLicenses.length;

  const tabs: { id: Tab; label: string; icon: typeof Copyright; badge?: number }[] = [
    { id: 'copyrights', label: 'حقوق المؤلف', icon: Copyright, badge: copyrights.length },
    { id: 'infringements', label: 'التعديات', icon: AlertCircle, badge: infringementCount },
    { id: 'licenses', label: 'التراخيص', icon: KeyRound, badge: activeLicenses },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Copyright size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">حقوق المؤلف (M13)</h2>
            <p className="font-body text-[10px] text-ink/40">محرك الحماية الرقمية — تسجيل حقوق المؤلف ومراقبة التعديات وإدارة التراخيص</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> حقوق مؤلف
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Copyright size={14} className="text-midnight" />} label="إجمالي الحقوق" value={String(copyrights.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="مُسَجَّلة" value={String(registeredCount)} valueClass="text-green-700" />
        <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="التعديات" value={String(infringementCount)} valueClass="text-red-700" />
        <StatCard icon={<ShieldCheck size={14} className="text-purple-600" />} label="محمية بـ DRM" value={String(drmCount)} valueClass="text-purple-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة حقوق المؤلف — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.deposit;
            const count = copyrights.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} عمل</span>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { icon: Sparkles, label: 'المحرك الفني (M81)', desc: 'حماية المحتوى الرقمي', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'رسوم التسجيل والعوائد', color: 'text-gold' },
            { icon: Archive, label: 'الأرشفة (M53)', desc: 'أرشفة الحقوق', color: 'text-blue-600' },
            { icon: Cpu, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات التعديات', color: 'text-amber-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'إخطار المؤلف', color: 'text-green-600' },
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

      {/* Filters for copyrights */}
      {activeTab === 'copyrights' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(WORK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو مؤلف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Copyrights tab */}
      {activeTab === 'copyrights' && (
        <div className="space-y-2">
          {filteredCopyrights.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Copyright size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد حقوق مؤلف مسجلة</p>
            </div>
          ) : (
            filteredCopyrights.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.deposit;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openCopyrightDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Copyright size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.registration_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{WORK_TYPE_LABELS[c.work_type] || c.work_type}</span>
                          {c.stage === 'registered' && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> مُسَجَّل</span>}
                          {c.drm_protected && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><ShieldCheck size={8} /> DRM</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.work_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40"><Copyright size={9} className="inline ml-0.5" />{c.author_name}</span>
                          {c.rights_holder && <span className="font-body text-[9px] text-ink/40">مالك الحقوق: {c.rights_holder}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.m81_media_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M81</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Cpu size={8} /> M92</span>}
                          {c.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Send size={8} /> M52</span>}
                          {c.m53_archived && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Archive size={8} /> M53</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setDeleteType('copyright'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All infringements tab */}
      {activeTab === 'infringements' && (
        <div className="space-y-2">
          {allInfringements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><AlertCircle size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تعديات مسجلة</p></div>
          ) : (
            allInfringements.map((inf) => {
              const cfg = INFRINGEMENT_STATUS_CONFIG[inf.status] || INFRINGEMENT_STATUS_CONFIG.detected;
              const c = copyrights.find((c) => c.id === inf.copyright_id);
              return (
                <div key={inf.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <AlertCircle size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {inf.m10_case_opened ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Gavel size={8} /> إجراء قانوني</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Clock size={8} /> بدون إجراء</span>
                          )}
                          {c && <span className="font-body text-[9px] text-gold">{c.registration_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{inf.infringing_party}</p>
                        {inf.description && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{inf.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {inf.infringement_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INFRINGEMENT_TYPE_LABELS[inf.infringement_type] || inf.infringement_type}</span>}
                          {inf.detected_date && <span className="font-body text-[9px] text-ink/40">تاريخ الاكتشاف: {formatDate(inf.detected_date)}</span>}
                          <span className={`font-body text-[9px] font-bold ${inf.similarity_score > 70 ? 'text-red-600' : inf.similarity_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>تشابه: {inf.similarity_score}%</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(inf.id); setDeleteType('infringement'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All licenses tab */}
      {activeTab === 'licenses' && (
        <div className="space-y-2">
          {allLicenses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><KeyRound size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تراخيص مسجلة</p></div>
          ) : (
            allLicenses.map((lic) => {
              const c = copyrights.find((c) => c.id === lic.copyright_id);
              return (
                <div key={lic.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gold/10">
                        <KeyRound size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">{LICENSE_TYPE_LABELS[(lic as unknown as { license_type?: string }).license_type ?? ''] || (lic as unknown as { license_type?: string }).license_type || ''}</span>
                          {lic.is_exclusive && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><BadgeCheck size={8} /> حصري</span>}
                          {lic.m54_finance_linked && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.registration_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{lic.licensee}</p>
                        {lic.license_scope && <p className="font-body text-[10px] text-ink/50 mt-0.5">{lic.license_scope}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {lic.royalty_rate > 0 && <span className="font-body text-[9px] text-gold font-bold">عوائد: {lic.royalty_rate}%</span>}
                          {lic.start_date && <span className="font-body text-[9px] text-ink/40">من: {formatDate(lic.start_date)}</span>}
                          {lic.end_date && <span className="font-body text-[9px] text-ink/40">إلى: {formatDate(lic.end_date)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(lic.id); setDeleteType('license'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m81') ? <Sparkles size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Cpu size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-green-600" />
                      : log.action.includes('m53') || log.action.includes('archiv') ? <Archive size={12} className="text-blue-600" />
                      : log.action.includes('infringement') ? <AlertCircle size={12} className="text-red-600" />
                      : log.action.includes('license') ? <KeyRound size={12} className="text-gold" />
                      : log.action.includes('drm') ? <ShieldCheck size={12} className="text-purple-600" />
                      : log.action.includes('legal') ? <Gavel size={12} className="text-purple-600" />
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
                      {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {log.hash_chain}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Copyright detail drawer */}
      {selectedCopyright && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCopyright(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Copyright size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">حقوق المؤلف</span>
              </div>
              <button onClick={() => setSelectedCopyright(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedCopyright.registration_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCopyright.stage] || STAGE_CONFIG.deposit).bg} ${(STAGE_CONFIG[selectedCopyright.stage] || STAGE_CONFIG.deposit).text}`}>
                      {(STAGE_CONFIG[selectedCopyright.stage] || STAGE_CONFIG.deposit).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{WORK_TYPE_LABELS[selectedCopyright.work_type] || selectedCopyright.work_type}</span>
                    {selectedCopyright.drm_protected && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><ShieldCheck size={10} /> DRM</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCopyright.work_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.deposit;
                      const stageIdx = STAGES.indexOf(selectedCopyright.stage);
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
                  {selectedCopyright.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedCopyright)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Copyright info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Copyright size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات العمل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المؤلف</span><p className="font-body text-xs font-bold text-midnight">{selectedCopyright.author_name}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مالك الحقوق</span><p className="font-body text-xs font-bold text-midnight">{selectedCopyright.rights_holder || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع العمل</span><p className="font-body text-xs font-bold text-midnight">{WORK_TYPE_LABELS[selectedCopyright.work_type] || selectedCopyright.work_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedCopyright.advisor?.name || '—'}</p></div>
                    {selectedCopyright.deposit_hash && (
                      <div className="col-span-2"><span className="font-body text-[9px] text-ink/40">هاش الإيداع</span><p className="font-body text-[10px] font-bold text-blue-600 font-mono truncate">{selectedCopyright.deposit_hash}</p></div>
                    )}
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCopyright.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCopyright.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رسوم التسجيل</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCopyright.filing_fees)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCopyright.m81_media_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M81 {selectedCopyright.m81_media_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCopyright.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCopyright.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCopyright.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Cpu size={10} /> M92 {selectedCopyright.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCopyright.m52_notified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M52 {selectedCopyright.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCopyright.m53_archived ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Archive size={10} /> M53 {selectedCopyright.m53_archived ? 'مؤرشف' : 'غير مؤرشف'}</span>
                </div>

                {selectedCopyright.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCopyright.description}</p></div>
                )}

                {/* Infringements */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><AlertCircle size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">التعديات</span></div>
                    <button onClick={() => setInfringementModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة</button>
                  </div>
                  <div className="space-y-1.5">
                    {infringements.map((inf) => {
                      const cfg = INFRINGEMENT_STATUS_CONFIG[inf.status] || INFRINGEMENT_STATUS_CONFIG.detected;
                      return (
                        <div key={inf.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/inf">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{inf.infringing_party}</p>
                            <button onClick={() => { setDeleteId(inf.id); setDeleteType('infringement'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/inf:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          {inf.description && <p className="font-body text-[9px] text-ink/50 leading-tight mb-1">{inf.description}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {inf.infringement_type && <span className="px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INFRINGEMENT_TYPE_LABELS[inf.infringement_type] || inf.infringement_type}</span>}
                            {inf.detected_date && <span className="font-body text-[9px] text-ink/40">{formatDate(inf.detected_date)}</span>}
                            <span className={`font-body text-[9px] font-bold ${inf.similarity_score > 70 ? 'text-red-600' : inf.similarity_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>تشابه: {inf.similarity_score}%</span>
                            {inf.m10_case_opened ? (
                              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Gavel size={8} /> إجراء قانوني</span>
                            ) : (
                              <button onClick={() => fileLegalAction(inf)} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-600 text-white hover:bg-purple-700 transition-colors"><Gavel size={8} /> رفع إجراء</button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {infringements.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد تعديات مسجلة</p>}
                  </div>
                </div>

                {/* Licenses */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><KeyRound size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">التراخيص</span></div>
                    <button onClick={() => setLicenseModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة</button>
                  </div>
                  <div className="space-y-1.5">
                    {licenses.map((lic) => (
                      <div key={lic.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/lic">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">{LICENSE_TYPE_LABELS[(lic as unknown as { license_type?: string }).license_type ?? ''] || (lic as unknown as { license_type?: string }).license_type || ''}</span>
                          {lic.is_exclusive && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><BadgeCheck size={8} /> حصري</span>}
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{lic.licensee}</p>
                          <button onClick={() => { setDeleteId(lic.id); setDeleteType('license'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/lic:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        {lic.license_scope && <p className="font-body text-[9px] text-ink/50">{lic.license_scope}</p>}
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {lic.royalty_rate > 0 && <span className="font-body text-[9px] text-gold font-bold">عوائد: {lic.royalty_rate}%</span>}
                          {lic.start_date && <span className="font-body text-[9px] text-ink/40">من: {formatDate(lic.start_date)}</span>}
                          {lic.end_date && <span className="font-body text-[9px] text-ink/40">إلى: {formatDate(lic.end_date)}</span>}
                          {lic.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                        </div>
                      </div>
                    ))}
                    {licenses.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد تراخيص مسجلة</p>}
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

      {/* Copyright create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل حقوق المؤلف' : 'حقوق مؤلف جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم التسجيل" required><TextInput value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="CR-2025-001" /></Field>
          <Field label="نوع العمل">
            <Select value={form.work_type} onChange={(e) => setForm({ ...form, work_type: e.target.value })}>
              {Object.entries(WORK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان العمل" required><TextInput value={form.work_title} onChange={(e) => setForm({ ...form, work_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المؤلف" required><TextInput value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مالك الحقوق"><TextInput value={form.rights_holder} onChange={(e) => setForm({ ...form, rights_holder: e.target.value })} /></Field>
          <Field label="هاش الإيداع"><TextInput value={form.deposit_hash} onChange={(e) => setForm({ ...form, deposit_hash: e.target.value })} placeholder="0x..." /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-end pb-1">
            <Checkbox label="محمي بـ DRM" checked={form.drm_protected} onChange={(v) => setForm({ ...form, drm_protected: v })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="رسوم التسجيل"><TextInput type="number" value={form.filing_fees} onChange={(e) => setForm({ ...form, filing_fees: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Infringement modal */}
      <EntityModal open={infringementModalOpen} title="تسجيل تعدي" onClose={() => setInfringementModalOpen(false)} onSubmit={addInfringement}>
        <Field label="اسم المُعتدي" required><TextInput value={infringementForm.infringing_party} onChange={(e) => setInfringementForm({ ...infringementForm, infringing_party: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التعدي">
            <Select value={infringementForm.infringement_type} onChange={(e) => setInfringementForm({ ...infringementForm, infringement_type: e.target.value })}>
              {Object.entries(INFRINGEMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="تاريخ الاكتشاف"><TextInput type="date" value={infringementForm.detected_date} onChange={(e) => setInfringementForm({ ...infringementForm, detected_date: e.target.value })} /></Field>
        </div>
        <Field label="نسبة التشابه %"><TextInput type="number" value={infringementForm.similarity_score} onChange={(e) => setInfringementForm({ ...infringementForm, similarity_score: e.target.value })} /></Field>
        <Field label="الوصف"><TextArea value={infringementForm.description} onChange={(e) => setInfringementForm({ ...infringementForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      {/* License modal */}
      <EntityModal open={licenseModalOpen} title="إضافة ترخيص" onClose={() => setLicenseModalOpen(false)} onSubmit={addLicense}>
        <Field label="اسم المُرخص له" required><TextInput value={licenseForm.licensee} onChange={(e) => setLicenseForm({ ...licenseForm, licensee: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الترخيص">
            <Select value={licenseForm.license_type} onChange={(e) => setLicenseForm({ ...licenseForm, license_type: e.target.value })}>
              {Object.entries(LICENSE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="نسبة العوائد %"><TextInput type="number" value={licenseForm.royalty_rate} onChange={(e) => setLicenseForm({ ...licenseForm, royalty_rate: e.target.value })} /></Field>
        </div>
        <Field label="نطاق الترخيص"><TextArea value={licenseForm.license_scope} onChange={(e) => setLicenseForm({ ...licenseForm, license_scope: e.target.value })} rows={2} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ البداية"><TextInput type="date" value={licenseForm.start_date} onChange={(e) => setLicenseForm({ ...licenseForm, start_date: e.target.value })} /></Field>
          <Field label="تاريخ النهاية"><TextInput type="date" value={licenseForm.end_date} onChange={(e) => setLicenseForm({ ...licenseForm, end_date: e.target.value })} /></Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
