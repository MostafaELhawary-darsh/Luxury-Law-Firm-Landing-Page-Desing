import { useEffect, useState, useCallback } from 'react';
import {
  Landmark, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search,
  Scale, Building2, Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, AlertOctagon, Server,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M03StateCouncilCase as M03Case, M03CouncilParty as M03Party,
  M03CouncilDeadline as M03Deadline, M03ContractLink, M03CouncilAuditLog as M03AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'deadlines' | 'contract_links' | 'parties' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ingestion: { label: 'الاستلام', bg: 'bg-blue-50', text: 'text-blue-700' },
  deadline_control: { label: 'الضبط الزمني', bg: 'bg-amber-50', text: 'text-amber-700' },
  operational_integration: { label: 'التكامل التشغيلي', bg: 'bg-purple-50', text: 'text-purple-700' },
  resolution: { label: 'الفصل في النزاع', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['ingestion', 'deadline_control', 'operational_integration', 'resolution'];

const CATEGORY_LABELS: Record<string, string> = {
  annulment: 'إلغاء قرار',
  admin_contract: 'عقد إداري',
  employment_dispute: 'منازعة وظيفية',
  appeal: 'طعن إداري',
};

const SUBTYPE_LABELS: Record<string, string> = {
  employment_dispute: 'منازعة توظيف حكومي',
  public_works: 'أشغال عامة',
  admin_tort: 'مسؤولية إدارية',
  contract_dispute: 'منازعة تعاقدية',
  regulation_review: 'فحص لائحة',
  disciplinary: 'قرار تأديبي',
  compensation: 'تعويض إداري',
  appeal: 'طعن إداري',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  plaintiff: 'المدعي',
  defendant: 'الجهة الإدارية',
  witness: 'شاهد',
  expert: 'خبير',
  third_party: 'طرف ثالث',
};

const AUTHORITY_TYPE_LABELS: Record<string, string> = {
  'هيئة عامة': 'هيئة عامة',
  'مرفق عام': 'مرفق عام',
  'قطاع حكومي': 'قطاع حكومي',
  'وحدة محلية': 'وحدة محلية',
  'وزارة': 'وزارة',
  'هيئة قضائية': 'هيئة قضائية',
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  annulment_window: 'ميعاد الإلغاء',
  hearing: 'جلسة',
  memo_submission: 'تقديم مذكرة',
  expert_report: 'تقرير الخبير',
  appeal: 'طعن',
  notification: 'إخطار',
};

const DECISION_TYPE_LABELS: Record<string, string> = {
  individual: 'قرار فردي',
  regulatory: 'قرار تنظيمي',
  disciplinary: 'قرار تأديبي',
  contractual: 'قرار تعاقدي',
};

const COMPLIANCE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  compliant: { label: 'متوافق', bg: 'bg-green-50', text: 'text-green-600' },
  partially_compliant: { label: 'متوافق جزئياً', bg: 'bg-amber-50', text: 'text-amber-600' },
  non_compliant: { label: 'مخالف', bg: 'bg-red-50', text: 'text-red-600' },
  pending: { label: 'قيد المراجعة', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  public_works: 'أشغال عامة',
  supply: 'توريد',
  service: 'خدمات',
  consultancy: 'استشارات',
  concession: 'امتياز',
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string;
  stage: string;
  court: string;
  court_circuit: string;
  challenged_decision: string;
  challenged_decision_date: string;
  challenged_authority: string;
  decision_type: string;
  filing_date: string;
  next_hearing_date: string;
  success_rate_estimate: string;
  financial_value: string;
  court_fees: string;
  compensation_claimed: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'annulment', dispute_subtype: 'employment_dispute',
  stage: 'ingestion', court: '', court_circuit: '', challenged_decision: '', challenged_decision_date: '',
  challenged_authority: '', decision_type: 'individual', filing_date: '', next_hearing_date: '', success_rate_estimate: '50',
  financial_value: '0', court_fees: '0', compensation_claimed: '0', assigned_advisor_id: '', description: '',
};

export default function StateCouncil({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M03Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M03Case | null>(null);
  const [parties, setParties] = useState<M03Party[]>([]);
  const [deadlines, setDeadlines] = useState<M03Deadline[]>([]);
  const [contractLinks, setContractLinks] = useState<M03ContractLink[]>([]);
  const [auditLogs, setAuditLogs] = useState<M03AuditLog[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<M03Deadline[]>([]);
  const [allContractLinks, setAllContractLinks] = useState<M03ContractLink[]>([]);
  const [allAudit, setAllAudit] = useState<M03AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'party' | 'deadline' | 'contract_link'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'plaintiff', name: '', role: '', authority_type: '', contact_info: '', legal_representation: '' });
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineForm, setDeadlineForm] = useState({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', trigger_event: '', statutory_basis: '' });
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({ contract_title: '', contract_ref: '', contract_type: 'public_works', contract_value: '0', government_entity: '', compliance_findings: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, dlRes, clRes, auditRes] = await Promise.all([
      supabase.from('m03_state_council_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m03_council_deadlines').select('*').order('deadline_date', { ascending: true }),
      supabase.from('m03_contract_links').select('*').order('created_at', { ascending: false }),
      supabase.from('m03_council_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M03Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllDeadlines((dlRes.data as M03Deadline[]) || []);
    setAllContractLinks((clRes.data as M03ContractLink[]) || []);
    setAllAudit((auditRes.data as M03AuditLog[]) || []);
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
    await supabase.from('m03_council_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M03Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      dispute_subtype: c.dispute_subtype || 'employment_dispute', stage: c.stage, court: c.court || '',
      court_circuit: c.court_circuit || '', challenged_decision: c.challenged_decision || '',
      challenged_decision_date: c.challenged_decision_date || '', challenged_authority: c.challenged_authority || '',
      decision_type: c.decision_type || 'individual', filing_date: c.filing_date || '', next_hearing_date: c.next_hearing_date || '',
      success_rate_estimate: String(c.success_rate_estimate || 50), financial_value: String(c.financial_value || 0),
      court_fees: String(c.court_fees || 0), compensation_claimed: String(c.compensation_claimed || 0),
      assigned_advisor_id: c.assigned_advisor_id || '', description: c.description || '',
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
      challenged_decision: form.challenged_decision.trim() || null,
      challenged_decision_date: form.challenged_decision_date || null,
      challenged_authority: form.challenged_authority.trim() || null,
      decision_type: form.decision_type || null,
      filing_date: form.filing_date || null,
      next_hearing_date: form.next_hearing_date || null,
      success_rate_estimate: Number(form.success_rate_estimate) || 50,
      financial_value: Number(form.financial_value) || 0,
      court_fees: Number(form.court_fees) || 0,
      compensation_claimed: Number(form.compensation_claimed) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m03_state_council_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات قضية مجلس الدولة');
    } else {
      const { data } = await supabase.from('m03_state_council_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف قضية مجلس الدولة — تصنيف: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await supabase.from('m03_state_council_cases').update({
          m10_linked: true,
          m54_cost_center_opened: true,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: 'CC-M03-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط الملف بنواة القضية الذكية (M10)');
        await logAudit(newId, 'm54_cost_center', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92)');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52)');
        if (form.challenged_decision_date) {
          const annulmentDate = new Date(form.challenged_decision_date);
          annulmentDate.setDate(annulmentDate.getDate() + 60);
          await supabase.from('m03_council_deadlines').insert({
            case_id: newId, deadline_type: 'annulment_window',
            deadline_label: 'ميعاد رفع دعوى الإلغاء (60 يوم)',
            deadline_date: annulmentDate.toISOString().split('T')[0],
            days_from_event: 60, trigger_event: 'تاريخ صدور القرار المطعون فيه',
            statutory_basis: 'المادة 24 من قانون مجلس الدولة',
            auto_inserted: true, status: 'upcoming',
          });
          await logAudit(newId, 'deadlines_calculated', 'حساب الميعاد الإجرائي آلياً — 60 يوم لرفع دعوى الإلغاء');
        }
        if (form.next_hearing_date) {
          await supabase.from('m03_council_deadlines').insert({
            case_id: newId, deadline_type: 'hearing',
            deadline_label: 'جلسة المرافعة',
            deadline_date: form.next_hearing_date,
            auto_inserted: true, status: 'upcoming',
          });
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m03_state_council_cases').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m03_council_parties').delete().eq('id', deleteId);
    else if (deleteType === 'deadline') await supabase.from('m03_council_deadlines').delete().eq('id', deleteId);
    else if (deleteType === 'contract_link') await supabase.from('m03_contract_links').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M03Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [pRes, dlRes, clRes, aRes] = await Promise.all([
      supabase.from('m03_council_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m03_council_deadlines').select('*').eq('case_id', c.id).order('deadline_date', { ascending: true }),
      supabase.from('m03_contract_links').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m03_council_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setParties((pRes.data as M03Party[]) || []);
    setDeadlines((dlRes.data as M03Deadline[]) || []);
    setContractLinks((clRes.data as M03ContractLink[]) || []);
    setAuditLogs((aRes.data as M03AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M03Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m03_state_council_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedCase(updated as M03Case);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m03_council_parties').insert({
      case_id: selectedCase.id, party_type: partyForm.party_type, name: partyForm.name.trim(),
      role: partyForm.role.trim() || null, authority_type: partyForm.authority_type || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name);
    setPartyForm({ party_type: 'plaintiff', name: '', role: '', authority_type: '', contact_info: '', legal_representation: '' });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addDeadline = async () => {
    if (!selectedCase || !deadlineForm.deadline_label.trim() || !deadlineForm.deadline_date) return;
    await supabase.from('m03_council_deadlines').insert({
      case_id: selectedCase.id, deadline_type: deadlineForm.deadline_type,
      deadline_label: deadlineForm.deadline_label.trim(), deadline_date: deadlineForm.deadline_date,
      trigger_event: deadlineForm.trigger_event.trim() || null,
      statutory_basis: deadlineForm.statutory_basis.trim() || null,
      auto_inserted: false, status: 'upcoming',
    });
    await logAudit(selectedCase.id, 'deadline_added', 'إضافة موعد إجرائي: ' + deadlineForm.deadline_label);
    setDeadlineForm({ deadline_type: 'hearing', deadline_label: '', deadline_date: '', trigger_event: '', statutory_basis: '' });
    setDeadlineModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addContractLink = async () => {
    if (!selectedCase || !contractForm.contract_title.trim()) return;
    await supabase.from('m03_contract_links').insert({
      case_id: selectedCase.id, contract_title: contractForm.contract_title.trim(),
      contract_ref: contractForm.contract_ref.trim() || null,
      contract_type: contractForm.contract_type || null,
      contract_value: Number(contractForm.contract_value) || 0,
      government_entity: contractForm.government_entity.trim() || null,
      compliance_status: 'pending',
      compliance_findings: contractForm.compliance_findings.trim() || null,
      m59_synced: false,
    });
    await logAudit(selectedCase.id, 'contract_linked', 'ربط عقد إداري: ' + contractForm.contract_title);
    await supabase.from('m03_state_council_cases').update({ m59_contract_linked: true }).eq('id', selectedCase.id);
    setContractForm({ contract_title: '', contract_ref: '', contract_type: 'public_works', contract_value: '0', government_entity: '', compliance_findings: '' });
    setContractModalOpen(false);
    openCaseDetail(selectedCase);
    fetchAll();
  };

  const completeDeadline = async (d: M03Deadline) => {
    await supabase.from('m03_council_deadlines').update({
      status: 'completed', completed_at: new Date().toISOString(),
    }).eq('id', d.id);
    if (selectedCase) await logAudit(selectedCase.id, 'deadline_completed', 'إتمام الموعد الإجرائي: ' + d.deadline_label);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.challenged_authority || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => !c.is_final).length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const totalCompensation = cases.reduce((s, c) => s + (c.compensation_claimed || 0), 0);
  const upcomingDl = allDeadlines.filter((d) => d.status === 'upcoming').length;
  const pendingContracts = allContractLinks.filter((cl) => cl.compliance_status === 'pending').length;
  const avgSuccess = cases.length > 0 ? cases.reduce((s, c) => s + (c.success_rate_estimate || 0), 0) / cases.length : 0;

  const tabs: { id: Tab; label: string; icon: typeof Landmark; badge?: number }[] = [
    { id: 'cases', label: 'دعاوى مجلس الدولة', icon: Landmark, badge: activeCases },
    { id: 'deadlines', label: 'المواعيد الإجرائية', icon: Calendar, badge: upcomingDl },
    { id: 'contract_links', label: 'روابط العقود الإدارية', icon: FileText, badge: pendingContracts },
    { id: 'parties', label: 'الأطراف', icon: Users },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Landmark size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك محاكم القضاء الإداري / مجلس الدولة (M3)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع القضائي والإجرائي — المنازعات الإدارية وقرارات السلطة العامة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · مجلس الدولة</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> دعوى مجلس الدولة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Landmark size={14} className="text-midnight" />} label="إجمالي الدعاوى" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="دعاوى نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<TrendingUp size={14} className="text-green-600" />} label="متوسط نسبة النجاح" value={avgSuccess.toFixed(1) + '%'} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<AlertOctagon size={14} className="text-red-600" />} label="مطالبات التعويض" value={formatCurrency(totalCompensation)} valueClass="text-red-700" />
      </div>

      {/* 4-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة النزاع الإداري — 4 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.ingestion;
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { icon: Sparkles, label: 'نواة القضية الذكية (M10)', desc: 'تخزين المستندات وتتبع الجلسات', color: 'text-purple-600' },
            { icon: FileText, label: 'محرك العقود الإدارية (M59)', desc: 'مراجعة امتثال العقود', color: 'text-green-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'رسوم مجلس الدولة + مراكز التكلفة', color: 'text-gold' },
            { icon: Eye, label: 'الوكيل الذكي (M92)', desc: 'إخطار وتنبيه الوكيل', color: 'text-blue-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'المراسلات والإخطارات الرسمية', color: 'text-amber-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو جهة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Landmark size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد دعاوى مجلس الدولة</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.ingestion;
              const stageIdx = STAGES.indexOf(c.stage);
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Landmark size={14} className={sCfg.text} />
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
                          {c.challenged_authority && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{c.challenged_authority}</span>}
                          {c.court && <span className="font-body text-[9px] text-ink/40">{c.court}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.compensation_claimed > 0 && <span className="font-body text-[9px] text-red-600 font-bold">مطالبة: {formatCurrency(c.compensation_claimed)}</span>}
                          {c.next_hearing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.next_hearing_date)}</span>}
                          {c.success_rate_estimate > 0 && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">
                              <TrendingUp size={8} /> {c.success_rate_estimate.toFixed(0)}%
                            </span>
                          )}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M10</span>}
                          {c.m54_cost_center_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m59_contract_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><FileText size={8} /> M59</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Eye size={8} /> M92</span>}
                          {c.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50"><Send size={8} /> M52</span>}
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

      {/* All deadlines tab */}
      {activeTab === 'deadlines' && (
        <div className="space-y-2">
          {allDeadlines.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Calendar size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مواعيد إجرائية</p></div>
          ) : (
            allDeadlines.map((d) => {
              const daysLeft = Math.ceil((new Date(d.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 7 && daysLeft >= 0;
              const isNear = daysLeft <= 30 && daysLeft > 7;
              const c = cases.find((c) => c.id === d.case_id);
              return (
                <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 hover:border-gold/30 transition-colors ${d.status === 'completed' ? 'border-green-200' : isUrgent ? 'border-red-200' : isNear ? 'border-amber-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${d.status === 'completed' ? 'bg-green-50' : isUrgent ? 'bg-red-50' : isNear ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        <Calendar size={14} className={d.status === 'completed' ? 'text-green-600' : isUrgent ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight">{d.deadline_label}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{DEADLINE_TYPE_LABELS[d.deadline_type] || d.deadline_type}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                          {d.status === 'completed' ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> مكتمل</span>
                          ) : (
                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${isUrgent ? 'bg-red-50 text-red-600' : isNear ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                              <Clock size={9} /> {daysLeft > 0 ? daysLeft + ' يوم' : 'متأخر'}
                            </span>
                          )}
                          {d.statutory_basis && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Scale size={8} /> {d.statutory_basis}</span>}
                          {d.auto_inserted && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Zap size={8} /> آلي</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Contract links tab */}
      {activeTab === 'contract_links' && (
        <div className="space-y-2">
          {allContractLinks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><FileText size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد روابط عقود إدارية</p></div>
          ) : (
            allContractLinks.map((cl) => {
              const cfg = COMPLIANCE_CONFIG[cl.compliance_status] || COMPLIANCE_CONFIG.pending;
              const c = cases.find((c) => c.id === cl.case_id);
              return (
                <div key={cl.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[cl.contract_type || ''] || cl.contract_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                          {cl.m59_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> M59</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{cl.contract_title}</p>
                        {cl.contract_ref && <p className="font-body text-[10px] text-ink/40 mt-0.5">المرجع: {cl.contract_ref}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {cl.government_entity && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{cl.government_entity}</span>}
                          {cl.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(cl.contract_value)}</span>}
                        </div>
                        {cl.compliance_findings && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{cl.compliance_findings}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(cl.id); setDeleteType('contract_link'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Parties tab (all parties across cases) */}
      {activeTab === 'parties' && (
        <div className="space-y-2">
          {cases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Users size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد أطراف مسجلة</p></div>
          ) : (
            <PartyList cases={cases} />
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
                      : log.action.includes('m59') || log.action.includes('contract') ? <FileText size={12} className="text-blue-600" />
                      : log.action.includes('m92') ? <Eye size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-gray-600" />
                      : log.action.includes('deadline') ? <Calendar size={12} className="text-amber-600" />
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
                <Landmark size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف دعوى مجلس الدولة</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.ingestion).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.ingestion).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.ingestion).label}
                    </span>
                    {selectedCase.is_final && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.ingestion;
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

                {/* Challenged decision */}
                {selectedCase.challenged_decision && (
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertOctagon size={12} className="text-red-600" />
                      <span className="font-body text-[10px] font-bold text-red-700">القرار المطعون فيه</span>
                    </div>
                    <p className="font-body text-[10px] text-red-600 leading-relaxed">{selectedCase.challenged_decision}</p>
                    {selectedCase.challenged_authority && <p className="font-body text-[9px] text-red-500 mt-1">الجهة: {selectedCase.challenged_authority}</p>}
                    {selectedCase.challenged_decision_date && <p className="font-body text-[9px] text-red-500">تاريخ الصدور: {formatDate(selectedCase.challenged_decision_date)}</p>}
                    {selectedCase.decision_type && <p className="font-body text-[9px] text-red-500">نوع القرار: {DECISION_TYPE_LABELS[selectedCase.decision_type] || selectedCase.decision_type}</p>}
                  </div>
                )}

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
                      <p className="font-body text-[9px] text-ink/40">بناءً على تحليل السوابق القضائية لمجلس الدولة</p>
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
                  {selectedCase.judgment_date && (
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ الحكم</span>
                      <p className="font-body text-xs font-bold text-midnight">{formatDate(selectedCase.judgment_date)}</p>
                    </div>
                  )}
                  {selectedCase.judgment_outcome && (
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">النتيجة</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.judgment_outcome}</p>
                    </div>
                  )}
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرسوم</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.court_fees)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المطالبة بالتعويض</span><p className="font-body text-xs font-bold text-red-600">{formatCurrency(selectedCase.compensation_claimed)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_cost_center_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_cost_center_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m59_contract_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M59 {selectedCase.m59_contract_linked ? 'مرتبط' : 'غير مرتبط'}</span>
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
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'plaintiff' ? 'bg-blue-50 text-blue-600' : p.party_type === 'defendant' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.name}</p>
                          {p.authority_type && <span className="font-body text-[9px] text-ink/40">{p.authority_type}</span>}
                        </div>
                        <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/party:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {parties.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أطراف مسجلة</p>}
                  </div>
                </div>

                {/* Deadlines */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">المواعيد الإجرائية</span></div>
                    <button onClick={() => setDeadlineModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة موعد</button>
                  </div>
                  <div className="space-y-1.5">
                    {deadlines.map((d) => {
                      const daysLeft = Math.ceil((new Date(d.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/dl">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{DEADLINE_TYPE_LABELS[d.deadline_type] || d.deadline_type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-body text-[10px] font-bold text-midnight">{d.deadline_label}</p>
                            <span className="font-body text-[9px] text-ink/40">{formatDate(d.deadline_date)} — {d.status === 'completed' ? 'مكتمل' : daysLeft > 0 ? daysLeft + ' يوم متبقي' : 'متأخر'}</span>
                            {d.statutory_basis && <span className="font-body text-[9px] text-purple-600 block">{d.statutory_basis}</span>}
                          </div>
                          {d.status !== 'completed' && <button onClick={() => completeDeadline(d)} className="p-1 rounded text-green-500 hover:bg-green-50 transition-colors" title="إتمام"><CheckCircle2 size={11} /></button>}
                          <button onClick={() => { setDeleteId(d.id); setDeleteType('deadline'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/dl:opacity-100 transition-all"><Trash2 size={10} /></button>
                        </div>
                      );
                    })}
                    {deadlines.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مواعيد مسجلة</p>}
                  </div>
                </div>

                {/* Contract links */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><FileText size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">روابط العقود الإدارية (M59)</span></div>
                    <button onClick={() => setContractModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> ربط عقد</button>
                  </div>
                  <div className="space-y-1.5">
                    {contractLinks.map((cl) => {
                      const cfg = COMPLIANCE_CONFIG[cl.compliance_status] || COMPLIANCE_CONFIG.pending;
                      return (
                        <div key={cl.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/cl">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{CONTRACT_TYPE_LABELS[cl.contract_type || ''] || cl.contract_type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            {cl.m59_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> M59</span>}
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{cl.contract_title}</p>
                          {cl.government_entity && <p className="font-body text-[9px] text-ink/40 mt-0.5"><Building2 size={8} className="inline ml-0.5" />{cl.government_entity}</p>}
                          {cl.contract_value > 0 && <p className="font-body text-[9px] text-gold mt-0.5">{formatCurrency(cl.contract_value)}</p>}
                          {cl.compliance_findings && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight">{cl.compliance_findings}</p>}
                        </div>
                      );
                    })}
                    {contractLinks.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد روابط عقود</p>}
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

      {/* Case create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل دعوى مجلس الدولة' : 'دعوى مجلس الدولة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الدعوى" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="COUNCIL-2025-001" /></Field>
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
        <Field label="القرار المطعون فيه"><TextArea value={form.challenged_decision} onChange={(e) => setForm({ ...form, challenged_decision: e.target.value })} rows={2} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ صدور القرار"><TextInput type="date" value={form.challenged_decision_date} onChange={(e) => setForm({ ...form, challenged_decision_date: e.target.value })} /></Field>
          <Field label="الجهة الإدارية المصدر"><TextInput value={form.challenged_authority} onChange={(e) => setForm({ ...form, challenged_authority: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع القرار">
            <Select value={form.decision_type} onChange={(e) => setForm({ ...form, decision_type: e.target.value })}>
              {Object.entries(DECISION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="تاريخ الجلسة القادمة"><TextInput type="date" value={form.next_hearing_date} onChange={(e) => setForm({ ...form, next_hearing_date: e.target.value })} /></Field>
        </div>
        <Field label="تاريخ القيد"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="نسبة نجاح متوقعة %"><TextInput type="number" value={form.success_rate_estimate} onChange={(e) => setForm({ ...form, success_rate_estimate: e.target.value })} /></Field>
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="الرسوم القضائية"><TextInput type="number" value={form.court_fees} onChange={(e) => setForm({ ...form, court_fees: e.target.value })} /></Field>
        </div>
        <Field label="مطالبة التعويض"><TextInput type="number" value={form.compensation_claimed} onChange={(e) => setForm({ ...form, compensation_claimed: e.target.value })} /></Field>
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
        <Field label="الدور"><TextInput value={partyForm.role} onChange={(e) => setPartyForm({ ...partyForm, role: e.target.value })} /></Field>
        <Field label="نوع الجهة">
          <Select value={partyForm.authority_type} onChange={(e) => setPartyForm({ ...partyForm, authority_type: e.target.value })}>
            <option value="">— اختر —</option>
            {Object.entries(AUTHORITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="معلومات الاتصال"><TextInput value={partyForm.contact_info} onChange={(e) => setPartyForm({ ...partyForm, contact_info: e.target.value })} /></Field>
        <Field label="التمثيل القانوني"><TextInput value={partyForm.legal_representation} onChange={(e) => setPartyForm({ ...partyForm, legal_representation: e.target.value })} /></Field>
      </EntityModal>

      {/* Deadline modal */}
      <EntityModal open={deadlineModalOpen} title="إضافة موعد إجرائي" onClose={() => setDeadlineModalOpen(false)} onSubmit={addDeadline}>
        <Field label="نوع الموعد" required>
          <Select value={deadlineForm.deadline_type} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_type: e.target.value })}>
            {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="الوصف" required><TextInput value={deadlineForm.deadline_label} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_label: e.target.value })} /></Field>
        <Field label="التاريخ" required><TextInput type="date" value={deadlineForm.deadline_date} onChange={(e) => setDeadlineForm({ ...deadlineForm, deadline_date: e.target.value })} /></Field>
        <Field label="الحدث المُطلق"><TextInput value={deadlineForm.trigger_event} onChange={(e) => setDeadlineForm({ ...deadlineForm, trigger_event: e.target.value })} /></Field>
        <Field label="الأساس القانوني"><TextInput value={deadlineForm.statutory_basis} onChange={(e) => setDeadlineForm({ ...deadlineForm, statutory_basis: e.target.value })} /></Field>
      </EntityModal>

      {/* Contract link modal */}
      <EntityModal open={contractModalOpen} title="ربط عقد إداري" onClose={() => setContractModalOpen(false)} onSubmit={addContractLink}>
        <Field label="عنوان العقد" required><TextInput value={contractForm.contract_title} onChange={(e) => setContractForm({ ...contractForm, contract_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مرجع العقد"><TextInput value={contractForm.contract_ref} onChange={(e) => setContractForm({ ...contractForm, contract_ref: e.target.value })} /></Field>
          <Field label="نوع العقد">
            <Select value={contractForm.contract_type} onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة العقد"><TextInput type="number" value={contractForm.contract_value} onChange={(e) => setContractForm({ ...contractForm, contract_value: e.target.value })} /></Field>
          <Field label="الجهة الحكومية"><TextInput value={contractForm.government_entity} onChange={(e) => setContractForm({ ...contractForm, government_entity: e.target.value })} /></Field>
        </div>
        <Field label="نتائج فحص الامتثال"><TextArea value={contractForm.compliance_findings} onChange={(e) => setContractForm({ ...contractForm, compliance_findings: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

// Inline party list for the parties tab — fetches parties per case
function PartyList({ cases }: { cases: M03Case[] }) {
  const [allParties, setAllParties] = useState<M03Party[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await supabase.from('m03_council_parties').select('*').order('created_at', { ascending: false });
      if (!cancelled) {
        setAllParties((res.data as M03Party[]) || []);
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
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'plaintiff' ? 'bg-blue-50 text-blue-600' : p.party_type === 'defendant' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                  {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                </div>
                <p className="font-body text-xs font-bold text-midnight mt-1">{p.name}</p>
                {p.role && <p className="font-body text-[10px] text-ink/40">{p.role}</p>}
                {p.authority_type && <p className="font-body text-[9px] text-ink/40">{p.authority_type}</p>}
                {p.legal_representation && <p className="font-body text-[9px] text-ink/40">التمثيل: {p.legal_representation}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
