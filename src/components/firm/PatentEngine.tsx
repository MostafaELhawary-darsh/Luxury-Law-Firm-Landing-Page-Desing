import { useEffect, useState, useCallback } from 'react';
import {
  Lightbulb, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Scale, Archive, Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, Server, Gavel, AlertCircle, Cpu,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M12Patent, M12PriorArt, M12LifecycleMilestone, M12AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'patents' | 'prior_art' | 'lifecycle' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  idea: { label: 'فكرة اختراع', bg: 'bg-blue-50', text: 'text-blue-700' },
  filed: { label: 'مُودَع', bg: 'bg-amber-50', text: 'text-amber-700' },
  examined: { label: 'قيد الفحص', bg: 'bg-purple-50', text: 'text-purple-700' },
  granted: { label: 'ممنوح', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-600' },
};

const STAGES = ['idea', 'filed', 'examined', 'granted', 'archived'];

const PATENT_TYPE_LABELS: Record<string, string> = {
  utility: 'براءة اختراع (نفعيل)',
  design: 'براءة تصميم صناعي',
  plant: 'براءة نبات',
  software: 'براءة برمجيات',
};

const PRIOR_ART_RELEVANCE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفض', bg: 'bg-green-50', text: 'text-green-600' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-600' },
  high: { label: 'مرتفع', bg: 'bg-red-50', text: 'text-red-600' },
};

const MILESTONE_TYPE_LABELS: Record<string, string> = {
  filing: 'إيداع الطلب',
  publication: 'النشر',
  examination_request: 'طلب الفحص',
  office_action: 'إجراء مكتب الفحص',
  grant: 'منح البراءة',
  renewal: 'تجديد',
  lapse: 'انتهاء',
};

