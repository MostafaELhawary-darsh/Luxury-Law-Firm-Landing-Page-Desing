import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Users, Briefcase,
  Award, Receipt, Handshake, Calendar, DollarSign, Building2, Phone, Mail,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

/* ─────────────────────────────── Types ─────────────────────────────── */

interface FreeProfessional {
  id: string;
  name: string;
  profession_type: string;
  license_number: string | null;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  active: boolean | null;
  notes: string | null;
  created_at: string;
}

interface ProfessionalLicense {
  id: string;
  professional_id: string | null;
  license_type: string;
  license_number: string;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  renewal_required: boolean | null;
  status: string;
  conditions: string | null;
  created_at: string;
}

interface ProfessionalTaxFile {
  id: string;
  professional_id: string | null;
  tax_year: string | null;
  tax_type: string;
  filing_number: string | null;
  filing_date: string | null;
  declared_amount: number | null;
  assessed_amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface ProfessionalEngagement {
  id: string;
  professional_id: string | null;
  engagement_type: string;
  counterparty: string;
  start_date: string | null;
  end_date: string | null;
  value: number | null;
  description: string | null;
  status: string;
  created_at: string;
}

type Tab = 'professionals' | 'licenses' | 'tax_files' | 'engagements';

/* ─────────────────────────────── Label Maps ─────────────────────────────── */

const PROFESSION_TYPE_LABELS: Record<string, string> = {
  doctor: 'طبيب',
  engineer: 'مهندس',
  accountant: 'محاسب',
  consultant: 'مستشار',
  architect: 'مهندس معماري',
  notary: 'كاتب عدل',
};

const LICENSE_TYPE_LABELS: Record<string, string> = {
  practice: 'مزاولة',
  establishment: 'منشأة',
  branch: 'فرع',
};

const LICENSE_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'نشط', bg: 'bg-green-50', text: 'text-green-700' },
  expired: { label: 'منتهٍ', bg: 'bg-red-50', text: 'text-red-700' },
  suspended: { label: 'مُعلَّق', bg: 'bg-amber-50', text: 'text-amber-700' },
  revoked: { label: 'مُلغى', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const TAX_TYPE_LABELS: Record<string, string> = {
  income: 'دخل',
  vat: 'ضريبة القيمة المضافة',
  withholding: 'خصم تحت حساب',
  payroll: 'رواتب',
};

const TAX_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  filed: { label: 'مُقدَّم', bg: 'bg-blue-50', text: 'text-blue-700' },
  under_review: { label: 'قيد المراجعة', bg: 'bg-amber-50', text: 'text-amber-700' },
  assessed: { label: 'مُقيَّم', bg: 'bg-green-50', text: 'text-green-700' },
  disputed: { label: 'مُختلف عليه', bg: 'bg-red-50', text: 'text-red-700' },
};

const ENGAGEMENT_TYPE_LABELS: Record<string, string> = {
  consultation: 'استشارة',
  contract: 'عقد',
  retainer: 'احتجاز',
  partnership: 'شراكة',
};

const ENGAGEMENT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'نشط', bg: 'bg-green-50', text: 'text-green-700' },
  completed: { label: 'مكتمل', bg: 'bg-blue-50', text: 'text-blue-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-gray-100', text: 'text-gray-700' },
  pending: { label: 'قيد الانتظار', bg: 'bg-amber-50', text: 'text-amber-700' },
};

/* ─────────────────────────────── Forms ─────────────────────────────── */

interface ProfessionalForm {
  name: string;
  profession_type: string;
  license_number: string;
  national_id: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  active: boolean;
  notes: string;
}

const emptyProfessional: ProfessionalForm = {
  name: '', profession_type: 'doctor', license_number: '', national_id: '',
  phone: '', email: '', address: '', tax_id: '', active: true, notes: '',
};

interface LicenseForm {
  professional_id: string;
  license_type: string;
  license_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  renewal_required: boolean;
  status: string;
  conditions: string;
}

const emptyLicense: LicenseForm = {
  professional_id: '', license_type: 'practice', license_number: '',
  issuing_authority: '', issue_date: '', expiry_date: '', renewal_required: false,
  status: 'active', conditions: '',
};

