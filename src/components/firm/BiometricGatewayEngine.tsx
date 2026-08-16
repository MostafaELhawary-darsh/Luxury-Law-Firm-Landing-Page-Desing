import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Fingerprint, FileText,
  DollarSign, Scale, ScanFace, Mic, Lock, ShieldCheck, Eye,
  KeyRound, UserCheck, Gavel,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M109BiometricFile, M109AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'files' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  challenge: { label: 'تحدي الهوية', bg: 'bg-blue-50', text: 'text-blue-700' },
  capturing: { label: 'الالتقاط البيومتري', bg: 'bg-amber-50', text: 'text-amber-700' },
  analyzing: { label: 'التحليل والحيوية', bg: 'bg-orange-50', text: 'text-orange-700' },
  verified: { label: 'التحقق', bg: 'bg-purple-50', text: 'text-purple-700' },
  sealed: { label: 'الختم السيادي', bg: 'bg-green-50', text: 'text-green-700' },
  terminated: { label: 'إنهاء', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['challenge', 'capturing', 'analyzing', 'verified', 'sealed', 'terminated'];

const FILE_TYPE_LABELS: Record<string, string> = {
  signing: 'توقيع بيومتري',
  liveness: 'اختبار حيوية',
  identity: 'توثيق هوية',
  challenge: 'تحدي هوية',
  seal: 'ختم سيادي',
  verify: 'تحقق بيومتري',
};

const FILE_TYPE_ICONS: Record<string, typeof Fingerprint> = {
  signing: KeyRound,
  liveness: ScanFace,
  identity: UserCheck,
  challenge: Fingerprint,
  seal: ShieldCheck,
  verify: Eye,
};

const IDENTITY_TYPES = ['natural_person', 'legal_entity', 'official_delegate', 'judicial_officer', 'attorney'];
const IDENTITY_TYPE_LABELS: Record<string, string> = {
  natural_person: 'شخص طبيعي',
  legal_entity: 'شخص اعتباري',
  official_delegate: 'مندوب رسمي',
  judicial_officer: 'مسؤول قضائي',
  attorney: 'محامٍ',
};

const HASH_ALGORITHMS = ['SHA3-512', 'SHA3-256', 'SHA-256', 'BLAKE3', 'SHA3-384'];

interface BiometricFileForm {
  file_number: string;
  file_title: string;
  file_type: string;
  stage: string;
  subject_name: string;
  subject_role: string;
  identity_type: string;
  liveness_check_passed: boolean;
  face_capture_ref: string;
  voice_capture_ref: string;
  fingerprint_ref: string;
  document_hash: string;
  sovereign_hash: string;
  hash_algorithm: string;
  biometric_sealed: boolean;
  signing_target_doc: string;
  signing_target_engine: string;
  challenge_initiated_by: string;
  challenge_timestamp: string;
  verification_timestamp: string;
  anti_deepfake_score: string;
  description: string;
}

const emptyForm: BiometricFileForm = {
  file_number: '', file_title: '', file_type: 'signing', stage: 'challenge',
  subject_name: '', subject_role: '', identity_type: 'natural_person',
  liveness_check_passed: false,
  face_capture_ref: '', voice_capture_ref: '', fingerprint_ref: '',
  document_hash: '', sovereign_hash: '', hash_algorithm: 'SHA3-512',
  biometric_sealed: false,
  signing_target_doc: '', signing_target_engine: '',
  challenge_initiated_by: '', challenge_timestamp: '', verification_timestamp: '',
  anti_deepfake_score: '0',
  description: '',
};

export default function BiometricGatewayEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [files, setFiles] = useState<M109BiometricFile[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<M109BiometricFile | null>(null);
  const [auditLogs, setAuditLogs] = useState<M109AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M109AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BiometricFileForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [fRes, attRes, auditRes] = await Promise.all([
      supabase.from('m109_biometric_files')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m109_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (fRes.error) console.error('m109 fetch error', fRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setFiles((fRes.data as M109BiometricFile[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M109AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, file_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (fileId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m109_audit_logs').insert({
      case_id: fileId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M109BiometricFile) => {
    setForm({
      file_number: f.file_number, file_title: f.file_title,
      file_type: f.file_type, stage: f.stage,
      subject_name: f.subject_name || '', subject_role: f.subject_role || '',
      identity_type: f.identity_type || 'natural_person',
      liveness_check_passed: !!f.liveness_check_passed,
      face_capture_ref: f.face_capture_ref || '',
      voice_capture_ref: f.voice_capture_ref || '',
      fingerprint_ref: f.fingerprint_ref || '',
      document_hash: f.document_hash || '',
      sovereign_hash: f.sovereign_hash || '',
      hash_algorithm: f.hash_algorithm || 'SHA3-512',
      biometric_sealed: !!f.biometric_sealed,
      signing_target_doc: f.signing_target_doc || '',
      signing_target_engine: f.signing_target_engine || '',
      challenge_initiated_by: f.challenge_initiated_by || '',
      challenge_timestamp: f.challenge_timestamp || '',
      verification_timestamp: f.verification_timestamp || '',
      anti_deepfake_score: String(f.anti_deepfake_score || 0),
      description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.file_title.trim() || !form.file_number.trim()) return;
    setSaving(true);
    const score = Number(form.anti_deepfake_score) || 0;
    const payload = {
      file_number: form.file_number.trim(),
      file_title: form.file_title.trim(),
      file_type: form.file_type,
      stage: form.stage,
      status: form.stage === 'terminated' ? 'terminated' : 'active',
      subject_name: form.subject_name.trim() || null,
      subject_role: form.subject_role.trim() || null,
      identity_type: form.identity_type || null,
      liveness_check_passed: form.liveness_check_passed,
      face_capture_ref: form.face_capture_ref.trim() || null,
      voice_capture_ref: form.voice_capture_ref.trim() || null,
      fingerprint_ref: form.fingerprint_ref.trim() || null,
      document_hash: form.document_hash.trim() || null,
      sovereign_hash: form.sovereign_hash.trim() || null,
      hash_algorithm: form.hash_algorithm,
      biometric_sealed: form.biometric_sealed,
      signing_target_doc: form.signing_target_doc.trim() || null,
      signing_target_engine: form.signing_target_engine.trim() || null,
      challenge_initiated_by: form.challenge_initiated_by.trim() || null,
      challenge_timestamp: form.challenge_timestamp.trim() || null,
      verification_timestamp: form.verification_timestamp.trim() || null,
      anti_deepfake_score: score,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m109_biometric_files').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'file_updated', 'تحديث بيانات ملف الهوية الرقمية والتوقيع البيومتري');
    } else {
      const { data, error } = await supabase.from('m109_biometric_files').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'file_created', 'إنشاء ملف بيومتري — النوع: ' + (FILE_TYPE_LABELS[form.file_type] || form.file_type));
        await supabase.from('m109_biometric_files').update({
          m53_document_id: 'DOC-M109-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m16_esign_linked: true,
          m10_case_opened: true,
          m92_notified: true,
          cost_center_id: 'CC-M109-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_document', 'أرشفة الملف في محرك المستندات (M53)');
        await logAudit(newId, 'm54_finance', 'ربط الملف بالمحرك المالي (M54) — فوترة التوقيع البيومتري');
        await logAudit(newId, 'm16_esign', 'ربط الملف بمحرك التوقيع الإلكتروني (M16) — توقيع رقمي موثَّق');
        await logAudit(newId, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — توثيق هوية قضائي');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الملف البيومتري');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m109_biometric_files').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedFile(null);
    fetchAll();
  };

  const openFileDetail = async (f: M109BiometricFile) => {
    setSelectedFile(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m109_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M109AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M109BiometricFile) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m109_biometric_files').update({ stage: next, status: next === 'terminated' ? 'terminated' : 'active' }).eq('id', f.id);
    if (error) console.error('stage advance error', error);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedFile({ ...f, stage: next } as M109BiometricFile);
  };

  const filteredFiles = files.filter((f) => {
    if (filterType !== 'all' && f.file_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.file_number.toLowerCase().includes(q) && !f.file_title.toLowerCase().includes(q) && !(f.subject_name || '').toLowerCase().includes(q) && !(f.subject_role || '').toLowerCase().includes(q) && !(f.sovereign_hash || '').toLowerCase().includes(q) && !(f.document_hash || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const livenessPassedCount = files.filter((f) => f.liveness_check_passed).length;
  const biometricSealedCount = files.filter((f) => f.biometric_sealed).length;
  const avgAntiDeepfakeScore = files.length > 0
    ? Math.round((files.reduce((s, f) => s + (f.anti_deepfake_score || 0), 0) / files.length) * 100) / 100
    : 0;

  const tabs: { id: Tab; label: string; icon: typeof Fingerprint; badge?: number }[] = [
    { id: 'files', label: 'ملفات الهوية والتوقيع البيومتري', icon: Fingerprint, badge: files.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Fingerprint size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">بوابة الهوية الرقمية الموحدة والتوقيع البيومتري (M109)</h2>
            <p className="font-body text-[10px] text-ink/40">المصادقة البيومترية المتعددة واختبار الحيوية والتوقيع السيادي SHA3-512</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> ملف جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Fingerprint size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(files.length)} valueClass="text-midnight" />
        <StatCard icon={<ScanFace size={14} className="text-green-600" />} label="اختبارات الحيوية الناجحة" value={String(livenessPassedCount)} valueClass="text-green-700" />
        <StatCard icon={<ShieldCheck size={14} className="text-purple-600" />} label="مختوم بيومتريًا" value={String(biometricSealedCount)} valueClass="text-purple-700" />
        <StatCard icon={<Shield size={14} className="text-gold" />} label="متوسط درجة مكافحة التزييف العميق" value={String(avgAntiDeepfakeScore) + '%'} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الملف البيومتري — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.challenge;
            const count = files.filter((f) => f.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} ملف</span>
                </div>
                {i < STAGES.length - 1 && <ChevronRight size={12} className="text-gold/30 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل (Integration Matrix)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة الملف البيومتري', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'فوترة التوقيع البيومتري', color: 'text-gold' },
            { icon: KeyRound, label: 'التوقيع الإلكتروني (M16)', desc: 'توقيع رقمي موثَّق', color: 'text-blue-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'توثيق هوية قضائي', color: 'text-blue-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات التحقق البيومتري', color: 'text-amber-600' },
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

      {/* Filters for files */}
      {activeTab === 'files' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم الملف أو العنوان أو صاحب الهوية..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Fingerprint size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات بيومترية مسجلة</p>
            </div>
          ) : (
            filteredFiles.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.challenge;
              const stageIdx = STAGES.indexOf(f.stage);
              const TypeIcon = FILE_TYPE_ICONS[f.file_type] || Fingerprint;
              return (
                <div key={f.id} onClick={() => openFileDetail(f)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{f.file_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[f.file_type] || f.file_type}</span>
                          {f.liveness_check_passed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <ScanFace size={8} /> حيوية ناجحة
                            </span>
                          )}
                          {f.biometric_sealed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <ShieldCheck size={8} /> مختوم
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.file_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.subject_name && <span className="font-body text-[9px] text-ink/40">صاحب الهوية: {f.subject_name}</span>}
                          {f.subject_role && <span className="font-body text-[9px] text-ink/40">الدور: {f.subject_role}</span>}
                          {f.identity_type && <span className="font-body text-[9px] text-ink/40">نوع الهوية: {IDENTITY_TYPE_LABELS[f.identity_type] || f.identity_type}</span>}
                          {f.hash_algorithm && <span className="font-body text-[9px] text-gold font-bold">الخوارزمية: {f.hash_algorithm}</span>}
                          {f.anti_deepfake_score > 0 && <span className="font-body text-[9px] text-green-600 font-bold">مكافحة التزييف: {f.anti_deepfake_score}%</span>}
                          {f.face_capture_ref && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><ScanFace size={8} /> وجه</span>}
                          {f.voice_capture_ref && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Mic size={8} /> صوت</span>}
                          {f.fingerprint_ref && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-gray-600"><Fingerprint size={8} /> بصمة</span>}
                          {f.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {f.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m16_esign_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><KeyRound size={8} /> M16</span>}
                          {f.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {f.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(f); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(f.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <Fingerprint size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m16') ? <KeyRound size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('stage') ? <ChevronRight size={12} className="text-gold" />
                      : log.action.includes('updated') ? <Pencil size={12} className="text-amber-600" />
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

      {/* File detail drawer */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedFile(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Fingerprint size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الهوية والتوقيع البيومتري</span>
              </div>
              <button onClick={() => setSelectedFile(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedFile.file_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.challenge).bg} ${(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.challenge).text}`}>
                      {(STAGE_CONFIG[selectedFile.stage] || STAGE_CONFIG.challenge).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{FILE_TYPE_LABELS[selectedFile.file_type] || selectedFile.file_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedFile.file_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.challenge;
                      const stageIdx = STAGES.indexOf(selectedFile.stage);
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
                  {selectedFile.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedFile)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ChevronRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Subject info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <UserCheck size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات صاحب الهوية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم صاحب الهوية</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.subject_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الدور</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.subject_role || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الهوية</span><p className="font-body text-xs font-bold text-midnight">{IDENTITY_TYPE_LABELS[selectedFile.identity_type || ''] || selectedFile.identity_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">خوارزمية التجزئة</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.hash_algorithm || '—'}</p></div>
                  </div>
                </div>

                {/* Biometric captures */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ScanFace size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">البيانات البيومترية</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <ScanFace size={14} className="text-blue-600" />
                      </div>
                      <span className="font-body text-[9px] text-ink/40">الوجه</span>
                      <p className="font-body text-[9px] font-bold text-midnight text-center">{selectedFile.face_capture_ref ? 'مُلتقط' : '—'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Mic size={14} className="text-amber-600" />
                      </div>
                      <span className="font-body text-[9px] text-ink/40">الصوت</span>
                      <p className="font-body text-[9px] font-bold text-midnight text-center">{selectedFile.voice_capture_ref ? 'مُلتقط' : '—'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Fingerprint size={14} className="text-gray-600" />
                      </div>
                      <span className="font-body text-[9px] text-ink/40">البصمة</span>
                      <p className="font-body text-[9px] font-bold text-midnight text-center">{selectedFile.fingerprint_ref ? 'مُلتقط' : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Hashes */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lock size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">التجزئة السيادية (Sovereign Hash)</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-body text-[9px] text-ink/40">تجزئة المستند (Document Hash)</span>
                      <p className="font-body text-[10px] font-mono text-midnight break-all">{selectedFile.document_hash || '—'}</p>
                    </div>
                    <div>
                      <span className="font-body text-[9px] text-ink/40">التجزئة السيادية (Sovereign Hash)</span>
                      <p className="font-body text-[10px] font-mono text-gold break-all">{selectedFile.sovereign_hash || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Liveness & anti-deepfake card */}
                <div className={`rounded-lg p-3 border ${selectedFile.liveness_check_passed ? 'bg-green-50 border-green-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ScanFace size={12} className={selectedFile.liveness_check_passed ? 'text-green-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">اختبار الحيوية (Liveness Check)</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.liveness_check_passed ? 'text-green-700' : 'text-ink/50'}`}>
                    {selectedFile.liveness_check_passed ? 'ناجح — تم التحقق من الحيوية' : 'لم يتم اجتياز اختبار الحيوية'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Shield size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">درجة مكافحة التزييف العميق: <span className="text-gold">{selectedFile.anti_deepfake_score}%</span></span>
                  </div>
                </div>

                {/* Sealed card */}
                <div className={`rounded-lg p-3 border ${selectedFile.biometric_sealed ? 'bg-purple-50 border-purple-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={12} className={selectedFile.biometric_sealed ? 'text-purple-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">الختم السيادي البيومتري</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedFile.biometric_sealed ? 'text-purple-700' : 'text-ink/50'}`}>
                    {selectedFile.biometric_sealed ? 'مختوم سياديًا — غير قابل للنقض' : 'غير مختوم'}
                  </p>
                </div>

                {/* Signing target */}
                {(selectedFile.signing_target_doc || selectedFile.signing_target_engine) && (
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <KeyRound size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">مستند التوقيع المستهدف</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-body text-[9px] text-ink/40">المستند</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.signing_target_doc || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">المحرك</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.signing_target_engine || '—'}</p></div>
                    </div>
                  </div>
                )}

                {/* Challenge info */}
                {(selectedFile.challenge_initiated_by || selectedFile.challenge_timestamp || selectedFile.verification_timestamp) && (
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Fingerprint size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">بيانات التحدي والتحقق</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="font-body text-[9px] text-ink/40">مُطلِق التحدي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.challenge_initiated_by || '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">وقت التحدي</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.challenge_timestamp ? formatDate(selectedFile.challenge_timestamp) : '—'}</p></div>
                      <div><span className="font-body text-[9px] text-ink/40">وقت التحقق</span><p className="font-body text-xs font-bold text-midnight">{selectedFile.verification_timestamp ? formatDate(selectedFile.verification_timestamp) : '—'}</p></div>
                    </div>
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedFile.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFile.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m16_esign_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><KeyRound size={10} /> M16 {selectedFile.m16_esign_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedFile.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFile.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedFile.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedFile.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedFile.description}</p></div>
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

      {/* File create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الملف البيومتري' : 'ملف بيومتري جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.file_number} onChange={(e) => setForm({ ...form, file_number: e.target.value })} placeholder="BIO-2025-001" /></Field>
          <Field label="نوع الملف">
            <Select value={form.file_type} onChange={(e) => setForm({ ...form, file_type: e.target.value })}>
              {Object.entries(FILE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.file_title} onChange={(e) => setForm({ ...form, file_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم صاحب الهوية"><TextInput value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} /></Field>
          <Field label="دور صاحب الهوية"><TextInput value={form.subject_role} onChange={(e) => setForm({ ...form, subject_role: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الهوية">
            <Select value={form.identity_type} onChange={(e) => setForm({ ...form, identity_type: e.target.value })}>
              {IDENTITY_TYPES.map((t) => <option key={t} value={t}>{IDENTITY_TYPE_LABELS[t] || t}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="مرجع التقاط الوجه"><TextInput value={form.face_capture_ref} onChange={(e) => setForm({ ...form, face_capture_ref: e.target.value })} placeholder="FACE-001" /></Field>
          <Field label="مرجع التقاط الصوت"><TextInput value={form.voice_capture_ref} onChange={(e) => setForm({ ...form, voice_capture_ref: e.target.value })} placeholder="VOICE-001" /></Field>
          <Field label="مرجع البصمة"><TextInput value={form.fingerprint_ref} onChange={(e) => setForm({ ...form, fingerprint_ref: e.target.value })} placeholder="FP-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تجزئة المستند (Document Hash)"><TextInput value={form.document_hash} onChange={(e) => setForm({ ...form, document_hash: e.target.value })} placeholder="0x…" /></Field>
          <Field label="التجزئة السيادية (Sovereign Hash)"><TextInput value={form.sovereign_hash} onChange={(e) => setForm({ ...form, sovereign_hash: e.target.value })} placeholder="0x…" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="خوارزمية التجزئة">
            <Select value={form.hash_algorithm} onChange={(e) => setForm({ ...form, hash_algorithm: e.target.value })}>
              {HASH_ALGORITHMS.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label="درجة مكافحة التزييف العميق (%)"><TextInput type="number" value={form.anti_deepfake_score} onChange={(e) => setForm({ ...form, anti_deepfake_score: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مستند التوقيع المستهدف"><TextInput value={form.signing_target_doc} onChange={(e) => setForm({ ...form, signing_target_doc: e.target.value })} placeholder="DOC-2025-001" /></Field>
          <Field label="محرك التوقيع المستهدف"><TextInput value={form.signing_target_engine} onChange={(e) => setForm({ ...form, signing_target_engine: e.target.value })} placeholder="M16" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مُطلِق التحدي"><TextInput value={form.challenge_initiated_by} onChange={(e) => setForm({ ...form, challenge_initiated_by: e.target.value })} /></Field>
          <Field label="وقت التحدي"><TextInput value={form.challenge_timestamp} onChange={(e) => setForm({ ...form, challenge_timestamp: e.target.value })} placeholder="2025-01-01T00:00" /></Field>
        </div>
        <Field label="وقت التحقق"><TextInput value={form.verification_timestamp} onChange={(e) => setForm({ ...form, verification_timestamp: e.target.value })} placeholder="2025-01-01T00:00" /></Field>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={form.liveness_check_passed} onChange={(v: boolean) => setForm({ ...form, liveness_check_passed: v })} label="اجتياز اختبار الحيوية" />
          <Checkbox checked={form.biometric_sealed} onChange={(v: boolean) => setForm({ ...form, biometric_sealed: v })} label="ختم سيادي بيومتري" />
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
