import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Network, Cpu, GitBranch,
  Workflow, Lock, Radio, Zap, Layers, Target, ArrowLeftRight,
  FileText, Scale, Gavel, Building2,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M111SwarmCluster, M111SwarmMission, M111SwarmCommunication,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'clusters' | 'missions' | 'communications';

const CLUSTER_TYPE_LABELS: Record<string, string> = {
  judicial: 'قضائي',
  financial: 'مالي',
  ip_tech: 'ملكية فكرية',
  corporate: 'مؤسسي',
  trade: 'تجاري',
  civil: 'مدني',
  sectoral: 'قطاعي',
  governance: 'حوكمة',
  infrastructure: 'بنية تحتية',
  operations: 'عمليات',
  legal_ops: 'عمليات قانونية',
  gov_ops: 'عمليات حكومية',
};

const CLUSTER_TYPE_ICONS: Record<string, typeof Network> = {
  judicial: Gavel,
  financial: Activity,
  ip_tech: Cpu,
  corporate: Building2,
  trade: Network,
  civil: Scale,
  sectoral: Layers,
  governance: Shield,
  infrastructure: Workflow,
  operations: Cpu,
  legal_ops: Scale,
  gov_ops: Building2,
};

const DECISION_AUTHORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  autonomous: { label: 'مستقل', bg: 'bg-green-50', text: 'text-green-700' },
  advisory: { label: 'استشاري', bg: 'bg-amber-50', text: 'text-amber-700' },
  restricted: { label: 'مقيّد', bg: 'bg-red-50', text: 'text-red-700' },
};

const MISSION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  decomposed: { label: 'مفكك', bg: 'bg-blue-50', text: 'text-blue-700' },
  delegating: { label: 'مفوض', bg: 'bg-amber-50', text: 'text-amber-700' },
  executing: { label: 'قيد التنفيذ', bg: 'bg-orange-50', text: 'text-orange-700' },
  synthesizing: { label: 'تجميع', bg: 'bg-purple-50', text: 'text-purple-700' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700' },
  failed: { label: 'فشل', bg: 'bg-red-50', text: 'text-red-700' },
};

const MISSION_STAGES = ['decomposed', 'delegating', 'executing', 'synthesizing', 'completed'];

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-700' },
  high: { label: 'عالي', bg: 'bg-orange-50', text: 'text-orange-700' },
  normal: { label: 'عادي', bg: 'bg-blue-50', text: 'text-blue-700' },
  low: { label: 'منخفض', bg: 'bg-gray-100', text: 'text-gray-700' },
};

