import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Shield, CircuitBoard, Zap, CheckCircle2, Clock, ArrowRight, Search,
  Activity, Server, AlertCircle, BadgeCheck, Building2, Users,
  Scale, PieChart, Handshake, Calendar, DollarSign, Gavel, Vote,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

/* ─────────────────────────────── Types ─────────────────────────────── */

interface CorporateAssembly {
  id: string;
  assembly_number: string;
  company_name: string;
  assembly_type: string;
  assembly_date: string;
  location: string | null;
  agenda: string | null;
  resolutions_passed: string | null;
  attendance_count: number | null;
  voting_results: string | null;
  minutes_file_id: string | null;
  status: string;
  created_at: string;
}

interface CorporateAlliance {
  id: string;
  alliance_name: string;
  alliance_type: string;
  parties: string | null;
  start_date: string | null;
  end_date: string | null;
  scope: string | null;
  contribution_value: number | null;
  status: string;
  created_at: string;
}

interface ShareDistribution {
  id: string;
  company_name: string;
  shareholder_name: string;
  share_type: string;
  share_count: number | null;
  percentage: number | null;
  par_value: number | null;
  total_value: number | null;
  transfer_restricted: boolean | null;
  notes: string | null;
  created_at: string;
}

interface CorporateContract {
  id: string;
  contract_number: string;
  contract_title: string;
  contract_type: string;
  party_a: string;
  party_b: string;
  effective_date: string | null;
  expiry_date: string | null;
  contract_value: number | null;
  governing_law: string | null;
  status: string;
  created_at: string;
}

type Tab = 'assemblies' | 'alliances' | 'shares' | 'contracts';

/* ─────────────────────────────── Label Maps ─────────────────────────────── */

const ASSEMBLY_TYPE_LABELS: Record<string, string> = {
  general: 'عادية',
  extraordinary: 'غير عادية',
  founding: 'تأسيسية',
};

const ASSEMBLY_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: 'مُجدوَل', bg: 'bg-blue-50', text: 'text-blue-700' },
  convened: { label: 'منعقدة', bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { label: 'ملغاة', bg: 'bg-red-50', text: 'text-red-700' },
  postponed: { label: 'مؤجلة', bg: 'bg-amber-50', text: 'text-amber-700' },
};

const ALLIANCE_TYPE_LABELS: Record<string, string> = {
  joint_venture: 'مشروع مشترك',
  consortium: 'اتحاد',
  strategic_partnership: 'شراكة استراتيجية',
};

const ALLIANCE_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'نشط', bg: 'bg-green-50', text: 'text-green-700' },
  pending: { label: 'قيد الانتظار', bg: 'bg-amber-50', text: 'text-amber-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-gray-100', text: 'text-gray-700' },
  expired: { label: 'منتهي الصلاحية', bg: 'bg-red-50', text: 'text-red-700' },
};

const SHARE_TYPE_LABELS: Record<string, string> = {
  ordinary: 'عادية',
  preferred: 'ممتازة',
  founder: 'مؤسس',
  treasury: 'خزينة',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  supply: 'توريد',
  service: 'خدمات',
  distribution: 'توزيع',
  franchise: 'امتياز',
  joint_venture: 'مشروع مشترك',
};

const CONTRACT_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'مسودة', bg: 'bg-gray-100', text: 'text-gray-700' },
  active: { label: 'نشط', bg: 'bg-green-50', text: 'text-green-700' },
  expired: { label: 'منتهي', bg: 'bg-red-50', text: 'text-red-700' },
  terminated: { label: 'منتهٍ', bg: 'bg-gray-100', text: 'text-gray-700' },
  pending: { label: 'قيد الانتظار', bg: 'bg-amber-50', text: 'text-amber-700' },
};

/* ─────────────────────────────── Forms ─────────────────────────────── */

interface AssemblyForm {
  assembly_number: string;
  company_name: string;
  assembly_type: string;
  assembly_date: string;
  location: string;
  agenda: string;
  resolutions_passed: string;
  attendance_count: string;
  voting_results: string;
  minutes_file_id: string;
  status: string;
}

const emptyAssembly: AssemblyForm = {
  assembly_number: '', company_name: '', assembly_type: 'general', assembly_date: '',
  location: '', agenda: '', resolutions_passed: '', attendance_count: '0',
  voting_results: '', minutes_file_id: '', status: 'scheduled',
};

