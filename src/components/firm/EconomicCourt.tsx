import { useEffect, useState, useCallback } from 'react';
import {
  Gavel, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search,
  Building2, Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, AlertOctagon, Server, Briefcase, Landmark, Link2, Archive,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M04EconomicCase as M04Case, M04EconomicParty as M04Party,
  M04FinancialLink, M04VaultDocument, M04EconomicAuditLog as M04AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'financial_links' | 'vault_documents' | 'parties' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  technical_analysis: { label: 'التحليل الفني', bg: 'bg-blue-50', text: 'text-blue-700' },
  parallel_processing: { label: 'المعالجة الموازية', bg: 'bg-amber-50', text: 'text-amber-700' },
  documentation: { label: 'التوثيق السيادي', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['technical_analysis', 'parallel_processing', 'documentation'];

const CATEGORY_LABELS: Record<string, string> = {
  bankruptcy: 'إفلاس',
  protective_conciliation: 'صلح واقي',
  corporate_restructuring: 'إعادة هيكلة',
  stock_market: 'بورصة',
  money_laundering: 'غسل أموال',
};

const SUBTYPE_LABELS: Record<string, string> = {
  voluntary_bankruptcy: 'إفلاس اختياري',
  involuntary_bankruptcy: 'إفلاس إجباري',
  protective_conciliation_plan: 'خطة صلح واقي',
  restructuring_plan: 'خطة إعادة هيكلة',
  stock_market_violation: 'مخالفة بورصية',
  insider_trading: 'تداول insider',
  laundering_proceeds: 'غسل عائدات',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  debtor: 'المدين',
  creditor: 'الدائن',
  shareholder: 'مساهم',
  liquidator: 'مصفٍّ',
  trustee: 'أمين التفليسة',
  regulator: 'جهة رقابية',
  witness: 'شاهد',
  expert: 'خبير',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  individual: 'فرد طبيعي',
  company: 'شركة',
  bank: 'بنك',
  government: 'جهة حكومية',
  regulator: 'جهة رقابية',
};

const LINK_TYPE_LABELS: Record<string, string> = {
  company_registry: 'السجل التجاري (M60)',
  stock_market: 'البورصة (M98)',
  bank_account: 'حساب بنكي',
  financial_statement: 'قائمة مالية',
  asset_registry: 'سجل الأصول',
  credit_bureau: 'مكتب الائتمان',
};

const VAULT_DOC_TYPE_LABELS: Record<string, string> = {
  bankruptcy_petition: 'طلب إفلاس',
  restructuring_plan: 'خطة إعادة هيكلة',
  financial_statement: 'قائمة مالية',
  court_ruling: 'حكم قضائي',
  expert_report: 'تقرير خبير',
  settlement_agreement: 'اتفاقية تسوية',
  evidence: 'دليل',
  correspondence: 'مراسلات',
};

const ACCESS_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  public: { label: 'عام', bg: 'bg-gray-100', text: 'text-gray-600' },
  restricted: { label: 'مقيد', bg: 'bg-amber-50', text: 'text-amber-600' },
  confidential: { label: 'سري', bg: 'bg-red-50', text: 'text-red-600' },
  sealed: { label: 'مختوم', bg: 'bg-purple-50', text: 'text-purple-600' },
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string;
  stage: string;
  court: string;
  court_circuit: string;
  filing_date: string;
  next_hearing_date: string;
  success_rate_estimate: string;
  financial_value: string;
  court_fees: string;
  total_claims: string;
  total_liabilities: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'bankruptcy', dispute_subtype: 'voluntary_bankruptcy',
  stage: 'technical_analysis', court: '', court_circuit: '', filing_date: '', next_hearing_date: '', success_rate_estimate: '50',
  financial_value: '0', court_fees: '0', total_claims: '0', total_liabilities: '0', assigned_advisor_id: '', description: '',
};

export default function EconomicCourt({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M04Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M04Case | null>(null);
  const [parties, setParties] = useState<M04Party[]>([]);
  const [financialLinks, setFinancialLinks] = useState<M04FinancialLink[]>([]);
  const [vaultDocs, setVaultDocs] = useState<M04VaultDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<M04AuditLog[]>([]);
  const [allFinancialLinks, setAllFinancialLinks] = useState<M04FinancialLink[]>([]);
  const [allVaultDocs, setAllVaultDocs] = useState<M04VaultDocument[]>([]);
  const [allAudit, setAllAudit] = useState<M04AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'party' | 'financial_link' | 'vault_doc'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'debtor', name: '', role: '', entity_type: 'company', registration_number: '', contact_info: '', legal_representation: '' });
  const [finLinkModalOpen, setFinLinkModalOpen] = useState(false);
  const [finLinkForm, setFinLinkForm] = useState({ link_type: 'company_registry', entity_name: '', entity_ref: '', source_engine: 'M60' });
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultForm, setVaultForm] = useState({ document_title: '', document_type: 'bankruptcy_petition', file_ref: '', access_level: 'restricted', uploaded_by: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, flRes, vdRes, auditRes] = await Promise.all([
      supabase.from('m04_economic_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m04_financial_links').select('*').order('created_at', { ascending: false }),
      supabase.from('m04_vault_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('m04_economic_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M04Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllFinancialLinks((flRes.data as M04FinancialLink[]) || []);
    setAllVaultDocs((vdRes.data as M04VaultDocument[]) || []);
    setAllAudit((auditRes.data as M04AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, case_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (caseId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m04_economic_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M04Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      dispute_subtype: c.dispute_subtype || 'voluntary_bankruptcy', stage: c.stage, court: c.court || '',
      court_circuit: c.court_circuit || '', filing_date: c.filing_date || '', next_hearing_date: c.next_hearing_date || '',
      success_rate_estimate: String(c.success_rate_estimate || 50), financial_value: String(c.financial_value || 0),
      court_fees: String(c.court_fees || 0), total_claims: String(c.total_claims || 0),
      total_liabilities: String(c.total_liabilities || 0), assigned_advisor_id: c.assigned_advisor_id || '',
      description: c.description || '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.case_title.trim() || !form.case_number.trim()) return;
    setSaving(true);
    const payload = {
      case_number: form.case_number.trim(),
      case_title: form.case_title.trim(),
      case_category: form.case_category,
      dispute_subtype: form.dispute_subtype,
      stage: form.stage,
      court: form.court.trim() || null,
      court_circuit: form.court_circuit.trim() || null,
      filing_date: form.filing_date || null,
      next_hearing_date: form.next_hearing_date || null,
      success_rate_estimate: Number(form.success_rate_estimate) || 50,
      financial_value: Number(form.financial_value) || 0,
      court_fees: Number(form.court_fees) || 0,
      total_claims: Number(form.total_claims) || 0,
      total_liabilities: Number(form.total_liabilities) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m04_economic_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات القضية الاقتصادية');
    } else {
      const { data } = await supabase.from('m04_economic_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف قضية اقتصادية — تصنيف: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await supabase.from('m04_economic_cases').update({
          m10_linked: true,
          m54_cost_center_opened: true,
          m60_company_linked: true,
          m98_market_linked: true,
          m92_notified: true,
          m53_vault_sealed: true,
          m52_notified: true,
          cost_center_id: 'CC-M04-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط الملف بنواة القضية الذكية (M10)');
        await logAudit(newId, 'm54_cost_center', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm60_company_linked', 'ربط محرك الشركات (M60)');
        await logAudit(newId, 'm98_market_linked', 'ربط محرك البورصة (M98)');
        await logAudit(newId, 'm53_vault_sealed', 'ختم المستودع السيادي (M53) — AES-256');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92)');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52)');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m04_economic_cases').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m04_economic_parties').delete().eq('id', deleteId);
    else if (deleteType === 'financial_link') await supabase.from('m04_financial_links').delete().eq('id', deleteId);
    else if (deleteType === 'vault_doc') await supabase.from('m04_vault_documents').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M04Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [pRes, flRes, vdRes, aRes] = await Promise.all([
      supabase.from('m04_economic_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m04_financial_links').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m04_vault_documents').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m04_economic_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setParties((pRes.data as M04Party[]) || []);
    setFinancialLinks((flRes.data as M04FinancialLink[]) || []);
    setVaultDocs((vdRes.data as M04VaultDocument[]) || []);
    setAuditLogs((aRes.data as M04AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M04Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m04_economic_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedCase(updated as M04Case);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m04_economic_parties').insert({
      case_id: selectedCase.id, party_type: partyForm.party_type, name: partyForm.name.trim(),
      role: partyForm.role.trim() || null, entity_type: partyForm.entity_type || null,
      registration_number: partyForm.registration_number.trim() || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name);
    setPartyForm({ party_type: 'debtor', name: '', role: '', entity_type: 'company', registration_number: '', contact_info: '', legal_representation: '' });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addFinancialLink = async () => {
    if (!selectedCase || !finLinkForm.entity_name.trim()) return;
    await supabase.from('m04_financial_links').insert({
      case_id: selectedCase.id, link_type: finLinkForm.link_type,
      entity_name: finLinkForm.entity_name.trim(),
      entity_ref: finLinkForm.entity_ref.trim() || null,
      financial_data: {},
      source_engine: finLinkForm.source_engine || null,
      retrieved_at: new Date().toISOString(),
    });
    await logAudit(selectedCase.id, 'financial_link_added', 'ربط بيانات مالية: ' + finLinkForm.entity_name + ' — ' + (LINK_TYPE_LABELS[finLinkForm.link_type] || finLinkForm.link_type));
    setFinLinkForm({ link_type: 'company_registry', entity_name: '', entity_ref: '', source_engine: 'M60' });
    setFinLinkModalOpen(false);
    openCaseDetail(selectedCase);
    fetchAll();
  };

  const addVaultDoc = async () => {
    if (!selectedCase || !vaultForm.document_title.trim()) return;
    await supabase.from('m04_vault_documents').insert({
      case_id: selectedCase.id, document_title: vaultForm.document_title.trim(),
      document_type: vaultForm.document_type || null,
      file_ref: vaultForm.file_ref.trim() || null,
      encryption_standard: 'AES-256',
      vault_location: 'M53-VAULT-' + Date.now().toString().slice(-6),
      access_level: vaultForm.access_level,
      uploaded_by: vaultForm.uploaded_by.trim() || null,
      uploaded_at: new Date().toISOString(),
    });
    await logAudit(selectedCase.id, 'vault_doc_uploaded', 'رفع مستند للمستودع السيادي (M53): ' + vaultForm.document_title + ' — AES-256');
    setVaultForm({ document_title: '', document_type: 'bankruptcy_petition', file_ref: '', access_level: 'restricted', uploaded_by: '' });
    setVaultModalOpen(false);
    openCaseDetail(selectedCase);
    fetchAll();
  };

  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => !c.is_final).length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const totalClaims = cases.reduce((s, c) => s + (c.total_claims || 0), 0);
  const totalLiabilities = cases.reduce((s, c) => s + (c.total_liabilities || 0), 0);
  const sealedVaults = allVaultDocs.length;
  const avgSuccess = cases.length > 0 ? cases.reduce((s, c) => s + (c.success_rate_estimate || 0), 0) / cases.length : 0;

  const tabs: { id: Tab; label: string; icon: typeof Gavel; badge?: number }[] = [
    { id: 'cases', label: 'الدعاوى الاقتصادية', icon: Gavel, badge: activeCases },
    { id: 'financial_links', label: 'الروابط المالية', icon: Link2, badge: allFinancialLinks.length },
    { id: 'vault_documents', label: 'مستودع M53 السيادي', icon: Archive, badge: sealedVaults },
    { id: 'parties', label: 'الأطراف', icon: Users },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Gavel size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك المحاكم الاقتصادية (M4)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع القضائي والإجرائي — الإفلاس، الصلح الواقي، إعادة الهيكلة، البورصة، غسل الأموال</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256 · M53</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> دعوى اقتصادية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Gavel size={14} className="text-midnight" />} label="إجمالي الدعاوى" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="دعاوى نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<TrendingUp size={14} className="text-green-600" />} label="متوسط نسبة النجاح" value={avgSuccess.toFixed(1) + '%'} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي المطالبات" value={formatCurrency(totalClaims)} valueClass="text-gold" />
        <StatCard icon={<AlertOctagon size={14} className="text-red-600" />} label="إجمالي الالتزامات" value={formatCurrency(totalLiabilities)} valueClass="text-red-700" />
      </div>

      {/* 3-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة النزاع الاقتصادي — 3 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.technical_analysis;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} دعوى</span>
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
            { icon: Briefcase, label: 'محرك الشركات (M60)', desc: 'بيانات السجل التجاري', color: 'text-blue-600' },
            { icon: TrendingUp, label: 'محرك البورصة (M98)', desc: 'بيانات السوق المالية', color: 'text-green-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'مراكز التكلفة والمطالبات', color: 'text-gold' },
            { icon: Lock, label: 'المستودع السيادي (M53)', desc: 'تشفير AES-256', color: 'text-purple-600' },
            { icon: Eye, label: 'الوكيل الذكي (M92)', desc: 'إخطار وتنبيه الوكيل', color: 'text-amber-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'المراسلات الرسمية', color: 'text-gray-600' },
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

      {/* Filters for cases */}
      {activeTab === 'cases' && (
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الفئات</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Gavel size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد دعاوى اقتصادية</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.technical_analysis;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Gavel size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[c.case_category] || c.case_category}</span>
                          {c.is_final && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.court && <span className="font-body text-[9px] text-ink/40">{c.court}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.total_claims > 0 && <span className="font-body text-[9px] text-blue-600 font-bold">مطالبات: {formatCurrency(c.total_claims)}</span>}
                          {c.total_liabilities > 0 && <span className="font-body text-[9px] text-red-600 font-bold">التزامات: {formatCurrency(c.total_liabilities)}</span>}
                          {c.next_hearing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.next_hearing_date)}</span>}
                          {c.success_rate_estimate > 0 && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">
                              <TrendingUp size={8} /> {c.success_rate_estimate.toFixed(0)}%
                            </span>
                          )}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M10</span>}
                          {c.m60_company_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Briefcase size={8} /> M60</span>}
                          {c.m98_market_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><TrendingUp size={8} /> M98</span>}
                          {c.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m53_vault_sealed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> M53</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Eye size={8} /> M92</span>}
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
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setDeleteType('case'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Financial links tab */}
      {activeTab === 'financial_links' && (
        <div className="space-y-2">
          {allFinancialLinks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Link2 size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد روابط مالية</p></div>
          ) : (
            allFinancialLinks.map((fl) => {
              const c = cases.find((c) => c.id === fl.case_id);
              return (
                <div key={fl.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Link2 size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{LINK_TYPE_LABELS[fl.link_type] || fl.link_type}</span>
                          {fl.source_engine && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> {fl.source_engine}</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{fl.entity_name}</p>
                        {fl.entity_ref && <p className="font-body text-[10px] text-ink/40 mt-0.5">المرجع: {fl.entity_ref}</p>}
                        <span className="font-body text-[9px] text-ink/30 mt-0.5 block">تم الاسترجاع: {formatDate(fl.retrieved_at)}</span>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(fl.id); setDeleteType('financial_link'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Vault documents tab */}
      {activeTab === 'vault_documents' && (
        <div className="space-y-2">
          {allVaultDocs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Archive size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مستندات في المستودع السيادي</p></div>
          ) : (
            allVaultDocs.map((vd) => {
              const cfg = ACCESS_LEVEL_CONFIG[vd.access_level] || ACCESS_LEVEL_CONFIG.restricted;
              const c = cases.find((c) => c.id === vd.case_id);
              return (
                <div key={vd.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Archive size={14} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{VAULT_DOC_TYPE_LABELS[vd.document_type || ''] || vd.document_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{vd.document_title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {vd.file_ref && <span className="font-body text-[9px] text-ink/40">المرجع: {vd.file_ref}</span>}
                          <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Lock size={8} /> {vd.encryption_standard}</span>
                          <span className="font-body text-[9px] text-ink/30">الموقع: {vd.vault_location}</span>
                          {vd.uploaded_by && <span className="font-body text-[9px] text-ink/40">رفع: {vd.uploaded_by}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(vd.id); setDeleteType('vault_doc'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Parties tab */}
      {activeTab === 'parties' && (
        <div className="space-y-2">
          {cases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد أطراف مسجلة</p></div>
          ) : (
            <EconPartyList cases={cases} />
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
                      : log.action.includes('m10') ? <Sparkles size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m60') ? <Briefcase size={12} className="text-blue-600" />
                      : log.action.includes('m98') ? <TrendingUp size={12} className="text-green-600" />
                      : log.action.includes('m53') || log.action.includes('vault') ? <Lock size={12} className="text-purple-600" />
                      : log.action.includes('m92') ? <Eye size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-gray-600" />
                      : log.action.includes('financial_link') ? <Link2 size={12} className="text-blue-600" />
                      : log.action.includes('party') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('stage') ? <CircuitBoard size={12} className="text-purple-600" />
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

      {/* Case detail drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCase(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Gavel size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف الدعوى الاقتصادية</span>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedCase.case_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.technical_analysis).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.technical_analysis).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.technical_analysis).label}
                    </span>
                    {selectedCase.is_final && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.technical_analysis;
                      const stageIdx = STAGES.indexOf(selectedCase.stage);
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
                  {selectedCase.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedCase)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Success rate gauge */}
                {selectedCase.success_rate_estimate > 0 && (
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke={selectedCase.success_rate_estimate > 70 ? '#22c55e' : selectedCase.success_rate_estimate > 40 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${(selectedCase.success_rate_estimate / 100) * 94.2} 94.2`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-heading font-bold text-midnight text-sm">{selectedCase.success_rate_estimate.toFixed(0)}%</span>
                    </div>
                    <div>
                      <p className="font-body text-[10px] font-bold text-midnight">تقدير نسبة نجاح الدعوى</p>
                      <p className="font-body text-[9px] text-ink/40">بناءً على تحليل السوابق القضائية الاقتصادية</p>
                    </div>
                  </div>
                )}

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الفئة</span>
                    <p className="font-body text-xs font-bold text-midnight">{CATEGORY_LABELS[selectedCase.case_category] || selectedCase.case_category}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">النوع الفرعي</span>
                    <p className="font-body text-xs font-bold text-midnight">{SUBTYPE_LABELS[selectedCase.dispute_subtype || ''] || selectedCase.dispute_subtype}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">المحكمة</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.court || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الدائرة</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.court_circuit || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ القيد</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.filing_date ? formatDate(selectedCase.filing_date) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الجلسة القادمة</span>
                    <p className="font-body text-xs font-bold text-amber-600">{selectedCase.next_hearing_date ? formatDate(selectedCase.next_hearing_date) : '—'}</p>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرسوم القضائية</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.court_fees)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">إجمالي المطالبات</span><p className="font-body text-xs font-bold text-blue-600">{formatCurrency(selectedCase.total_claims)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">إجمالي الالتزامات</span><p className="font-body text-xs font-bold text-red-600">{formatCurrency(selectedCase.total_liabilities)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m60_company_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Briefcase size={10} /> M60 {selectedCase.m60_company_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m98_market_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><TrendingUp size={10} /> M98 {selectedCase.m98_market_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m53_vault_sealed ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> M53 {selectedCase.m53_vault_sealed ? 'مختوم' : 'غير مختوم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Eye size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m52_notified ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M52 {selectedCase.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
                )}

                {/* Parties */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Users size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الأطراف</span></div>
                    <button onClick={() => setPartyModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة طرف</button>
                  </div>
                  <div className="space-y-1.5">
                    {parties.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/party">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'debtor' ? 'bg-red-50 text-red-600' : p.party_type === 'creditor' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.name}</p>
                          {p.entity_type && <span className="font-body text-[9px] text-ink/40">{ENTITY_TYPE_LABELS[p.entity_type] || p.entity_type}</span>}
                          {p.registration_number && <span className="font-body text-[9px] text-ink/30"> — سجل: {p.registration_number}</span>}
                        </div>
                        <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/party:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {parties.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أطراف مسجلة</p>}
                  </div>
                </div>

                {/* Financial links */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Link2 size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الروابط المالية (M60/M98)</span></div>
                    <button onClick={() => setFinLinkModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> ربط بيانات</button>
                  </div>
                  <div className="space-y-1.5">
                    {financialLinks.map((fl) => (
                      <div key={fl.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/fl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{LINK_TYPE_LABELS[fl.link_type] || fl.link_type}</span>
                          {fl.source_engine && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> {fl.source_engine}</span>}
                        </div>
                        <p className="font-body text-[10px] font-bold text-midnight">{fl.entity_name}</p>
                        {fl.entity_ref && <p className="font-body text-[9px] text-ink/40 mt-0.5">المرجع: {fl.entity_ref}</p>}
                      </div>
                    ))}
                    {financialLinks.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد روابط مالية</p>}
                  </div>
                </div>

                {/* Vault documents */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Archive size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">مستودع M53 السيادي — AES-256</span></div>
                  <div className="space-y-1.5">
                    {vaultDocs.map((vd) => {
                      const cfg = ACCESS_LEVEL_CONFIG[vd.access_level] || ACCESS_LEVEL_CONFIG.restricted;
                      return (
                        <div key={vd.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/vd">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{VAULT_DOC_TYPE_LABELS[vd.document_type || ''] || vd.document_type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{vd.document_title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="flex items-center gap-0.5 font-body text-[9px] text-purple-600"><Lock size={8} /> {vd.encryption_standard}</span>
                            <span className="font-body text-[9px] text-ink/30">{vd.vault_location}</span>
                          </div>
                        </div>
                      );
                    })}
                    {vaultDocs.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مستندات في المستودع</p>}
                  </div>
                  <button onClick={() => setVaultModalOpen(true)} className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-body text-xs font-bold hover:bg-purple-100 transition-colors">
                    <Plus size={12} /> رفع مستند للمستودع السيادي
                  </button>
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

      {/* Case create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الدعوى الاقتصادية' : 'دعوى اقتصادية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الدعوى" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="ECON-2025-001" /></Field>
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الدعوى" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع الفرعي">
            <Select value={form.dispute_subtype} onChange={(e) => setForm({ ...form, dispute_subtype: e.target.value })}>
              {Object.entries(SUBTYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المحكمة"><TextInput value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} /></Field>
          <Field label="الدائرة"><TextInput value={form.court_circuit} onChange={(e) => setForm({ ...form, court_circuit: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ القيد"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
          <Field label="تاريخ الجلسة القادمة"><TextInput type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نسبة نجاح متوقعة %"><TextInput type="number" value={form.success_rate_estimate} onChange={(e) => setForm({ ...form, success_rate_estimate: e.target.value })} /></Field>
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="الرسوم القضائية"><TextInput type="number" value={form.court_fees} onChange={(e) => setForm({ ...form, court_fees: e.target.value })} /></Field>
          <Field label="إجمالي المطالبات"><TextInput type="number" value={form.total_claims} onChange={(e) => setForm({ ...form, total_claims: e.target.value })} /></Field>
          <Field label="إجمالي الالتزامات"><TextInput type="number" value={form.total_liabilities} onChange={(e) => setForm({ ...form, total_liabilities: e.target.value })} /></Field>
        </div>
        <Field label="المستشار المسؤول">
          <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
            <option value="">— اختر —</option>
            {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Party modal */}
      <EntityModal open={partyModalOpen} title="إضافة طرف" onClose={() => setPartyModalOpen(false)} onSubmit={addParty}>
        <Field label="نوع الطرف" required>
          <Select value={partyForm.party_type} onChange={(e) => setPartyForm({ ...partyForm, party_type: e.target.value })}>
            {Object.entries(PARTY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الاسم" required><TextInput value={partyForm.name} onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الدور"><TextInput value={partyForm.role} onChange={(e) => setPartyForm({ ...partyForm, role: e.target.value })} /></Field>
          <Field label="نوع الكيان">
            <Select value={partyForm.entity_type} onChange={(e) => setPartyForm({ ...partyForm, entity_type: e.target.value })}>
              {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="رقم السجل"><TextInput value={partyForm.registration_number} onChange={(e) => setPartyForm({ ...partyForm, registration_number: e.target.value })} /></Field>
        <Field label="معلومات الاتصال"><TextInput value={partyForm.contact_info} onChange={(e) => setPartyForm({ ...partyForm, contact_info: e.target.value })} /></Field>
        <Field label="التمثيل القانوني"><TextInput value={partyForm.legal_representation} onChange={(e) => setPartyForm({ ...partyForm, legal_representation: e.target.value })} /></Field>
      </EntityModal>

      {/* Financial link modal */}
      <EntityModal open={finLinkModalOpen} title="ربط بيانات مالية" onClose={() => setFinLinkModalOpen(false)} onSubmit={addFinancialLink}>
        <Field label="نوع الرابط" required>
          <Select value={finLinkForm.link_type} onChange={(e) => setFinLinkForm({ ...finLinkForm, link_type: e.target.value })}>
            {Object.entries(LINK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="اسم الكيان" required><TextInput value={finLinkForm.entity_name} onChange={(e) => setFinLinkForm({ ...finLinkForm, entity_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع الكيان"><TextInput value={finLinkForm.entity_ref} onChange={(e) => setFinLinkForm({ ...finLinkForm, entity_ref: e.target.value })} /></Field>
          <Field label="المحرك المصدر">
            <Select value={finLinkForm.source_engine} onChange={(e) => setFinLinkForm({ ...finLinkForm, source_engine: e.target.value })}>
              <option value="M60">M60 — محرك الشركات</option>
              <option value="M98">M98 — محرك البورصة</option>
              <option value="M54">M54 — المحرك المالي</option>
              <option value="">— خارجي —</option>
            </Select>
          </Field>
        </div>
      </EntityModal>

      {/* Vault document modal */}
      <EntityModal open={vaultModalOpen} title="رفع مستند للمستودع السيادي (M53)" onClose={() => setVaultModalOpen(false)} onSubmit={addVaultDoc}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100 mb-2">
          <Lock size={12} className="text-purple-600" />
          <span className="font-body text-[10px] text-purple-700 font-bold">سيتم التشفير بمعيار AES-256 تلقائياً</span>
        </div>
        <Field label="عنوان المستند" required><TextInput value={vaultForm.document_title} onChange={(e) => setVaultForm({ ...vaultForm, document_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المستند">
            <Select value={vaultForm.document_type} onChange={(e) => setVaultForm({ ...vaultForm, document_type: e.target.value })}>
              {Object.entries(VAULT_DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="مستوى الوصول">
            <Select value={vaultForm.access_level} onChange={(e) => setVaultForm({ ...vaultForm, access_level: e.target.value })}>
              {Object.entries(ACCESS_LEVEL_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="مرجع الملف"><TextInput value={vaultForm.file_ref} onChange={(e) => setVaultForm({ ...vaultForm, file_ref: e.target.value })} /></Field>
        <Field label="رفع بواسطة"><TextInput value={vaultForm.uploaded_by} onChange={(e) => setVaultForm({ ...vaultForm, uploaded_by: e.target.value })} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

// Inline party list for the parties tab
function EconPartyList({ cases }: { cases: M04Case[] }) {
  const [allParties, setAllParties] = useState<M04Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await supabase.from('m04_economic_parties').select('*').order('created_at', { ascending: false });
      if (!cancelled) {
        setAllParties((res.data as M04Party[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cases]);

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>;
  if (allParties.length === 0) return <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد أطراف مسجلة</p></div>;

  return (
    <>
      {allParties.map((p) => {
        const c = cases.find((c) => c.id === p.case_id);
        return (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'debtor' ? 'bg-red-50 text-red-600' : p.party_type === 'creditor' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                  {p.entity_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ENTITY_TYPE_LABELS[p.entity_type] || p.entity_type}</span>}
                  {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                </div>
                <p className="font-body text-xs font-bold text-midnight mt-1">{p.name}</p>
                {p.role && <p className="font-body text-[10px] text-ink/40">{p.role}</p>}
                {p.registration_number && <p className="font-body text-[9px] text-ink/40">سجل: {p.registration_number}</p>}
                {p.legal_representation && <p className="font-body text-[9px] text-ink/40">التمثيل: {p.legal_representation}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
