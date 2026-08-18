import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Mic, FileText,
  Lock, AudioWaveform, Clock3, Languages, Users, Hash,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M56Transcription, M56AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'transcriptions' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ingestion: { label: 'الاستيعاب', bg: 'bg-blue-50', text: 'text-blue-700' },
  pre_processing: { label: 'المعالجة المسبقة', bg: 'bg-amber-50', text: 'text-amber-700' },
  neural_inference: { label: 'الاستدلال العصبي', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  diarization: { label: 'تمييز المتحدثين', bg: 'bg-purple-50', text: 'text-purple-700' },
  reviewed: { label: 'مُراجَع', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['ingestion', 'pre_processing', 'neural_inference', 'diarization', 'reviewed', 'archived'];

const AUDIO_SOURCE_LABELS: Record<string, string> = {
  file_upload: 'رفع ملف',
  live_stream: 'بث مباشر',
  meeting_recording: 'تسجيل اجتماع',
  voice_dictation: 'إملاء صوتي',
};

const LANGUAGE_LABELS: Record<string, string> = {
  arabic: 'العربية',
  english: 'الإنجليزية',
  bilingual: 'ثنائي اللغة',
};

const LANGUAGE_ICONS: Record<string, typeof Languages> = {
  arabic: Languages,
  english: Languages,
  bilingual: Languages,
};

interface TranscriptionForm {
  transcription_number: string;
  transcription_title: string;
  audio_source: string;
  stage: string;
  language: string;
  speaker_diarization: boolean;
  speaker_count: string;
  duration_seconds: string;
  transcription_text: string;
  timestamp_extracted: boolean;
  encrypted: boolean;
  description: string;
}

const emptyForm: TranscriptionForm = {
  transcription_number: '', transcription_title: '', audio_source: 'file_upload', stage: 'ingestion',
  language: 'arabic', speaker_diarization: false, speaker_count: '1', duration_seconds: '0',
  transcription_text: '', timestamp_extracted: false, encrypted: false, description: '',
};

export default function AudioTranscriptionEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [transcriptions, setTranscriptions] = useState<M56Transcription[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('transcriptions');
  const [selectedTranscription, setSelectedTranscription] = useState<M56Transcription | null>(null);
  const [auditLogs, setAuditLogs] = useState<M56AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M56AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TranscriptionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, attRes, auditRes] = await Promise.all([
      supabase.from('m56_transcriptions')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m56_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (tRes.error) console.error('m56 fetch error', tRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setTranscriptions((tRes.data as M56Transcription[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M56AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, transcription_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (transcriptionId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m56_audit_logs').insert({
      case_id: transcriptionId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (t: M56Transcription) => {
    setForm({
      transcription_number: t.transcription_number,
      transcription_title: t.transcription_title,
      audio_source: t.audio_source,
      stage: t.stage,
      language: t.language,
      speaker_diarization: t.speaker_diarization || false,
      speaker_count: String(t.speaker_count || 1),
      duration_seconds: String(t.duration_seconds || 0),
      transcription_text: t.transcription_text || '',
      timestamp_extracted: t.timestamp_extracted || false,
      encrypted: t.encrypted || false,
      description: t.description || '',
    });
    setEditingId(t.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.transcription_title.trim() || !form.transcription_number.trim()) return;
    setSaving(true);
    const payload = {
      transcription_number: form.transcription_number.trim(),
      transcription_title: form.transcription_title.trim(),
      audio_source: form.audio_source,
      stage: form.stage,
      status: form.stage === 'archived' ? 'archived' : 'active',
      language: form.language,
      speaker_diarization: form.speaker_diarization,
      speaker_count: Number(form.speaker_count) || 1,
      duration_seconds: Number(form.duration_seconds) || 0,
      transcription_text: form.transcription_text.trim() || null,
      timestamp_extracted: form.timestamp_extracted,
      encrypted: form.encrypted,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m56_transcriptions').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'transcription_updated', 'تحديث بيانات التفريغ الصوتي');
    } else {
      const { data, error } = await supabase.from('m56_transcriptions').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'transcription_created', 'إنشاء تفريغ صوتي جديد — المصدر: ' + (AUDIO_SOURCE_LABELS[form.audio_source] || form.audio_source));
        await supabase.from('m56_transcriptions').update({
          m49_meeting_linked: false,
          m53_document_linked: false,
          m55_storage_linked: true,
          m109_biometric_verified: form.timestamp_extracted,
          m92_notified: true,
          cost_center_id: 'CC-M56-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm55_storage', 'ربط التخزين المحلي (M55)');
        if (form.speaker_diarization) await logAudit(newId, 'diarization', 'تمييز المتحدثين (Speaker Diarization)');
        if (form.timestamp_extracted) await logAudit(newId, 'm109_biometric', 'استخراج الطوابع الزمنية (M109)');
        if (form.encrypted) await logAudit(newId, 'encrypted', 'تشفير التفريغ الصوتي (AES-256)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء التفريغ');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m56_transcriptions').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedTranscription(null);
    fetchAll();
  };

  const openTranscriptionDetail = async (t: M56Transcription) => {
    setSelectedTranscription(t);
    setDetailLoading(true);
    const aRes = await supabase.from('m56_audit_logs').select('*').eq('case_id', t.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M56AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (t: M56Transcription) => {
    const idx = STAGES.indexOf(t.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m56_transcriptions').update({ stage: next, status: next === 'archived' ? 'archived' : 'active' }).eq('id', t.id);
    if (error) console.error('stage advance error', error);
    await logAudit(t.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedTranscription({ ...t, stage: next } as M56Transcription);
  };

  const filteredTranscriptions = transcriptions.filter((t) => {
    if (filterSource !== 'all' && t.audio_source !== filterSource) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.transcription_number.toLowerCase().includes(q) && !t.transcription_title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const diarizedCount = transcriptions.filter((t) => t.speaker_diarization).length;
  const encryptedCount = transcriptions.filter((t) => t.encrypted).length;
  const totalDurationSeconds = transcriptions.reduce((s, t) => s + (t.duration_seconds || 0), 0);
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

  const tabs: { id: Tab; label: string; icon: typeof Mic; badge?: number }[] = [
    { id: 'transcriptions', label: 'التفريغات', icon: Mic, badge: transcriptions.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <AudioWaveform size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التفريغ الصوتي المحلي الذكي (M56)</h2>
            <p className="font-body text-[10px] text-ink/40">تفريغ صوتي عصبي محلي للملفات والبث المباشر وتسجيلات الاجتماعات مع تمييز المتحدثين والتشفير</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · On-Premise</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> تفريغ جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Mic size={14} className="text-midnight" />} label="إجمالي التفريغات" value={String(transcriptions.length)} valueClass="text-midnight" />
        <StatCard icon={<Users size={14} className="text-purple-600" />} label="تفريغات مميزة" value={String(diarizedCount)} valueClass="text-purple-700" />
        <StatCard icon={<Lock size={14} className="text-green-600" />} label="مشفّرة" value={String(encryptedCount)} valueClass="text-green-700" />
        <StatCard icon={<Clock3 size={14} className="text-gold" />} label="إجمالي المدة (دقيقة)" value={String(totalDurationMinutes)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة التفريغ الصوتي — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.ingestion;
            const count = transcriptions.filter((t) => t.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} تفريغ</span>
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
            { icon: Users, label: 'الاجتماعات (M49)', desc: 'ربط التسجيل', color: 'text-blue-600' },
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة النص', color: 'text-purple-600' },
            { icon: Server, label: 'التخزين (M55)', desc: 'تخزين محلي', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'طوابع زمنية', color: 'text-green-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات', color: 'text-amber-600' },
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

      {/* Filters for transcriptions */}
      {activeTab === 'transcriptions' && (
        <div className="flex items-center gap-2">
          <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المصادر</option>
            {Object.entries(AUDIO_SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم التفريغ أو العنوان..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Transcriptions tab */}
      {activeTab === 'transcriptions' && (
        <div className="space-y-2">
          {filteredTranscriptions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Mic size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تفريغات مسجلة</p>
            </div>
          ) : (
            filteredTranscriptions.map((t) => {
              const sCfg = STAGE_CONFIG[t.stage] || STAGE_CONFIG.ingestion;
              const stageIdx = STAGES.indexOf(t.stage);
              const durationMin = Math.round((t.duration_seconds || 0) / 60);
              return (
                <div key={t.id} onClick={() => openTranscriptionDetail(t)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Mic size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{t.transcription_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{AUDIO_SOURCE_LABELS[t.audio_source] || t.audio_source}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600">{LANGUAGE_LABELS[t.language] || t.language}</span>
                          {t.speaker_diarization && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Users size={8} /> diarization</span>}
                          {t.encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> مشفّر</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{t.transcription_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">{t.speaker_count} متحدث</span>
                          <span className="font-body text-[9px] text-gold font-bold">{durationMin} دقيقة</span>
                          {t.timestamp_extracted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Clock3 size={8} /> طوابع زمنية</span>}
                          {t.m49_meeting_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Users size={8} /> M49</span>}
                          {t.m53_document_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {t.m55_storage_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Server size={8} /> M55</span>}
                          {t.m109_biometric_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {t.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(t); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(t.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <Mic size={12} className="text-blue-600" />
                      : log.action.includes('m49') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m55') ? <Server size={12} className="text-amber-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('encrypted') ? <Lock size={12} className="text-purple-600" />
                      : log.action.includes('diarization') ? <Users size={12} className="text-purple-600" />
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

      {/* Transcription detail drawer */}
      {selectedTranscription && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedTranscription(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف التفريغ الصوتي</span>
              </div>
              <button onClick={() => setSelectedTranscription(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedTranscription.transcription_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedTranscription.stage] || STAGE_CONFIG.ingestion).bg} ${(STAGE_CONFIG[selectedTranscription.stage] || STAGE_CONFIG.ingestion).text}`}>
                      {(STAGE_CONFIG[selectedTranscription.stage] || STAGE_CONFIG.ingestion).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{AUDIO_SOURCE_LABELS[selectedTranscription.audio_source] || selectedTranscription.audio_source}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedTranscription.transcription_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.ingestion;
                      const stageIdx = STAGES.indexOf(selectedTranscription.stage);
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
                  {selectedTranscription.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedTranscription)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Transcription metrics */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Mic size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات التفريغ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اللغة</span><p className="font-body text-xs font-bold text-midnight">{LANGUAGE_LABELS[selectedTranscription.language] || selectedTranscription.language}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">عدد المتحدثين</span><p className="font-body text-xs font-bold text-midnight">{selectedTranscription.speaker_count}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المدة (دقيقة)</span><p className="font-body text-xs font-bold text-gold">{Math.round((selectedTranscription.duration_seconds || 0) / 60)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المدة (ثانية)</span><p className="font-body text-xs font-bold text-midnight">{selectedTranscription.duration_seconds}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedTranscription.advisor?.name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مركز التكلفة</span><p className="font-body text-xs font-bold text-midnight">{selectedTranscription.cost_center_id || '—'}</p></div>
                  </div>
                </div>

                {/* Transcription text */}
                {selectedTranscription.transcription_text && (
                  <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">النص المُفرَّغ</span>
                    </div>
                    <p className="font-body text-xs text-ink/70 leading-relaxed whitespace-pre-wrap">{selectedTranscription.transcription_text}</p>
                  </div>
                )}

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.speaker_diarization ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> {selectedTranscription.speaker_diarization ? 'تمييز المتحدثين' : 'بدون تمييز'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.timestamp_extracted ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Clock3 size={10} /> {selectedTranscription.timestamp_extracted ? 'طوابع مستخرجة' : 'بدون طوابع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.encrypted ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> {selectedTranscription.encrypted ? 'مشفّر' : 'غير مشفّر'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.m49_meeting_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M49 {selectedTranscription.m49_meeting_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.m53_document_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedTranscription.m53_document_linked ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.m55_storage_linked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M55 {selectedTranscription.m55_storage_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.m109_biometric_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedTranscription.m109_biometric_verified ? 'موقَّع' : 'غير موقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedTranscription.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedTranscription.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedTranscription.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedTranscription.description}</p></div>
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

      {/* Transcription create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل التفريغ' : 'تفريغ صوتي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم التفريغ" required><TextInput value={form.transcription_number} onChange={(e) => setForm({ ...form, transcription_number: e.target.value })} placeholder="TR-2025-001" /></Field>
          <Field label="مصدر الصوت">
            <Select value={form.audio_source} onChange={(e) => setForm({ ...form, audio_source: e.target.value })}>
              {Object.entries(AUDIO_SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان التفريغ" required><TextInput value={form.transcription_title} onChange={(e) => setForm({ ...form, transcription_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اللغة">
            <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              {Object.entries(LANGUAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عدد المتحدثين"><TextInput type="number" value={form.speaker_count} onChange={(e) => setForm({ ...form, speaker_count: e.target.value })} /></Field>
          <Field label="المدة (ثانية)"><TextInput type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} /></Field>
        </div>
        <Field label="النص المُفرَّغ"><TextArea value={form.transcription_text} onChange={(e) => setForm({ ...form, transcription_text: e.target.value })} rows={4} /></Field>
        <Checkbox label="تمييز المتحدثين (Speaker Diarization)" checked={form.speaker_diarization} onChange={(v) => setForm({ ...form, speaker_diarization: v })} />
        <Checkbox label="استخراج الطوابع الزمنية (Timestamp Extracted)" checked={form.timestamp_extracted} onChange={(v) => setForm({ ...form, timestamp_extracted: v })} />
        <Checkbox label="تشفير (Encrypted)" checked={form.encrypted} onChange={(v) => setForm({ ...form, encrypted: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
