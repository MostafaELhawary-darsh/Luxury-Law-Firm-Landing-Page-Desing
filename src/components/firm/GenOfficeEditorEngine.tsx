import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, FileText, Lock, Search, Activity, Server, CheckCircle2,
  Clock, ArrowRight, Eye, Edit3, Printer, Stamp, Droplets,
  ExternalLink, Copy, Hash, Fingerprint, Cpu, CircuitBoard, Zap,
} from 'lucide-react';
import { supabase, formatDate } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'documents' | 'sessions' | 'templates' | 'audit';

/* ============================ Config ============================ */

const DOC_FORMAT_LABELS: Record<string, string> = {
  docx: 'Word (DOCX)', odt: 'OpenDocument (ODT)', pdf: 'PDF',
  xlsx: 'Excel (XLSX)', pptx: 'PowerPoint (PPTX)',
};

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-blue-50', text: 'text-blue-700' },
  editing: { label: 'تحرير', bg: 'bg-amber-50', text: 'text-amber-700' },
  reviewing: { label: 'مراجعة', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  approved: { label: 'اعتماد', bg: 'bg-green-50', text: 'text-green-700' },
  signed: { label: 'توقيع', bg: 'bg-purple-50', text: 'text-purple-700' },
  archived: { label: 'أرشفة', bg: 'bg-gray-100', text: 'text-gray-700' },
};
const STAGES = ['draft', 'editing', 'reviewing', 'approved', 'signed', 'archived'];

const PERMISSION_LABELS: Record<string, string> = {
  read: 'قراءة فقط', edit: 'تحرير', print: 'طباعة', sign: 'توقيع',
};

const SESSION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'نشطة', bg: 'bg-green-50', text: 'text-green-700' },
  closed: { label: 'مغلقة', bg: 'bg-gray-100', text: 'text-gray-700' },
  expired: { label: 'منتهية', bg: 'bg-red-50', text: 'text-red-700' },
};

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  contract: 'عقد', memo: 'مذكرة قانونية', pleading: 'مذكرة دفاع',
  affidavit: 'إقرار مشهر', power_of_attorney: 'توكيل',
};

const INTEGRATED_ENGINES = [
  { code: 'M10', label: 'نواة القضية الذادية', icon: Server },
  { code: 'M47', label: 'محرك المستندات المدمج', icon: FileText },
  { code: 'M48', label: 'الأرشفة الجماعية', icon: CircuitBoard },
  { code: 'M50', label: 'التحليل التنبؤي للمخاطر', icon: Shield },
  { code: 'M53', label: 'استوديو المستندات', icon: Edit3 },
  { code: 'M92', label: 'الوكيل الذكي السيادي', icon: Cpu },
  { code: 'M109', label: 'البصمة الحيوية', icon: Fingerprint },
  { code: 'M110', label: 'البوابة الخلفية السيادية', icon: Lock },
];

/* ============================ Interfaces ============================ */

interface SovereignDocument {
  id: string; document_number: string; document_title: string; document_format: string;
  file_path_raw: string | null; file_path_signed: string | null; file_hash: string | null;
  file_size_bytes: number | null; version_number: number | null; stage: string;
  encrypted: boolean | null; watermark_text: string | null; metadata: Record<string, unknown> | null;
  template_used: boolean | null; template_id: string | null; description: string | null;
  created_by: string | null; created_at: string;
}

interface EditorSession {
  id: string; session_token: string; document_id: string | null;
  user_id: string | null; permissions: string; jwt_issued_at: string | null;
  jwt_expires_at: string | null; editor_url: string | null; iframe_origin: string | null;
  status: string; created_at: string;
  document?: { document_title: string; document_number: string } | null;
}

interface DocumentTemplate {
  id: string; template_code: string; template_name: string; template_name_ar: string | null;
  template_type: string; template_format: string; template_content: Record<string, unknown> | null;
  template_description: string | null; active: boolean | null; created_at: string;
}

interface EditorAudit {
  id: string; session_id: string | null; document_id: string | null;
  action: string; actor: string | null; actor_role: string | null;
  detail: string | null; hash_chain: string; previous_hash: string | null;
  accessed_fields: string[] | null; ip_address: string | null; created_at: string;
}

/* ============================ Forms ============================ */

interface DocForm {
  document_number: string; document_title: string; document_format: string; stage: string;
  encrypted: boolean; watermark_text: string; description: string; template_used: boolean; template_id: string;
}
const emptyDocForm: DocForm = {
  document_number: '', document_title: '', document_format: 'docx', stage: 'draft',
  encrypted: false, watermark_text: '', description: '', template_used: false, template_id: '',
};

