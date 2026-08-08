import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, FileText, ScanText, Lock, Languages,
  FolderArchive, Mic, Fingerprint, GitCompare, Database, Building2, Cpu,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'capture' | 'editor' | 'compliance' | 'audit';

/* ============================ Config objects ============================ */

const CAPTURE_STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ingestion: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  ocr_processing: { label: 'معالجة OCR', bg: 'bg-amber-50', text: 'text-amber-700' },
  metadata_extracted: { label: 'استخراج البيانات', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  routing_suggested: { label: 'التوجيه المقترح', bg: 'bg-purple-50', text: 'text-purple-700' },
  human_review: { label: 'المراجعة البشرية', bg: 'bg-orange-50', text: 'text-orange-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-700' },
};
const CAPTURE_STAGES = ['ingestion', 'ocr_processing', 'metadata_extracted', 'routing_suggested', 'human_review', 'archived'];

const EDITOR_STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  editing: { label: 'تحرير', bg: 'bg-amber-50', text: 'text-amber-700' },
  reviewing: { label: 'مراجعة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  approved: { label: 'اعتماد', bg: 'bg-green-50', text: 'text-green-700' },
  signed: { label: 'توقيع', bg: 'bg-purple-50', text: 'text-purple-700' },
  archived: { label: 'أرشفة', bg: 'bg-gray-100', text: 'text-gray-700' },
};
const EDITOR_STAGES = ['draft', 'editing', 'reviewing', 'approved', 'signed', 'archived'];

const COMPLIANCE_RESULT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  compliant: { label: 'ممتثل', bg: 'bg-green-50', text: 'text-green-700' },
  flagged: { label: 'مُعلّم', bg: 'bg-amber-50', text: 'text-amber-700' },
  blocked: { label: 'محظور', bg: 'bg-red-50', text: 'text-red-700' },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  unclassified: 'غير مصنّف', lease_contract: 'عقد إيجار', court_judgment: 'حكم قضائي',
  invoice: 'فاتورة', passport: 'جواز سفر', contract: 'عقد', legal_memo: 'مذكرة قانونية',
};
const SOURCE_CHANNEL_LABELS: Record<string, string> = {
  web_upload: 'رفع ويب', camera_capture: 'التقاط كاميرا', email_import: 'استيراد بريد', api_ingestion: 'استقبال API',
};
const OCR_LANGUAGE_LABELS: Record<string, string> = { arabic: 'العربية', english: 'الإنجليزية', bilingual: 'ثنائي اللغة' };
const FORMAT_LABELS: Record<string, string> = { docx: 'Word (DOCX)', md: 'Markdown (MD)', xlsx: 'Excel (XLSX)', pptx: 'PowerPoint (PPTX)', pdf: 'PDF' };

const ROUTING_MODULE_LABELS: Record<string, string> = {
  m22_real_estate: 'العقارات (M22)', m25_strategic_finance: 'التمويل الاستراتيجي (M25)',
  m46_knowledge: 'المعرفة (M46)', m48_archiver: 'الأرشفة (M48)', m50_risk: 'المخاطر (M50)',
  m54_finance: 'المالية (M54)', m60_corporate: 'الشركات (M60)', m66_engineering: 'الهندسة (M66)',
  m92_agent: 'الوكيل الذكي (M92)',
};
const CHECK_TYPE_LABELS: Record<string, string> = {
  aml_check: 'فحص غسيل الأموال (AML)', contract_risk: 'مخاطر العقد',
  data_protection: 'حماية البيانات', legal_compliance: 'الامتثال القانوني',
};
const RESOLUTION_STATUS_LABELS: Record<string, string> = { pending: 'قيد المعالجة', resolved: 'تم الحل', overridden: 'تم تجاوزه' };

/* ============================ Interfaces ============================ */

interface IntegratedDocument {
  id: string; document_number: string; document_title: string; document_type: string; stage: string;
  source_channel: string; ocr_processed: boolean | null; ocr_language: string | null;
  extracted_metadata: string | null; routing_suggestion: string | null; routing_target_module: string | null;
  human_approved: boolean | null; approved_by: string | null; encrypted: boolean | null;
  sha3_hash: string | null; description: string | null; created_at: string;
  advisor?: { name: string } | null;
}
interface EditedDocument {
  id: string; document_number: string; document_title: string; document_format: string; stage: string;
  template_used: boolean | null; template_name: string | null; version_number: number | null;
  track_changes: boolean | null; voice_dictated: boolean | null; encrypted: boolean | null;
  sha3_hash: string | null; description: string | null; created_at: string;
  advisor?: { name: string } | null;
}
interface ComplianceCheck {
  id: string; document_id: string | null; check_type: string; check_result: string;
  risks_found: string[] | null; risk_details: string | null; checked_by: string | null;
  checked_at: string | null; resolution_status: string | null; resolution_notes: string | null; created_at: string;
}
interface AuditLog {
  id: string; case_id: string | null; action: string; actor: string | null; actor_role: string | null;
  detail: string | null; hash_chain: string | null; accessed_fields: string | null; created_at: string;
}

/* ============================ Forms ============================ */

interface CaptureForm {
  document_number: string; document_title: string; document_type: string; stage: string; source_channel: string;
  ocr_processed: boolean; ocr_language: string; extracted_metadata: string; routing_suggestion: string;
  routing_target_module: string; human_approved: boolean; approved_by: string; encrypted: boolean; sha3_hash: string; description: string;
}
const emptyCaptureForm: CaptureForm = {
  document_number: '', document_title: '', document_type: 'unclassified', stage: 'ingestion', source_channel: 'web_upload',
  ocr_processed: false, ocr_language: 'arabic', extracted_metadata: '', routing_suggestion: '', routing_target_module: '',
  human_approved: false, approved_by: '', encrypted: false, sha3_hash: '', description: '',
};
interface EditorForm {
  document_number: string; document_title: string; document_format: string; stage: string; template_used: boolean;
  template_name: string; version_number: number; track_changes: boolean; voice_dictated: boolean; encrypted: boolean; sha3_hash: string; description: string;
}
const emptyEditorForm: EditorForm = {
  document_number: '', document_title: '', document_format: 'docx', stage: 'draft', template_used: false,
  template_name: '', version_number: 1, track_changes: false, voice_dictated: false, encrypted: false, sha3_hash: '', description: '',
};
interface ComplianceForm {
  document_id: string; check_type: string; content_sample: string; checked_by: string; resolution_status: string; resolution_notes: string;
}
const emptyComplianceForm: ComplianceForm = {
  document_id: '', check_type: 'aml_check', content_sample: '', checked_by: '', resolution_status: 'pending', resolution_notes: '',
};

/* ============================ Smart routing ============================ */

