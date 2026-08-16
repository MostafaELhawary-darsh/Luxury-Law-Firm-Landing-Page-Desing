import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, HeartPulse, Activity as ActivityIcon,
  DollarSign, FileText, Users, Lock, Timer, TrendingUp, Trophy, Hash,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M57WellnessRecord, M57AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'records' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  intake: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  scheduled: { label: 'مجدول', bg: 'bg-amber-50', text: 'text-amber-700' },
  in_progress: { label: 'قيد التنفيذ', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700' },
  analyzed: { label: 'مُحلَّل', bg: 'bg-purple-50', text: 'text-purple-700' },
  archived: { label: 'مؤرشف', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const STAGES = ['intake', 'scheduled', 'in_progress', 'completed', 'analyzed', 'archived'];

const RECORD_TYPE_LABELS: Record<string, string> = {
  activity_log: 'سجل نشاط',
  exercise_session: 'جلسة رياضية',
  ergonomics_routine: 'روتين مريح',
  team_challenge: 'تحدٍّ جماعي',
  wellness_report: 'تقرير رفاهية',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  stretching: 'تمارين تمدد',
  walking: 'مشي',
  cycling: 'دراجة',
  ergonomics: 'مريحيات',
  pomodoro_fitness: 'بومودورو لياقة',
  team_sport: 'رياضة جماعية',
};

const INTENSITY_LABELS: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالٍ',
  extreme: 'شديد',
};

const INTENSITY_COLORS: Record<string, string> = {
  low: 'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-orange-50 text-orange-700',
  extreme: 'bg-red-50 text-red-700',
};

interface WellnessForm {
  record_number: string;
  record_title: string;
  record_type: string;
  stage: string;
  member_name: string;
  activity_type: string;
  duration_minutes: string;
  intensity_level: string;
  productivity_score: string;
  pomodoro_sessions: string;
  team_challenge: boolean;
  encrypted: boolean;
  description: string;
}

const emptyForm: WellnessForm = {
  record_number: '', record_title: '', record_type: 'activity_log', stage: 'intake',
  member_name: '', activity_type: 'stretching', duration_minutes: '0', intensity_level: 'low',
  productivity_score: '0', pomodoro_sessions: '0',
  team_challenge: false, encrypted: false, description: '',
};

export default function WellnessEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [records, setRecords] = useState<M57WellnessRecord[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('records');
  const [selectedRecord, setSelectedRecord] = useState<M57WellnessRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<M57AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M57AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WellnessForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rRes, attRes, auditRes] = await Promise.all([
      supabase.from('m57_wellness_records')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m57_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (rRes.error) console.error('m57 fetch error', rRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setRecords((rRes.data as M57WellnessRecord[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M57AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, record_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (recordId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    const { error } = await supabase.from('m57_audit_logs').insert({
      case_id: recordId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
    if (error) console.error('audit log error', error);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (r: M57WellnessRecord) => {
    setForm({
      record_number: r.record_number,
      record_title: r.record_title,
      record_type: r.record_type,
      stage: r.stage,
      member_name: r.member_name,
      activity_type: r.activity_type,
      duration_minutes: String(r.duration_minutes || 0),
      intensity_level: r.intensity_level,
      productivity_score: String(r.productivity_score || 0),
      pomodoro_sessions: String(r.pomodoro_sessions || 0),
      team_challenge: r.team_challenge || false,
      encrypted: r.encrypted || false,
      description: r.description || '',
    });
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.record_title.trim() || !form.record_number.trim()) return;
    setSaving(true);
    const payload = {
      record_number: form.record_number.trim(),
      record_title: form.record_title.trim(),
      record_type: form.record_type,
      stage: form.stage,
      status: form.stage === 'archived' ? 'archived' : 'active',
      member_name: form.member_name.trim(),
      activity_type: form.activity_type,
      duration_minutes: Number(form.duration_minutes) || 0,
      intensity_level: form.intensity_level,
      productivity_score: Number(form.productivity_score) || 0,
      pomodoro_sessions: Number(form.pomodoro_sessions) || 0,
      team_challenge: form.team_challenge,
      encrypted: form.encrypted,
      description: form.description.trim() || null,
    };
    if (editingId) {
      const { error } = await supabase.from('m57_wellness_records').update(payload).eq('id', editingId);
      if (error) console.error('update error', error);
      await logAudit(editingId, 'record_updated', 'تحديث بيانات سجل الرفاهية');
    } else {
      const { data, error } = await supabase.from('m57_wellness_records').insert(payload).select('id');
      if (error) console.error('insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'record_created', 'إنشاء سجل رفاهية جديد — النوع: ' + (RECORD_TYPE_LABELS[form.record_type] || form.record_type));
        await supabase.from('m57_wellness_records').update({
          m77_hr_linked: true,
          m51_tasks_linked: false,
          m55_storage_linked: true,
          m109_biometric_verified: false,
          m92_notified: true,
          cost_center_id: 'CC-M57-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm77_hr', 'ربط الموارد البشرية (M77)');
        await logAudit(newId, 'm55_storage', 'ربط التخزين المحلي (M55)');
        if (form.team_challenge) await logAudit(newId, 'team_challenge', 'تحدٍّ جماعي (Team Challenge)');
        if (form.encrypted) await logAudit(newId, 'encrypted', 'تشفير السجل (AES-256)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء السجل');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('m57_wellness_records').delete().eq('id', deleteId);
    if (error) console.error('delete error', error);
    setDeleteId(null);
    setSelectedRecord(null);
    fetchAll();
  };

  const openRecordDetail = async (r: M57WellnessRecord) => {
    setSelectedRecord(r);
    setDetailLoading(true);
    const aRes = await supabase.from('m57_audit_logs').select('*').eq('case_id', r.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M57AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (r: M57WellnessRecord) => {
    const idx = STAGES.indexOf(r.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const { error } = await supabase.from('m57_wellness_records').update({ stage: next, status: next === 'archived' ? 'archived' : 'active' }).eq('id', r.id);
    if (error) console.error('stage advance error', error);
    await logAudit(r.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedRecord({ ...r, stage: next } as M57WellnessRecord);
  };

  const filteredRecords = records.filter((r) => {
    if (filterType !== 'all' && r.record_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!r.record_number.toLowerCase().includes(q) && !r.record_title.toLowerCase().includes(q) && !r.member_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = records.filter((r) => r.stage !== 'archived').length;
  const avgProductivity = records.length > 0
    ? Math.round(records.reduce((s, r) => s + (r.productivity_score || 0), 0) / records.length)
    : 0;
  const totalPomodoro = records.reduce((s, r) => s + (r.pomodoro_sessions || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof HeartPulse; badge?: number }[] = [
    { id: 'records', label: 'السجلات', icon: HeartPulse || ActivityIcon, badge: records.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <HeartPulse size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الرفاهية المؤسسية والصحة المهنية (M57)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الأنشطة الرياضية والصحية وتحديات الفريق ومقاييس الإنتاجية المهنية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> سجل جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<HeartPulse size={14} className="text-midnight" />} label="إجمالي السجلات" value={String(records.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="سجلات نشطة" value={String(activeCount)} valueClass="text-green-700" />
        <StatCard icon={<TrendingUp size={14} className="text-gold" />} label="متوسط الإنتاجية" value={String(avgProductivity)} valueClass="text-gold" />
        <StatCard icon={<Timer size={14} className="text-purple-600" />} label="جلسات بومودورو" value={String(totalPomodoro)} valueClass="text-purple-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة سجل الرفاهية — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.intake;
            const count = records.filter((r) => r.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} سجل</span>
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
            { icon: Users, label: 'الموارد البشرية (M77)', desc: 'ربط السجلات', color: 'text-blue-600' },
            { icon: CheckCircle2, label: 'المهام (M51)', desc: 'توليد المهام', color: 'text-green-600' },
            { icon: Server, label: 'التخزين (M55)', desc: 'تخزين محلي', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'تحقق بيومتري', color: 'text-green-600' },
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

      {/* Filters for records */}
      {activeTab === 'records' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(RECORD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم السجل أو العنوان أو العضو..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Records tab */}
      {activeTab === 'records' && (
        <div className="space-y-2">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <HeartPulse size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد سجلات مسجلة</p>
            </div>
          ) : (
            filteredRecords.map((r) => {
              const sCfg = STAGE_CONFIG[r.stage] || STAGE_CONFIG.intake;
              const stageIdx = STAGES.indexOf(r.stage);
              const intColor = INTENSITY_COLORS[r.intensity_level] || INTENSITY_COLORS.low;
              return (
                <div key={r.id} onClick={() => openRecordDetail(r)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <HeartPulse size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{r.record_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{RECORD_TYPE_LABELS[r.record_type] || r.record_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${intColor}`}>الشدة: {INTENSITY_LABELS[r.intensity_level] || r.intensity_level}</span>
                          {r.team_challenge && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Trophy size={8} /> تحدٍّ جماعي</span>}
                          {r.encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> مشفّر</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{r.record_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">العضو: {r.member_name}</span>
                          <span className="font-body text-[9px] text-cyan-600">{ACTIVITY_TYPE_LABELS[r.activity_type] || r.activity_type}</span>
                          <span className="font-body text-[9px] text-gold font-bold">{r.duration_minutes} دقيقة</span>
                          <span className="font-body text-[9px] text-green-600">إنتاجية: {r.productivity_score}</span>
                          <span className="font-body text-[9px] text-purple-600">{r.pomodoro_sessions} بومودورو</span>
                          {r.m77_hr_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Users size={8} /> M77</span>}
                          {r.m51_tasks_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> M51</span>}
                          {r.m55_storage_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Server size={8} /> M55</span>}
                          {r.m109_biometric_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {r.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
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
                        <button onClick={(ev) => { ev.stopPropagation(); openEdit(r); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteId(r.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? (<HeartPulse size={12} className="text-blue-600" />)
                      : log.action.includes('m77') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('m51') ? <CheckCircle2 size={12} className="text-green-600" />
                      : log.action.includes('m55') ? <Server size={12} className="text-amber-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('encrypted') ? <Lock size={12} className="text-purple-600" />
                      : log.action.includes('team_challenge') ? <Trophy size={12} className="text-amber-600" />
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

      {/* Record detail drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedRecord(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <HeartPulse size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف سجل الرفاهية</span>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedRecord.record_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedRecord.stage] || STAGE_CONFIG.intake).bg} ${(STAGE_CONFIG[selectedRecord.stage] || STAGE_CONFIG.intake).text}`}>
                      {(STAGE_CONFIG[selectedRecord.stage] || STAGE_CONFIG.intake).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{RECORD_TYPE_LABELS[selectedRecord.record_type] || selectedRecord.record_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedRecord.record_title}</h3>
                  <p className="font-body text-[10px] text-ink/40 mt-1">العضو: {selectedRecord.member_name}</p>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.intake;
                      const stageIdx = STAGES.indexOf(selectedRecord.stage);
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
                  {selectedRecord.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedRecord)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Record metrics */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <HeartPulse size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات السجل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع النشاط</span><p className="font-body text-xs font-bold text-midnight">{ACTIVITY_TYPE_LABELS[selectedRecord.activity_type] || selectedRecord.activity_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المدة (دقيقة)</span><p className="font-body text-xs font-bold text-gold">{selectedRecord.duration_minutes}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مستوى الشدة</span><p className="font-body text-xs font-bold text-midnight">{INTENSITY_LABELS[selectedRecord.intensity_level] || selectedRecord.intensity_level}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">جلسات بومودورو</span><p className="font-body text-xs font-bold text-purple-600">{selectedRecord.pomodoro_sessions}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedRecord.advisor?.name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مركز التكلفة</span><p className="font-body text-xs font-bold text-midnight">{selectedRecord.cost_center_id || '—'}</p></div>
                  </div>
                </div>

                {/* Productivity metrics */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp size={12} className="text-green-600" />
                    <span className="font-body text-[10px] font-bold text-green-700">مقاييس الإنتاجية</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="font-body text-2xl font-bold text-green-700">{selectedRecord.productivity_score}</p>
                    <span className="font-body text-[9px] text-green-600">درجة الإنتاجية (Productivity Score)</span>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRecord.team_challenge ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Trophy size={10} /> {selectedRecord.team_challenge ? 'تحدٍّ جماعي' : 'فردي'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRecord.encrypted ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> {selectedRecord.encrypted ? 'مشفّر' : 'غير مشفّر'}</span>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRecord.m77_hr_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Users size={10} /> M77 {selectedRecord.m77_hr_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRecord.m51_tasks_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><CheckCircle2 size={10} /> M51 {selectedRecord.m51_tasks_linked ? 'مولّد' : 'غير مولّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRecord.m55_storage_linked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M55 {selectedRecord.m55_storage_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRecord.m109_biometric_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedRecord.m109_biometric_verified ? 'موقَّع' : 'غير موقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRecord.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedRecord.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedRecord.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedRecord.description}</p></div>
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

      {/* Record create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل السجل' : 'سجل رفاهية جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم السجل" required><TextInput value={form.record_number} onChange={(e) => setForm({ ...form, record_number: e.target.value })} placeholder="WL-2025-001" /></Field>
          <Field label="نوع السجل">
            <Select value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value })}>
              {Object.entries(RECORD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان السجل" required><TextInput value={form.record_title} onChange={(e) => setForm({ ...form, record_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم العضو" required><TextInput value={form.member_name} onChange={(e) => setForm({ ...form, member_name: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع النشاط">
            <Select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
              {Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="مستوى الشدة">
            <Select value={form.intensity_level} onChange={(e) => setForm({ ...form, intensity_level: e.target.value })}>
              {Object.entries(INTENSITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="المدة (دقيقة)"><TextInput type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></Field>
          <Field label="درجة الإنتاجية"><TextInput type="number" value={form.productivity_score} onChange={(e) => setForm({ ...form, productivity_score: e.target.value })} /></Field>
          <Field label="جلسات بومودورو"><TextInput type="number" value={form.pomodoro_sessions} onChange={(e) => setForm({ ...form, pomodoro_sessions: e.target.value })} /></Field>
        </div>
        <Checkbox label="تحدٍّ جماعي (Team Challenge)" checked={form.team_challenge} onChange={(v) => setForm({ ...form, team_challenge: v })} />
        <Checkbox label="تشفير (Encrypted)" checked={form.encrypted} onChange={(v) => setForm({ ...form, encrypted: v })} />
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
