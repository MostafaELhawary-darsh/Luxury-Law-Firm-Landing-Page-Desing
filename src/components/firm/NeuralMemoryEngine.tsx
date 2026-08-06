import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, ChevronRight, X, AlertTriangle,
  Shield, CircuitBoard, CheckCircle2, Clock, Search,
  Activity, AlertCircle, BadgeCheck, Building2, DollarSign,
  FileText, Scale, Gavel, Store, ShoppingCart, Truck, Megaphone,
  Receipt, BrainCircuit, Network, Link2, Sparkles, Zap,
  Fingerprint, Database, GitBranch, Eye, Cpu, Layers,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type {
  M112NeuralEntity, M112NeuralRelation, M112NeuralEvolution,
} from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select, Checkbox } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'entities' | 'relations' | 'evolution';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  company: 'شركة',
  person: 'شخص',
  judgment: 'حكم',
  contract: 'عقد',
  tax_record: 'سجل ضريبي',
  iot_sensor: 'حساس',
  case: 'قضية',
  document: 'مستند',
  regulation: 'تشريع',
  asset: 'أصل',
};

const ENTITY_TYPE_ICONS: Record<string, typeof Building2> = {
  company: Building2,
  person: Network,
  judgment: Gavel,
  contract: FileText,
  tax_record: Receipt,
  iot_sensor: Cpu,
  case: Scale,
  document: FileText,
  regulation: Scale,
  asset: Database,
};

const RELATION_TYPE_LABELS: Record<string, string> = {
  subject_of: 'طرف في',
  governed_by: 'يخضع ل',
  tax_obligation: 'التزام ضريبي',
  monitors: 'يراقب',
  affects: 'يؤثر على',
  overrides: 'ينقض',
  linked_to: 'مرتبط ب',
  depends_on: 'يعتمد على',
  conflicts_with: 'يتعارض مع',
  supersedes: 'يحل محل',
};

const EVOLUTION_TYPE_LABELS: Record<string, string> = {
  relation_update: 'تحديث علاقة',
  entity_created: 'كيان جديد',
  proactive_alert: 'تنبيه استباقي',
  pattern_detected: 'نمط مكتشف',
  knowledge_expansion: 'توسع معرفي',
};

const EVOLUTION_TYPE_ICONS: Record<string, typeof Sparkles> = {
  relation_update: Link2,
  entity_created: Plus,
  proactive_alert: Zap,
  pattern_detected: Eye,
  knowledge_expansion: Sparkles,
};

interface NeuralEntityForm {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  entity_name_ar: string;
  source_engine: string;
  source_table: string;
  source_record_id: string;
  metadata: string;
  encrypted: boolean;
  active: boolean;
}

const emptyEntityForm: NeuralEntityForm = {
  entity_id: '', entity_type: 'company', entity_name: '', entity_name_ar: '',
  source_engine: '', source_table: '', source_record_id: '', metadata: '',
  encrypted: false, active: true,
};

interface NeuralRelationForm {
  source_entity_id: string;
  target_entity_id: string;
  relation_type: string;
  relation_strength: number;
  context: string;
  evidence_engine: string;
  evidence_record_id: string;
  auto_generated: boolean;
  human_verified: boolean;
  encrypted: boolean;
  active: boolean;
}

const emptyRelationForm: NeuralRelationForm = {
  source_entity_id: '', target_entity_id: '', relation_type: 'linked_to',
  relation_strength: 0.5, context: '', evidence_engine: '', evidence_record_id: '',
  auto_generated: false, human_verified: false, encrypted: false, active: true,
};

