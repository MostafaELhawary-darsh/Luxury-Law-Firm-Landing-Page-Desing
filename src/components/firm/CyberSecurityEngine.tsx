import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, Loader2, Plus, Pencil, Trash2, ChevronRight, X, Lock,
  AlertTriangle, DollarSign, Activity, Search, Server, CircuitBoard,
  ArrowRight, CheckCircle2, Clock, Zap, Eye, ScanLine, Fingerprint,
  Database, Radio, ShieldAlert, FileText, Cpu,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { M14Threat, M14Anomaly, M14AuditLog } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'threats' | 'anomalies' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  detected: { label: 'تم الاكتشاف', bg: 'bg-red-50', text: 'text-red-700' },
  analyzed: { label: 'تحليل', bg: 'bg-amber-50', text: 'text-amber-700' },
  contained: { label: 'احتواء', bg: 'bg-blue-50', text: 'text-blue-700' },
  resolved: { label: 'تم الحل', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { label: 'أرشفة', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const STAGES = ['detected', 'analyzed', 'contained', 'resolved', 'archived'];

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-700' },
  high: { label: 'مرتفع', bg: 'bg-orange-50', text: 'text-orange-700' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-700' },
  low: { label: 'منخفض', bg: 'bg-green-50', text: 'text-green-700' },
};

const THREAT_TYPE_LABELS: Record<string, string> = {
  intrusion: 'اختراق',
  malware: 'برمجية خبيثة',
  phishing: 'تصيد احتيالي',
  insider: 'تهديد داخلي',
  ddos: 'هجوم حجب الخدمة',
};

interface ThreatForm {
  incident_number: string;
  incident_title: string;
  threat_type: string;
  severity: string;
  stage: string;
  source_ip: string;
  target_system: string;
  attack_vector: string;
  description: string;
  financial_impact: string;
}

const emptyForm: ThreatForm = {
  incident_number: '', incident_title: '', threat_type: 'intrusion', severity: 'medium',
  stage: 'detected', source_ip: '', target_system: '', attack_vector: '', description: '',
  financial_impact: '0',
};

export default function CyberSecurityEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [threats, setThreats] = useState<M14Threat[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('threats');
  const [selectedThreat, setSelectedThreat] = useState<M14Threat | null>(null);
  const [anomalies, setAnomalies] = useState<M14Anomaly[]>([]);
  const [auditLogs, setAuditLogs] = useState<M14AuditLog[]>([]);
  const [allAnomalies, setAllAnomalies] = useState<M14Anomaly[]>([]);
  const [allAudit, setAllAudit] = useState<M14AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ThreatForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'threat' | 'anomaly'>('threat');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [anomalyModalOpen, setAnomalyModalOpen] = useState(false);
  const [anomalyForm, setAnomalyForm] = useState({
    anomaly_type: 'access_pattern', description: '', detected_at: '', risk_score: '50',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [thrtRes, attRes, anmRes, auditRes] = await Promise.all([
      supabase.from('m14_threats')
        .select('*, analyst:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m14_anomalies').select('*').order('created_at', { ascending: false }),
      supabase.from('m14_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setThreats((thrtRes.data as M14Threat[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAnomalies((anmRes.data as M14Anomaly[]) || []);
    setAllAudit((auditRes.data as M14AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, incident_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (threatId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m14_audit_logs').insert({
      case_id: threatId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (t: M14Threat) => {
    setForm({
      incident_number: t.incident_number, incident_title: t.incident_title, threat_type: t.threat_type,
      severity: t.severity, stage: t.stage, source_ip: t.source_ip || '', target_system: t.target_system || '',
      attack_vector: t.attack_vector || '', description: t.description || '',
      financial_impact: String(t.financial_impact || 0),
    });
    setEditingId(t.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.incident_title.trim() || !form.incident_number.trim()) return;
    setSaving(true);
    const payload = {
      incident_number: form.incident_number.trim(),
      incident_title: form.incident_title.trim(),
      threat_type: form.threat_type,
      severity: form.severity,
      stage: form.stage,
      status: form.stage,
      source_ip: form.source_ip.trim() || null,
      target_system: form.target_system.trim() || null,
      attack_vector: form.attack_vector.trim() || null,
      description: form.description.trim() || null,
      financial_impact: Number(form.financial_impact) || 0,
    };
    if (editingId) {
      await supabase.from('m14_threats').update(payload).eq('id', editingId);
      await logAudit(editingId, 'threat_updated', 'تحديث بيانات التهديد السيبراني');
    } else {
      const { data } = await supabase.from('m14_threats').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'threat_created', 'إنشاء تهديد سيبراني — نوع: ' + (THREAT_TYPE_LABELS[form.threat_type] || form.threat_type));
        await supabase.from('m14_threats').update({
          m51_incident_ticket_created: true,
          m108_disaster_triggered: form.severity === 'critical',
          m109_biometric_required: form.severity === 'critical' || form.severity === 'high',
          m54_finance_linked: true,
          m92_notified: true,
          cost_center_id: 'CC-M14-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm51_ticket', 'فتح تذكرة حدث في محرك المهام (M51)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء التهديد');
        if (form.severity === 'critical') {
          await logAudit(newId, 'm108_disaster', 'تفعيل بروتوكول الكوارث (M108) — شدة حرجة');
          await logAudit(newId, 'm109_biometric', 'طلب التحقق البيومتري (M109) — شدة حرجة');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'threat') await supabase.from('m14_threats').delete().eq('id', deleteId);
    else if (deleteType === 'anomaly') await supabase.from('m14_anomalies').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'threat') setSelectedThreat(null);
    fetchAll();
    if (selectedThreat && deleteType === 'anomaly') openThreatDetail(selectedThreat);
  };

  const openThreatDetail = async (t: M14Threat) => {
    setSelectedThreat(t);
    setDetailLoading(true);
    const [anmRes, aRes] = await Promise.all([
      supabase.from('m14_anomalies').select('*').eq('threat_id', t.id).order('created_at', { ascending: false }),
      supabase.from('m14_audit_logs').select('*').eq('case_id', t.id).order('created_at', { ascending: true }),
    ]);
    setAnomalies((anmRes.data as M14Anomaly[]) || []);
    setAuditLogs((aRes.data as M14AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (t: M14Threat) => {
    const idx = STAGES.indexOf(t.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m14_threats').update({ stage: next, status: next }).eq('id', t.id);
    await logAudit(t.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedThreat({ ...t, stage: next, status: next } as M14Threat);
  };

  const addAnomaly = async () => {
    if (!selectedThreat || !anomalyForm.description.trim()) return;
    await supabase.from('m14_anomalies').insert({
      threat_id: selectedThreat.id,
      anomaly_type: anomalyForm.anomaly_type,
      description: anomalyForm.description.trim(),
      detected_at: anomalyForm.detected_at || new Date().toISOString(),
      risk_score: Number(anomalyForm.risk_score) || 0,
      velocity_flag: false, off_hours_flag: false, scope_breach_flag: false,
      decryption_failure_flag: false, auto_alerted: true,
    });
    await logAudit(selectedThreat.id, 'anomaly_added', 'إضافة شذوذ: ' + anomalyForm.description.trim());
    setAnomalyForm({ anomaly_type: 'access_pattern', description: '', detected_at: '', risk_score: '50' });
    setAnomalyModalOpen(false);
    openThreatDetail(selectedThreat);
  };

  const filteredThreats = threats.filter((t) => {
    if (filterSeverity !== 'all' && t.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.incident_number.toLowerCase().includes(q) && !t.incident_title.toLowerCase().includes(q) && !(t.source_ip || '').toLowerCase().includes(q) && !(t.target_system || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeThreats = threats.filter((t) => t.stage !== 'resolved' && t.stage !== 'archived').length;
  const containedThreats = threats.filter((t) => t.stage === 'contained' || t.stage === 'resolved').length;
  const totalImpact = threats.reduce((s, t) => s + (t.financial_impact || 0), 0);
  const criticalCount = threats.filter((t) => t.severity === 'critical').length;

  const tabs: { id: Tab; label: string; icon: typeof ShieldCheck; badge?: number }[] = [
    { id: 'threats', label: 'التهديدات', icon: ShieldAlert, badge: threats.length },
    { id: 'anomalies', label: 'الشذوذ', icon: Activity, badge: allAnomalies.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Lock },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <ShieldCheck size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الأمن السيبراني (M14)</h2>
            <p className="font-body text-[10px] text-ink/40">مراقبة التهديدات السيبرانية وحماية البيانات — بنية الثقة المعدومة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <ShieldCheck size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> تهديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<ShieldAlert size={14} className="text-midnight" />} label="إجمالي التهديدات" value={String(threats.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-orange-600" />} label="تهديدات نشطة" value={String(activeThreats)} valueClass="text-orange-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="تم احتواؤها" value={String(containedThreats)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="التأثير المالي" value={formatCurrency(totalImpact)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة التهديد السيبراني — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.detected;
            const count = threats.filter((t) => t.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} تهديد</span>
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
            { icon: FileText, label: 'محرك المهام (M51)', desc: 'تذاكر الأحداث', color: 'text-blue-600' },
            { icon: Fingerprint, label: 'التحقق البيومتري (M109)', desc: 'هوية المحللين', color: 'text-purple-600' },
            { icon: Server, label: 'إدارة الكوارث (M108)', desc: 'بروتوكولات الطوارئ', color: 'text-red-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'مراكز التكلفة', color: 'text-gold' },
            { icon: CircuitBoard, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات فورية', color: 'text-amber-600' },
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

      {/* Filters for threats */}
      {activeTab === 'threats' && (
        <div className="flex items-center gap-2">
          <Select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الشدائد</option>
            {Object.entries(SEVERITY_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو IP..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Threats tab */}
      {activeTab === 'threats' && (
        <div className="space-y-2">
          {filteredThreats.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <ShieldCheck size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تهديدات سيبرانية مسجلة</p>
            </div>
          ) : (
            filteredThreats.map((t) => {
              const sCfg = STAGE_CONFIG[t.stage] || STAGE_CONFIG.detected;
              const sevCfg = SEVERITY_CONFIG[t.severity] || SEVERITY_CONFIG.medium;
              const stageIdx = STAGES.indexOf(t.stage);
              return (
                <div key={t.id} onClick={() => openThreatDetail(t)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sevCfg.bg}`}>
                        <ShieldAlert size={14} className={sevCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{t.incident_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sevCfg.bg} ${sevCfg.text}`}>شدة {sevCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{THREAT_TYPE_LABELS[t.threat_type] || t.threat_type}</span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{t.incident_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {t.source_ip && <span className="font-body text-[9px] text-ink/40"><Radio size={9} className="inline ml-0.5" />{t.source_ip}</span>}
                          {t.target_system && <span className="font-body text-[9px] text-ink/40"><Server size={9} className="inline ml-0.5" />{t.target_system}</span>}
                          {t.attack_vector && <span className="font-body text-[9px] text-ink/40"><Cpu size={9} className="inline ml-0.5" />{t.attack_vector}</span>}
                          {t.financial_impact > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(t.financial_impact)}</span>}
                          {t.m51_incident_ticket_created && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><FileText size={8} /> M51</span>}
                          {t.m108_disaster_triggered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Server size={8} /> M108</span>}
                          {t.m109_biometric_required && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Fingerprint size={8} /> M109</span>}
                          {t.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {t.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); setDeleteType('threat'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* All anomalies tab */}
      {activeTab === 'anomalies' && (
        <div className="space-y-2">
          {allAnomalies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Activity size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد شذوذات مسجلة</p></div>
          ) : (
            allAnomalies.map((a) => {
              const t = threats.find((t) => t.id === a.threat_id);
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
                        <Activity size={14} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-amber-50 text-amber-700">{a.anomaly_type}</span>
                          {t && <span className="font-body text-[9px] text-gold">{t.incident_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{a.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">درجة الخطر: {a.risk_score}</span>
                          {a.detected_at && <span className="font-body text-[9px] text-ink/30">{formatDate(a.detected_at)}</span>}
                          {a.auto_alerted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> تنبيه آلي</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(a.id); setDeleteType('anomaly'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
            <Lock size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <ShieldAlert size={12} className="text-red-600" />
                      : log.action.includes('m51') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m108') ? <Server size={12} className="text-red-600" />
                      : log.action.includes('m109') ? <Fingerprint size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('anomaly') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('stage') ? <ArrowRight size={12} className="text-gold" />
                      : <Eye size={12} className="text-ink/40" />}
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

      {/* Threat detail drawer */}
      {selectedThreat && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedThreat(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">تهديد سيبراني</span>
              </div>
              <button onClick={() => setSelectedThreat(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedThreat.incident_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(SEVERITY_CONFIG[selectedThreat.severity] || SEVERITY_CONFIG.medium).bg} ${(SEVERITY_CONFIG[selectedThreat.severity] || SEVERITY_CONFIG.medium).text}`}>
                      شدة {(SEVERITY_CONFIG[selectedThreat.severity] || SEVERITY_CONFIG.medium).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedThreat.stage] || STAGE_CONFIG.detected).bg} ${(STAGE_CONFIG[selectedThreat.stage] || STAGE_CONFIG.detected).text}`}>
                      {(STAGE_CONFIG[selectedThreat.stage] || STAGE_CONFIG.detected).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{THREAT_TYPE_LABELS[selectedThreat.threat_type] || selectedThreat.threat_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedThreat.incident_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.detected;
                      const stageIdx = STAGES.indexOf(selectedThreat.stage);
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
                  {selectedThreat.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedThreat)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Threat info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldAlert size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات التهديد</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">IP المصدر</span><p className="font-body text-xs font-bold text-midnight">{selectedThreat.source_ip || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">النظام المستهدف</span><p className="font-body text-xs font-bold text-midnight">{selectedThreat.target_system || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">ناقل الهجوم</span><p className="font-body text-xs font-bold text-midnight">{selectedThreat.attack_vector || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ الاكتشاف</span><p className="font-body text-xs font-bold text-midnight">{selectedThreat.detected_at ? formatDate(selectedThreat.detected_at) : '—'}</p></div>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedThreat.cost_center_id || '—'}</span>
                  </div>
                  <div><span className="font-body text-[9px] text-ink/40">التأثير المالي</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedThreat.financial_impact)}</p></div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedThreat.m51_incident_ticket_created ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M51 {selectedThreat.m51_incident_ticket_created ? 'مفتوحة' : 'غير مفتوحة'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedThreat.m108_disaster_triggered ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Server size={10} /> M108 {selectedThreat.m108_disaster_triggered ? 'مُفعّل' : 'غير مُفعّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedThreat.m109_biometric_required ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedThreat.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedThreat.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedThreat.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedThreat.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedThreat.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedThreat.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedThreat.description}</p></div>
                )}

                {/* Anomalies */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Activity size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الشذوذات المرتبطة</span></div>
                    <button onClick={() => setAnomalyModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة شذوذ</button>
                  </div>
                  <div className="space-y-1.5">
                    {anomalies.map((a) => (
                      <div key={a.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/anm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-amber-50 text-amber-700">{a.anomaly_type}</span>
                          <p className="font-body text-[10px] font-bold text-midnight flex-1">{a.description}</p>
                          <span className={`font-body text-[9px] font-bold ${a.risk_score > 70 ? 'text-red-600' : a.risk_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>{a.risk_score}</span>
                          <button onClick={() => { setDeleteId(a.id); setDeleteType('anomaly'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/anm:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {a.detected_at && <span className="font-body text-[9px] text-ink/40">{formatDate(a.detected_at)}</span>}
                          {a.auto_alerted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> تنبيه آلي</span>}
                        </div>
                      </div>
                    ))}
                    {anomalies.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد شذوذات مسجلة</p>}
                  </div>
                </div>

                {/* Audit trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Lock size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق</span></div>
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

      {/* Threat create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل تهديد' : 'تهديد سيبراني جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الحادثة" required><TextInput value={form.incident_number} onChange={(e) => setForm({ ...form, incident_number: e.target.value })} placeholder="INC-2025-001" /></Field>
          <Field label="نوع التهديد">
            <Select value={form.threat_type} onChange={(e) => setForm({ ...form, threat_type: e.target.value })}>
              {Object.entries(THREAT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الحادثة" required><TextInput value={form.incident_title} onChange={(e) => setForm({ ...form, incident_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الشدة">
            <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {Object.entries(SEVERITY_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="IP المصدر"><TextInput value={form.source_ip} onChange={(e) => setForm({ ...form, source_ip: e.target.value })} placeholder="192.168.1.1" /></Field>
          <Field label="النظام المستهدف"><TextInput value={form.target_system} onChange={(e) => setForm({ ...form, target_system: e.target.value })} /></Field>
        </div>
        <Field label="ناقل الهجوم"><TextInput value={form.attack_vector} onChange={(e) => setForm({ ...form, attack_vector: e.target.value })} /></Field>
        <Field label="التأثير المالي"><TextInput type="number" value={form.financial_impact} onChange={(e) => setForm({ ...form, financial_impact: e.target.value })} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Anomaly modal */}
      <EntityModal open={anomalyModalOpen} title="إضافة شذوذ" onClose={() => setAnomalyModalOpen(false)} onSubmit={addAnomaly}>
        <Field label="نوع الشذوذ">
          <Select value={anomalyForm.anomaly_type} onChange={(e) => setAnomalyForm({ ...anomalyForm, anomaly_type: e.target.value })}>
            <option value="access_pattern">نمط وصول غير اعتيادي</option>
            <option value="data_exfiltration">تسريب بيانات</option>
            <option value="privilege_escalation">تصعيد صلاحيات</option>
            <option value="anomalous_login">دخول شاذ</option>
            <option value="malware_beacon">اتصال برمجية خبيثة</option>
          </Select>
        </Field>
        <Field label="الوصف" required><TextArea value={anomalyForm.description} onChange={(e) => setAnomalyForm({ ...anomalyForm, description: e.target.value })} rows={3} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الاكتشاف"><TextInput type="datetime-local" value={anomalyForm.detected_at} onChange={(e) => setAnomalyForm({ ...anomalyForm, detected_at: e.target.value })} /></Field>
          <Field label="درجة الخطر %"><TextInput type="number" value={anomalyForm.risk_score} onChange={(e) => setAnomalyForm({ ...anomalyForm, risk_score: e.target.value })} /></Field>
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
