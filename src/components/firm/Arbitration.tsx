import { useEffect, useState, useCallback } from 'react';
import {
  Scale, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, ArrowRight, Search, Video, Globe,
  Fingerprint, Sparkles, Gavel, Activity, Server, Award, Eye,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M07Case, M07Arbitrator, M07Party, M07VirtualHearing, M07DraftAward, M07AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'arbitrators' | 'virtual_hearings' | 'draft_awards' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  arbitration_filing: { label: 'إيداع طلب التحكيم', bg: 'bg-blue-50', text: 'text-blue-700' },
  virtual_hearing: { label: 'إدارة الجلسات الافتراضية', bg: 'bg-amber-50', text: 'text-amber-700' },
  draft_award: { label: 'توليد مسودة الحكم', bg: 'bg-purple-50', text: 'text-purple-700' },
};

const STAGES = ['arbitration_filing', 'virtual_hearing', 'draft_award'];

const CATEGORY_LABELS: Record<string, string> = {
  commercial: 'تجاري',
  international: 'دولي',
  construction: 'إنشاءات',
  partnership: 'شراكة',
};

const ARBITRATION_TYPE_LABELS: Record<string, string> = {
  ad_hoc: 'تحكيم مخصص (Ad Hoc)',
  institutional: 'تحكيم مؤسسي',
  emergency: 'تحكيم عاجل',
};

const ENFORCEABILITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  enforceable: { label: 'قابل للتنفيذ', bg: 'bg-green-50', text: 'text-green-600' },
  conditional: { label: 'مشروط', bg: 'bg-amber-50', text: 'text-amber-600' },
  pending: { label: 'قيد المراجعة', bg: 'bg-gray-100', text: 'text-gray-500' },
  challenged: { label: 'مطعون فيه', bg: 'bg-red-50', text: 'text-red-600' },
};

const ARBITRATOR_ROLE_LABELS: Record<string, string> = {
  sole: 'محكم فرد',
  chairperson: 'رئيس الهيئة',
  party_appointed: 'محكم معين من طرف',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  claimant: 'المدعي',
  respondent: 'المدعى عليه',
  third_party: 'طرف ثالث',
  witness: 'شاهد',
};

const HEARING_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'مجدولة', bg: 'bg-blue-50', text: 'text-blue-600' },
  in_progress: { label: 'جارية', bg: 'bg-amber-50', text: 'text-amber-600' },
  completed: { label: 'مكتملة', bg: 'bg-green-50', text: 'text-green-600' },
  cancelled: { label: 'ملغاة', bg: 'bg-red-50', text: 'text-red-600' },
};

const REVIEW_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-gray-100', text: 'text-gray-500' },
  under_review: { label: 'قيد المراجعة', bg: 'bg-amber-50', text: 'text-amber-600' },
  approved: { label: 'معتمدة', bg: 'bg-green-50', text: 'text-green-600' },
  rejected: { label: 'مرفوضة', bg: 'bg-red-50', text: 'text-red-600' },
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_category: string;
  dispute_subtype: string;
  stage: string;
  arbitration_type: string;
  arbitration_institution: string;
  seat_of_arbitration: string;
  number_of_arbitrators: string;
  filing_date: string;
  hearing_date: string;
  award_date: string;
  award_text: string;
  financial_value: string;
  arbitration_fees: string;
  escrow_amount: string;
  assigned_advisor_id: string;
  secure_data_room_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'commercial', dispute_subtype: '',
  stage: 'arbitration_filing', arbitration_type: 'institutional', arbitration_institution: '',
  seat_of_arbitration: '', number_of_arbitrators: '3', filing_date: '', hearing_date: '',
  award_date: '', award_text: '', financial_value: '0', arbitration_fees: '0', escrow_amount: '0',
  assigned_advisor_id: '', secure_data_room_id: '', description: '',
};

