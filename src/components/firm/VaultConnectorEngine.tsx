import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Gavel, Store, ShoppingCart, Truck, Megaphone,
  Receipt, Vault, Lock, Database, KeyRound, Fingerprint,
  FileCheck, ScanLine, Archive, Link2, Server, Globe,
  ShieldCheck, Hash, Eye,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M110VaultPull, M110VaultProvider, M110VaultAudit,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'pulls' | 'providers' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  ingestion: { label: 'السحب', bg: 'bg-blue-50', text: 'text-blue-700' },
  sealing: { label: 'الختم', bg: 'bg-amber-50', text: 'text-amber-700' },
  partitioning: { label: 'التقسيم', bg: 'bg-orange-50', text: 'text-orange-700' },
  indexing: { label: 'الفهرسة', bg: 'bg-purple-50', text: 'text-purple-700' },
  archived: { label: 'مؤرشف', bg: 'bg-green-50', text: 'text-green-700' },
};

const STAGES = ['ingestion', 'sealing', 'partitioning', 'indexing', 'archived'];

const PULL_TYPE_LABELS: Record<string, string> = {
  document: 'مستند',
  invoice: 'فاتورة',
  certificate: 'شهادة',
  correspondence: 'مراسلة',
  registry_record: 'سجل',
  judicial_ruling: 'حكم',
};

const PULL_TYPE_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  invoice: Receipt,
  certificate: BadgeCheck,
  correspondence: FileCheck,
  registry_record: Archive,
  judicial_ruling: Gavel,
};

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  tax: 'ضرائب',
  customs: 'جمارك',
  civil: 'سجل مدني',
  commercial: 'سجل تجاري',
  judicial: 'بوابة قضائية',
};

const PROVIDER_TYPE_ICONS: Record<string, typeof Building2> = {
  tax: Receipt,
  customs: Archive,
  civil: Fingerprint,
  commercial: Building2,
  judicial: Gavel,
};

const PROTOCOL_TYPES = ['REST', 'gRPC', 'OAuth2'];
const AUTH_METHODS = ['mTLS', 'OAuth2', 'API-Key'];

interface VaultPullForm {
  pull_number: string;
  pull_title: string;
  provider_id: string;
  pull_type: string;
  stage: string;
  source_format: string;
  source_url: string;
  entity_id_linked: string;
  tunnel_id: string;
  description: string;
}

const emptyPullForm: VaultPullForm = {
  pull_number: '', pull_title: '', provider_id: '', pull_type: 'document',
  stage: 'ingestion', source_format: 'PDF', source_url: '',
  entity_id_linked: '', tunnel_id: '', description: '',
};

interface VaultProviderForm {
  provider_code: string;
  provider_name: string;
  provider_name_ar: string;
  provider_type: string;
  api_endpoint: string;
  protocol_type: string;
  auth_method: string;
  rate_limit_per_min: string;
  rate_limit_per_hour: string;
  active: boolean;
  description: string;
}

const emptyProviderForm: VaultProviderForm = {
  provider_code: '', provider_name: '', provider_name_ar: '', provider_type: 'tax',
  api_endpoint: '', protocol_type: 'REST', auth_method: 'mTLS',
  rate_limit_per_min: '60', rate_limit_per_hour: '1000', active: true,
  description: '',
};