function suggestRouting(text: string): string {
  const t = (text || '').toLowerCase();
  if (/(مستشفى|طبي|medical|hospital|علاج|صحة)/.test(t)) return 'm25_strategic_finance';
  if (/(شركة|أسهم|حصص|company|shares|corporate|تأسيس)/.test(t)) return 'm60_corporate';
  if (/(إيجار|عقار|lease|property|مبنى|أرض|عقاري)/.test(t)) return 'm22_real_estate';
  if (t.trim().length > 0) return 'm48_archiver';
  return '';
}

/* ============================ Compliance simulation ============================ */

function simulateCompliance(content: string, checkType: string): { result: string; risks: string[] } {
  const risks: string[] = [];
  const c = content || '';
  if (checkType === 'aml_check') {
    if (/غسيل\s*أموال|تحويل\s*خارجي\s*مجهول/.test(c)) risks.push('اشتباه في غسيل الأموال', 'تحويل خارجي مجهول المصدر');
    if (/مبلغ\s*كبير\s*نقدي|cash\s*deposit/i.test(c)) risks.push('إيداع نقدي كبير');
  } else if (checkType === 'contract_risk') {
    if (/بدون\s*ضمان|بلا\s*ضمان/.test(c)) risks.push('عقد بدون ضمان');
    if (/مبلغ\s*مفتوح|open\s*amount/i.test(c)) risks.push('مبلغ مفتوح غير محدد');
  } else if (checkType === 'data_protection') {
    if (/رقم\s*هوية|جواز\s*سفر|بيانات\s*شخصية/.test(c)) risks.push('بيانات شخصية حساسة بدون تشفير');
  } else if (checkType === 'legal_compliance') {
    if (/شرط\s*جزائي|غرامة\s*مخالفة/.test(c)) risks.push('شرط جزائي غير متوازن');
  }
  return { result: risks.length > 0 ? 'flagged' : 'compliant', risks };
}

/* ============================ Shared sub-components ============================ */

function auditIcon(action: string) {
  if (action.includes('created')) return <ScanText size={12} className="text-blue-600" />;
  if (action.includes('routing')) return <ArrowRight size={12} className="text-purple-600" />;
  if (action.includes('ocr')) return <Languages size={12} className="text-amber-600" />;
  if (action.includes('approved')) return <CheckCircle2 size={12} className="text-green-600" />;
  if (action.includes('encrypted')) return <Lock size={12} className="text-purple-600" />;
  if (action.includes('compliance')) return <Shield size={12} className="text-amber-600" />;
  if (action.includes('risk')) return <AlertTriangle size={12} className="text-red-600" />;
  if (action.includes('voice')) return <Mic size={12} className="text-orange-600" />;
  if (action.includes('m10')) return <Server size={12} className="text-blue-600" />;
  if (action.includes('m48')) return <FolderArchive size={12} className="text-purple-600" />;
  if (action.includes('m109')) return <Fingerprint size={12} className="text-green-600" />;
  if (action.includes('m92')) return <Cpu size={12} className="text-amber-600" />;
  if (action.includes('stage')) return <ArrowRight size={12} className="text-gold" />;
  return <Activity size={12} className="text-ink/40" />;
}

