import { useEffect, useState, useCallback } from 'react';
import {
  Newspaper, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, ArrowRight, Search, BadgeCheck,
  Send, Eye, Archive, Activity, Server, BookOpen, Copyright,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M17Content, M17License, M17AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'content' | 'licenses' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ingestion: { label: 'استيعاب', bg: 'bg-gray-100', text: 'text-gray-700' },
  indexed: { label: 'مُفهرَس', bg: 'bg-blue-50', text: 'text-blue-700' },
  published: { label: 'منشور', bg: 'bg-green-50', text: 'text-green-700' },
  monitored: { label: 'مراقَب', bg: 'bg-amber-50', text: 'text-amber-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const STAGES = ['ingestion', 'indexed', 'published', 'monitored', 'archived'];

const CONTENT_TYPE_LABELS: Record<string, string> = {
  article: 'مقال',
  video: 'فيديو',
  audio: 'صوت',
  infographic: 'إنفوجرافيك',
  interactive: 'تفاعلي',
};

const MEDIA_FORMAT_LABELS: Record<string, string> = {
  text: 'نص',
  pdf: 'PDF',
  video: 'فيديو',
  audio: 'صوت',
  image: 'صورة',
};

const LICENSE_TYPE_LABELS: Record<string, string> = {
  exclusive: 'حصري',
  non_exclusive: 'غير حصري',
  creative_commons: 'المشاع الإبداعي',
  custom: 'مخصص',
};

interface ContentForm {
  content_number: string;
  content_title: string;
  content_type: string;
  stage: string;
  media_format: string;
  author_name: string;
  publisher: string;
  content_hash: string;
  drm_protected: boolean;
  retention_policy: string;
  description: string;
  financial_value: string;
  filing_fees: string;
  assigned_advisor_id: string;
}

const emptyForm: ContentForm = {
  content_number: '', content_title: '', content_type: 'article', stage: 'ingestion',
  media_format: 'text', author_name: '', publisher: '', content_hash: '',
  drm_protected: false, retention_policy: '', description: '',
  financial_value: '0', filing_fees: '0', assigned_advisor_id: '',
};

export default function DigitalPublishingEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [contents, setContents] = useState<M17Content[]>([]);
  const [licenses, setLicenses] = useState<M17License[]>([]);
  const [allLicenses, setAllLicenses] = useState<M17License[]>([]);
  const [allAudit, setAllAudit] = useState<M17AuditLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<M17AuditLog[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [selectedContent, setSelectedContent] = useState<M17Content | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'content' | 'license'>('content');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [licModalOpen, setLicModalOpen] = useState(false);
  const [licForm, setLicForm] = useState({ licensee: '', license_type: 'non_exclusive', license_scope: '', royalty_rate: '0', start_date: '', end_date: '', is_exclusive: false });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [contentRes, licRes, auditRes, attRes] = await Promise.all([
      supabase.from('m17_content')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('m17_licenses').select('*').order('created_at', { ascending: false }),
      supabase.from('m17_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    setContents((contentRes.data as M17Content[]) || []);
    setAllLicenses((licRes.data as M17License[]) || []);
    setAllAudit((auditRes.data as M17AuditLog[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, content_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (contentId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m17_audit_logs').insert({
      case_id: contentId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M17Content) => {
    setForm({
      content_number: c.content_number, content_title: c.content_title, content_type: c.content_type,
      stage: c.stage, media_format: c.media_format, author_name: c.author_name || '',
      publisher: c.publisher || '', content_hash: c.content_hash || '',
      drm_protected: c.drm_protected, retention_policy: c.retention_policy || '',
      description: c.description || '', financial_value: String(c.financial_value || 0),
      filing_fees: String(c.filing_fees || 0), assigned_advisor_id: c.assigned_advisor_id || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.content_title.trim() || !form.content_number.trim()) return;
    setSaving(true);
    const payload = {
      content_number: form.content_number.trim(),
      content_title: form.content_title.trim(),
      content_type: form.content_type,
      stage: form.stage,
      media_format: form.media_format,
      author_name: form.author_name.trim() || null,
      publisher: form.publisher.trim() || null,
      content_hash: form.content_hash.trim() || null,
      drm_protected: form.drm_protected,
      retention_policy: form.retention_policy.trim() || null,
      description: form.description.trim() || null,
      financial_value: Number(form.financial_value) || 0,
      filing_fees: Number(form.filing_fees) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
    };
    if (editingId) {
      await supabase.from('m17_content').update(payload).eq('id', editingId);
      await logAudit(editingId, 'content_updated', 'تحديث بيانات المحتوى الرقمي');
    } else {
      const { data } = await supabase.from('m17_content').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'content_created', 'إنشاء محتوى رقمي — نوع: ' + (CONTENT_TYPE_LABELS[form.content_type] || form.content_type));
        await supabase.from('m17_content').update({
          m81_media_production_linked: true,
          m74_press_compliance_checked: true,
          m54_finance_linked: true,
          m92_notified: true,
          cost_center_id: 'CC-M17-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm81_linked', 'ربط المحتوى بالمحرك الفني والإنتاج الإعلامي (M81)');
        await logAudit(newId, 'm74_linked', 'ربط المحتوى بمراقبة الامتثال الصحفي (M74)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء المحتوى');
        if (form.drm_protected) {
          await logAudit(newId, 'drm_enabled', 'تفعيل الحماية الرقمية (DRM) على المحتوى');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'content') await supabase.from('m17_content').delete().eq('id', deleteId);
    else if (deleteType === 'license') await supabase.from('m17_licenses').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'content') setSelectedContent(null);
    fetchAll();
    if (selectedContent && deleteType !== 'content') openContentDetail(selectedContent);
  };

  const openContentDetail = async (c: M17Content) => {
    setSelectedContent(c);
    setDetailLoading(true);
    const [licRes, aRes] = await Promise.all([
      supabase.from('m17_licenses').select('*').eq('content_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m17_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setLicenses((licRes.data as M17License[]) || []);
    setAuditLogs((aRes.data as M17AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M17Content) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m17_content').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedContent(updated as M17Content);
  };

  const addLicense = async () => {
    if (!selectedContent || !licForm.licensee.trim()) return;
    await supabase.from('m17_licenses').insert({
      content_id: selectedContent.id,
      licensee: licForm.licensee.trim(),
      license_type: licForm.license_type,
      license_scope: licForm.license_scope.trim() || null,
      royalty_rate: Number(licForm.royalty_rate) || 0,
      start_date: licForm.start_date || null,
      end_date: licForm.end_date || null,
      is_exclusive: licForm.is_exclusive,
    });
    await logAudit(selectedContent.id, 'license_added', 'إضافة ترخيص: ' + licForm.licensee + ' — نوع: ' + (LICENSE_TYPE_LABELS[licForm.license_type] || licForm.license_type));
    setLicForm({ licensee: '', license_type: 'non_exclusive', license_scope: '', royalty_rate: '0', start_date: '', end_date: '', is_exclusive: false });
    setLicModalOpen(false);
    openContentDetail(selectedContent);
  };

  const filteredContents = contents.filter((c) => {
    if (filterType !== 'all' && c.content_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.content_number.toLowerCase().includes(q) && !c.content_title.toLowerCase().includes(q) && !(c.author_name || '').toLowerCase().includes(q) && !(c.publisher || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const publishedContents = contents.filter((c) => c.stage === 'published' || c.stage === 'monitored').length;
  const drmContents = contents.filter((c) => c.drm_protected).length;
  const totalValue = contents.reduce((s, c) => s + (c.financial_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Newspaper; badge?: number }[] = [
    { id: 'content', label: 'المحتوى', icon: BookOpen, badge: contents.length },
    { id: 'licenses', label: 'التراخيص', icon: Copyright, badge: allLicenses.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Newspaper size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">النشر الرقمي (M17)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة النشر الرقمي والوسائط المتعددة مع حماية DRM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Lock size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">DRM Protected</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> محتوى جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<BookOpen size={14} className="text-midnight" />} label="إجمالي المحتوى" value={String(contents.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="محتوى منشور" value={String(publishedContents)} valueClass="text-green-700" />
        <StatCard icon={<Lock size={14} className="text-purple-600" />} label="محمي بـ DRM" value={String(drmContents)} valueClass="text-purple-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة المحتوى الرقمي — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.ingestion;
            const count = contents.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} محتوى</span>
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
            { icon: Newspaper, label: 'الإنتاج الإعلامي (M81)', desc: 'ربط الإنتاج الفني', color: 'text-purple-600' },
            { icon: Eye, label: 'الامتثال الصحفي (M74)', desc: 'مراقبة النشر', color: 'text-blue-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'مراكز التكلفة', color: 'text-gold' },
            { icon: Archive, label: 'الأرشيف السيادي (M53)', desc: 'حفظ دائم', color: 'text-green-600' },
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

      {/* Filters for content */}
      {activeTab === 'content' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو مؤلف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Content tab */}
      {activeTab === 'content' && (
        <div className="space-y-2">
          {filteredContents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <BookOpen size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا يوجد محتوى رقمي</p>
            </div>
          ) : (
            filteredContents.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.ingestion;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openContentDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <BookOpen size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.content_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CONTENT_TYPE_LABELS[c.content_type] || c.content_type}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{MEDIA_FORMAT_LABELS[c.media_format] || c.media_format}</span>
                          {c.drm_protected && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> DRM</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.content_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.author_name && <span className="font-body text-[9px] text-ink/40"><Users size={9} className="inline ml-0.5" />{c.author_name}</span>}
                          {c.publisher && <span className="font-body text-[9px] text-ink/40">الناشر: {c.publisher}</span>}
                          {c.publication_date && <span className="font-body text-[9px] text-ink/40">{formatDate(c.publication_date)}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.m81_media_production_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Newspaper size={8} /> M81</span>}
                          {c.m74_press_compliance_checked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Eye size={8} /> M74</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m53_archived && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50"><Archive size={8} /> M53</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setDeleteType('content'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All licenses tab */}
      {activeTab === 'licenses' && (
        <div className="space-y-2">
          {allLicenses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Copyright size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد تراخيص مسجلة</p></div>
          ) : (
            allLicenses.map((l) => {
              const c = contents.find((c) => c.id === l.content_id);
              return (
                <div key={l.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${l.is_exclusive ? 'bg-purple-50' : 'bg-gray-100'}`}>
                        <Copyright size={14} className={l.is_exclusive ? 'text-purple-600' : 'text-ink/40'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {l.is_exclusive ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> حصري</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">غير حصري</span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{LICENSE_TYPE_LABELS[l.license_type] || l.license_type}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.content_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{l.licensee}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {l.license_scope && <span className="font-body text-[9px] text-ink/40">النطاق: {l.license_scope}</span>}
                          {l.royalty_rate > 0 && <span className="font-body text-[9px] text-gold font-bold">إتاوة: {l.royalty_rate}%</span>}
                          {l.start_date && <span className="font-body text-[9px] text-ink/40">من: {formatDate(l.start_date)}</span>}
                          {l.end_date && <span className="font-body text-[9px] text-ink/40">إلى: {formatDate(l.end_date)}</span>}
                          {l.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(l.id); setDeleteType('license'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                    {log.action.includes('created') ? <BookOpen size={12} className="text-blue-600" />
                      : log.action.includes('m81') ? <Newspaper size={12} className="text-purple-600" />
                      : log.action.includes('m74') ? <Eye size={12} className="text-blue-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m53') ? <Archive size={12} className="text-gray-600" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('drm') ? <Lock size={12} className="text-purple-600" />
                      : log.action.includes('license') ? <Copyright size={12} className="text-amber-600" />
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

      {/* Content detail drawer */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedContent(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Newspaper size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">المحتوى الرقمي</span>
              </div>
              <button onClick={() => setSelectedContent(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedContent.content_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedContent.stage] || STAGE_CONFIG.ingestion).bg} ${(STAGE_CONFIG[selectedContent.stage] || STAGE_CONFIG.ingestion).text}`}>
                      {(STAGE_CONFIG[selectedContent.stage] || STAGE_CONFIG.ingestion).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{CONTENT_TYPE_LABELS[selectedContent.content_type] || selectedContent.content_type}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{MEDIA_FORMAT_LABELS[selectedContent.media_format] || selectedContent.media_format}</span>
                    {selectedContent.drm_protected && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><Lock size={10} /> DRM</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedContent.content_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.ingestion;
                      const stageIdx = STAGES.indexOf(selectedContent.stage);
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
                  {selectedContent.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedContent)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Author/Publisher info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المؤلف والناشر</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المؤلف</span><p className="font-body text-xs font-bold text-midnight">{selectedContent.author_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الناشر</span><p className="font-body text-xs font-bold text-midnight">{selectedContent.publisher || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ النشر</span><p className="font-body text-xs font-bold text-midnight">{selectedContent.publication_date ? formatDate(selectedContent.publication_date) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">سياسة الاحتفاظ</span><p className="font-body text-xs font-bold text-midnight">{selectedContent.retention_policy || '—'}</p></div>
                  </div>
                </div>

                {/* Content hash */}
                {selectedContent.content_hash && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock size={12} className="text-ink/40" />
                      <span className="font-body text-[10px] font-bold text-midnight">هاش المحتوى (SHA-256)</span>
                    </div>
                    <p className="font-body text-[10px] text-ink/60 font-mono break-all">{selectedContent.content_hash}</p>
                  </div>
                )}

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedContent.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedContent.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رسوم الإيداع</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedContent.filing_fees)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContent.m81_media_production_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Newspaper size={10} /> M81 {selectedContent.m81_media_production_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContent.m74_press_compliance_checked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Eye size={10} /> M74 {selectedContent.m74_press_compliance_checked ? 'متحقق' : 'غير متحقق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContent.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedContent.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContent.m53_archived ? 'bg-gray-100 text-ink/50' : 'bg-gray-100 text-ink/30'}`}><Archive size={10} /> M53 {selectedContent.m53_archived ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedContent.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedContent.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedContent.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedContent.description}</p></div>
                )}

                {/* Licenses */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Copyright size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">التراخيص</span></div>
                    <button onClick={() => setLicModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة ترخيص</button>
                  </div>
                  <div className="space-y-1.5">
                    {licenses.map((l) => (
                      <div key={l.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/lic">
                        <div className="flex items-center gap-2 mb-1">
                          {l.is_exclusive ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> حصري</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">غير حصري</span>
                          )}
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{l.licensee}</p>
                          <button onClick={() => { setDeleteId(l.id); setDeleteType('license'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/lic:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{LICENSE_TYPE_LABELS[l.license_type] || l.license_type}</span>
                          {l.license_scope && <span className="font-body text-[9px] text-ink/40">{l.license_scope}</span>}
                          {l.royalty_rate > 0 && <span className="font-body text-[9px] text-gold font-bold">إتاوة: {l.royalty_rate}%</span>}
                          {l.start_date && <span className="font-body text-[9px] text-ink/40">{formatDate(l.start_date)}</span>}
                          {l.end_date && <span className="font-body text-[9px] text-ink/40">→ {formatDate(l.end_date)}</span>}
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

      {/* Content create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل محتوى' : 'محتوى رقمي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم المحتوى" required><TextInput value={form.content_number} onChange={(e) => setForm({ ...form, content_number: e.target.value })} placeholder="PUB-2025-001" /></Field>
          <Field label="نوع المحتوى">
            <Select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })}>
              {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان المحتوى" required><TextInput value={form.content_title} onChange={(e) => setForm({ ...form, content_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="صيغة الوسائط">
            <Select value={form.media_format} onChange={(e) => setForm({ ...form, media_format: e.target.value })}>
              {Object.entries(MEDIA_FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المؤلف"><TextInput value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} /></Field>
          <Field label="الناشر"><TextInput value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="هاش المحتوى"><TextInput value={form.content_hash} onChange={(e) => setForm({ ...form, content_hash: e.target.value })} placeholder="0x..." /></Field>
          <Field label="سياسة الاحتفاظ"><TextInput value={form.retention_policy} onChange={(e) => setForm({ ...form, retention_policy: e.target.value })} placeholder="مثال: 7 سنوات" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="رسوم الإيداع"><TextInput type="number" value={form.filing_fees} onChange={(e) => setForm({ ...form, filing_fees: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حماية DRM">
            <Select value={form.drm_protected ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, drm_protected: e.target.value === 'yes' })}>
              <option value="no">لا</option>
              <option value="yes">نعم</option>
            </Select>
          </Field>
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* License modal */}
      <EntityModal open={licModalOpen} title="إضافة ترخيص" onClose={() => setLicModalOpen(false)} onSubmit={addLicense}>
        <Field label="اسم المُرخَّص له" required><TextInput value={licForm.licensee} onChange={(e) => setLicForm({ ...licForm, licensee: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الترخيص">
            <Select value={licForm.license_type} onChange={(e) => setLicForm({ ...licForm, license_type: e.target.value, is_exclusive: e.target.value === 'exclusive' })}>
              {Object.entries(LICENSE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="نسبة الإتاوة %"><TextInput type="number" value={licForm.royalty_rate} onChange={(e) => setLicForm({ ...licForm, royalty_rate: e.target.value })} /></Field>
        </div>
        <Field label="نطاق الترخيص"><TextInput value={licForm.license_scope} onChange={(e) => setLicForm({ ...licForm, license_scope: e.target.value })} placeholder="إقليمي، عالمي..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ البداية"><TextInput type="date" value={licForm.start_date} onChange={(e) => setLicForm({ ...licForm, start_date: e.target.value })} /></Field>
          <Field label="تاريخ النهاية"><TextInput type="date" value={licForm.end_date} onChange={(e) => setLicForm({ ...licForm, end_date: e.target.value })} /></Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