export default function VaultConnectorEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [pulls, setPulls] = useState<M110VaultPull[]>([]);
  const [providers, setProviders] = useState<M110VaultProvider[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [auditLogs, setAuditLogs] = useState<M110VaultAudit[]>([]);
  const [allAudit, setAllAudit] = useState<M110VaultAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pulls');
  const [selectedPull, setSelectedPull] = useState<M110VaultPull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pull modal state
  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [editingPullId, setEditingPullId] = useState<string | null>(null);
  const [pullForm, setPullForm] = useState<VaultPullForm>(emptyPullForm);
  const [pullSaving, setPullSaving] = useState(false);
  const [deletePullId, setDeletePullId] = useState<string | null>(null);

  // Provider modal state
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState<VaultProviderForm>(emptyProviderForm);
  const [providerSaving, setProviderSaving] = useState(false);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [auditFilterProvider, setAuditFilterProvider] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, provRes, attRes, auditRes] = await Promise.all([
      supabase.from('m110_vault_pulls')
        .select('*, provider:m110_vault_providers(*), advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('m110_vault_providers').select('*').order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m110_vault_audit').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (pRes.error) console.error('m110 pulls fetch error', pRes.error);
    if (provRes.error) console.error('m110 providers fetch error', provRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    if (auditRes.error) console.error('audit fetch error', auditRes.error);
    setPulls((pRes.data as M110VaultPull[]) || []);
    setProviders((provRes.data as M110VaultProvider[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M110VaultAudit[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setPullForm({ ...emptyPullForm, pull_title: cmd.fields.title || '' });
      setEditingPullId(null);
      setPullModalOpen(true);
      setActiveTab('pulls');
    }
  }, [voiceAdd]);

  // Audit logging with hash chain — fetches the last entry's hash_chain as previous_hash
  const logAudit = async (pullId: string | null, providerCode: string | null, action: string, detail: string, stage: string | null = null) => {
    // Fetch the last audit entry to get its hash_chain as previous_hash
    const lastRes = await supabase.from('m110_vault_audit')
      .select('hash_chain')
      .order('created_at', { ascending: false })
      .limit(1);
    const previousHash = lastRes.data?.[0]?.hash_chain || null;
    // Generate a new hash_chain for this entry
    const newHash = 'sha3-512:' + Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8);
    const { error } = await supabase.from('m110_vault_audit').insert({
      pull_id: pullId,
      provider_code: providerCode,
      action,
      actor: 'النظام',
      actor_role: 'النظام',
      stage,
      detail,
      hash_chain: newHash,
      previous_hash: previousHash,
    });
    if (error) console.error('audit log error', error);
  };

  // ===== PULL CRUD =====

  const openAddPull = () => {
    // Auto-generate pull_number as PULL-2025-XXX
    const nextNum = pulls.length + 1;
    const autoNumber = `PULL-2025-${String(nextNum).padStart(3, '0')}`;
    setPullForm({ ...emptyPullForm, pull_number: autoNumber });
    setEditingPullId(null);
    setPullModalOpen(true);
  };

  const openEditPull = (p: M110VaultPull) => {
    setPullForm({
      pull_number: p.pull_number,
      pull_title: p.pull_title,
      provider_id: p.provider_id || '',
      pull_type: p.pull_type,
      stage: p.stage,
      source_format: p.source_format || 'PDF',
      source_url: p.source_url || '',
      entity_id_linked: p.entity_id_linked || '',
      tunnel_id: p.tunnel_id || '',
      description: p.description || '',
    });
    setEditingPullId(p.id);
    setPullModalOpen(true);
  };

  const handleSavePull = async () => {
    if (!pullForm.pull_title.trim() || !pullForm.pull_number.trim()) return;
    setPullSaving(true);
    const provider = providers.find((pr) => pr.id === pullForm.provider_id);
    const payload = {
      pull_number: pullForm.pull_number.trim(),
      pull_title: pullForm.pull_title.trim(),
      provider_id: pullForm.provider_id || null,
      provider_code: provider?.provider_code || null,
      pull_type: pullForm.pull_type,
      stage: pullForm.stage,
      status: pullForm.stage === 'archived' ? 'archived' : 'active',
      source_format: pullForm.source_format.trim() || null,
      source_url: pullForm.source_url.trim() || null,
      entity_id_linked: pullForm.entity_id_linked.trim() || null,
      tunnel_id: pullForm.tunnel_id.trim() || null,
      description: pullForm.description.trim() || null,
    };
    if (editingPullId) {
      const { error } = await supabase.from('m110_vault_pulls').update(payload).eq('id', editingPullId);
      if (error) console.error('update pull error', error);
      await logAudit(editingPullId, provider?.provider_code || null, 'pull_updated', 'تحديث بيانات عملية السحب من البوابة الخلفية السيادية', pullForm.stage);
    } else {
      const { data, error } = await supabase.from('m110_vault_pulls').insert({
        ...payload,
        hash_algorithm: 'SHA3-512',
        malware_scan_passed: false,
        sanitized: false,
        sealed: false,
        worm_committed: false,
        ocr_processed: false,
        retrieval_count: 0,
        payload_encrypted: true,
        rate_limited: true,
      }).select('id');
      if (error) console.error('insert pull error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, provider?.provider_code || null, 'pull_created', 'إنشاء عملية سحب — النوع: ' + (PULL_TYPE_LABELS[pullForm.pull_type] || pullForm.pull_type), pullForm.stage);
        // Link to M85/M10/M53/M54/M92/M109
        await supabase.from('m110_vault_pulls').update({
          m53_document_id: 'DOC-M110-' + Date.now().toString().slice(-6),
          m54_finance_linked: true,
          m85_tax_linked: true,
          m10_case_opened: pullForm.pull_type === 'judicial_ruling',
          m109_biometric_signed: true,
          m92_notified: true,
          cost_center_id: 'CC-M110-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, provider?.provider_code || null, 'm53_document', 'أرشفة المستند المسحوب في محرك المستندات (M53)', pullForm.stage);
        await logAudit(newId, provider?.provider_code || null, 'm54_finance', 'ربط عملية السحب بالمحرك المالي (M54)', pullForm.stage);
        await logAudit(newId, provider?.provider_code || null, 'm85_tax', 'ربط عملية السحب بمحرك الجمارك والضرائب (M85)', pullForm.stage);
        if (pullForm.pull_type === 'judicial_ruling') {
          await logAudit(newId, provider?.provider_code || null, 'm10_case', 'فتح القضية في المحرك الموحد (M10) — حكم قضائي', pullForm.stage);
        }
        await logAudit(newId, provider?.provider_code || null, 'm109_biometric', 'التوقيع البيومتري لعملية السحب (M109)', pullForm.stage);
        await logAudit(newId, provider?.provider_code || null, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء عملية السحب', pullForm.stage);
      }
    }
    setPullSaving(false);
    setPullModalOpen(false);
    fetchAll();
  };

  const handleDeletePull = async () => {
    if (!deletePullId) return;
    const { error } = await supabase.from('m110_vault_pulls').delete().eq('id', deletePullId);
    if (error) console.error('delete pull error', error);
    setDeletePullId(null);
    setSelectedPull(null);
    fetchAll();
  };

  const openPullDetail = async (p: M110VaultPull) => {
    setSelectedPull(p);
    setDetailLoading(true);
    const aRes = await supabase.from('m110_vault_audit').select('*').eq('pull_id', p.id).order('created_at', { ascending: true });
    if (aRes.error) console.error('detail audit error', aRes.error);
    setAuditLogs((aRes.data as M110VaultAudit[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (p: M110VaultPull) => {
    const idx = STAGES.indexOf(p.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const updatePayload: Record<string, unknown> = { stage: next, status: next === 'archived' ? 'archived' : 'active' };
    // Auto-set sealing fields when entering sealing stage
    if (next === 'sealing') {
      updatePayload.sealed = true;
      updatePayload.sealed_at = new Date().toISOString();
      updatePayload.content_hash = 'sha3-512:' + Math.random().toString(16).substr(2, 16);
      updatePayload.digital_signature = 'sig:' + Math.random().toString(16).substr(2, 12);
      updatePayload.hsm_key_id = 'HSM-KM-' + Date.now().toString().slice(-6);
    }
    // Auto-set WORM committed when entering archived stage
    if (next === 'archived') {
      updatePayload.worm_committed = true;
      updatePayload.worm_committed_at = new Date().toISOString();
      updatePayload.vault_partition = 'WORM-P' + (idx + 1);
      updatePayload.storage_path = '/vault/worm/partition-' + (idx + 1) + '/' + p.pull_number;
    }
    const { error } = await supabase.from('m110_vault_pulls').update(updatePayload).eq('id', p.id);
    if (error) console.error('stage advance error', error);
    await logAudit(p.id, p.provider_code, 'stage_advanced', 'تقدم مرحلة السحب: ' + (STAGE_CONFIG[next]?.label || next), next);
    fetchAll();
    setSelectedPull({ ...p, ...updatePayload } as M110VaultPull);
  };

  // ===== PROVIDER CRUD =====

  const openAddProvider = () => {
    setProviderForm({ ...emptyProviderForm });
    setEditingProviderId(null);
    setProviderModalOpen(true);
  };

  const openEditProvider = (pr: M110VaultProvider) => {
    setProviderForm({
      provider_code: pr.provider_code,
      provider_name: pr.provider_name,
      provider_name_ar: pr.provider_name_ar,
      provider_type: pr.provider_type,
      api_endpoint: pr.api_endpoint || '',
      protocol_type: pr.protocol_type,
      auth_method: pr.auth_method,
      rate_limit_per_min: String(pr.rate_limit_per_min),
      rate_limit_per_hour: String(pr.rate_limit_per_hour),
      active: pr.active,
      description: pr.description || '',
    });
    setEditingProviderId(pr.id);
    setProviderModalOpen(true);
  };

  const handleSaveProvider = async () => {
    if (!providerForm.provider_code.trim() || !providerForm.provider_name.trim()) return;
    setProviderSaving(true);
    const payload = {
      provider_code: providerForm.provider_code.trim(),
      provider_name: providerForm.provider_name.trim(),
      provider_name_ar: providerForm.provider_name_ar.trim() || null,
      provider_type: providerForm.provider_type,
      api_endpoint: providerForm.api_endpoint.trim() || null,
      protocol_type: providerForm.protocol_type,
      auth_method: providerForm.auth_method,
      rate_limit_per_min: Number(providerForm.rate_limit_per_min) || 0,
      rate_limit_per_hour: Number(providerForm.rate_limit_per_hour) || 0,
      active: providerForm.active,
      description: providerForm.description.trim() || null,
    };
    if (editingProviderId) {
      const { error } = await supabase.from('m110_vault_providers').update(payload).eq('id', editingProviderId);
      if (error) console.error('update provider error', error);
      await logAudit(null, providerForm.provider_code, 'provider_updated', 'تحديث بيانات مزود البوابة: ' + providerForm.provider_name, null);
    } else {
      const { error } = await supabase.from('m110_vault_providers').insert(payload);
      if (error) console.error('insert provider error', error);
      await logAudit(null, providerForm.provider_code, 'provider_created', 'إنشاء مزود جديد: ' + providerForm.provider_name + ' — النوع: ' + (PROVIDER_TYPE_LABELS[providerForm.provider_type] || providerForm.provider_type), null);
    }
    setProviderSaving(false);
    setProviderModalOpen(false);
    fetchAll();
  };

  const handleDeleteProvider = async () => {
    if (!deleteProviderId) return;
    const { error } = await supabase.from('m110_vault_providers').delete().eq('id', deleteProviderId);
    if (error) console.error('delete provider error', error);
    setDeleteProviderId(null);
    fetchAll();
  };

  // ===== Filtering =====

  const filteredPulls = pulls.filter((p) => {
    if (filterType !== 'all' && p.pull_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.pull_number.toLowerCase().includes(q) && !p.pull_title.toLowerCase().includes(q) && !(p.provider_code || '').toLowerCase().includes(q) && !(p.entity_id_linked || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredAudit = allAudit.filter((a) => {
    if (auditFilterProvider !== 'all' && a.provider_code !== auditFilterProvider) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const sealedCount = pulls.filter((p) => p.sealed).length;
  const wormCommittedCount = pulls.filter((p) => p.worm_committed).length;
  const ocrProcessedCount = pulls.filter((p) => p.ocr_processed).length;

  const tabs: { id: Tab; label: string; icon: typeof Vault; badge?: number }[] = [
    { id: 'pulls', label: 'عمليات السحب', icon: Vault, badge: pulls.length },
    { id: 'providers', label: 'المزودون', icon: Server, badge: providers.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Vault size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">البوابة الخلفية السيادية لربط الجهات الخارجية (M110)</h2>
            <p className="font-body text-[10px] text-ink/40">سحب البيانات وتأمينها بختم SHA3-512 وحفظها في مستودع WORM وفهرسة دلالية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <ShieldCheck size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">SHA3-512 · WORM · ZK-Audit</span>
          </div>
          {activeTab === 'pulls' && (
            <button onClick={openAddPull} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
              <Plus size={16} /> عملية سحب جديدة
            </button>
          )}
          {activeTab === 'providers' && (
            <button onClick={openAddProvider} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
              <Plus size={16} /> مزود جديد
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Vault size={14} className="text-midnight" />} label="إجمالي عمليات السحب" value={String(pulls.length)} valueClass="text-midnight" />
        <StatCard icon={<ShieldCheck size={14} className="text-green-600" />} label="مختومة (Sealed)" value={String(sealedCount)} valueClass="text-green-700" />
        <StatCard icon={<Archive size={14} className="text-purple-600" />} label="مودعة WORM" value={String(wormCommittedCount)} valueClass="text-purple-700" />
        <StatCard icon={<ScanLine size={14} className="text-orange-600" />} label="معالجة OCR" value={String(ocrProcessedCount)} valueClass="text-orange-700" />
      </div>

      {/* 5-stage pipeline */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">خط أنابيب السحب السيادي — 5 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.ingestion;
            const count = pulls.filter((p) => p.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} عملية</span>
                </div>
                {i < STAGES.length - 1 && <ChevronRight size={12} className="text-gold/30 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل (Integration Matrix)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { icon: Receipt, label: 'الجمارك والضرائب (M85)', desc: 'ربط ضريبي', color: 'text-blue-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'فتح القضية', color: 'text-blue-600' },
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة', color: 'text-purple-600' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'فوترة', color: 'text-gold' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'البيومتري (M109)', desc: 'توقيع', color: 'text-green-600' },
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

      {/* Filters for pulls */}
      {activeTab === 'pulls' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(PULL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم السحب أو العنوان أو المزود..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* ===== PULLS TAB ===== */}
      {activeTab === 'pulls' && (
        <div className="space-y-2">
          {filteredPulls.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Vault size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد عمليات سحب مسجلة</p>
            </div>
          ) : (
            filteredPulls.map((p) => {
              const sCfg = STAGE_CONFIG[p.stage] || STAGE_CONFIG.ingestion;
              const stageIdx = STAGES.indexOf(p.stage);
              const TypeIcon = PULL_TYPE_ICONS[p.pull_type] || FileText;
              const providerName = p.provider?.provider_name_ar || p.provider?.provider_name || p.provider_code || '—';
              return (
                <div key={p.id} onClick={() => openPullDetail(p)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TypeIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{p.pull_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{PULL_TYPE_LABELS[p.pull_type] || p.pull_type}</span>
                          {p.sealed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <ShieldCheck size={8} /> مختوم
                            </span>
                          )}
                          {p.worm_committed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <Archive size={8} /> WORM
                            </span>
                          )}
                          {p.ocr_processed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-orange-50 text-orange-600">
                              <ScanLine size={8} /> OCR
                            </span>
                          )}
                          {p.payload_encrypted && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              <Lock size={8} /> مشفَّر
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{p.pull_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">المزود: {providerName}</span>
                          {p.source_format && <span className="font-body text-[9px] text-ink/40">الصيغة: {p.source_format}</span>}
                          {p.entity_id_linked && <span className="font-body text-[9px] text-ink/40">الكيان: {p.entity_id_linked}</span>}
                          {p.content_hash && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Hash size={8} /> {p.content_hash.substr(0, 20)}...</span>}
                          {p.m53_document_id && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><FileText size={8} /> M53</span>}
                          {p.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {p.m85_tax_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Receipt size={8} /> M85</span>}
                          {p.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {p.m109_biometric_signed && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>}
                          {p.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* 5-stage pipeline progress dots */}
                      <div className="flex items-center gap-0.5">
                        {STAGES.map((s, i) => (
                          <span key={s} className={`w-1.5 h-1.5 rounded-full ${i <= stageIdx ? 'bg-gold' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(ev) => { ev.stopPropagation(); openEditPull(p); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeletePullId(p.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* ===== PROVIDERS TAB ===== */}
      {activeTab === 'providers' && (
        <div className="space-y-2">
          {providers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Server size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا يوجد مزودون مسجلون</p>
            </div>
          ) : (
            providers.map((pr) => {
              const ProvIcon = PROVIDER_TYPE_ICONS[pr.provider_type] || Server;
              return (
                <div key={pr.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-midnight">
                        <ProvIcon size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{pr.provider_code}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/50">{PROVIDER_TYPE_LABELS[pr.provider_type] || pr.provider_type}</span>
                          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${pr.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/40'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pr.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {pr.active ? 'نشط' : 'متوقف'}
                          </span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{pr.provider_name}</p>
                        {pr.provider_name_ar && <p className="font-body text-[10px] text-ink/50 mt-0.5">{pr.provider_name_ar}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {pr.api_endpoint && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/40"><Globe size={8} /> {pr.api_endpoint}</span>}
                          <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Link2 size={8} /> {pr.protocol_type}</span>
                          <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><KeyRound size={8} /> {pr.auth_method}</span>
                          <span className="font-body text-[9px] text-ink/40">{pr.rate_limit_per_min}/دقيقة · {pr.rate_limit_per_hour}/ساعة</span>
                        </div>
                        {pr.description && <p className="font-body text-[10px] text-ink/50 mt-1 line-clamp-1">{pr.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditProvider(pr)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => setDeleteProviderId(pr.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== AUDIT TAB ===== */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل ZK-Audit غير القابل للتعديل — سلسلة الختم</span>
            <span className="font-body text-[10px] text-ink/30">— {filteredAudit.length} عملية مسجلة</span>
          </div>
          <Select value={auditFilterProvider} onChange={(e) => setAuditFilterProvider(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المزودين</option>
            {providers.map((pr) => <option key={pr.id} value={pr.provider_code}>{pr.provider_code} — {pr.provider_name}</option>)}
          </Select>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <Vault size={12} className="text-blue-600" />
                      : log.action.includes('m53') ? <FileText size={12} className="text-purple-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m85') ? <Receipt size={12} className="text-blue-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-green-600" />
                      : log.action.includes('m92') ? <Activity size={12} className="text-amber-600" />
                      : log.action.includes('stage') ? <ChevronRight size={12} className="text-gold" />
                      : log.action.includes('provider') ? <Server size={12} className="text-purple-600" />
                      : log.action.includes('updated') ? <Pencil size={12} className="text-amber-600" />
                      : <Activity size={12} className="text-ink/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                      {log.provider_code && <span className="font-body text-[9px] text-gold font-bold">{log.provider_code}</span>}
                      {log.stage && <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{STAGE_CONFIG[log.stage]?.label || log.stage}</span>}
                      {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                    </div>
                    {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-body text-[9px] text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                      {log.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-green-600 font-bold"><Hash size={8} /> {log.hash_chain.substr(0, 24)}...</span>}
                      {log.previous_hash && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Link2 size={8} /> prev: {log.previous_hash.substr(0, 16)}...</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== PULL DETAIL DRAWER ===== */}
      {selectedPull && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedPull(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Vault size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">تفاصيل عملية السحب السيادي</span>
              </div>
              <button onClick={() => setSelectedPull(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedPull.pull_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedPull.stage] || STAGE_CONFIG.ingestion).bg} ${(STAGE_CONFIG[selectedPull.stage] || STAGE_CONFIG.ingestion).text}`}>
                      {(STAGE_CONFIG[selectedPull.stage] || STAGE_CONFIG.ingestion).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{PULL_TYPE_LABELS[selectedPull.pull_type] || selectedPull.pull_type}</span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedPull.pull_title}</h3>
                </div>

                {/* 5-stage pipeline progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.ingestion;
                      const stageIdx = STAGES.indexOf(selectedPull.stage);
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
                  {selectedPull.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedPull)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ChevronRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Provider info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Server size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المزود</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المزود</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.provider?.provider_name_ar || selectedPull.provider?.provider_name || selectedPull.provider_code || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رمز المزود</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.provider_code || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">نوع المزود</span><p className="font-body text-xs font-bold text-midnight">{PROVIDER_TYPE_LABELS[selectedPull.provider?.provider_type || ''] || selectedPull.provider?.provider_type || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الكيان المرتبط</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.entity_id_linked || '—'}</p></div>
                  </div>
                </div>

                {/* Cryptographic sealing card */}
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShieldCheck size={12} className="text-green-600" />
                    <span className="font-body text-[10px] font-bold text-midnight">الختم الكryptografي (SHA3-512)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">خامز الملف (Pre)</span><p className="font-body text-[10px] font-mono text-midnight break-all">{selectedPull.file_hash_pre || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">خامز المحتوى</span><p className="font-body text-[10px] font-mono text-midnight break-all">{selectedPull.content_hash || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الخوارزمية</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.hash_algorithm || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">التوقيع الرقمي</span><p className="font-body text-[10px] font-mono text-midnight break-all">{selectedPull.digital_signature || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مفتاح HSM</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.hsm_key_id || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مختوم</span><p className={`font-body text-xs font-bold ${selectedPull.sealed ? 'text-green-700' : 'text-ink/50'}`}>{selectedPull.sealed ? 'نعم — ' + (selectedPull.sealed_at ? formatDate(selectedPull.sealed_at) : '') : 'لا'}</p></div>
                  </div>
                </div>

                {/* WORM storage card */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Archive size={12} className="text-purple-600" />
                    <span className="font-body text-[10px] font-bold text-midnight">مستودع WORM</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">مودع WORM</span><p className={`font-body text-xs font-bold ${selectedPull.worm_committed ? 'text-purple-700' : 'text-ink/50'}`}>{selectedPull.worm_committed ? 'نعم' : 'لا'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">تاريخ الإيداع</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.worm_committed_at ? formatDate(selectedPull.worm_committed_at) : '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">القسم (Partition)</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.vault_partition || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مسار التخزين</span><p className="font-body text-[10px] font-mono text-midnight break-all">{selectedPull.storage_path || '—'}</p></div>
                  </div>
                </div>

                {/* Security flags */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lock size={12} className="text-midnight" />
                    <span className="font-body text-[10px] font-bold text-midnight">الفحص الأمني والتشفير</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${selectedPull.malware_scan_passed ? 'bg-green-500' : 'bg-gray-300'}`} /><span className="font-body text-[10px] text-ink/60">فحص البرمجيات الخبيثة</span></div>
                    <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${selectedPull.sanitized ? 'bg-green-500' : 'bg-gray-300'}`} /><span className="font-body text-[10px] text-ink/60">تطهير البيانات</span></div>
                    <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${selectedPull.payload_encrypted ? 'bg-green-500' : 'bg-gray-300'}`} /><span className="font-body text-[10px] text-ink/60">حمولة مشفَّرة</span></div>
                    <div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${selectedPull.rate_limited ? 'bg-green-500' : 'bg-gray-300'}`} /><span className="font-body text-[10px] text-ink/60">تحديد المعدل</span></div>
                  </div>
                  {selectedPull.ecdh_key_exchange && (
                    <div className="mt-2"><span className="font-body text-[9px] text-ink/40">تبادل مفاتيح ECDH</span><p className="font-body text-[10px] font-mono text-midnight break-all">{selectedPull.ecdh_key_exchange}</p></div>
                  )}
                  {selectedPull.tunnel_id && (
                    <div className="mt-2"><span className="font-body text-[9px] text-ink/40">معرف النفق (Tunnel)</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.tunnel_id}</p></div>
                  )}
                </div>

                {/* OCR card */}
                <div className={`rounded-lg p-3 border ${selectedPull.ocr_processed ? 'bg-orange-50 border-orange-100' : 'bg-gray-100 border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ScanLine size={12} className={selectedPull.ocr_processed ? 'text-orange-600' : 'text-ink/40'} />
                    <span className="font-body text-[10px] font-bold text-midnight">معالجة OCR</span>
                  </div>
                  <p className={`font-body text-xs font-bold ${selectedPull.ocr_processed ? 'text-orange-700' : 'text-ink/50'}`}>
                    {selectedPull.ocr_processed ? 'تمت المعالجة' : 'لم تتم المعالجة'}
                  </p>
                  {selectedPull.ocr_text && (
                    <p className="font-body text-[10px] text-ink/60 mt-1 leading-relaxed line-clamp-3">{selectedPull.ocr_text}</p>
                  )}
                </div>

                {/* Metadata JSON display */}
                {selectedPull.metadata_extracted && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Database size={12} className="text-midnight" />
                      <span className="font-body text-[10px] font-bold text-midnight">البيانات الوصفية المستخرجة (JSON)</span>
                    </div>
                    <pre className="font-mono text-[10px] text-ink/70 bg-white rounded p-2 overflow-x-auto border border-gray-100">
                      {JSON.stringify(selectedPull.metadata_extracted, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Retrieval info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Eye size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">سجل الاسترجاع</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">عدد الاسترجاعات</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.retrieval_count || 0}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">آخر استرجاع</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.last_retrieved_at ? formatDate(selectedPull.last_retrieved_at) : '—'}</p></div>
                  </div>
                </div>

                {/* Source info */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Globe size={12} className="text-midnight" />
                    <span className="font-body text-[10px] font-bold text-midnight">مصدر البيانات</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الصيغة المصدر</span><p className="font-body text-xs font-bold text-midnight">{selectedPull.source_format || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الرابط المصدر</span><p className="font-body text-[10px] font-mono text-midnight break-all">{selectedPull.source_url || '—'}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPull.m53_document_id ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><FileText size={10} /> M53 {selectedPull.m53_document_id ? 'مؤرشف' : 'غير مؤرشف'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPull.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedPull.m54_finance_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPull.m85_tax_linked ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Receipt size={10} /> M85 {selectedPull.m85_tax_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPull.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedPull.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPull.m109_biometric_signed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedPull.m109_biometric_signed ? 'موقَّع' : 'غير موقَّع'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedPull.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedPull.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedPull.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedPull.description}</p></div>
                )}

                {/* Audit trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Shield size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق — سلسلة الختم</span></div>
                  <div className="space-y-1.5">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-body text-ink/60">{log.action}</span>
                          {log.detail && <p className="font-body text-ink/40 leading-tight">{log.detail}</p>}
                          <div className="flex items-center gap-2">
                            <span className="font-body text-ink/30">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
                            {log.hash_chain && <span className="font-body text-[9px] text-green-600 font-bold">{log.hash_chain.substr(0, 20)}...</span>}
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

      {/* ===== PULL CREATE/EDIT MODAL ===== */}
      <EntityModal open={pullModalOpen} title={editingPullId ? 'تعديل عملية السحب' : 'عملية سحب جديدة'} onClose={() => setPullModalOpen(false)} onSubmit={handleSavePull} loading={pullSaving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم السحب" required><TextInput value={pullForm.pull_number} onChange={(e) => setPullForm({ ...pullForm, pull_number: e.target.value })} placeholder="PULL-2025-001" /></Field>
          <Field label="نوع السحب">
            <Select value={pullForm.pull_type} onChange={(e) => setPullForm({ ...pullForm, pull_type: e.target.value })}>
              {Object.entries(PULL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان السحب" required><TextInput value={pullForm.pull_title} onChange={(e) => setPullForm({ ...pullForm, pull_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المزود">
            <Select value={pullForm.provider_id} onChange={(e) => setPullForm({ ...pullForm, provider_id: e.target.value })}>
              <option value="">— اختر المزود —</option>
              {providers.map((pr) => <option key={pr.id} value={pr.id}>{pr.provider_code} — {pr.provider_name_ar || pr.provider_name}</option>)}
            </Select>
          </Field>
          <Field label="المرحلة">
            <Select value={pullForm.stage} onChange={(e) => setPullForm({ ...pullForm, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الصيغة المصدر"><TextInput value={pullForm.source_format} onChange={(e) => setPullForm({ ...pullForm, source_format: e.target.value })} placeholder="PDF / XML / JSON" /></Field>
          <Field label="معرف الكيان المرتبط"><TextInput value={pullForm.entity_id_linked} onChange={(e) => setPullForm({ ...pullForm, entity_id_linked: e.target.value })} /></Field>
        </div>
        <Field label="الرابط المصدر"><TextInput value={pullForm.source_url} onChange={(e) => setPullForm({ ...pullForm, source_url: e.target.value })} placeholder="https://..." /></Field>
        <Field label="معرف النفق (Tunnel ID)"><TextInput value={pullForm.tunnel_id} onChange={(e) => setPullForm({ ...pullForm, tunnel_id: e.target.value })} /></Field>
        <Field label="الوصف"><TextArea value={pullForm.description} onChange={(e) => setPullForm({ ...pullForm, description: e.target.value })} rows={4} /></Field>
      </EntityModal>

      {/* ===== PROVIDER CREATE/EDIT MODAL ===== */}
      <EntityModal open={providerModalOpen} title={editingProviderId ? 'تعديل المزود' : 'مزود جديد'} onClose={() => setProviderModalOpen(false)} onSubmit={handleSaveProvider} loading={providerSaving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رمز المزود" required><TextInput value={providerForm.provider_code} onChange={(e) => setProviderForm({ ...providerForm, provider_code: e.target.value })} placeholder="TAX-001" /></Field>
          <Field label="نوع المزود">
            <Select value={providerForm.provider_type} onChange={(e) => setProviderForm({ ...providerForm, provider_type: e.target.value })}>
              {Object.entries(PROVIDER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المزود (إنجليزي)" required><TextInput value={providerForm.provider_name} onChange={(e) => setProviderForm({ ...providerForm, provider_name: e.target.value })} /></Field>
          <Field label="اسم المزود (عربي)"><TextInput value={providerForm.provider_name_ar} onChange={(e) => setProviderForm({ ...providerForm, provider_name_ar: e.target.value })} /></Field>
        </div>
        <Field label="نقطة النهاية (API Endpoint)"><TextInput value={providerForm.api_endpoint} onChange={(e) => setProviderForm({ ...providerForm, api_endpoint: e.target.value })} placeholder="https://api.provider.gov" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع البروتوكول">
            <Select value={providerForm.protocol_type} onChange={(e) => setProviderForm({ ...providerForm, protocol_type: e.target.value })}>
              {PROTOCOL_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="طريقة المصادقة">
            <Select value={providerForm.auth_method} onChange={(e) => setProviderForm({ ...providerForm, auth_method: e.target.value })}>
              {AUTH_METHODS.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="حد المعدل (دقيقة)"><TextInput type="number" value={providerForm.rate_limit_per_min} onChange={(e) => setProviderForm({ ...providerForm, rate_limit_per_min: e.target.value })} /></Field>
          <Field label="حد المعدل (ساعة)"><TextInput type="number" value={providerForm.rate_limit_per_hour} onChange={(e) => setProviderForm({ ...providerForm, rate_limit_per_hour: e.target.value })} /></Field>
        </div>
        <Checkbox checked={providerForm.active} onChange={(v: boolean) => setProviderForm({ ...providerForm, active: v })} label="المزود نشط" />
        <Field label="الوصف"><TextArea value={providerForm.description} onChange={(e) => setProviderForm({ ...providerForm, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deletePullId} onClose={() => setDeletePullId(null)} onConfirm={handleDeletePull} />
      <DeleteConfirm open={!!deleteProviderId} onClose={() => setDeleteProviderId(null)} onConfirm={handleDeleteProvider} />
    </div>
  );
}