function StagePipeline({ stages, config, counts, title }: {
  stages: string[]; config: Record<string, { label: string }>; counts: Record<string, number>; title: string;
}) {
  return (
    <div className="bg-midnight rounded-xl p-4 border border-gold/20">
      <div className="flex items-center gap-2 mb-3">
        <CircuitBoard size={14} className="text-gold" />
        <span className="font-heading font-bold text-cream text-xs">{title}</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {stages.map((stage, i) => {
          const cfg = config[stage] || config[stages[0]];
          return (
            <div key={stage} className="flex items-center gap-1 flex-shrink-0">
              <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                </div>
                <span className="font-body text-[9px] text-cream/40">{counts[stage] || 0} مستند</span>
              </div>
              {i < stages.length - 1 && <ArrowRight size={12} className="text-gold/30 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageProgress({ stages, config, current }: {
  stages: string[]; config: Record<string, { label: string }>; current: string;
}) {
  const stageIdx = stages.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => {
        const c = config[s] || config[stages[0]];
        const isActive = i === stageIdx;
        const isPast = i < stageIdx;
        return (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${isPast || isActive ? 'bg-gold' : 'bg-gray-200'} ${isActive ? 'animate-pulse' : ''}`} />
            <p className={`font-body text-[8px] mt-1 text-center ${isActive ? 'text-gold font-bold' : 'text-ink/30'}`}>{c.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function AuditTrail({ logs }: { logs: AuditLog[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2"><Shield size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق</span></div>
      <div className="space-y-1.5">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 text-[10px]">
            <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-body text-ink/60">{log.action}</span>
              {log.detail && <p className="font-body text-ink/40 leading-tight">{log.detail}</p>}
              <div className="flex items-center gap-2">
                <span className="font-body text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                {log.hash_chain && <span className="font-mono text-ink/30">{log.hash_chain}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocRow({ onClick, onEdit, onDelete, children }: {
  onClick: () => void; onEdit: (e: React.MouseEvent) => void; onDelete: (e: React.MouseEvent) => void; children: React.ReactNode;
}) {
  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">{children}</div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
            <button onClick={onDelete} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
          </div>
          <ChevronRight size={14} className="text-ink/20 group-hover:text-gold transition-colors" />
        </div>
      </div>
    </div>
  );
}

function StageDots({ stages, stageIdx }: { stages: string[]; stageIdx: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {stages.map((s, i) => (
        <span key={s} className={`w-1.5 h-1.5 rounded-full ${i <= stageIdx ? 'bg-gold' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
      <div className="text-ink/15 mx-auto mb-2 flex justify-center">{icon}</div>
      <p className="font-body text-xs text-ink/30">{label}</p>
    </div>
  );
}

/* ============================ Component ============================ */

export default function IntegratedDocumentEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [captureDocs, setCaptureDocs] = useState<IntegratedDocument[]>([]);
  const [editorDocs, setEditorDocs] = useState<EditedDocument[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [allAudit, setAllAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const [selectedDoc, setSelectedDoc] = useState<IntegratedDocument | EditedDocument | null>(null);
  const [selectedDocKind, setSelectedDocKind] = useState<'capture' | 'editor' | null>(null);
  const [detailAudit, setDetailAudit] = useState<AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<'capture' | 'editor' | 'compliance'>('capture');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captureForm, setCaptureForm] = useState<CaptureForm>(emptyCaptureForm);
  const [editorForm, setEditorForm] = useState<EditorForm>(emptyEditorForm);
  const [complianceForm, setComplianceForm] = useState<ComplianceForm>(emptyComplianceForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteKind, setDeleteKind] = useState<'capture' | 'editor' | 'compliance'>('capture');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCaptureType, setFilterCaptureType] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterCheckType, setFilterCheckType] = useState('all');
  const [filterResult, setFilterResult] = useState('all');

  /* ---------------- Fetch ---------------- */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [capRes, edRes, compRes, auditRes] = await Promise.all([
      supabase.from('m47_document_records').select('*, advisor:lf_attorneys(name)').order('created_at', { ascending: false }),
      supabase.from('m53_documents').select('*, advisor:lf_attorneys(name)').order('created_at', { ascending: false }),
      supabase.from('m47_compliance_checks').select('*').order('created_at', { ascending: false }),
      supabase.from('m47_audit_logs').select('*').order('created_at', { ascending: false }).limit(80),
    ]);
    if (capRes.error) console.error('m47 fetch error', capRes.error);
    if (edRes.error) console.error('m53 fetch error', edRes.error);
    if (compRes.error) console.error('compliance fetch error', compRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setCaptureDocs((capRes.data as IntegratedDocument[]) || []);
    setEditorDocs((edRes.data as EditedDocument[]) || []);
    setComplianceChecks((compRes.data as ComplianceCheck[]) || []);
    setAllAudit((auditRes.data as AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setCaptureForm({ ...emptyCaptureForm, document_title: cmd.fields.title || '' });
      setModalKind('capture'); setEditingId(null); setModalOpen(true);
    }
  }, [voiceAdd]);

  /* ---------------- Audit helper ---------------- */
  const logAudit = async (docId: string, action: string, detail: string, accessedFields?: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 6) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m47_audit_logs').insert({
      case_id: docId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash, accessed_fields: accessedFields || null,
    });
    if (error) console.error('audit log error', error);
  };

  /* ---------------- Capture CRUD ---------------- */
  const openAddCapture = () => { setCaptureForm(emptyCaptureForm); setModalKind('capture'); setEditingId(null); setModalOpen(true); };
  const openEditCapture = (d: IntegratedDocument) => {
    setCaptureForm({
      document_number: d.document_number, document_title: d.document_title, document_type: d.document_type, stage: d.stage,
      source_channel: d.source_channel, ocr_processed: d.ocr_processed || false, ocr_language: d.ocr_language || 'arabic',
      extracted_metadata: d.extracted_metadata || '', routing_suggestion: d.routing_suggestion || '', routing_target_module: d.routing_target_module || '',
      human_approved: d.human_approved || false, approved_by: d.approved_by || '', encrypted: d.encrypted || false,
      sha3_hash: d.sha3_hash || '', description: d.description || '',
    });
    setModalKind('capture'); setEditingId(d.id); setModalOpen(true);
  };

  const handleSaveCapture = async () => {
    if (!captureForm.document_title.trim() || !captureForm.document_number.trim()) return;
    setSaving(true);
    const suggestion = suggestRouting(captureForm.extracted_metadata + ' ' + captureForm.document_title + ' ' + captureForm.routing_suggestion);
    const routingModule = captureForm.routing_target_module || suggestion;
    const payload = {
      document_number: captureForm.document_number.trim(), document_title: captureForm.document_title.trim(),
      document_type: captureForm.document_type, stage: captureForm.stage, status: captureForm.stage === 'archived' ? 'archived' : 'active',
      source_channel: captureForm.source_channel, ocr_processed: captureForm.ocr_processed, ocr_language: captureForm.ocr_language,
      extracted_metadata: captureForm.extracted_metadata.trim() || null, routing_suggestion: captureForm.routing_suggestion.trim() || null,
      routing_target_module: routingModule || null, human_approved: captureForm.human_approved,
      approved_by: captureForm.human_approved ? (captureForm.approved_by.trim() || null) : null,
      encrypted: captureForm.encrypted, sha3_hash: captureForm.sha3_hash.trim() || null, description: captureForm.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m47_document_records').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'capture_updated', 'تحديث مستند ملتقط', 'document_title,stage,routing');
    } else {
      const { data, error } = await supabase.from('m47_document_records').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'capture_created', 'التقاط مستند جديد — النوع: ' + (DOC_TYPE_LABELS[captureForm.document_type] || captureForm.document_type));
        if (routingModule) await logAudit(newId, 'routing_suggested', 'توجيه تلقائي إلى ' + (ROUTING_MODULE_LABELS[routingModule] || routingModule), 'routing_target_module');
        if (captureForm.ocr_processed) await logAudit(newId, 'ocr_processed', 'معالجة OCR — اللغة: ' + (OCR_LANGUAGE_LABELS[captureForm.ocr_language] || captureForm.ocr_language));
        if (captureForm.encrypted) await logAudit(newId, 'encrypted', 'تشفير المستند (AES-256)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بالتقاط المستند');
      }
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  /* ---------------- Editor CRUD ---------------- */
  const openAddEditor = () => { setEditorForm(emptyEditorForm); setModalKind('editor'); setEditingId(null); setModalOpen(true); };
  const openEditEditor = (d: EditedDocument) => {
    setEditorForm({
      document_number: d.document_number, document_title: d.document_title, document_format: d.document_format, stage: d.stage,
      template_used: d.template_used || false, template_name: d.template_name || '', version_number: d.version_number || 1,
      track_changes: d.track_changes || false, voice_dictated: d.voice_dictated || false, encrypted: d.encrypted || false,
      sha3_hash: d.sha3_hash || '', description: d.description || '',
    });
    setModalKind('editor'); setEditingId(d.id); setModalOpen(true);
  };

  const handleSaveEditor = async () => {
    if (!editorForm.document_title.trim() || !editorForm.document_number.trim()) return;
    setSaving(true);
    const payload = {
      document_number: editorForm.document_number.trim(), document_title: editorForm.document_title.trim(),
      document_format: editorForm.document_format, stage: editorForm.stage, status: editorForm.stage === 'archived' ? 'archived' : 'active',
      template_used: editorForm.template_used, template_name: editorForm.template_used ? (editorForm.template_name.trim() || null) : null,
      version_number: editorForm.version_number, track_changes: editorForm.track_changes, voice_dictated: editorForm.voice_dictated,
      encrypted: editorForm.encrypted, sha3_hash: editorForm.sha3_hash.trim() || null, description: editorForm.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m53_documents').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'editor_updated', 'تحرير مستند سيادي', 'document_title,stage,version');
    } else {
      const { data, error } = await supabase.from('m53_documents').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'editor_created', 'إنشاء مستند سيادي — الصيغة: ' + (FORMAT_LABELS[editorForm.document_format] || editorForm.document_format));
        await logAudit(newId, 'm10_case', 'ربط المستند بالمحرك الموحد (M10)');
        if (editorForm.voice_dictated) await logAudit(newId, 'voice_dictated', 'إنشاء المستند بالإملاء الصوتي');
        if (editorForm.encrypted) await logAudit(newId, 'm48_archive', 'تشفير المستند وتأمينه (M48)');
        if (editorForm.stage === 'signed') await logAudit(newId, 'm109_biometric', 'توقيع المستند بالبصمة الحيوية (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء المستند');
      }
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  /* ---------------- Compliance CRUD ---------------- */
  const openAddCompliance = () => { setComplianceForm(emptyComplianceForm); setModalKind('compliance'); setEditingId(null); setModalOpen(true); };
  const openEditCompliance = (c: ComplianceCheck) => {
    setComplianceForm({
      document_id: c.document_id || '', check_type: c.check_type, content_sample: c.risk_details || '',
      checked_by: c.checked_by || '', resolution_status: c.resolution_status || 'pending', resolution_notes: c.resolution_notes || '',
    });
    setModalKind('compliance'); setEditingId(c.id); setModalOpen(true);
  };

  const handleSaveCompliance = async () => {
    if (!complianceForm.document_id.trim()) return;
    setSaving(true);
    const sim = simulateCompliance(complianceForm.content_sample, complianceForm.check_type);
    const payload = {
      document_id: complianceForm.document_id.trim(), check_type: complianceForm.check_type, check_result: sim.result,
      risks_found: sim.risks.length > 0 ? sim.risks : null, risk_details: complianceForm.content_sample.trim() || null,
      checked_by: complianceForm.checked_by.trim() || 'النظام', checked_at: new Date().toISOString(),
      resolution_status: complianceForm.resolution_status, resolution_notes: complianceForm.resolution_notes.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m47_compliance_checks').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'compliance_updated', 'تحديث فحص امتثال — النتيجة: ' + (COMPLIANCE_RESULT_CONFIG[sim.result]?.label || sim.result), 'check_result,risks_found');
    } else {
      const { data, error } = await supabase.from('m47_compliance_checks').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'compliance_check', 'فحص امتثال — ' + (CHECK_TYPE_LABELS[complianceForm.check_type] || complianceForm.check_type) + ' — النتيجة: ' + (COMPLIANCE_RESULT_CONFIG[sim.result]?.label || sim.result));
        if (sim.result === 'flagged') await logAudit(newId, 'risk_flagged', 'تم تعليم المستند بمخاطر: ' + sim.risks.join('، '), 'risks_found');
      }
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  /* ---------------- Delete ---------------- */
  const handleDelete = async () => {
    if (!deleteId) return;
    const table = deleteKind === 'capture' ? 'm47_document_records' : deleteKind === 'editor' ? 'm53_documents' : 'm47_compliance_checks';
    const { error } = await supabase.from(table).delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null); setSelectedDoc(null); fetchAll();
  };

  /* ---------------- Detail drawer ---------------- */
  const openDocDetail = async (d: IntegratedDocument | EditedDocument, kind: 'capture' | 'editor') => {
    setSelectedDoc(d); setSelectedDocKind(kind); setDetailLoading(true);
    const aRes = await supabase.from('m47_audit_logs').select('*').eq('case_id', d.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setDetailAudit((aRes.data as AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async () => {
    if (!selectedDoc || !selectedDocKind) return;
    const stages = selectedDocKind === 'capture' ? CAPTURE_STAGES : EDITOR_STAGES;
    const cfg = selectedDocKind === 'capture' ? CAPTURE_STAGE_CONFIG : EDITOR_STAGE_CONFIG;
    const table = selectedDocKind === 'capture' ? 'm47_document_records' : 'm53_documents';
    const idx = stages.indexOf(selectedDoc.stage);
    if (idx < 0 || idx >= stages.length - 1) return;
    const next = stages[idx + 1];
    const { error } = await supabase.from(table).update({ stage: next, status: next === 'archived' ? 'archived' : 'active' }).eq('id', selectedDoc.id);
    if (error) console.error('stage advance error', error);
    await logAudit(selectedDoc.id, selectedDocKind + '_stage_advanced', 'تقدم المرحلة: ' + (cfg[next]?.label || next));
    fetchAll();
    setSelectedDoc({ ...selectedDoc, stage: next } as IntegratedDocument | EditedDocument);
  };

  /* ---------------- Filters ---------------- */
  const filteredCapture = captureDocs.filter((d) => {
    if (filterCaptureType !== 'all' && d.document_type !== filterCaptureType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.document_number.toLowerCase().includes(q) && !d.document_title.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const filteredEditor = editorDocs.filter((d) => {
    if (filterFormat !== 'all' && d.document_format !== filterFormat) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.document_number.toLowerCase().includes(q) && !d.document_title.toLowerCase().includes(q) && !(d.template_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const filteredCompliance = complianceChecks.filter((c) => {
    if (filterCheckType !== 'all' && c.check_type !== filterCheckType) return false;
    if (filterResult !== 'all' && c.check_result !== filterResult) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(c.document_id || '').toLowerCase().includes(q) && !(c.risk_details || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  /* ---------------- Derived stats ---------------- */
  const ocrCount = captureDocs.filter((d) => d.ocr_processed).length;
  const approvedCount = captureDocs.filter((d) => d.human_approved).length;
  const routedCount = captureDocs.filter((d) => d.routing_target_module).length;
  const editorEncryptedCount = editorDocs.filter((d) => d.encrypted).length;
  const voiceCount = editorDocs.filter((d) => d.voice_dictated).length;
  const trackChangesCount = editorDocs.filter((d) => d.track_changes).length;
  const compliantCount = complianceChecks.filter((c) => c.check_result === 'compliant').length;
  const flaggedCount = complianceChecks.filter((c) => c.check_result === 'flagged').length;
  const blockedCount = complianceChecks.filter((c) => c.check_result === 'blocked').length;
  const pendingResolutionCount = complianceChecks.filter((c) => c.resolution_status === 'pending').length;
  const routingAuditCount = allAudit.filter((l) => l.action.includes('routing')).length;
  const complianceAuditCount = allAudit.filter((l) => l.action.includes('compliance') || l.action.includes('risk')).length;

  const captureCounts: Record<string, number> = {};
  CAPTURE_STAGES.forEach((s) => { captureCounts[s] = captureDocs.filter((d) => d.stage === s).length; });
  const editorCounts: Record<string, number> = {};
  EDITOR_STAGES.forEach((s) => { editorCounts[s] = editorDocs.filter((d) => d.stage === s).length; });

  const tabs: { id: Tab; label: string; icon: typeof ScanText; badge?: number }[] = [
    { id: 'capture', label: 'الالتقاط والتعرف', icon: ScanText, badge: captureDocs.length },
    { id: 'editor', label: 'التحرير والصياغة', icon: FileText, badge: editorDocs.length },
    { id: 'compliance', label: 'بوابة الامتثال', icon: Shield, badge: complianceChecks.length },
    { id: 'audit', label: 'سجل التدقيق السيادي', icon: Activity, badge: allAudit.length },
  ];

  const addLabel = activeTab === 'capture' ? 'مستند ملتقط' : activeTab === 'editor' ? 'مستند سيادي' : activeTab === 'compliance' ? 'فحص امتثال' : '';
  const openAdd = () => {
    if (activeTab === 'capture') openAddCapture();
    else if (activeTab === 'editor') openAddEditor();
    else if (activeTab === 'compliance') openAddCompliance();
  };

  const integrationMatrix = [
    { icon: Server, label: 'المحرك الموحد (M10)', desc: 'ربط القضية', color: 'text-blue-600' },
    { icon: FolderArchive, label: 'الأرشيف (M48)', desc: 'تشفير وأرشفة', color: 'text-purple-600' },
    { icon: Shield, label: 'محرك المخاطر (M50)', desc: 'فحص المخاطر', color: 'text-red-600' },
    { icon: Database, label: 'المحرك المالي (M54)', desc: 'ربط الأمانة', color: 'text-gold' },
    { icon: Cpu, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات الوصول', color: 'text-amber-600' },
    { icon: Fingerprint, label: 'البصمة الحيوية (M109)', desc: 'توقيع حيوي', color: 'text-green-600' },
  ];

  const routingSuggestions = [
    { kw: 'مستشفى / طبي', mod: 'm25_strategic_finance', icon: Activity, color: 'text-red-400' },
    { kw: 'شركة / أسهم', mod: 'm60_corporate', icon: Building2, color: 'text-blue-400' },
    { kw: 'إيجار / عقار', mod: 'm22_real_estate', icon: FileText, color: 'text-green-400' },
    { kw: 'افتراضي / عام', mod: 'm48_archiver', icon: FolderArchive, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center"><ScanText size={20} className="text-gold" /></div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك المستندات والامتثال المدمج</h2>
            <p className="font-body text-[10px] text-ink/40">دمج التعرف الذكي، التحرير السيادي، الأوامر الصوتية، والامتثال في نواة واحدة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" /><span className="font-body text-[10px] font-bold">M47 + M53 · ZK-Audit</span>
          </div>
          {activeTab !== 'audit' && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
              <Plus size={16} /> {addLabel} جديد
            </button>
          )}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3"><Zap size={14} className="text-gold" /><span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل (Integration Matrix)</span></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {integrationMatrix.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className={item.color} /><span className="font-body text-[10px] font-bold text-midnight">{item.label}</span></div>
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
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-gold border-gold' : 'text-ink/40 border-transparent hover:text-ink/60'}`}>
              <Icon size={14} /> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============ CAPTURE TAB ============ */}
      {activeTab === 'capture' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<ScanText size={14} className="text-midnight" />} label="إجمالي الملتقطات" value={String(captureDocs.length)} valueClass="text-midnight" />
            <StatCard icon={<Languages size={14} className="text-amber-600" />} label="معالجة OCR" value={String(ocrCount)} valueClass="text-amber-700" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="اعتماد بشري" value={String(approvedCount)} valueClass="text-green-700" />
            <StatCard icon={<ArrowRight size={14} className="text-purple-600" />} label="موجّه تلقائياً" value={String(routedCount)} valueClass="text-purple-700" />
          </div>

          {/* Smart routing suggestion */}
          <div className="bg-midnight rounded-xl p-4 border border-gold/20">
            <div className="flex items-center gap-2 mb-3"><CircuitBoard size={14} className="text-gold" /><span className="font-heading font-bold text-cream text-xs">التوجيه الذكي — اقتراح الوحدة المستهدفة</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {routingSuggestions.map((r, i) => {
                const Icon = r.icon;
                const count = captureDocs.filter((d) => d.routing_target_module === r.mod).length;
                return (
                  <div key={i} className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
                    <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className={r.color} /><span className="font-body text-[10px] font-bold text-cream/80">{r.kw}</span></div>
                    <p className="font-body text-[9px] text-gold">{ROUTING_MODULE_LABELS[r.mod]}</p>
                    <span className="font-body text-[9px] text-cream/40">{count} مستند</span>
                  </div>
                );
              })}
            </div>
          </div>

          <StagePipeline stages={CAPTURE_STAGES} config={CAPTURE_STAGE_CONFIG} counts={captureCounts} title="دورة الالتقاط — 6 مراحل" />

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={filterCaptureType} onChange={(e) => setFilterCaptureType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
              <option value="all">كل الأنواع</option>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان المستند..." className="!py-1.5 !text-xs pr-9" />
            </div>
          </div>

          {/* Capture list */}
          <div className="space-y-2">
            {filteredCapture.length === 0 ? (
              <EmptyState icon={<ScanText size={28} />} label="لا توجد مستندات ملتقطة" />
            ) : filteredCapture.map((d) => {
              const sCfg = CAPTURE_STAGE_CONFIG[d.stage] || CAPTURE_STAGE_CONFIG.ingestion;
              const stageIdx = CAPTURE_STAGES.indexOf(d.stage);
              return (
                <DocRow key={d.id} onClick={() => openDocDetail(d, 'capture')}
                  onEdit={(e) => { e.stopPropagation(); openEditCapture(d); }}
                  onDelete={(e) => { e.stopPropagation(); setDeleteId(d.id); setDeleteKind('capture'); }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}><FileText size={14} className={sCfg.text} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-gold">{d.document_number}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DOC_TYPE_LABELS[d.document_type] || d.document_type}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600">{SOURCE_CHANNEL_LABELS[d.source_channel] || d.source_channel}</span>
                      {d.ocr_processed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Languages size={8} /> OCR</span>}
                      {d.human_approved && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> معتمد</span>}
                      {d.encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> مشفّر</span>}
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{d.document_title}</p>
                    {d.routing_target_module && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <ArrowRight size={10} className="text-purple-500" />
                        <span className="font-body text-[9px] text-purple-700 font-bold">التوجيه: {ROUTING_MODULE_LABELS[d.routing_target_module] || d.routing_target_module}</span>
                      </div>
                    )}
                  </div>
                  <StageDots stages={CAPTURE_STAGES} stageIdx={stageIdx} />
                </DocRow>
              );
            })}
          </div>
        </>
      )}

      {/* ============ EDITOR TAB ============ */}
      {activeTab === 'editor' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي المستندات" value={String(editorDocs.length)} valueClass="text-midnight" />
            <StatCard icon={<Lock size={14} className="text-purple-600" />} label="مشفّرة" value={String(editorEncryptedCount)} valueClass="text-purple-700" />
            <StatCard icon={<Mic size={14} className="text-amber-600" />} label="إملاء صوتي" value={String(voiceCount)} valueClass="text-amber-700" />
            <StatCard icon={<GitCompare size={14} className="text-cyan-600" />} label="تتبع تغييرات" value={String(trackChangesCount)} valueClass="text-cyan-700" />
          </div>

          <StagePipeline stages={EDITOR_STAGES} config={EDITOR_STAGE_CONFIG} counts={editorCounts} title="خط أنابيب التحرير السيادي — 6 مراحل" />

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} className="!w-auto !py-1.5 !text-xs">
              <option value="all">كل الصيغ</option>
              {Object.entries(FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو قالب..." className="!py-1.5 !text-xs pr-9" />
            </div>
          </div>

          {/* Editor list */}
          <div className="space-y-2">
            {filteredEditor.length === 0 ? (
              <EmptyState icon={<FileText size={28} />} label="لا توجد مستندات سيادية" />
            ) : filteredEditor.map((d) => {
              const sCfg = EDITOR_STAGE_CONFIG[d.stage] || EDITOR_STAGE_CONFIG.draft;
              const stageIdx = EDITOR_STAGES.indexOf(d.stage);
              return (
                <DocRow key={d.id} onClick={() => openDocDetail(d, 'editor')}
                  onEdit={(e) => { e.stopPropagation(); openEditEditor(d); }}
                  onDelete={(e) => { e.stopPropagation(); setDeleteId(d.id); setDeleteKind('editor'); }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}><FileText size={14} className={sCfg.text} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-gold">{d.document_number}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FORMAT_LABELS[d.document_format] || d.document_format}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600">v{d.version_number || 1}</span>
                      {d.template_used && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><FileText size={8} /> قالب</span>}
                      {d.track_changes && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><GitCompare size={8} /> تتبع</span>}
                      {d.voice_dictated && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-orange-50 text-orange-600"><Mic size={8} /> إملاء</span>}
                      {d.encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> مشفّر</span>}
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{d.document_title}</p>
                    {d.template_used && d.template_name && <span className="font-body text-[9px] text-ink/40 mt-1 inline-block">القالب: {d.template_name}</span>}
                  </div>
                  <StageDots stages={EDITOR_STAGES} stageIdx={stageIdx} />
                </DocRow>
              );
            })}
          </div>
        </>
      )}

      {/* ============ COMPLIANCE TAB ============ */}
      {activeTab === 'compliance' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="ممتثل" value={String(compliantCount)} valueClass="text-green-700" />
            <StatCard icon={<AlertTriangle size={14} className="text-amber-600" />} label="مُعلّم" value={String(flaggedCount)} valueClass="text-amber-700" />
            <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="محظور" value={String(blockedCount)} valueClass="text-red-700" />
            <StatCard icon={<Clock size={14} className="text-purple-600" />} label="قيد المعالجة" value={String(pendingResolutionCount)} valueClass="text-purple-700" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterCheckType} onChange={(e) => setFilterCheckType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
              <option value="all">كل أنواع الفحص</option>
              {Object.entries(CHECK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="!w-auto !py-1.5 !text-xs">
              <option value="all">كل النتائج</option>
              {Object.entries(COMPLIANCE_RESULT_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بمعرّف المستند أو التفاصيل..." className="!py-1.5 !text-xs pr-9" />
            </div>
          </div>

          {/* Compliance list */}
          <div className="space-y-2">
            {filteredCompliance.length === 0 ? (
              <EmptyState icon={<Shield size={28} />} label="لا توجد فحوصات امتثال مسجلة" />
            ) : filteredCompliance.map((c) => {
              const rCfg = COMPLIANCE_RESULT_CONFIG[c.check_result] || COMPLIANCE_RESULT_CONFIG.compliant;
              const risks = c.risks_found || [];
              const ResIcon = c.check_result === 'compliant' ? CheckCircle2 : c.check_result === 'flagged' ? AlertTriangle : AlertCircle;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rCfg.bg}`}><ResIcon size={14} className={rCfg.text} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${rCfg.bg} ${rCfg.text}`}>{rCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CHECK_TYPE_LABELS[c.check_type] || c.check_type}</span>
                          {c.resolution_status && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${c.resolution_status === 'resolved' ? 'bg-green-50 text-green-600' : c.resolution_status === 'overridden' ? 'bg-gray-100 text-ink/50' : 'bg-amber-50 text-amber-600'}`}>
                              {RESOLUTION_STATUS_LABELS[c.resolution_status] || c.resolution_status}
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">مستند: {c.document_id || '—'}</p>
                        {risks.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {risks.map((r, i) => (
                              <span key={i} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-700"><AlertTriangle size={8} /> {r}</span>
                            ))}
                          </div>
                        )}
                        {c.risk_details && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-1 line-clamp-2">{c.risk_details}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {c.checked_by && <span className="font-body text-[9px] text-ink/40">بواسطة: {c.checked_by}</span>}
                          {c.checked_at && <span className="font-body text-[9px] text-ink/30">{new Date(c.checked_at).toLocaleString('ar-EG')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEditCompliance(c)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => { setDeleteId(c.id); setDeleteKind('compliance'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ============ AUDIT TAB ============ */}
      {activeTab === 'audit' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Activity size={14} className="text-midnight" />} label="إجمالي العمليات" value={String(allAudit.length)} valueClass="text-midnight" />
            <StatCard icon={<ArrowRight size={14} className="text-purple-600" />} label="عمليات التوجيه" value={String(routingAuditCount)} valueClass="text-purple-700" />
            <StatCard icon={<Shield size={14} className="text-amber-600" />} label="عمليات الامتثال" value={String(complianceAuditCount)} valueClass="text-amber-700" />
            <StatCard icon={<Lock size={14} className="text-green-600" />} label="سلاسل الـHash" value={String(allAudit.filter((l) => l.hash_chain).length)} valueClass="text-green-700" />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل ZK-Audit المدمج غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة (M47 + M53)</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.length === 0 ? (
                <EmptyState icon={<Activity size={28} />} label="لا توجد عمليات تدقيق مسجلة" />
              ) : allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">{auditIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                      {log.actor_role && log.actor_role !== 'النظام' && <span className="font-body text-[9px] text-ink/30">({log.actor_role})</span>}
                    </div>
                    {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                    {log.accessed_fields && (
                      <div className="flex items-center gap-1 mt-1"><Database size={8} className="text-ink/30" /><span className="font-body text-[9px] text-ink/40">الحقول: {log.accessed_fields}</span></div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-body text-[9px] text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                      {log.hash_chain && (
                        <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Shield size={8} className="text-gold" /><span className="font-mono">{log.hash_chain}</span></span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ============ DETAIL DRAWER ============ */}
      {selectedDoc && selectedDocKind && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {selectedDocKind === 'capture' ? <ScanText size={16} className="text-gold" /> : <FileText size={16} className="text-gold" />}
                <span className="font-heading font-bold text-midnight text-sm">{selectedDocKind === 'capture' ? 'مستند ملتقط — التعرف الذكي' : 'مستند سيادي — التحرير'}</span>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (() => {
              const isCapture = selectedDocKind === 'capture';
              const d: any = selectedDoc;
              const stages = isCapture ? CAPTURE_STAGES : EDITOR_STAGES;
              const cfg = isCapture ? CAPTURE_STAGE_CONFIG : EDITOR_STAGE_CONFIG;
              const sCfg = cfg[d.stage] || cfg[stages[0]];
              return (
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-body text-[10px] font-bold text-gold">{d.document_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">
                        {isCapture ? (DOC_TYPE_LABELS[d.document_type] || d.document_type) : (FORMAT_LABELS[d.document_format] || d.document_format)}
                      </span>
                      {!isCapture && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600">v{d.version_number || 1}</span>}
                    </div>
                    <h3 className="font-heading font-bold text-midnight text-base leading-snug">{d.document_title}</h3>
                  </div>

                  <div>
                    <StageProgress stages={stages} config={cfg} current={d.stage} />
                    {d.stage !== stages[stages.length - 1] && (
                      <button onClick={advanceStage} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                        <ArrowRight size={12} /> الانتقال للمرحلة التالية
                      </button>
                    )}
                  </div>

                  {/* Info box */}
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      {isCapture ? <ScanText size={12} className="text-gold" /> : <FileText size={12} className="text-gold" />}
                      <span className="font-body text-[10px] font-bold text-midnight">{isCapture ? 'بيانات الالتقاط' : 'بيانات المستند السيادي'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {isCapture ? (
                        <>
                          <div><span className="font-body text-[9px] text-ink/40">قناة المصدر</span><p className="font-body text-xs font-bold text-midnight">{SOURCE_CHANNEL_LABELS[d.source_channel] || d.source_channel}</p></div>
                          <div><span className="font-body text-[9px] text-ink/40">لغة OCR</span><p className="font-body text-xs font-bold text-midnight">{OCR_LANGUAGE_LABELS[d.ocr_language || 'arabic'] || '—'}</p></div>
                          <div><span className="font-body text-[9px] text-ink/40">وحدة التوجيه</span><p className="font-body text-xs font-bold text-midnight">{d.routing_target_module ? (ROUTING_MODULE_LABELS[d.routing_target_module] || d.routing_target_module) : '—'}</p></div>
                          <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{d.advisor?.name || '—'}</p></div>
                        </>
                      ) : (
                        <>
                          <div><span className="font-body text-[9px] text-ink/40">رقم الإصدار</span><p className="font-body text-xs font-bold text-midnight">v{d.version_number || 1}</p></div>
                          <div><span className="font-body text-[9px] text-ink/40">الصيغة</span><p className="font-body text-xs font-bold text-midnight">{FORMAT_LABELS[d.document_format] || d.document_format}</p></div>
                          <div><span className="font-body text-[9px] text-ink/40">القالب</span><p className="font-body text-xs font-bold text-midnight">{d.template_used ? (d.template_name || 'مفعّل') : 'غير مفعّل'}</p></div>
                          <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{d.advisor?.name || '—'}</p></div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Capture-specific sections */}
                  {isCapture && d.routing_suggestion && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center gap-1.5 mb-1"><ArrowRight size={12} className="text-purple-600" /><span className="font-body text-[10px] font-bold text-purple-700">اقتراح التوجيه</span></div>
                      <p className="font-body text-xs text-purple-900 leading-relaxed">{d.routing_suggestion}</p>
                    </div>
                  )}
                  {isCapture && d.extracted_metadata && (
                    <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                      <div className="flex items-center gap-1.5 mb-1"><FileText size={12} className="text-cyan-600" /><span className="font-body text-[10px] font-bold text-cyan-700">البيانات المستخرجة (OCR)</span></div>
                      <p className="font-body text-xs text-cyan-900 leading-relaxed whitespace-pre-wrap">{d.extracted_metadata}</p>
                    </div>
                  )}

                  {/* Flags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isCapture ? (
                      <>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${d.ocr_processed ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Languages size={10} /> OCR {d.ocr_processed ? 'معالَج' : 'غير معالَج'}</span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${d.human_approved ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CheckCircle2 size={10} /> {d.human_approved ? 'معتمد بشرياً' : 'غير معتمد'}</span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${d.encrypted ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> {d.encrypted ? 'مشفّر' : 'غير مشفّر'}</span>
                      </>
                    ) : (
                      <>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${d.template_used ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> قالب {d.template_used ? 'مفعّل' : 'غير مفعّل'}</span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${d.track_changes ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><GitCompare size={10} /> تتبع {d.track_changes ? 'مفعّل' : 'غير مفعّل'}</span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${d.voice_dictated ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-ink/30'}`}><Mic size={10} /> إملاء {d.voice_dictated ? 'مفعّل' : 'غير مفعّل'}</span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${d.encrypted ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> تشفير {d.encrypted ? 'مفعّل' : 'غير مفعّل'}</span>
                      </>
                    )}
                  </div>

                  {/* SHA3 hash */}
                  {d.sha3_hash && (
                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">بصمة SHA-3</span>
                      <p className="font-mono text-[10px] text-midnight break-all">{d.sha3_hash}</p>
                    </div>
                  )}

                  {d.description && <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{d.description}</p></div>}

                  <AuditTrail logs={detailAudit} />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============ MODALS ============ */}
      {modalKind === 'capture' && (
        <EntityModal open={modalOpen} title={editingId ? 'تعديل مستند ملتقط' : 'التقاط مستند جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSaveCapture} loading={saving}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم المستند" required><TextInput value={captureForm.document_number} onChange={(e) => setCaptureForm({ ...captureForm, document_number: e.target.value })} placeholder="DOC-2025-001" /></Field>
            <Field label="نوع المستند">
              <Select value={captureForm.document_type} onChange={(e) => setCaptureForm({ ...captureForm, document_type: e.target.value })}>
                {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="عنوان المستند" required><TextInput value={captureForm.document_title} onChange={(e) => setCaptureForm({ ...captureForm, document_title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="قناة المصدر">
              <Select value={captureForm.source_channel} onChange={(e) => setCaptureForm({ ...captureForm, source_channel: e.target.value })}>
                {Object.entries(SOURCE_CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="المرحلة">
              <Select value={captureForm.stage} onChange={(e) => setCaptureForm({ ...captureForm, stage: e.target.value })}>
                {CAPTURE_STAGES.map((s) => <option key={s} value={s}>{CAPTURE_STAGE_CONFIG[s].label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="لغة OCR">
              <Select value={captureForm.ocr_language} onChange={(e) => setCaptureForm({ ...captureForm, ocr_language: e.target.value })}>
                {Object.entries(OCR_LANGUAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="وحدة التوجيه المستهدفة">
              <Select value={captureForm.routing_target_module} onChange={(e) => setCaptureForm({ ...captureForm, routing_target_module: e.target.value })}>
                <option value="">— توجيه تلقائي ذكي —</option>
                {Object.entries(ROUTING_MODULE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="البيانات المستخرجة (Extracted Metadata)"><TextArea value={captureForm.extracted_metadata} onChange={(e) => setCaptureForm({ ...captureForm, extracted_metadata: e.target.value })} rows={3} placeholder="أدخل النص — سيتم اقتراح التوجيه تلقائياً" /></Field>
          <Field label="اقتراح التوجيه (Routing Suggestion)"><TextArea value={captureForm.routing_suggestion} onChange={(e) => setCaptureForm({ ...captureForm, routing_suggestion: e.target.value })} rows={2} /></Field>
          <Field label="بصمة SHA-3"><TextInput value={captureForm.sha3_hash} onChange={(e) => setCaptureForm({ ...captureForm, sha3_hash: e.target.value })} placeholder="0x..." className="font-mono" /></Field>
          <Field label="اعتمد بواسطة"><TextInput value={captureForm.approved_by} onChange={(e) => setCaptureForm({ ...captureForm, approved_by: e.target.value })} placeholder="اسم المراجع" /></Field>
          <Checkbox label="معالجة OCR" checked={captureForm.ocr_processed} onChange={(v) => setCaptureForm({ ...captureForm, ocr_processed: v })} />
          <Checkbox label="اعتماد بشري" checked={captureForm.human_approved} onChange={(v) => setCaptureForm({ ...captureForm, human_approved: v })} />
          <Checkbox label="تشفير (Encrypted)" checked={captureForm.encrypted} onChange={(v) => setCaptureForm({ ...captureForm, encrypted: v })} />
          <Field label="الوصف"><TextArea value={captureForm.description} onChange={(e) => setCaptureForm({ ...captureForm, description: e.target.value })} rows={3} /></Field>
        </EntityModal>
      )}

      {modalKind === 'editor' && (
        <EntityModal open={modalOpen} title={editingId ? 'تعديل مستند سيادي' : 'مستند سيادي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSaveEditor} loading={saving}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم المستند" required><TextInput value={editorForm.document_number} onChange={(e) => setEditorForm({ ...editorForm, document_number: e.target.value })} placeholder="DOC-2025-001" /></Field>
            <Field label="صيغة المستند">
              <Select value={editorForm.document_format} onChange={(e) => setEditorForm({ ...editorForm, document_format: e.target.value })}>
                {Object.entries(FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="عنوان المستند" required><TextInput value={editorForm.document_title} onChange={(e) => setEditorForm({ ...editorForm, document_title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="رقم الإصدار"><TextInput type="number" min={1} value={editorForm.version_number} onChange={(e) => setEditorForm({ ...editorForm, version_number: parseInt(e.target.value) || 1 })} /></Field>
            <Field label="المرحلة">
              <Select value={editorForm.stage} onChange={(e) => setEditorForm({ ...editorForm, stage: e.target.value })}>
                {EDITOR_STAGES.map((s) => <option key={s} value={s}>{EDITOR_STAGE_CONFIG[s].label}</option>)}
              </Select>
            </Field>
          </div>
          <Checkbox label="استخدام قالب (Template Used)" checked={editorForm.template_used} onChange={(v) => setEditorForm({ ...editorForm, template_used: v })} />
          {editorForm.template_used && (
            <Field label="اسم القالب"><TextInput value={editorForm.template_name} onChange={(e) => setEditorForm({ ...editorForm, template_name: e.target.value })} placeholder="عقد، مذكرة، لائحة..." /></Field>
          )}
          <Checkbox label="تتبع التغييرات (Track Changes)" checked={editorForm.track_changes} onChange={(v) => setEditorForm({ ...editorForm, track_changes: v })} />
          <Checkbox label="إملاء صوتي (Voice Dictated)" checked={editorForm.voice_dictated} onChange={(v) => setEditorForm({ ...editorForm, voice_dictated: v })} />
          <Checkbox label="مشفّر AES-256 (Encrypted)" checked={editorForm.encrypted} onChange={(v) => setEditorForm({ ...editorForm, encrypted: v })} />
          <Field label="SHA3-Hash"><TextInput value={editorForm.sha3_hash} onChange={(e) => setEditorForm({ ...editorForm, sha3_hash: e.target.value })} placeholder="0x..." className="font-mono" /></Field>
          <Field label="الوصف"><TextArea value={editorForm.description} onChange={(e) => setEditorForm({ ...editorForm, description: e.target.value })} rows={4} /></Field>
        </EntityModal>
      )}

      {modalKind === 'compliance' && (
        <EntityModal open={modalOpen} title={editingId ? 'تعديل فحص امتثال' : 'فحص امتثال جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSaveCompliance} loading={saving}>
          <Field label="معرّف المستند (Document ID)" required><TextInput value={complianceForm.document_id} onChange={(e) => setComplianceForm({ ...complianceForm, document_id: e.target.value })} placeholder="UUID أو رقم المستند" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="نوع الفحص">
              <Select value={complianceForm.check_type} onChange={(e) => setComplianceForm({ ...complianceForm, check_type: e.target.value })}>
                {Object.entries(CHECK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="حالة الحل">
              <Select value={complianceForm.resolution_status} onChange={(e) => setComplianceForm({ ...complianceForm, resolution_status: e.target.value })}>
                {Object.entries(RESOLUTION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="عينة المحتوى (سيتم فحصها تلقائياً للمخاطر)"><TextArea value={complianceForm.content_sample} onChange={(e) => setComplianceForm({ ...complianceForm, content_sample: e.target.value })} rows={4} placeholder="أدخل نص المستند — اكتب 'غسيل أموال' أو 'بدون ضمان' لاختبار التعليم" /></Field>
          <Field label="فحص بواسطة"><TextInput value={complianceForm.checked_by} onChange={(e) => setComplianceForm({ ...complianceForm, checked_by: e.target.value })} placeholder="اسم المراجع" /></Field>
          <Field label="ملاحظات الحل"><TextArea value={complianceForm.resolution_notes} onChange={(e) => setComplianceForm({ ...complianceForm, resolution_notes: e.target.value })} rows={2} /></Field>
        </EntityModal>
      )}

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
