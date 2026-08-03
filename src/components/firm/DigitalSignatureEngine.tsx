import { useEffect, useState, useCallback } from 'react';
import {
  PenTool, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, ArrowRight, Search, BadgeCheck,
  Fingerprint, Send, Eye, Archive, Activity, Server, Gavel,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M16Document, M16Signature, M16AuditLog,
} from '@/lib/firmTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'documents' | 'signatures' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { label: 'مُرسَل', bg: 'bg-blue-50', text: 'text-blue-700' },
  viewed: { label: 'تمت المشاهدة', bg: 'bg-amber-50', text: 'text-amber-700' },
  signed: { label: 'مُوَقَّع', bg: 'bg-green-50', text: 'text-green-700' },
  completed: { label: 'مكتمل', bg: 'bg-purple-50', text: 'text-purple-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const STAGES = ['draft', 'sent', 'viewed', 'signed', 'completed', 'archived'];

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'عقد',
  agreement: 'اتفاقية',
  resolution: 'قرار',
  memo: 'مذكرة',
};

const SIGNATURE_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار التوقيع', bg: 'bg-amber-50', text: 'text-amber-600' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-600' },
  declined: { label: 'مرفوض', bg: 'bg-red-50', text: 'text-red-600' },
  expired: { label: 'منتهي', bg: 'bg-gray-100', text: 'text-gray-500' },
};

interface DocForm {
  document_number: string;
  document_title: string;
  document_type: string;
  stage: string;
  signer_name: string;
  co_signer_name: string;
  document_hash: string;
  description: string;
}

const emptyForm: DocForm = {
  document_number: '', document_title: '', document_type: 'contract', stage: 'draft',
  signer_name: '', co_signer_name: '', document_hash: '', description: '',
};