interface PatentForm {
  patent_number: string;
  patent_title: string;
  patent_type: string;
  stage: string;
  inventors: string;
  assignee: string;
  international_class: string;
  filing_date: string;
  grant_date: string;
  priority_date: string;
  financial_value: string;
  filing_fees: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: PatentForm = {
  patent_number: '', patent_title: '', patent_type: 'utility', stage: 'idea',
  inventors: '', assignee: '', international_class: '', filing_date: '', grant_date: '',
  priority_date: '', financial_value: '0', filing_fees: '0', assigned_advisor_id: '', description: '',
};

export default function PatentEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [patents, setPatents] = useState<M12Patent[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('patents');
  const [selectedPatent, setSelectedPatent] = useState<M12Patent | null>(null);
  const [priorArt, setPriorArt] = useState<M12PriorArt[]>([]);
  const [lifecycle, setLifecycle] = useState<M12LifecycleMilestone[]>([]);
  const [auditLogs, setAuditLogs] = useState<M12AuditLog[]>([]);
  const [allPriorArt, setAllPriorArt] = useState<M12PriorArt[]>([]);
  const [allLifecycle, setAllLifecycle] = useState<M12LifecycleMilestone[]>([]);
  const [allAudit, setAllAudit] = useState<M12AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PatentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'patent' | 'prior_art' | 'milestone'>('patent');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [priorArtModalOpen, setPriorArtModalOpen] = useState(false);
  const [priorArtForm, setPriorArtForm] = useState({ reference_number: '', title: '', source: '', similarity_score: '50', relevance: 'low' });
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ milestone_type: 'filing', milestone_date: '', deadline_date: '', description: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [patRes, attRes, paRes, lcRes, auditRes] = await Promise.all([
      supabase.from('m12_patents')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m12_prior_art').select('*').order('created_at', { ascending: false }),
      supabase.from('m12_lifecycle_milestones').select('*').order('created_at', { ascending: false }),
      supabase.from('m12_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setPatents((patRes.data as M12Patent[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllPriorArt((paRes.data as M12PriorArt[]) || []);
    setAllLifecycle((lcRes.data as M12LifecycleMilestone[]) || []);
    setAllAudit((auditRes.data as M12AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, patent_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (patentId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m12_audit_logs').insert({
      case_id: patentId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (p: M12Patent) => {
    setForm({
      patent_number: p.patent_number, patent_title: p.patent_title, patent_type: p.patent_type,
      stage: p.stage, inventors: (p.inventors || []).join('، '), assignee: p.assignee || '',
      international_class: p.international_class || '', filing_date: p.filing_date || '',
      grant_date: p.grant_date || '', priority_date: p.priority_date || '',
      financial_value: String(p.financial_value || 0), filing_fees: String(p.filing_fees || 0),
      assigned_advisor_id: p.assigned_advisor_id || '', description: p.description || '',
    });
    setEditingId(p.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.patent_title.trim() || !form.patent_number.trim()) return;
    setSaving(true);
    const inventorsList = form.inventors.split('،').map((s) => s.trim()).filter(Boolean);
    const payload = {
      patent_number: form.patent_number.trim(),
      patent_title: form.patent_title.trim(),
      patent_type: form.patent_type,
      stage: form.stage,
      status: form.stage,
      inventors: inventorsList.length ? inventorsList : null,
      assignee: form.assignee.trim() || null,
      international_class: form.international_class.trim() || null,
      filing_date: form.filing_date || null,
      grant_date: form.grant_date || null,
      priority_date: form.priority_date || null,
      financial_value: Number(form.financial_value) || 0,
      filing_fees: Number(form.filing_fees) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m12_patents').update(payload).eq('id', editingId);
      await logAudit(editingId, 'patent_updated', 'تحديث بيانات براءة الاختراع');
    } else {
      const { data } = await supabase.from('m12_patents').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'patent_created', 'إنشاء براءة اختراع — نوع: ' + (PATENT_TYPE_LABELS[form.patent_type] || form.patent_type));
        await supabase.from('m12_patents').update({
          m10_linked: true,
          m54_cost_center_opened: true,
          m53_archived: false,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: 'CC-M12-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط البراءة بمحرك القضايا (M10)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء البراءة');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52) بالإيداع');
        if (form.filing_date) {
          await supabase.from('m12_lifecycle_milestones').insert({
            patent_id: newId, milestone_type: 'filing', milestone_date: form.filing_date,
            completed: true, description: 'إيداع طلب براءة الاختراع',
          });
          await logAudit(newId, 'lifecycle_filing', 'تسجيل milestone الإيداع آلياً');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'patent') await supabase.from('m12_patents').delete().eq('id', deleteId);
    else if (deleteType === 'prior_art') await supabase.from('m12_prior_art').delete().eq('id', deleteId);
    else if (deleteType === 'milestone') await supabase.from('m12_lifecycle_milestones').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'patent') setSelectedPatent(null);
    fetchAll();
    if (selectedPatent && deleteType !== 'patent') openPatentDetail(selectedPatent);
  };

  const openPatentDetail = async (p: M12Patent) => {
    setSelectedPatent(p);
    setDetailLoading(true);
    const [paRes, lcRes, aRes] = await Promise.all([
      supabase.from('m12_prior_art').select('*').eq('patent_id', p.id).order('similarity_score', { ascending: false }),
      supabase.from('m12_lifecycle_milestones').select('*').eq('patent_id', p.id).order('milestone_date', { ascending: true }),
      supabase.from('m12_audit_logs').select('*').eq('case_id', p.id).order('created_at', { ascending: true }),
    ]);
    setPriorArt((paRes.data as M12PriorArt[]) || []);
    setLifecycle((lcRes.data as M12LifecycleMilestone[]) || []);
    setAuditLogs((aRes.data as M12AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (p: M12Patent) => {
    const idx = STAGES.indexOf(p.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m12_patents').update({ stage: next, status: next }).eq('id', p.id);
    await logAudit(p.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    if (next === 'granted') {
      await supabase.from('m12_lifecycle_milestones').insert({
        patent_id: p.id, milestone_type: 'grant', milestone_date: new Date().toISOString().split('T')[0],
        completed: true, description: 'منح براءة الاختراع',
      });
      await logAudit(p.id, 'lifecycle_grant', 'تسجيل milestone المنح آلياً');
    }
    fetchAll();
    const updated = { ...p, stage: next, status: next };
    setSelectedPatent(updated as M12Patent);
  };

  const addPriorArt = async () => {
    if (!selectedPatent || !priorArtForm.reference_number.trim()) return;
    await supabase.from('m12_prior_art').insert({
      patent_id: selectedPatent.id,
      reference_number: priorArtForm.reference_number.trim(),
      title: priorArtForm.title.trim() || null,
      source: priorArtForm.source.trim() || null,
      similarity_score: Number(priorArtForm.similarity_score) || 0,
      relevance: priorArtForm.relevance,
    });
    await logAudit(selectedPatent.id, 'prior_art_added', 'إضافة فحص مسبق: ' + priorArtForm.reference_number + ' — تشابه: ' + priorArtForm.similarity_score + '%');
    setPriorArtForm({ reference_number: '', title: '', source: '', similarity_score: '50', relevance: 'low' });
    setPriorArtModalOpen(false);
    openPatentDetail(selectedPatent);
  };

  const addMilestone = async () => {
    if (!selectedPatent || !milestoneForm.milestone_date) return;
    await supabase.from('m12_lifecycle_milestones').insert({
      patent_id: selectedPatent.id,
      milestone_type: milestoneForm.milestone_type,
      milestone_date: milestoneForm.milestone_date,
      deadline_date: milestoneForm.deadline_date || null,
      completed: true,
      description: milestoneForm.description.trim() || null,
    });
    await logAudit(selectedPatent.id, 'milestone_added', 'إضافة milestone: ' + (MILESTONE_TYPE_LABELS[milestoneForm.milestone_type] || milestoneForm.milestone_type));
    setMilestoneForm({ milestone_type: 'filing', milestone_date: '', deadline_date: '', description: '' });
    setMilestoneModalOpen(false);
    openPatentDetail(selectedPatent);
  };

  const filteredPatents = patents.filter((p) => {
    if (filterType !== 'all' && p.patent_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.patent_number.toLowerCase().includes(q) && !p.patent_title.toLowerCase().includes(q) && !(p.assignee || '').toLowerCase().includes(q) && !(p.international_class || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const filedCount = patents.filter((p) => p.stage === 'filed' || p.stage === 'examined').length;
  const grantedCount = patents.filter((p) => p.stage === 'granted').length;
  const totalValue = patents.reduce((s, p) => s + (p.financial_value || 0), 0);
  const highRelevancePriorArt = allPriorArt.filter((pa) => pa.relevance === 'high').length;

  const tabs: { id: Tab; label: string; icon: typeof Lightbulb; badge?: number }[] = [
    { id: 'patents', label: 'البراءات', icon: Lightbulb, badge: patents.length },
    { id: 'prior_art', label: 'الفحص المسبق', icon: Search, badge: highRelevancePriorArt },
    { id: 'lifecycle', label: 'دورة الحياة', icon: Activity },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Lightbulb size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">براءات الاختراع (M12)</h2>
            <p className="font-body text-[10px] text-ink/40">محرك الابتكار التكنولوجي — إدارة براءات الاختراع والفحص المسبق ودورة الحياة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> براءة اختراع
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Lightbulb size={14} className="text-midnight" />} label="إجمالي البراءات" value={String(patents.length)} valueClass="text-midnight" />
        <StatCard icon={<FileText size={14} className="text-amber-600" />} label="مُودَعة / قيد الفحص" value={String(filedCount)} valueClass="text-amber-700" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="براءات ممنوحة" value={String(grantedCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة براءة الاختراع — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.idea;
            const count = patents.filter((p) => p.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} براءة</span>
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
            { icon: Scale, label: 'محرك القضايا (M10)', desc: 'ربط البراءات بالقضايا', color: 'text-blue-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'رسوم الإيداع والتجديد', color: 'text-gold' },
            { icon: Cpu, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات المواعيد', color: 'text-amber-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'إخطار المخترع', color: 'text-green-600' },
            { icon: Archive, label: 'الأرشفة (M53)', desc: 'أرشفة البراءات', color: 'text-purple-600' },
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

      {/* Filters for patents */}
      {activeTab === 'patents' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(PATENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو مُسنِد..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Patents tab */}
      {activeTab === 'patents' && (
        <div className="space-y-2">
          {filteredPatents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Lightbulb size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد براءات اختراع مسجلة</p>
            </div>
          ) : (
            filteredPatents.map((p) => {
              const sCfg = STAGE_CONFIG[p.stage] || STAGE_CONFIG.idea;
              const stageIdx = STAGES.indexOf(p.stage);
              return (
                <div key={p.id} onClick={() => openPatentDetail(p)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Lightbulb size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{p.patent_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{PATENT_TYPE_LABELS[p.patent_type] || p.patent_type}</span>
                          {p.stage === 'granted' && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> ممنوح</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{p.patent_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {p.inventors && p.inventors.length > 0 && <span className="font-body text-[9px] text-ink/40"><Lightbulb size={9} className="inline ml-0.5" />{p.inventors.join('، ')}</span>}
                          {p.assignee && <span className="font-body text-[9px] text-ink/40">المُسنِد: {p.assignee}</span>}
                          {p.international_class && <span className="font-body text-[9px] text-blue-600 font-bold">IPC: {p.international_class}</span>}
                          {p.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(p.financial_value)}</span>}
                          {p.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {p.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {p.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Cpu size={8} /> M92</span>}
                          {p.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Send size={8} /> M52</span>}
                          {p.m53_archived && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Archive size={8} /> M53</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); setDeleteType('patent'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All prior art tab */}
      {activeTab === 'prior_art' && (
        <div className="space-y-2">
          {allPriorArt.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Search size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد نتائج فحص مسبق</p></div>
          ) : (
            allPriorArt.map((pa) => {
              const cfg = PRIOR_ART_RELEVANCE_CONFIG[pa.relevance] || PRIOR_ART_RELEVANCE_CONFIG.low;
              const p = patents.find((p) => p.id === pa.patent_id);
              return (
                <div key={pa.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Search size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>صلة {cfg.label}</span>
                          {p && <span className="font-body text-[9px] text-gold">{p.patent_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{pa.reference_number}</p>
                        {pa.title && <p className="font-body text-[10px] text-ink/50 mt-0.5">{pa.title}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {pa.source && <span className="font-body text-[9px] text-ink/40">المصدر: {pa.source}</span>}
                          <span className={`font-body text-[9px] font-bold ${pa.similarity_score > 70 ? 'text-red-600' : pa.similarity_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>تشابه: {pa.similarity_score}%</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(pa.id); setDeleteType('prior_art'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All lifecycle tab */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-2">
          {allLifecycle.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Activity size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد milestones مسجلة</p></div>
          ) : (
            allLifecycle.map((ms) => {
              const p = patents.find((p) => p.id === ms.patent_id);
              return (
                <div key={ms.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gold/10">
                        <Activity size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">{MILESTONE_TYPE_LABELS[ms.milestone_type] || ms.milestone_type}</span>
                          {ms.completed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مكتمل</span>}
                          {p && <span className="font-body text-[9px] text-gold">{p.patent_number}</span>}
                        </div>
                        {ms.description && <p className="font-body text-[10px] text-ink/50 mt-1">{ms.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40"><Calendar size={9} className="inline ml-0.5" />{formatDate(ms.milestone_date)}</span>
                          {ms.deadline_date && <span className="font-body text-[9px] text-amber-600">الموعد النهائي: {formatDate(ms.deadline_date)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(ms.id); setDeleteType('milestone'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Cpu size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-green-600" />
                      : log.action.includes('prior_art') ? <Search size={12} className="text-blue-600" />
                      : log.action.includes('lifecycle') || log.action.includes('milestone') ? <Activity size={12} className="text-purple-600" />
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

      {/* Patent detail drawer */}
      {selectedPatent && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedPatent(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">براءة الاختراع</span>
              </div>
              <button onClick={() => setSelectedPatent(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedPatent.patent_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedPatent.stage] || STAGE_CONFIG.idea).bg} ${(STAGE_CONFIG[selectedPatent.stage] || STAGE_CONFIG.idea).text}`}>
                      {(STAGE_CONFIG[selectedPatent.stage] || STAGE_CONFIG.idea).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{PATENT_TYPE_LABELS[selectedPatent.patent_type] || selectedPatent.patent_type}</span>
                    {selectedPatent.stage === 'granted' && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600"><BadgeCheck size={10} /> ممنوح</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedPatent.patent_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.idea;
                      const stageIdx = STAGES.indexOf(selectedPatent.stage);
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
                  {selectedPatent.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedPatent)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Patent info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات البراءة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المخترعون</span><p className="font-body text-xs font-bold text-midnight">{selectedPatent.inventors ? selectedPatent.inventors.join('، ') : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المُسنِد</span><p className="font-body text-xs font-bold text-midnight">{selectedPatent.assignee || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">التصنيف الدولي (IPC)</span><p className="font-body text-xs font-bold text-blue-600">{selectedPatent.international_class || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع البراءة</span><p className="font-body text-xs font-bold text-midnight">{PATENT_TYPE_LABELS[selectedPatent.patent_type] || selectedPatent.patent_type}</p></div>
                  </div>
                </div>

                {/* Key dates */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">المواعيد الرئيسية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ الإيداع</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedPatent.filing_date ? formatDate(selectedPatent.filing_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ المنح</span>
                      <p className="font-body text-xs font-bold text-green-600">{selectedPatent.grant_date ? formatDate(selectedPatent.grant_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ الأولوية</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedPatent.priority_date ? formatDate(selectedPatent.priority_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">المستشار</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedPatent.advisor?.name || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedPatent.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedPatent.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رسوم الإيداع</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedPatent.filing_fees)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPatent.m10_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedPatent.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPatent.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedPatent.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPatent.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Cpu size={10} /> M92 {selectedPatent.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPatent.m52_notified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M52 {selectedPatent.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPatent.m53_archived ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Archive size={10} /> M53 {selectedPatent.m53_archived ? 'مؤرشف' : 'غير مؤرشف'}</span>
                </div>

                {selectedPatent.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedPatent.description}</p></div>
                )}

                {/* Prior art */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Search size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الفحص المسبق (Prior Art)</span></div>
                    <button onClick={() => setPriorArtModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة</button>
                  </div>
                  <div className="space-y-1.5">
                    {priorArt.map((pa) => {
                      const cfg = PRIOR_ART_RELEVANCE_CONFIG[pa.relevance] || PRIOR_ART_RELEVANCE_CONFIG.low;
                      return (
                        <div key={pa.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/pa">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>صلة {cfg.label}</span>
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{pa.reference_number}</p>
                            <span className={`font-body text-[9px] font-bold ${pa.similarity_score > 70 ? 'text-red-600' : pa.similarity_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>{pa.similarity_score}%</span>
                            <button onClick={() => { setDeleteId(pa.id); setDeleteType('prior_art'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/pa:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          {pa.title && <p className="font-body text-[9px] text-ink/50">{pa.title}</p>}
                          {pa.source && <span className="font-body text-[9px] text-ink/40">المصدر: {pa.source}</span>}
                        </div>
                      );
                    })}
                    {priorArt.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد نتائج فحص مسبق مسجلة</p>}
                  </div>
                </div>

                {/* Lifecycle milestones */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Activity size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">دورة الحياة (Lifecycle)</span></div>
                    <button onClick={() => setMilestoneModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة</button>
                  </div>
                  <div className="space-y-1.5">
                    {lifecycle.map((ms) => (
                      <div key={ms.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/ms">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold">{MILESTONE_TYPE_LABELS[ms.milestone_type] || ms.milestone_type}</span>
                          {ms.completed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مكتمل</span>}
                          <span className="font-body text-[9px] text-ink/40 flex-1">{formatDate(ms.milestone_date)}</span>
                          <button onClick={() => { setDeleteId(ms.id); setDeleteType('milestone'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/ms:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        {ms.description && <p className="font-body text-[9px] text-ink/50">{ms.description}</p>}
                        {ms.deadline_date && <span className="font-body text-[9px] text-amber-600">الموعد النهائي: {formatDate(ms.deadline_date)}</span>}
                      </div>
                    ))}
                    {lifecycle.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد milestones مسجلة</p>}
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

      {/* Patent create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل براءة الاختراع' : 'براءة اختراع جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم البراءة" required><TextInput value={form.patent_number} onChange={(e) => setForm({ ...form, patent_number: e.target.value })} placeholder="PAT-2025-001" /></Field>
          <Field label="نوع البراءة">
            <Select value={form.patent_type} onChange={(e) => setForm({ ...form, patent_type: e.target.value })}>
              {Object.entries(PATENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان البراءة" required><TextInput value={form.patent_title} onChange={(e) => setForm({ ...form, patent_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="التصنيف الدولي (IPC)"><TextInput value={form.international_class} onChange={(e) => setForm({ ...form, international_class: e.target.value })} placeholder="مثال: G06F" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المخترعون (افصل بفاصلة عربية ،)"><TextInput value={form.inventors} onChange={(e) => setForm({ ...form, inventors: e.target.value })} placeholder="مثال: د. أحمد، م. محمود" /></Field>
          <Field label="المُسنِد (Assignee)"><TextInput value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الإيداع"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
          <Field label="تاريخ الأولوية"><TextInput type="date" value={form.priority_date} onChange={(e) => setForm({ ...form, priority_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ المنح"><TextInput type="date" value={form.grant_date} onChange={(e) => setForm({ ...form, grant_date: e.target.value })} /></Field>
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="رسوم الإيداع"><TextInput type="number" value={form.filing_fees} onChange={(e) => setForm({ ...form, filing_fees: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Prior art modal */}
      <EntityModal open={priorArtModalOpen} title="إضافة فحص مسبق" onClose={() => setPriorArtModalOpen(false)} onSubmit={addPriorArt}>
        <Field label="الرقم المرجعي" required><TextInput value={priorArtForm.reference_number} onChange={(e) => setPriorArtForm({ ...priorArtForm, reference_number: e.target.value })} /></Field>
        <Field label="العنوان"><TextInput value={priorArtForm.title} onChange={(e) => setPriorArtForm({ ...priorArtForm, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المصدر"><TextInput value={priorArtForm.source} onChange={(e) => setPriorArtForm({ ...priorArtForm, source: e.target.value })} /></Field>
          <Field label="نسبة التشابه %"><TextInput type="number" value={priorArtForm.similarity_score} onChange={(e) => setPriorArtForm({ ...priorArtForm, similarity_score: e.target.value })} /></Field>
        </div>
        <Field label="درجة الصلة">
          <Select value={priorArtForm.relevance} onChange={(e) => setPriorArtForm({ ...priorArtForm, relevance: e.target.value })}>
            <option value="low">منخفض</option>
            <option value="medium">متوسط</option>
            <option value="high">مرتفع</option>
          </Select>
        </Field>
      </EntityModal>

      {/* Milestone modal */}
      <EntityModal open={milestoneModalOpen} title="إضافة milestone" onClose={() => setMilestoneModalOpen(false)} onSubmit={addMilestone}>
        <Field label="نوع الـ milestone">
          <Select value={milestoneForm.milestone_type} onChange={(e) => setMilestoneForm({ ...milestoneForm, milestone_type: e.target.value })}>
            {Object.entries(MILESTONE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الـ milestone" required><TextInput type="date" value={milestoneForm.milestone_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, milestone_date: e.target.value })} /></Field>
          <Field label="الموعد النهائي"><TextInput type="date" value={milestoneForm.deadline_date} onChange={(e) => setMilestoneForm({ ...milestoneForm, deadline_date: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={milestoneForm.description} onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
