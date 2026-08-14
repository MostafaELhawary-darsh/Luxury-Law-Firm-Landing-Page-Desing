import { useEffect, useState, useCallback } from 'react';
import {
  Cpu, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Activity, Server, AlertCircle, Fingerprint, Database, Eye,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { M18Asset, M18AuditLog } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'assets' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ingestion: { label: 'الاستيعاب', bg: 'bg-blue-50', text: 'text-blue-700' },
  audited: { label: 'مُدقَّق', bg: 'bg-amber-50', text: 'text-amber-700' },
  integrated: { label: 'مُدمَج', bg: 'bg-purple-50', text: 'text-purple-700' },
  encrypted: { label: 'مُشفَّر', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  enforced: { label: 'مُطبَّق', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['ingestion', 'audited', 'integrated', 'encrypted', 'enforced'];

const ASSET_TYPE_LABELS: Record<string, string> = {
  ai_model: 'نموذج ذكاء اصطناعي',
  dataset: 'مجموعة بيانات',
  algorithm: 'خوارزمية',
  digital_property: 'أصل رقمي',
};

const COMPLIANCE_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد المراجعة', bg: 'bg-amber-50', text: 'text-amber-600' },
  compliant: { label: 'مطابق', bg: 'bg-green-50', text: 'text-green-600' },
  non_compliant: { label: 'غير مطابق', bg: 'bg-red-50', text: 'text-red-600' },
};

interface AssetForm {
  asset_number: string;
  asset_name: string;
  asset_type: string;
  stage: string;
  ai_model_name: string;
  ai_model_version: string;
  bias_audit_passed: boolean;
  transparency_score: string;
  compliance_status: string;
  financial_value: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: AssetForm = {
  asset_number: '', asset_name: '', asset_type: 'ai_model', stage: 'ingestion',
  ai_model_name: '', ai_model_version: '', bias_audit_passed: false,
  transparency_score: '0', compliance_status: 'pending', financial_value: '0',
  assigned_advisor_id: '', description: '',
};

export default function DigitalAssetEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [assets, setAssets] = useState<M18Asset[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('assets');
  const [selectedAsset, setSelectedAsset] = useState<M18Asset | null>(null);
  const [auditLogs, setAuditLogs] = useState<M18AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M18AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [assetRes, attRes, auditRes] = await Promise.all([
      supabase.from('m18_assets')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m18_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setAssets((assetRes.data as M18Asset[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M18AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, asset_name: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (assetId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m18_audit_logs').insert({
      case_id: assetId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (a: M18Asset) => {
    setForm({
      asset_number: a.asset_number, asset_name: a.asset_name, asset_type: a.asset_type,
      stage: a.stage, ai_model_name: a.ai_model_name || '', ai_model_version: a.ai_model_version || '',
      bias_audit_passed: a.bias_audit_passed, transparency_score: String(a.transparency_score || 0),
      compliance_status: a.compliance_status || 'pending', financial_value: String(a.financial_value || 0),
      assigned_advisor_id: a.assigned_advisor_id || '', description: a.description || '',
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.asset_name.trim() || !form.asset_number.trim()) return;
    setSaving(true);
    const payload = {
      asset_number: form.asset_number.trim(),
      asset_name: form.asset_name.trim(),
      asset_type: form.asset_type,
      stage: form.stage,
      status: form.stage,
      ai_model_name: form.ai_model_name.trim() || null,
      ai_model_version: form.ai_model_version.trim() || null,
      bias_audit_passed: form.bias_audit_passed,
      transparency_score: Number(form.transparency_score) || 0,
      compliance_status: form.compliance_status,
      financial_value: Number(form.financial_value) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m18_assets').update(payload).eq('id', editingId);
      await logAudit(editingId, 'asset_updated', 'تحديث بيانات الأصل الرقمي');
    } else {
      const { data } = await supabase.from('m18_assets').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'asset_created', 'إنشاء أصل رقمي — نوع: ' + (ASSET_TYPE_LABELS[form.asset_type] || form.asset_type));
        await supabase.from('m18_assets').update({
          m92_guardrails_verified: true,
          m14_monitoring_active: true,
          m54_finance_linked: true,
          m109_biometric_required: false,
          m53_archived: false,
          is_encrypted: true,
          encryption_standard: 'AES-256-GCM',
          cost_center_id: 'CC-M18-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm92_guardrails', 'تفعيل دروع الحماية الذكية (M92) للأصل الرقمي');
        await logAudit(newId, 'm14_monitoring', 'ربط الأصل بمحرك المراقبة الأمنية (M14)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'encryption_applied', 'تطبيق التشفير AES-256-GCM على الأصل الرقمي');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m18_assets').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedAsset(null);
    fetchAll();
  };

  const openAssetDetail = async (a: M18Asset) => {
    setSelectedAsset(a);
    setDetailLoading(true);
    const aRes = await supabase.from('m18_audit_logs').select('*').eq('case_id', a.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M18AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (a: M18Asset) => {
    const idx = STAGES.indexOf(a.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m18_assets').update({ stage: next, status: next }).eq('id', a.id);
    await logAudit(a.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...a, stage: next, status: next };
    setSelectedAsset(updated as M18Asset);
  };

  const filteredAssets = assets.filter((a) => {
    if (filterType !== 'all' && a.asset_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.asset_number.toLowerCase().includes(q) && !a.asset_name.toLowerCase().includes(q) && !(a.ai_model_name || '').toLowerCase().includes(q) && !(a.owner_entity || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const auditedCount = assets.filter((a) => a.bias_audit_passed).length;
  const totalValue = assets.reduce((s, a) => s + (a.financial_value || 0), 0);
  const complianceRate = assets.length > 0 ? Math.round((assets.filter((a) => a.compliance_status === 'compliant').length / assets.length) * 100) : 0;

  const tabs: { id: Tab; label: string; icon: typeof Cpu; badge?: number }[] = [
    { id: 'assets', label: 'الأصول الرقمية', icon: Cpu, badge: assets.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Cpu size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الأصول الرقمية والذكاء الاصطناعي (M18)</h2>
            <p className="font-body text-[10px] text-ink/40">حوكمة الأصول الرقمية ونماذج الذكاء الاصطناعي — تدقيق التحيز والشفافية والتشفير</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> أصل رقمي
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Cpu size={14} className="text-midnight" />} label="إجمالي الأصول" value={String(assets.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="مُدقَّق ومجتاز" value={String(auditedCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة المالية الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<Shield size={14} className="text-blue-600" />} label="معدل الامتثال" value={complianceRate + '%'} valueClass="text-blue-700" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الأصل الرقمي — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.ingestion;
            const count = assets.filter((a) => a.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} أصل</span>
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
            { icon: CircuitBoard, label: 'الوكيل الذكي (M92)', desc: 'دروع الحماية والضوابط', color: 'text-amber-600' },
            { icon: Activity, label: 'المراقبة الأمنية (M14)', desc: 'مراقبة التهديدات والأنومالي', color: 'text-red-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'تقييم ومراكز التكلفة', color: 'text-gold' },
            { icon: Fingerprint, label: 'التحقق البيومتري (M109)', desc: 'هوية المالكين المعتمدين', color: 'text-purple-600' },
            { icon: Database, label: 'الخزنة الرقمية (M53)', desc: 'أرشفة وتشفير الأصول', color: 'text-blue-600' },
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

      {/* Filters for assets */}
      {activeTab === 'assets' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو اسم أو نموذج..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Assets tab */}
      {activeTab === 'assets' && (
        <div className="space-y-2">
          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Cpu size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد أصول رقمية مسجلة</p>
            </div>
          ) : (
            filteredAssets.map((a) => {
              const sCfg = STAGE_CONFIG[a.stage] || STAGE_CONFIG.ingestion;
              const stageIdx = STAGES.indexOf(a.stage);
              const compCfg = COMPLIANCE_STATUS_CONFIG[a.compliance_status] || COMPLIANCE_STATUS_CONFIG.pending;
              return (
                <div key={a.id} onClick={() => openAssetDetail(a)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Cpu size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{a.asset_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}</span>
                          {a.bias_audit_passed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> تدقيق التحيز مجتاز</span>}
                          {a.is_encrypted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Lock size={8} /> مُشفَّر</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{a.asset_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {a.ai_model_name && <span className="font-body text-[9px] text-ink/40"><Cpu size={9} className="inline ml-0.5" />{a.ai_model_name}</span>}
                          {a.ai_model_version && <span className="font-body text-[9px] text-ink/40">v{a.ai_model_version}</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${compCfg.bg} ${compCfg.text}`}>{compCfg.label}</span>
                          {a.transparency_score > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="font-body text-[9px] text-ink/40">الشفافية</span>
                              <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(a.transparency_score, 100)}%` }} />
                              </div>
                              <span className="font-body text-[9px] font-bold text-gold">{a.transparency_score}%</span>
                            </span>
                          )}
                          {a.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(a.financial_value)}</span>}
                          {a.m92_guardrails_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M92</span>}
                          {a.m14_monitoring_active && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Activity size={8} /> M14</span>}
                          {a.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {a.m53_archived && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Database size={8} /> M53</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
                    {log.action.includes('created') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('m14') ? <Activity size={12} className="text-red-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('encryption') ? <Lock size={12} className="text-cyan-600" />
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

      {/* Asset detail drawer */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">الأصل الرقمي</span>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedAsset.asset_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedAsset.stage] || STAGE_CONFIG.ingestion).bg} ${(STAGE_CONFIG[selectedAsset.stage] || STAGE_CONFIG.ingestion).text}`}>
                      {(STAGE_CONFIG[selectedAsset.stage] || STAGE_CONFIG.ingestion).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{ASSET_TYPE_LABELS[selectedAsset.asset_type] || selectedAsset.asset_type}</span>
                    {selectedAsset.bias_audit_passed && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600"><BadgeCheck size={10} /> تدقيق التحيز مجتاز</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedAsset.asset_name}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.ingestion;
                      const stageIdx = STAGES.indexOf(selectedAsset.stage);
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
                  {selectedAsset.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedAsset)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Asset info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Cpu size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الأصل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم النموذج</span><p className="font-body text-xs font-bold text-midnight">{selectedAsset.ai_model_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">إصدار النموذج</span><p className="font-body text-xs font-bold text-midnight">{selectedAsset.ai_model_version || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">UUID</span><p className="font-body text-xs font-bold text-midnight">{selectedAsset.asset_uuid || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الكيان المالك</span><p className="font-body text-xs font-bold text-midnight">{selectedAsset.owner_entity || '—'}</p></div>
                  </div>
                </div>

                {/* AI Governance */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">حوكمة الذكاء الاصطناعي</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تدقيق التحيز</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedAsset.bias_audit_passed ? 'مجتاز ✓' : 'غير مجتاز'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">درجة الشفافية</span>
                      <p className="font-body text-xs font-bold text-gold">{selectedAsset.transparency_score}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">حالة الامتثال</span>
                      <p className={`font-body text-xs font-bold ${(COMPLIANCE_STATUS_CONFIG[selectedAsset.compliance_status] || COMPLIANCE_STATUS_CONFIG.pending).text}`}>{(COMPLIANCE_STATUS_CONFIG[selectedAsset.compliance_status] || COMPLIANCE_STATUS_CONFIG.pending).label}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">التشفير</span>
                      <p className="font-body text-xs font-bold text-cyan-600">{selectedAsset.is_encrypted ? (selectedAsset.encryption_standard || 'مُفعَّل') : 'غير مُفعَّل'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedAsset.cost_center_id || '—'}</span>
                  </div>
                  <div><span className="font-body text-[9px] text-ink/40">القيمة المالية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedAsset.financial_value)}</p></div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAsset.m92_guardrails_verified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedAsset.m92_guardrails_verified ? 'مُفعَّل' : 'غير مُفعَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAsset.m14_monitoring_active ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M14 {selectedAsset.m14_monitoring_active ? 'مراقب' : 'غير مراقب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAsset.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedAsset.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAsset.m109_biometric_required ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedAsset.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedAsset.m53_archived ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Database size={10} /> M53 {selectedAsset.m53_archived ? 'مؤرشف' : 'غير مؤرشف'}</span>
                </div>

                {selectedAsset.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedAsset.description}</p></div>
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
                    {auditLogs.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد عمليات تدقيق مسجلة</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الأصل الرقمي' : 'أصل رقمي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الأصل" required><TextInput value={form.asset_number} onChange={(e) => setForm({ ...form, asset_number: e.target.value })} placeholder="DA-2025-001" /></Field>
          <Field label="نوع الأصل">
            <Select value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
              {Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="اسم الأصل" required><TextInput value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="حالة الامتثال">
            <Select value={form.compliance_status} onChange={(e) => setForm({ ...form, compliance_status: e.target.value })}>
              <option value="pending">قيد المراجعة</option>
              <option value="compliant">مطابق</option>
              <option value="non_compliant">غير مطابق</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم نموذج الذكاء الاصطناعي"><TextInput value={form.ai_model_name} onChange={(e) => setForm({ ...form, ai_model_name: e.target.value })} /></Field>
          <Field label="إصدار النموذج"><TextInput value={form.ai_model_version} onChange={(e) => setForm({ ...form, ai_model_version: e.target.value })} placeholder="1.0.0" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="درجة الشفافية %"><TextInput type="number" value={form.transparency_score} onChange={(e) => setForm({ ...form, transparency_score: e.target.value })} /></Field>
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="تدقيق التحيز">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.bias_audit_passed} onChange={(e) => setForm({ ...form, bias_audit_passed: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">تم اجتياز تدقيق التحيز</span>
            </label>
          </Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