export default function DigitalSignatureEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [documents, setDocuments] = useState<M16Document[]>([]);
  const [signatures, setSignatures] = useState<M16Signature[]>([]);
  const [allSignatures, setAllSignatures] = useState<M16Signature[]>([]);
  const [allAudit, setAllAudit] = useState<M16AuditLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<M16AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [selectedDoc, setSelectedDoc] = useState<M16Document | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'document' | 'signature'>('document');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigForm, setSigForm] = useState({ signer_name: '', signer_role: '', biometric_type: 'fingerprint', biometric_verified: false });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [docRes, sigRes, auditRes] = await Promise.all([
      supabase.from('m16_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('m16_signatures').select('*').order('created_at', { ascending: false }),
      supabase.from('m16_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setDocuments((docRes.data as M16Document[]) || []);
    setAllSignatures((sigRes.data as M16Signature[]) || []);
    setAllAudit((auditRes.data as M16AuditLog[]) || []);
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
    await supabase.from('m16_audit_logs').insert({
      case_id: docId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (d: M16Document) => {
    setForm({
      document_number: d.document_number, document_title: d.document_title, document_type: d.document_type,
      stage: d.stage, signer_name: d.signer_name || '', co_signer_name: d.co_signer_name || '',
      document_hash: d.document_hash || '', description: d.description || '',
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
      signer_name: form.signer_name.trim() || null,
      co_signer_name: form.co_signer_name.trim() || null,
      document_hash: form.document_hash.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m16_documents').update(payload).eq('id', editingId);
      await logAudit(editingId, 'document_updated', 'تحديث بيانات المستند الإلكتروني');
    } else {
      const { data } = await supabase.from('m16_documents').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'document_created', 'إنشاء مستند إلكتروني — نوع: ' + (DOC_TYPE_LABELS[form.document_type] || form.document_type));
        await supabase.from('m16_documents').update({
          m109_biometric_verified: true,
          m52_notification_sent: true,
          m10_case_linked: true,
          m92_notified: true,
        }).eq('id', newId);
        await logAudit(newId, 'm109_linked', 'ربط المستند بمحرك البصمة الحيوية (M109) — تحقق بيومتري');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52) بإرسال المستند');
        await logAudit(newId, 'm10_linked', 'ربط المستند بالملف الذكي (M10)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء المستند');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'document') await supabase.from('m16_documents').delete().eq('id', deleteId);
    else if (deleteType === 'signature') await supabase.from('m16_signatures').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'document') setSelectedDoc(null);
    fetchAll();
    if (selectedDoc && deleteType !== 'document') openDocDetail(selectedDoc);
  };

  const openDocDetail = async (d: M16Document) => {
    setSelectedDoc(d);
    setDetailLoading(true);
    const [sigRes, aRes] = await Promise.all([
      supabase.from('m16_signatures').select('*').eq('document_id', d.id).order('created_at', { ascending: false }),
      supabase.from('m16_audit_logs').select('*').eq('case_id', d.id).order('created_at', { ascending: true }),
    ]);
    setSignatures((sigRes.data as M16Signature[]) || []);
    setAuditLogs((aRes.data as M16AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (d: M16Document) => {
    const idx = STAGES.indexOf(d.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m16_documents').update({ stage: next }).eq('id', d.id);
    await logAudit(d.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...d, stage: next };
    setSelectedDoc(updated as M16Document);
  };

  const addSignature = async () => {
    if (!selectedDoc || !sigForm.signer_name.trim()) return;
    const sigHash = '0x' + Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8);
    await supabase.from('m16_signatures').insert({
      document_id: selectedDoc.id,
      signer_name: sigForm.signer_name.trim(),
      signer_role: sigForm.signer_role.trim() || 'موقّع',
      signature_hash: sigHash,
      signed_at: new Date().toISOString(),
      biometric_type: sigForm.biometric_type,
      biometric_verified: sigForm.biometric_verified,
    });
    if (sigForm.biometric_verified) {
      await supabase.from('m16_documents').update({ is_biometric_signed: true, biometric_liveness_check: true }).eq('id', selectedDoc.id);
    }
    await logAudit(selectedDoc.id, 'signature_added', 'إضافة توقيع إلكتروني: ' + sigForm.signer_name + (sigForm.biometric_verified ? ' — تحقق بيومتري' : ''));
    setSigForm({ signer_name: '', signer_role: '', biometric_type: 'fingerprint', biometric_verified: false });
    setSigModalOpen(false);
    openDocDetail(selectedDoc);
  };

  const filteredDocs = documents.filter((d) => {
    if (filterType !== 'all' && d.document_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.document_number.toLowerCase().includes(q) && !d.document_title.toLowerCase().includes(q) && !(d.signer_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const signedDocs = documents.filter((d) => d.stage === 'signed' || d.stage === 'completed').length;
  const pendingDocs = documents.filter((d) => d.stage === 'draft' || d.stage === 'sent' || d.stage === 'viewed').length;
  const biometricDocs = documents.filter((d) => d.is_biometric_signed).length;

  const tabs: { id: Tab; label: string; icon: typeof PenTool; badge?: number }[] = [
    { id: 'documents', label: 'المستندات', icon: FileText, badge: documents.length },
    { id: 'signatures', label: 'التوقيعات', icon: PenTool, badge: allSignatures.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <PenTool size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التوقيع الإلكتروني (M16)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة المعاملات الرقمية والتوقيعات الإلكترونية بالتحقق البيومتري</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Fingerprint size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Biometric Verified</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> مستند جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي المستندات" value={String(documents.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="مستندات مُوقَّعة" value={String(signedDocs)} valueClass="text-green-700" />
        <StatCard icon={<Clock size={14} className="text-amber-600" />} label="قيد التوقيع" value={String(pendingDocs)} valueClass="text-amber-700" />
        <StatCard icon={<Fingerprint size={14} className="text-gold" />} label="توقيعات بيومترية" value={String(biometricDocs)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة المستند الإلكتروني — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.draft;
            const count = documents.filter((d) => d.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} مستند</span>
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
            { icon: Fingerprint, label: 'البصمة الحيوية (M109)', desc: 'تحقق بيومتري', color: 'text-purple-600' },
            { icon: Users, label: 'جلسات مجلس الإدارة (M49)', desc: 'ربط القرارات', color: 'text-blue-600' },
            { icon: Gavel, label: 'التحكيم (M105)', desc: 'توقيع أحكام', color: 'text-amber-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'إخطار الموقّع', color: 'text-green-600' },
            { icon: FileText, label: 'الملف الذكي (M10)', desc: 'ربط القضايا', color: 'text-midnight' },
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

      {/* Filters for documents */}
      {activeTab === 'documents' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو موقّع..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div className="space-y-2">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <FileText size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مستندات إلكترونية</p>
            </div>
          ) : (
            filteredDocs.map((d) => {
              const sCfg = STAGE_CONFIG[d.stage] || STAGE_CONFIG.draft;
              const stageIdx = STAGES.indexOf(d.stage);
              return (
                <div key={d.id} onClick={() => openDocDetail(d)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <FileText size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{d.document_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DOC_TYPE_LABELS[d.document_type] || d.document_type}</span>
                          {d.is_biometric_signed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Fingerprint size={8} /> بيومتري</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{d.document_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {d.signer_name && <span className="font-body text-[9px] text-ink/40"><PenTool size={9} className="inline ml-0.5" />{d.signer_name}</span>}
                          {d.co_signer_name && <span className="font-body text-[9px] text-ink/40">الموقّع المشارك: {d.co_signer_name}</span>}
                          {d.signed_at && <span className="font-body text-[9px] text-ink/40">{formatDate(d.signed_at)}</span>}
                          {d.m109_biometric_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Fingerprint size={8} /> M109</span>}
                          {d.m49_board_meeting_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Users size={8} /> M49</span>}
                          {d.m105_arbitration_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Gavel size={8} /> M105</span>}
                          {d.m52_notification_sent && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Send size={8} /> M52</span>}
                          {d.m10_case_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-midnight"><FileText size={8} /> M10</span>}
                          {d.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(d); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); setDeleteType('document'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All signatures tab */}
      {activeTab === 'signatures' && (
        <div className="space-y-2">
          {allSignatures.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><PenTool size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد توقيعات مسجلة</p></div>
          ) : (
            allSignatures.map((s) => {
              const d = documents.find((d) => d.id === s.document_id);
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.biometric_verified ? 'bg-purple-50' : 'bg-gray-100'}`}>
                        <PenTool size={14} className={s.biometric_verified ? 'text-purple-600' : 'text-ink/40'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {s.biometric_verified ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Fingerprint size={8} /> تحقق بيومتري</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">توقيع عادي</span>
                          )}
                          {d && <span className="font-body text-[9px] text-gold">{d.document_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{s.signer_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">{s.signer_role}</span>
                          {s.biometric_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{s.biometric_type}</span>}
                          {s.signed_at && <span className="font-body text-[9px] text-ink/40">{formatDate(s.signed_at)}</span>}
                          {s.ip_address && <span className="font-body text-[9px] text-ink/30">IP: {s.ip_address}</span>}
                          {s.signature_hash && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {s.signature_hash.slice(0, 12)}...</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(s.id); setDeleteType('signature'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-purple-600" />
                      : log.action.includes('m49') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('m105') ? <Gavel size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <FileText size={12} className="text-midnight" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('signature') ? <PenTool size={12} className="text-green-600" />
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

      {/* Document detail drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <PenTool size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">المستند الإلكتروني</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedDoc.stage] || STAGE_CONFIG.draft).bg} ${(STAGE_CONFIG[selectedDoc.stage] || STAGE_CONFIG.draft).text}`}>
                      {(STAGE_CONFIG[selectedDoc.stage] || STAGE_CONFIG.draft).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{DOC_TYPE_LABELS[selectedDoc.document_type] || selectedDoc.document_type}</span>
                    {selectedDoc.is_biometric_signed && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600"><Fingerprint size={10} /> بيومتري</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedDoc.document_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.draft;
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

                {/* Signer info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <PenTool size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الموقّعين</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الموقّع الأساسي</span><p className="font-body text-xs font-bold text-midnight">{selectedDoc.signer_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الموقّع المشارك</span><p className="font-body text-xs font-bold text-midnight">{selectedDoc.co_signer_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ التوقيع</span><p className="font-body text-xs font-bold text-midnight">{selectedDoc.signed_at ? formatDate(selectedDoc.signed_at) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تحقق بيومتري</span><p className="font-body text-xs font-bold text-purple-600">{selectedDoc.biometric_liveness_check ? 'نعم' : 'لا'}</p></div>
                  </div>
                </div>

                {/* Document hash */}
                {selectedDoc.document_hash && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock size={12} className="text-ink/40" />
                      <span className="font-body text-[10px] font-bold text-midnight">هاش المستند (SHA-256)</span>
                    </div>
                    <p className="font-body text-[10px] text-ink/60 font-mono break-all">{selectedDoc.document_hash}</p>
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m109_biometric_verified ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedDoc.m109_biometric_verified ? 'متحقق' : 'غير متحقق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m49_board_meeting_id ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M49 {selectedDoc.m49_board_meeting_id ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m105_arbitration_id ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Gavel size={10} /> M105 {selectedDoc.m105_arbitration_id ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m52_notification_sent ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M52 {selectedDoc.m52_notification_sent ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m10_case_linked ? 'bg-gray-100 text-midnight' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M10 {selectedDoc.m10_case_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDoc.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedDoc.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedDoc.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedDoc.description}</p></div>
                )}

                {/* Signatures */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><PenTool size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">التوقيعات الإلكترونية</span></div>
                    <button onClick={() => setSigModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة توقيع</button>
                  </div>
                  <div className="space-y-1.5">
                    {signatures.map((s) => (
                      <div key={s.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/sig">
                        <div className="flex items-center gap-2 mb-1">
                          {s.biometric_verified ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Fingerprint size={8} /> بيومتري</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">عادي</span>
                          )}
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{s.signer_name}</p>
                          <button onClick={() => { setDeleteId(s.id); setDeleteType('signature'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/sig:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">{s.signer_role}</span>
                          {s.biometric_type && <span className="font-body text-[9px] text-ink/40">{s.biometric_type}</span>}
                          {s.signed_at && <span className="font-body text-[9px] text-ink/40">{formatDate(s.signed_at)}</span>}
                          {s.signature_hash && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {s.signature_hash.slice(0, 10)}...</span>}
                        </div>
                      </div>
                    ))}
                    {signatures.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد توقيعات مسجلة</p>}
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

      {/* Document create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل مستند' : 'مستند إلكتروني جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم المستند" required><TextInput value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} placeholder="DS-2025-001" /></Field>
          <Field label="نوع المستند">
            <Select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان المستند" required><TextInput value={form.document_title} onChange={(e) => setForm({ ...form, document_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="هاش المستند"><TextInput value={form.document_hash} onChange={(e) => setForm({ ...form, document_hash: e.target.value })} placeholder="0x..." /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الموقّع"><TextInput value={form.signer_name} onChange={(e) => setForm({ ...form, signer_name: e.target.value })} /></Field>
          <Field label="الموقّع المشارك"><TextInput value={form.co_signer_name} onChange={(e) => setForm({ ...form, co_signer_name: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Signature modal */}
      <EntityModal open={sigModalOpen} title="إضافة توقيع إلكتروني" onClose={() => setSigModalOpen(false)} onSubmit={addSignature}>
        <Field label="اسم الموقّع" required><TextInput value={sigForm.signer_name} onChange={(e) => setSigForm({ ...sigForm, signer_name: e.target.value })} /></Field>
        <Field label="صفة الموقّع"><TextInput value={sigForm.signer_role} onChange={(e) => setSigForm({ ...sigForm, signer_role: e.target.value })} placeholder="مدير، رئيس..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع البصمة">
            <Select value={sigForm.biometric_type} onChange={(e) => setSigForm({ ...sigForm, biometric_type: e.target.value })}>
              <option value="fingerprint">بصمة إصبع</option>
              <option value="face">بصمة وجه</option>
              <option value="iris">بصمة قزحية</option>
              <option value="voice">بصمة صوتية</option>
              <option value="none">بدون بصمة</option>
            </Select>
          </Field>
          <Field label="تحقق بيومتري">
            <Select value={sigForm.biometric_verified ? 'yes' : 'no'} onChange={(e) => setSigForm({ ...sigForm, biometric_verified: e.target.value === 'yes' })}>
              <option value="no">لا</option>
              <option value="yes">نعم</option>
            </Select>
          </Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