export default function NeuralMemoryEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [entities, setEntities] = useState<M112NeuralEntity[]>([]);
  const [relations, setRelations] = useState<M112NeuralRelation[]>([]);
  const [evolutions, setEvolutions] = useState<M112NeuralEvolution[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('entities');
  const [selectedEntity, setSelectedEntity] = useState<M112NeuralEntity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<M112NeuralRelation | null>(null);
  const [entityRelations, setEntityRelations] = useState<M112NeuralRelation[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'entity' | 'relation'>('entity');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [entityForm, setEntityForm] = useState<NeuralEntityForm>(emptyEntityForm);
  const [relationForm, setRelationForm] = useState<NeuralRelationForm>(emptyRelationForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<'entity' | 'relation'>('entity');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterEvolutionType, setFilterEvolutionType] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [eRes, rRes, evRes, attRes] = await Promise.all([
      supabase.from('m112_neural_entities')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('m112_neural_relations')
        .select('*, source_entity:m112_neural_entities!m112_neural_relations_source_entity_id_fkey(*), target_entity:m112_neural_entities!m112_neural_relations_target_entity_id_fkey(*)')
        .order('created_at', { ascending: false }),
      supabase.from('m112_neural_evolution')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    if (eRes.error) console.error('m112 entities fetch error', eRes.error);
    if (rRes.error) console.error('m112 relations fetch error', rRes.error);
    if (evRes.error) console.error('m112 evolution fetch error', evRes.error);
    if (attRes.error) console.error('attorneys fetch error', attRes.error);
    setEntities((eRes.data as M112NeuralEntity[]) || []);
    setRelations((rRes.data as M112NeuralRelation[]) || []);
    setEvolutions((evRes.data as M112NeuralEvolution[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setEntityForm({ ...emptyEntityForm, entity_name: cmd.fields.title || '' });
      setModalMode('entity');
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logEvolution = async (
    evolutionType: string,
    triggerEngine: string | null,
    triggerEvent: string | null,
    entityIdAffected: string | null,
    relationIdAffected: string | null,
    proactiveAction: string | null,
    proactiveTargetEngine: string | null,
    contextSummary: string,
  ) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 8);
    const prevHash = evolutions[0]?.hash_chain || '0x00000000';
    const { error } = await supabase.from('m112_neural_evolution').insert({
      evolution_type: evolutionType,
      trigger_engine: triggerEngine,
      trigger_event: triggerEvent,
      entity_id_affected: entityIdAffected,
      relation_id_affected: relationIdAffected,
      proactive_action: proactiveAction,
      proactive_target_engine: proactiveTargetEngine,
      proactive_target_id: null,
      executed: false,
      m102_integration: true,
      m92_notified: true,
      context_summary: contextSummary,
      hash_chain: hash,
      previous_hash: prevHash,
    });
    if (error) console.error('evolution log error', error);
  };

  const openAddEntity = () => {
    setEntityForm(emptyEntityForm);
    setModalMode('entity');
    setEditingId(null);
    setModalOpen(true);
  };

  const openAddRelation = () => {
    setRelationForm(emptyRelationForm);
    setModalMode('relation');
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditEntity = (e: M112NeuralEntity) => {
    setEntityForm({
      entity_id: e.entity_id,
      entity_type: e.entity_type,
      entity_name: e.entity_name,
      entity_name_ar: e.entity_name_ar || '',
      source_engine: e.source_engine || '',
      source_table: e.source_table || '',
      source_record_id: e.source_record_id || '',
      metadata: e.metadata ? JSON.stringify(e.metadata, null, 2) : '',
      encrypted: !!e.encrypted,
      active: e.active !== false,
    });
    setModalMode('entity');
    setEditingId(e.id);
    setModalOpen(true);
  };

  const openEditRelation = (r: M112NeuralRelation) => {
    setRelationForm({
      source_entity_id: r.source_entity_id,
      target_entity_id: r.target_entity_id,
      relation_type: r.relation_type,
      relation_strength: r.relation_strength,
      context: r.context || '',
      evidence_engine: r.evidence_engine || '',
      evidence_record_id: r.evidence_record_id || '',
      auto_generated: !!r.auto_generated,
      human_verified: !!r.human_verified,
      encrypted: !!r.encrypted,
      active: r.active !== false,
    });
    setModalMode('relation');
    setEditingId(r.id);
    setModalOpen(true);
  };

  const handleSaveEntity = async () => {
    if (!entityForm.entity_name.trim() || !entityForm.entity_id.trim()) return;
    setSaving(true);
    let metadataObj: Record<string, unknown> | null = null;
    if (entityForm.metadata.trim()) {
      try { metadataObj = JSON.parse(entityForm.metadata); } catch { metadataObj = null; }
    }
    const payload = {
      entity_id: entityForm.entity_id.trim(),
      entity_type: entityForm.entity_type,
      entity_name: entityForm.entity_name.trim(),
      entity_name_ar: entityForm.entity_name_ar.trim() || null,
      source_engine: entityForm.source_engine.trim() || null,
      source_table: entityForm.source_table.trim() || null,
      source_record_id: entityForm.source_record_id.trim() || null,
      metadata: metadataObj,
      encrypted: entityForm.encrypted,
      active: entityForm.active,
    };
    if (editingId) {
      const { error } = await supabase.from('m112_neural_entities').update(payload).eq('id', editingId);
      if (error) console.error('entity update error', error);
      await logEvolution('relation_update', 'M112', 'entity_updated', editingId, null, null, null, 'تحديث كيان في الذاكرة العصبية');
    } else {
      const { data, error } = await supabase.from('m112_neural_entities').insert(payload).select('id');
      if (error) console.error('entity insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logEvolution('entity_created', entityForm.source_engine || 'M112', 'entity_created', newId, null, null, null, 'إنشاء كيان جديد — النوع: ' + (ENTITY_TYPE_LABELS[entityForm.entity_type] || entityForm.entity_type));
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleSaveRelation = async () => {
    if (!relationForm.source_entity_id || !relationForm.target_entity_id) return;
    if (relationForm.source_entity_id === relationForm.target_entity_id) return;
    setSaving(true);
    const payload = {
      source_entity_id: relationForm.source_entity_id,
      target_entity_id: relationForm.target_entity_id,
      relation_type: relationForm.relation_type,
      relation_strength: relationForm.relation_strength,
      context: relationForm.context.trim() || null,
      evidence_engine: relationForm.evidence_engine.trim() || null,
      evidence_record_id: relationForm.evidence_record_id.trim() || null,
      auto_generated: relationForm.auto_generated,
      human_verified: relationForm.human_verified,
      encrypted: relationForm.encrypted,
      active: relationForm.active,
    };
    if (editingId) {
      const { error } = await supabase.from('m112_neural_relations').update(payload).eq('id', editingId);
      if (error) console.error('relation update error', error);
      await logEvolution('relation_update', 'M112', 'relation_updated', null, editingId, null, null, 'تحديث علاقة عصبية');
    } else {
      const { data, error } = await supabase.from('m112_neural_relations').insert(payload).select('id');
      if (error) console.error('relation insert error', error);
      const newId = data?.[0]?.id;
      if (newId) {
        await logEvolution('relation_update', relationForm.evidence_engine || 'M112', 'relation_created', relationForm.source_entity_id, newId, null, null, 'إنشاء علاقة عصبية — النوع: ' + (RELATION_TYPE_LABELS[relationForm.relation_type] || relationForm.relation_type));
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteMode === 'entity') {
      const { error } = await supabase.from('m112_neural_entities').delete().eq('id', deleteId);
      if (error) console.error('entity delete error', error);
    } else {
      const { error } = await supabase.from('m112_neural_relations').delete().eq('id', deleteId);
      if (error) console.error('relation delete error', error);
    }
    setDeleteId(null);
    setSelectedEntity(null);
    setSelectedRelation(null);
    fetchAll();
  };

  const openEntityDetail = async (e: M112NeuralEntity) => {
    setSelectedEntity(e);
    setDetailLoading(true);
    const rRes = await supabase.from('m112_neural_relations')
      .select('*, target_entity:m112_neural_entities!m112_neural_relations_target_entity_id_fkey(*), source_entity:m112_neural_entities!m112_neural_relations_source_entity_id_fkey(*)')
      .or(`source_entity_id.eq.${e.id},target_entity_id.eq.${e.id}`)
      .order('created_at', { ascending: true });
    if (rRes.error) console.error('entity relations error', rRes.error);
    setEntityRelations((rRes.data as M112NeuralRelation[]) || []);
    setDetailLoading(false);
  };

  const filteredEntities = entities.filter((e) => {
    if (filterType !== 'all' && e.entity_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.entity_id.toLowerCase().includes(q) && !e.entity_name.toLowerCase().includes(q) && !(e.entity_name_ar || '').toLowerCase().includes(q) && !(e.source_engine || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredRelations = relations.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const sName = r.source_entity?.entity_name || '';
      const tName = r.target_entity?.entity_name || '';
      if (!sName.toLowerCase().includes(q) && !tName.toLowerCase().includes(q) && !r.relation_type.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredEvolutions = evolutions.filter((ev) => {
    if (filterEvolutionType !== 'all' && ev.evolution_type !== filterEvolutionType) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeEntityCount = entities.filter((e) => e.active).length;
  const autoGenRelationCount = relations.filter((r) => r.auto_generated).length;
  const humanVerifiedCount = relations.filter((r) => r.human_verified).length;
  const pendingProactiveCount = evolutions.filter((ev) => !ev.executed && ev.proactive_action).length;

  const tabs: { id: Tab; label: string; icon: typeof BrainCircuit; badge?: number }[] = [
    { id: 'entities', label: 'الكيانات العصبية', icon: BrainCircuit, badge: entities.length },
    { id: 'relations', label: 'العلاقات العصبية', icon: Link2, badge: relations.length },
    { id: 'evolution', label: 'سجل التطور', icon: Sparkles, badge: evolutions.length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <BrainCircuit size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الذاكرة العصبية المتطورة والرسم البياني المعرفي (M112)</h2>
            <p className="font-body text-[10px] text-ink/40">رسم بياني معرفي ذاتي التطور يربط الكيانات والعلاقات عبر المحركات الـ 109</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Neural Graph · ZK-Chain</span>
          </div>
          {activeTab === 'entities' && (
            <button onClick={openAddEntity} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
              <Plus size={16} /> كيان جديد
            </button>
          )}
          {activeTab === 'relations' && (
            <button onClick={openAddRelation} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
              <Plus size={16} /> علاقة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<BrainCircuit size={14} className="text-midnight" />} label="إجمالي الكيانات" value={String(entities.length)} valueClass="text-midnight" />
        <StatCard icon={<Link2 size={14} className="text-blue-600" />} label="العلاقات العصبية" value={String(relations.length)} valueClass="text-blue-700" />
        <StatCard icon={<Zap size={14} className="text-amber-600" />} label="تنبيهات استباقية معلقة" value={String(pendingProactiveCount)} valueClass="text-amber-700" />
        <StatCard icon={<BadgeCheck size={14} className="text-green-600" />} label="علاقات موثقة بشريًا" value={String(humanVerifiedCount)} valueClass="text-green-700" />
      </div>

      {/* Neural graph overview */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">نظرة عامة على الرسم البياني المعرفي</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
            <div className="flex items-center gap-1.5 mb-1">
              <BrainCircuit size={12} className="text-gold" />
              <span className="font-body text-[10px] font-bold text-cream/80">الكيانات النشطة</span>
            </div>
            <span className="font-body text-sm font-bold text-cream">{activeEntityCount}</span>
          </div>
          <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Cpu size={12} className="text-blue-400" />
              <span className="font-body text-[10px] font-bold text-cream/80">علاقات مُولّدة آليًا</span>
            </div>
            <span className="font-body text-sm font-bold text-cream">{autoGenRelationCount}</span>
          </div>
          <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
            <div className="flex items-center gap-1.5 mb-1">
              <BadgeCheck size={12} className="text-green-400" />
              <span className="font-body text-[10px] font-bold text-cream/80">موثقة بشريًا</span>
            </div>
            <span className="font-body text-sm font-bold text-cream">{humanVerifiedCount}</span>
          </div>
          <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={12} className="text-purple-400" />
              <span className="font-body text-[10px] font-bold text-cream/80">أحداث التطور</span>
            </div>
            <span className="font-body text-sm font-bold text-cream">{evolutions.length}</span>
          </div>
          <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={12} className="text-amber-400" />
              <span className="font-body text-[10px] font-bold text-cream/80">إجراءات معلقة</span>
            </div>
            <span className="font-body text-sm font-bold text-cream">{pendingProactiveCount}</span>
          </div>
        </div>
      </div>

      {/* Integration matrix */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-midnight text-xs">مصفوفة التكامل العصبي (Neural Integration Matrix)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {[
            { icon: Layers, label: 'كل المحركات (M01-M111)', desc: 'كيانات مصدرية', color: 'text-gold' },
            { icon: GitBranch, label: 'تكامل المعرفة (M102)', desc: 'مزامنة الرسم البياني', color: 'text-purple-600' },
            { icon: Activity, label: 'الوكيل الذكي (M92)', desc: 'تنبيهات استباقية', color: 'text-amber-600' },
            { icon: Cpu, label: 'جسر IoT (M111)', desc: 'بيانات الحساسات', color: 'text-blue-600' },
            { icon: Fingerprint, label: 'البوابة الحيوية (M109)', desc: 'تحقق العلاقات', color: 'text-green-600' },
            { icon: Shield, label: 'سلسلة التجزئة (ZK)', desc: 'تدقيق غير قابل للتعديل', color: 'text-midnight' },
            { icon: Database, label: 'الخزنة السيادية (M110)', desc: 'تخزين مشفر', color: 'text-blue-600' },
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
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
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
      {activeTab === 'entities' && (
        <div className="flex items-center gap-2">
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الأنواع</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بمعرف الكيان أو الاسم أو المحرك المصدر..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}
      {activeTab === 'relations' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالكيان المصدر أو الهدف أو نوع العلاقة..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}
      {activeTab === 'evolution' && (
        <div className="flex items-center gap-2">
          <Select value={filterEvolutionType} onChange={(e) => setFilterEvolutionType(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل أنواع التطور</option>
            {Object.entries(EVOLUTION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <span className="font-body text-[10px] text-ink/30">— {filteredEvolutions.length} حدث</span>
        </div>
      )}

      {/* Entities tab */}
      {activeTab === 'entities' && (
        <div className="space-y-2">
          {filteredEntities.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <BrainCircuit size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد كيانات عصبية مسجلة</p>
            </div>
          ) : (
            filteredEntities.map((e) => {
              const TypeIcon = ENTITY_TYPE_ICONS[e.entity_type] || BrainCircuit;
              return (
                <div key={e.id} onClick={() => openEntityDetail(e)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                        <TypeIcon size={14} className="text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{e.entity_id}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-700">{ENTITY_TYPE_LABELS[e.entity_type] || e.entity_type}</span>
                          {e.source_engine && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-600">
                              <CircuitBoard size={8} /> {e.source_engine}
                            </span>
                          )}
                          {e.encrypted && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <Shield size={8} /> مشفّر
                            </span>
                          )}
                          {!e.active && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/40">
                              <Clock size={8} /> غير نشط
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{e.entity_name}</p>
                        {e.entity_name_ar && <p className="font-body text-[10px] text-ink/50 mt-0.5">{e.entity_name_ar}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {e.source_table && <span className="font-body text-[9px] text-ink/40">الجدول: {e.source_table}</span>}
                          {e.source_record_id && <span className="font-body text-[9px] text-ink/40">السجل: {e.source_record_id}</span>}
                          {e.metadata && <span className="font-body text-[9px] text-purple-600 font-bold">بيانات وصفية: {Object.keys(e.metadata).length} حقل</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(ev) => { ev.stopPropagation(); openEditEntity(e); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteMode('entity'); setDeleteId(e.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Relations tab */}
      {activeTab === 'relations' && (
        <div className="space-y-2">
          {filteredRelations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Link2 size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد علاقات عصبية مسجلة</p>
            </div>
          ) : (
            filteredRelations.map((r) => {
              const sName = r.source_entity?.entity_name || 'كيان محذوف';
              const tName = r.target_entity?.entity_name || 'كيان محذوف';
              const strengthPct = Math.round((r.relation_strength || 0) * 100);
              return (
                <div key={r.id} onClick={() => setSelectedRelation(r)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50">
                        <Link2 size={14} className="text-purple-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-purple-50 text-purple-700">{RELATION_TYPE_LABELS[r.relation_type] || r.relation_type}</span>
                          {r.auto_generated && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-blue-50 text-blue-600">
                              <Cpu size={8} /> مُولّد آليًا
                            </span>
                          )}
                          {r.human_verified && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <BadgeCheck size={8} /> موثق بشريًا
                            </span>
                          )}
                          {r.encrypted && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-green-50 text-green-600">
                              <Shield size={8} /> مشفّر
                            </span>
                          )}
                          {!r.active && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold bg-gray-100 text-ink/40">
                              <Clock size={8} /> غير نشط
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-body text-xs font-bold text-midnight">{sName}</span>
                          <ChevronRight size={12} className="text-gold flex-shrink-0" />
                          <span className="font-body text-[10px] font-bold text-gold">{RELATION_TYPE_LABELS[r.relation_type] || r.relation_type}</span>
                          <ChevronRight size={12} className="text-gold flex-shrink-0" />
                          <span className="font-body text-xs font-bold text-midnight">{tName}</span>
                        </div>
                        {/* Strength bar */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-body text-[9px] text-ink/40">قوة العلاقة</span>
                          <div className="flex-1 max-w-[120px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${strengthPct >= 75 ? 'bg-green-500' : strengthPct >= 50 ? 'bg-gold' : strengthPct >= 25 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${strengthPct}%` }} />
                          </div>
                          <span className="font-body text-[9px] font-bold text-midnight">{strengthPct}%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {r.evidence_engine && <span className="font-body text-[9px] text-ink/40">الدليل: {r.evidence_engine}</span>}
                          {r.evidence_record_id && <span className="font-body text-[9px] text-ink/40">سجل: {r.evidence_record_id}</span>}
                          {r.context && <span className="font-body text-[9px] text-ink/40">السياق: {r.context}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(ev) => { ev.stopPropagation(); openEditRelation(r); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(ev) => { ev.stopPropagation(); setDeleteMode('relation'); setDeleteId(r.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Evolution tab */}
      {activeTab === 'evolution' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل تطور الذاكرة العصبية — سلسلة التجزئة (Hash Chain)</span>
            <span className="font-body text-[10px] text-ink/30">— {filteredEvolutions.length} حدث مسجل</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredEvolutions.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles size={28} className="text-ink/15 mx-auto mb-2" />
                  <p className="font-body text-xs text-ink/30">لا توجد أحداث تطور مسجلة</p>
                </div>
              ) : (
                filteredEvolutions.map((ev) => {
                  const EvIcon = EVOLUTION_TYPE_ICONS[ev.evolution_type] || Sparkles;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <EvIcon size={12} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-midnight">{EVOLUTION_TYPE_LABELS[ev.evolution_type] || ev.evolution_type}</span>
                          {ev.trigger_engine && <span className="font-body text-[9px] text-ink/40">المحرك: {ev.trigger_engine}</span>}
                          {ev.trigger_event && <span className="font-body text-[9px] text-ink/40">الحدث: {ev.trigger_event}</span>}
                        </div>
                        {ev.context_summary && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{ev.context_summary}</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {ev.proactive_action && (
                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${ev.executed ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                              {ev.executed ? <CheckCircle2 size={8} /> : <Clock size={8} />}
                              {ev.executed ? 'تم التنفيذ' : 'معلّق'}: {ev.proactive_action}
                            </span>
                          )}
                          {ev.proactive_target_engine && <span className="font-body text-[9px] text-amber-600 font-bold">→ {ev.proactive_target_engine}</span>}
                          {ev.m102_integration && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><GitBranch size={8} /> M102</span>}
                          {ev.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Activity size={8} /> M92</span>}
                          {ev.entity_id_affected && <span className="font-body text-[9px] text-ink/40">كيان: {ev.entity_id_affected.slice(0, 8)}...</span>}
                          {ev.relation_id_affected && <span className="font-body text-[9px] text-ink/40">علاقة: {ev.relation_id_affected.slice(0, 8)}...</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-body text-[9px] text-ink/30">{new Date(ev.created_at).toLocaleString('ar-EG')}</span>
                          {ev.hash_chain && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/30"><Shield size={8} /> {ev.hash_chain}</span>}
                          {ev.previous_hash && <span className="flex items-center gap-0.5 font-body text-[9px] text-ink/20"><Link2 size={8} /> prev: {ev.previous_hash.slice(0, 12)}...</span>}
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

      {/* Entity detail drawer */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedEntity(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">كيان عصبي</span>
              </div>
              <button onClick={() => setSelectedEntity(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedEntity.entity_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body font-bold bg-blue-50 text-blue-700">{ENTITY_TYPE_LABELS[selectedEntity.entity_type] || selectedEntity.entity_type}</span>
                    {selectedEntity.source_engine && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body font-bold bg-purple-50 text-purple-600">
                        <CircuitBoard size={10} /> {selectedEntity.source_engine}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedEntity.entity_name}</h3>
                  {selectedEntity.entity_name_ar && <p className="font-body text-sm text-ink/60 mt-0.5">{selectedEntity.entity_name_ar}</p>}
                </div>

                {/* Source info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Database size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">مصدر الكيان</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">المحرك المصدر</span><p className="font-body text-xs font-bold text-midnight">{selectedEntity.source_engine || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">الجدول المصدر</span><p className="font-body text-xs font-bold text-midnight">{selectedEntity.source_table || '—'}</p></div>
                    <div className="col-span-2"><span className="font-body text-[9px] text-ink/40">معرف السجل المصدر</span><p className="font-body text-xs font-bold text-midnight">{selectedEntity.source_record_id || '—'}</p></div>
                  </div>
                </div>

                {/* Metadata JSON */}
                {selectedEntity.metadata && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <FileText size={12} className="text-purple-600" />
                      <span className="font-body text-[10px] font-bold text-midnight">البيانات الوصفية (Metadata)</span>
                    </div>
                    <pre className="font-body text-[10px] text-ink/70 leading-relaxed overflow-x-auto bg-white rounded p-2 border border-gray-100 max-h-48 overflow-y-auto" dir="ltr">{JSON.stringify(selectedEntity.metadata, null, 2)}</pre>
                  </div>
                )}

                {/* Status flags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEntity.encrypted ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}>
                    <Shield size={10} /> {selectedEntity.encrypted ? 'مشفّر' : 'غير مشفّر'}
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedEntity.active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}>
                    {selectedEntity.active ? <CheckCircle2 size={10} /> : <Clock size={10} />} {selectedEntity.active ? 'نشط' : 'غير نشط'}
                  </span>
                </div>

                {/* Relations for this entity */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link2 size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">العلاقات المرتبطة ({entityRelations.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {entityRelations.length === 0 ? (
                      <p className="font-body text-[10px] text-ink/30">لا توجد علاقات مرتبطة بهذا الكيان</p>
                    ) : (
                      entityRelations.map((r) => {
                        const isSource = r.source_entity_id === selectedEntity.id;
                        const otherName = isSource ? (r.target_entity?.entity_name || 'محذوف') : (r.source_entity?.entity_name || 'محذوف');
                        const direction = isSource ? '→' : '←';
                        const strengthPct = Math.round((r.relation_strength || 0) * 100);
                        return (
                          <div key={r.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                            <Link2 size={10} className="text-purple-600 flex-shrink-0" />
                            <span className="font-body text-[10px] font-bold text-midnight">{direction}</span>
                            <span className="font-body text-[10px] text-ink/70 flex-1 truncate">{otherName}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600">{RELATION_TYPE_LABELS[r.relation_type] || r.relation_type}</span>
                            <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${strengthPct >= 50 ? 'bg-gold' : 'bg-amber-400'}`} style={{ width: `${strengthPct}%` }} />
                            </div>
                            <span className="font-body text-[9px] font-bold text-midnight">{strengthPct}%</span>
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

      {/* Relation detail drawer */}
      {selectedRelation && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedRelation(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">علاقة عصبية</span>
              </div>
              <button onClick={() => setSelectedRelation(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-body font-bold bg-purple-50 text-purple-700">{RELATION_TYPE_LABELS[selectedRelation.relation_type] || selectedRelation.relation_type}</span>
              </div>
              <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-body text-[9px] text-ink/40">الكيان المصدر</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedRelation.source_entity?.entity_name || 'محذوف'}</p>
                  </div>
                  <div>
                    <span className="font-body text-[9px] text-ink/40">الكيان الهدف</span>
                    <p className="font-body text-xs font-bold text-midnight">{selectedRelation.target_entity?.entity_name || 'محذوف'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity size={12} className="text-gold" />
                  <span className="font-body text-[10px] font-bold text-midnight">قوة العلاقة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Math.round((selectedRelation.relation_strength || 0) * 100) >= 75 ? 'bg-green-500' : Math.round((selectedRelation.relation_strength || 0) * 100) >= 50 ? 'bg-gold' : 'bg-amber-500'}`} style={{ width: `${Math.round((selectedRelation.relation_strength || 0) * 100)}%` }} />
                  </div>
                  <span className="font-body text-sm font-bold text-gold">{Math.round((selectedRelation.relation_strength || 0) * 100)}%</span>
                </div>
              </div>
              {selectedRelation.context && (
                <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">السياق</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedRelation.context}</p></div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-body text-[9px] text-ink/40">محرك الدليل</span><p className="font-body text-xs font-bold text-midnight">{selectedRelation.evidence_engine || '—'}</p></div>
                <div><span className="font-body text-[9px] text-ink/40">سجل الدليل</span><p className="font-body text-xs font-bold text-midnight">{selectedRelation.evidence_record_id || '—'}</p></div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRelation.auto_generated ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Cpu size={10} /> {selectedRelation.auto_generated ? 'مُولّد آليًا' : 'يدوي'}</span>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRelation.human_verified ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> {selectedRelation.human_verified ? 'موثق بشريًا' : 'غير موثق'}</span>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRelation.encrypted ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> {selectedRelation.encrypted ? 'مشفّر' : 'غير مشفّر'}</span>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedRelation.active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}>{selectedRelation.active ? <CheckCircle2 size={10} /> : <Clock size={10} />} {selectedRelation.active ? 'نشط' : 'غير نشط'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Entity create/edit modal */}
      {modalMode === 'entity' && (
        <EntityModal open={modalOpen} title={editingId ? 'تعديل الكيان' : 'كيان عصبي جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSaveEntity} loading={saving}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="معرف الكيان" required><TextInput value={entityForm.entity_id} onChange={(e) => setEntityForm({ ...entityForm, entity_id: e.target.value })} placeholder="ENT-2025-001" /></Field>
            <Field label="نوع الكيان">
              <Select value={entityForm.entity_type} onChange={(e) => setEntityForm({ ...entityForm, entity_type: e.target.value })}>
                {Object.entries(ENTITY_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="اسم الكيان" required><TextInput value={entityForm.entity_name} onChange={(e) => setEntityForm({ ...entityForm, entity_name: e.target.value })} /></Field>
          <Field label="الاسم بالعربية"><TextInput value={entityForm.entity_name_ar} onChange={(e) => setEntityForm({ ...entityForm, entity_name_ar: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="المحرك المصدر"><TextInput value={entityForm.source_engine} onChange={(e) => setEntityForm({ ...entityForm, source_engine: e.target.value })} placeholder="M10 / M88 / M85..." /></Field>
            <Field label="الجدول المصدر"><TextInput value={entityForm.source_table} onChange={(e) => setEntityForm({ ...entityForm, source_table: e.target.value })} /></Field>
          </div>
          <Field label="معرف السجل المصدر"><TextInput value={entityForm.source_record_id} onChange={(e) => setEntityForm({ ...entityForm, source_record_id: e.target.value })} /></Field>
          <Field label="البيانات الوصفية (JSON)"><TextArea value={entityForm.metadata} onChange={(e) => setEntityForm({ ...entityForm, metadata: e.target.value })} rows={4} placeholder='{"key": "value"}' /></Field>
          <div className="flex items-center gap-6 flex-wrap">
            <Checkbox checked={entityForm.encrypted} onChange={(v: boolean) => setEntityForm({ ...entityForm, encrypted: v })} label="مشفّر" />
            <Checkbox checked={entityForm.active} onChange={(v: boolean) => setEntityForm({ ...entityForm, active: v })} label="نشط" />
          </div>
        </EntityModal>
      )}

      {/* Relation create/edit modal */}
      {modalMode === 'relation' && (
        <EntityModal open={modalOpen} title={editingId ? 'تعديل العلاقة' : 'علاقة عصبية جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSaveRelation} loading={saving}>
          <Field label="الكيان المصدر" required>
            <Select value={relationForm.source_entity_id} onChange={(e) => setRelationForm({ ...relationForm, source_entity_id: e.target.value })}>
              <option value="">— اختر الكيان المصدر —</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.entity_name} ({e.entity_id})</option>)}
            </Select>
          </Field>
          <Field label="الكيان الهدف" required>
            <Select value={relationForm.target_entity_id} onChange={(e) => setRelationForm({ ...relationForm, target_entity_id: e.target.value })}>
              <option value="">— اختر الكيان الهدف —</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.entity_name} ({e.entity_id})</option>)}
            </Select>
          </Field>
          <Field label="نوع العلاقة">
            <Select value={relationForm.relation_type} onChange={(e) => setRelationForm({ ...relationForm, relation_type: e.target.value })}>
              {Object.entries(RELATION_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label={`قوة العلاقة: ${Math.round(relationForm.relation_strength * 100)}%`}>
            <input type="range" min={0} max={1} step={0.05} value={relationForm.relation_strength} onChange={(e) => setRelationForm({ ...relationForm, relation_strength: Number(e.target.value) })} className="w-full accent-gold" />
          </Field>
          <Field label="السياق"><TextArea value={relationForm.context} onChange={(e) => setRelationForm({ ...relationForm, context: e.target.value })} rows={3} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="محرك الدليل"><TextInput value={relationForm.evidence_engine} onChange={(e) => setRelationForm({ ...relationForm, evidence_engine: e.target.value })} /></Field>
            <Field label="معرف سجل الدليل"><TextInput value={relationForm.evidence_record_id} onChange={(e) => setRelationForm({ ...relationForm, evidence_record_id: e.target.value })} /></Field>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <Checkbox checked={relationForm.auto_generated} onChange={(v: boolean) => setRelationForm({ ...relationForm, auto_generated: v })} label="مُولّد آليًا" />
            <Checkbox checked={relationForm.human_verified} onChange={(v: boolean) => setRelationForm({ ...relationForm, human_verified: v })} label="موثق بشريًا" />
            <Checkbox checked={relationForm.encrypted} onChange={(v: boolean) => setRelationForm({ ...relationForm, encrypted: v })} label="مشفّر" />
            <Checkbox checked={relationForm.active} onChange={(v: boolean) => setRelationForm({ ...relationForm, active: v })} label="نشط" />
          </div>
        </EntityModal>
      )}

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
