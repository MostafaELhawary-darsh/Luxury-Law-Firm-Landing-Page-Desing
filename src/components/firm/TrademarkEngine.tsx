import { useEffect, useState, useCallback } from 'react';
import {
  Award, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Users, Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Scale, Building2, Archive, Send, Eye, Activity, Sparkles, BookOpen,
  TrendingUp, AlertOctagon, ScanLine, Server, Gavel, Copy, AlertCircle,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M11Case, M11SearchResult, M11Opposition, M11Infringement, M11AuditLog,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'cases' | 'search_results' | 'oppositions' | 'infringements' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  search_clearance: { label: 'الفحص والبحث اللفظي', bg: 'bg-blue-50', text: 'text-blue-700' },
  registration_cycle: { label: 'إدارة دورة التسجيل', bg: 'bg-amber-50', text: 'text-amber-700' },
  opposition_monitoring: { label: 'مراقبة الاعتراضات', bg: 'bg-purple-50', text: 'text-purple-700' },
  protection_enforcement: { label: 'الحماية من التقليد', bg: 'bg-red-50', text: 'text-red-700' },
};

const STAGES = ['search_clearance', 'registration_cycle', 'opposition_monitoring', 'protection_enforcement'];

const CATEGORY_LABELS: Record<string, string> = {
  trademark: 'علامة تجارية',
  industrial_design: 'تصميم صناعي',
  infringement: 'تقليد',
  opposition: 'اعتراض',
};

const IP_TYPE_LABELS: Record<string, string> = {
  trademark: 'علامة تجارية',
  industrial_design: 'تصميم صناعي',
};

const APPLICANT_TYPE_LABELS: Record<string, string> = {
  individual: 'فرد',
  company: 'شركة',
  factory: 'مصنع',
  institution: 'مؤسسة',
  government: 'جهة حكومية',
};

const STATUS_PIPELINE: { key: string; label: string }[] = [
  { key: 'searching', label: 'قيد البحث' },
  { key: 'filed', label: 'مُودَع' },
  { key: 'published', label: 'منشور' },
  { key: 'registered', label: 'مُسَجَّل' },
  { key: 'infringed', label: 'مُقَلَّد' },
];

const CONFLICT_RISK_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: 'منخفض', bg: 'bg-green-50', text: 'text-green-600' },
  medium: { label: 'متوسط', bg: 'bg-amber-50', text: 'text-amber-600' },
  high: { label: 'مرتفع', bg: 'bg-red-50', text: 'text-red-600' },
};

const OPPOSITION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'قيد النظر', bg: 'bg-amber-50', text: 'text-amber-600' },
  responded: { label: 'تم الرد', bg: 'bg-blue-50', text: 'text-blue-600' },
  accepted: { label: 'مقبول', bg: 'bg-green-50', text: 'text-green-600' },
  rejected: { label: 'مرفوض', bg: 'bg-red-50', text: 'text-red-600' },
  withdrawn: { label: 'منسحب', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const INFRINGEMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  detected: { label: 'مُكتَشَف', bg: 'bg-red-50', text: 'text-red-600' },
  notice_sent: { label: 'إخطار مُرسَل', bg: 'bg-amber-50', text: 'text-amber-600' },
  legal_action: { label: 'إجراء قانوني', bg: 'bg-purple-50', text: 'text-purple-600' },
  resolved: { label: 'تم الحل', bg: 'bg-green-50', text: 'text-green-600' },
  dismissed: { label: 'مُستبعد', bg: 'bg-gray-100', text: 'text-gray-500' },
};

const INFRINGEMENT_TYPE_LABELS: Record<string, string> = {
  counterfeiting: 'تزوير وتقليد',
  unauthorized_use: 'استخدام غير مصرح',
  passing_off: 'انتحال صفة',
  design_copy: 'نسخ تصميم',
  trademark_dilution: 'تخفيف العلامة',
};

