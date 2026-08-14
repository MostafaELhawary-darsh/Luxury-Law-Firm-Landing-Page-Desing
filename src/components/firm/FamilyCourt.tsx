import { useEffect, useState, useCallback } from 'react';
import {
  Heart, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search,
  Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, Server, Baby, Home, Coins, UserCheck, KeyRound,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M05FamilyCase as M05Case, M05FamilyParty as M05Party,
  M05AlimonyOrder, M05CustodyArrangement, M05InheritanceLink, M05FamilyAuditLog as M05AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'alimony_orders' | 'custody_arrangements' | 'inheritance' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  social_integration: { label: 'التكامل الاجتماعي', bg: 'bg-blue-50', text: 'text-blue-700' },
  financial_execution: { label: 'التنفيذ المالي', bg: 'bg-amber-50', text: 'text-amber-700' },
  confidential_archiving: { label: 'الأرشفة السرية', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['social_integration', 'financial_execution', 'confidential_archiving'];

const CATEGORY_LABELS: Record<string, string> = {
  divorce: 'طلاق',
  khula: 'خلع',
  alimony: 'نفقة',
  custody: 'حضانة',
  inheritance: 'مواريث',
  guardianship: 'ولاية',
};

const SUBTYPE_LABELS: Record<string, string> = {
  consensual_divorce: 'طلاق بالتراضي',
  contested_divorce: 'طلاق نزاعي',
  khula: 'خلع',
  alimony: 'نفقة زوجية',
  child_alimony: 'نفقة أولاد',
  custody_dispute: 'نزاع حضانة',
  visitation: 'رؤية',
  travel_authorization: 'إذن سفر',
  estate_distribution: 'توزيع تركة',
  guardianship: 'ولاية',
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  husband: 'الزوج',
  wife: 'الزوجة',
  child: 'طفل',
  guardian: 'ولي',
  heir: 'وارث',
  witness: 'شاهد',
  other: 'طرف آخر',
};

const ALIMONY_TYPE_LABELS: Record<string, string> = {
  spousal: 'نفقة زوجية',
  child: 'نفقة أولاد',
  educational: 'نفقة تعليمية',
  medical: 'نفقة علاجية',
  accommodation: 'نفقة سكن',
};

const COLLECTION_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'تحويل بنكي',
  cash: 'نقداً',
  payroll_deduction: 'خصم من الراتب',
  court_bailiff: 'تنفيذ بواسطة المحضر',
  m54_sync: 'تحصيل عبر M54',
};

const ALIMONY_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'ساري', bg: 'bg-green-50', text: 'text-green-600' },
  suspended: { label: 'موقوف', bg: 'bg-amber-50', text: 'text-amber-600' },
  completed: { label: 'منتهي', bg: 'bg-gray-100', text: 'text-gray-500' },
  arrears: { label: 'متأخرات', bg: 'bg-red-50', text: 'text-red-600' },
};

const CUSTODY_TYPE_LABELS: Record<string, string> = {
  sole: 'حضانة منفردة',
  joint: 'حضانة مشتركة',
  temporary: 'حضانة مؤقتة',
  visitation_only: 'رؤية فقط',
};

const CUSTODY_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'سارية', bg: 'bg-green-50', text: 'text-green-600' },
  pending: { label: 'قيد المراجعة', bg: 'bg-amber-50', text: 'text-amber-600' },
  modified: { label: 'معدّلة', bg: 'bg-blue-50', text: 'text-blue-600' },
  terminated: { label: 'منتهية', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const DISTRIBUTION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد التوزيع', bg: 'bg-amber-50', text: 'text-amber-600' },
  in_progress: { label: 'جارٍ التوزيع', bg: 'bg-blue-50', text: 'text-blue-600' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-600' },
  disputed: { label: 'متنازع عليه', bg: 'bg-red-50', text: 'text-red-600' },
};

const CONFIDENTIALITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  standard: { label: 'عادي', bg: 'bg-gray-100', text: 'text-gray-600' },
  confidential: { label: 'سري', bg: 'bg-amber-50', text: 'text-amber-600' },
  highly_confidential: { label: 'سرية تامة', bg: 'bg-red-50', text: 'text-red-600' },
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
  monthly_alimony: string;
  total_alimony_awarded: string;
  estate_value: string;
  confidentiality_level: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'divorce', dispute_subtype: 'consensual_divorce',
  stage: 'social_integration', court: '', court_circuit: '', filing_date: '', next_hearing_date: '', success_rate_estimate: '50',
  monthly_alimony: '0', total_alimony_awarded: '0', estate_value: '0', confidentiality_level: 'confidential',
  assigned_advisor_id: '', description: '',
};