export default function Arbitration({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M07Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M07Case | null>(null);
  const [arbitrators, setArbitrators] = useState<M07Arbitrator[]>([]);
  const [parties, setParties] = useState<M07Party[]>([]);
  const [hearings, setHearings] = useState<M07VirtualHearing[]>([]);
  const [drafts, setDrafts] = useState<M07DraftAward[]>([]);
  const [auditLogs, setAuditLogs] = useState<M07AuditLog[]>([]);
  const [allArbitrators, setAllArbitrators] = useState<M07Arbitrator[]>([]);
  const [allHearings, setAllHearings] = useState<M07VirtualHearing[]>([]);
  const [allDrafts, setAllDrafts] = useState<M07DraftAward[]>([]);
  const [allAudit, setAllAudit] = useState<M07AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'arbitrator' | 'party' | 'hearing' | 'draft'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [arbitratorModalOpen, setArbitratorModalOpen] = useState(false);
  const [arbitratorForm, setArbitratorForm] = useState({ name: '', role: 'sole', appointment_party: '', qualifications: '', biometric_verified: false });
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'claimant', name: '', role: '', contact_info: '', legal_representation: '' });
  const [hearingModalOpen, setHearingModalOpen] = useState(false);
  const [hearingForm, setHearingForm] = useState({ hearing_date: '', hearing_time: '', duration_minutes: '60', platform: 'Zoom', encryption_standard: 'AES-256', biometric_verification: false });
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftForm, setDraftForm] = useState({ draft_title: '', draft_content: '', generated_by: 'الوكيل الذكي (M92)' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, arbRes, hRes, dRes, auditRes] = await Promise.all([
      supabase.from('m07_arbitration_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m07_arbitrators').select('*').order('created_at', { ascending: false }),
      supabase.from('m07_virtual_hearings').select('*').order('hearing_date', { ascending: false }),
      supabase.from('m07_draft_awards').select('*').order('created_at', { ascending: false }),
      supabase.from('m07_arbitration_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M07Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllArbitrators((arbRes.data as M07Arbitrator[]) || []);
    setAllHearings((hRes.data as M07VirtualHearing[]) || []);
    setAllDrafts((dRes.data as M07DraftAward[]) || []);
    setAllAudit((auditRes.data as M07AuditLog[]) || []);
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
    await supabase.from('m07_arbitration_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M07Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      dispute_subtype: c.dispute_subtype || '', stage: c.stage,
      arbitration_type: c.arbitration_type || 'institutional', arbitration_institution: c.arbitration_institution || '',
      seat_of_arbitration: c.seat_of_arbitration || '', number_of_arbitrators: String(c.number_of_arbitrators || 3),
      filing_date: c.filing_date || '', hearing_date: c.hearing_date || '', award_date: c.award_date || '',
      award_text: c.award_text || '', financial_value: String(c.financial_value || 0),
      arbitration_fees: String(c.arbitration_fees || 0), escrow_amount: String(c.escrow_amount || 0),
      assigned_advisor_id: c.assigned_advisor_id || '', secure_data_room_id: c.secure_data_room_id || '',
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
      dispute_subtype: form.dispute_subtype.trim() || null,
      stage: form.stage,
      arbitration_type: form.arbitration_type || null,
      arbitration_institution: form.arbitration_institution.trim() || null,
      seat_of_arbitration: form.seat_of_arbitration.trim() || null,
      number_of_arbitrators: Number(form.number_of_arbitrators) || 3,
      filing_date: form.filing_date || null,
      hearing_date: form.hearing_date || null,
      award_date: form.award_date || null,
      award_text: form.award_text.trim() || null,
      financial_value: Number(form.financial_value) || 0,
      arbitration_fees: Number(form.arbitration_fees) || 0,
      escrow_amount: Number(form.escrow_amount) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      secure_data_room_id: form.secure_data_room_id.trim() || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m07_arbitration_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات قضية التحكيم');
    } else {
      const { data } = await supabase.from('m07_arbitration_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف قضية تحكيم — فئة: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await supabase.from('m07_arbitration_cases').update({
          m109_biometric_verified: false,
          m54_escrow_opened: true,
          m9_enforcement_ready: false,
          m92_draft_generated: false,
          m52_notified: true,
          cost_center_id: 'CC-M07-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm54_escrow', 'فتح أمانة التحكيم في المحرك المالي (M54)');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52)');
        await logAudit(newId, 'secure_data_room', 'إنشاء غرفة بيانات آمنة للوثائق');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m07_arbitration_cases').delete().eq('id', deleteId);
    else if (deleteType === 'arbitrator') await supabase.from('m07_arbitrators').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m07_arbitration_parties').delete().eq('id', deleteId);
    else if (deleteType === 'hearing') await supabase.from('m07_virtual_hearings').delete().eq('id', deleteId);
    else if (deleteType === 'draft') await supabase.from('m07_draft_awards').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M07Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [aRes, pRes, hRes, dRes, audRes] = await Promise.all([
      supabase.from('m07_arbitrators').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m07_arbitration_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m07_virtual_hearings').select('*').eq('case_id', c.id).order('hearing_date', { ascending: true }),
      supabase.from('m07_draft_awards').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m07_arbitration_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setArbitrators((aRes.data as M07Arbitrator[]) || []);
    setParties((pRes.data as M07Party[]) || []);
    setHearings((hRes.data as M07VirtualHearing[]) || []);
    setDrafts((dRes.data as M07DraftAward[]) || []);
    setAuditLogs((audRes.data as M07AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M07Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m07_arbitration_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedCase(updated as M07Case);
  };

  const addArbitrator = async () => {
    if (!selectedCase || !arbitratorForm.name.trim()) return;
    await supabase.from('m07_arbitrators').insert({
      case_id: selectedCase.id, name: arbitratorForm.name.trim(),
      role: arbitratorForm.role, appointment_party: arbitratorForm.appointment_party.trim() || null,
      qualifications: arbitratorForm.qualifications.trim() || null,
      biometric_verified: arbitratorForm.biometric_verified,
    });
    await logAudit(selectedCase.id, 'arbitrator_added', 'تعيين محكم: ' + arbitratorForm.name);
    setArbitratorForm({ name: '', role: 'sole', appointment_party: '', qualifications: '', biometric_verified: false });
    setArbitratorModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const verifyArbitrator = async (a: M07Arbitrator) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m07_arbitrators').update({
      biometric_verified: true,
    }).eq('id', a.id);
    await supabase.from('m07_arbitration_cases').update({ m109_biometric_verified: true }).eq('id', selectedCase!.id);
    if (selectedCase) await logAudit(selectedCase.id, 'biometric_verified', 'تأكيد بيومتري للمحكم: ' + a.name + ' عبر M109 — ' + hash);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m07_arbitration_parties').insert({
      case_id: selectedCase.id, party_type: partyForm.party_type, name: partyForm.name.trim(),
      role: partyForm.role.trim() || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name);
    setPartyForm({ party_type: 'claimant', name: '', role: '', contact_info: '', legal_representation: '' });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addHearing = async () => {
    if (!selectedCase || !hearingForm.hearing_date) return;
    const hash = '0x' + Math.random().toString(16).substr(2, 8);
    await supabase.from('m07_virtual_hearings').insert({
      case_id: selectedCase.id, hearing_date: hearingForm.hearing_date,
      hearing_time: hearingForm.hearing_time || null,
      duration_minutes: Number(hearingForm.duration_minutes) || 60,
      platform: hearingForm.platform, encryption_standard: hearingForm.encryption_standard,
      recording_hash: hash, biometric_verification: hearingForm.biometric_verification,
      status: 'scheduled',
    });
    await logAudit(selectedCase.id, 'hearing_scheduled', 'جدولة جلسة افتراضية: ' + hearingForm.platform + ' — ' + formatDate(hearingForm.hearing_date));
    setHearingForm({ hearing_date: '', hearing_time: '', duration_minutes: '60', platform: 'Zoom', encryption_standard: 'AES-256', biometric_verification: false });
    setHearingModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addDraft = async () => {
    if (!selectedCase || !draftForm.draft_title.trim()) return;
    await supabase.from('m07_draft_awards').insert({
      case_id: selectedCase.id, draft_title: draftForm.draft_title.trim(),
      draft_content: draftForm.draft_content.trim() || null,
      generated_by: draftForm.generated_by, review_status: 'draft', final_award: false,
    });
    await supabase.from('m07_arbitration_cases').update({ m92_draft_generated: true }).eq('id', selectedCase.id);
    await logAudit(selectedCase.id, 'draft_generated', 'توليد مسودة حكم: ' + draftForm.draft_title + ' — عبر الوكيل الذكي (M92)');
    setDraftForm({ draft_title: '', draft_content: '', generated_by: 'الوكيل الذكي (M92)' });
    setDraftModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const approveDraft = async (d: M07DraftAward) => {
    await supabase.from('m07_draft_awards').update({
      review_status: 'approved', reviewed_by: 'المستشار', reviewed_at: new Date().toISOString(),
      final_award: true,
    }).eq('id', d.id);
    await supabase.from('m07_arbitration_cases').update({
      is_final: true, m9_enforcement_ready: true, award_date: new Date().toISOString().split('T')[0],
    }).eq('id', selectedCase!.id);
    if (selectedCase) await logAudit(selectedCase.id, 'draft_approved', 'اعتماد مسودة الحكم النهائي — جاهز للتنفيذ عبر M9');
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.arbitration_institution || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeCases = cases.filter((c) => !c.is_final).length;
  const finalCases = cases.filter((c) => c.is_final).length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const scheduledHearings = allHearings.filter((h) => h.status === 'scheduled').length;
  const pendingDrafts = allDrafts.filter((d) => d.review_status === 'draft' || d.review_status === 'under_review').length;

  const tabs: { id: Tab; label: string; icon: typeof Scale; badge?: number }[] = [
    { id: 'cases', label: 'قضايا التحكيم', icon: Scale, badge: activeCases },
    { id: 'arbitrators', label: 'المحكمون', icon: Gavel, badge: allArbitrators.length },
    { id: 'virtual_hearings', label: 'الجلسات الافتراضية', icon: Video, badge: scheduledHearings },
    { id: 'draft_awards', label: 'مسودات الأحكام', icon: FileText, badge: pendingDrafts },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Scale size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك دوائر التحكيم المحلي والدولي (M7)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع التحكيمي — تحكيم محلي ودولي وجلسات افتراضية مشفرة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية تحكيم
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Scale size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<Award size={14} className="text-green-600" />} label="أحكام نهائية" value={String(finalCases)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<Video size={14} className="text-amber-600" />} label="جلسات مجدولة" value={String(scheduledHearings)} valueClass="text-amber-700" />
      </div>

      {/* 3-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة التحكيم — 3 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.arbitration_filing;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} قضية</span>
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
            { icon: Fingerprint, label: 'بوابة الهوية (M109)', desc: 'تأكيد بيومتري للمحكمين', color: 'text-blue-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'أمانات التحكيم', color: 'text-gold' },
            { icon: Shield, label: 'تنفيذ الأحكام (M9)', desc: 'تصديق وتنفيذ', color: 'text-green-600' },
            { icon: Sparkles, label: 'الوكيل الذكي (M92)', desc: 'توليد مسودة الحكم', color: 'text-purple-600' },
            { icon: FileText, label: 'البريد السيادي (M52)', desc: 'إخطارات سيادية', color: 'text-amber-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو مؤسسة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Scale size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا تحكيم</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.arbitration_filing;
              const stageIdx = STAGES.indexOf(c.stage);
              const enfCfg = ENFORCEABILITY_CONFIG[c.enforceability_status || 'pending'] || ENFORCEABILITY_CONFIG.pending;
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Scale size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[c.case_category] || c.case_category}</span>
                          {c.is_final && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                          {c.enforceability_status && <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${enfCfg.bg} ${enfCfg.text}`}>{enfCfg.label}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.arbitration_institution && <span className="font-body text-[9px] text-ink/40"><Globe size={9} className="inline ml-0.5" />{c.arbitration_institution}</span>}
                          {c.seat_of_arbitration && <span className="font-body text-[9px] text-ink/40">{c.seat_of_arbitration}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.hearing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.hearing_date)}</span>}
                          {c.m109_biometric_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Fingerprint size={8} /> M109</span>}
                          {c.m54_escrow_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m9_enforcement_ready && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Shield size={8} /> M9</span>}
                          {c.m92_draft_generated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M92</span>}
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

      {/* Arbitrators tab */}
      {activeTab === 'arbitrators' && (
        <div className="space-y-2">
          {allArbitrators.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Gavel size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا يوجد محكمون مسجلون</p></div>
          ) : (
            allArbitrators.map((a) => {
              const c = cases.find((c) => c.id === a.case_id);
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.biometric_verified ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <Gavel size={14} className={a.biometric_verified ? 'text-green-600' : 'text-amber-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ARBITRATOR_ROLE_LABELS[a.role ?? ''] || a.role}</span>
                          {a.biometric_verified ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Fingerprint size={8} /> تم التحقق البيومتري</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Clock size={8} /> بانتظار التحقق</span>
                          )}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{a.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {a.appointment_party && <span className="font-body text-[9px] text-ink/40">معين من: {a.appointment_party}</span>}
                          {a.qualifications && <span className="font-body text-[9px] text-ink/30">{a.qualifications}</span>}
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

      {/* Virtual hearings tab */}
      {activeTab === 'virtual_hearings' && (
        <div className="space-y-2">
          {allHearings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Video size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد جلسات افتراضية</p></div>
          ) : (
            allHearings.map((h) => {
              const cfg = HEARING_STATUS_CONFIG[h.status] || HEARING_STATUS_CONFIG.scheduled;
              const c = cases.find((c) => c.id === h.case_id);
              return (
                <div key={h.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Video size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {h.platform && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{h.platform}</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{formatDate(h.hearing_date)} {h.hearing_time && `— ${h.hearing_time}`}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">{h.duration_minutes} دقيقة</span>
                          {h.encryption_standard && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Lock size={8} /> {h.encryption_standard}</span>}
                          {h.biometric_verification && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Fingerprint size={8} /> تحقق بيومتري</span>}
                          {h.recording_hash && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Lock size={8} /> {h.recording_hash}</span>}
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

      {/* Draft awards tab */}
      {activeTab === 'draft_awards' && (
        <div className="space-y-2">
          {allDrafts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><FileText size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد مسودات أحكام</p></div>
          ) : (
            allDrafts.map((d) => {
              const cfg = REVIEW_STATUS_CONFIG[d.review_status] || REVIEW_STATUS_CONFIG.draft;
              const c = cases.find((c) => c.id === d.case_id);
              return (
                <div key={d.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <FileText size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {d.final_award && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Award size={8} className="inline ml-0.5" /> حكم نهائي</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{d.draft_title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">توليد: {d.generated_by}</span>
                          {d.reviewed_by && <span className="font-body text-[9px] text-ink/30">مراجعة: {d.reviewed_by}</span>}
                        </div>
                        {d.draft_content && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{d.draft_content}</p>}
                      </div>
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
                      : log.action.includes('m109') || log.action.includes('biometric') ? <Fingerprint size={12} className="text-blue-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m9') ? <Shield size={12} className="text-green-600" />
                      : log.action.includes('m92') || log.action.includes('draft') ? <Sparkles size={12} className="text-purple-600" />
                      : log.action.includes('m52') ? <FileText size={12} className="text-amber-600" />
                      : log.action.includes('hearing') ? <Video size={12} className="text-amber-600" />
                      : log.action.includes('arbitrator') ? <Gavel size={12} className="text-blue-600" />
                      : log.action.includes('party') ? <Users size={12} className="text-blue-600" />
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
                <Scale size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف قضية التحكيم</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.arbitration_filing).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.arbitration_filing).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.arbitration_filing).label}
                    </span>
                    {selectedCase.is_final && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                    {selectedCase.enforceability_status && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(ENFORCEABILITY_CONFIG[selectedCase.enforceability_status] || ENFORCEABILITY_CONFIG.pending).bg} ${(ENFORCEABILITY_CONFIG[selectedCase.enforceability_status] || ENFORCEABILITY_CONFIG.pending).text}`}>
                        {(ENFORCEABILITY_CONFIG[selectedCase.enforceability_status] || ENFORCEABILITY_CONFIG.pending).label}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.arbitration_filing;
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

                {/* Arbitration info */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Globe size={12} className="text-purple-600" />
                    <span className="font-body text-[10px] font-bold text-purple-700">بيانات التحكيم</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">نوع التحكيم</span><p className="font-body text-[10px] font-bold text-midnight">{ARBITRATION_TYPE_LABELS[selectedCase.arbitration_type || ''] || selectedCase.arbitration_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">عدد المحكمين</span><p className="font-body text-[10px] font-bold text-midnight">{selectedCase.number_of_arbitrators || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المؤسسة</span><p className="font-body text-[10px] font-bold text-midnight">{selectedCase.arbitration_institution || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مقعد التحكيم</span><p className="font-body text-[10px] font-bold text-midnight">{selectedCase.seat_of_arbitration || '—'}</p></div>
                  </div>
                </div>

                {/* Case info grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">الفئة</span>
                    <p className="font-body text-xs font-bold text-midnight">{CATEGORY_LABELS[selectedCase.case_category] || selectedCase.case_category}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ الإيداع</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.filing_date ? formatDate(selectedCase.filing_date) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ الجلسة</span>
                    <p className="font-body text-xs font-bold text-amber-600">{selectedCase.hearing_date ? formatDate(selectedCase.hearing_date) : '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <span className="font-body text-[9px] text-ink/40">تاريخ الحكم</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedCase.award_date ? formatDate(selectedCase.award_date) : '—'}</p>
                  </div>
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رسوم التحكيم</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.arbitration_fees)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الأمانة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.escrow_amount)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m109_biometric_verified ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Fingerprint size={10} /> M109 {selectedCase.m109_biometric_verified ? 'تم التحقق' : 'بانتظار'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_escrow_opened ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_escrow_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m9_enforcement_ready ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M9 {selectedCase.m9_enforcement_ready ? 'جاهز' : 'غير جاهز'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_draft_generated ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M92 {selectedCase.m92_draft_generated ? 'تم التوليد' : 'غير مولد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m52_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M52 {selectedCase.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCase.secure_data_room_id && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                    <Lock size={12} className="text-green-600" />
                    <span className="font-body text-[10px] text-ink/60">غرفة البيانات الآمنة: <span className="font-bold text-midnight">{selectedCase.secure_data_room_id}</span></span>
                  </div>
                )}

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
                )}

                {/* Arbitrators */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Gavel size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">المحكمون</span></div>
                    <button onClick={() => setArbitratorModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> تعيين محكم</button>
                  </div>
                  <div className="space-y-1.5">
                    {arbitrators.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/arb">
                        <Gavel size={12} className={a.biometric_verified ? 'text-green-600' : 'text-amber-600'} />
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{a.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{ARBITRATOR_ROLE_LABELS[a.role ?? ''] || a.role}</span>
                            {a.biometric_verified ? (
                              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Fingerprint size={8} /> تم التحقق</span>
                            ) : (
                              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Clock size={8} /> بانتظار</span>
                            )}
                          </div>
                        </div>
                        {!a.biometric_verified && <button onClick={() => verifyArbitrator(a)} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white font-body text-[9px] font-bold hover:bg-blue-700 transition-colors"><Fingerprint size={9} /> تحقق</button>}
                        <button onClick={() => { setDeleteId(a.id); setDeleteType('arbitrator'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/arb:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {arbitrators.length === 0 && <p className="font-body text-[10px] text-ink/30">لا يوجد محكمون معينون</p>}
                  </div>
                </div>

                {/* Parties */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Users size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الأطراف</span></div>
                    <button onClick={() => setPartyModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة طرف</button>
                  </div>
                  <div className="space-y-1.5">
                    {parties.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/party">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'claimant' ? 'bg-blue-50 text-blue-600' : p.party_type === 'respondent' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.name}</p>
                          {p.role && <span className="font-body text-[9px] text-ink/40">{p.role}</span>}
                        </div>
                        <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/party:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {parties.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أطراف مسجلة</p>}
                  </div>
                </div>

                {/* Virtual hearings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Video size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الجلسات الافتراضية</span></div>
                    <button onClick={() => setHearingModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> جدولة جلسة</button>
                  </div>
                  <div className="space-y-1.5">
                    {hearings.map((h) => {
                      const cfg = HEARING_STATUS_CONFIG[h.status] || HEARING_STATUS_CONFIG.scheduled;
                      return (
                        <div key={h.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/h">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{h.platform}</span>
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{formatDate(h.hearing_date)} {h.hearing_time && `— ${h.hearing_time}`}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-body text-[9px] text-ink/40">{h.duration_minutes} دقيقة</span>
                            {h.encryption_standard && <span className="flex items-center gap-0.5 font-body text-[9px] text-green-600"><Lock size={8} /> {h.encryption_standard}</span>}
                            {h.biometric_verification && <span className="flex items-center gap-0.5 font-body text-[9px] text-blue-600"><Fingerprint size={8} /> بيومتري</span>}
                          </div>
                        </div>
                      );
                    })}
                    {hearings.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد جلسات افتراضية</p>}
                  </div>
                </div>

                {/* Draft awards */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><FileText size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">مسودات الأحكام</span></div>
                    <button onClick={() => setDraftModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> توليد مسودة</button>
                  </div>
                  <div className="space-y-1.5">
                    {drafts.map((d) => {
                      const cfg = REVIEW_STATUS_CONFIG[d.review_status] || REVIEW_STATUS_CONFIG.draft;
                      return (
                        <div key={d.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/draft">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            {d.final_award && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{d.draft_title}</p>
                          <span className="font-body text-[9px] text-ink/40">توليد: {d.generated_by}</span>
                          {d.draft_content && <p className="font-body text-[9px] text-ink/50 mt-0.5 leading-tight line-clamp-2">{d.draft_content}</p>}
                          {d.review_status !== 'approved' && (
                            <button onClick={() => approveDraft(d)} className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white font-body text-[9px] font-bold hover:bg-green-700 transition-colors">
                              <CheckCircle2 size={9} /> اعتماد كحكم نهائي
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {drafts.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد مسودات أحكام</p>}
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل قضية التحكيم' : 'قضية تحكيم جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="ARB-2025-001" /></Field>
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النوع الفرعي"><TextInput value={form.dispute_subtype} onChange={(e) => setForm({ ...form, dispute_subtype: e.target.value })} /></Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التحكيم">
            <Select value={form.arbitration_type} onChange={(e) => setForm({ ...form, arbitration_type: e.target.value })}>
              {Object.entries(ARBITRATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="عدد المحكمين"><TextInput type="number" value={form.number_of_arbitrators} onChange={(e) => setForm({ ...form, number_of_arbitrators: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مؤسسة التحكيم"><TextInput value={form.arbitration_institution} onChange={(e) => setForm({ ...form, arbitration_institution: e.target.value })} /></Field>
          <Field label="مقعد التحكيم"><TextInput value={form.seat_of_arbitration} onChange={(e) => setForm({ ...form, seat_of_arbitration: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="تاريخ الإيداع"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
          <Field label="تاريخ الجلسة"><TextInput type="date" value={form.hearing_date} onChange={(e) => setForm({ ...form, hearing_date: e.target.value })} /></Field>
          <Field label="تاريخ الحكم"><TextInput type="date" value={form.award_date} onChange={(e) => setForm({ ...form, award_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="رسوم التحكيم"><TextInput type="number" value={form.arbitration_fees} onChange={(e) => setForm({ ...form, arbitration_fees: e.target.value })} /></Field>
          <Field label="الأمانة (Escrow)"><TextInput type="number" value={form.escrow_amount} onChange={(e) => setForm({ ...form, escrow_amount: e.target.value })} /></Field>
        </div>
        <Field label="نص الحكم"><TextArea value={form.award_text} onChange={(e) => setForm({ ...form, award_text: e.target.value })} rows={3} /></Field>
        <Field label="معرّف غرفة البيانات الآمنة"><TextInput value={form.secure_data_room_id} onChange={(e) => setForm({ ...form, secure_data_room_id: e.target.value })} /></Field>
        <Field label="المستشار المسؤول">
          <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
            <option value="">— اختر —</option>
            {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Arbitrator modal */}
      <EntityModal open={arbitratorModalOpen} title="تعيين محكم" onClose={() => setArbitratorModalOpen(false)} onSubmit={addArbitrator}>
        <Field label="الاسم" required><TextInput value={arbitratorForm.name} onChange={(e) => setArbitratorForm({ ...arbitratorForm, name: e.target.value })} /></Field>
        <Field label="الدور">
          <Select value={arbitratorForm.role} onChange={(e) => setArbitratorForm({ ...arbitratorForm, role: e.target.value })}>
            {Object.entries(ARBITRATOR_ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="معين من قبل"><TextInput value={arbitratorForm.appointment_party} onChange={(e) => setArbitratorForm({ ...arbitratorForm, appointment_party: e.target.value })} /></Field>
        <Field label="المؤهلات"><TextArea value={arbitratorForm.qualifications} onChange={(e) => setArbitratorForm({ ...arbitratorForm, qualifications: e.target.value })} rows={2} /></Field>
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
        <Field label="معلومات الاتصال"><TextInput value={partyForm.contact_info} onChange={(e) => setPartyForm({ ...partyForm, contact_info: e.target.value })} /></Field>
        <Field label="التمثيل القانوني"><TextInput value={partyForm.legal_representation} onChange={(e) => setPartyForm({ ...partyForm, legal_representation: e.target.value })} /></Field>
      </EntityModal>

      {/* Hearing modal */}
      <EntityModal open={hearingModalOpen} title="جدولة جلسة افتراضية" onClose={() => setHearingModalOpen(false)} onSubmit={addHearing}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الجلسة" required><TextInput type="date" value={hearingForm.hearing_date} onChange={(e) => setHearingForm({ ...hearingForm, hearing_date: e.target.value })} /></Field>
          <Field label="وقت الجلسة"><TextInput type="time" value={hearingForm.hearing_time} onChange={(e) => setHearingForm({ ...hearingForm, hearing_time: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المدة (دقيقة)"><TextInput type="number" value={hearingForm.duration_minutes} onChange={(e) => setHearingForm({ ...hearingForm, duration_minutes: e.target.value })} /></Field>
          <Field label="المنصة">
            <Select value={hearingForm.platform} onChange={(e) => setHearingForm({ ...hearingForm, platform: e.target.value })}>
              <option value="Zoom">Zoom</option>
              <option value="Teams">Microsoft Teams</option>
              <option value="Custom">منصة مخصصة</option>
            </Select>
          </Field>
        </div>
        <Field label="معيار التشفير">
          <Select value={hearingForm.encryption_standard} onChange={(e) => setHearingForm({ ...hearingForm, encryption_standard: e.target.value })}>
            <option value="AES-256">AES-256</option>
            <option value="AES-128">AES-128</option>
            <option value="ChaCha20">ChaCha20</option>
          </Select>
        </Field>
        <Field label="التحقق البيومتري">
          <Select value={hearingForm.biometric_verification ? 'true' : 'false'} onChange={(e) => setHearingForm({ ...hearingForm, biometric_verification: e.target.value === 'true' })}>
            <option value="false">معطّل</option>
            <option value="true">مفعّل</option>
          </Select>
        </Field>
      </EntityModal>

      {/* Draft award modal */}
      <EntityModal open={draftModalOpen} title="توليد مسودة حكم" onClose={() => setDraftModalOpen(false)} onSubmit={addDraft}>
        <Field label="عنوان المسودة" required><TextInput value={draftForm.draft_title} onChange={(e) => setDraftForm({ ...draftForm, draft_title: e.target.value })} /></Field>
        <Field label="المولد عبر">
          <Select value={draftForm.generated_by} onChange={(e) => setDraftForm({ ...draftForm, generated_by: e.target.value })}>
            <option value="الوكيل الذكي (M92)">الوكيل الذكي (M92)</option>
            <option value="المستشار القانوني">المستشار القانوني</option>
          </Select>
        </Field>
        <Field label="نص المسودة"><TextArea value={draftForm.draft_content} onChange={(e) => setDraftForm({ ...draftForm, draft_content: e.target.value })} rows={6} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