interface CaseForm {
  case_number: string;
  case_title: string;
  case_category: string;
  ip_type: string;
  stage: string;
  trademark_name: string;
  trademark_class: string;
  design_type: string;
  applicant_name: string;
  applicant_type: string;
  registration_number: string;
  filing_date: string;
  deposit_certificate_date: string;
  publication_date: string;
  opposition_deadline: string;
  registration_grant_date: string;
  renewal_date: string;
  status: string;
  financial_value: string;
  filing_fees: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: CaseForm = {
  case_number: '', case_title: '', case_category: 'trademark', ip_type: 'trademark', stage: 'search_clearance',
  trademark_name: '', trademark_class: '', design_type: '', applicant_name: '', applicant_type: 'company',
  registration_number: '', filing_date: '', deposit_certificate_date: '', publication_date: '',
  opposition_deadline: '', registration_grant_date: '', renewal_date: '', status: 'searching',
  financial_value: '0', filing_fees: '0', assigned_advisor_id: '', description: '',
};

export default function TrademarkEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [cases, setCases] = useState<M11Case[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('cases');
  const [selectedCase, setSelectedCase] = useState<M11Case | null>(null);
  const [searchResults, setSearchResults] = useState<M11SearchResult[]>([]);
  const [oppositions, setOppositions] = useState<M11Opposition[]>([]);
  const [infringements, setInfringements] = useState<M11Infringement[]>([]);
  const [auditLogs, setAuditLogs] = useState<M11AuditLog[]>([]);
  const [allSearchResults, setAllSearchResults] = useState<M11SearchResult[]>([]);
  const [allOppositions, setAllOppositions] = useState<M11Opposition[]>([]);
  const [allInfringements, setAllInfringements] = useState<M11Infringement[]>([]);
  const [allAudit, setAllAudit] = useState<M11AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'case' | 'search' | 'opposition' | 'infringement'>('case');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchForm, setSearchForm] = useState({ similar_mark: '', similar_owner: '', similar_class: '', similarity_score: '50', registration_number: '', status: 'registered', conflict_risk: 'low', search_date: '' });
  const [oppositionModalOpen, setOppositionModalOpen] = useState(false);
  const [oppositionForm, setOppositionForm] = useState({ opposer_name: '', opposition_grounds: '', opposition_date: '', response_deadline: '', response_memo: '' });
  const [infringementModalOpen, setInfringementModalOpen] = useState(false);
  const [infringementForm, setInfringementForm] = useState({ infringer_name: '', infringement_type: 'counterfeiting', infringement_details: '', detection_date: '', action_taken: '', case_ref: '', damages_claimed: '0' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [caseRes, attRes, srRes, oppRes, infRes, auditRes] = await Promise.all([
      supabase.from('m11_trademark_cases')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m11_search_results').select('*').order('created_at', { ascending: false }),
      supabase.from('m11_oppositions').select('*').order('created_at', { ascending: false }),
      supabase.from('m11_infringement_cases').select('*').order('created_at', { ascending: false }),
      supabase.from('m11_trademark_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setCases((caseRes.data as M11Case[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllSearchResults((srRes.data as M11SearchResult[]) || []);
    setAllOppositions((oppRes.data as M11Opposition[]) || []);
    setAllInfringements((infRes.data as M11Infringement[]) || []);
    setAllAudit((auditRes.data as M11AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, case_title: cmd.fields.title || '', trademark_name: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (caseId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m11_trademark_audit_logs').insert({
      case_id: caseId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (c: M11Case) => {
    setForm({
      case_number: c.case_number, case_title: c.case_title, case_category: c.case_category,
      ip_type: c.ip_type || 'trademark', stage: c.stage, trademark_name: c.trademark_name || '',
      trademark_class: c.trademark_class || '', design_type: c.design_type || '',
      applicant_name: c.applicant_name || '', applicant_type: c.applicant_type || 'company',
      registration_number: c.registration_number || '', filing_date: c.filing_date || '',
      deposit_certificate_date: c.deposit_certificate_date || '', publication_date: c.publication_date || '',
      opposition_deadline: c.opposition_deadline || '', registration_grant_date: c.registration_grant_date || '',
      renewal_date: c.renewal_date || '', status: c.status || 'searching',
      financial_value: String(c.financial_value || 0), filing_fees: String(c.filing_fees || 0),
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
      ip_type: form.ip_type,
      stage: form.stage,
      trademark_name: form.trademark_name.trim() || null,
      trademark_class: form.trademark_class.trim() || null,
      design_type: form.design_type.trim() || null,
      applicant_name: form.applicant_name.trim() || null,
      applicant_type: form.applicant_type,
      registration_number: form.registration_number.trim() || null,
      filing_date: form.filing_date || null,
      deposit_certificate_date: form.deposit_certificate_date || null,
      publication_date: form.publication_date || null,
      opposition_deadline: form.opposition_deadline || null,
      registration_grant_date: form.registration_grant_date || null,
      renewal_date: form.renewal_date || null,
      status: form.status,
      financial_value: Number(form.financial_value) || 0,
      filing_fees: Number(form.filing_fees) || 0,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m11_trademark_cases').update(payload).eq('id', editingId);
      await logAudit(editingId, 'case_updated', 'تحديث بيانات ملف العلامة التجارية');
    } else {
      const { data } = await supabase.from('m11_trademark_cases').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'case_created', 'إنشاء ملف علامة تجارية — نوع: ' + (IP_TYPE_LABELS[form.ip_type] || form.ip_type));
        await supabase.from('m11_trademark_cases').update({
          m87_industry_linked: true,
          m81_media_linked: true,
          m54_finance_linked: true,
          m92_notified: true,
          m52_notified: true,
          cost_center_id: 'CC-M11-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm87_linked', 'ربط الملف بقطاع الصناعة (M87) — حماية ابتكارات المصانع');
        await logAudit(newId, 'm81_linked', 'ربط الملف بالمحرك الفني (M81) — حماية الحقوق الفكرية');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء ملف العلامة');
        await logAudit(newId, 'm52_notified', 'إخطار البريد السيادي (M52) بالإيداع');
        if (form.filing_date) {
          const oppDeadline = new Date(form.filing_date);
          oppDeadline.setDate(oppDeadline.getDate() + 60);
          await supabase.from('m11_trademark_cases').update({
            opposition_deadline: oppDeadline.toISOString().split('T')[0],
          }).eq('id', newId);
          await logAudit(newId, 'opposition_deadline_calculated', 'حساب ميعاد الاعتراض آلياً — 60 يوم من تاريخ الإيداع');
        }
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'case') await supabase.from('m11_trademark_cases').delete().eq('id', deleteId);
    else if (deleteType === 'search') await supabase.from('m11_search_results').delete().eq('id', deleteId);
    else if (deleteType === 'opposition') await supabase.from('m11_oppositions').delete().eq('id', deleteId);
    else if (deleteType === 'infringement') await supabase.from('m11_infringement_cases').delete().eq('id', deleteId);
    setDeleteId(null);
    if (deleteType === 'case') setSelectedCase(null);
    fetchAll();
    if (selectedCase && deleteType !== 'case') openCaseDetail(selectedCase);
  };

  const openCaseDetail = async (c: M11Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    const [srRes, oppRes, infRes, aRes] = await Promise.all([
      supabase.from('m11_search_results').select('*').eq('case_id', c.id).order('similarity_score', { ascending: false }),
      supabase.from('m11_oppositions').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m11_infringement_cases').select('*').eq('case_id', c.id).order('created_at', { ascending: false }),
      supabase.from('m11_trademark_audit_logs').select('*').eq('case_id', c.id).order('created_at', { ascending: true }),
    ]);
    setSearchResults((srRes.data as M11SearchResult[]) || []);
    setOppositions((oppRes.data as M11Opposition[]) || []);
    setInfringements((infRes.data as M11Infringement[]) || []);
    setAuditLogs((aRes.data as M11AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (c: M11Case) => {
    const idx = STAGES.indexOf(c.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m11_trademark_cases').update({ stage: next }).eq('id', c.id);
    await logAudit(c.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...c, stage: next };
    setSelectedCase(updated as M11Case);
  };

  const addSearchResult = async () => {
    if (!selectedCase || !searchForm.similar_mark.trim()) return;
    await supabase.from('m11_search_results').insert({
      case_id: selectedCase.id,
      similar_mark: searchForm.similar_mark.trim(),
      similar_owner: searchForm.similar_owner.trim() || null,
      similar_class: searchForm.similar_class.trim() || null,
      similarity_score: Number(searchForm.similarity_score) || 0,
      registration_number: searchForm.registration_number.trim() || null,
      status: searchForm.status,
      conflict_risk: searchForm.conflict_risk,
      search_date: searchForm.search_date || new Date().toISOString().split('T')[0],
    });
    await logAudit(selectedCase.id, 'search_result_added', 'إضافة نتيجة بحث لفظي: ' + searchForm.similar_mark + ' — تشابه: ' + searchForm.similarity_score + '%');
    setSearchForm({ similar_mark: '', similar_owner: '', similar_class: '', similarity_score: '50', registration_number: '', status: 'registered', conflict_risk: 'low', search_date: '' });
    setSearchModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const addOpposition = async () => {
    if (!selectedCase || !oppositionForm.opposer_name.trim()) return;
    await supabase.from('m11_oppositions').insert({
      case_id: selectedCase.id,
      opposer_name: oppositionForm.opposer_name.trim(),
      opposition_grounds: oppositionForm.opposition_grounds.trim() || null,
      opposition_date: oppositionForm.opposition_date || null,
      response_deadline: oppositionForm.response_deadline || null,
      response_filed: false,
      response_memo: oppositionForm.response_memo.trim() || null,
      status: 'pending',
    });
    await supabase.from('m11_trademark_cases').update({ is_opposed: true, opposition_details: oppositionForm.opposer_name.trim() }).eq('id', selectedCase.id);
    await logAudit(selectedCase.id, 'opposition_added', 'تسجيل اعتراض من: ' + oppositionForm.opposer_name);
    setOppositionForm({ opposer_name: '', opposition_grounds: '', opposition_date: '', response_deadline: '', response_memo: '' });
    setOppositionModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const fileOppositionResponse = async (o: M11Opposition) => {
    await supabase.from('m11_oppositions').update({
      response_filed: true, status: 'responded',
    }).eq('id', o.id);
    if (selectedCase) await logAudit(selectedCase.id, 'opposition_response_filed', 'تقديم رد على اعتراض: ' + o.opposer_name);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const addInfringement = async () => {
    if (!selectedCase || !infringementForm.infringer_name.trim()) return;
    await supabase.from('m11_infringement_cases').insert({
      case_id: selectedCase.id,
      infringer_name: infringementForm.infringer_name.trim(),
      infringement_type: infringementForm.infringement_type,
      infringement_details: infringementForm.infringement_details.trim() || null,
      detection_date: infringementForm.detection_date || new Date().toISOString().split('T')[0],
      action_taken: infringementForm.action_taken.trim() || null,
      legal_action_filed: false,
      case_ref: infringementForm.case_ref.trim() || null,
      status: 'detected',
      damages_claimed: Number(infringementForm.damages_claimed) || 0,
    });
    await supabase.from('m11_trademark_cases').update({
      infringement_detected: true,
      infringement_details: infringementForm.infringer_name.trim(),
    }).eq('id', selectedCase.id);
    await logAudit(selectedCase.id, 'infringement_added', 'تسجيل حالة تقليد ضد: ' + infringementForm.infringer_name);
    setInfringementForm({ infringer_name: '', infringement_type: 'counterfeiting', infringement_details: '', detection_date: '', action_taken: '', case_ref: '', damages_claimed: '0' });
    setInfringementModalOpen(false);
    openCaseDetail(selectedCase);
  };

  const fileLegalAction = async (inf: M11Infringement) => {
    await supabase.from('m11_infringement_cases').update({
      legal_action_filed: true, status: 'legal_action',
    }).eq('id', inf.id);
    if (selectedCase) await logAudit(selectedCase.id, 'legal_action_filed', 'رفع إجراء قانوني ضد: ' + inf.infringer_name);
    if (selectedCase) openCaseDetail(selectedCase);
  };

  const filteredCases = cases.filter((c) => {
    if (filterCategory !== 'all' && c.case_category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.case_number.toLowerCase().includes(q) && !c.case_title.toLowerCase().includes(q) && !(c.trademark_name || '').toLowerCase().includes(q) && !(c.applicant_name || '').toLowerCase().includes(q) && !(c.registration_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const registeredCases = cases.filter((c) => c.is_registered).length;
  const opposedCases = cases.filter((c) => c.is_opposed).length;
  const infringementCases = cases.filter((c) => c.infringement_detected).length;
  const totalValue = cases.reduce((s, c) => s + (c.financial_value || 0), 0);
  const pendingOpp = allOppositions.filter((o) => o.status === 'pending' && !o.response_filed).length;
  const highRiskSearches = allSearchResults.filter((s) => s.conflict_risk === 'high').length;
  const totalDamages = allInfringements.reduce((s, i) => s + (i.damages_claimed || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Award; badge?: number }[] = [
    { id: 'cases', label: 'ملفات العلامات', icon: Award, badge: cases.length },
    { id: 'search_results', label: 'نتائج البحث اللفظي', icon: Search, badge: highRiskSearches },
    { id: 'oppositions', label: 'الاعتراضات', icon: AlertCircle, badge: pendingOpp },
    { id: 'infringements', label: 'حالات التقليد', icon: AlertOctagon, badge: infringementCases },
    { id: 'audit', label: 'سجل ZK-Audit', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Award size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك العلامات التجارية والتصاميم الصناعية (M11)</h2>
            <p className="font-body text-[10px] text-ink/40">حماية الملكية الفكرية — تسجيل العلامات والتصاميم ومراقبة التقليد</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Server size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">On-Premise · AES-256</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> علامة تجارية
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Award size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(cases.length)} valueClass="text-midnight" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="علامات مُسَجَّلة" value={String(registeredCases)} valueClass="text-green-700" />
        <StatCard icon={<AlertCircle size={14} className="text-amber-600" />} label="اعتراضات نشطة" value={String(opposedCases)} valueClass="text-amber-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="القيمة الإجمالية" value={formatCurrency(totalValue)} valueClass="text-gold" />
        <StatCard icon={<AlertOctagon size={14} className="text-red-600" />} label="حالات تقليد" value={String(infringementCases)} valueClass="text-red-700" />
      </div>

      {/* 4-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة حماية العلامة — 4 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.search_clearance;
            const count = cases.filter((c) => c.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} ملف</span>
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
            { icon: Building2, label: 'قطاع الصناعة (M87)', desc: 'حماية ابتكارات المصانع', color: 'text-blue-600' },
            { icon: Sparkles, label: 'المحرك الفني (M81)', desc: 'حماية الحقوق الفكرية', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'رسوم الإيداع والتسجيل', color: 'text-gold' },
            { icon: CircuitBoard, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات المواعيد', color: 'text-amber-600' },
            { icon: Send, label: 'البريد السيادي (M52)', desc: 'إخطار المُودِع', color: 'text-green-600' },
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
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو علامة أو مودع..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Cases tab */}
      {activeTab === 'cases' && (
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Award size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات علامات تجارية</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const sCfg = STAGE_CONFIG[c.stage] || STAGE_CONFIG.search_clearance;
              const stageIdx = STAGES.indexOf(c.stage);
              const statusIdx = STATUS_PIPELINE.findIndex((s) => s.key === c.status);
              return (
                <div key={c.id} onClick={() => openCaseDetail(c)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        {c.ip_type === 'industrial_design' ? <FileText size={14} className={sCfg.text} /> : <Award size={14} className={sCfg.text} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{c.case_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{IP_TYPE_LABELS[c.ip_type] || c.ip_type}</span>
                          {c.is_registered && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> مُسَجَّل</span>}
                          {c.is_opposed && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><AlertCircle size={8} /> معترض</span>}
                          {c.infringement_detected && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-red-50 text-red-600"><AlertOctagon size={8} /> مُقَلَّد</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{c.case_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {c.trademark_name && <span className="font-body text-[9px] text-ink/40"><Award size={9} className="inline ml-0.5" />{c.trademark_name}</span>}
                          {c.trademark_class && <span className="font-body text-[9px] text-ink/40">الطبقة: {c.trademark_class}</span>}
                          {c.registration_number && <span className="font-body text-[9px] text-blue-600 font-bold">رقم التسجيل: {c.registration_number}</span>}
                          {c.applicant_name && <span className="font-body text-[9px] text-ink/40">{c.applicant_name}</span>}
                          {c.financial_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.financial_value)}</span>}
                          {c.opposition_deadline && (
                            <OppositionCountdown deadline={c.opposition_deadline} />
                          )}
                          {c.m87_industry_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Building2 size={8} /> M87</span>}
                          {c.m81_media_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Sparkles size={8} /> M81</span>}
                          {c.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {c.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M92</span>}
                          {c.m52_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Send size={8} /> M52</span>}
                        </div>
                        {/* Status pipeline mini */}
                        <div className="flex items-center gap-0.5 mt-2">
                          {STATUS_PIPELINE.map((s, i) => (
                            <span key={s.key} className={`px-1.5 py-0.5 rounded text-[8px] font-body ${i <= statusIdx && statusIdx >= 0 ? 'bg-gold/10 text-gold font-bold' : 'bg-gray-100 text-ink/30'}`}>{s.label}</span>
                          ))}
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

      {/* All search results tab */}
      {activeTab === 'search_results' && (
        <div className="space-y-2">
          {allSearchResults.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><Search size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد نتائج بحث لفظي</p></div>
          ) : (
            allSearchResults.map((s) => {
              const cfg = CONFLICT_RISK_CONFIG[s.conflict_risk] || CONFLICT_RISK_CONFIG.low;
              const c = cases.find((c) => c.id === s.case_id);
              return (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Search size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>خطر {cfg.label}</span>
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                          {s.similar_class && <span className="font-body text-[9px] text-ink/40">الطبقة: {s.similar_class}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{s.similar_mark}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {s.similar_owner && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{s.similar_owner}</span>}
                          {s.registration_number && <span className="font-body text-[9px] text-blue-600">رقم: {s.registration_number}</span>}
                          <span className="font-body text-[9px] text-ink/50">الحالة: {s.status}</span>
                          {s.search_date && <span className="font-body text-[9px] text-ink/30">{formatDate(s.search_date)}</span>}
                        </div>
                        {/* Similarity score bar */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-body text-[9px] text-ink/40">نسبة التشابه</span>
                          <div className="flex-1 max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.similarity_score > 70 ? 'bg-red-500' : s.similarity_score > 40 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${s.similarity_score}%` }} />
                          </div>
                          <span className={`font-body text-[9px] font-bold ${s.similarity_score > 70 ? 'text-red-600' : s.similarity_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>{s.similarity_score}%</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(s.id); setDeleteType('search'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All oppositions tab */}
      {activeTab === 'oppositions' && (
        <div className="space-y-2">
          {allOppositions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><AlertCircle size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد اعتراضات مسجلة</p></div>
          ) : (
            allOppositions.map((o) => {
              const cfg = OPPOSITION_STATUS_CONFIG[o.status] || OPPOSITION_STATUS_CONFIG.pending;
              const c = cases.find((c) => c.id === o.case_id);
              return (
                <div key={o.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <AlertCircle size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {o.response_filed ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> تم الرد</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Clock size={8} /> بانتظار الرد</span>
                          )}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{o.opposer_name}</p>
                        {o.opposition_grounds && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{o.opposition_grounds}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {o.opposition_date && <span className="font-body text-[9px] text-ink/40">تاريخ الاعتراض: {formatDate(o.opposition_date)}</span>}
                          {o.response_deadline && (
                            <OppositionCountdown deadline={o.response_deadline} label="ميعاد الرد" />
                          )}
                          {o.outcome && <span className="font-body text-[9px] text-ink/50">النتيجة: {o.outcome}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(o.id); setDeleteType('opposition'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* All infringements tab */}
      {activeTab === 'infringements' && (
        <div className="space-y-2">
          {allInfringements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200"><AlertOctagon size={28} className="text-ink/15 mx-auto mb-2" /><p className="font-body text-xs text-ink/30">لا توجد حالات تقليد مسجلة</p></div>
          ) : (
            allInfringements.map((inf) => {
              const cfg = INFRINGEMENT_STATUS_CONFIG[inf.status] || INFRINGEMENT_STATUS_CONFIG.detected;
              const c = cases.find((c) => c.id === inf.case_id);
              return (
                <div key={inf.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <AlertOctagon size={14} className={cfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                          {inf.legal_action_filed ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Gavel size={8} /> إجراء قانوني</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><Clock size={8} /> بدون إجراء</span>
                          )}
                          {c && <span className="font-body text-[9px] text-gold">{c.case_number}</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{inf.infringer_name}</p>
                        {inf.infringement_details && <p className="font-body text-[10px] text-ink/50 mt-1 leading-relaxed line-clamp-2">{inf.infringement_details}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {inf.infringement_type && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INFRINGEMENT_TYPE_LABELS[inf.infringement_type] || inf.infringement_type}</span>}
                          {inf.detection_date && <span className="font-body text-[9px] text-ink/40">تاريخ الاكتشاف: {formatDate(inf.detection_date)}</span>}
                          {inf.case_ref && <span className="font-body text-[9px] text-blue-600">مرجع القضية: {inf.case_ref}</span>}
                          {inf.damages_claimed > 0 && <span className="flex items-center gap-0.5 font-body text-[9px] text-red-600 font-bold"><DollarSign size={9} /> تعويضات: {formatCurrency(inf.damages_claimed)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setDeleteId(inf.id); setDeleteType('infringement'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
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
                      : log.action.includes('m87') ? <Building2 size={12} className="text-blue-600" />
                      : log.action.includes('m81') ? <Sparkles size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('m52') ? <Send size={12} className="text-green-600" />
                      : log.action.includes('search') ? <Search size={12} className="text-blue-600" />
                      : log.action.includes('opposition') ? <AlertCircle size={12} className="text-amber-600" />
                      : log.action.includes('infringement') ? <AlertOctagon size={12} className="text-red-600" />
                      : log.action.includes('legal') ? <Gavel size={12} className="text-purple-600" />
                      : log.action.includes('deadline') ? <Calendar size={12} className="text-amber-600" />
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

      {/* Case detail drawer */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedCase(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">ملف العلامة التجارية</span>
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.search_clearance).bg} ${(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.search_clearance).text}`}>
                      {(STAGE_CONFIG[selectedCase.stage] || STAGE_CONFIG.search_clearance).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{IP_TYPE_LABELS[selectedCase.ip_type] || selectedCase.ip_type}</span>
                    {selectedCase.is_registered && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600"><BadgeCheck size={10} /> مُسَجَّل</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedCase.case_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.search_clearance;
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

                {/* Trademark info prominent */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Award size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات العلامة / التصميم</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">اسم العلامة</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.trademark_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الطبقة</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.trademark_class || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رقم التسجيل</span><p className="font-body text-xs font-bold text-blue-600">{selectedCase.registration_number || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع التصميم</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.design_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">اسم المُودِع</span><p className="font-body text-xs font-bold text-midnight">{selectedCase.applicant_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المُودِع</span><p className="font-body text-xs font-bold text-midnight">{APPLICANT_TYPE_LABELS[selectedCase.applicant_type] || selectedCase.applicant_type}</p></div>
                  </div>
                </div>

                {/* Status pipeline */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CircuitBoard size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">خط حالة التسجيل</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {STATUS_PIPELINE.map((s, i) => {
                      const statusIdx = STATUS_PIPELINE.findIndex((sp) => sp.key === selectedCase.status);
                      const reached = i <= statusIdx && statusIdx >= 0;
                      const isCurrent = i === statusIdx;
                      return (
                        <div key={s.key} className="flex-1 text-center">
                          <div className={`h-7 rounded-lg flex items-center justify-center text-[9px] font-body font-bold ${isCurrent ? 'bg-gold text-midnight' : reached ? 'bg-gold/10 text-gold' : 'bg-gray-100 text-ink/30'}`}>
                            {s.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key dates */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">المواعيد الرئيسية</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ الإيداع</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.filing_date ? formatDate(selectedCase.filing_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">شهادة الإيداع</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.deposit_certificate_date ? formatDate(selectedCase.deposit_certificate_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ النشر</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.publication_date ? formatDate(selectedCase.publication_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">ميعاد الاعتراض</span>
                      <p className="font-body text-xs font-bold text-amber-600">{selectedCase.opposition_deadline ? formatDate(selectedCase.opposition_deadline) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ التسجيل</span>
                      <p className="font-body text-xs font-bold text-green-600">{selectedCase.registration_grant_date ? formatDate(selectedCase.registration_grant_date) : '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">تاريخ التجديد</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedCase.renewal_date ? formatDate(selectedCase.renewal_date) : '—'}</p>
                    </div>
                  </div>
                  {selectedCase.opposition_deadline && (
                    <div className="mt-2">
                      <OppositionCountdown deadline={selectedCase.opposition_deadline} full />
                    </div>
                  )}
                </div>

                {/* Opposition / Infringement badges */}
                {(selectedCase.is_opposed || selectedCase.infringement_detected) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCase.is_opposed && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                        <AlertCircle size={14} className="text-amber-600" />
                        <div>
                          <p className="font-body text-[10px] font-bold text-amber-700">معترض عليها</p>
                          {selectedCase.opposition_details && <p className="font-body text-[9px] text-amber-600">{selectedCase.opposition_details}</p>}
                        </div>
                      </div>
                    )}
                    {selectedCase.infringement_detected && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
                        <AlertOctagon size={14} className="text-red-600" />
                        <div>
                          <p className="font-body text-[10px] font-bold text-red-700">تم اكتشاف تقليد</p>
                          {selectedCase.infringement_details && <p className="font-body text-[9px] text-red-600">{selectedCase.infringement_details}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedCase.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">القيمة</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.financial_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رسوم الإيداع</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedCase.filing_fees)}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m87_industry_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Building2 size={10} /> M87 {selectedCase.m87_industry_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m81_media_linked ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><Sparkles size={10} /> M81 {selectedCase.m81_media_linked ? 'مرتبط' : 'غير مرتبط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedCase.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M92 {selectedCase.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedCase.m52_notified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Send size={10} /> M52 {selectedCase.m52_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedCase.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedCase.description}</p></div>
                )}

                {/* Search results */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><Search size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">نتائج البحث اللفظي</span></div>
                    <button onClick={() => setSearchModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة نتيجة</button>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.map((s) => {
                      const cfg = CONFLICT_RISK_CONFIG[s.conflict_risk] || CONFLICT_RISK_CONFIG.low;
                      return (
                        <div key={s.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/sr">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>خطر {cfg.label}</span>
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{s.similar_mark}</p>
                            <span className={`font-body text-[9px] font-bold ${s.similarity_score > 70 ? 'text-red-600' : s.similarity_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>{s.similarity_score}%</span>
                            <button onClick={() => { setDeleteId(s.id); setDeleteType('search'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/sr:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {s.similar_owner && <span className="font-body text-[9px] text-ink/40">{s.similar_owner}</span>}
                            {s.similar_class && <span className="font-body text-[9px] text-ink/40">طبقة: {s.similar_class}</span>}
                            {s.registration_number && <span className="font-body text-[9px] text-blue-600">{s.registration_number}</span>}
                            <span className="font-body text-[9px] text-ink/30">{s.status}</span>
                          </div>
                        </div>
                      );
                    })}
                    {searchResults.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد نتائج بحث مسجلة</p>}
                  </div>
                </div>

                {/* Oppositions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><AlertCircle size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">الاعتراضات</span></div>
                    <button onClick={() => setOppositionModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة اعتراض</button>
                  </div>
                  <div className="space-y-1.5">
                    {oppositions.map((o) => {
                      const cfg = OPPOSITION_STATUS_CONFIG[o.status] || OPPOSITION_STATUS_CONFIG.pending;
                      return (
                        <div key={o.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/opp">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{o.opposer_name}</p>
                            <button onClick={() => { setDeleteId(o.id); setDeleteType('opposition'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/opp:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          {o.opposition_grounds && <p className="font-body text-[9px] text-ink/50 leading-tight mb-1">{o.opposition_grounds}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {o.opposition_date && <span className="font-body text-[9px] text-ink/40">{formatDate(o.opposition_date)}</span>}
                            {o.response_deadline && <span className="font-body text-[9px] text-amber-600">ميعاد الرد: {formatDate(o.response_deadline)}</span>}
                            {o.response_filed ? (
                              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> تم الرد</span>
                            ) : (
                              <button onClick={() => fileOppositionResponse(o)} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-600 text-white hover:bg-amber-700 transition-colors"><Send size={8} /> تقديم رد</button>
                            )}
                            {o.outcome && <span className="font-body text-[9px] text-ink/50">النتيجة: {o.outcome}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {oppositions.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد اعتراضات مسجلة</p>}
                  </div>
                </div>

                {/* Infringements */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5"><AlertOctagon size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">حالات التقليد</span></div>
                    <button onClick={() => setInfringementModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors"><Plus size={10} /> إضافة حالة</button>
                  </div>
                  <div className="space-y-1.5">
                    {infringements.map((inf) => {
                      const cfg = INFRINGEMENT_STATUS_CONFIG[inf.status] || INFRINGEMENT_STATUS_CONFIG.detected;
                      return (
                        <div key={inf.id} className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 group/inf">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                            <p className="font-body text-[10px] font-bold text-midnight flex-1">{inf.infringer_name}</p>
                            <button onClick={() => { setDeleteId(inf.id); setDeleteType('infringement'); }} className="p-1 rounded text-ink/30 hover:text-red-500 opacity-0 group-hover/inf:opacity-100 transition-all"><Trash2 size={10} /></button>
                          </div>
                          {inf.infringement_details && <p className="font-body text-[9px] text-ink/50 leading-tight mb-1">{inf.infringement_details}</p>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {inf.infringement_type && <span className="px-1 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{INFRINGEMENT_TYPE_LABELS[inf.infringement_type] || inf.infringement_type}</span>}
                            {inf.detection_date && <span className="font-body text-[9px] text-ink/40">{formatDate(inf.detection_date)}</span>}
                            {inf.damages_claimed > 0 && <span className="font-body text-[9px] text-red-600 font-bold">تعويضات: {formatCurrency(inf.damages_claimed)}</span>}
                            {inf.legal_action_filed ? (
                              <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><Gavel size={8} /> إجراء قانوني</span>
                            ) : (
                              <button onClick={() => fileLegalAction(inf)} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-600 text-white hover:bg-purple-700 transition-colors"><Gavel size={8} /> رفع إجراء</button>
                            )}
                            {inf.case_ref && <span className="font-body text-[9px] text-blue-600">{inf.case_ref}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {infringements.length === 0 && <p className="font-body text-[10px] text-ink/30">لا توجد حالات تقليد مسجلة</p>}
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
      <EntityModal open={modalOpen} title={editingId ? 'تعديل ملف العلامة' : 'علامة تجارية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الملف" required><TextInput value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} placeholder="TM-2025-001" /></Field>
          <Field label="نوع الملكية الفكرية">
            <Select value={form.ip_type} onChange={(e) => setForm({ ...form, ip_type: e.target.value, case_category: e.target.value })}>
              {Object.entries(IP_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الملف" required><TextInput value={form.case_title} onChange={(e) => setForm({ ...form, case_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الفئة">
            <Select value={form.case_category} onChange={(e) => setForm({ ...form, case_category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم العلامة / التصميم"><TextInput value={form.trademark_name} onChange={(e) => setForm({ ...form, trademark_name: e.target.value })} /></Field>
          <Field label="الطبقة (Nice)"><TextInput value={form.trademark_class} onChange={(e) => setForm({ ...form, trademark_class: e.target.value })} placeholder="مثال: 35" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المُودِع"><TextInput value={form.applicant_name} onChange={(e) => setForm({ ...form, applicant_name: e.target.value })} /></Field>
          <Field label="نوع المُودِع">
            <Select value={form.applicant_type} onChange={(e) => setForm({ ...form, applicant_type: e.target.value })}>
              {Object.entries(APPLICANT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم التسجيل"><TextInput value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} /></Field>
          <Field label="نوع التصميم (للتصاميم الصناعية)"><TextInput value={form.design_type} onChange={(e) => setForm({ ...form, design_type: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الإيداع"><TextInput type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} /></Field>
          <Field label="تاريخ شهادة الإيداع"><TextInput type="date" value={form.deposit_certificate_date} onChange={(e) => setForm({ ...form, deposit_certificate_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ النشر"><TextInput type="date" value={form.publication_date} onChange={(e) => setForm({ ...form, publication_date: e.target.value })} /></Field>
          <Field label="ميعاد الاعتراض"><TextInput type="date" value={form.opposition_deadline} onChange={(e) => setForm({ ...form, opposition_deadline: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ منح التسجيل"><TextInput type="date" value={form.registration_grant_date} onChange={(e) => setForm({ ...form, registration_grant_date: e.target.value })} /></Field>
          <Field label="تاريخ التجديد"><TextInput type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الحالة">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_PIPELINE.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="المستشار المسؤول">
            <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
              <option value="">— اختر —</option>
              {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القيمة المالية"><TextInput type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></Field>
          <Field label="رسوم الإيداع"><TextInput type="number" value={form.filing_fees} onChange={(e) => setForm({ ...form, filing_fees: e.target.value })} /></Field>
        </div>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* Search result modal */}
      <EntityModal open={searchModalOpen} title="إضافة نتيجة بحث لفظي" onClose={() => setSearchModalOpen(false)} onSubmit={addSearchResult}>
        <Field label="العلامة المشابهة" required><TextInput value={searchForm.similar_mark} onChange={(e) => setSearchForm({ ...searchForm, similar_mark: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المالك"><TextInput value={searchForm.similar_owner} onChange={(e) => setSearchForm({ ...searchForm, similar_owner: e.target.value })} /></Field>
          <Field label="الطبقة"><TextInput value={searchForm.similar_class} onChange={(e) => setSearchForm({ ...searchForm, similar_class: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم التسجيل"><TextInput value={searchForm.registration_number} onChange={(e) => setSearchForm({ ...searchForm, registration_number: e.target.value })} /></Field>
          <Field label="نسبة التشابه %"><TextInput type="number" value={searchForm.similarity_score} onChange={(e) => setSearchForm({ ...searchForm, similarity_score: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="درجة الخطر">
            <Select value={searchForm.conflict_risk} onChange={(e) => setSearchForm({ ...searchForm, conflict_risk: e.target.value })}>
              <option value="low">منخفض</option>
              <option value="medium">متوسط</option>
              <option value="high">مرتفع</option>
            </Select>
          </Field>
          <Field label="حالة العلامة">
            <Select value={searchForm.status} onChange={(e) => setSearchForm({ ...searchForm, status: e.target.value })}>
              <option value="registered">مُسَجَّلة</option>
              <option value="pending">قيد النظر</option>
              <option value="opposed">معترض عليها</option>
              <option value="expired">منتهية</option>
              <option value="refused">مرفوضة</option>
            </Select>
          </Field>
        </div>
        <Field label="تاريخ البحث"><TextInput type="date" value={searchForm.search_date} onChange={(e) => setSearchForm({ ...searchForm, search_date: e.target.value })} /></Field>
      </EntityModal>

      {/* Opposition modal */}
      <EntityModal open={oppositionModalOpen} title="تسجيل اعتراض" onClose={() => setOppositionModalOpen(false)} onSubmit={addOpposition}>
        <Field label="اسم المُعترِض" required><TextInput value={oppositionForm.opposer_name} onChange={(e) => setOppositionForm({ ...oppositionForm, opposer_name: e.target.value })} /></Field>
        <Field label="أسباب الاعتراض"><TextArea value={oppositionForm.opposition_grounds} onChange={(e) => setOppositionForm({ ...oppositionForm, opposition_grounds: e.target.value })} rows={3} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="تاريخ الاعتراض"><TextInput type="date" value={oppositionForm.opposition_date} onChange={(e) => setOppositionForm({ ...oppositionForm, opposition_date: e.target.value })} /></Field>
          <Field label="ميعاد الرد"><TextInput type="date" value={oppositionForm.response_deadline} onChange={(e) => setOppositionForm({ ...oppositionForm, response_deadline: e.target.value })} /></Field>
        </div>
        <Field label="مذكرة الرد"><TextArea value={oppositionForm.response_memo} onChange={(e) => setOppositionForm({ ...oppositionForm, response_memo: e.target.value })} rows={3} /></Field>
      </EntityModal>

      {/* Infringement modal */}
      <EntityModal open={infringementModalOpen} title="تسجيل حالة تقليد" onClose={() => setInfringementModalOpen(false)} onSubmit={addInfringement}>
        <Field label="اسم المُقَلِّد" required><TextInput value={infringementForm.infringer_name} onChange={(e) => setInfringementForm({ ...infringementForm, infringer_name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع التقليد">
            <Select value={infringementForm.infringement_type} onChange={(e) => setInfringementForm({ ...infringementForm, infringement_type: e.target.value })}>
              {Object.entries(INFRINGEMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="تاريخ الاكتشاف"><TextInput type="date" value={infringementForm.detection_date} onChange={(e) => setInfringementForm({ ...infringementForm, detection_date: e.target.value })} /></Field>
        </div>
        <Field label="تفاصيل التقليد"><TextArea value={infringementForm.infringement_details} onChange={(e) => setInfringementForm({ ...infringementForm, infringement_details: e.target.value })} rows={3} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الإجراء المتخذ"><TextInput value={infringementForm.action_taken} onChange={(e) => setInfringementForm({ ...infringementForm, action_taken: e.target.value })} /></Field>
          <Field label="مرجع القضية"><TextInput value={infringementForm.case_ref} onChange={(e) => setInfringementForm({ ...infringementForm, case_ref: e.target.value })} /></Field>
        </div>
        <Field label="التعويضات المطلوبة"><TextInput type="number" value={infringementForm.damages_claimed} onChange={(e) => setInfringementForm({ ...infringementForm, damages_claimed: e.target.value })} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

/* Opposition deadline countdown helper component */
function OppositionCountdown({ deadline, label, full }: { deadline: string; label?: string; full?: boolean }) {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 7 && daysLeft >= 0;
  const isNear = daysLeft <= 30 && daysLeft > 7;
  const isPast = daysLeft < 0;
  const colorClass = isPast ? 'text-red-600' : isUrgent ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-green-600';
  const bgClass = isPast ? 'bg-red-50' : isUrgent ? 'bg-red-50' : isNear ? 'bg-amber-50' : 'bg-green-50';
  const text = isPast ? 'متأخر' : daysLeft > 0 ? daysLeft + ' يوم' : 'اليوم';
  return (
    <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${bgClass} ${colorClass}`}>
      <Clock size={9} /> {label || 'ميعاد الاعتراض'}: {text}
      {full && deadline && <span className="font-normal mr-1">({formatDate(deadline)})</span>}
    </span>
  );
}
