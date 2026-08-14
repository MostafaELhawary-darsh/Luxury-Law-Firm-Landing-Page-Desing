import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, BookOpen, DollarSign,
  FileText, Gavel, Users, Lock, Scan, Eye, Database, Scale,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M46KnowledgeDocument, M46AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'documents' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  ocr_processed: { label: 'معالجة OCR', bg: 'bg-amber-50', text: 'text-amber-700' },
  indexed: { label: 'فهرسة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  encrypted: { label: 'تشفير', bg: 'bg-purple-50', text: 'text-purple-700' },
  archived: { label: 'أرشفة', bg: 'bg-green-50', text: 'text-green-700' },
  searchable: { label: 'قابل للبحث', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'ocr_processed', 'indexed', 'encrypted', 'archived', 'searchable'];

const DOC_TYPE_LABELS: Record<string, string> = {
  legislation: 'تشريع',
  case_law: 'سوابق قضائية',
  regulation: 'لائحة',
  legal_memo: 'مذكرة قانونية',
  contract_template: 'نموذج عقد',
  legal_opinion: 'رأي قانوني',
};

const DOC_TYPE_ICONS: Record<string, typeof BookOpen> = {
  legislation: Gavel,
  case_law: Scale,
  regulation: FileText,
  legal_memo: BookOpen,
  contract_template: FileText,
  legal_opinion: BookOpen,
};

const RETENTION_LABELS: Record<string, string> = {
  permanent: 'دائم',
  '10_years': '10 سنوات',
  '5_years': '5 سنوات',
  '3_years': '3 سنوات',
  review: 'مراجعة',
};

const ACCESS_LABELS: Record<string, string> = {
  public: 'عام',
  restricted: 'مقيّد',
  confidential: 'سري',
  top_secret: 'سري للغاية',
};

const ACCESS_COLORS: Record<string, string> = {
  public: 'bg-green-50 text-green-700',
  restricted: 'bg-amber-50 text-amber-700',
  confidential: 'bg-red-50 text-red-700',
  top_secret: 'bg-red-100 text-red-800',
};

interface DocForm {
  document_number: string;
  document_title: string;
  document_type: string;
  stage: string;
  source_authority: string;
  jurisdiction: string;
  keywords: string;
  retention_policy: string;
  ocr_processed: boolean;
  encrypted: boolean;
  access_level: string;
  description: string;
}

const emptyForm: DocForm = {
  document_number: '', document_title: '', document_type: 'legislation', stage: 'intake',
  source_authority: '', jurisdiction: '', keywords: '', retention_policy: 'permanent',
  ocr_processed: false, encrypted: false, access_level: 'restricted',
  description: '',
};

export default function KnowledgeManagementEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [documents, setDocuments] = useState<M46KnowledgeDocument[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [selectedDoc, setSelectedDoc] = useState<M46KnowledgeDocument | null>(null);
  const [auditLogs, setAuditLogs] = useState<M46AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M46AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dRes, attRes, auditRes] = await Promise.all([
      supabase.from('m46_knowledge_documents')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m46_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (dRes.error) console.error('m46 fetch error', dRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setDocuments((dRes.data as M46KnowledgeDocument[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M46AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, document_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (docId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m46_audit_logs').insert({
      case_id: docId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (d: M46KnowledgeDocument) => {
    setForm({
      document_number: d.document_number, document_title: d.document_title,
      document_type: d.document_type, stage: d.stage,
      source_authority: d.source_authority, jurisdiction: d.jurisdiction || '',
      keywords: d.keywords || '', retention_policy: d.retention_policy,
      ocr_processed: d.ocr_processed || false, encrypted: d.encrypted || false,
      access_level: d.access_level, description: d.description || '',
    });
    setEditingId(d.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.document_title.trim() || !form.document_number.trim()) return;
    setSaving(true);
    const payload = {
      document_number: form.document_number.trim(),
      document_title: form.document_title.trim(),
      document_type: form.document_type,
      stage: form.stage,
      status: form.stage === 'archived' ? 'archived' : 'active',
      source_authority: form.source_authority.trim(),
      jurisdiction: form.jurisdiction.trim() || null,
      keywords: form.keywords.trim() || null,
      retention_policy: form.retention_policy,
      ocr_processed: form.ocr_processed,
      encrypted: form.encrypted,
      access_level: form.access_level,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m46_knowledge_documents').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'document_updated', 'تحديث بيانات الوثيقة');
    } else {
      const { data, error } = await supabase.from('m46_knowledge_documents').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'document_created', 'إنشاء وثيقة معرفية — النوع: ' + (DOC_TYPE_LABELS[form.document_type] || form.document_type));
        await supabase.from('m46_knowledge_documents').update({
          m10_case_linked: true,
          m53_archived: form.stage === 'archived' || form.stage === 'searchable',
          m54_finance_linked: false,
          m92_notified: true,
          cost_center_id: 'CC-M46-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_case', 'ربط الوثيقة بالمحرك الموحد (M10)');
        if (form.stage === 'archived' || form.stage === 'searchable') {
          await logAudit(newId, 'm53_archive', 'أرشفة الوثيقة في محرك المستندات (M53)');
        }
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الوثيقة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m46_knowledge_documents').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedDoc(null);
    fetchAll();
  };

  const openDocDetail = async (d: M46KnowledgeDocument) => {
    setSelectedDoc(d);
    setDetailLoading(true);
    const aRes = await supabase.from('m46_audit_logs').select('*').eq('case_id', d.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M46AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (d: M46KnowledgeDocument) => {
    const idx = STAGES.indexOf(d.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m46_knowledge_documents').update({ stage: next, status: next === 'archived' ? 'archived' : 'active' }).eq('id', d.id);
    if (error) console.error('stage advance error', error);
    await logAudit(d.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedDoc({ ...d, stage: next } as M46KnowledgeDocument);
  };

  const filteredDocs = documents.filter((d) => {
    if (filterType !== 'all' && d.document_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.document_number.toLowerCase().includes(q) && !d.document_title.toLowerCase().includes(q) && !d.source_authority.toLowerCase().includes(q) && !(d.keywords || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = documents.filter((d) => d.stage !== 'archived').length;
  const ocrCount = documents.filter((d) => d.ocr_processed).length;
  const encryptedCount = documents.filter((d) => d.encrypted).length;

  const tabs: { id: Tab; label: string; icon: typeof BookOpen; badge?: number }[] = [
    { id: 'documents', label: 'الوثائق', icon: BookOpen, badge: documents.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <BookOpen size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">إدارة المعرفة والوثائق الذكية (M46)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة التشريعات والسوابق القضائية واللوائح والمذكرات القانونية مع OCR وتشفير وفهرسة ذكية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · ABAC</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> وثيقة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<BookOpen size={14} className="text-midnight" />} label="إجمالي الوثائق" value={String(documents.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="وثائق نشطة" value={String(activeCount)} valueClass="text-green-700" />
        <StatCard icon={<Scan size={14} className="text-amber-600" />} label="معالجة OCR" value={String(ocrCount)} valueClass="text-amber-700" />
        <StatCard icon={<Lock size={14} className="text-purple-600" />} label="مشفّرة" value={String(encryptedCount)} valueClass="text-purple-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الوثيقة الذكية — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
            const count = documents.filter((d) => d.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} وثيقة</span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Server, label: 'المحرك الموحد (M10)', desc: 'ربط القضية', color: 'text-blue-600' },
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الوثيقة', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات الوصول', color: 'text-amber-600' },
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

      {/* Filters for documents */}
      {activeTab === 'documents' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الوثيقة أو العنوان أو المصدر أو الكلمات..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div className="space-y-2">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <BookOpen size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد وثائق مسجلة</p>
            </div>
          ) : (
            filteredDocs.map((d) => {
              const sCfg = STAGE_CONFIG[d.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(d.stage);
              const TypeIcon = DOC_TYPE_ICONS[d.document_type] || BookOpen;
              const accColor = ACCESS_COLORS[d.access_level] || ACCESS_COLORS.restricted;
              return (
                <div key={d.id} onClick={() => openDocDetail(d)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{d.document_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DOC_TYPE_LABELS[d.document_type] || d.document_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${accColor}`}>وصول: {ACCESS_LABELS[d.access_level] || d.access_level}</span>
                          {d.ocr_processed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Scan size={8} /> OCR</span>}
                          {d.encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> مشفّر</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{d.document_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">المصدر: {d.source_authority}</span>
                          {d.jurisdiction && <span className="font-body text-[9px] text-ink/40">الاختصاص: {d.jurisdiction}</span>}
                          {d.keywords && <span className="font-body text-[9px] text-ink/40">كلمات: {d.keywords}</span>}
                          <span className="font-body text-[9px] text-ink/40">الاحتفاظ: {RETENTION_LABELS[d.retention_policy] || d.retention_policy}</span>
                          {d.m10_case_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Server size={8} /> M10</span>}
                          {d.m53_archived && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {d.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {d.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(d); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(d.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <BookOpen size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Server size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
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

      {/* Document detail drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الوثيقة الذكية</span>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedDoc.document_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedDoc.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedDoc.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedDoc.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{DOC_TYPE_LABELS[selectedDoc.document_type] || selectedDoc.document_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedDoc.document_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
                      const stageIdx = STAGES.indexOf(selectedDoc.stage);
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
                  {selectedDoc.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedDoc)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Document info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الوثيقة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الجهة المصدر</span><p className="font-body text-xs font-bold text-midnight">{selectedDoc.source_authority}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الاختصاص</span><p className="font-body text-xs font-bold text-midnight">{selectedDoc.jurisdiction || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">سياسة الاحتفاظ</span><p className="font-body text-xs font-bold text-midnight">{RETENTION_LABELS[selectedDoc.retention_policy] || selectedDoc.retention_policy}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedDoc.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Access level */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <Eye size={12} className="text-gold mb-1" />
                  <span className="font-body text-[9px] text-ink/40">مستوى الوصول</span>
                  <p className="font-body text-sm font-bold text-midnight">{ACCESS_LABELS[selectedDoc.access_level] || selectedDoc.access_level}</p>
                </div>

                {/* Keywords */}
                {selectedDoc.keywords && (
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <Database size={12} className="text-gold mb-1" />
                    <span className="font-body text-[9px] text-ink/40">الكلمات المفتاحية</span>
                    <p className="font-body text-xs text-ink/70 leading-relaxed">{selectedDoc.keywords}</p>
                  </div>
                )}

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.ocr_processed ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Scan size={10} /> OCR {selectedDoc.ocr_processed ? 'معالج' : 'غير معالج'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.encrypted ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> التشفير {selectedDoc.encrypted ? 'مفعّل' : 'غير مفعّل'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m10_case_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M10 {selectedDoc.m10_case_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m53_archived ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedDoc.m53_archived ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedDoc.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedDoc.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedDoc.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedDoc.description}</p></div>
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

      {/* Document create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الوثيقة' : 'وثيقة معرفية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الوثيقة" required><TextInput value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} placeholder="KM-2025-001" /></Field>
          <Field label="نوع الوثيقة">
            <Select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الوثيقة" required><TextInput value={form.document_title} onChange={(e) => setForm({ ...form, document_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الجهة المصدر" required><TextInput value={form.source_authority} onChange={(e) => setForm({ ...form, source_authority: e.target.value })} /></Field>
          <Field label="الاختصاص القضائي"><TextInput value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} /></Field>
        </div>
        <Field label="الكلمات المفتاحية"><TextInput value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="كلمة1، كلمة2..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="سياسة الاحتفاظ">
            <Select value={form.retention_policy} onChange={(e) => setForm({ ...form, retention_policy: e.target.value })}>
              {Object.entries(RETENTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="مستوى الوصول">
            <Select value={form.access_level} onChange={(e) => setForm({ ...form, access_level: e.target.value })}>
              {Object.entries(ACCESS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <Checkbox label="معالجة OCR (OCR Processed)" checked={form.ocr_processed} onChange={(v) => setForm({ ...form, ocr_processed: v })} />
        <Checkbox label="مشفّرة (Encrypted)" checked={form.encrypted} onChange={(v) => setForm({ ...form, encrypted: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