interface TaxFileForm {
  professional_id: string;
  tax_year: string;
  tax_type: string;
  filing_number: string;
  filing_date: string;
  declared_amount: string;
  assessed_amount: string;
  status: string;
  notes: string;
}

const emptyTaxFile: TaxFileForm = {
  professional_id: '', tax_year: '', tax_type: 'income', filing_number: '',
  filing_date: '', declared_amount: '0', assessed_amount: '0', status: 'filed',
  notes: '',
};

interface EngagementForm {
  professional_id: string;
  engagement_type: string;
  counterparty: string;
  start_date: string;
  end_date: string;
  value: string;
  description: string;
  status: string;
}

const emptyEngagement: EngagementForm = {
  professional_id: '', engagement_type: 'consultation', counterparty: '',
  start_date: '', end_date: '', value: '0', description: '', status: 'active',
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function FreeProfessionsEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [professionals, setProfessionals] = useState<FreeProfessional[]>([]);
  const [licenses, setLicenses] = useState<ProfessionalLicense[]>([]);
  const [taxFiles, setTaxFiles] = useState<ProfessionalTaxFile[]>([]);
  const [engagements, setEngagements] = useState<ProfessionalEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('professionals');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [profForm, setProfForm] = useState<ProfessionalForm>(emptyProfessional);
  const [licenseForm, setLicenseForm] = useState<LicenseForm>(emptyLicense);
  const [taxForm, setTaxForm] = useState<TaxFileForm>(emptyTaxFile);
  const [engagementForm, setEngagementForm] = useState<EngagementForm>(emptyEngagement);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [profRes, licRes, taxRes, engRes] = await Promise.all([
      supabase.from('m58_free_professionals').select('*').order('created_at', { ascending: false }),
      supabase.from('m58_professional_licenses').select('*').order('created_at', { ascending: false }),
      supabase.from('m58_professional_tax_files').select('*').order('created_at', { ascending: false }),
      supabase.from('m58_professional_engagements').select('*').order('created_at', { ascending: false }),
    ]);
    setProfessionals((profRes.data as FreeProfessional[]) || []);
    setLicenses((licRes.data as ProfessionalLicense[]) || []);
    setTaxFiles((taxRes.data as ProfessionalTaxFile[]) || []);
    setEngagements((engRes.data as ProfessionalEngagement[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (activeTab === 'professionals') setProfForm({ ...emptyProfessional, name: cmd.fields.title || '' });
      if (activeTab === 'licenses') setLicenseForm({ ...emptyLicense, license_number: cmd.fields.title || '' });
      if (activeTab === 'tax_files') setTaxForm({ ...emptyTaxFile, filing_number: cmd.fields.title || '' });
      if (activeTab === 'engagements') setEngagementForm({ ...emptyEngagement, counterparty: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const profName = (id: string | null) => professionals.find((p) => p.id === id)?.name || '—';

  const openAdd = () => {
    if (activeTab === 'professionals') setProfForm(emptyProfessional);
    if (activeTab === 'licenses') setLicenseForm(emptyLicense);
    if (activeTab === 'tax_files') setTaxForm(emptyTaxFile);
    if (activeTab === 'engagements') setEngagementForm(emptyEngagement);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (activeTab === 'professionals') {
      if (!profForm.name.trim()) { setSaving(false); return; }
      const payload = {
        name: profForm.name.trim(),
        profession_type: profForm.profession_type,
        license_number: profForm.license_number.trim() || null,
        national_id: profForm.national_id.trim() || null,
        phone: profForm.phone.trim() || null,
        email: profForm.email.trim() || null,
        address: profForm.address.trim() || null,
        tax_id: profForm.tax_id.trim() || null,
        active: profForm.active,
        notes: profForm.notes.trim() || null,
      };
      if (editingId) await supabase.from('m58_free_professionals').update(payload).eq('id', editingId);
      else await supabase.from('m58_free_professionals').insert(payload);
    } else if (activeTab === 'licenses') {
      if (!licenseForm.license_number.trim()) { setSaving(false); return; }
      const payload = {
        professional_id: licenseForm.professional_id || null,
        license_type: licenseForm.license_type,
        license_number: licenseForm.license_number.trim(),
        issuing_authority: licenseForm.issuing_authority.trim() || null,
        issue_date: licenseForm.issue_date || null,
        expiry_date: licenseForm.expiry_date || null,
        renewal_required: licenseForm.renewal_required,
        status: licenseForm.status,
        conditions: licenseForm.conditions.trim() || null,
      };
      if (editingId) await supabase.from('m58_professional_licenses').update(payload).eq('id', editingId);
      else await supabase.from('m58_professional_licenses').insert(payload);
    } else if (activeTab === 'tax_files') {
      if (!taxForm.tax_year.trim()) { setSaving(false); return; }
      const payload = {
        professional_id: taxForm.professional_id || null,
        tax_year: taxForm.tax_year.trim(),
        tax_type: taxForm.tax_type,
        filing_number: taxForm.filing_number.trim() || null,
        filing_date: taxForm.filing_date || null,
        declared_amount: Number(taxForm.declared_amount) || 0,
        assessed_amount: Number(taxForm.assessed_amount) || 0,
        status: taxForm.status,
        notes: taxForm.notes.trim() || null,
      };
      if (editingId) await supabase.from('m58_professional_tax_files').update(payload).eq('id', editingId);
      else await supabase.from('m58_professional_tax_files').insert(payload);
    } else if (activeTab === 'engagements') {
      if (!engagementForm.counterparty.trim()) { setSaving(false); return; }
      const payload = {
        professional_id: engagementForm.professional_id || null,
        engagement_type: engagementForm.engagement_type,
        counterparty: engagementForm.counterparty.trim(),
        start_date: engagementForm.start_date || null,
        end_date: engagementForm.end_date || null,
        value: Number(engagementForm.value) || 0,
        description: engagementForm.description.trim() || null,
        status: engagementForm.status,
      };
      if (editingId) await supabase.from('m58_professional_engagements').update(payload).eq('id', editingId);
      else await supabase.from('m58_professional_engagements').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (activeTab === 'professionals') await supabase.from('m58_free_professionals').delete().eq('id', deleteId);
    if (activeTab === 'licenses') await supabase.from('m58_professional_licenses').delete().eq('id', deleteId);
    if (activeTab === 'tax_files') await supabase.from('m58_professional_tax_files').delete().eq('id', deleteId);
    if (activeTab === 'engagements') await supabase.from('m58_professional_engagements').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  /* ── Filters ── */

  const filteredProfessionals = professionals.filter((p) => {
    if (filterType !== 'all' && p.profession_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.license_number || '').toLowerCase().includes(q) && !(p.tax_id || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredLicenses = licenses.filter((l) => {
    if (filterType !== 'all' && l.license_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!l.license_number.toLowerCase().includes(q) && !(l.issuing_authority || '').toLowerCase().includes(q) && profName(l.professional_id).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredTaxFiles = taxFiles.filter((t) => {
    if (filterType !== 'all' && t.tax_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(t.filing_number || '').toLowerCase().includes(q) && !(t.tax_year || '').toLowerCase().includes(q) && profName(t.professional_id).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredEngagements = engagements.filter((e) => {
    if (filterType !== 'all' && e.engagement_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.counterparty.toLowerCase().includes(q) && profName(e.professional_id).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeProfessionals = professionals.filter((p) => p.active).length;
  const activeLicenses = licenses.filter((l) => l.status === 'active').length;
  const expiringLicenses = licenses.filter((l) => l.renewal_required).length;
  const totalDeclared = taxFiles.reduce((s, t) => s + (t.declared_amount || 0), 0);
  const totalAssessed = taxFiles.reduce((s, t) => s + (t.assessed_amount || 0), 0);
  const activeEngagements = engagements.filter((e) => e.status === 'active').length;
  const totalEngagementValue = engagements.reduce((s, e) => s + (e.value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Briefcase; badge?: number }[] = [
    { id: 'professionals', label: 'المحترفون', icon: Briefcase, badge: professionals.length },
    { id: 'licenses', label: 'التراخيص', icon: Award, badge: licenses.length },
    { id: 'tax_files', label: 'الملفات الضريبية', icon: Receipt, badge: taxFiles.length },
    { id: 'engagements', label: 'التعاملات', icon: Handshake, badge: engagements.length },
  ];

  const currentFilterLabels =
    activeTab === 'professionals' ? PROFESSION_TYPE_LABELS :
    activeTab === 'licenses' ? LICENSE_TYPE_LABELS :
    activeTab === 'tax_files' ? TAX_TYPE_LABELS :
    ENGAGEMENT_TYPE_LABELS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Briefcase size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">شؤون المهن الحرة والتراخيص (M58)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة المحترفين والتراخيص والملفات الضريبية والتعاملات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · Free Professions</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> إضافة جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activeTab === 'professionals' && (
          <>
            <StatCard icon={<Briefcase size={14} className="text-midnight" />} label="إجمالي المحترفين" value={String(professionals.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="نشطون" value={String(activeProfessionals)} valueClass="text-green-700" />
            <StatCard icon={<Users size={14} className="text-blue-600" />} label="أطباء" value={String(professionals.filter((p) => p.profession_type === 'doctor').length)} valueClass="text-blue-700" />
            <StatCard icon={<Server size={14} className="text-amber-600" />} label="مهندسون" value={String(professionals.filter((p) => p.profession_type === 'engineer').length)} valueClass="text-amber-700" />
          </>
        )}
        {activeTab === 'licenses' && (
          <>
            <StatCard icon={<Award size={14} className="text-midnight" />} label="إجمالي التراخيص" value={String(licenses.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="تراخيص نشطة" value={String(activeLicenses)} valueClass="text-green-700" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="تتطلب تجديد" value={String(expiringLicenses)} valueClass="text-amber-700" />
            <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="منتهية/ملغاة" value={String(licenses.filter((l) => l.status === 'expired' || l.status === 'revoked').length)} valueClass="text-red-700" />
          </>
        )}
        {activeTab === 'tax_files' && (
          <>
            <StatCard icon={<Receipt size={14} className="text-midnight" />} label="إجمالي الملفات" value={String(taxFiles.length)} valueClass="text-midnight" />
            <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي المُعلَن" value={formatCurrency(totalDeclared)} valueClass="text-gold" />
            <StatCard icon={<DollarSign size={14} className="text-blue-600" />} label="إجمالي المُقيَّم" value={formatCurrency(totalAssessed)} valueClass="text-blue-700" />
            <StatCard icon={<AlertCircle size={14} className="text-red-600" />} label="مختلف عليها" value={String(taxFiles.filter((t) => t.status === 'disputed').length)} valueClass="text-red-700" />
          </>
        )}
        {activeTab === 'engagements' && (
          <>
            <StatCard icon={<Handshake size={14} className="text-midnight" />} label="إجمالي التعاملات" value={String(engagements.length)} valueClass="text-midnight" />
            <StatCard icon={<Activity size={14} className="text-green-600" />} label="نشطة" value={String(activeEngagements)} valueClass="text-green-700" />
            <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي القيمة" value={formatCurrency(totalEngagementValue)} valueClass="text-gold" />
            <StatCard icon={<CheckCircle2 size={14} className="text-blue-600" />} label="مكتملة" value={String(engagements.filter((e) => e.status === 'completed').length)} valueClass="text-blue-700" />
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setFilterType('all'); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'text-gold border-gold' : 'text-ink/40 border-transparent hover:text-ink/60'}`}>
              <Icon size={14} /> {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
          <option value="all">كل الأنواع</option>
          {Object.entries(currentFilterLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث..." className="!py-1.5 !text-xs pr-9" />
        </div>
      </div>

      {/* ── Professionals tab ── */}
      {activeTab === 'professionals' && (
        <div className="space-y-2">
          {filteredProfessionals.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Briefcase size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا يوجد محترفون مسجلون</p>
            </div>
          ) : filteredProfessionals.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <Briefcase size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{PROFESSION_TYPE_LABELS[p.profession_type] || p.profession_type}</span>
                      {p.active ? <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><CheckCircle2 size={8} /> نشط</span>
                        : <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/40"><X size={8} /> غير نشط</span>}
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mt-1">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {p.license_number && <span className="font-body text-[9px] text-gold font-bold">رخصة: {p.license_number}</span>}
                      {p.tax_id && <span className="font-body text-[9px] text-ink/40">بطاقة ضريبية: {p.tax_id}</span>}
                      {p.phone && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Phone size={8} /> {p.phone}</span>}
                      {p.email && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Mail size={8} /> {p.email}</span>}
                    </div>
                    {p.address && <span className="font-body text-[9px] text-ink/40 block mt-1">{p.address}</span>}
                    {p.notes && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{p.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setProfForm({ name: p.name, profession_type: p.profession_type, license_number: p.license_number || '', national_id: p.national_id || '', phone: p.phone || '', email: p.email || '', address: p.address || '', tax_id: p.tax_id || '', active: p.active || false, notes: p.notes || '' }); setEditingId(p.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Licenses tab ── */}
      {activeTab === 'licenses' && (
        <div className="space-y-2">
          {filteredLicenses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Award size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تراخيص مسجلة</p>
            </div>
          ) : filteredLicenses.map((l) => {
            const stCfg = LICENSE_STATUS_CONFIG[l.status] || LICENSE_STATUS_CONFIG.active;
            return (
              <div key={l.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
                      <Award size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-gold">{l.license_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{LICENSE_TYPE_LABELS[l.license_type] || l.license_type}</span>
                        {l.renewal_required && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Clock size={8} /> تجديد</span>}
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{profName(l.professional_id)}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {l.issuing_authority && <span className="font-body text-[9px] text-ink/40">الجهة: {l.issuing_authority}</span>}
                        {l.issue_date && <span className="font-body text-[9px] text-ink/40">إصدار: {formatDate(l.issue_date)}</span>}
                        {l.expiry_date && <span className="font-body text-[9px] text-red-600">انتهاء: {formatDate(l.expiry_date)}</span>}
                      </div>
                      {l.conditions && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{l.conditions}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setLicenseForm({ professional_id: l.professional_id || '', license_type: l.license_type, license_number: l.license_number, issuing_authority: l.issuing_authority || '', issue_date: l.issue_date || '', expiry_date: l.expiry_date || '', renewal_required: l.renewal_required || false, status: l.status, conditions: l.conditions || '' }); setEditingId(l.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(l.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tax Files tab ── */}
      {activeTab === 'tax_files' && (
        <div className="space-y-2">
          {filteredTaxFiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Receipt size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد ملفات ضريبية مسجلة</p>
            </div>
          ) : filteredTaxFiles.map((t) => {
            const stCfg = TAX_STATUS_CONFIG[t.status] || TAX_STATUS_CONFIG.filed;
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                      <Receipt size={14} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{TAX_TYPE_LABELS[t.tax_type] || t.tax_type}</span>
                        {t.tax_year && <span className="font-body text-[10px] font-bold text-gold">{t.tax_year}</span>}
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{profName(t.professional_id)}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {t.filing_number && <span className="font-body text-[9px] text-ink/40">رقم: {t.filing_number}</span>}
                        {t.filing_date && <span className="font-body text-[9px] text-ink/40">{formatDate(t.filing_date)}</span>}
                        {t.declared_amount !== null && t.declared_amount > 0 && <span className="font-body text-[9px] text-gold font-bold">مُعلَن: {formatCurrency(t.declared_amount)}</span>}
                        {t.assessed_amount !== null && t.assessed_amount > 0 && <span className="font-body text-[9px] text-blue-600 font-bold">مُقيَّم: {formatCurrency(t.assessed_amount)}</span>}
                      </div>
                      {t.notes && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{t.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setTaxForm({ professional_id: t.professional_id || '', tax_year: t.tax_year || '', tax_type: t.tax_type, filing_number: t.filing_number || '', filing_date: t.filing_date || '', declared_amount: String(t.declared_amount || 0), assessed_amount: String(t.assessed_amount || 0), status: t.status, notes: t.notes || '' }); setEditingId(t.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Engagements tab ── */}
      {activeTab === 'engagements' && (
        <div className="space-y-2">
          {filteredEngagements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Handshake size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تعاملات مسجلة</p>
            </div>
          ) : filteredEngagements.map((e) => {
            const stCfg = ENGAGEMENT_STATUS_CONFIG[e.status] || ENGAGEMENT_STATUS_CONFIG.active;
            return (
              <div key={e.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-50">
                      <Handshake size={14} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ENGAGEMENT_TYPE_LABELS[e.engagement_type] || e.engagement_type}</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{e.counterparty}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-body text-[9px] text-ink/40">المحترف: {profName(e.professional_id)}</span>
                        {e.start_date && <span className="font-body text-[9px] text-ink/40">من: {formatDate(e.start_date)}</span>}
                        {e.end_date && <span className="font-body text-[9px] text-ink/40">إلى: {formatDate(e.end_date)}</span>}
                        {e.value !== null && e.value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(e.value)}</span>}
                      </div>
                      {e.description && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{e.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEngagementForm({ professional_id: e.professional_id || '', engagement_type: e.engagement_type, counterparty: e.counterparty, start_date: e.start_date || '', end_date: e.end_date || '', value: String(e.value || 0), description: e.description || '', status: e.status }); setEditingId(e.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل' : 'إضافة جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        {activeTab === 'professionals' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الاسم" required><TextInput value={profForm.name} onChange={(e) => setProfForm({ ...profForm, name: e.target.value })} /></Field>
              <Field label="نوع المهنة">
                <Select value={profForm.profession_type} onChange={(e) => setProfForm({ ...profForm, profession_type: e.target.value })}>
                  {Object.entries(PROFESSION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الترخيص"><TextInput value={profForm.license_number} onChange={(e) => setProfForm({ ...profForm, license_number: e.target.value })} /></Field>
              <Field label="الرقم القومي"><TextInput value={profForm.national_id} onChange={(e) => setProfForm({ ...profForm, national_id: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الهاتف"><TextInput value={profForm.phone} onChange={(e) => setProfForm({ ...profForm, phone: e.target.value })} /></Field>
              <Field label="البريد الإلكتروني"><TextInput type="email" value={profForm.email} onChange={(e) => setProfForm({ ...profForm, email: e.target.value })} /></Field>
            </div>
            <Field label="العنوان"><TextInput value={profForm.address} onChange={(e) => setProfForm({ ...profForm, address: e.target.value })} /></Field>
            <Field label="البطاقة الضريبية"><TextInput value={profForm.tax_id} onChange={(e) => setProfForm({ ...profForm, tax_id: e.target.value })} /></Field>
            <Field label="ملاحظات"><TextArea value={profForm.notes} onChange={(e) => setProfForm({ ...profForm, notes: e.target.value })} rows={3} /></Field>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={profForm.active} onChange={(e) => setProfForm({ ...profForm, active: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" /><span className="font-body text-sm text-ink/70">نشط</span></label>
          </>
        )}
        {activeTab === 'licenses' && (
          <>
            <Field label="المحترف">
              <Select value={licenseForm.professional_id} onChange={(e) => setLicenseForm({ ...licenseForm, professional_id: e.target.value })}>
                <option value="">— اختر محترفاً —</option>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="نوع الترخيص">
                <Select value={licenseForm.license_type} onChange={(e) => setLicenseForm({ ...licenseForm, license_type: e.target.value })}>
                  {Object.entries(LICENSE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="رقم الترخيص" required><TextInput value={licenseForm.license_number} onChange={(e) => setLicenseForm({ ...licenseForm, license_number: e.target.value })} /></Field>
            </div>
            <Field label="جهة الإصدار"><TextInput value={licenseForm.issuing_authority} onChange={(e) => setLicenseForm({ ...licenseForm, issuing_authority: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الإصدار"><TextInput type="date" value={licenseForm.issue_date} onChange={(e) => setLicenseForm({ ...licenseForm, issue_date: e.target.value })} /></Field>
              <Field label="تاريخ الانتهاء"><TextInput type="date" value={licenseForm.expiry_date} onChange={(e) => setLicenseForm({ ...licenseForm, expiry_date: e.target.value })} /></Field>
            </div>
            <Field label="الحالة">
              <Select value={licenseForm.status} onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.value })}>
                {Object.entries(LICENSE_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="الشروط"><TextArea value={licenseForm.conditions} onChange={(e) => setLicenseForm({ ...licenseForm, conditions: e.target.value })} rows={3} /></Field>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={licenseForm.renewal_required} onChange={(e) => setLicenseForm({ ...licenseForm, renewal_required: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" /><span className="font-body text-sm text-ink/70">يتطلب تجديد</span></label>
          </>
        )}
        {activeTab === 'tax_files' && (
          <>
            <Field label="المحترف">
              <Select value={taxForm.professional_id} onChange={(e) => setTaxForm({ ...taxForm, professional_id: e.target.value })}>
                <option value="">— اختر محترفاً —</option>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="السنة الضريبية" required><TextInput value={taxForm.tax_year} onChange={(e) => setTaxForm({ ...taxForm, tax_year: e.target.value })} placeholder="2025" /></Field>
              <Field label="نوع الضريبة">
                <Select value={taxForm.tax_type} onChange={(e) => setTaxForm({ ...taxForm, tax_type: e.target.value })}>
                  {Object.entries(TAX_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الإقرار"><TextInput value={taxForm.filing_number} onChange={(e) => setTaxForm({ ...taxForm, filing_number: e.target.value })} /></Field>
              <Field label="تاريخ الإقرار"><TextInput type="date" value={taxForm.filing_date} onChange={(e) => setTaxForm({ ...taxForm, filing_date: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="المبلغ المُعلَن"><TextInput type="number" value={taxForm.declared_amount} onChange={(e) => setTaxForm({ ...taxForm, declared_amount: e.target.value })} /></Field>
              <Field label="المبلغ المُقيَّم"><TextInput type="number" value={taxForm.assessed_amount} onChange={(e) => setTaxForm({ ...taxForm, assessed_amount: e.target.value })} /></Field>
            </div>
            <Field label="الحالة">
              <Select value={taxForm.status} onChange={(e) => setTaxForm({ ...taxForm, status: e.target.value })}>
                {Object.entries(TAX_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="ملاحظات"><TextArea value={taxForm.notes} onChange={(e) => setTaxForm({ ...taxForm, notes: e.target.value })} rows={3} /></Field>
          </>
        )}
        {activeTab === 'engagements' && (
          <>
            <Field label="المحترف">
              <Select value={engagementForm.professional_id} onChange={(e) => setEngagementForm({ ...engagementForm, professional_id: e.target.value })}>
                <option value="">— اختر محترفاً —</option>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="نوع التعامل">
                <Select value={engagementForm.engagement_type} onChange={(e) => setEngagementForm({ ...engagementForm, engagement_type: e.target.value })}>
                  {Object.entries(ENGAGEMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="الطرف المقابل" required><TextInput value={engagementForm.counterparty} onChange={(e) => setEngagementForm({ ...engagementForm, counterparty: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ البداية"><TextInput type="date" value={engagementForm.start_date} onChange={(e) => setEngagementForm({ ...engagementForm, start_date: e.target.value })} /></Field>
              <Field label="تاريخ النهاية"><TextInput type="date" value={engagementForm.end_date} onChange={(e) => setEngagementForm({ ...engagementForm, end_date: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="القيمة"><TextInput type="number" value={engagementForm.value} onChange={(e) => setEngagementForm({ ...engagementForm, value: e.target.value })} /></Field>
              <Field label="الحالة">
                <Select value={engagementForm.status} onChange={(e) => setEngagementForm({ ...engagementForm, status: e.target.value })}>
                  {Object.entries(ENGAGEMENT_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="الوصف"><TextArea value={engagementForm.description} onChange={(e) => setEngagementForm({ ...engagementForm, description: e.target.value })} rows={3} /></Field>
          </>
        )}
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