interface AllianceForm {
  alliance_name: string;
  alliance_type: string;
  parties: string;
  start_date: string;
  end_date: string;
  scope: string;
  contribution_value: string;
  status: string;
}

const emptyAlliance: AllianceForm = {
  alliance_name: '', alliance_type: 'joint_venture', parties: '', start_date: '',
  end_date: '', scope: '', contribution_value: '0', status: 'active',
};

interface ShareForm {
  company_name: string;
  shareholder_name: string;
  share_type: string;
  share_count: string;
  percentage: string;
  par_value: string;
  total_value: string;
  transfer_restricted: boolean;
  notes: string;
}

const emptyShare: ShareForm = {
  company_name: '', shareholder_name: '', share_type: 'ordinary', share_count: '0',
  percentage: '0', par_value: '0', total_value: '0', transfer_restricted: false, notes: '',
};

interface ContractForm {
  contract_number: string;
  contract_title: string;
  contract_type: string;
  party_a: string;
  party_b: string;
  effective_date: string;
  expiry_date: string;
  contract_value: string;
  governing_law: string;
  status: string;
}

const emptyContract: ContractForm = {
  contract_number: '', contract_title: '', contract_type: 'supply', party_a: '',
  party_b: '', effective_date: '', expiry_date: '', contract_value: '0',
  governing_law: '', status: 'draft',
};

/* ─────────────────────────────── Component ─────────────────────────────── */

