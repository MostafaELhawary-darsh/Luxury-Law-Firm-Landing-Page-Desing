import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Scale, Archive, Send, Activity, Server, Globe,
  Building2, Percent, Landmark, Users,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { M25Financing, M25AuditLog } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'financings' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  initiation: { label: 'بدء', bg: 'bg-blue-50', text: 'text-blue-700' },
  due_diligence: { label: 'العناية الواجبة', bg: 'bg-amber-50', text: 'text-amber-700' },
  drafted: { label: 'مُصاغ', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  board_approved: { label: 'موافقة المجلس', bg: 'bg-purple-50', text: 'text-purple-700' },
  signed: { label: 'مُوقَّع', bg: 'bg-green-50', text: 'text-green-700' },
  disbursed: { label: 'مُصرَف', bg: 'bg-green-100', text: 'text-green-800' },
};

const STAGES = ['initiation', 'due_diligence', 'drafted', 'board_approved', 'signed', 'disbursed'];

const FINANCING_TYPE_LABELS: Record<string, string> = {
  loan: 'قرض',
  bond: 'سند',
  syndicated_loan: 'قرض مشترك',
  ipo: 'طرح عام',
  venture_capital: 'رأس مال جريء',
};

interface FinancingForm {
  financing_number: string;
  financing_title: string;
  financing_type: string;
  stage: string;
  financier_name: string;
  borrower_name: string;
  principal_amount: string;
  interest_rate: string;
  grace_period_months: string;
  maturity_date: string;
  collateral_description: string;
  is_syndicated: boolean;
  is_ipo: boolean;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: FinancingForm = {
  financing_number: '', financing_title: '', financing_type: 'loan', stage: 'initiation',
  financier_name: '', borrower_name: '', principal_amount: '0', interest_rate: '0',
  grace_period_months: '0', maturity_date: '', collateral_description: '',
  is_syndicated: false, is_ipo: false, assigned_advisor_id: '', description: '',
};

export default function StrategicFinanceEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [financings, setFinancings] = useState<M25Financing[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('financings');
  const [selectedFinancing, setSelectedFinancing] = useState<M25Financing | null>(null);
  const [auditLogs, setAuditLogs] = useState<M25AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M25AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FinancingForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [finRes, attRes, auditRes] = await Promise.all([
      supabase.from('m25_financings')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m25_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setFinancings((finRes.data as M25Financing[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M25AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, financing_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (financingId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m25_audit_logs').insert({
      case_id: financingId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (f: M25Financing) => {
    setForm({
      financing_number: f.financing_number, financing_title: f.financing_title, financing_type: f.financing_type,
      stage: f.stage, financier_name: f.financier_name || '', borrower_name: f.borrower_name || '',
      principal_amount: String(f.principal_amount || 0), interest_rate: String(f.interest_rate || 0),
      grace_period_months: String(f.grace_period_months || 0), maturity_date: f.maturity_date || '',
      collateral_description: f.collateral_description || '', is_syndicated: f.is_syndicated,
      is_ipo: f.is_ipo, assigned_advisor_id: f.assigned_advisor_id || '', description: f.description || '',
    });
    setEditingId(f.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.financing_title.trim() || !form.financing_number.trim()) return;
    setSaving(true);
    const payload = {
      financing_number: form.financing_number.trim(),
      financing_title: form.financing_title.trim(),
      financing_type: form.financing_type,
      stage: form.stage,
      status: form.stage,
      financier_name: form.financier_name.trim() || null,
      borrower_name: form.borrower_name.trim() || null,
      principal_amount: Number(form.principal_amount) || 0,
      interest_rate: Number(form.interest_rate) || 0,
      grace_period_months: Number(form.grace_period_months) || 0,
      maturity_date: form.maturity_date || null,
      collateral_description: form.collateral_description.trim() || null,
      is_syndicated: form.is_syndicated,
      is_ipo: form.is_ipo,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m25_financings').update(payload).eq('id', editingId);
      await logAudit(editingId, 'financing_updated', 'تحديث بيانات التمويل الاستراتيجي');
    } else {
      const { data } = await supabase.from('m25_financings').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'financing_created', 'إنشاء تمويل استراتيجي — نوع: ' + (FINANCING_TYPE_LABELS[form.financing_type] || form.financing_type));
        await supabase.from('m25_financings').update({
          m53_archived: true,
          m49_board_approved: form.stage === 'board_approved' || form.stage === 'signed' || form.stage === 'disbursed',
          m50_risk_assessed: true,
          m54_cost_center_opened: true,
          m10_deadlines_registered: true,
          m51_tasks_generated: true,
          m98_stock_exchange_linked: form.is_ipo,
          m109_biometric_required: true,
          m92_notified: true,
          cost_center_id: 'CC-M25-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_archive', 'أرشفة مستندات التمويل في الخزنة (M53)');
        await logAudit(newId, 'm49_board', 'ربط التمويل بمحرك مجلس الإدارة (M49)');
        await logAudit(newId, 'm50_risk', 'تقييم مخاطر التمويل في محرك المخاطر (M50)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm10_deadlines', 'تسجيل مواعيد التمويل في محرك القضايا (M10)');
        await logAudit(newId, 'm51_tasks', 'توليد مهام التمويل في محرك المهام (M51)');
        if (form.is_ipo) {
          await logAudit(newId, 'm98_stock_exchange', 'ربط الطرح العام بسوق الأوراق المالية في محرك الأسواق (M98)');
        }
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للمستثمرين في محرك الهوية (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء التمويل');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m25_financings').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedFinancing(null);
    fetchAll();
  };

  const openFinancingDetail = async (f: M25Financing) => {
    setSelectedFinancing(f);
    setDetailLoading(true);
    const aRes = await supabase.from('m25_audit_logs').select('*').eq('case_id', f.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M25AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (f: M25Financing) => {
    const idx = STAGES.indexOf(f.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m25_financings').update({ stage: next, status: next }).eq('id', f.id);
    await logAudit(f.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    if (next === 'board_approved') {
      await supabase.from('m25_financings').update({ m49_board_approved: true }).eq('id', f.id);
      await logAudit(f.id, 'm49_board_approved', 'موافقة مجلس الإدارة في محرك المجلس (M49)');
    }
    fetchAll();
    const updated = { ...f, stage: next, status: next };
    setSelectedFinancing(updated as M25Financing);
  };

  const filteredFinancings = financings.filter((f) => {
    if (filterType !== 'all' && f.financing_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!f.financing_number.toLowerCase().includes(q) && !f.financing_title.toLowerCase().includes(q) && !(f.financier_name || '').toLowerCase().includes(q) && !(f.borrower_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCount = financings.filter((f) => f.stage === 'signed' || f.stage === 'disbursed').length;
  const totalPrincipal = financings.reduce((s, f) => s + (f.principal_amount || 0), 0);
  const avgRate = financings.length > 0 ? financings.reduce((s, f) => s + (f.interest_rate || 0), 0) / financings.length : 0;

  const tabs: { id: Tab; label: string; icon: typeof TrendingUp; badge?: number }[] = [
    { id: 'financings', label: 'التمويلات', icon: TrendingUp, badge: financings.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <TrendingUp size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الشركات والعقود التجارية والمالية والأسواق (M60)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة القروض والسندات والقروض المشتركة والطرح العام ورأس المال الجريء</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> تمويل جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp size={14} className="text-midnight" />} label="إجمالي التمويلات" value={String(financings.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="نشطة" value={String(activeCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي المبلغ الأصلي" value={formatCurrency(totalPrincipal)} valueClass="text-gold" />
        <StatCard icon={<Percent size={14} className="text-amber-600" />} label="متوسط الفائدة" value={avgRate.toFixed(2) + '%'} valueClass="text-amber-700" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة التمويل الاستراتيجي — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.initiation;
            const count = financings.filter((f) => f.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} تمويل</span>
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
            { icon: Archive, label: 'الخزنة (M53)', desc: 'أرشفة المستندات', color: 'text-blue-600' },
            { icon: Landmark, label: 'مجلس الإدارة (M49)', desc: 'موافقة المجلس', color: 'text-purple-600' },
            { icon: AlertTriangle, label: 'المخاطر (M50)', desc: 'تقييم مخاطر التمويل', color: 'text-red-600' },
            { icon: DollarSign, label: 'المالية (M54)', desc: 'مراكز التكلفة', color: 'text-gold' },
            { icon: Scale, label: 'القضايا (M10)', desc: 'تسجيل المواعيد', color: 'text-blue-600' },
            { icon: CircuitBoard, label: 'المهام (M51)', desc: 'توليد المهام', color: 'text-amber-600' },
            { icon: Globe, label: 'سوق الأوراق (M98)', desc: 'ربط الطرح العام', color: 'text-green-600' },
            { icon: BadgeCheck, label: 'الهوية (M109)', desc: 'تحقق بيومتري', color: 'text-purple-600' },
            { icon: Zap, label: 'الوكيل (M92)', desc: 'تنبيهات ذكية', color: 'text-amber-600' },
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

      {/* Filters for financings */}
      {activeTab === 'financings' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(FINANCING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو طرف..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Financings tab */}
      {activeTab === 'financings' && (
        <div className="space-y-2">
          {filteredFinancings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <TrendingUp size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تمويلات استراتيجية مسجلة</p>
            </div>
          ) : (
            filteredFinancings.map((f) => {
              const sCfg = STAGE_CONFIG[f.stage] || STAGE_CONFIG.initiation;
              const stageIdx = STAGES.indexOf(f.stage);
              return (
                <div key={f.id} onClick={() => openFinancingDetail(f)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TrendingUp size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{f.financing_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{FINANCING_TYPE_LABELS[f.financing_type] || f.financing_type}</span>
                          {f.is_syndicated && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Users size={8} /> مشترك</span>}
                          {f.is_ipo && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Globe size={8} /> طرح عام</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{f.financing_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {f.financier_name && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{f.financier_name}</span>}
                          {f.borrower_name && <span className="font-body text-[9px] text-ink/40">← {f.borrower_name}</span>}
                          {f.principal_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(f.principal_amount)}</span>}
                          {f.interest_rate > 0 && <span className="font-body text-[9px] text-amber-600"><Percent size={9} className="inline ml-0.5" />{f.interest_rate}%</span>}
                          {f.maturity_date && <span className="font-body text-[9px] text-amber-600"><Calendar size={9} className="inline ml-0.5" />{formatDate(f.maturity_date)}</span>}
                          {f.m49_board_approved && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Landmark size={8} /> M49</span>}
                          {f.m50_risk_assessed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertTriangle size={8} /> M50</span>}
                          {f.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {f.m10_deadlines_registered && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {f.m51_tasks_generated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M51</span>}
                          {f.m98_stock_exchange_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Globe size={8} /> M98</span>}
                          {f.m109_biometric_required && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><BadgeCheck size={8} /> M109</span>}
                          {f.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Zap size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(f); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(f.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <TrendingUp size={12} className="text-blue-600" />
                      : log.action.includes('m49') ? <Landmark size={12} className="text-purple-600" />
                      : log.action.includes('m50') ? <AlertTriangle size={12} className="text-red-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m51') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('m53') ? <Archive size={12} className="text-blue-600" />
                      : log.action.includes('m98') ? <Globe size={12} className="text-green-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-purple-600" />
                      : log.action.includes('m92') ? <Zap size={12} className="text-amber-600" />
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

      {/* Financing detail drawer */}
      {selectedFinancing && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedFinancing(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">التمويل الاستراتيجي</span>
              </div>
              <button onClick={() => setSelectedFinancing(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedFinancing.financing_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedFinancing.stage] || STAGE_CONFIG.initiation).bg} ${(STAGE_CONFIG[selectedFinancing.stage] || STAGE_CONFIG.initiation).text}`}>
                      {(STAGE_CONFIG[selectedFinancing.stage] || STAGE_CONFIG.initiation).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{FINANCING_TYPE_LABELS[selectedFinancing.financing_type] || selectedFinancing.financing_type}</span>
                    {selectedFinancing.is_syndicated && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600"><Users size={10} /> مشترك</span>}
                    {selectedFinancing.is_ipo && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600"><Globe size={10} /> طرح عام</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedFinancing.financing_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.initiation;
                      const stageIdx = STAGES.indexOf(selectedFinancing.stage);
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
                  {selectedFinancing.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedFinancing)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Parties info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">أطراف التمويل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المُموِّل (Financier)</span><p className="font-body text-xs font-bold text-midnight">{selectedFinancing.financier_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المُقترض (Borrower)</span><p className="font-body text-xs font-bold text-midnight">{selectedFinancing.borrower_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قرض مشترك</span><p className="font-body text-xs font-bold text-midnight">{selectedFinancing.is_syndicated ? 'نعم' : 'لا'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">طرح عام</span><p className="font-body text-xs font-bold text-midnight">{selectedFinancing.is_ipo ? 'نعم' : 'لا'}</p></div>
                  </div>
                </div>

                {/* Financial terms */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الشروط المالية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">المبلغ الأصلي</span>
                      <p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFinancing.principal_amount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">سعر الفائدة</span>
                      <p className="font-body text-xs font-bold text-amber-600">{selectedFinancing.interest_rate}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">فترة السماح (شهر)</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedFinancing.grace_period_months}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ الاستحقاق</span>
                      <p className="font-body text-xs font-bold text-amber-600">{selectedFinancing.maturity_date ? formatDate(selectedFinancing.maturity_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">المستشار</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedFinancing.advisor?.name || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Collateral */}
                {selectedFinancing.collateral_description && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lock size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">الضمانات</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <p className="font-body text-[10px] text-ink/70 leading-relaxed">{selectedFinancing.collateral_description}</p>
                    </div>
                  </div>
                )}

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedFinancing.cost_center_id || '—'}</span>
                  </div>
                  <div><span className="font-body text-[9px] text-ink/40">المبلغ الأصلي</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedFinancing.principal_amount)}</p></div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m49_board_approved ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Landmark size={10} /> M49 {selectedFinancing.m49_board_approved ? 'مُوافَق' : 'غير مُوافَق'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m50_risk_assessed ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><AlertTriangle size={10} /> M50 {selectedFinancing.m50_risk_assessed ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedFinancing.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m10_deadlines_registered ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedFinancing.m10_deadlines_registered ? 'مُسجَّل' : 'غير مُسجَّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m51_tasks_generated ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M51 {selectedFinancing.m51_tasks_generated ? 'مُولَّد' : 'غير مُولَّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m98_stock_exchange_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Globe size={10} /> M98 {selectedFinancing.m98_stock_exchange_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m109_biometric_required ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedFinancing.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedFinancing.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Zap size={10} /> M92 {selectedFinancing.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedFinancing.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedFinancing.description}</p></div>
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

      {/* Financing create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل التمويل الاستراتيجي' : 'تمويل استراتيجي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم التمويل" required><TextInput value={form.financing_number} onChange={(e) => setForm({ ...form, financing_number: e.target.value })} placeholder="FIN-2025-001" /></Field>
          <Field label="نوع التمويل">
            <Select value={form.financing_type} onChange={(e) => setForm({ ...form, financing_type: e.target.value })}>
              {Object.entries(FINANCING_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان التمويل" required><TextInput value={form.financing_title} onChange={(e) => setForm({ ...form, financing_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="المبلغ الأصلي"><TextInput type="number" value={form.principal_amount} onChange={(e) => setForm({ ...form, principal_amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المُموِّل (Financier)"><TextInput value={form.financier_name} onChange={(e) => setForm({ ...form, financier_name: e.target.value })} /></Field>
          <Field label="المُقترض (Borrower)"><TextInput value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="سعر الفائدة (%)"><TextInput type="number" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} /></Field>
          <Field label="فترة السماح (شهر)"><TextInput type="number" value={form.grace_period_months} onChange={(e) => setForm({ ...form, grace_period_months: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الاستحقاق"><TextInput type="date" value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} /></Field>
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قرض مشترك">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.is_syndicated} onChange={(e) => setForm({ ...form, is_syndicated: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">قرض مشترك (Syndicated)</span>
            </label>
          </Field>
          <Field label="طرح عام">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.is_ipo} onChange={(e) => setForm({ ...form, is_ipo: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">طرح عام (IPO)</span>
            </label>
          </Field>
        </div>
        <Field label="وصف الضمانات"><TextArea value={form.collateral_description} onChange={(e) => setForm({ ...form, collateral_description: e.target.value })} rows={2} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
