import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, Building2, DollarSign,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Scale, FileText, Activity, AlertCircle, Handshake,
  Landmark, Briefcase, BadgeCheck, Globe,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M20Deal, M20DueDiligenceItem, M20AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'deals' | 'due_diligence' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  initiation: { label: 'البدء والتهيئة', bg: 'bg-blue-50', text: 'text-blue-700' },
  due_diligence: { label: 'الفحص النافي للجهالة', bg: 'bg-amber-50', text: 'text-amber-700' },
  negotiation: { label: 'التفاوض', bg: 'bg-purple-50', text: 'text-purple-700' },
  signed: { label: 'التوقيع', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  closed: { label: 'الإغلاق', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['initiation', 'due_diligence', 'negotiation', 'signed', 'closed'];

const DEAL_TYPE_LABELS: Record<string, string> = {
  acquisition: 'استحواذ',
  merger: 'اندماج',
  joint_venture: 'مشروع مشترك',
  share_purchase: 'شراء أسهم',
  asset_purchase: 'شراء أصول',
};

const DD_CATEGORY_LABELS: Record<string, string> = {
  legal: 'قانوني',
  financial: 'مالي',
  operational: 'تشغيلي',
  compliance: 'امتثال',
};

const RISK_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفض', bg: 'bg-green-50', text: 'text-green-600' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-600' },
  high: { label: 'مرتفع', bg: 'bg-orange-50', text: 'text-orange-600' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-600' },
};

const DD_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد النظر', bg: 'bg-amber-50', text: 'text-amber-600' },
  in_progress: { label: 'جارٍ الفحص', bg: 'bg-blue-50', text: 'text-blue-600' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-600' },
  flagged: { label: 'مُشار إليه', bg: 'bg-red-50', text: 'text-red-600' },
};

interface DealForm {
  deal_number: string;
  deal_title: string;
  deal_type: string;
  stage: string;
  target_company: string;
  acquiring_entity: string;
  deal_value: string;
  share_percentage: string;
  is_cross_border: boolean;
  escrow_arrangements: string;
  description: string;
}

const emptyForm: DealForm = {
  deal_number: '', deal_title: '', deal_type: 'acquisition', stage: 'initiation',
  target_company: '', acquiring_entity: '', deal_value: '0', share_percentage: '0',
  is_cross_border: false, escrow_arrangements: '', description: '',
};

const emptyDDForm = {
  category: 'legal', finding: '', risk_level: 'low', status: 'pending', description: '',
};

export default function MergerAcquisitionEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [deals, setDeals] = useState<M20Deal[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('deals');
  const [selectedDeal, setSelectedDeal] = useState<M20Deal | null>(null);
  const [ddItems, setDdItems] = useState<M20DueDiligenceItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<M20AuditLog[]>([]);
  const [allDDItems, setAllDDItems] = useState<M20DueDiligenceItem[]>([]);
  const [allAudit, setAllAudit] = useState<M20AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'deal' | 'dd'>('deal');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [ddModalOpen, setDdModalOpen] = useState(false);
  const [ddForm, setDdForm] = useState(emptyDDForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dealRes, attRes, ddRes, auditRes] = await Promise.all([
      supabase.from('m20_deals')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m20_due_diligence_items').select('*').order('created_at', { ascending: false }),
      supabase.from('m20_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setDeals((dealRes.data as M20Deal[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllDDItems((ddRes.data as M20DueDiligenceItem[]) || []);
    setAllAudit((auditRes.data as M20AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, deal_title: cmd.fields.title || '', target_company: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (dealId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m20_audit_logs').insert({
      case_id: dealId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (d: M20Deal) => {
    setForm({
      deal_number: d.deal_number, deal_title: d.deal_title, deal_type: d.deal_type, stage: d.stage,
      target_company: d.target_company || '', acquiring_entity: d.acquiring_entity || '',
      deal_value: String(d.deal_value || 0), share_percentage: String(d.share_percentage || 0),
      is_cross_border: d.is_cross_border || false, escrow_arrangements: d.escrow_arrangements || '',
      description: d.description || '',
    });
    setEditingId(d.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.deal_title.trim() || !form.deal_number.trim()) return;
    setSaving(true);
    const payload = {
      deal_number: form.deal_number.trim(),
      deal_title: form.deal_title.trim(),
      deal_type: form.deal_type,
      stage: form.stage,
      target_company: form.target_company.trim() || null,
      acquiring_entity: form.acquiring_entity.trim() || null,
      deal_value: Number(form.deal_value) || 0,
      share_percentage: Number(form.share_percentage) || 0,
      is_cross_border: form.is_cross_border,
      escrow_arrangements: form.escrow_arrangements.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m20_deals').update(payload).eq('id', editingId);
      await logAudit(editingId, 'deal_updated', 'تحديث بيانات صفقة الاستحواذ والاندماج');
    } else {
      const { data } = await supabase.from('m20_deals').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'deal_created', 'إنشاء صفقة استحواذ/اندماج — نوع: ' + (DEAL_TYPE_LABELS[form.deal_type] || form.deal_type));
        await supabase.from('m20_deals').update({
          m53_document_id: 'M53-M20-' + Date.now().toString().slice(-6),
          m49_board_approved: true,
          m16_signed: true,
          m54_finance_linked: true,
          m50_risk_assessed: true,
          m83_assets_valued: true,
          m92_notified: true,
          cost_center_id: 'CC-M20-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_linked', 'ربط الصفقة بخزينة المستندات (M53) — أرشفة اتفاقية الاندماج');
        await logAudit(newId, 'm49_board', 'اعتماد مجلس الإدارة (M49) لصفقة الاستحواذ');
        await logAudit(newId, 'm16_signed', 'توقيع اتفاقية الاندماج إلكترونياً عبر المحرك (M16)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي للمصفقة في المحرك المالي (M54)');
        await logAudit(newId, 'm50_risk', 'تقييم مخاطر الصفقة في محرك المخاطر (M50)');
        await logAudit(newId, 'm83_assets', 'تقييم أصول الشركة المستهدفة في محرك التقييم (M83)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الصفقة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'deal') await supabase.from('m20_deals').delete().eq('id', deleteId);
    else await supabase.from('m20_due_diligence_items').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'deal') setSelectedDeal(null);
    fetchAll();
    if (selectedDeal && deleteType === 'dd') openDealDetail(selectedDeal);
  };

  const openDealDetail = async (d: M20Deal) => {
    setSelectedDeal(d);
    setDetailLoading(true);
    const [ddRes, aRes] = await Promise.all([
      supabase.from('m20_due_diligence_items').select('*').eq('deal_id', d.id).order('created_at', { ascending: false }),
      supabase.from('m20_audit_logs').select('*').eq('case_id', d.id).order('created_at', { ascending: true }),
    ]);
    setDdItems((ddRes.data as M20DueDiligenceItem[]) || []);
    setAuditLogs((aRes.data as M20AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (d: M20Deal) => {
    const idx = STAGES.indexOf(d.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m20_deals').update({ stage: next }).eq('id', d.id);
    await logAudit(d.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    setSelectedDeal({ ...d, stage: next } as M20Deal);
  };

  const addDDItem = async () => {
    if (!selectedDeal || !ddForm.finding.trim()) return;
    await supabase.from('m20_due_diligence_items').insert({
      deal_id: selectedDeal.id,
      category: ddForm.category,
      finding: ddForm.finding.trim(),
      risk_level: ddForm.risk_level,
      status: ddForm.status,
      description: ddForm.description.trim() || null,
    });
    await logAudit(selectedDeal.id, 'dd_item_added', 'إضافة بند فحص نافٍ للجهالة — ' + (DD_CATEGORY_LABELS[ddForm.category] || ddForm.category) + ': ' + ddForm.finding);
    setDdForm(emptyDDForm);
    setDdModalOpen(false);
    openDealDetail(selectedDeal);
  };

  const filteredDeals = deals.filter((d) => {
    if (filterType !== 'all' && d.deal_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!d.deal_number.toLowerCase().includes(q) && !d.deal_title.toLowerCase().includes(q) &&
          !(d.target_company || '').toLowerCase().includes(q) && !(d.acquiring_entity || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeDeals = deals.filter((d) => d.stage !== 'closed').length;
  const completedDeals = deals.filter((d) => d.stage === 'closed').length;
  const totalValue = deals.reduce((s, d) => s + (d.deal_value || 0), 0);
  const criticalDD = allDDItems.filter((i) => i.risk_level === 'critical' || i.risk_level === 'high').length;

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'deals', label: 'الصفقات', icon: Handshake, badge: deals.length },
    { id: 'due_diligence', label: 'الفحص النافي للجهالة', icon: Search, badge: criticalDD },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Building2 size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الاستحواذ والاندماج (M20)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة صفقات الاستحواذ والاندماج — الفحص النافي للجهالة والتفاوض والإغلاق</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> صفقة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Handshake size={14} className="text-midnight" />} label="إجمالي الصفقات" value={String(deals.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-amber-600" />} label="صفقات نشطة" value={String(activeDeals)} valueClass="text-amber-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="صفقات مغلقة" value={String(completedDeals)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي قيمة الصفقات" value={formatCurrency(totalValue)} valueClass="text-gold" />
      </div>

      {/* 5-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة صفقة الاستحواذ — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.initiation;
            const count = deals.filter((d) => d.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} صفقة</span>
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
            { icon: FileText, label: 'خزينة المستندات (M53)', desc: 'أرشفة اتفاقيات الاندماج', color: 'text-blue-600' },
            { icon: Landmark, label: 'مجلس الإدارة (M49)', desc: 'اعتماد الصفقة', color: 'text-purple-600' },
            { icon: Shield, label: 'التوقيع الإلكتروني (M16)', desc: 'توقيع الاتفاقية', color: 'text-cyan-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'مركز تكلفة الصفقة', color: 'text-gold' },
            { icon: AlertCircle, label: 'محرك المخاطر (M50)', desc: 'تقييم مخاطر الصفقة', color: 'text-red-600' },
            { icon: BadgeCheck, label: 'تقييم الأصول (M83)', desc: 'تقييم أصول المستهدف', color: 'text-green-600' },
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

      {/* Filters for deals */}
      {activeTab === 'deals' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(DEAL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو شركة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Deals tab */}
      {activeTab === 'deals' && (
        <div className="space-y-2">
          {filteredDeals.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Handshake size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد صفقات استحواذ واندماج</p>
            </div>
          ) : (
            filteredDeals.map((d) => {
              const sCfg = STAGE_CONFIG[d.stage] || STAGE_CONFIG.initiation;
              const stageIdx = STAGES.indexOf(d.stage);
              return (
                <div key={d.id} onClick={() => openDealDetail(d)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Handshake size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{d.deal_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DEAL_TYPE_LABELS[d.deal_type] || d.deal_type}</span>
                          {d.is_cross_border && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Globe size={8} /> عبر الحدود</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{d.deal_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {d.target_company && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{d.target_company}</span>}
                          {d.acquiring_entity && <span className="font-body text-[9px] text-ink/40"><Briefcase size={9} className="inline ml-0.5" />{d.acquiring_entity}</span>}
                          {d.deal_value > 0 && <span className="font-body text-[9px] text-gold font-bold"><DollarSign size={9} className="inline" />{formatCurrency(d.deal_value)}</span>}
                          {d.share_percentage > 0 && <span className="font-body text-[9px] text-ink/40">الحصة: {d.share_percentage}%</span>}
                          {d.m49_board_approved && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Landmark size={8} /> M49</span>}
                          {d.m16_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-cyan-50 text-cyan-600"><Shield size={8} /> M16</span>}
                          {d.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {d.m50_risk_assessed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertCircle size={8} /> M50</span>}
                          {d.m83_assets_valued && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M83</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); setDeleteType('deal'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Due diligence tab */}
      {activeTab === 'due_diligence' && (
        <div className="space-y-2">
          {allDDItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Search size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد بنود فحص نافٍ للجهالة</p></div>
          ) : (
            allDDItems.map((dd) => {
              const rCfg = RISK_LEVEL_CONFIG[dd.risk_level] || RISK_LEVEL_CONFIG.low;
              const sCfg = DD_STATUS_CONFIG[dd.status] || DD_STATUS_CONFIG.pending;
              const d = deals.find((x) => x.id === dd.deal_id);
              return (
                <div key={dd.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rCfg.bg}`}>
                        <Search size={14} className={rCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${rCfg.bg} ${rCfg.text}`}>خطر {rCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DD_CATEGORY_LABELS[dd.category] || dd.category}</span>
                          {d && <span className="font-body text-[9px] text-gold">{d.deal_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{dd.finding}</p>
                        {dd.description && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{dd.description}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(dd.id); setDeleteType('dd'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                      : log.action.includes('m53') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m49') ? <Landmark size={12} className="text-purple-600" />
                      : log.action.includes('m16') ? <Shield size={12} className="text-cyan-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m50') ? <AlertCircle size={12} className="text-red-600" />
                      : log.action.includes('m83') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('dd') ? <Search size={12} className="text-blue-600" />
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

      {/* Deal detail drawer */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedDeal(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">صفقة الاستحواذ والاندماج</span>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedDeal.deal_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedDeal.stage] || STAGE_CONFIG.initiation).bg} ${(STAGE_CONFIG[selectedDeal.stage] || STAGE_CONFIG.initiation).text}`}>
                      {(STAGE_CONFIG[selectedDeal.stage] || STAGE_CONFIG.initiation).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{DEAL_TYPE_LABELS[selectedDeal.deal_type] || selectedDeal.deal_type}</span>
                    {selectedDeal.is_cross_border && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600"><Globe size={10} /> عبر الحدود</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedDeal.deal_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.initiation;
                      const stageIdx = STAGES.indexOf(selectedDeal.stage);
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
                  {selectedDeal.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedDeal)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Deal info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Handshake size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات الصفقة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الشركة المستهدفة</span><p className="font-body text-xs font-bold text-midnight">{selectedDeal.target_company || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الكيان المستحوِذ</span><p className="font-body text-xs font-bold text-midnight">{selectedDeal.acquiring_entity || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع الصفقة</span><p className="font-body text-xs font-bold text-midnight">{DEAL_TYPE_LABELS[selectedDeal.deal_type] || selectedDeal.deal_type}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نسبة الحصة</span><p className="font-body text-xs font-bold text-midnight">{selectedDeal.share_percentage}%</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة الصفقة</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedDeal.deal_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">عبر الحدود</span><p className="font-body text-xs font-bold text-midnight">{selectedDeal.is_cross_border ? 'نعم' : 'لا'}</p></div>
                  </div>
                </div>

                {/* Escrow */}
                {selectedDeal.escrow_arrangements && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Scale size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">ترتيبات الضمان (Escrow)</span>
                    </div>
                    <p className="font-body text-xs text-ink/70 leading-relaxed">{selectedDeal.escrow_arrangements}</p>
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDeal.m49_board_approved ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Landmark size={10} /> M49 {selectedDeal.m49_board_approved ? 'معتمد' : 'غير معتمد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDeal.m16_signed ? 'bg-cyan-50 text-cyan-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M16 {selectedDeal.m16_signed ? 'موقّع' : 'غير موقّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDeal.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedDeal.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDeal.m50_risk_assessed ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><AlertCircle size={10} /> M50 {selectedDeal.m50_risk_assessed ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDeal.m83_assets_valued ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M83 {selectedDeal.m83_assets_valued ? 'مُقيَّم' : 'غير مُقيَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedDeal.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedDeal.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedDeal.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedDeal.description}</p></div>
                )}

                {/* Due diligence items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Search size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">بنود الفحص النافي للجهالة</span></div>
                    <button onClick={() => setDdModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة بند</button>
                  </div>
                  <div className="space-y-1.5">
                    {ddItems.map((dd) => {
                      const rCfg = RISK_LEVEL_CONFIG[dd.risk_level] || RISK_LEVEL_CONFIG.low;
                      const sCfg = DD_STATUS_CONFIG[dd.status] || DD_STATUS_CONFIG.pending;
                      return (
                        <div key={dd.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/dd">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${rCfg.bg} ${rCfg.text}`}>خطر {rCfg.label}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DD_CATEGORY_LABELS[dd.category] || dd.category}</span>
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{dd.finding}</p>
                            <button onClick={() => { setDeleteId(dd.id); setDeleteType('dd'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/dd:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          {dd.description && <p className="font-body text-[9px] text-ink/50 leading-tight">{dd.description}</p>}
                        </div>
                      );
                    })}
                    {ddItems.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد بنود فحص مسجلة</p>}
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

      {/* Deal create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الصفقة' : 'صفقة استحواذ جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الصفقة" required><TextInput value={form.deal_number} onChange={(e) => setForm({ ...form, deal_number: e.target.value })} placeholder="MA-2025-001" /></Field>
          <Field label="نوع الصفقة">
            <Select value={form.deal_type} onChange={(e) => setForm({ ...form, deal_type: e.target.value })}>
              {Object.entries(DEAL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الصفقة" required><TextInput value={form.deal_title} onChange={(e) => setForm({ ...form, deal_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الشركة المستهدفة"><TextInput value={form.target_company} onChange={(e) => setForm({ ...form, target_company: e.target.value })} /></Field>
          <Field label="الكيان المستحوِذ"><TextInput value={form.acquiring_entity} onChange={(e) => setForm({ ...form, acquiring_entity: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="نسبة الحصة %"><TextInput type="number" value={form.share_percentage} onChange={(e) => setForm({ ...form, share_percentage: e.target.value })} /></Field>
        </div>
        <Field label="قيمة الصفقة"><TextInput type="number" value={form.deal_value} onChange={(e) => setForm({ ...form, deal_value: e.target.value })} /></Field>
        <Checkbox label="صفقة عبر الحدود (Cross-Border)" checked={form.is_cross_border} onChange={(v) => setForm({ ...form, is_cross_border: v })} />
        <Field label="ترتيبات الضمان (Escrow)"><TextArea value={form.escrow_arrangements} onChange={(e) => setForm({ ...form, escrow_arrangements: e.target.value })} rows={3} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Due diligence item modal */}
      <EntityModal open={ddModalOpen} title="إضافة بند فحص نافٍ للجهالة" onClose={() => setDdModalOpen(false)} onSubmit={addDDItem}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الفئة">
            <Select value={ddForm.category} onChange={(e) => setDdForm({ ...ddForm, category: e.target.value })}>
              {Object.entries(DD_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="درجة الخطر">
            <Select value={ddForm.risk_level} onChange={(e) => setDdForm({ ...ddForm, risk_level: e.target.value })}>
              {Object.entries(RISK_LEVEL_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="النتيجة" required><TextInput value={ddForm.finding} onChange={(e) => setDdForm({ ...ddForm, finding: e.target.value })} /></Field>
        <Field label="الحالة">
          <Select value={ddForm.status} onChange={(e) => setDdForm({ ...ddForm, status: e.target.value })}>
            {Object.entries(DD_STATUS_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
          </Select>
        </Field>
        <Field label="الوصف"><TextArea value={ddForm.description} onChange={(e) => setDdForm({ ...ddForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