export default function CorporateCommercialEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [assemblies, setAssemblies] = useState<CorporateAssembly[]>([]);
  const [alliances, setAlliances] = useState<CorporateAlliance[]>([]);
  const [shares, setShares] = useState<ShareDistribution[]>([]);
  const [contracts, setContracts] = useState<CorporateContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('assemblies');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [assemblyForm, setAssemblyForm] = useState<AssemblyForm>(emptyAssembly);
  const [allianceForm, setAllianceForm] = useState<AllianceForm>(emptyAlliance);
  const [shareForm, setShareForm] = useState<ShareForm>(emptyShare);
  const [contractForm, setContractForm] = useState<ContractForm>(emptyContract);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [asmRes, allRes, shRes, conRes] = await Promise.all([
      supabase.from('m60_corporate_assemblies').select('*').order('created_at', { ascending: false }),
      supabase.from('m60_corporate_alliances').select('*').order('created_at', { ascending: false }),
      supabase.from('m60_share_distributions').select('*').order('created_at', { ascending: false }),
      supabase.from('m60_corporate_contracts').select('*').order('created_at', { ascending: false }),
    ]);
    setAssemblies((asmRes.data as CorporateAssembly[]) || []);
    setAlliances((allRes.data as CorporateAlliance[]) || []);
    setShares((shRes.data as ShareDistribution[]) || []);
    setContracts((conRes.data as CorporateContract[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (activeTab === 'assemblies') setAssemblyForm({ ...emptyAssembly, assembly_number: cmd.fields.title || '' });
      if (activeTab === 'alliances') setAllianceForm({ ...emptyAlliance, alliance_name: cmd.fields.title || '' });
      if (activeTab === 'shares') setShareForm({ ...emptyShare, company_name: cmd.fields.title || '' });
      if (activeTab === 'contracts') setContractForm({ ...emptyContract, contract_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const openAdd = () => {
    if (activeTab === 'assemblies') setAssemblyForm(emptyAssembly);
    if (activeTab === 'alliances') setAllianceForm(emptyAlliance);
    if (activeTab === 'shares') setShareForm(emptyShare);
    if (activeTab === 'contracts') setContractForm(emptyContract);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (activeTab === 'assemblies') {
      if (!assemblyForm.assembly_number.trim() || !assemblyForm.company_name.trim()) { setSaving(false); return; }
      const payload = {
        assembly_number: assemblyForm.assembly_number.trim(),
        company_name: assemblyForm.company_name.trim(),
        assembly_type: assemblyForm.assembly_type,
        assembly_date: assemblyForm.assembly_date || null,
        location: assemblyForm.location.trim() || null,
        agenda: assemblyForm.agenda.trim() || null,
        resolutions_passed: assemblyForm.resolutions_passed.trim() || null,
        attendance_count: Number(assemblyForm.attendance_count) || 0,
        voting_results: assemblyForm.voting_results.trim() || null,
        minutes_file_id: assemblyForm.minutes_file_id.trim() || null,
        status: assemblyForm.status,
      };
      if (editingId) await supabase.from('m60_corporate_assemblies').update(payload).eq('id', editingId);
      else await supabase.from('m60_corporate_assemblies').insert(payload);
    } else if (activeTab === 'alliances') {
      if (!allianceForm.alliance_name.trim()) { setSaving(false); return; }
      const payload = {
        alliance_name: allianceForm.alliance_name.trim(),
        alliance_type: allianceForm.alliance_type,
        parties: allianceForm.parties.trim() || null,
        start_date: allianceForm.start_date || null,
        end_date: allianceForm.end_date || null,
        scope: allianceForm.scope.trim() || null,
        contribution_value: Number(allianceForm.contribution_value) || 0,
        status: allianceForm.status,
      };
      if (editingId) await supabase.from('m60_corporate_alliances').update(payload).eq('id', editingId);
      else await supabase.from('m60_corporate_alliances').insert(payload);
    } else if (activeTab === 'shares') {
      if (!shareForm.company_name.trim() || !shareForm.shareholder_name.trim()) { setSaving(false); return; }
      const payload = {
        company_name: shareForm.company_name.trim(),
        shareholder_name: shareForm.shareholder_name.trim(),
        share_type: shareForm.share_type,
        share_count: Number(shareForm.share_count) || 0,
        percentage: Number(shareForm.percentage) || 0,
        par_value: Number(shareForm.par_value) || 0,
        total_value: Number(shareForm.total_value) || 0,
        transfer_restricted: shareForm.transfer_restricted,
        notes: shareForm.notes.trim() || null,
      };
      if (editingId) await supabase.from('m60_share_distributions').update(payload).eq('id', editingId);
      else await supabase.from('m60_share_distributions').insert(payload);
    } else if (activeTab === 'contracts') {
      if (!contractForm.contract_number.trim() || !contractForm.contract_title.trim()) { setSaving(false); return; }
      const payload = {
        contract_number: contractForm.contract_number.trim(),
        contract_title: contractForm.contract_title.trim(),
        contract_type: contractForm.contract_type,
        party_a: contractForm.party_a.trim(),
        party_b: contractForm.party_b.trim(),
        effective_date: contractForm.effective_date || null,
        expiry_date: contractForm.expiry_date || null,
        contract_value: Number(contractForm.contract_value) || 0,
        governing_law: contractForm.governing_law.trim() || null,
        status: contractForm.status,
      };
      if (editingId) await supabase.from('m60_corporate_contracts').update(payload).eq('id', editingId);
      else await supabase.from('m60_corporate_contracts').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (activeTab === 'assemblies') await supabase.from('m60_corporate_assemblies').delete().eq('id', deleteId);
    if (activeTab === 'alliances') await supabase.from('m60_corporate_alliances').delete().eq('id', deleteId);
    if (activeTab === 'shares') await supabase.from('m60_share_distributions').delete().eq('id', deleteId);
    if (activeTab === 'contracts') await supabase.from('m60_corporate_contracts').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  /* ── Filters ── */

  const filteredAssemblies = assemblies.filter((a) => {
    if (filterType !== 'all' && a.assembly_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.assembly_number.toLowerCase().includes(q) && !a.company_name.toLowerCase().includes(q) && !(a.location || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredAlliances = alliances.filter((a) => {
    if (filterType !== 'all' && a.alliance_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.alliance_name.toLowerCase().includes(q) && (a.parties || '').toLowerCase().includes(q) && (a.scope || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredShares = shares.filter((s) => {
    if (filterType !== 'all' && s.share_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.company_name.toLowerCase().includes(q) && !s.shareholder_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredContracts = contracts.filter((c) => {
    if (filterType !== 'all' && c.contract_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.contract_number.toLowerCase().includes(q) && !c.contract_title.toLowerCase().includes(q) && !c.party_a.toLowerCase().includes(q) && !c.party_b.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const scheduledAssemblies = assemblies.filter((a) => a.status === 'scheduled').length;
  const convenedAssemblies = assemblies.filter((a) => a.status === 'convened').length;
  const activeAlliances = alliances.filter((a) => a.status === 'active').length;
  const totalContribution = alliances.reduce((s, a) => s + (a.contribution_value || 0), 0);
  const totalShareValue = shares.reduce((s, sh) => s + (sh.total_value || 0), 0);
  const restrictedShares = shares.filter((s) => s.transfer_restricted).length;
  const activeContracts = contracts.filter((c) => c.status === 'active').length;
  const totalContractValue = contracts.reduce((s, c) => s + (c.contract_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Building2; badge?: number }[] = [
    { id: 'assemblies', label: 'الجمعيات العمومية', icon: Vote, badge: assemblies.length },
    { id: 'alliances', label: 'التحالفات', icon: Handshake, badge: alliances.length },
    { id: 'shares', label: 'توزيع الحصص', icon: PieChart, badge: shares.length },
    { id: 'contracts', label: 'العقود التجارية', icon: FileText, badge: contracts.length },
  ];

  const currentFilterLabels =
    activeTab === 'assemblies' ? ASSEMBLY_TYPE_LABELS :
    activeTab === 'alliances' ? ALLIANCE_TYPE_LABELS :
    activeTab === 'shares' ? SHARE_TYPE_LABELS :
    CONTRACT_TYPE_LABELS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Building2 size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الشركات والعقود التجارية والأسواق (M60)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الجمعيات العمومية والتحالفات وتوزيع الحصص والعقود التجارية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Air-Gapped · Corporate</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> إضافة جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activeTab === 'assemblies' && (
          <>
            <StatCard icon={<Vote size={14} className="text-midnight" />} label="إجمالي الجمعيات" value={String(assemblies.length)} valueClass="text-midnight" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="مُجدوَلة" value={String(scheduledAssemblies)} valueClass="text-amber-700" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="منعقدة" value={String(convenedAssemblies)} valueClass="text-green-700" />
            <StatCard icon={<Building2 size={14} className="text-blue-600" />} label="شركات" value={String(new Set(assemblies.map((a) => a.company_name)).size)} valueClass="text-blue-700" />
          </>
        )}
        {activeTab === 'alliances' && (
          <>
            <StatCard icon={<Handshake size={14} className="text-midnight" />} label="إجمالي التحالفات" value={String(alliances.length)} valueClass="text-midnight" />
            <StatCard icon={<Activity size={14} className="text-green-600" />} label="نشطة" value={String(activeAlliances)} valueClass="text-green-700" />
            <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي المساهمات" value={formatCurrency(totalContribution)} valueClass="text-gold" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="قيد الانتظار" value={String(alliances.filter((a) => a.status === 'pending').length)} valueClass="text-amber-700" />
          </>
        )}
        {activeTab === 'shares' && (
          <>
            <StatCard icon={<PieChart size={14} className="text-midnight" />} label="إجمالي الحصص" value={String(shares.length)} valueClass="text-midnight" />
            <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي القيمة" value={formatCurrency(totalShareValue)} valueClass="text-gold" />
            <StatCard icon={<Building2 size={14} className="text-blue-600" />} label="شركات" value={String(new Set(shares.map((s) => s.company_name)).size)} valueClass="text-blue-700" />
            <StatCard icon={<AlertCircle size={14} className="text-amber-600" />} label="مقيَّدة التحويل" value={String(restrictedShares)} valueClass="text-amber-700" />
          </>
        )}
        {activeTab === 'contracts' && (
          <>
            <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي العقود" value={String(contracts.length)} valueClass="text-midnight" />
            <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="نشطة" value={String(activeContracts)} valueClass="text-green-700" />
            <StatCard icon={<DollarSign size={14} className="text-gold" />} label="إجمالي القيمة" value={formatCurrency(totalContractValue)} valueClass="text-gold" />
            <StatCard icon={<Clock size={14} className="text-amber-600" />} label="مسودة/قيد الانتظار" value={String(contracts.filter((c) => c.status === 'draft' || c.status === 'pending').length)} valueClass="text-amber-700" />
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

      {/* ── Assemblies tab ── */}
      {activeTab === 'assemblies' && (
        <div className="space-y-2">
          {filteredAssemblies.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Vote size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد جمعيات مسجلة</p>
            </div>
          ) : filteredAssemblies.map((a) => {
            const stCfg = ASSEMBLY_STATUS_CONFIG[a.status] || ASSEMBLY_STATUS_CONFIG.scheduled;
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <Vote size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-gold">{a.assembly_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ASSEMBLY_TYPE_LABELS[a.assembly_type] || a.assembly_type}</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{a.company_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {a.assembly_date && <span className="font-body text-[9px] text-ink/40">{formatDate(a.assembly_date)}</span>}
                        {a.location && <span className="font-body text-[9px] text-ink/40">{a.location}</span>}
                        {a.attendance_count !== null && <span className="font-body text-[9px] text-ink/40">الحضور: {a.attendance_count}</span>}
                      </div>
                      {a.agenda && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2"><span className="font-bold text-ink/40">جدول الأعمال: </span>{a.agenda}</p>}
                      {a.resolutions_passed && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2"><span className="font-bold text-ink/40">القرارات: </span>{a.resolutions_passed}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setAssemblyForm({ assembly_number: a.assembly_number, company_name: a.company_name, assembly_type: a.assembly_type, assembly_date: a.assembly_date || '', location: a.location || '', agenda: a.agenda || '', resolutions_passed: a.resolutions_passed || '', attendance_count: String(a.attendance_count || 0), voting_results: a.voting_results || '', minutes_file_id: a.minutes_file_id || '', status: a.status }); setEditingId(a.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Alliances tab ── */}
      {activeTab === 'alliances' && (
        <div className="space-y-2">
          {filteredAlliances.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Handshake size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد تحالفات مسجلة</p>
            </div>
          ) : filteredAlliances.map((a) => {
            const stCfg = ALLIANCE_STATUS_CONFIG[a.status] || ALLIANCE_STATUS_CONFIG.active;
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-50">
                      <Handshake size={14} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{ALLIANCE_TYPE_LABELS[a.alliance_type] || a.alliance_type}</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{a.alliance_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {a.parties && <span className="font-body text-[9px] text-ink/40">الأطراف: {a.parties}</span>}
                        {a.start_date && <span className="font-body text-[9px] text-ink/40">من: {formatDate(a.start_date)}</span>}
                        {a.end_date && <span className="font-body text-[9px] text-ink/40">إلى: {formatDate(a.end_date)}</span>}
                        {a.contribution_value !== null && a.contribution_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(a.contribution_value)}</span>}
                      </div>
                      {a.scope && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{a.scope}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setAllianceForm({ alliance_name: a.alliance_name, alliance_type: a.alliance_type, parties: a.parties || '', start_date: a.start_date || '', end_date: a.end_date || '', scope: a.scope || '', contribution_value: String(a.contribution_value || 0), status: a.status }); setEditingId(a.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(a.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Shares tab ── */}
      {activeTab === 'shares' && (
        <div className="space-y-2">
          {filteredShares.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <PieChart size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا يوجد توزيع حصص مسجل</p>
            </div>
          ) : filteredShares.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                    <PieChart size={14} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{SHARE_TYPE_LABELS[s.share_type] || s.share_type}</span>
                      {s.transfer_restricted && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><AlertCircle size={8} /> مقيَّد التحويل</span>}
                      {s.percentage !== null && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-gold/10 text-gold font-bold">{s.percentage}%</span>}
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mt-1">{s.shareholder_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-body text-[9px] text-ink/40">الشركة: {s.company_name}</span>
                      {s.share_count !== null && <span className="font-body text-[9px] text-ink/40">عدد الأسهم: {s.share_count}</span>}
                      {s.par_value !== null && s.par_value > 0 && <span className="font-body text-[9px] text-ink/40">القيمة الاسمية: {formatCurrency(s.par_value)}</span>}
                      {s.total_value !== null && s.total_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(s.total_value)}</span>}
                    </div>
                    {s.notes && <p className="font-body text-xs text-ink/60 mt-1 leading-snug line-clamp-2">{s.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setShareForm({ company_name: s.company_name, shareholder_name: s.shareholder_name, share_type: s.share_type, share_count: String(s.share_count || 0), percentage: String(s.percentage || 0), par_value: String(s.par_value || 0), total_value: String(s.total_value || 0), transfer_restricted: s.transfer_restricted || false, notes: s.notes || '' }); setEditingId(s.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Contracts tab ── */}
      {activeTab === 'contracts' && (
        <div className="space-y-2">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <FileText size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد عقود تجارية مسجلة</p>
            </div>
          ) : filteredContracts.map((c) => {
            const stCfg = CONTRACT_STATUS_CONFIG[c.status] || CONTRACT_STATUS_CONFIG.draft;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
                      <FileText size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-gold">{c.contract_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${stCfg.bg} ${stCfg.text}`}>{stCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{CONTRACT_TYPE_LABELS[c.contract_type] || c.contract_type}</span>
                      </div>
                      <p className="font-body text-xs font-bold text-midnight mt-1">{c.contract_title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-body text-[9px] text-ink/40">أ: {c.party_a}</span>
                        <span className="font-body text-[9px] text-ink/40">ب: {c.party_b}</span>
                        {c.effective_date && <span className="font-body text-[9px] text-ink/40">من: {formatDate(c.effective_date)}</span>}
                        {c.expiry_date && <span className="font-body text-[9px] text-red-600">إلى: {formatDate(c.expiry_date)}</span>}
                        {c.contract_value !== null && c.contract_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(c.contract_value)}</span>}
                        {c.governing_law && <span className="font-body text-[9px] text-ink/40">القانون: {c.governing_law}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setContractForm({ contract_number: c.contract_number, contract_title: c.contract_title, contract_type: c.contract_type, party_a: c.party_a, party_b: c.party_b, effective_date: c.effective_date || '', expiry_date: c.expiry_date || '', contract_value: String(c.contract_value || 0), governing_law: c.governing_law || '', status: c.status }); setEditingId(c.id); setModalOpen(true); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل' : 'إضافة جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        {activeTab === 'assemblies' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الجمعية" required><TextInput value={assemblyForm.assembly_number} onChange={(e) => setAssemblyForm({ ...assemblyForm, assembly_number: e.target.value })} placeholder="ASM-2025-001" /></Field>
              <Field label="نوع الجمعية">
                <Select value={assemblyForm.assembly_type} onChange={(e) => setAssemblyForm({ ...assemblyForm, assembly_type: e.target.value })}>
                  {Object.entries(ASSEMBLY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="اسم الشركة" required><TextInput value={assemblyForm.company_name} onChange={(e) => setAssemblyForm({ ...assemblyForm, company_name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الجمعية"><TextInput type="date" value={assemblyForm.assembly_date} onChange={(e) => setAssemblyForm({ ...assemblyForm, assembly_date: e.target.value })} /></Field>
              <Field label="الحالة">
                <Select value={assemblyForm.status} onChange={(e) => setAssemblyForm({ ...assemblyForm, status: e.target.value })}>
                  {Object.entries(ASSEMBLY_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="الموقع"><TextInput value={assemblyForm.location} onChange={(e) => setAssemblyForm({ ...assemblyForm, location: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="عدد الحضور"><TextInput type="number" value={assemblyForm.attendance_count} onChange={(e) => setAssemblyForm({ ...assemblyForm, attendance_count: e.target.value })} /></Field>
              <Field label="معرف محضر الاجتماع"><TextInput value={assemblyForm.minutes_file_id} onChange={(e) => setAssemblyForm({ ...assemblyForm, minutes_file_id: e.target.value })} /></Field>
            </div>
            <Field label="جدول الأعمال"><TextArea value={assemblyForm.agenda} onChange={(e) => setAssemblyForm({ ...assemblyForm, agenda: e.target.value })} rows={3} /></Field>
            <Field label="القرارات المُعتمدة"><TextArea value={assemblyForm.resolutions_passed} onChange={(e) => setAssemblyForm({ ...assemblyForm, resolutions_passed: e.target.value })} rows={3} /></Field>
            <Field label="نتائج التصويت"><TextArea value={assemblyForm.voting_results} onChange={(e) => setAssemblyForm({ ...assemblyForm, voting_results: e.target.value })} rows={2} /></Field>
          </>
        )}
        {activeTab === 'alliances' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="اسم التحالف" required><TextInput value={allianceForm.alliance_name} onChange={(e) => setAllianceForm({ ...allianceForm, alliance_name: e.target.value })} /></Field>
              <Field label="نوع التحالف">
                <Select value={allianceForm.alliance_type} onChange={(e) => setAllianceForm({ ...allianceForm, alliance_type: e.target.value })}>
                  {Object.entries(ALLIANCE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="الأطراف"><TextInput value={allianceForm.parties} onChange={(e) => setAllianceForm({ ...allianceForm, parties: e.target.value })} placeholder="الشركة أ، الشركة ب" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ البداية"><TextInput type="date" value={allianceForm.start_date} onChange={(e) => setAllianceForm({ ...allianceForm, start_date: e.target.value })} /></Field>
              <Field label="تاريخ النهاية"><TextInput type="date" value={allianceForm.end_date} onChange={(e) => setAllianceForm({ ...allianceForm, end_date: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="قيمة المساهمة"><TextInput type="number" value={allianceForm.contribution_value} onChange={(e) => setAllianceForm({ ...allianceForm, contribution_value: e.target.value })} /></Field>
              <Field label="الحالة">
                <Select value={allianceForm.status} onChange={(e) => setAllianceForm({ ...allianceForm, status: e.target.value })}>
                  {Object.entries(ALLIANCE_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="النطاق"><TextArea value={allianceForm.scope} onChange={(e) => setAllianceForm({ ...allianceForm, scope: e.target.value })} rows={3} /></Field>
          </>
        )}
        {activeTab === 'shares' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="اسم الشركة" required><TextInput value={shareForm.company_name} onChange={(e) => setShareForm({ ...shareForm, company_name: e.target.value })} /></Field>
              <Field label="اسم المساهم" required><TextInput value={shareForm.shareholder_name} onChange={(e) => setShareForm({ ...shareForm, shareholder_name: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="نوع السهم">
                <Select value={shareForm.share_type} onChange={(e) => setShareForm({ ...shareForm, share_type: e.target.value })}>
                  {Object.entries(SHARE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
              <Field label="عدد الأسهم"><TextInput type="number" value={shareForm.share_count} onChange={(e) => setShareForm({ ...shareForm, share_count: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="النسبة (%)"><TextInput type="number" value={shareForm.percentage} onChange={(e) => setShareForm({ ...shareForm, percentage: e.target.value })} /></Field>
              <Field label="القيمة الاسمية"><TextInput type="number" value={shareForm.par_value} onChange={(e) => setShareForm({ ...shareForm, par_value: e.target.value })} /></Field>
              <Field label="إجمالي القيمة"><TextInput type="number" value={shareForm.total_value} onChange={(e) => setShareForm({ ...shareForm, total_value: e.target.value })} /></Field>
            </div>
            <Field label="ملاحظات"><TextArea value={shareForm.notes} onChange={(e) => setShareForm({ ...shareForm, notes: e.target.value })} rows={3} /></Field>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={shareForm.transfer_restricted} onChange={(e) => setShareForm({ ...shareForm, transfer_restricted: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" /><span className="font-body text-sm text-ink/70">مقيَّد التحويل</span></label>
          </>
        )}
        {activeTab === 'contracts' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم العقد" required><TextInput value={contractForm.contract_number} onChange={(e) => setContractForm({ ...contractForm, contract_number: e.target.value })} placeholder="CC-2025-001" /></Field>
              <Field label="نوع العقد">
                <Select value={contractForm.contract_type} onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })}>
                  {Object.entries(CONTRACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="عنوان العقد" required><TextInput value={contractForm.contract_title} onChange={(e) => setContractForm({ ...contractForm, contract_title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الطرف الأول" required><TextInput value={contractForm.party_a} onChange={(e) => setContractForm({ ...contractForm, party_a: e.target.value })} /></Field>
              <Field label="الطرف الثاني" required><TextInput value={contractForm.party_b} onChange={(e) => setContractForm({ ...contractForm, party_b: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ السريان"><TextInput type="date" value={contractForm.effective_date} onChange={(e) => setContractForm({ ...contractForm, effective_date: e.target.value })} /></Field>
              <Field label="تاريخ الانتهاء"><TextInput type="date" value={contractForm.expiry_date} onChange={(e) => setContractForm({ ...contractForm, expiry_date: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="قيمة العقد"><TextInput type="number" value={contractForm.contract_value} onChange={(e) => setContractForm({ ...contractForm, contract_value: e.target.value })} /></Field>
              <Field label="الحالة">
                <Select value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })}>
                  {Object.entries(CONTRACT_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="القانون الحاكم"><TextInput value={contractForm.governing_law} onChange={(e) => setContractForm({ ...contractForm, governing_law: e.target.value })} placeholder="القانون المصري" /></Field>
          </>
        )}
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