export default function FamilyCourt({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M05Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M05Case | null>(null);
  const [parties, setParties] = useState<M05Party[]>([]);
  const [alimonyOrders, setAlimonyOrders] = useState<M05AlimonyOrder[]>([]);
  const [custodyArrangements, setCustodyArrangements] = useState<M05CustodyArrangement[]>([]);
  const [inheritanceLinks, setInheritanceLinks] = useState<M05InheritanceLink[]>([]);
  const [auditLogs, setAuditLogs] = useState<M05AuditLog[]>([]);
  const [allAlimonyOrders, setAllAlimonyOrders] = useState<M05AlimonyOrder[]>([]);
  const [allCustodyArrangements, setAllCustodyArrangements] = useState<M05CustodyArrangement[]>([]);
  const [allInheritanceLinks, setAllInheritanceLinks] = useState<M05InheritanceLink[]>([]);
  const [allAudit, setAllAudit] = useState<M05AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'party' | 'alimony' | 'custody' | 'inheritance'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [partyForm, setPartyForm] = useState({ party_type: 'husband', name: '', role: '', national_id: '', date_of_birth: '', gender: 'male', contact_info: '', legal_representation: '', is_minor: false });
  const [alimonyModalOpen, setAlimonyModalOpen] = useState(false);
  const [alimonyForm, setAlimonyForm] = useState({ alimony_type: 'spousal', payer_name: '', beneficiary_name: '', monthly_amount: '0', start_date: '', end_date: '', collection_method: 'bank_transfer' });
  const [custodyModalOpen, setCustodyModalOpen] = useState(false);
  const [custodyForm, setCustodyForm] = useState({ arrangement_type: 'sole', child_name: '', child_age: '', custodian_name: '', visitation_schedule: '', visitation_frequency: '', travel_ban: false, notes: '' });
  const [inheritanceModalOpen, setInheritanceModalOpen] = useState(false);
  const [inheritanceForm, setInheritanceForm] = useState({ deceased_name: '', death_date: '', estate_description: '', total_estate_value: '0', heirs_count: '0', shares_summary: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, aoRes, caRes, ilRes, auditRes] = await Promise.all([
      supabase.from('m05_family_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m05_alimony_orders').select('*').order('created_at', { ascending: false }),
      supabase.from('m05_custody_arrangements').select('*').order('created_at', { ascending: false }),
      supabase.from('m05_inheritance_links').select('*').order('created_at', { ascending: false }),
      supabase.from('m05_family_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M05Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAlimonyOrders((aoRes.data as M05AlimonyOrder[]) || []);
    setAllCustodyArrangements((caRes.data as M05CustodyArrangement[]) || []);
    setAllInheritanceLinks((ilRes.data as M05InheritanceLink[]) || []);
    setAllAudit((auditRes.data as M05AuditLog[]) || []);
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
    await supabase.from('m05_family_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
      rbac_clearance: 'confidential',
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M05Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      dispute_subtype: c.dispute_subtype || 'consensual_divorce', stage: c.stage, court: c.court || '',
      court_circuit: c.court_circuit || '', filing_date: c.filing_date || '', next_hearing_date: c.next_hearing_date || '',
      success_rate_estimate: String(c.success_rate_estimate || 50), monthly_alimony: String(c.monthly_alimony || 0),
      total_alimony_awarded: String(c.total_alimony_awarded || 0), estate_value: String(c.estate_value || 0),
      confidentiality_level: c.confidentiality_level || 'confidential',
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
      filing_date: form.filing_date || null,
      next_hearing_date: form.next_hearing_date || null,
      success_rate_estimate: Number(form.success_rate_estimate) || 50,
      monthly_alimony: Number(form.monthly_alimony) || 0,
      total_alimony_awarded: Number(form.total_alimony_awarded) || 0,
      estate_value: Number(form.estate_value) || 0,
      confidentiality_level: form.confidentiality_level,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m05_family_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات قضية الأحوال الشخصية');
    } else {
      const { data } = await supabase.from('m05_family_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف قضية أحوال شخصية — تصنيف: ' + (CATEGORY_LABELS[form.case_category] || form.case_category));
        await supabase.from('m05_family_cases').update({
          m10_linked: true,
          m54_financial_linked: true,
          m80_child_linked: true,
          m27_inheritance_linked: true,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: 'CC-M05-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm10_linked', 'ربط الملف بنواة القضية الذكية (M10)');
        await logAudit(newId, 'm54_financial_linked', 'ربط المحرك المالي (M54) — النفقة والمتأخرات');
        await logAudit(newId, 'm80_child_linked', 'ربط محرك الأمومة والطفولة (M80)');
        await logAudit(newId, 'm27_inheritance_linked', 'ربط محرك المواريث (M27)');
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
    if (deleteType === 'case') await supabase.from('m05_family_cases').delete().eq('id', deleteId);
    else if (deleteType === 'party') await supabase.from('m05_family_parties').delete().eq('id', deleteId);
    else if (deleteType === 'alimony') await supabase.from('m05_alimony_orders').delete().eq('id', deleteId);
    else if (deleteType === 'custody') await supabase.from('m05_custody_arrangements').delete().eq('id', deleteId);
    else if (deleteType === 'inheritance') await supabase.from('m05_inheritance_links').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M05Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [pRes, aoRes, caRes, ilRes, aRes] = await Promise.all([
      supabase.from('m05_family_parties').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
      supabase.from('m05_alimony_orders').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m05_custody_arrangements').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m05_inheritance_links').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m05_family_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setParties((pRes.data as M05Party[]) || []);
    setAlimonyOrders((aoRes.data as M05AlimonyOrder[]) || []);
    setCustodyArrangements((caRes.data as M05CustodyArrangement[]) || []);
    setInheritanceLinks((ilRes.data as M05InheritanceLink[]) || []);
    setAuditLogs((aRes.data as M05AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M05Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m05_family_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedCase(updated as M05Case);
  };

  const addParty = async () => {
    if (!selectedCase || !partyForm.name.trim()) return;
    await supabase.from('m05_family_parties').insert({
      case_id: selectedCase.id, party_type: partyForm.party_type, name: partyForm.name.trim(),
      role: partyForm.role.trim() || null, national_id: partyForm.national_id.trim() || null,
      date_of_birth: partyForm.date_of_birth || null, gender: partyForm.gender || null,
      contact_info: partyForm.contact_info.trim() || null,
      legal_representation: partyForm.legal_representation.trim() || null,
      is_minor: partyForm.is_minor,
    });
    await logAudit(selectedCase.id, 'party_added', 'إضافة طرف: ' + partyForm.name + (partyForm.is_minor ? ' (قاصر)' : ''));
    setPartyForm({ party_type: 'husband', name: '', role: '', national_id: '', date_of_birth: '', gender: 'male', contact_info: '', legal_representation: '', is_minor: false });
    setPartyModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addAlimony = async () => {
    if (!selectedCase || !alimonyForm.payer_name.trim() || !alimonyForm.beneficiary_name.trim()) return;
    await supabase.from('m05_alimony_orders').insert({
      case_id: selectedCase.id, alimony_type: alimonyForm.alimony_type,
      payer_name: alimonyForm.payer_name.trim(), beneficiary_name: alimonyForm.beneficiary_name.trim(),
      monthly_amount: Number(alimonyForm.monthly_amount) || 0,
      start_date: alimonyForm.start_date || null, end_date: alimonyForm.end_date || null,
      total_awarded: 0, collection_method: alimonyForm.collection_method,
      status: 'active', m54_synced: false, arrears: 0,
    });
    await logAudit(selectedCase.id, 'alimony_order_added', 'إضافة حكم نفقة: ' + (ALIMONY_TYPE_LABELS[alimonyForm.alimony_type] || alimonyForm.alimony_type) + ' — ' + alimonyForm.monthly_amount + ' شهرياً');
    await supabase.from('m05_family_cases').update({ m54_financial_linked: true }).eq('id', selectedCase.id);
    setAlimonyForm({ alimony_type: 'spousal', payer_name: '', beneficiary_name: '', monthly_amount: '0', start_date: '', end_date: '', collection_method: 'bank_transfer' });
    setAlimonyModalOpen(false);
    openCaseDetail(selectedCase);
    fetchAll();
  };

  const addCustody = async () => {
    if (!selectedCase || !custodyForm.child_name.trim()) return;
    await supabase.from('m05_custody_arrangements').insert({
      case_id: selectedCase.id, arrangement_type: custodyForm.arrangement_type,
      child_name: custodyForm.child_name.trim(),
      child_age: custodyForm.child_age ? Number(custodyForm.child_age) : null,
      custodian_name: custodyForm.custodian_name.trim() || null,
      visitation_schedule: custodyForm.visitation_schedule.trim() || null,
      visitation_frequency: custodyForm.visitation_frequency.trim() || null,
      travel_ban: custodyForm.travel_ban,
      safe_environment_verified: false, m80_synced: false,
      arrangement_status: 'pending', notes: custodyForm.notes.trim() || null,
    });
    await logAudit(selectedCase.id, 'custody_added', 'إضافة ترتيب حضانة: ' + custodyForm.child_name + (custodyForm.travel_ban ? ' — مع منع سفر' : ''));
    await supabase.from('m05_family_cases').update({ m80_child_linked: true }).eq('id', selectedCase.id);
    setCustodyForm({ arrangement_type: 'sole', child_name: '', child_age: '', custodian_name: '', visitation_schedule: '', visitation_frequency: '', travel_ban: false, notes: '' });
    setCustodyModalOpen(false);
    openCaseDetail(selectedCase);
    fetchAll();
  };

  const addInheritance = async () => {
    if (!selectedCase || !inheritanceForm.deceased_name.trim()) return;
    const sharesSummary: Record<string, string> = {};
    inheritanceForm.shares_summary.split('\n').filter(Boolean).forEach((line) => {
      const [heir, share] = line.split(':').map((s) => s.trim());
      if (heir && share) sharesSummary[heir] = share;
    });
    await supabase.from('m05_inheritance_links').insert({
      case_id: selectedCase.id, deceased_name: inheritanceForm.deceased_name.trim(),
      death_date: inheritanceForm.death_date || null,
      estate_description: inheritanceForm.estate_description.trim() || null,
      total_estate_value: Number(inheritanceForm.total_estate_value) || 0,
      heirs_count: Number(inheritanceForm.heirs_count) || 0,
      distribution_status: 'pending', sharia_compliant: true, m27_synced: false,
      shares_summary: sharesSummary,
    });
    await logAudit(selectedCase.id, 'inheritance_linked', 'ربط ميراث: ' + inheritanceForm.deceased_name + ' — قيمة التركة: ' + inheritanceForm.total_estate_value);
    await supabase.from('m05_family_cases').update({ m27_inheritance_linked: true }).eq('id', selectedCase.id);
    setInheritanceForm({ deceased_name: '', death_date: '', estate_description: '', total_estate_value: '0', heirs_count: '0', shares_summary: '' });
    setInheritanceModalOpen(false);
    openCaseDetail(selectedCase);
    fetchAll();
  };

  const syncAlimonyM54 = async (a: M05AlimonyOrder) => {
    await supabase.from('m05_alimony_orders').update({ m54_synced: true }).eq('id', a.id);
    if (selectedCase) await logAudit(selectedCase.id, 'm54_synced', 'مزامنة حكم النفقة مع المحرك المالي (M54): ' + a.payer_name + ' → ' + a.beneficiary_name);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const syncCustodyM80 = async (ca: M05CustodyArrangement) => {
    await supabase.from('m05_custody_arrangements').update({ m80_synced: true, safe_environment_verified: true }).eq('id', ca.id);
    if (selectedCase) await logAudit(selectedCase.id, 'm80_synced', 'مزامنة ترتيب الحضانة مع محرك الأمومة والطفولة (M80): ' + ca.child_name);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const syncInheritanceM27 = async (il: M05InheritanceLink) => {
    await supabase.from('m05_inheritance_links').update({ m27_synced: true, distribution_status: 'in_progress' }).eq('id', il.id);
    if (selectedCase) await logAudit(selectedCase.id, 'm27_synced', 'مزامنة التركة مع محرك المواريث (M27): ' + il.deceased_name);
    if (selectedCase) openCaseDetail(selectedCase);
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
  const totalAlimony = cases.reduce((s, c) => s + (c.total_alimony_awarded || 0), 0);
  const totalEstate = cases.reduce((s, c) => s + (c.estate_value || 0), 0);
  const activeAlimonyOrders = allAlimonyOrders.filter((a) => a.status === 'active').length;
  const activeCustody = allCustodyArrangements.filter((ca) => ca.arrangement_status === 'active' || ca.arrangement_status === 'pending').length;
  const avgSuccess = cases.length > 0 ? cases.reduce((s, c) => s + (c.success_rate_estimate || 0), 0) / cases.length : 0;

  const tabs: { id: Tab; label: string; icon: typeof Heart; badge?: number }[] = [
    { id: 'cases', label: 'قضايا الأحوال الشخصية', icon: Heart, badge: activeCases },
    { id: 'alimony_orders', label: 'أحكام النفقة', icon: DollarSign, badge: activeAlimonyOrders },
    { id: 'custody_arrangements', label: 'ترتيبات الحضانة', icon: Baby, badge: activeCustody },
    { id: 'inheritance', label: 'المواريث', icon: Coins },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Heart size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك محاكم الأسرة والأحوال الشخصية (M5)</h2>
            <p className="font-body text-[10px] text-ink/40">القطاع القضائي والإجرائي — الطلاق، النفقة، الحضانة، المواريث، الولاية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Lock size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">سرية تامة · RBAC</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> قضية أحوال شخصية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Heart size={14} className="text-midnight" />} label="إجمالي القضايا" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<Activity size={14} className="text-blue-600" />} label="قضايا نشطة" value={String(activeCases)} valueClass="text-blue-700" />
        <StatCard icon={<TrendingUp size={14} className="text-green-600" />} label="متوسط نسبة النجاح" value={avgSuccess.toFixed(1) + '%'} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي النفقات" value={formatCurrency(totalAlimony)} valueClass="text-gold" />
        <StatCard icon={<Coins size={14} className="text-purple-600" />} label="قيمة التركات" value={formatCurrency(totalEstate)} valueClass="text-purple-700" />
      </div>

      {/* 3-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة النزاع الأسري — 3 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.social_integration;
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
            { icon: Baby, label: 'محرك الأمومة والطفولة (M80)', desc: 'رعاية القاصر والبيئة الآمنة', color: 'text-pink-600' },
            { icon: Coins, label: 'محرك المواريث (M27)', desc: 'توزيع التركات شرعياً', color: 'text-amber-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'النفقة والمتأخرات والتحصيل', color: 'text-gold' },
            { icon: Sparkles, label: 'نواة القضية الذكية (M10)', desc: 'تخزين المستندات والجلسات', color: 'text-purple-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'المراسلات والإخطارات', color: 'text-gray-600' },
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
              <Heart size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد قضايا أحوال شخصية</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.social_integration;
              const stageIdx = STAGES.indexOf(c.stage);
              const confCfg = CONFIDENTIALITY_CONFIG[c.confidentiality_level] || CONFIDENTIALITY_CONFIG.confidential;
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Heart size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CATEGORY_LABELS[c.case_category] || c.case_category}</span>
                          {c.is_final && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${confCfg.bg} ${confCfg.text}`}><Lock size={8} /> {confCfg.label}</span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.court && <span className="font-body text-[9px] text-ink/40">{c.court}</span>}
                          {c.monthly_alimony > 0 && <span className="font-body text-[9px] text-gold font-bold">نفقة شهرية: {formatCurrency(c.monthly_alimony)}</span>}
                          {c.total_alimony_awarded > 0 && <span className="font-body text-[9px] text-amber-600 font-bold">إجمالي النفقة: {formatCurrency(c.total_alimony_awarded)}</span>}
                          {c.estate_value > 0 && <span className="font-body text-[9px] text-purple-600 font-bold">قيمة التركة: {formatCurrency(c.estate_value)}</span>}
                          {c.next_hearing_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(c.next_hearing_date)}</span>}
                          {c.success_rate_estimate > 0 && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">
                              <TrendingUp size={8} /> {c.success_rate_estimate.toFixed(0)}%
                            </span>
                          )}
                          {c.m10_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M10</span>}
                          {c.m54_financial_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m80_child_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-pink-50 text-pink-600"><Baby size={8} /> M80</span>}
                          {c.m27_inheritance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Coins size={8} /> M27</span>}
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

      {/* Alimony orders tab */}
      {activeTab === 'alimony_orders' && (
        <div className="space-y-2">
          {allAlimonyOrders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><DollarSign size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد أحكام نفقة</p></div>
          ) : (
            allAlimonyOrders.map((a) => {
              const cfg = ALIMONY_STATUS_CONFIG[a.status] || ALIMONY_STATUS_CONFIG.active;
              const c = cases.find((c) => c.id === a.case_id);
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <DollarSign size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ALIMONY_TYPE_LABELS[a.alimony_type] || a.alimony_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                          {a.m54_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> M54</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{a.payer_name} → {a.beneficiary_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(a.monthly_amount)} / شهر</span>
                          {a.arrears > 0 && <span className="font-body text-[9px] text-red-600 font-bold">متأخرات: {formatCurrency(a.arrears)}</span>}
                          <span className="font-body text-[9px] text-ink/40">{COLLECTION_METHOD_LABELS[a.collection_method] || a.collection_method}</span>
                          {a.start_date && <span className="font-body text-[9px] text-ink/40">من: {formatDate(a.start_date)}</span>}
                          {a.next_collection_date && <span className="flex items-center gap-0.5 font-body text-[9px] text-amber-600"><Calendar size={9} /> {formatDate(a.next_collection_date)}</span>}
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

      {/* Custody arrangements tab */}
      {activeTab === 'custody_arrangements' && (
        <div className="space-y-2">
          {allCustodyArrangements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Baby size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد ترتيبات حضانة</p></div>
          ) : (
            allCustodyArrangements.map((ca) => {
              const cfg = CUSTODY_STATUS_CONFIG[ca.arrangement_status] || CUSTODY_STATUS_CONFIG.pending;
              const c = cases.find((c) => c.id === ca.case_id);
              return (
                <div key={ca.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Baby size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CUSTODY_TYPE_LABELS[ca.arrangement_type] || ca.arrangement_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                          {ca.m80_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-pink-50 text-pink-600"><CheckCircle2 size={8} /> M80</span>}
                          {ca.travel_ban && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Lock size={8} /> منع سفر</span>}
                          {ca.safe_environment_verified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> بيئة آمنة</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{ca.child_name}{ca.child_age != null ? ` (${ca.child_age} سنة)` : ''}</p>
                        {ca.custodian_name && <p className="font-body text-[10px] text-ink/40 mt-0.5">الحاضن: {ca.custodian_name}</p>}
                        {ca.visitation_frequency && <p className="font-body text-[9px] text-ink/40 mt-0.5">الرؤية: {ca.visitation_frequency}</p>}
                        {ca.notes && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{ca.notes}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Inheritance tab */}
      {activeTab === 'inheritance' && (
        <div className="space-y-2">
          {allInheritanceLinks.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Coins size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد روابط ميراث</p></div>
          ) : (
            allInheritanceLinks.map((il) => {
              const cfg = DISTRIBUTION_STATUS_CONFIG[il.distribution_status] || DISTRIBUTION_STATUS_CONFIG.pending;
              const c = cases.find((c) => c.id === il.case_id);
              return (
                <div key={il.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Coins size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {il.sharia_compliant && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> متوافق شرعياً</span>}
                          {il.m27_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CheckCircle2 size={8} /> M27</span>}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{il.deceased_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {il.death_date && <span className="font-body text-[9px] text-ink/40">الوفاة: {formatDate(il.death_date)}</span>}
                          {il.total_estate_value > 0 && <span className="font-body text-[9px] text-purple-600 font-bold">قيمة التركة: {formatCurrency(il.total_estate_value)}</span>}
                          <span className="font-body text-[9px] text-ink/40">عدد الورثة: {il.heirs_count}</span>
                        </div>
                        {il.estate_description && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{il.estate_description}</p>}
                        {il.shares_summary && Object.keys(il.shares_summary).length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <BookOpen size={10} className="text-ink/30" />
                            {Object.entries(il.shares_summary).map(([heir, share], i) => (
                              <span key={i} className="font-body text-[9px] text-ink/40 bg-gray-50 px-1.5 py-0.5 rounded">{heir}: {share}</span>
                            ))}
                          </div>
                        )}
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
                      : log.action.includes('m10') ? <Sparkles size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m80') ? <Baby size={12} className="text-pink-600" />
                      : log.action.includes('m27') ? <Coins size={12} className="text-amber-600" />
                      : log.action.includes('m92') ? <Eye size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-gray-600" />
                      : log.action.includes('alimony') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('custody') ? <Baby size={12} className="text-pink-600" />
                      : log.action.includes('inheritance') ? <Coins size={12} className="text-amber-600" />
                      : log.action.includes('party') ? <Users size={12} className="text-blue-600" />
                      : log.action.includes('stage') ? <CircuitBoard size={12} className="text-purple-600" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                      {log.rbac_clearance && (
                        <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><KeyRound size={8} /> {log.rbac_clearance}</span>
                      )}
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
                <Heart size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف قضية الأحوال الشخصية</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.social_integration).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.social_integration).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.social_integration).label}
                    </span>
                    {selectedCase.is_final && <span className="px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">حكم نهائي</span>}
                    {(() => {
                      const confCfg = CONFIDENTIALITY_CONFIG[selectedCase.confidentiality_level] || CONFIDENTIALITY_CONFIG.confidential;
                      return <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body font-bold ${confCfg.bg} ${confCfg.text}`}><Lock size={9} /> {confCfg.label}</span>;
                    })()}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.social_integration;
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
                      <p className="font-body text-[10px] font-bold text-midnight">تقدير نسبة نجاح القضية</p>
                      <p className="font-body text-[9px] text-ink/40">بناءً على تحليل السوابق القضائية للأحوال الشخصية</p>
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
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">النفقة الشهرية</span><p className="font-body text-xs font-bold text-gold">{formatCurrency(selectedCase.monthly_alimony)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">إجمالي النفقة</span><p className="font-body text-xs font-bold text-amber-600">{formatCurrency(selectedCase.total_alimony_awarded)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">قيمة التركة</span><p className="font-body text-xs font-bold text-purple-600">{formatCurrency(selectedCase.estate_value)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m10_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M10 {selectedCase.m10_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_financial_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_financial_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m80_child_linked ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-ink/30'}`}><Baby size={10} /> M80 {selectedCase.m80_child_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m27_inheritance_linked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Coins size={10} /> M27 {selectedCase.m27_inheritance_linked ? 'مرتبط' : 'غير مرتبط'}</span>
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
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${p.party_type === 'husband' ? 'bg-blue-50 text-blue-600' : p.party_type === 'wife' ? 'bg-pink-50 text-pink-600' : p.party_type === 'child' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/50'}`}>{PARTY_TYPE_LABELS[p.party_type] || p.party_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[10px] font-bold text-midnight">{p.name}{p.is_minor ? ' (قاصر)' : ''}</p>
                          {p.role && <span className="font-body text-[9px] text-ink/40">{p.role}</span>}
                        </div>
                        <button onClick={() => { setDeleteId(p.id); setDeleteType('party'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/party:opacity-100 transition-all"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    {parties.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أطراف مسجلة</p>}
                  </div>
                </div>

                {/* Alimony orders */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><DollarSign size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">أحكام النفقة (M54)</span></div>
                    <button onClick={() => setAlimonyModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> حكم نفقة</button>
                  </div>
                  <div className="space-y-1.5">
                    {alimonyOrders.map((a) => {
                      const cfg = ALIMONY_STATUS_CONFIG[a.status] || ALIMONY_STATUS_CONFIG.active;
                      return (
                        <div key={a.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/al">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{ALIMONY_TYPE_LABELS[a.alimony_type] || a.alimony_type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            {a.m54_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> M54</span>}
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{a.payer_name} → {a.beneficiary_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-body text-[9px] text-gold">{formatCurrency(a.monthly_amount)}/شهر</span>
                            {a.arrears > 0 && <span className="font-body text-[9px] text-red-600">متأخرات: {formatCurrency(a.arrears)}</span>}
                          </div>
                          {!a.m54_synced && (
                            <button onClick={() => syncAlimonyM54(a)} className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded bg-green-600 text-white font-body text-[9px] font-bold hover:bg-green-700 transition-colors">
                              <DollarSign size={9} /> مزامنة M54
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {alimonyOrders.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد أحكام نفقة</p>}
                  </div>
                </div>

                {/* Custody arrangements */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Baby size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">ترتيبات الحضانة (M80)</span></div>
                    <button onClick={() => setCustodyModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> ترتيب حضانة</button>
                  </div>
                  <div className="space-y-1.5">
                    {custodyArrangements.map((ca) => {
                      const cfg = CUSTODY_STATUS_CONFIG[ca.arrangement_status] || CUSTODY_STATUS_CONFIG.pending;
                      return (
                        <div key={ca.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/cu">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-200 text-ink/50">{CUSTODY_TYPE_LABELS[ca.arrangement_type] || ca.arrangement_type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            {ca.travel_ban && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><Lock size={8} /> منع سفر</span>}
                            {ca.m80_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-pink-50 text-pink-600"><CheckCircle2 size={8} /> M80</span>}
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{ca.child_name}{ca.child_age != null ? ` (${ca.child_age} سنة)` : ''}</p>
                          {ca.custodian_name && <p className="font-body text-[9px] text-ink/40 mt-0.5">الحاضن: {ca.custodian_name}</p>}
                          {ca.visitation_frequency && <p className="font-body text-[9px] text-ink/40">الرؤية: {ca.visitation_frequency}</p>}
                          {!ca.m80_synced && (
                            <button onClick={() => syncCustodyM80(ca)} className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded bg-pink-600 text-white font-body text-[9px] font-bold hover:bg-pink-700 transition-colors">
                              <Baby size={9} /> مزامنة M80
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {custodyArrangements.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد ترتيبات حضانة</p>}
                  </div>
                </div>

                {/* Inheritance links */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Coins size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">روابط المواريث (M27)</span></div>
                    <button onClick={() => setInheritanceModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> ربط ميراث</button>
                  </div>
                  <div className="space-y-1.5">
                    {inheritanceLinks.map((il) => {
                      const cfg = DISTRIBUTION_STATUS_CONFIG[il.distribution_status] || DISTRIBUTION_STATUS_CONFIG.pending;
                      return (
                        <div key={il.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/inh">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            {il.sharia_compliant && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> شرعي</span>}
                            {il.m27_synced && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CheckCircle2 size={8} /> M27</span>}
                          </div>
                          <p className="font-body text-[10px] font-bold text-midnight">{il.deceased_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-body text-[9px] text-purple-600 font-bold">قيمة التركة: {formatCurrency(il.total_estate_value)}</span>
                            <span className="font-body text-[9px] text-ink/40">الورثة: {il.heirs_count}</span>
                          </div>
                          {il.shares_summary && Object.keys(il.shares_summary).length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {Object.entries(il.shares_summary).map(([heir, share], i) => (
                                <span key={i} className="font-body text-[9px] text-ink/40 bg-gray-100 px-1 py-0.5 rounded">{heir}: {share}</span>
                              ))}
                            </div>
                          )}
                          {!il.m27_synced && (
                            <button onClick={() => syncInheritanceM27(il)} className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white font-body text-[9px] font-bold hover:bg-amber-700 transition-colors">
                              <Coins size={9} /> مزامنة M27
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {inheritanceLinks.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد روابط ميراث</p>}
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
                          <div className="flex items-center gap-2">
                            <span className="font-body text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                            {log.rbac_clearance && <span className="flex items-center gap-0.5 font-body text-[9px] text-red-600"><KeyRound size={8} /> {log.rbac_clearance}</span>}
                          </div>
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل قضية الأحوال الشخصية' : 'قضية أحوال شخصية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم القضية" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="FAMILY-2025-001" /></Field>
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان القضية" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
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
          <Field label="مستوى السرية">
            <Select value={form.confidentiality_level} onChange={(e) => setForm({ ...form, confidentiality_level: e.target.value })}>
              {Object.entries(CONFIDENTIALITY_CONFIG).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="النفقة الشهرية"><TextInput type="number" value={form.monthly_alimony} onChange={(e) => setForm({ ...form, monthly_alimony: e.target.value })} /></Field>
          <Field label="إجمالي النفقة المحكوم بها"><TextInput type="number" value={form.total_alimony_awarded} onChange={(e) => setForm({ ...form, total_alimony_awarded: e.target.value })} /></Field>
          <Field label="قيمة التركة"><TextInput type="number" value={form.estate_value} onChange={(e) => setForm({ ...form, estate_value: e.target.value })} /></Field>
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
          <Field label="الجنس">
            <Select value={partyForm.gender} onChange={(e) => setPartyForm({ ...partyForm, gender: e.target.value })}>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الرقم القومي"><TextInput value={partyForm.national_id} onChange={(e) => setPartyForm({ ...partyForm, national_id: e.target.value })} /></Field>
          <Field label="تاريخ الميلاد"><TextInput type="date" value={partyForm.date_of_birth} onChange={(e) => setPartyForm({ ...partyForm, date_of_birth: e.target.value })} /></Field>
        </div>
        <Field label="معلومات الاتصال"><TextInput value={partyForm.contact_info} onChange={(e) => setPartyForm({ ...partyForm, contact_info: e.target.value })} /></Field>
        <Field label="التمثيل القانوني"><TextInput value={partyForm.legal_representation} onChange={(e) => setPartyForm({ ...partyForm, legal_representation: e.target.value })} /></Field>
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input type="checkbox" checked={partyForm.is_minor} onChange={(e) => setPartyForm({ ...partyForm, is_minor: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" />
          <span className="font-body text-sm text-ink/70">قاصر</span>
        </label>
      </EntityModal>

      {/* Alimony modal */}
      <EntityModal open={alimonyModalOpen} title="حكم نفقة جديد" onClose={() => setAlimonyModalOpen(false)} onSubmit={addAlimony}>
        <Field label="نوع النفقة" required>
          <Select value={alimonyForm.alimony_type} onChange={(e) => setAlimonyForm({ ...alimonyForm, alimony_type: e.target.value })}>
            {Object.entries(ALIMONY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المُلزَم (المدفوع)" required><TextInput value={alimonyForm.payer_name} onChange={(e) => setAlimonyForm({ ...alimonyForm, payer_name: e.target.value })} /></Field>
          <Field label="المستفيد" required><TextInput value={alimonyForm.beneficiary_name} onChange={(e) => setAlimonyForm({ ...alimonyForm, beneficiary_name: e.target.value })} /></Field>
        </div>
        <Field label="المبلغ الشهري"><TextInput type="number" value={alimonyForm.monthly_amount} onChange={(e) => setAlimonyForm({ ...alimonyForm, monthly_amount: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ البداية"><TextInput type="date" value={alimonyForm.start_date} onChange={(e) => setAlimonyForm({ ...alimonyForm, start_date: e.target.value })} /></Field>
          <Field label="تاريخ النهاية"><TextInput type="date" value={alimonyForm.end_date} onChange={(e) => setAlimonyForm({ ...alimonyForm, end_date: e.target.value })} /></Field>
        </div>
        <Field label="طريقة التحصيل">
          <Select value={alimonyForm.collection_method} onChange={(e) => setAlimonyForm({ ...alimonyForm, collection_method: e.target.value })}>
            {Object.entries(COLLECTION_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
      </EntityModal>

      {/* Custody modal */}
      <EntityModal open={custodyModalOpen} title="ترتيب حضانة جديد" onClose={() => setCustodyModalOpen(false)} onSubmit={addCustody}>
        <Field label="نوع الترتيب" required>
          <Select value={custodyForm.arrangement_type} onChange={(e) => setCustodyForm({ ...custodyForm, arrangement_type: e.target.value })}>
            {Object.entries(CUSTODY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="اسم الطفل" required><TextInput value={custodyForm.child_name} onChange={(e) => setCustodyForm({ ...custodyForm, child_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عمر الطفل"><TextInput type="number" value={custodyForm.child_age} onChange={(e) => setCustodyForm({ ...custodyForm, child_age: e.target.value })} /></Field>
          <Field label="اسم الحاضن"><TextInput value={custodyForm.custodian_name} onChange={(e) => setCustodyForm({ ...custodyForm, custodian_name: e.target.value })} /></Field>
        </div>
        <Field label="جدول الرؤية"><TextArea value={custodyForm.visitation_schedule} onChange={(e) => setCustodyForm({ ...custodyForm, visitation_schedule: e.target.value })} rows={2} /></Field>
        <Field label="تكرار الرؤية"><TextInput value={custodyForm.visitation_frequency} onChange={(e) => setCustodyForm({ ...custodyForm, visitation_frequency: e.target.value })} placeholder="مثال: كل أسبوع" /></Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={custodyForm.travel_ban} onChange={(e) => setCustodyForm({ ...custodyForm, travel_ban: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" />
          <span className="font-body text-sm text-ink/70">منع سفر الطفل</span>
        </label>
        <Field label="ملاحظات"><TextArea value={custodyForm.notes} onChange={(e) => setCustodyForm({ ...custodyForm, notes: e.target.value })} rows={2} /></Field>
      </EntityModal>

      {/* Inheritance modal */}
      <EntityModal open={inheritanceModalOpen} title="ربط ميراث جديد" onClose={() => setInheritanceModalOpen(false)} onSubmit={addInheritance}>
        <Field label="اسم المتوفى" required><TextInput value={inheritanceForm.deceased_name} onChange={(e) => setInheritanceForm({ ...inheritanceForm, deceased_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الوفاة"><TextInput type="date" value={inheritanceForm.death_date} onChange={(e) => setInheritanceForm({ ...inheritanceForm, death_date: e.target.value })} /></Field>
          <Field label="عدد الورثة"><TextInput type="number" value={inheritanceForm.heirs_count} onChange={(e) => setInheritanceForm({ ...inheritanceForm, heirs_count: e.target.value })} /></Field>
        </div>
        <Field label="قيمة التركة الإجمالية"><TextInput type="number" value={inheritanceForm.total_estate_value} onChange={(e) => setInheritanceForm({ ...inheritanceForm, total_estate_value: e.target.value })} /></Field>
        <Field label="وصف التركة"><TextArea value={inheritanceForm.estate_description} onChange={(e) => setInheritanceForm({ ...inheritanceForm, estate_description: e.target.value })} rows={2} /></Field>
        <Field label="الأنصبة (سطر لكل وارث: الاسم: النصيب)"><TextArea value={inheritanceForm.shares_summary} onChange={(e) => setInheritanceForm({ ...inheritanceForm, shares_summary: e.target.value })} rows={4} placeholder={"الزوجة: 1/8\nالابن: الباقي ذكوراً وإناثاً"} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