const MESSAGE_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof Radio }> = {
  decompose: { label: 'تفكيك', bg: 'bg-blue-50', text: 'text-blue-700', icon: GitBranch },
  delegate: { label: 'تفويض', bg: 'bg-amber-50', text: 'text-amber-700', icon: ArrowLeftRight },
  execute: { label: 'تنفيذ', bg: 'bg-orange-50', text: 'text-orange-700', icon: Zap },
  result: { label: 'نتيجة', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
  error: { label: 'خطأ', bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle },
  heartbeat: { label: 'نبضة', bg: 'bg-gray-100', text: 'text-gray-700', icon: Activity },
};

interface ClusterForm {
  cluster_code: string;
  cluster_name: string;
  cluster_name_ar: string;
  cluster_type: string;
  sub_agent_name: string;
  sub_agent_name_ar: string;
  engines_linked: string;
  autonomous_scope: string;
  decision_authority: string;
  active: boolean;
}

const emptyClusterForm: ClusterForm = {
  cluster_code: '', cluster_name: '', cluster_name_ar: '',
  cluster_type: 'judicial', sub_agent_name: '', sub_agent_name_ar: '',
  engines_linked: '', autonomous_scope: '', decision_authority: 'advisory',
  active: true,
};

interface MissionForm {
  mission_number: string;
  mission_title: string;
  cluster_id: string;
  cluster_code: string;
  commander_id: string;
  parent_mission_id: string;
  status: string;
  priority: string;
  decomposed_tasks: string;
  execution_plan: string;
  autonomous_execution: boolean;
  result_fingerprint: string;
  result_summary: string;
  encrypted: boolean;
  m92_notified: boolean;
  m109_biometric_required: boolean;
  m109_biometric_signed: boolean;
  scope_permissions: string;
  knowledge_graph_refs: string;
}

const emptyMissionForm: MissionForm = {
  mission_number: '', mission_title: '', cluster_id: '', cluster_code: '',
  commander_id: '', parent_mission_id: '', status: 'decomposed', priority: 'normal',
  decomposed_tasks: '', execution_plan: '', autonomous_execution: false,
  result_fingerprint: '', result_summary: '', encrypted: false,
  m92_notified: false, m109_biometric_required: false, m109_biometric_signed: false,
  scope_permissions: '', knowledge_graph_refs: '',
};

export default function SwarmIntelligenceEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [clusters, setClusters] = useState<M111SwarmCluster[]>([]);
  const [missions, setMissions] = useState<M111SwarmMission[]>([]);
  const [communications, setCommunications] = useState<M111SwarmCommunication[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('clusters');
  const [selectedMission, setSelectedMission] = useState<M111SwarmMission | null>(null);
  const [missionComms, setMissionComms] = useState<M111SwarmCommunication[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cluster modal state
  const [clusterModalOpen, setClusterModalOpen] = useState(false);
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
  const [clusterForm, setClusterForm] = useState<ClusterForm>(emptyClusterForm);
  const [clusterSaving, setClusterSaving] = useState(false);
  const [deleteClusterId, setDeleteClusterId] = useState<string | null>(null);

  // Mission modal state
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [missionForm, setMissionForm] = useState<MissionForm>(emptyMissionForm);
  const [missionSaving, setMissionSaving] = useState(false);
  const [deleteMissionId, setDeleteMissionId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClusterType, setFilterClusterType] = useState('all');
  const [filterMissionStatus, setFilterMissionStatus] = useState('all');
  const [filterCommMission, setFilterCommMission] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cRes, mRes, commRes, attRes] = await Promise.all([
      supabase.from('m111_swarm_clusters')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('m111_swarm_missions')
        .select('*, cluster:m111_swarm_clusters(*)')
        .order('created_at', { ascending: false }),
      supabase.from('m111_swarm_communications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    if (cRes.error) console.error('m111 clusters fetch error', cRes.error);
    if (mRes.error) console.error('m111 missions fetch error', mRes.error);
    if (commRes.error) console.error('m111 communications fetch error', commRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    setClusters((cRes.data as M111SwarmCluster[]) || []);
    setMissions((mRes.data as M111SwarmMission[]) || []);
    setCommunications((commRes.data as M111SwarmCommunication[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      if (activeTab === 'clusters') {
        setClusterForm({ ...emptyClusterForm, cluster_name: cmd.fields.title || '' });
        setEditingClusterId(null);
        setClusterModalOpen(true);
      } else if (activeTab === 'missions') {
        setMissionForm({ ...emptyMissionForm, mission_title: cmd.fields.title || '' });
        setEditingMissionId(null);
        setMissionModalOpen(true);
      }
    }
  }, [voiceAdd, activeTab]);

  // ---- Communication logger (hash_chain + previous_hash) ----
  const logCommunication = async (
    missionId: string | null,
    fromCluster: string,
    toCluster: string | null,
    messageType: string,
    content: string,
    encrypted: boolean,
  ) => {
    // Fetch previous hash for chain continuity
    const prevRes = await supabase.from('m111_swarm_communications')
      .select('hash_chain')
      .order('created_at', { ascending: false })
      .limit(1);
    const previousHash = (prevRes.data && prevRes.data.length > 0) ? (prevRes.data[0].hash_chain || null) : null;
    const hash = '0x' + Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8);
    const { error } = await supabase.from('m111_swarm_communications').insert({
      mission_id: missionId,
      from_cluster: fromCluster,
      to_cluster: toCluster,
      message_type: messageType,
      message_content: content,
      encrypted,
      hash_chain: hash,
      previous_hash: previousHash,
    });
    if (error) console.error('communication log error', error);
    console.log('[M111 Swarm Communication] logged:', {
      message_type: messageType,
      from_cluster: fromCluster,
      to_cluster: toCluster,
      hash_chain: hash,
      previous_hash: previousHash,
    });
  };

  // ---- Cluster CRUD ----
  const openAddCluster = () => {
    setClusterForm(emptyClusterForm);
    setEditingClusterId(null);
    setClusterModalOpen(true);
  };

  const openEditCluster = (c: M111SwarmCluster) => {
    setClusterForm({
      cluster_code: c.cluster_code,
      cluster_name: c.cluster_name,
      cluster_name_ar: c.cluster_name_ar || '',
      cluster_type: c.cluster_type,
      sub_agent_name: c.sub_agent_name || '',
      sub_agent_name_ar: c.sub_agent_name_ar || '',
      engines_linked: Array.isArray(c.engines_linked) ? c.engines_linked.join(', ') : '',
      autonomous_scope: c.autonomous_scope || '',
      decision_authority: c.decision_authority || 'advisory',
      active: !!c.active,
    });
    setEditingClusterId(c.id);
    setClusterModalOpen(true);
  };

  const handleSaveCluster = async () => {
    if (!clusterForm.cluster_code.trim() || !clusterForm.cluster_name.trim()) return;
    setClusterSaving(true);
    const enginesArr = clusterForm.engines_linked.split(',').map((e) => e.trim()).filter(Boolean);
    const payload = {
      cluster_code: clusterForm.cluster_code.trim(),
      cluster_name: clusterForm.cluster_name.trim(),
      cluster_name_ar: clusterForm.cluster_name_ar.trim() || null,
      cluster_type: clusterForm.cluster_type,
      sub_agent_name: clusterForm.sub_agent_name.trim() || null,
      sub_agent_name_ar: clusterForm.sub_agent_name_ar.trim() || null,
      engines_linked: enginesArr,
      autonomous_scope: clusterForm.autonomous_scope.trim() || null,
      decision_authority: clusterForm.decision_authority,
      active: clusterForm.active,
    };
    if (editingClusterId) {
      const { error } = await supabase.from('m111_swarm_clusters').update(payload).eq('id', editingClusterId);
      if (error) console.error('cluster update error', error);
      await logCommunication(null, clusterForm.cluster_code, null, 'heartbeat', 'تحديث بيانات العنقود: ' + clusterForm.cluster_name, false);
    } else {
      const { data, error } = await supabase.from('m111_swarm_clusters').insert(payload).select('id');
      if (error) console.error('cluster insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logCommunication(null, clusterForm.cluster_code, 'M92', 'delegate', 'إنشاء عنقود جديد — الوكيل الفرعي: ' + (clusterForm.sub_agent_name || 'غير محدد'), false);
      }
    }
    setClusterSaving(false);
    setClusterModalOpen(false);
    fetchAll();
  };

  const handleDeleteCluster = async () => {
    if (!deleteClusterId) return;
    const { error } = await supabase.from('m111_swarm_clusters').delete().eq('id', deleteClusterId);
    if (error) console.error('cluster delete error', error);
    setDeleteClusterId(null);
    fetchAll();
  };

  // ---- Mission CRUD ----
  const openAddMission = () => {
    const autoNum = 'MSN-2025-' + String(missions.length + 1).padStart(3, '0');
    setMissionForm({ ...emptyMissionForm, mission_number: autoNum });
    setEditingMissionId(null);
    setMissionModalOpen(true);
  };

  const openEditMission = (m: M111SwarmMission) => {
    setMissionForm({
      mission_number: m.mission_number,
      mission_title: m.mission_title,
      cluster_id: m.cluster_id || '',
      cluster_code: m.cluster_code || '',
      commander_id: m.commander_id || '',
      parent_mission_id: m.parent_mission_id || '',
      status: m.status,
      priority: m.priority,
      decomposed_tasks: m.decomposed_tasks ? JSON.stringify(m.decomposed_tasks, null, 2) : '',
      execution_plan: m.execution_plan || '',
      autonomous_execution: !!m.autonomous_execution,
      result_fingerprint: m.result_fingerprint || '',
      result_summary: m.result_summary || '',
      encrypted: !!m.encrypted,
      m92_notified: !!m.m92_notified,
      m109_biometric_required: !!m.m109_biometric_required,
      m109_biometric_signed: !!m.m109_biometric_signed,
      scope_permissions: Array.isArray(m.scope_permissions) ? m.scope_permissions.join(', ') : '',
      knowledge_graph_refs: Array.isArray(m.knowledge_graph_refs) ? m.knowledge_graph_refs.join(', ') : '',
    });
    setEditingMissionId(m.id);
    setMissionModalOpen(true);
  };

  const handleSaveMission = async () => {
    if (!missionForm.mission_title.trim() || !missionForm.mission_number.trim()) return;
    setMissionSaving(true);
    let decomposedTasksParsed: Record<string, unknown>[] | null = null;
    if (missionForm.decomposed_tasks.trim()) {
      try { decomposedTasksParsed = JSON.parse(missionForm.decomposed_tasks); } catch { decomposedTasksParsed = null; }
    }
    const scopeArr = missionForm.scope_permissions.split(',').map((s) => s.trim()).filter(Boolean);
    const kgArr = missionForm.knowledge_graph_refs.split(',').map((s) => s.trim()).filter(Boolean);
    const selectedCluster = clusters.find((c) => c.id === missionForm.cluster_id);
    const payload = {
      mission_number: missionForm.mission_number.trim(),
      mission_title: missionForm.mission_title.trim(),
      cluster_id: missionForm.cluster_id || null,
      cluster_code: selectedCluster?.cluster_code || missionForm.cluster_code.trim() || null,
      commander_id: missionForm.commander_id || null,
      parent_mission_id: missionForm.parent_mission_id || null,
      status: missionForm.status,
      priority: missionForm.priority,
      decomposed_tasks: decomposedTasksParsed,
      execution_plan: missionForm.execution_plan.trim() || null,
      autonomous_execution: missionForm.autonomous_execution,
      result_fingerprint: missionForm.result_fingerprint.trim() || null,
      result_summary: missionForm.result_summary.trim() || null,
      encrypted: missionForm.encrypted,
      m92_notified: missionForm.m92_notified,
      m109_biometric_required: missionForm.m109_biometric_required,
      m109_biometric_signed: missionForm.m109_biometric_signed,
      scope_permissions: scopeArr,
      knowledge_graph_refs: kgArr,
    };
    if (editingMissionId) {
      const { error } = await supabase.from('m111_swarm_missions').update(payload).eq('id', editingMissionId);
      if (error) console.error('mission update error', error);
      await logCommunication(editingMissionId, selectedCluster?.cluster_code || 'M92', 'M92', 'result', 'تحديث المهمة: ' + missionForm.mission_title, missionForm.encrypted);
    } else {
      const { data, error } = await supabase.from('m111_swarm_missions').insert(payload).select('id');
      if (error) console.error('mission insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logCommunication(newId, 'M92', selectedCluster?.cluster_code || null, 'decompose', 'تفكيك المهمة: ' + missionForm.mission_title, missionForm.encrypted);
        await logCommunication(newId, 'M92', selectedCluster?.cluster_code || null, 'delegate', 'تفويض المهمة للعنقود: ' + (selectedCluster?.cluster_name || 'غير محدد'), missionForm.encrypted);
        if (missionForm.m92_notified) {
          await logCommunication(newId, selectedCluster?.cluster_code || 'M92', 'M92', 'heartbeat', 'إخطار M92 بإنشاء المهمة', false);
        }
        if (missionForm.m109_biometric_required) {
          await logCommunication(newId, selectedCluster?.cluster_code || 'M92', 'M109', 'execute', 'طلب التوقيع البيومتري (M109) للمهمة', missionForm.encrypted);
        }
      }
    }
    setMissionSaving(false);
    setMissionModalOpen(false);
    fetchAll();
  };

  const handleDeleteMission = async () => {
    if (!deleteMissionId) return;
    const { error } = await supabase.from('m111_swarm_missions').delete().eq('id', deleteMissionId);
    if (error) console.error('mission delete error', error);
    setDeleteMissionId(null);
    setSelectedMission(null);
    fetchAll();
  };

  const openMissionDetail = async (m: M111SwarmMission) => {
    setSelectedMission(m);
    setDetailLoading(true);
    const cRes = await supabase.from('m111_swarm_communications')
      .select('*')
      .eq('mission_id', m.id)
      .order('created_at', { ascending: true });
    if (cRes.error) console.error('detail communications error', cRes.error);
    setMissionComms((cRes.data as M111SwarmCommunication[]) || []);
    setDetailLoading(false);
  };

  const advanceMissionStage = async (m: M111SwarmMission) => {
    const idx = MISSION_STAGES.indexOf(m.status);
    if (idx < 0 || idx >= MISSION_STAGES.length - 1) return;
    const next = MISSION_STAGES[idx + 1];
    const { error } = await supabase.from('m111_swarm_missions').update({ status: next }).eq('id', m.id);
    if (error) console.error('mission stage advance error', error);
    const msgType = next === 'delegating' ? 'delegate' : next === 'executing' ? 'execute' : next === 'synthesizing' ? 'result' : 'result';
    await logCommunication(m.id, m.cluster_code || 'M92', 'M92', msgType, 'تقدم المرحلة: ' + (MISSION_STATUS_CONFIG[next]?.label || next), m.encrypted);
    fetchAll();
    setSelectedMission({ ...m, status: next } as M111SwarmMission);
  };

  // ---- Filters ----
  const filteredClusters = clusters.filter((c) => {
    if (filterClusterType !== 'all' && c.cluster_type !== filterClusterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!c.cluster_code.toLowerCase().includes(q) && !c.cluster_name.toLowerCase().includes(q) && !(c.cluster_name_ar || '').toLowerCase().includes(q) && !(c.sub_agent_name || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredMissions = missions.filter((m) => {
    if (filterMissionStatus !== 'all' && m.status !== filterMissionStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!m.mission_number.toLowerCase().includes(q) && !m.mission_title.toLowerCase().includes(q) && !(m.cluster_code || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredCommunications = communications.filter((c) => {
    if (filterCommMission !== 'all' && c.mission_id !== filterCommMission) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeClustersCount = clusters.filter((c) => c.active).length;
  const autonomousClustersCount = clusters.filter((c) => c.decision_authority === 'autonomous').length;
  const executingMissionsCount = missions.filter((m) => m.status === 'executing' || m.status === 'delegating').length;
  const completedMissionsCount = missions.filter((m) => m.status === 'completed').length;

  const tabs: { id: Tab; label: string; icon: typeof Network; badge?: number }[] = [
    { id: 'clusters', label: 'العناقود الذكية', icon: Network, badge: clusters.length },
    { id: 'missions', label: 'المهام المفككة', icon: Target, badge: missions.length },
    { id: 'communications', label: 'سجل الاتصالات', icon: Radio, badge: communications.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Network size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الذكاء الاصطناعي العنقودي اللامركزي (M111)</h2>
            <p className="font-body text-[10px] text-ink/40">نظام لامركزي يوزع المهام على وكلاء فرعيين قطاعيين مستقلين تحت إشراف M92</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Decentralized · ZK-Chain</span>
          </div>
          {activeTab === 'clusters' && (
            <button onClick={openAddCluster} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
              <Plus size={16} /> عنقود جديد
            </button>
          )}
          {activeTab === 'missions' && (
            <button onClick={openAddMission} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
              <Plus size={16} /> مهمة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Network size={14} className="text-midnight" />} label="إجمالي العناقود" value={String(clusters.length)} valueClass="text-midnight" />
        <StatCard icon={<Zap size={14} className="text-green-600" />} label="عناقود مستقلة" value={String(autonomousClustersCount)} valueClass="text-green-700" />
        <StatCard icon={<Target size={14} className="text-orange-600" />} label="مهام قيد التنفيذ" value={String(executingMissionsCount)} valueClass="text-orange-700" />
        <StatCard icon={<CheckCircle2 size={14} className="text-gold" />} label="مهام مكتملة" value={String(completedMissionsCount)} valueClass="text-gold" />
      </div>

      {/* 4-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة المهمة العنقودية — 4 مراحل (Decompose → Delegate → Execute → Synthesize)</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {MISSION_STAGES.map((stage, i) => {
            const cfg = MISSION_STATUS_CONFIG[stage] || MISSION_STATUS_CONFIG.decomposed;
            const count = missions.filter((m) => m.status === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[130px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} مهمة</span>
                </div>
                {i < MISSION_STAGES.length - 1 && <ChevronRight size={12} className="text-gold/30 flex-shrink-0" />}
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
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنسيق وإشراف', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'البوابة البيومترية (M109)', desc: 'توقيع المهام', color: 'text-green-600' },
            { icon: GitBranch, label: 'الذكاء العصبي (M112)', desc: 'مراجع الرسم البياني', color: 'text-purple-600' },
            { icon: Lock, label: 'التشفير (M108)', desc: 'اتصالات مشفرة', color: 'text-blue-600' },
            { icon: FileText, label: 'المستندات (M53)', desc: 'أرشفة النتائج', color: 'text-purple-600' },
            { icon: Scale, label: 'نواة القضية (M10)', desc: 'ربط قانوني', color: 'text-blue-600' },
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

      {/* Filters */}
      {activeTab === 'clusters' && (
        <div className="flex items-center gap-2">
          <Select value={filterClusterType} onChange={(e) => setFilterClusterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(CLUSTER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برمز العنقود أو الاسم..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {activeTab === 'missions' && (
        <div className="flex items-center gap-2">
          <Select value={filterMissionStatus} onChange={(e) => setFilterMissionStatus(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الحالات</option>
            {Object.entries(MISSION_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم المهمة أو العنوان..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {activeTab === 'communications' && (
        <div className="flex items-center gap-2">
          <Select value={filterCommMission} onChange={(e) => setFilterCommMission(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل المهام</option>
            {missions.map((m) => <option key={m.id} value={m.id}>{m.mission_number}</option>)}
          </Select>
        </div>
      )}

      {/* Clusters tab */}
      {activeTab === 'clusters' && (
        <div className="space-y-2">
          {filteredClusters.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Network size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد عناقود ذكية مسجلة</p>
            </div>
          ) : (
            filteredClusters.map((c) => {
              const TypeIcon = CLUSTER_TYPE_ICONS[c.cluster_type] || Network;
              const daCfg = DECISION_AUTHORITY_CONFIG[c.decision_authority] || DECISION_AUTHORITY_CONFIG.advisory;
              return (
                <div key={c.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-midnight">
                        <TypeIcon size={14} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-[10px] font-bold text-gold">{c.cluster_code}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/50">{CLUSTER_TYPE_LABELS[c.cluster_type] || c.cluster_type}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${daCfg.bg} ${daCfg.text}`}>{daCfg.label}</span>
                          {c.active ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600"><CheckCircle2 size={8} /> نشط</span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/40"><Clock size={8} /> متوقف</span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug">{c.cluster_name}</p>
                        {c.cluster_name_ar && <p className="font-body text-[10px] text-ink/50 mt-0.5">{c.cluster_name_ar}</p>}
                        {c.sub_agent_name && (
                          <div className="flex items-center gap-1 mt-1">
                            <Cpu size={10} className="text-ink/30" />
                            <span className="font-body text-[9px] text-ink/50">الوكيل الفرعي: {c.sub_agent_name}</span>
                            {c.sub_agent_name_ar && <span className="font-body text-[9px] text-ink/40">({c.sub_agent_name_ar})</span>}
                          </div>
                        )}
                        {Array.isArray(c.engines_linked) && c.engines_linked.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <Layers size={10} className="text-ink/30" />
                            {c.engines_linked.map((eng, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gold/10 text-gold border border-gold/20">{eng}</span>
                            ))}
                          </div>
                        )}
                        {c.autonomous_scope && <p className="font-body text-[9px] text-ink/40 mt-1 leading-tight">النطاق: {c.autonomous_scope}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEditCluster(c)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => setDeleteClusterId(c.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Missions tab */}
      {activeTab === 'missions' && (
        <div className="space-y-2">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Target size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد مهام عنقودية مسجلة</p>
            </div>
          ) : (
            filteredMissions.map((m) => {
              const sCfg = MISSION_STATUS_CONFIG[m.status] || MISSION_STATUS_CONFIG.decomposed;
              const pCfg = PRIORITY_CONFIG[m.priority] || PRIORITY_CONFIG.normal;
              const stageIdx = MISSION_STAGES.indexOf(m.status);
              const clusterName = m.cluster?.cluster_name || m.cluster_code || '—';
              const tasks = Array.isArray(m.decomposed_tasks) ? m.decomposed_tasks : [];
              return (
                <div key={m.id} onClick={() => openMissionDetail(m)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <Target size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body text-[10px] font-bold text-gold">{m.mission_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{clusterName}</span>
                          {m.autonomous_execution && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600"><Zap size={8} /> تنفيذ ذاتي</span>
                          )}
                          {m.encrypted && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600"><Lock size={8} /> مشفّر</span>
                          )}
                          {m.m92_notified && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>
                          )}
                          {m.m109_biometric_signed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600"><BadgeCheck size={8} /> M109</span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{m.mission_title}</p>
                        {tasks.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <GitBranch size={10} className="text-ink/30" />
                            {tasks.slice(0, 4).map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-50 text-ink/50 border border-gray-100">
                                {typeof t === 'object' && t !== null && 'name' in t ? String((t as Record<string, unknown>).name) : `مهمة ${idx + 1}`}
                              </span>
                            ))}
                            {tasks.length > 4 && <span className="font-body text-[9px] text-ink/40">+{tasks.length - 4}</span>}
                          </div>
                        )}
                        {m.result_summary && <p className="font-body text-[9px] text-ink/40 mt-1 leading-tight line-clamp-1">النتيجة: {m.result_summary}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-0.5">
                        {MISSION_STAGES.map((s, i) => (
                          <span key={s} className={`w-1.5 h-1.5 rounded-full ${i <= stageIdx ? 'bg-gold' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(ev) => { ev.stopPropagation(); openEditMission(m); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteMissionId(m.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Communications tab */}
      {activeTab === 'communications' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Radio size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل اتصالات العنقود — Hash Chain غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {filteredCommunications.length} رسالة مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredCommunications.length === 0 ? (
                <div className="text-center py-12">
                  <Radio size={28} className="text-ink/15 mx-auto mb-2" />
                  <p className="font-body text-xs text-ink/30">لا توجد اتصالات مسجلة</p>
                </div>
              ) : (
                filteredCommunications.map((c) => {
                  const mtCfg = MESSAGE_TYPE_CONFIG[c.message_type] || MESSAGE_TYPE_CONFIG.heartbeat;
                  const MtIcon = mtCfg.icon;
                  return (
                    <div key={c.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${mtCfg.bg}`}>
                        <MtIcon size={12} className={mtCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${mtCfg.bg} ${mtCfg.text}`}>{mtCfg.label}</span>
                          <span className="flex items-center gap-1 font-body text-[10px] font-bold text-midnight">
                            {c.from_cluster}
                            <ArrowLeftRight size={10} className="text-ink/30" />
                            {c.to_cluster || '—'}
                          </span>
                          {c.encrypted && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600"><Lock size={8} /> مشفّر</span>
                          )}
                        </div>
                        {c.message_content && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{c.message_content}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="font-body text-[9px] text-ink/30">{new Date(c.created_at).toLocaleString('ar-EG')}</span>
                          {c.hash_chain && (
                            <span className="flex items-center gap-0.5 font-body text-[9px] text-gold/60">
                              <Shield size={8} /> hash: {c.hash_chain}
                            </span>
                          )}
                          {c.previous_hash && (
                            <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30">
                              <GitBranch size={8} /> prev: {c.previous_hash}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mission detail drawer */}
      {selectedMission && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedMission(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">مهمة العنقود الذكي</span>
              </div>
              <button onClick={() => setSelectedMission(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedMission.mission_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(MISSION_STATUS_CONFIG[selectedMission.status] || MISSION_STATUS_CONFIG.decomposed).bg} ${(MISSION_STATUS_CONFIG[selectedMission.status] || MISSION_STATUS_CONFIG.decomposed).text}`}>
                      {(MISSION_STATUS_CONFIG[selectedMission.status] || MISSION_STATUS_CONFIG.decomposed).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(PRIORITY_CONFIG[selectedMission.priority] || PRIORITY_CONFIG.normal).bg} ${(PRIORITY_CONFIG[selectedMission.priority] || PRIORITY_CONFIG.normal).text}`}>
                      {(PRIORITY_CONFIG[selectedMission.priority] || PRIORITY_CONFIG.normal).label}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedMission.mission_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {MISSION_STAGES.map((s, i) => {
                      const cfg = MISSION_STATUS_CONFIG[s] || MISSION_STATUS_CONFIG.decomposed;
                      const stageIdx = MISSION_STAGES.indexOf(selectedMission.status);
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
                  {selectedMission.status !== MISSION_STAGES[MISSION_STAGES.length - 1] && selectedMission.status !== 'failed' && (
                    <button onClick={() => advanceMissionStage(selectedMission)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ChevronRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Mission info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Network size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">بيانات المهمة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">العنقود</span><p className="font-body text-xs font-bold text-midnight">{selectedMission.cluster?.cluster_name || selectedMission.cluster_code || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">رمز العنقود</span><p className="font-body text-xs font-bold text-midnight">{selectedMission.cluster_code || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">القائد</span><p className="font-body text-xs font-bold text-midnight">{selectedMission.commander_id || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">المهمة الأم</span><p className="font-body text-xs font-bold text-midnight">{selectedMission.parent_mission_id || '—'}</p></div>
                  </div>
                </div>

                {/* Decomposed tasks pipeline */}
                {Array.isArray(selectedMission.decomposed_tasks) && selectedMission.decomposed_tasks.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <GitBranch size={12} className="text-gold" />
                      <span className="font-body text-[10px] font-bold text-midnight">المهام الفرعية المفككة (Pipeline)</span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedMission.decomposed_tasks.map((t, idx) => {
                        const taskName = typeof t === 'object' && t !== null && 'name' in t ? String((t as Record<string, unknown>).name) : `مهمة فرعية ${idx + 1}`;
                        const taskStatus = typeof t === 'object' && t !== null && 'status' in t ? String((t as Record<string, unknown>).status) : 'pending';
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                            <span className="font-body text-[10px] text-ink/70 flex-1">{taskName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${taskStatus === 'done' ? 'bg-green-50 text-green-600' : taskStatus === 'active' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-ink/40'}`}>{taskStatus}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Execution plan */}
                {selectedMission.execution_plan && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">خطة التنفيذ</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedMission.execution_plan}</p></div>
                )}

                {/* Result summary */}
                {selectedMission.result_summary && (
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={12} className="text-green-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">ملخص النتيجة</span>
                    </div>
                    <p className="font-body text-xs text-ink/70 leading-relaxed">{selectedMission.result_summary}</p>
                    {selectedMission.result_fingerprint && (
                      <p className="font-body text-[9px] text-ink/40 mt-1">البصمة: {selectedMission.result_fingerprint}</p>
                    )}
                  </div>
                )}

                {/* Scope permissions */}
                {Array.isArray(selectedMission.scope_permissions) && selectedMission.scope_permissions.length > 0 && (
                  <div>
                    <p className="font-body text-[10px] font-bold text-ink/40 mb-1">صلاحيات النطاق</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedMission.scope_permissions.map((p, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-amber-50 text-amber-600 border border-amber-100">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Knowledge graph refs */}
                {Array.isArray(selectedMission.knowledge_graph_refs) && selectedMission.knowledge_graph_refs.length > 0 && (
                  <div>
                    <p className="font-body text-[10px] font-bold text-ink/40 mb-1">مراجع الرسم البياني المعرفي (M112)</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedMission.knowledge_graph_refs.map((r, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600 border border-purple-100">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMission.autonomous_execution ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Zap size={10} /> تنفيذ ذاتي {selectedMission.autonomous_execution ? 'مفعّل' : 'غير مفعّل'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMission.encrypted ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Lock size={10} /> {selectedMission.encrypted ? 'مشفّر' : 'غير مشفّر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMission.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Activity size={10} /> M92 {selectedMission.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMission.m109_biometric_required ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedMission.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedMission.m109_biometric_signed ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedMission.m109_biometric_signed ? 'موقَّع' : 'غير موقَّع'}</span>
                </div>

                {/* Communication trail */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Radio size={12} className="text-gold" /><span className="font-body text-[10px] font-bold text-midnight">سجل اتصالات المهمة</span></div>
                  <div className="space-y-1.5">
                    {missionComms.length === 0 ? (
                      <p className="font-body text-[10px] text-ink/30">لا توجد اتصالات مسجلة لهذه المهمة</p>
                    ) : (
                      missionComms.map((c) => {
                        const mtCfg = MESSAGE_TYPE_CONFIG[c.message_type] || MESSAGE_TYPE_CONFIG.heartbeat;
                        const MtIcon = mtCfg.icon;
                        return (
                          <div key={c.id} className="flex items-start gap-2 text-[10px]">
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${mtCfg.bg}`}><MtIcon size={10} className={mtCfg.text} /></div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-body text-ink/60 font-bold">{mtCfg.label}</span>
                                <span className="font-body text-ink/40">{c.from_cluster} ← {c.to_cluster || '—'}</span>
                              </div>
                              {c.message_content && <p className="font-body text-ink/40 leading-tight">{c.message_content}</p>}
                              <div className="flex items-center gap-2">
                                <span className="font-body text-ink/30">{new Date(c.created_at).toLocaleString('ar-EG')}</span>
                                {c.hash_chain && <span className="font-body text-gold/50">hash: {c.hash_chain}</span>}
                                {c.previous_hash && <span className="font-body text-ink/30">prev: {c.previous_hash}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cluster create/edit modal */}
      <EntityModal open={clusterModalOpen} title={editingClusterId ? 'تعديل العنقود' : 'عنقود ذكي جديد'} onClose={() => setClusterModalOpen(false)} onSubmit={handleSaveCluster} loading={clusterSaving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رمز العنقود" required><TextInput value={clusterForm.cluster_code} onChange={(e) => setClusterForm({ ...clusterForm, cluster_code: e.target.value })} placeholder="CLU-JUD-001" /></Field>
          <Field label="نوع العنقود">
            <Select value={clusterForm.cluster_type} onChange={(e) => setClusterForm({ ...clusterForm, cluster_type: e.target.value })}>
              {Object.entries(CLUSTER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم العنقود (إنجليزي)" required><TextInput value={clusterForm.cluster_name} onChange={(e) => setClusterForm({ ...clusterForm, cluster_name: e.target.value })} /></Field>
          <Field label="اسم العنقود (عربي)"><TextInput value={clusterForm.cluster_name_ar} onChange={(e) => setClusterForm({ ...clusterForm, cluster_name_ar: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم الوكيل الفرعي (إنجليزي)"><TextInput value={clusterForm.sub_agent_name} onChange={(e) => setClusterForm({ ...clusterForm, sub_agent_name: e.target.value })} placeholder="Sub-Agent Name" /></Field>
          <Field label="اسم الوكيل الفرعي (عربي)"><TextInput value={clusterForm.sub_agent_name_ar} onChange={(e) => setClusterForm({ ...clusterForm, sub_agent_name_ar: e.target.value })} /></Field>
        </div>
        <Field label="المحركات المرتبطة (مفصولة بفواصل)"><TextInput value={clusterForm.engines_linked} onChange={(e) => setClusterForm({ ...clusterForm, engines_linked: e.target.value })} placeholder="M10, M53, M92, M109" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="النطاق المستقل"><TextInput value={clusterForm.autonomous_scope} onChange={(e) => setClusterForm({ ...clusterForm, autonomous_scope: e.target.value })} /></Field>
          <Field label="صلاحية القرار">
            <Select value={clusterForm.decision_authority} onChange={(e) => setClusterForm({ ...clusterForm, decision_authority: e.target.value })}>
              <option value="autonomous">مستقل (Autonomous)</option>
              <option value="advisory">استشاري (Advisory)</option>
              <option value="restricted">مقيّد (Restricted)</option>
            </Select>
          </Field>
        </div>
        <Checkbox checked={clusterForm.active} onChange={(v: boolean) => setClusterForm({ ...clusterForm, active: v })} label="العنقود نشط" />
      </EntityModal>

      {/* Mission create/edit modal */}
      <EntityModal open={missionModalOpen} title={editingMissionId ? 'تعديل المهمة' : 'مهمة عنقودية جديدة'} onClose={() => setMissionModalOpen(false)} onSubmit={handleSaveMission} loading={missionSaving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم المهمة" required><TextInput value={missionForm.mission_number} onChange={(e) => setMissionForm({ ...missionForm, mission_number: e.target.value })} placeholder="MSN-2025-001" /></Field>
          <Field label="العنقود">
            <Select value={missionForm.cluster_id} onChange={(e) => {
              const c = clusters.find((cl) => cl.id === e.target.value);
              setMissionForm({ ...missionForm, cluster_id: e.target.value, cluster_code: c?.cluster_code || '' });
            }}>
              <option value="">— غير محدد —</option>
              {clusters.map((c) => <option key={c.id} value={c.id}>{c.cluster_code} — {c.cluster_name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان المهمة" required><TextInput value={missionForm.mission_title} onChange={(e) => setMissionForm({ ...missionForm, mission_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القائد"><TextInput value={missionForm.commander_id} onChange={(e) => setMissionForm({ ...missionForm, commander_id: e.target.value })} /></Field>
          <Field label="المهمة الأم"><TextInput value={missionForm.parent_mission_id} onChange={(e) => setMissionForm({ ...missionForm, parent_mission_id: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الحالة">
            <Select value={missionForm.status} onChange={(e) => setMissionForm({ ...missionForm, status: e.target.value })}>
              {Object.entries(MISSION_STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={missionForm.priority} onChange={(e) => setMissionForm({ ...missionForm, priority: e.target.value })}>
              {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="المهام الفرعية المفككة (JSON)"><TextArea value={missionForm.decomposed_tasks} onChange={(e) => setMissionForm({ ...missionForm, decomposed_tasks: e.target.value })} rows={4} placeholder='[{"name": "تحليل", "status": "done"}, {"name": "صياغة", "status": "active"}]' /></Field>
        <Field label="خطة التنفيذ"><TextArea value={missionForm.execution_plan} onChange={(e) => setMissionForm({ ...missionForm, execution_plan: e.target.value })} rows={3} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="بصمة النتيجة"><TextInput value={missionForm.result_fingerprint} onChange={(e) => setMissionForm({ ...missionForm, result_fingerprint: e.target.value })} /></Field>
          <Field label="ملخص النتيجة"><TextInput value={missionForm.result_summary} onChange={(e) => setMissionForm({ ...missionForm, result_summary: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="صلاحيات النطاق (مفصولة بفواصل)"><TextInput value={missionForm.scope_permissions} onChange={(e) => setMissionForm({ ...missionForm, scope_permissions: e.target.value })} placeholder="read, write, execute" /></Field>
          <Field label="مراجع الرسم البياني (مفصولة بفواصل)"><TextInput value={missionForm.knowledge_graph_refs} onChange={(e) => setMissionForm({ ...missionForm, knowledge_graph_refs: e.target.value })} placeholder="KG-001, KG-002" /></Field>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <Checkbox checked={missionForm.autonomous_execution} onChange={(v: boolean) => setMissionForm({ ...missionForm, autonomous_execution: v })} label="تنفيذ ذاتي" />
          <Checkbox checked={missionForm.encrypted} onChange={(v: boolean) => setMissionForm({ ...missionForm, encrypted: v })} label="مشفّر" />
          <Checkbox checked={missionForm.m92_notified} onChange={(v: boolean) => setMissionForm({ ...missionForm, m92_notified: v })} label="إخطار M92" />
          <Checkbox checked={missionForm.m109_biometric_required} onChange={(v: boolean) => setMissionForm({ ...missionForm, m109_biometric_required: v })} label="توقيع بيومتري مطلوب (M109)" />
          <Checkbox checked={missionForm.m109_biometric_signed} onChange={(v: boolean) => setMissionForm({ ...missionForm, m109_biometric_signed: v })} label="تم التوقيع البيومتري (M109)" />
        </div>
      </EntityModal>

      <DeleteConfirm open={!!deleteClusterId} onClose={() => setDeleteClusterId(null)} onConfirm={handleDeleteCluster} />
      <DeleteConfirm open={!!deleteMissionId} onClose={() => setDeleteMissionId(null)} onConfirm={handleDeleteMission} />
    </div>
  );
}
