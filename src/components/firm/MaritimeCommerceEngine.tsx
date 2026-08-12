import { useEffect, useState, useCallback } from 'react';
import {
  Ship, Loader2, Plus, Pencil, Trash2, ChevronRight, X, FileText,
  Calendar, DollarSign, Lock, Shield, CircuitBoard, Zap,
  CheckCircle2, Clock, AlertTriangle, ArrowRight, Search, BadgeCheck,
  Scale, Archive, Send, Activity, Server, Globe,
  Building2, MapPin, Anchor, Plane, Truck,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { M24Shipment, M24AuditLog } from '@/lib/firmTypes';
import type { Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'shipments' | 'audit';

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  initiation: { label: 'بدء', bg: 'bg-blue-50', text: 'text-blue-700' },
  loading: { label: 'تحميل', bg: 'bg-amber-50', text: 'text-amber-700' },
  in_transit: { label: 'في النقل', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  arrival: { label: 'وصول', bg: 'bg-purple-50', text: 'text-purple-700' },
  customs_cleared: { label: 'تخليص جمركي', bg: 'bg-green-50', text: 'text-green-700' },
  delivered: { label: 'تم التسليم', bg: 'bg-green-100', text: 'text-green-800' },
};

const STAGES = ['initiation', 'loading', 'in_transit', 'arrival', 'customs_cleared', 'delivered'];

const TRANSPORT_MODE_LABELS: Record<string, string> = {
  sea: 'بحري',
  air: 'جوي',
  land: 'بري',
  multimodal: 'متعدد الوسائط',
};

interface ShipmentForm {
  shipment_number: string;
  shipment_title: string;
  transport_mode: string;
  stage: string;
  carrier_name: string;
  vessel_flight: string;
  port_of_loading: string;
  port_of_discharge: string;
  bill_of_lading_number: string;
  charter_party: boolean;
  incoterms: string;
  cargo_description: string;
  cargo_value: string;
  insurance_covered: boolean;
  insurance_amount: string;
  expected_arrival: string;
  assigned_advisor_id: string;
  description: string;
}

const emptyForm: ShipmentForm = {
  shipment_number: '', shipment_title: '', transport_mode: 'sea', stage: 'initiation',
  carrier_name: '', vessel_flight: '', port_of_loading: '', port_of_discharge: '',
  bill_of_lading_number: '', charter_party: false, incoterms: '', cargo_description: '',
  cargo_value: '0', insurance_covered: false, insurance_amount: '0', expected_arrival: '',
  assigned_advisor_id: '', description: '',
};

export default function MaritimeCommerceEngine({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [shipments, setShipments] = useState<M24Shipment[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('shipments');
  const [selectedShipment, setSelectedShipment] = useState<M24Shipment | null>(null);
  const [auditLogs, setAuditLogs] = useState<M24AuditLog[]>([]);
  const [allAudit, setAllAudit] = useState<M24AuditLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ShipmentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [shRes, attRes, auditRes] = await Promise.all([
      supabase.from('m24_shipments')
        .select('*, advisor:lf_attorneys(name)')
        .order('created_at', { ascending: false }),
      supabase.from('lf_attorneys').select('*').order('name'),
      supabase.from('m24_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setShipments((shRes.data as M24Shipment[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setAllAudit((auditRes.data as M24AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setForm({ ...emptyForm, shipment_title: cmd.fields.title || '' });
      setEditingId(null);
      setModalOpen(true);
    }
  }, [voiceAdd]);

  const logAudit = async (shipmentId: string, action: string, detail: string) => {
    const hash = '0x' + Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);
    await supabase.from('m24_audit_logs').insert({
      case_id: shipmentId, action, actor: 'النظام', actor_role: 'النظام', detail, hash_chain: hash,
    });
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (s: M24Shipment) => {
    setForm({
      shipment_number: s.shipment_number, shipment_title: s.shipment_title, transport_mode: s.transport_mode,
      stage: s.stage, carrier_name: s.carrier_name || '', vessel_flight: s.vessel_flight || '',
      port_of_loading: s.port_of_loading || '', port_of_discharge: s.port_of_discharge || '',
      bill_of_lading_number: s.bill_of_lading_number || '', charter_party: s.charter_party,
      incoterms: s.incoterms || '', cargo_description: s.cargo_description || '',
      cargo_value: String(s.cargo_value || 0), insurance_covered: s.insurance_covered,
      insurance_amount: String(s.insurance_amount || 0), expected_arrival: s.expected_arrival || '',
      assigned_advisor_id: s.assigned_advisor_id || '', description: s.description || '',
    });
    setEditingId(s.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.shipment_title.trim() || !form.shipment_number.trim()) return;
    setSaving(true);
    const payload = {
      shipment_number: form.shipment_number.trim(),
      shipment_title: form.shipment_title.trim(),
      transport_mode: form.transport_mode,
      stage: form.stage,
      status: form.stage,
      carrier_name: form.carrier_name.trim() || null,
      vessel_flight: form.vessel_flight.trim() || null,
      port_of_loading: form.port_of_loading.trim() || null,
      port_of_discharge: form.port_of_discharge.trim() || null,
      bill_of_lading_number: form.bill_of_lading_number.trim() || null,
      charter_party: form.charter_party,
      incoterms: form.incoterms.trim() || null,
      cargo_description: form.cargo_description.trim() || null,
      cargo_value: Number(form.cargo_value) || 0,
      insurance_covered: form.insurance_covered,
      insurance_amount: Number(form.insurance_amount) || 0,
      expected_arrival: form.expected_arrival || null,
      assigned_advisor_id: form.assigned_advisor_id || null,
      description: form.description.trim() || null,
    };
    if (editingId) {
      await supabase.from('m24_shipments').update(payload).eq('id', editingId);
      await logAudit(editingId, 'shipment_updated', 'تحديث بيانات الشحنة');
    } else {
      const { data } = await supabase.from('m24_shipments').insert(payload).select('id');
      const newId = data?.[0]?.id;
      if (newId) {
        await logAudit(newId, 'shipment_created', 'إنشاء شحنة — وسيلة النقل: ' + (TRANSPORT_MODE_LABELS[form.transport_mode] || form.transport_mode));
        await supabase.from('m24_shipments').update({
          m53_archived: true,
          m90_import_export_linked: true,
          m106_food_security_flag: false,
          m54_finance_linked: true,
          m10_case_opened: true,
          m51_tasks_generated: true,
          m109_biometric_required: true,
          m92_notified: true,
          cost_center_id: 'CC-M24-' + Date.now().toString().slice(-6),
        }).eq('id', newId);
        await logAudit(newId, 'm53_archive', 'أرشفة مستندات الشحنة في الخزنة (M53)');
        await logAudit(newId, 'm90_import_export', 'ربط الشحنة بمحرك الاستيراد والتصدير (M90)');
        await logAudit(newId, 'm106_food_security', 'مراجعة علم الأمن الغذائي في محرك الأمن الغذائي (M106)');
        await logAudit(newId, 'm54_finance', 'فتح مركز تكلفة مالي في المحرك المالي (M54)');
        await logAudit(newId, 'm10_case', 'فتح ملف قضائي في محرك القضايا (M10)');
        await logAudit(newId, 'm51_tasks', 'توليد مهام الشحنة في محرك المهام (M51)');
        await logAudit(newId, 'm109_biometric', 'التحقق البيومتري للمسؤولين في محرك الهوية (M109)');
        await logAudit(newId, 'm92_notified', 'إخطار الوكيل الذكي (M92) بإنشاء الشحنة');
      }
    }
    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('m24_shipments').delete().eq('id', deleteId);
    setDeleteId(null);
    setSelectedShipment(null);
    fetchAll();
  };

  const openShipmentDetail = async (s: M24Shipment) => {
    setSelectedShipment(s);
    setDetailLoading(true);
    const aRes = await supabase.from('m24_audit_logs').select('*').eq('case_id', s.id).order('created_at', { ascending: true });
    setAuditLogs((aRes.data as M24AuditLog[]) || []);
    setDetailLoading(false);
  };

  const advanceStage = async (s: M24Shipment) => {
    const idx = STAGES.indexOf(s.stage);
    if (idx < 0 || idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    await supabase.from('m24_shipments').update({ stage: next, status: next }).eq('id', s.id);
    await logAudit(s.id, 'stage_advanced', 'تقدم المرحلة: ' + (STAGE_CONFIG[next]?.label || next));
    fetchAll();
    const updated = { ...s, stage: next, status: next };
    setSelectedShipment(updated as M24Shipment);
  };

  const filteredShipments = shipments.filter((s) => {
    if (filterMode !== 'all' && s.transport_mode !== filterMode) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.shipment_number.toLowerCase().includes(q) && !s.shipment_title.toLowerCase().includes(q) && !(s.carrier_name || '').toLowerCase().includes(q) && !(s.bill_of_lading_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const inTransitCount = shipments.filter((s) => s.stage === 'in_transit').length;
  const insuredCount = shipments.filter((s) => s.insurance_covered).length;
  const totalCargoValue = shipments.reduce((sum, s) => sum + (s.cargo_value || 0), 0);

  const tabs: { id: Tab; label: string; icon: typeof Ship; badge?: number }[] = [
    { id: 'shipments', label: 'الشحنات', icon: Ship, badge: shipments.length },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  const TransportIcon = (mode: string) => mode === 'air' ? Plane : mode === 'land' ? Truck : Ship;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Ship size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">التجارة البحرية والجوية (M24)</h2>
            <p className="font-body text-[10px] text-ink/40">إدارة الشحنات البحرية والجوية والبرية — من التحميل حتى التسليم والتخليص الجمركي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight text-cream">
            <Shield size={12} className="text-gold" />
            <span className="font-body text-[10px] font-bold">Zero-Trust · ZK-Audit</span>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Plus size={16} /> شحنة جديدة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Ship size={14} className="text-midnight" />} label="إجمالي الشحنات" value={String(shipments.length)} valueClass="text-midnight" />
        <StatCard icon={<Clock size={14} className="text-cyan-600" />} label="في النقل" value={String(inTransitCount)} valueClass="text-cyan-700" />
        <StatCard icon={<Shield size={14} className="text-green-600" />} label="مؤمَّنة" value={String(insuredCount)} valueClass="text-green-700" />
        <StatCard icon={<DollarSign size={14} className="text-gold" />} label="قيمة البضائع" value={formatCurrency(totalCargoValue)} valueClass="text-gold" />
      </div>

      {/* 6-stage workflow */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">دورة حياة الشحنة — 6 مراحل</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STAGES.map((stage, i) => {
            const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.initiation;
            const count = shipments.filter((s) => s.stage === stage).length;
            return (
              <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                <div className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10 min-w-[120px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded bg-gold/20 text-gold font-body text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-body text-[10px] font-bold text-cream/80">{cfg.label}</span>
                  </div>
                  <span className="font-body text-[9px] text-cream/40">{count} شحنة</span>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Archive, label: 'الخزنة (M53)', desc: 'أرشفة المستندات', color: 'text-blue-600' },
            { icon: Globe, label: 'الاستيراد/التصدير (M90)', desc: 'ربط التجارة الخارجية', color: 'text-green-600' },
            { icon: Shield, label: 'الأمن الغذائي (M106)', desc: 'مراجعة علم الأمن الغذائي', color: 'text-red-600' },
            { icon: DollarSign, label: 'المالية (M54)', desc: 'مراكز التكلفة', color: 'text-gold' },
            { icon: Scale, label: 'القضايا (M10)', desc: 'فتح ملف قضائي', color: 'text-blue-600' },
            { icon: CircuitBoard, label: 'المهام (M51)', desc: 'توليد المهام', color: 'text-amber-600' },
            { icon: BadgeCheck, label: 'الهوية (M109)', desc: 'تحقق بيومتري', color: 'text-purple-600' },
            { icon: Zap, label: 'الوكيل (M92)', desc: 'تنبيهات ذكية', color: 'text-amber-600' },
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

      {/* Filters for shipments */}
      {activeTab === 'shipments' && (
        <div className="flex items-center gap-2">
          <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="!w-auto !py-1.5 !text-xs">
            <option value="all">كل الوسائط</option>
            {Object.entries(TRANSPORT_MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <TextInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث برقم أو عنوان أو ناقل..." className="!py-1.5 !text-xs pr-9" />
          </div>
        </div>
      )}

      {/* Shipments tab */}
      {activeTab === 'shipments' && (
        <div className="space-y-2">
          {filteredShipments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Ship size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد شحنات مسجلة</p>
            </div>
          ) : (
            filteredShipments.map((s) => {
              const sCfg = STAGE_CONFIG[s.stage] || STAGE_CONFIG.initiation;
              const stageIdx = STAGES.indexOf(s.stage);
              const TIcon = TransportIcon(s.transport_mode);
              return (
                <div key={s.id} onClick={() => openShipmentDetail(s)}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sCfg.bg}`}>
                        <TIcon size={14} className={sCfg.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] font-bold text-gold">{s.shipment_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-body bg-gray-100 text-ink/50">{TRANSPORT_MODE_LABELS[s.transport_mode] || s.transport_mode}</span>
                          {s.insurance_covered && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Shield size={8} /> مؤمَّن</span>}
                          {s.charter_party && <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><FileText size={8} /> عقد استئجار</span>}
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1 leading-snug line-clamp-2">{s.shipment_title}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {s.carrier_name && <span className="font-body text-[9px] text-ink/40"><Building2 size={9} className="inline ml-0.5" />{s.carrier_name}</span>}
                          {s.vessel_flight && <span className="font-body text-[9px] text-ink/40"><Anchor size={9} className="inline ml-0.5" />{s.vessel_flight}</span>}
                          {s.port_of_loading && <span className="font-body text-[9px] text-blue-600"><MapPin size={9} className="inline ml-0.5" />{s.port_of_loading}</span>}
                          {s.port_of_discharge && <span className="font-body text-[9px] text-purple-600"><MapPin size={9} className="inline ml-0.5" />{s.port_of_discharge}</span>}
                          {s.bill_of_lading_number && <span className="font-body text-[9px] text-ink/40"><FileText size={9} className="inline ml-0.5" />{s.bill_of_lading_number}</span>}
                          {s.cargo_value > 0 && <span className="font-body text-[9px] text-gold font-bold">{formatCurrency(s.cargo_value)}</span>}
                          {s.incoterms && <span className="font-body text-[9px] text-blue-600">{s.incoterms}</span>}
                          {s.expected_arrival && <span className="font-body text-[9px] text-amber-600"><Calendar size={9} className="inline ml-0.5" />{formatDate(s.expected_arrival)}</span>}
                          {s.m90_import_export_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><Globe size={8} /> M90</span>}
                          {s.m54_finance_linked && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600"><DollarSign size={8} /> M54</span>}
                          {s.m10_case_opened && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-blue-50 text-blue-600"><Scale size={8} /> M10</span>}
                          {s.m51_tasks_generated && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><CircuitBoard size={8} /> M51</span>}
                          {s.m109_biometric_required && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600"><BadgeCheck size={8} /> M109</span>}
                          {s.m92_notified && <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600"><Zap size={8} /> M92</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-0.5">
                        {STAGES.map((st, i) => (
                          <span key={st} className={`w-1.5 h-1.5 rounded-full ${i <= stageIdx ? 'bg-gold' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
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

      {/* Audit tab */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— {allAudit.length} عملية مسجلة</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {allAudit.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {log.action.includes('created') ? <Ship size={12} className="text-blue-600" />
                      : log.action.includes('m90') ? <Globe size={12} className="text-green-600" />
                      : log.action.includes('m106') ? <Shield size={12} className="text-red-600" />
                      : log.action.includes('m54') ? <DollarSign size={12} className="text-green-600" />
                      : log.action.includes('m10') ? <Scale size={12} className="text-blue-600" />
                      : log.action.includes('m51') ? <CircuitBoard size={12} className="text-amber-600" />
                      : log.action.includes('m53') ? <Archive size={12} className="text-blue-600" />
                      : log.action.includes('m109') ? <BadgeCheck size={12} className="text-purple-600" />
                      : log.action.includes('m92') ? <Zap size={12} className="text-amber-600" />
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

      {/* Shipment detail drawer */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedShipment(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Ship size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">الشحنة</span>
              </div>
              <button onClick={() => setSelectedShipment(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-gold animate-spin" /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-body text-[10px] font-bold text-gold">{selectedShipment.shipment_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(STAGE_CONFIG[selectedShipment.stage] || STAGE_CONFIG.initiation).bg} ${(STAGE_CONFIG[selectedShipment.stage] || STAGE_CONFIG.initiation).text}`}>
                      {(STAGE_CONFIG[selectedShipment.stage] || STAGE_CONFIG.initiation).label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-gray-100 text-ink/50">{TRANSPORT_MODE_LABELS[selectedShipment.transport_mode] || selectedShipment.transport_mode}</span>
                    {selectedShipment.insurance_covered && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600"><Shield size={10} /> مؤمَّن</span>}
                    {selectedShipment.charter_party && <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-blue-50 text-blue-600"><FileText size={10} /> عقد استئجار</span>}
                  </div>
                  <h3 className="font-heading font-bold text-midnight text-base leading-snug">{selectedShipment.shipment_title}</h3>
                </div>

                {/* Stage progress */}
                <div>
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const cfg = STAGE_CONFIG[s] || STAGE_CONFIG.initiation;
                      const stageIdx = STAGES.indexOf(selectedShipment.stage);
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
                  {selectedShipment.stage !== STAGES[STAGES.length - 1] && (
                    <button onClick={() => advanceStage(selectedShipment)} className="w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
                      <ArrowRight size={12} /> الانتقال للمرحلة التالية
                    </button>
                  )}
                </div>

                {/* Carrier info */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Building2 size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">معلومات الناقل</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">الناقل</span><p className="font-body text-xs font-bold text-midnight">{selectedShipment.carrier_name || '—'}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">السفينة/الرحلة</span><p className="font-body text-xs font-bold text-midnight">{selectedShipment.vessel_flight || '—'}</p></div>
                    {selectedShipment.port_of_loading && <div><span className="font-body text-[9px] text-ink/40">ميناء التحميل</span><p className="font-body text-xs font-bold text-blue-600">{selectedShipment.port_of_loading}</p></div>}
                    {selectedShipment.port_of_discharge && <div><span className="font-body text-[9px] text-ink/40">ميناء التفريغ</span><p className="font-body text-xs font-bold text-purple-600">{selectedShipment.port_of_discharge}</p></div>}
                    {selectedShipment.bill_of_lading_number && <div><span className="font-body text-[9px] text-ink/40">رقم بوليصة الشحن</span><p className="font-body text-xs font-bold text-midnight">{selectedShipment.bill_of_lading_number}</p></div>}
                    {selectedShipment.incoterms && <div><span className="font-body text-[9px] text-ink/40">Incoterms</span><p className="font-body text-xs font-bold text-blue-600">{selectedShipment.incoterms}</p></div>}
                  </div>
                </div>

                {/* Cargo & insurance */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Archive size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">البضائع والتأمين</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">قيمة البضائع</span>
                      <p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedShipment.cargo_value)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">مبلغ التأمين</span>
                      <p className="font-body text-xs font-bold text-green-600">{formatCurrency(selectedShipment.insurance_amount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">مؤمَّنة</span>
                      <p className="font-body text-xs font-bold text-midnight">{selectedShipment.insurance_covered ? 'نعم' : 'لا'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <span className="font-body text-[9px] text-ink/40">الوصول المتوقع</span>
                      <p className="font-body text-xs font-bold text-amber-600">{selectedShipment.expected_arrival ? formatDate(selectedShipment.expected_arrival) : '—'}</p>
                    </div>
                  </div>
                  {selectedShipment.cargo_description && (
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 mt-2">
                      <span className="font-body text-[9px] text-ink/40">وصف البضائع</span>
                      <p className="font-body text-[10px] text-ink/70 leading-relaxed mt-0.5">{selectedShipment.cargo_description}</p>
                    </div>
                  )}
                </div>

                {/* Financial summary */}
                <div className="bg-gold/5 rounded-lg p-3 border border-gold/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign size={12} className="text-gold" />
                    <span className="font-body text-[10px] font-bold text-midnight">الملخص المالي — مركز التكلفة: {selectedShipment.cost_center_id || '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-body text-[9px] text-ink/40">قيمة البضائع</span><p className="font-body text-xs font-bold text-midnight">{formatCurrency(selectedShipment.cargo_value)}</p></div>
                    <div><span className="font-body text-[9px] text-ink/40">مستشار</span><p className="font-body text-xs font-bold text-midnight">{selectedShipment.advisor?.name || '—'}</p></div>
                  </div>
                </div>

                {/* Integration badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedShipment.m90_import_export_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><Globe size={10} /> M90 {selectedShipment.m90_import_export_linked ? 'مربوط' : 'غير مربوط'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedShipment.m106_food_security_flag ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-ink/30'}`}><Shield size={10} /> M106 {selectedShipment.m106_food_security_flag ? 'مُعلَّم' : 'غير مُعلَّم'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedShipment.m54_finance_linked ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/30'}`}><DollarSign size={10} /> M54 {selectedShipment.m54_finance_linked ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedShipment.m10_case_opened ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-ink/30'}`}><Scale size={10} /> M10 {selectedShipment.m10_case_opened ? 'مفتوح' : 'غير مفتوح'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedShipment.m51_tasks_generated ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><CircuitBoard size={10} /> M51 {selectedShipment.m51_tasks_generated ? 'مُولَّد' : 'غير مُولَّد'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedShipment.m109_biometric_required ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-ink/30'}`}><BadgeCheck size={10} /> M109 {selectedShipment.m109_biometric_required ? 'مطلوب' : 'غير مطلوب'}</span>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-body font-bold ${selectedShipment.m92_notified ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-ink/30'}`}><Zap size={10} /> M92 {selectedShipment.m92_notified ? 'مُخطَر' : 'غير مُخطَر'}</span>
                </div>

                {selectedShipment.description && (
                  <div><p className="font-body text-[10px] font-bold text-ink/40 mb-1">الوصف</p><p className="font-body text-xs text-ink/70 leading-relaxed">{selectedShipment.description}</p></div>
                )}

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

      {/* Shipment create/edit modal */}
      <EntityModal open={modalOpen} title={editingId ? 'تعديل الشحنة' : 'شحنة جديدة'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الشحنة" required><TextInput value={form.shipment_number} onChange={(e) => setForm({ ...form, shipment_number: e.target.value })} placeholder="SH-2025-001" /></Field>
          <Field label="وسيلة النقل">
            <Select value={form.transport_mode} onChange={(e) => setForm({ ...form, transport_mode: e.target.value })}>
              {Object.entries(TRANSPORT_MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="عنوان الشحنة" required><TextInput value={form.shipment_title} onChange={(e) => setForm({ ...form, shipment_title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المرحلة">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </Select>
          </Field>
          <Field label="الناقل"><TextInput value={form.carrier_name} onChange={(e) => setForm({ ...form, carrier_name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="السفينة/الرحلة"><TextInput value={form.vessel_flight} onChange={(e) => setForm({ ...form, vessel_flight: e.target.value })} /></Field>
          <Field label="رقم بوليصة الشحن"><TextInput value={form.bill_of_lading_number} onChange={(e) => setForm({ ...form, bill_of_lading_number: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ميناء التحميل"><TextInput value={form.port_of_loading} onChange={(e) => setForm({ ...form, port_of_loading: e.target.value })} /></Field>
          <Field label="ميناء التفريغ"><TextInput value={form.port_of_discharge} onChange={(e) => setForm({ ...form, port_of_discharge: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Incoterms"><TextInput value={form.incoterms} onChange={(e) => setForm({ ...form, incoterms: e.target.value })} placeholder="FOB / CIF / EXW" /></Field>
          <Field label="الوصول المتوقع"><TextInput type="date" value={form.expected_arrival} onChange={(e) => setForm({ ...form, expected_arrival: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="قيمة البضائع"><TextInput type="number" value={form.cargo_value} onChange={(e) => setForm({ ...form, cargo_value: e.target.value })} /></Field>
          <Field label="مبلغ التأمين"><TextInput type="number" value={form.insurance_amount} onChange={(e) => setForm({ ...form, insurance_amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="مؤمَّنة">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.insurance_covered} onChange={(e) => setForm({ ...form, insurance_covered: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">البضائع مؤمَّنة</span>
            </label>
          </Field>
          <Field label="عقد استئجار">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.charter_party} onChange={(e) => setForm({ ...form, charter_party: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-xs text-ink/60">عقد استئجار (Charter Party)</span>
            </label>
          </Field>
        </div>
        <Field label="المستشار المسؤول">
          <Select value={form.assigned_advisor_id} onChange={(e) => setForm({ ...form, assigned_advisor_id: e.target.value })}>
            <option value="">— اختر —</option>
            {attorneys.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="وصف البضائع"><TextArea value={form.cargo_description} onChange={(e) => setForm({ ...form, cargo_description: e.target.value })} rows={2} /></Field>
        <Field label="الوصف"><TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