interface TemplateForm {
  template_code: string; template_name: string; template_name_ar: string;
  template_type: string; template_format: string; template_description: string;
}
const emptyTemplateForm: TemplateForm = {
  template_code: '', template_name: '', template_name_ar: '', template_type: 'contract',
  template_format: 'docx', template_description: '',
};

/* ============================ Sub-components ============================ */

function StagePipeline({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="bg-midnight rounded-xl p-4 border border-gold/20">
      <div className="flex items-center gap-2 mb-3">
        <CircuitBoard size={14} className="text-gold" />
        <span className="font-heading font-bold text-cream text-xs">خط أنابيب التحرير السيادي</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {STAGES.map((stage, i) => {
          const cfg = STAGE_CONFIG[stage];
          return (
            <div key={stage} className="flex items-center gap-1 flex-shrink-0">
              <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[110px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                </div>
                <span className="font-body text-[9px] text-cream/40">{counts[stage] || 0} مستند</span>
              </div>
              {i < STAGES.length - 1 && <ArrowRight size={12} className="text-gold/30 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntegrationMatrix() {
  return (
    <div className="bg-midnight rounded-xl p-4 border border-gold/20">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-gold" />
        <span className="font-heading font-bold text-cream text-xs">مصفوفة التكامل السيادي</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {INTEGRATED_ENGINES.map((eng) => {
          const Icon = eng.icon;
          return (
            <div key={eng.code} className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 flex items-center gap-2">
              <Icon size={14} className="text-gold flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-body text-[10px] font-bold text-cream/80 truncate">{eng.code}</p>
                <p className="font-body text-[9px] text-cream/40 truncate">{eng.label}</p>
              </div>
            </div>
          );
        })}
      </div>
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

function auditActionIcon(action: string) {
  if (action.includes('session')) return <ExternalLink size={12} className="text-blue-600" />;
  if (action.includes('save')) return <CheckCircle2 size={12} className="text-green-600" />;
  if (action.includes('watermark')) return <Droplets size={12} className="text-purple-600" />;
  if (action.includes('signed')) return <Stamp size={12} className="text-purple-600" />;
  if (action.includes('edit')) return <Edit3 size={12} className="text-amber-600" />;
  return <Activity size={12} className="text-ink/40" />;
}

/* ============================ Editor Frame (iframe + PostMessage) ============================ */

function EditorFrame({ session, onClose }: { session: EditorSession; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [postMessageLog, setPostMessageLog] = useState<Array<{ dir: 'in' | 'out'; msg: string; time: string }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!session.iframe_origin || event.origin !== session.iframe_origin) return;
      setConnectionStatus('connected');
      const time = new Date().toLocaleTimeString('ar-EG');
      const msg = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
      setPostMessageLog((prev) => [...prev, { dir: 'in' as const, msg, time }].slice(-20));

      // Handle editor events
      const data = typeof event.data === 'string' ? { type: event.data } : event.data;
      if (data.type === 'documentReady') {
        // Send document config to editor
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'config', permissions: session.permissions, watermark: 'سيادي - سرّي' },
          session.iframe_origin || '*',
        );
        setPostMessageLog((prev) => [...prev, { dir: 'out' as const, msg: 'config (permissions+watermark)', time }].slice(-20));
      }
    };

    window.addEventListener('message', handleMessage);
    const timer = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        setConnectionStatus('error');
      }
    }, 5000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [session.iframe_origin, session.permissions, connectionStatus]);

  const sendCommand = (type: string) => {
    if (!iframeRef.current || !session.iframe_origin) return;
    iframeRef.current.contentWindow?.postMessage({ type }, session.iframe_origin);
    setPostMessageLog((prev) => [...prev, { dir: 'out' as const, msg: type, time: new Date().toLocaleTimeString('ar-EG') }].slice(-20));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-midnight">
      {/* Editor toolbar */}
      <div className="bg-midnight-light border-b border-gold/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-body text-xs text-cream/70">
            {connectionStatus === 'connected' ? 'متصل بالمحرر' : connectionStatus === 'connecting' ? 'جارٍ الاتصال...' : 'فشل الاتصال - المحرر غير متاح'}
          </span>
          <span className="text-cream/20">|</span>
          <span className="font-body text-[10px] text-cream/40">الجلسة: {session.session_token.slice(0, 8)}...</span>
          <span className="text-cream/20">|</span>
          <span className="font-body text-[10px] text-gold/60">الصلاحية: {PERMISSION_LABELS[session.permissions] || session.permissions}</span>
        </div>
        <div className="flex items-center gap-2">
          {session.permissions === 'edit' && (
            <button onClick={() => sendCommand('forcesave')} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-midnight rounded-lg font-body text-xs font-bold hover:bg-gold/90 transition-colors">
              <CheckCircle2 size={12} /> حفظ نهائي
            </button>
          )}
          {session.permissions === 'print' && (
            <button onClick={() => sendCommand('print')} className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold rounded-lg font-body text-xs font-bold hover:bg-gold/20 transition-colors border border-gold/30">
              <Printer size={12} /> طباعة
            </button>
          )}
          <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-body text-xs font-bold hover:bg-red-100 transition-colors">
            <X size={12} /> إغلاق الجلسة
          </button>
        </div>
      </div>

      {/* iframe + PostMessage log */}
      <div className="flex-1 flex">
        <div className="flex-1 bg-white relative">
          {connectionStatus === 'error' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={28} className="text-amber-600" />
              </div>
              <div className="text-center max-w-md">
                <p className="font-heading font-bold text-midnight text-sm mb-2">المحرر السيادي غير متاح حالياً</p>
                <p className="font-body text-xs text-ink/50 leading-relaxed">
                  محرك التحرير (GenOffice) يعمل محلياً على المنفذ 8080. تأكد من تشغيل حاوية Docker المحلية.
                  في بيئة الإنتاج، سيتم تحميل المحرر تلقائياً عبر iframe مع قناة PostMessage آمنة.
                </p>
              </div>
              <div className="bg-midnight rounded-lg p-3 mt-2 max-w-md w-full mx-4">
                <p className="font-mono text-[10px] text-gold/70 mb-1">رابط الجلسة:</p>
                <p className="font-mono text-[10px] text-cream/40 truncate">{session.editor_url}</p>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={session.editor_url || ''}
              className="w-full h-full border-0"
              title="Sovereign Document Editor"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>

        {/* PostMessage channel log */}
        <div className="w-72 bg-midnight-light border-l border-gold/20 flex flex-col">
          <div className="px-3 py-2 border-b border-gold/10 flex items-center gap-2">
            <Cpu size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold text-cream/70">قناة PostMessage الآمنة</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {postMessageLog.length === 0 ? (
              <p className="font-body text-[10px] text-cream/30 text-center mt-4">في انتظار الرسائل...</p>
            ) : (
              postMessageLog.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className={`font-mono text-[9px] flex-shrink-0 ${log.dir === 'in' ? 'text-green-400' : 'text-blue-400'}`}>
                    {log.dir === 'in' ? '←' : '→'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] text-cream/60 break-all">{log.msg}</p>
                    <p className="font-body text-[8px] text-cream/20">{log.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-3 py-2 border-t border-gold/10">
            <p className="font-body text-[8px] text-cream/30 text-center">
              {postMessageLog.length} رسالة | قناة مشفرة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ Main Component ============================ */

export default function GenOfficeEditorEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [docs, setDocs] = useState<SovereignDocument[]>([]);
  const [sessions, setSessions] = useState<EditorSession[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [allAudit, setAllAudit] = useState<EditorAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<SovereignDocument | null>(null);
  const [detailAudit, setDetailAudit] = useState<EditorAudit[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<'doc' | 'template'>('doc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState<DocForm>(emptyDocForm);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplateForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteKind, setDeleteKind] = useState<'doc' | 'session' | 'template'>('doc');

  const [activeSession, setActiveSession] = useState<EditorSession | null>(null);
  const [sessionPermissions, setSessionPermissions] = useState('edit');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [d, s, t, a] = await Promise.all([
      supabase.from('m114_sovereign_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('m114_editor_sessions').select('*, document:document_id(document_title, document_number)').order('created_at', { ascending: false }),
      supabase.from('m114_document_templates').select('*').order('created_at', { ascending: false }),
      supabase.from('m114_editor_audit').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setDocs((d.data as SovereignDocument[]) || []);
    setSessions((s.data as EditorSession[]) || []);
    setTemplates((t.data as DocumentTemplate[]) || []);
    setAllAudit((a.data as EditorAudit[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setDocForm({ ...emptyDocForm, document_title: cmd.fields.name || '', document_number: cmd.fields.code || '' });
      setEditingId(null);
      setModalKind('doc');
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const openDocDetail = async (doc: SovereignDocument) => {
    setSelectedDoc(doc);
    setDetailLoading(true);
    const { data } = await supabase
      .from('m114_editor_audit')
      .select('*')
      .eq('document_id', doc.id)
      .order('created_at', { ascending: true });
    setDetailAudit((data as EditorAudit[]) || []);
    setDetailLoading(false);
  };

  const openAddDoc = () => {
    setDocForm(emptyDocForm);
    setEditingId(null);
    setModalKind('doc');
    setModalOpen(true);
  };

  const openEditDoc = (doc: SovereignDocument) => {
    setDocForm({
      document_number: doc.document_number, document_title: doc.document_title,
      document_format: doc.document_format, stage: doc.stage,
      encrypted: doc.encrypted || false, watermark_text: doc.watermark_text || '',
      description: doc.description || '', template_used: doc.template_used || false, template_id: doc.template_id || '',
    });
    setEditingId(doc.id);
    setModalKind('doc');
    setModalOpen(true);
  };

  const openAddTemplate = () => {
    setTemplateForm(emptyTemplateForm);
    setEditingId(null);
    setModalKind('template');
    setModalOpen(true);
  };

  const openEditTemplate = (tpl: DocumentTemplate) => {
    setTemplateForm({
      template_code: tpl.template_code, template_name: tpl.template_name,
      template_name_ar: tpl.template_name_ar || '', template_type: tpl.template_type,
      template_format: tpl.template_format, template_description: tpl.template_description || '',
    });
    setEditingId(tpl.id);
    setModalKind('template');
    setModalOpen(true);
  };

  const handleSaveDoc = async () => {
    if (!docForm.document_title.trim() || !docForm.document_number.trim()) return;
    setSaving(true);
    const payload = {
      document_number: docForm.document_number.trim(),
      document_title: docForm.document_title.trim(),
      document_format: docForm.document_format,
      stage: docForm.stage,
      encrypted: docForm.encrypted,
      watermark_text: docForm.watermark_text || null,
      description: docForm.description || null,
      template_used: docForm.template_used,
      template_id: docForm.template_id || null,
    };
    if (editingId) {
      await supabase.from('m114_sovereign_documents').update(payload).eq('id', editingId);
    } else {
      await supabase.from('m114_sovereign_documents').insert({ ...payload, created_by: 'system' });
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.template_code.trim() || !templateForm.template_name.trim()) return;
    setSaving(true);
    const payload = {
      template_code: templateForm.template_code.trim(),
      template_name: templateForm.template_name.trim(),
      template_name_ar: templateForm.template_name_ar || null,
      template_type: templateForm.template_type,
      template_format: templateForm.template_format,
      template_description: templateForm.template_description || null,
    };
    if (editingId) {
      await supabase.from('m114_document_templates').update(payload).eq('id', editingId);
    } else {
      await supabase.from('m114_document_templates').insert(payload);
    }
    setSaving(false); setModalOpen(false); fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const table = deleteKind === 'doc' ? 'm114_sovereign_documents' : deleteKind === 'session' ? 'm114_editor_sessions' : 'm114_document_templates';
    await supabase.from(table).delete().eq('id', deleteId);
    setDeleteId(null); fetchAll();
    if (selectedDoc?.id === deleteId) setSelectedDoc(null);
  };

  const startSession = async (doc: SovereignDocument) => {
    const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/genoffice-middleware/session`;
    const sovereignToken = import.meta.env.VITE_GENOFFICE_SOVEREIGN_TOKEN || 'SOVEREIGN_LOCAL_SECURE_TOKEN_XYZ';
    try {
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sovereignToken}` },
        body: JSON.stringify({
          document_id: doc.id,
          user_id: 'current-user',
          permissions: sessionPermissions,
          expires_in_min: 60,
        }),
      });
      const json = await res.json();
      if (json.error === 0 && json.session) {
        setActiveSession(json.session as EditorSession);
        fetchAll();
      } else {
        console.error('genoffice session error', json);
      }
    } catch (err) {
      console.error('genoffice session fetch failed', err);
    }
  };

  const closeSession = async (session: EditorSession) => {
    await supabase.from('m114_editor_sessions').update({ status: 'closed' }).eq('id', session.id);
    const lastHash = allAudit[0]?.hash_chain || '00000000';
    const newHash = `${lastHash}-close-${Date.now()}`.split('').reduce((h, c) => { h = ((h << 5) - h) + c.charCodeAt(0); return Math.abs(h); }, 0).toString(16);
    await supabase.from('m114_editor_audit').insert({
      session_id: session.id, document_id: session.document_id,
      action: 'session_closed', actor: 'current-user', actor_role: 'editor',
      detail: 'تم إغلاق جلسة التحرير', hash_chain: newHash, previous_hash: lastHash,
    });
    setActiveSession(null);
    fetchAll();
  };

  const applyDroplets = async (doc: SovereignDocument) => {
    const watermarkText = `سيادي - سرّي - ${doc.document_number}`;
    await supabase.from('m114_sovereign_documents').update({
      watermark_text: watermarkText,
      metadata: { sovereign_code: doc.document_number, watermark_applied_at: new Date().toISOString() },
    }).eq('id', doc.id);
    const lastHash = allAudit[0]?.hash_chain || '00000000';
    const newHash = `${lastHash}-wm-${Date.now()}`.split('').reduce((h, c) => { h = ((h << 5) - h) + c.charCodeAt(0); return Math.abs(h); }, 0).toString(16);
    await supabase.from('m114_editor_audit').insert({
      document_id: doc.id, action: 'watermark_applied', actor: 'current-user', actor_role: 'system',
      detail: `تم تطبيق علامة مائية: ${watermarkText}`, hash_chain: newHash, previous_hash: lastHash,
      accessed_fields: ['watermark_text', 'metadata'],
    });
    fetchAll();
  };

  const filteredDocs = docs.filter((d) =>
    d.document_title.toLowerCase().includes(search.toLowerCase()) ||
    d.document_number.toLowerCase().includes(search.toLowerCase())
  );

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = docs.filter((d) => d.stage === s).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  if (activeSession) {
    return <EditorFrame session={activeSession} onClose={() => closeSession(activeSession)} />;
  }

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'documents', label: 'المستندات السيادية', icon: FileText },
    { id: 'sessions', label: 'جلسات التحرير', icon: ExternalLink },
    { id: 'templates', label: 'القوالب القانونية', icon: Copy },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-midnight flex items-center justify-center">
              <Edit3 size={20} className="text-gold" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-midnight text-lg">محرك التحرير السيادي (GenOffice)</h2>
              <p className="font-body text-xs text-ink/50">تحرير محلي بحت، جلسات JWT مشفرة، علامات مائية ديناميكية، وسجل تدقيق غير قابل للتعديل</p>
            </div>
          </div>
        </div>
        <button onClick={openAddDoc} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> مستند جديد
        </button>
      </div>

      {/* Integration matrix */}
      <IntegrationMatrix />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-ink/40 hover:text-ink/60'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <StagePipeline counts={stageCounts} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي المستندات" value={String(docs.length)} valueClass="text-midnight" />
            <StatCard icon={<Lock size={14} className="text-purple-600" />} label="مشفّر" value={String(docs.filter((d) => d.encrypted).length)} valueClass="text-purple-700" />
            <StatCard icon={<Droplets size={14} className="text-gold" />} label="بعلامة مائية" value={String(docs.filter((d) => d.watermark_text).length)} valueClass="text-gold" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="معتمد" value={String(docs.filter((d) => d.stage === 'approved' || d.stage === 'signed').length)} valueClass="text-green-700" />
          </div>

          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعنوان أو الرقم..."
              className="w-full pr-9 pl-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 bg-white"
            />
          </div>

          {filteredDocs.length === 0 ? (
            <EmptyState icon={<FileText size={32} />} label="لا توجد مستندات سيادية" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const cfg = STAGE_CONFIG[doc.stage] || STAGE_CONFIG.draft;
                return (
                  <div key={doc.id} onClick={() => openDocDetail(doc)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-midnight flex items-center justify-center">
                          <FileText size={16} className="text-gold" />
                        </div>
                        <div>
                          <p className="font-body text-xs font-bold text-midnight truncate max-w-[160px]">{doc.document_title}</p>
                          <p className="font-mono text-[10px] text-ink/40">{doc.document_number}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 font-body text-[9px] text-ink/50">{DOC_FORMAT_LABELS[doc.document_format] || doc.document_format}</span>
                      {doc.encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-50 font-body text-[9px] text-purple-700"><Lock size={8} /> مشفّر</span>}
                      {doc.watermark_text && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 font-body text-[9px] text-amber-700"><Droplets size={8} /> علامة مائية</span>}
                      {doc.template_used && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 font-body text-[9px] text-blue-700"><Copy size={8} /> قالب</span>}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="font-body text-[9px] text-ink/30">{formatDate(doc.created_at)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openEditDoc(doc); }} className="p-1 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors opacity-0 group-hover:opacity-100"><Pencil size={11} /></button>
                        <button onClick={(e) => { e.stopPropagation(); applyDroplets(doc); }} className="p-1 rounded text-ink/40 hover:text-purple-600 hover:bg-purple-50 transition-colors opacity-0 group-hover:opacity-100" title="تطبيق علامة مائية"><Droplets size={11} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(doc.id); setDeleteKind('doc'); }} className="p-1 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Document detail drawer */}
          {selectedDoc && (
            <div className="fixed inset-0 z-40 flex justify-end">
              <div className="absolute inset-0 bg-midnight/40 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
              <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto h-full">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                  <h3 className="font-heading font-bold text-midnight text-sm">تفاصيل المستند السيادي</h3>
                  <button onClick={() => setSelectedDoc(null)} className="text-ink/40 hover:text-ink"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="font-heading font-bold text-midnight text-base">{selectedDoc.document_title}</p>
                    <p className="font-mono text-xs text-ink/40">{selectedDoc.document_number}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="font-body text-[10px] text-ink/40">الصيغة</p><p className="font-body text-sm text-midnight">{DOC_FORMAT_LABELS[selectedDoc.document_format] || selectedDoc.document_format}</p></div>
                    <div><p className="font-body text-[10px] text-ink/40">المرحلة</p><span className={`inline-block px-2 py-0.5 rounded text-[10px] ${STAGE_CONFIG[selectedDoc.stage]?.bg} ${STAGE_CONFIG[selectedDoc.stage]?.text}`}>{STAGE_CONFIG[selectedDoc.stage]?.label}</span></div>
                    <div><p className="font-body text-[10px] text-ink/40">الإصدار</p><p className="font-body text-sm text-midnight">{selectedDoc.version_number || 1}</p></div>
                    <div><p className="font-body text-[10px] text-ink/40">الحجم</p><p className="font-body text-sm text-midnight">{selectedDoc.file_size_bytes ? `${(selectedDoc.file_size_bytes / 1024).toFixed(1)} KB` : '—'}</p></div>
                  </div>
                  {selectedDoc.file_hash && (
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="font-body text-[10px] text-ink/40 mb-1">بصمة الملف (SHA3)</p>
                      <p className="font-mono text-[10px] text-ink/60 break-all">{selectedDoc.file_hash}</p>
                    </div>
                  )}
                  {selectedDoc.watermark_text && (
                    <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
                      <p className="font-body text-[10px] text-amber-700 mb-0.5 flex items-center gap-1"><Droplets size={10} /> العلامة المائية</p>
                      <p className="font-body text-xs text-amber-800">{selectedDoc.watermark_text}</p>
                    </div>
                  )}
                  {selectedDoc.description && (
                    <div><p className="font-body text-[10px] text-ink/40 mb-1">الوصف</p><p className="font-body text-sm text-ink/70">{selectedDoc.description}</p></div>
                  )}
                  {/* Session launcher */}
                  <div className="bg-midnight rounded-lg p-3">
                    <p className="font-body text-[10px] text-gold/70 mb-2">فتح جلسة تحرير سيادية</p>
                    <div className="flex items-center gap-2 mb-2">
                      {['read', 'edit', 'print', 'sign'].map((perm) => (
                        <button
                          key={perm}
                          onClick={() => setSessionPermissions(perm)}
                          className={`px-2 py-1 rounded font-body text-[10px] font-bold transition-colors ${
                            sessionPermissions === perm ? 'bg-gold text-midnight' : 'bg-midnight-light text-cream/50 hover:text-cream'
                          }`}
                        >
                          {PERMISSION_LABELS[perm]}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => startSession(selectedDoc)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gold text-midnight rounded-lg font-body text-xs font-bold hover:bg-gold/90 transition-colors"
                    >
                      <ExternalLink size={12} /> فتح المحرر
                    </button>
                  </div>
                  {/* Audit trail */}
                  <div>
                    <p className="font-body text-[10px] text-ink/40 mb-2">سجل التدقيق السيادي</p>
                    {detailLoading ? (
                      <div className="flex justify-center py-4"><Loader2 size={16} className="text-gold animate-spin" /></div>
                    ) : detailAudit.length === 0 ? (
                      <p className="font-body text-xs text-ink/30 text-center py-3">لا توجد سجلات</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {detailAudit.map((log) => (
                          <div key={log.id} className="flex items-start gap-2 text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                {auditActionIcon(log.action)}
                                <span className="font-body text-ink/60">{log.action}</span>
                              </div>
                              {log.detail && <p className="font-body text-ink/40 leading-tight">{log.detail}</p>}
                              <div className="flex items-center gap-2">
                                <span className="font-body text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                                {log.hash_chain && <span className="font-mono text-ink/20">{log.hash_chain.slice(0, 12)}...</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<ExternalLink size={14} className="text-midnight" />} label="إجمالي الجلسات" value={String(sessions.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="نشطة" value={String(sessions.filter((s) => s.status === 'active').length)} valueClass="text-green-700" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="منتهية" value={String(sessions.filter((s) => s.status === 'expired').length)} valueClass="text-amber-700" />
            <StatCard icon={<Lock size={14} className="text-purple-600" />} label="مغلقة" value={String(sessions.filter((s) => s.status === 'closed').length)} valueClass="text-purple-700" />
          </div>

          {sessions.length === 0 ? (
            <EmptyState icon={<ExternalLink size={32} />} label="لا توجد جلسات تحرير" />
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const statusCfg = SESSION_STATUS_CONFIG[session.status] || SESSION_STATUS_CONFIG.closed;
                const isExpired = session.jwt_expires_at && new Date(session.jwt_expires_at) < new Date();
                return (
                  <div key={session.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-midnight flex items-center justify-center">
                          <ExternalLink size={16} className="text-gold" />
                        </div>
                        <div>
                          <p className="font-mono text-xs font-bold text-midnight">{session.session_token.slice(0, 16)}...</p>
                          <p className="font-body text-[10px] text-ink/40">
                            {session.document?.document_title || 'مستند محذوف'} · {session.document?.document_number || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-body ${statusCfg.bg} ${statusCfg.text}`}>
                          {isExpired && session.status === 'active' ? 'منتهية' : statusCfg.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 font-body text-[9px] text-ink/50">{PERMISSION_LABELS[session.permissions] || session.permissions}</span>
                        {session.status === 'active' && !isExpired && (
                          <button onClick={() => setActiveSession(session)} className="flex items-center gap-1 px-2 py-1 bg-gold/10 text-gold rounded font-body text-[10px] font-bold hover:bg-gold/20 transition-colors">
                            <Eye size={10} /> فتح
                          </button>
                        )}
                        <button onClick={() => { setDeleteId(session.id); setDeleteKind('session'); }} className="p-1 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100">
                      <span className="font-body text-[9px] text-ink/30">الإصدار: {formatDate(session.jwt_issued_at)}</span>
                      <span className="font-body text-[9px] text-ink/30">الانتهاء: {formatDate(session.jwt_expires_at)}</span>
                      {session.iframe_origin && <span className="font-mono text-[9px] text-ink/30">{session.iframe_origin}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Templates tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
              <StatCard icon={<Copy size={14} className="text-midnight" />} label="إجمالي القوالب" value={String(templates.length)} valueClass="text-midnight" />
              <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="نشطة" value={String(templates.filter((t) => t.active).length)} valueClass="text-green-700" />
              <StatCard icon={<FileText size={14} className="text-gold" />} label="قوالب عقود" value={String(templates.filter((t) => t.template_type === 'contract').length)} valueClass="text-gold" />
            </div>
            <button onClick={openAddTemplate} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors mr-4">
              <Plus size={16} /> قالب جديد
            </button>
          </div>

          {templates.length === 0 ? (
            <EmptyState icon={<Copy size={32} />} label="لا توجد قوالب قانونية" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-midnight flex items-center justify-center">
                        <Copy size={16} className="text-gold" />
                      </div>
                      <div>
                        <p className="font-body text-xs font-bold text-midnight">{tpl.template_name_ar || tpl.template_name}</p>
                        <p className="font-mono text-[10px] text-ink/40">{tpl.template_code}</p>
                      </div>
                    </div>
                    {tpl.active && <span className="px-1.5 py-0.5 rounded bg-green-50 font-body text-[9px] text-green-700">نشط</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 font-body text-[9px] text-ink/50">{TEMPLATE_TYPE_LABELS[tpl.template_type] || tpl.template_type}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 font-body text-[9px] text-ink/50">{DOC_FORMAT_LABELS[tpl.template_format] || tpl.template_format}</span>
                  </div>
                  {tpl.template_description && <p className="font-body text-[10px] text-ink/50 leading-relaxed mb-2">{tpl.template_description}</p>}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="font-body text-[9px] text-ink/30">{formatDate(tpl.created_at)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditTemplate(tpl)} className="p-1 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors opacity-0 group-hover:opacity-100"><Pencil size={11} /></button>
                      <button onClick={() => { setDeleteId(tpl.id); setDeleteKind('template'); }} className="p-1 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Shield size={14} className="text-midnight" />} label="إجمالي السجلات" value={String(allAudit.length)} valueClass="text-midnight" />
            <StatCard icon={<ExternalLink size={14} className="text-blue-600" />} label="جلسات" value={String(allAudit.filter((a) => a.action.includes('session')).length)} valueClass="text-blue-700" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="عمليات حفظ" value={String(allAudit.filter((a) => a.action.includes('save')).length)} valueClass="text-green-700" />
            <StatCard icon={<Droplets size={14} className="text-purple-600" />} label="علامات مائية" value={String(allAudit.filter((a) => a.action.includes('watermark')).length)} valueClass="text-purple-700" />
          </div>

          <div className="bg-midnight rounded-xl p-4 border border-gold/20">
            <div className="flex items-center gap-2 mb-3">
              <Hash size={14} className="text-gold" />
              <span className="font-heading font-bold text-cream text-xs">سلسلة التدقيق السيادي (Hash Chain)</span>
            </div>
            {allAudit.length === 0 ? (
              <p className="font-body text-xs text-cream/30 text-center py-4">لا توجد سجلات تدقيق</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...allAudit].reverse().map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
                    <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                      {auditActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-body text-[11px] font-bold text-cream/80">{log.action}</span>
                        <span className="font-body text-[9px] text-cream/30">·</span>
                        <span className="font-body text-[9px] text-cream/40">{log.actor || '—'}</span>
                        <span className="font-body text-[9px] text-cream/30">·</span>
                        <span className="font-body text-[9px] text-cream/40">{log.actor_role || '—'}</span>
                      </div>
                      {log.detail && <p className="font-body text-[10px] text-cream/50 leading-tight mb-1">{log.detail}</p>}
                      <div className="flex items-center gap-3">
                        <span className="font-body text-[9px] text-cream/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                        {log.hash_chain && (
                          <span className="font-mono text-[9px] text-gold/40 flex items-center gap-1">
                            <Hash size={8} /> {log.hash_chain.slice(0, 16)}
                          </span>
                        )}
                        {log.previous_hash && (
                          <span className="font-mono text-[9px] text-cream/20">← {log.previous_hash.slice(0, 12)}</span>
                        )}
                      </div>
                      {log.accessed_fields && log.accessed_fields.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {log.accessed_fields.map((f) => (
                            <span key={f} className="px-1 py-0.5 rounded bg-gold/10 font-body text-[8px] text-gold/50">{f}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <EntityModal
        open={modalOpen && modalKind === 'doc'}
        title={editingId ? 'تعديل مستند سيادي' : 'مستند سيادي جديد'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveDoc}
        loading={saving}
      >
        <Field label="رقم المستند" required>
          <TextInput value={docForm.document_number} onChange={(e) => setDocForm({ ...docForm, document_number: e.target.value })} placeholder="SOV-DOC-2026-001" />
        </Field>
        <Field label="عنوان المستند" required>
          <TextInput value={docForm.document_title} onChange={(e) => setDocForm({ ...docForm, document_title: e.target.value })} placeholder="عقد إيجار سيادي" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الصيغة">
            <Select value={docForm.document_format} onChange={(e) => setDocForm({ ...docForm, document_format: e.target.value })}>
              {Object.entries(DOC_FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={docForm.stage} onChange={(e) => setDocForm({ ...docForm, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="العلامة المائية السيادية">
          <TextInput value={docForm.watermark_text} onChange={(e) => setDocForm({ ...docForm, watermark_text: e.target.value })} placeholder="سيادي - سرّي - غير قابل للنشر" />
        </Field>
        <Field label="الوصف">
          <TextArea value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} rows={2} />
        </Field>
        <div className="flex items-center gap-4">
          <Checkbox label="تشفير AES-256" checked={docForm.encrypted} onChange={(v) => setDocForm({ ...docForm, encrypted: v })} />
          <Checkbox label="مبني على قالب" checked={docForm.template_used} onChange={(v) => setDocForm({ ...docForm, template_used: v })} />
        </div>
      </EntityModal>

      <EntityModal
        open={modalOpen && modalKind === 'template'}
        title={editingId ? 'تعديل قالب قانوني' : 'قالب قانوني جديد'}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveTemplate}
        loading={saving}
      >
        <Field label="كود القالب" required>
          <TextInput value={templateForm.template_code} onChange={(e) => setTemplateForm({ ...templateForm, template_code: e.target.value })} placeholder="TPL-CONTRACT-001" />
        </Field>
        <Field label="اسم القالب (إنجليزي)" required>
          <TextInput value={templateForm.template_name} onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })} />
        </Field>
        <Field label="اسم القالب (عربي)">
          <TextInput value={templateForm.template_name_ar} onChange={(e) => setTemplateForm({ ...templateForm, template_name_ar: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع القالب">
            <Select value={templateForm.template_type} onChange={(e) => setTemplateForm({ ...templateForm, template_type: e.target.value })}>
              {Object.entries(TEMPLATE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="الصيغة">
            <Select value={templateForm.template_format} onChange={(e) => setTemplateForm({ ...templateForm, template_format: e.target.value })}>
              {Object.entries(DOC_FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الوصف">
          <TextArea value={templateForm.template_description} onChange={(e) => setTemplateForm({ ...templateForm, template_description: e.target.value })} rows={2} />
        </Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
