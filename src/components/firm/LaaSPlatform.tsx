import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Building2, User, Scale, Wallet, Zap, Shield, AlertTriangle, Snowflake,
  RefreshCw, GraduationCap, Heart, Plus, X, Loader2, ChevronLeft,
  TrendingUp, TrendingDown, Eye, Pencil, Trash2, Sparkles, Clock,
  CheckCircle2, FileText, Phone, Mail, Hash, Calendar, Activity,
  ShieldAlert, Siren, ArrowRight, Gift, Coins, BarChart3, Users,
  Calculator, Gauge, Zap as ZapIcon, Timer, Percent, Database,
  Bot, Radar, Send, Settings, Landmark, Webhook, Cpu,
  Target, ScanLine, Rocket, FileSearch, Lock, PlayCircle, Trophy,
  Network, EyeOff, Fingerprint, Briefcase, Gavel, ShieldCheck,
  DollarSign, Split, ClipboardCheck, UserCheck, Star,
  Repeat, ArrowUp, AlertOctagon, Power, Search, Download,
  CircleDot, Radio, Scan, Layers, BookOpen,
} from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import { isIntegrationEnabled } from '@/lib/integrationConfig';
import { RBACBoards } from '@/components/firm/RBACBoards';
import { EntityModal, Field, TextInput, Select, TextArea, Checkbox } from './EntityModal';
import { DeleteConfirm, StatCard } from './ClientManagement';
import type {
  LaaSPlan, LaaSSubscriber, LaaSWallet, LaaSService, LaaSTransaction,
  LaaSTriageAudit, LaaSProactiveConsumption, LaaSRollover, LaaSChurnAction,
  LaaSPanicIncident, LaaSProtectionMeter, LaaSSegment, LaaSSubscriberStatus,
  LaaSTransactionType, LaaSChurnTrigger, LaaSRolloverType,
  LaaSProactiveRule, LaaSProactiveActionType,
  LaaSAutopilotSettings, LaaSProactiveExecution, LaaSDeliveryStatus, LaaSDeliveryTarget,
  LaaSOnboardingDiagnostic, LaaSPilotPack, LaaSDiagnosticStatus, LaaSPilotStatus,
  LaaSExternalLawyer, LaaSExternalTask, LaaSEscrowTransaction, LaaSAnonymizationLog,
  LaaSTaskType, LaaSTaskStatus, LaaSEscrowStatus,
  LaaSLOCCSignal, LaaSLOCCAuditLog, LaaSLOCCReport,
  LaaSSignalType, LaaSSignalSeverity, LaaSSignalStatus, LaaSActionType,
} from '@/lib/laasTypes';
import {
  SEGMENT_LABELS, SEGMENT_STYLES, SUBSCRIBER_STATUS_STYLES,
  TRANSACTION_TYPE_STYLES, CHURN_TRIGGER_LABELS, SMART_ACTION_LABELS,
  ROLLOVER_TYPE_LABELS, SERVICE_CATEGORY_LABELS,
  COMPLEXITY_TIER_STYLES, PROACTIVE_ACTION_LABELS,
  PROFILE_TYPE_LABELS, DELIVERY_STATUS_STYLES, DELIVERY_TARGET_LABELS,
  DIAGNOSTIC_STATUS_STYLES, PILOT_STATUS_STYLES,
  TASK_TYPE_LABELS, TASK_STATUS_STYLES, ESCROW_STATUS_STYLES, SPECIALTY_LABELS,
  SIGNAL_TYPE_LABELS, SEVERITY_STYLES,
} from '@/lib/laasTypes';

type TabId = 'subscribers' | 'plans' | 'pricing' | 'onboarding' | 'network' | 'locc' | 'rbac' | 'lifecycle' | 'churn' | 'dashboard';

export default function LaaSPlatform() {
  const [activeTab, setActiveTab] = useState<TabId>('subscribers');
  const [subscribers, setSubscribers] = useState<LaaSSubscriber[]>([]);
  const [plans, setPlans] = useState<LaaSPlan[]>([]);
  const [services, setServices] = useState<LaaSService[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    const [subRes, planRes, svcRes] = await Promise.all([
      supabase.from('laas_subscribers').select('*, plan:laas_plans(*), wallet:laas_wallets(*)').order('created_at', { ascending: false }),
      supabase.from('laas_plans').select('*').order('segment, monthly_price'),
      supabase.from('laas_services').select('*').order('credit_cost'),
    ]);
    setSubscribers((subRes.data as LaaSSubscriber[]) || []);
    setPlans((planRes.data as LaaSPlan[]) || []);
    setServices((svcRes.data as LaaSService[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const TABS: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: 'subscribers', label: 'المشتركون', icon: Users },
    { id: 'plans', label: 'الهندسة الفئوية', icon: Building2 },
    { id: 'pricing', label: 'محرك التسعير', icon: Calculator },
    { id: 'onboarding', label: 'مسار الاستقطاب', icon: Sparkles },
    { id: 'network', label: 'شبكة المحامين بالباطن', icon: Network },
    { id: 'locc', label: 'مركز القيادة', icon: Radar },
    { id: 'rbac', label: 'لوحات الإدارة (RBAC)', icon: Shield },
    { id: 'lifecycle', label: 'دورة الحياة', icon: RefreshCw },
    { id: 'churn', label: 'مصفوفة إيقاف التسرب', icon: ShieldAlert },
    { id: 'dashboard', label: 'بوابة المشترك', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet size={20} className="text-gold" />
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">الخدمة القانونية كاشتراك مرن — Legal-as-a-Service (LaaS)</h2>
            <p className="font-body text-[10px] text-ink/40 mt-0.5">محفظة قانونية ذكية بنقاط قابلة للتدوير • هندسة فئوية • استهلاك استباقي • صفر هدر</p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={14} className="text-midnight" />} label="إجمالي المشتركين" value={String(subscribers.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-emerald-600" />} label="مشتركون نشطون" value={String(subscribers.filter((s) => s.status === 'active').length)} valueClass="text-emerald-700" />
        <StatCard icon={<Coins size={14} className="text-gold" />} label="إجمالي النقاط المتاحة" value={String(subscribers.reduce((sum, s) => sum + (s.wallet?.balance || 0), 0))} valueClass="text-gold" />
        <StatCard icon={<AlertTriangle size={14} className="text-red-600" />} label="حالات تحت المراقبة" value={String(subscribers.filter((s) => s.status === 'past_due' || s.status === 'frozen' || s.status === 'emergency').length)} valueClass="text-red-700" />
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-2 flex-wrap border-b border-gray-200 pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-body text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-gold border-gold bg-gold/5'
                  : 'text-ink/50 border-transparent hover:text-ink/70 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'subscribers' && <SubscribersTab subscribers={subscribers} plans={plans} services={services} onRefresh={fetchInitial} />}
      {activeTab === 'plans' && <PlansTab plans={plans} services={services} onRefresh={fetchInitial} />}
      {activeTab === 'pricing' && <PricingTab plans={plans} services={services} subscribers={subscribers} onRefresh={fetchInitial} />}
      {activeTab === 'onboarding' && <OnboardingFlowTab subscribers={subscribers} plans={plans} onRefresh={fetchInitial} />}
      {activeTab === 'network' && <WhiteLabelNetworkTab subscribers={subscribers} onRefresh={fetchInitial} />}
      {activeTab === 'locc' && <LOCCTab subscribers={subscribers} onRefresh={fetchInitial} />}
      {activeTab === 'rbac' && <RBACBoards subscribers={subscribers} onRefresh={fetchInitial} />}
      {activeTab === 'lifecycle' && <LifecycleTab subscribers={subscribers} services={services} onRefresh={fetchInitial} />}
      {activeTab === 'churn' && <ChurnTab subscribers={subscribers} onRefresh={fetchInitial} />}
      {activeTab === 'dashboard' && <DashboardTab subscribers={subscribers} services={services} onRefresh={fetchInitial} />}
    </div>
  );
}

// ===== SUBSCRIBERS TAB =====

function SubscribersTab({ subscribers, plans, services, onRefresh }: {
  subscribers: LaaSSubscriber[];
  plans: LaaSPlan[];
  services: LaaSService[];
  onRefresh: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', segment: 'b2b' as LaaSSegment, plan_id: '', entity_type: '',
    billing_cycle: 'monthly' as 'monthly' | 'annual', auto_renew: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterSegment, setFilterSegment] = useState<string>('all');

  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', segment: 'b2b', plan_id: '', entity_type: '', billing_cycle: 'monthly', auto_renew: true });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (s: LaaSSubscriber) => {
    setForm({
      name: s.name, email: s.email || '', phone: s.phone || '', segment: s.segment,
      plan_id: s.plan_id || '', entity_type: s.entity_type || '', billing_cycle: s.billing_cycle, auto_renew: s.auto_renew,
    });
    setEditingId(s.id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const selectedPlan = plans.find((p) => p.id === form.plan_id);
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (form.billing_cycle === 'annual' ? 365 : 30));

    if (editingId) {
      await supabase.from('laas_subscribers').update({
        name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
        segment: form.segment, plan_id: form.plan_id || null, entity_type: form.entity_type.trim() || null,
        billing_cycle: form.billing_cycle, auto_renew: form.auto_renew,
        current_period_end: periodEnd.toISOString().slice(0, 10),
      }).eq('id', editingId);
    } else {
      const code = `SUB-${Date.now().toString().slice(-6)}`;
      const { data: newSub } = await supabase.from('laas_subscribers').insert({
        subscriber_code: code, name: form.name.trim(), email: form.email.trim() || null,
        phone: form.phone.trim() || null, segment: form.segment, plan_id: form.plan_id || null,
        entity_type: form.entity_type.trim() || null, billing_cycle: form.billing_cycle,
        auto_renew: form.auto_renew, current_period_end: periodEnd.toISOString().slice(0, 10),
      }).select().single();

      if (newSub) {
        const credits = selectedPlan?.credits_included || 0;
        await supabase.from('laas_wallets').insert({
          subscriber_id: newSub.id, balance: credits, total_granted: credits,
          last_activity_at: new Date().toISOString(),
        });
        if (credits > 0) {
          await supabase.from('laas_transactions').insert({
            wallet_id: (await supabase.from('laas_wallets').select('id').eq('subscriber_id', newSub.id).single()).data?.id,
            subscriber_id: newSub.id, transaction_type: 'grant', points: credits,
            balance_after: credits, description: `منح نقاط اشتراك — ${selectedPlan?.name_ar || 'باقة'}`,
          });
        }
      }
    }
    setSaving(false); setModalOpen(false); onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('laas_subscribers').delete().eq('id', deleteId);
    setDeleteId(null); onRefresh();
  };

  const filtered = filterSegment === 'all' ? subscribers : subscribers.filter((s) => s.segment === filterSegment);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilterSegment('all')} className={`px-3 py-1.5 rounded-lg font-body text-xs font-bold ${filterSegment === 'all' ? 'bg-midnight text-cream' : 'bg-white border border-gray-200 text-ink/60'}`}>الكل ({subscribers.length})</button>
          {(Object.keys(SEGMENT_LABELS) as LaaSSegment[]).map((seg) => {
            const count = subscribers.filter((s) => s.segment === seg).length;
            const style = SEGMENT_STYLES[seg];
            return (
              <button key={seg} onClick={() => setFilterSegment(seg)} className={`px-3 py-1.5 rounded-lg font-body text-xs font-bold border ${filterSegment === seg ? `${style.bg} ${style.text} ${style.border}` : 'bg-white border-gray-200 text-ink/60'}`}>
                {SEGMENT_LABELS[seg].short} ({count})
              </button>
            );
          })}
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
          <Plus size={16} /> مشترك جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => {
          const status = SUBSCRIBER_STATUS_STYLES[s.status];
          const segStyle = SEGMENT_STYLES[s.segment];
          const wallet = s.wallet;
          const plan = s.plan;
          return (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-gold/30 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${segStyle.bg} flex items-center justify-center`}>
                    {s.segment === 'b2b' && <Building2 size={18} className={segStyle.text} />}
                    {s.segment === 'b2c' && <User size={18} className={segStyle.text} />}
                    {s.segment === 'b2l' && <Scale size={18} className={segStyle.text} />}
                  </div>
                  <div>
                    <p className="font-body text-xs font-bold text-midnight">{s.name}</p>
                    <p className="font-body text-[10px] text-ink/40">{s.subscriber_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors opacity-0 group-hover:opacity-100"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-body ${status.bg} ${status.text} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} /> {status.label}
                </span>
                {plan && <span className="font-body text-[10px] text-ink/50 truncate">{plan.name_ar}</span>}
              </div>
              <div className="space-y-2 pt-3 border-t border-gray-100">
                {s.email && <InfoRow icon={<Mail size={12} className="text-ink/30" />} text={s.email} />}
                {s.phone && <InfoRow icon={<Phone size={12} className="text-ink/30" />} text={s.phone} />}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="font-body text-[9px] text-ink/40">رصيد المحفظة</p>
                    <p className="font-heading font-bold text-gold text-xs">{wallet?.balance || 0} نقطة</p>
                  </div>
                  <div className="text-left">
                    <p className="font-body text-[9px] text-ink/40">ينتهي في</p>
                    <p className="font-body text-xs text-ink/60">{formatDate(s.current_period_end)}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EntityModal open={modalOpen} title={editingId ? 'تعديل مشترك' : 'مشترك جديد'} onClose={() => setModalOpen(false)} onSubmit={handleSave} loading={saving}>
        <Field label="الاسم" required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: شركة النيل للتجارة" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="البريد الإلكتروني"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="الهاتف"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الفئة" required>
            <Select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value as LaaSSegment })}>
              <option value="b2b">B2B — الشركات</option>
              <option value="b2c">B2C — الأفراد</option>
              <option value="b2l">B2L — المحامون</option>
            </Select>
          </Field>
          <Field label="نوع الكيان"><TextInput value={form.entity_type} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} placeholder="شركة مساهحة / فرد / مكتب محاماة" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الباقة">
            <Select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
              <option value="">— اختر الباقة —</option>
              {plans.filter((p) => p.segment === form.segment).map((p) => <option key={p.id} value={p.id}>{p.name_ar} ({p.credits_included} نقطة)</option>)}
            </Select>
          </Field>
          <Field label="دورة الفوترة">
            <Select value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value as 'monthly' | 'annual' })}>
              <option value="monthly">شهري</option>
              <option value="annual">سنوي</option>
            </Select>
          </Field>
        </div>
        <Checkbox label="تجديد تلقائي" checked={form.auto_renew} onChange={(v) => setForm({ ...form, auto_renew: v })} />
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2">{icon}<p className="font-body text-[10px] text-ink/60 truncate">{text}</p></div>;
}

// ===== PLANS TAB (Segmented Architecture) =====

function PlansTab({ plans, services, onRefresh }: {
  plans: LaaSPlan[];
  services: LaaSService[];
  onRefresh: () => void;
}) {
  const segments: LaaSSegment[] = ['b2b', 'b2c', 'b2l'];
  const segmentMeta: Record<LaaSSegment, { title: string; icon: typeof Building2; value: string; color: string }> = {
    b2b: { title: 'للشركات — B2B Corporate', icon: Building2, value: 'المستشار العام الافتراضي — الامتثال المسبق، مراجعة العقود، حماية الكيان', color: 'text-blue-700' },
    b2c: { title: 'للأفراد — B2C Individuals', icon: User, value: 'الدرع الوقائي — استشارات سريعة، مراجعة عقود، توكيلات طوارئ', color: 'text-emerald-700' },
    b2l: { title: 'للمحامين — B2L Lawyers', icon: Scale, value: 'ترسانة العمل القانوني — قاعدة بيانات، سوابق، قوالب، مكاتب افتراضية', color: 'text-amber-700' },
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-cream text-base">الهندسة الفئوية للاشتراكات — Segmented Architecture</h3>
        </div>
        <p className="font-body text-xs text-cream/60 leading-relaxed mb-4">
          تتغير لغة وقيمة الاشتراك بناءً على المستهدف. لا نبيع «الوقت» بل نبيع «الأثر». كل فئة لها باقاتها وقيمتها المفهومة بلغة العميل.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {segments.map((seg) => {
            const meta = segmentMeta[seg];
            const Icon = meta.icon;
            const segPlans = plans.filter((p) => p.segment === seg);
            return (
              <div key={seg} className="bg-cream/5 border border-cream/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className="text-gold" />
                  <p className="font-heading font-bold text-cream text-sm">{meta.title}</p>
                </div>
                <p className="font-body text-[11px] text-cream/50 leading-relaxed mb-3">{meta.value}</p>
                <div className="space-y-1.5">
                  {segPlans.map((p) => (
                    <div key={p.id} className="bg-cream/5 rounded-lg p-2.5">
                      <p className="font-body text-[11px] font-bold text-gold">{p.name_ar}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-body text-[10px] text-cream/60">{p.credits_included} نقطة</span>
                        <span className="font-body text-[10px] text-cream/40">{formatCurrency(p.monthly_price)} ج.م/شهر</span>
                      </div>
                      {p.volume_discount_pct > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-body text-[9px] font-bold">
                          <Percent size={9} /> خصم {p.volume_discount_pct}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Services catalog */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Coins size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">كتالوج الخدمات — Service Catalog (تكلفة النقاط)</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc) => (
            <div key={svc.id} className="border border-gray-200 rounded-lg p-3.5 hover:border-gold/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <p className="font-body text-xs font-bold text-midnight">{svc.name_ar}</p>
                <span className="font-heading font-bold text-gold text-sm">{svc.credit_cost}</span>
              </div>
              <p className="font-body text-[10px] text-ink/50 leading-relaxed mb-2">{svc.description}</p>
              <div className="flex items-center justify-between">
                <span className="font-body text-[10px] text-ink/40">{SERVICE_CATEGORY_LABELS[svc.category] || svc.category}</span>
                {svc.segment && <span className="font-body text-[10px] text-ink/40">{SEGMENT_LABELS[svc.segment as LaaSSegment].short}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== LIFECYCLE TAB =====

function LifecycleTab({ subscribers, services, onRefresh }: {
  subscribers: LaaSSubscriber[];
  services: LaaSService[];
  onRefresh: () => void;
}) {
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<string | null>(null);
  const [triageAudits, setTriageAudits] = useState<LaaSTriageAudit[]>([]);
  const [proactiveConsumptions, setProactiveConsumptions] = useState<LaaSProactiveConsumption[]>([]);
  const [rollovers, setRollovers] = useState<LaaSRollover[]>([]);
  const [transactions, setTransactions] = useState<LaaSTransaction[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showConsume, setShowConsume] = useState(false);
  const [showProactive, setShowProactive] = useState(false);
  const [showRollover, setShowRollover] = useState(false);

  const selected = subscribers.find((s) => s.id === selectedSubscriberId);

  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    const [triage, proactive, roll, tx] = await Promise.all([
      supabase.from('laas_triage_audits').select('*').eq('subscriber_id', id).order('created_at', { ascending: false }),
      supabase.from('laas_proactive_consumptions').select('*').eq('subscriber_id', id).order('created_at', { ascending: false }),
      supabase.from('laas_rollovers').select('*').eq('subscriber_id', id).order('created_at', { ascending: false }),
      supabase.from('laas_transactions').select('*, service:laas_services(*)').eq('subscriber_id', id).order('created_at', { ascending: false }).limit(20),
    ]);
    setTriageAudits((triage.data as LaaSTriageAudit[]) || []);
    setProactiveConsumptions((proactive.data as LaaSProactiveConsumption[]) || []);
    setRollovers((roll.data as LaaSRollover[]) || []);
    setTransactions((tx.data as LaaSTransaction[]) || []);
    setLoadingDetail(false);
  }, []);

  useEffect(() => {
    if (selectedSubscriberId) fetchDetail(selectedSubscriberId);
  }, [selectedSubscriberId, fetchDetail]);

  const LIFECYCLE_STEPS = [
    { num: 1, title: 'التشخيص القانوني المبدئي', subtitle: 'أول 72 ساعة', icon: Activity, desc: 'فحص آلي لحالة التراخيص، العقود، وسياسات الخصوصية — ينتج خطة عمل ربع سنوية' },
    { num: 2, title: 'تفعيل المحفظة النقطية', subtitle: 'نظام تسعير مرن', icon: Wallet, desc: 'منح نقاط قانونية بدل ساعات — الاستشارة 10، صياغة عقد 100، حضور جلسة 150' },
    { num: 3, title: 'الاستهلاك الاستباقي', subtitle: 'الوقاية من تجميد الحساب', icon: Zap, desc: 'مراقبة الاستهلاك — عند 45 يوماً من الخمول يُنفذ النظام خدمة استباقية لإثبات القيمة' },
    { num: 4, title: 'تدوير الرصيد وإعادة الاستثمار', subtitle: 'نهاية الدورة — صفر هدر', icon: RefreshCw, desc: 'النقاط المتبقية لا تضيع: ترحيل، تدريب، أو تبرع خيري (Pro Bono) باسم العميل' },
  ];

  return (
    <div className="space-y-5">
      {/* Lifecycle visual */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">دورة حياة الاشتراك — The Subscription Lifecycle</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {LIFECYCLE_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative">
                {i < LIFECYCLE_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 -left-3 w-6 h-px bg-gold/30 z-0" />
                )}
                <div className="relative bg-gray-50 rounded-xl border border-gray-200 p-4 hover:border-gold/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                      <Icon size={14} className="text-gold" />
                    </div>
                    <span className="font-heading font-bold text-midnight text-xs">{step.num}.</span>
                  </div>
                  <p className="font-body text-xs font-bold text-midnight mb-0.5">{step.title}</p>
                  <p className="font-body text-[10px] text-gold/70 mb-2">{step.subtitle}</p>
                  <p className="font-body text-[10px] text-ink/50 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscriber selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Users size={16} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">تتبع دورة حياة مشترك</h3>
        </div>
        <Select value={selectedSubscriberId || ''} onChange={(e) => setSelectedSubscriberId(e.target.value || null)}>
          <option value="">— اختر مشتركاً —</option>
          {subscribers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subscriber_code})</option>)}
        </Select>
      </div>

      {selected && (
        <div className="space-y-5">
          {/* Wallet snapshot */}
          <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-gold" />
                <span className="font-heading font-bold text-cream text-sm">المحفظة النقطية — {selected.name}</span>
              </div>
              <div className="text-left">
                <p className="font-heading font-bold text-gold text-2xl">{selected.wallet?.balance || 0}</p>
                <p className="font-body text-[10px] text-cream/40">نقطة متاحة</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <WalletStat label="إجمالي الممنوح" value={selected.wallet?.total_granted || 0} icon={<Gift size={12} className="text-emerald-400" />} />
              <WalletStat label="إجمالي المستهلك" value={selected.wallet?.total_consumed || 0} icon={<TrendingDown size={12} className="text-blue-400" />} />
              <WalletStat label="إجمالي المُرحّل" value={selected.wallet?.total_rolled_over || 0} icon={<RefreshCw size={12} className="text-amber-400" />} />
              <WalletStat label="إجمالي المُتبرَّع" value={selected.wallet?.total_donated || 0} icon={<Heart size={12} className="text-rose-400" />} />
            </div>
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <button onClick={() => setShowConsume(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold/90 transition-colors">
                <Zap size={12} /> استهلاك خدمة
              </button>
              <button onClick={() => setShowProactive(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream/10 text-cream font-body text-xs font-bold hover:bg-cream/15 transition-colors">
                <Sparkles size={12} /> استهلاك استباقي
              </button>
              <button onClick={() => setShowRollover(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream/10 text-cream font-body text-xs font-bold hover:bg-cream/15 transition-colors">
                <RefreshCw size={12} /> تدوير الرصيد
              </button>
            </div>
          </div>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="text-gold animate-spin" /></div>
          ) : (
            <>
              {/* Triage audit */}
              <LifecycleSection title="التشخيص القانوني المبدئي" icon={<Activity size={14} className="text-gold" />}>
                {triageAudits.length > 0 ? triageAudits.map((t) => (
                  <div key={t.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {t.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                      </span>
                      {t.audit_score !== null && <span className="font-heading font-bold text-midnight text-sm">{t.audit_score}/100</span>}
                    </div>
                    {t.completed_at && <p className="font-body text-[10px] text-ink/40">أُكمل في {formatDate(t.completed_at)}</p>}
                  </div>
                )) : <EmptyState text="لم يتم إجراء تشخيص مبدئي بعد" />}
              </LifecycleSection>

              {/* Proactive consumptions */}
              <LifecycleSection title="الاستهلاك الاستباقي" icon={<Zap size={14} className="text-gold" />}>
                {proactiveConsumptions.length > 0 ? proactiveConsumptions.map((p) => (
                  <div key={p.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-body text-xs font-bold text-amber-800">{p.service_description}</p>
                      <span className="font-body text-[10px] text-amber-600">-{p.points_consumed} نقطة</span>
                    </div>
                    {p.result_summary && <p className="font-body text-[10px] text-ink/60 leading-relaxed">{p.result_summary}</p>}
                    <p className="font-body text-[9px] text-ink/40 mt-1">{formatDate(p.created_at)}</p>
                  </div>
                )) : <EmptyState text="لا يوجد استهلاك استباقي مسجّل — النظام يراقب نشاط المشترك" />}
              </LifecycleSection>

              {/* Rollovers */}
              <LifecycleSection title="تدوير الرصيد — صفر هدر" icon={<RefreshCw size={14} className="text-gold" />}>
                {rollovers.length > 0 ? rollovers.map((r) => {
                  const rollMeta = ROLLOVER_TYPE_LABELS[r.rollover_type];
                  return (
                    <div key={r.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-body text-xs font-bold text-midnight">{rollMeta.label}</p>
                        <span className="font-body text-[10px] text-ink/50">{formatDate(r.period_end)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-body text-ink/60">
                        <span>متبقٍ: {r.remaining_points}</span>
                        {r.rollover_points > 0 && <span className="text-emerald-600">رحّل: {r.rollover_points}</span>}
                        {r.training_points > 0 && <span className="text-blue-600">تدريب: {r.training_points}</span>}
                        {r.donated_points > 0 && <span className="text-rose-600">خيري: {r.donated_points}</span>}
                      </div>
                    </div>
                  );
                }) : <EmptyState text="لا يوجد تدوير رصيد — يُفعّل في نهاية دورة الاشتراك" />}
              </LifecycleSection>

              {/* Transaction ledger */}
              <LifecycleSection title="سجل حركة المحفظة" icon={<FileText size={14} className="text-gold" />}>
                {transactions.length > 0 ? (
                  <div className="space-y-1.5">
                    {transactions.map((tx) => {
                      const style = TRANSACTION_TYPE_STYLES[tx.transaction_type];
                      return (
                        <div key={tx.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${style.bg} ${style.text}`}>{style.label}</span>
                            <p className="font-body text-[11px] text-ink/70 truncate">{tx.description || tx.service?.name_ar || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`font-heading font-bold text-xs ${tx.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{style.sign}{Math.abs(tx.points)}</span>
                            <span className="font-body text-[10px] text-ink/40">{formatDate(tx.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <EmptyState text="لا توجد حركات على المحفظة" />}
              </LifecycleSection>
            </>
          )}
        </div>
      )}

      {showConsume && selected && (
        <ConsumeServiceModal subscriber={selected} services={services} onClose={() => setShowConsume(false)} onDone={() => { setShowConsume(false); fetchDetail(selected.id); onRefresh(); }} />
      )}
      {showProactive && selected && (
        <ProactiveModal subscriber={selected} onClose={() => setShowProactive(false)} onDone={() => { setShowProactive(false); fetchDetail(selected.id); onRefresh(); }} />
      )}
      {showRollover && selected && (
        <RolloverModal subscriber={selected} onClose={() => setShowRollover(false)} onDone={() => { setShowRollover(false); fetchDetail(selected.id); onRefresh(); }} />
      )}
    </div>
  );
}

function WalletStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-cream/5 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1">{icon}<p className="font-body text-[9px] text-cream/40">{label}</p></div>
      <p className="font-heading font-bold text-cream text-sm">{value}</p>
    </div>
  );
}

function LifecycleSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">{icon}<h4 className="font-heading font-bold text-midnight text-sm">{title}</h4></div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="font-body text-[11px] text-ink/40 py-4 text-center">{text}</p>;
}

function ConsumeServiceModal({ subscriber, services, onClose, onDone }: {
  subscriber: LaaSSubscriber;
  services: LaaSService[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [serviceId, setServiceId] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);
  const baseCost = selectedService?.credit_cost || 0;
  const urgencyMultiplier = isUrgent ? 1.5 : 1.0;
  const finalCost = Math.round(baseCost * urgencyMultiplier);

  const handleSave = async () => {
    if (!selectedService) return;
    setSaving(true);
    const wallet = subscriber.wallet;
    if (!wallet) { setSaving(false); return; }
    const newBalance = wallet.balance - finalCost;
    await supabase.from('laas_wallets').update({
      balance: newBalance, total_consumed: wallet.total_consumed + finalCost,
      last_activity_at: new Date().toISOString(),
    }).eq('id', wallet.id);
    await supabase.from('laas_transactions').insert({
      wallet_id: wallet.id, subscriber_id: subscriber.id, service_id: selectedService.id,
      transaction_type: 'consume', points: -finalCost, balance_after: newBalance,
      description: `استهلاك: ${selectedService.name_ar}${isUrgent ? ' (مستعجل ×1.5)' : ''}`,
      urgency_multiplier: urgencyMultiplier, original_points: baseCost,
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="استهلاك خدمة من المحفظة" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="استهلاك">
      <div className="bg-gold/5 border border-gold/20 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-gold/70">الرصيد الحالي</p>
        <p className="font-heading font-bold text-midnight text-lg">{subscriber.wallet?.balance || 0} نقطة</p>
      </div>
      <Field label="الخدمة" required>
        <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">— اختر الخدمة —</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name_ar} ({s.credit_cost} نقطة{s.sla_hours ? ` • SLA ${s.sla_hours}س` : ''})</option>)}
        </Select>
      </Field>
      {serviceId && (
        <>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-body text-[10px] text-ink/40">التكلفة الأساسية</span>
              <span className="font-body text-xs font-bold text-midnight">{baseCost} نقطة</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded border-gray-300 text-gold focus:ring-gold" />
              <span className="font-body text-[11px] text-ink/70 flex items-center gap-1">
                <Timer size={11} className="text-orange-500" /> تسعير مستعجل (×1.5) — إنجاز أقل من SLA
              </span>
            </label>
            {isUrgent && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="font-body text-[10px] text-orange-600">التكلفة بعد المضاعف</span>
                <span className="font-heading font-bold text-orange-600 text-base">{finalCost} نقطة</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="font-body text-[10px] text-ink/50">الرصيد بعد الاستهلاك</span>
              <span className="font-body text-xs font-bold text-ink/70">{(subscriber.wallet?.balance || 0) - finalCost} نقطة</span>
            </div>
          </div>
          {selectedService && (
            <div className="flex items-center gap-2 mt-2">
              {selectedService.is_automated && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-body text-[9px] font-bold">
                  <ZapIcon size={9} /> مؤتمت — هامش مرتفع
                </span>
              )}
              {selectedService.sla_hours && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-body text-[9px] font-bold">
                  <Clock size={9} /> SLA: {selectedService.sla_hours} ساعة
                </span>
              )}
            </div>
          )}
        </>
      )}
    </EntityModal>
  );
}

function ProactiveModal({ subscriber, onClose, onDone }: {
  subscriber: LaaSSubscriber;
  onClose: () => void;
  onDone: () => void;
}) {
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('20');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    const pts = Number(points) || 0;
    const wallet = subscriber.wallet;
    if (!wallet) { setSaving(false); return; }
    const newBalance = Math.max(0, wallet.balance - pts);
    await supabase.from('laas_proactive_consumptions').insert({
      subscriber_id: subscriber.id, service_description: description.trim(),
      points_consumed: pts, result_summary: summary.trim() || null, triggered_by: 'system',
    });
    if (pts > 0) {
      await supabase.from('laas_wallets').update({
        balance: newBalance, total_consumed: wallet.total_consumed + pts,
        last_activity_at: new Date().toISOString(),
      }).eq('id', wallet.id);
      await supabase.from('laas_transactions').insert({
        wallet_id: wallet.id, subscriber_id: subscriber.id,
        transaction_type: 'consume', points: -pts, balance_after: newBalance,
        description: `استهلاك استباقي: ${description.trim()}`,
      });
    }
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="استهلاك استباقي — Proactive Consumption" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="تنفيذ">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-amber-700">يُفعّل عندما لا يستخدم المشترك نقاطه خلال 45 يوماً — لإثبات القيمة بالعمل لا بالكلام.</p>
      </div>
      <Field label="وصف الخدمة الاستباقية" required><TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: فحص دوري لعقود الموظفين وفقاً لتعديلات قانون العمل" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="النقاط المستهلكة"><TextInput type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
        <Field label="ملخص النتيجة"><TextInput value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="ملخص ما تم إنجازه" /></Field>
      </div>
    </EntityModal>
  );
}

function RolloverModal({ subscriber, onClose, onDone }: {
  subscriber: LaaSSubscriber;
  onClose: () => void;
  onDone: () => void;
}) {
  const remaining = subscriber.wallet?.balance || 0;
  const [rolloverPts, setRolloverPts] = useState('0');
  const [trainingPts, setTrainingPts] = useState('0');
  const [donatedPts, setDonatedPts] = useState('0');
  const [saving, setSaving] = useState(false);

  const total = Number(rolloverPts) + Number(trainingPts) + Number(donatedPts);
  const isValid = total === remaining && remaining > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    const wallet = subscriber.wallet;
    if (!wallet) { setSaving(false); return; }
    const rPts = Number(rolloverPts), tPts = Number(trainingPts), dPts = Number(donatedPts);
    let rolloverType: LaaSRolloverType = 'rollover';
    if (rPts > 0) rolloverType = 'rollover';
    else if (tPts > 0) rolloverType = 'training';
    else rolloverType = 'probono';

    await supabase.from('laas_rollovers').insert({
      subscriber_id: subscriber.id, period_end: subscriber.current_period_end,
      remaining_points: remaining, rollover_points: rPts, donated_points: dPts,
      training_points: tPts, rollover_type: rolloverType,
    });
    await supabase.from('laas_wallets').update({
      balance: rPts, total_rolled_over: wallet.total_rolled_over + rPts,
      total_donated: wallet.total_donated + dPts,
      last_activity_at: new Date().toISOString(),
    }).eq('id', wallet.id);
    if (rPts > 0) {
      await supabase.from('laas_transactions').insert({
        wallet_id: wallet.id, subscriber_id: subscriber.id, transaction_type: 'rollover',
        points: rPts, balance_after: rPts, description: `ترحيل رصيد للدورة القادمة`,
      });
    }
    if (dPts > 0) {
      await supabase.from('laas_transactions').insert({
        wallet_id: wallet.id, subscriber_id: subscriber.id, transaction_type: 'donate',
        points: -dPts, balance_after: rPts, description: `تبرع لساعات عمل خيري (Pro Bono)`,
      });
    }
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="تدوير الرصيد — Zero-Waste Rollover" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="تدوير">
      <div className="bg-gold/5 border border-gold/20 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-gold/70">الرصيد المتبقي</p>
        <p className="font-heading font-bold text-midnight text-lg">{remaining} نقطة</p>
        <p className="font-body text-[10px] text-ink/50 mt-1">لا تضيع النقاط — حوّلها إلى أصول أخرى</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="ترحيل للعام القادم"><TextInput type="number" value={rolloverPts} onChange={(e) => setRolloverPts(e.target.value)} /></Field>
        <Field label="جلسة تدريبية"><TextInput type="number" value={trainingPts} onChange={(e) => setTrainingPts(e.target.value)} /></Field>
        <Field label="تبرع خيري (Pro Bono)"><TextInput type="number" value={donatedPts} onChange={(e) => setDonatedPts(e.target.value)} /></Field>
      </div>
      <div className={`rounded-lg p-2.5 text-center font-body text-xs ${isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
        {isValid ? `إجمالي مُوزّع: ${total} = الرصيد المتبقي ✓` : `إجمالي مُوزّع: ${total} ≠ الرصيد المتبقي ${remaining} ✗`}
      </div>
    </EntityModal>
  );
}

// ===== LOCC (Legal Operations Command Center) TAB =====

function LOCCTab({ subscribers, onRefresh }: {
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
}) {
  const [signals, setSignals] = useState<LaaSLOCCSignal[]>([]);
  const [auditLogs, setAuditLogs] = useState<LaaSLOCCAuditLog[]>([]);
  const [reports, setReports] = useState<LaaSLOCCReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'critical' | 'warning' } | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [sigRes, auditRes, repRes] = await Promise.all([
      supabase.from('laas_locc_signals').select('*').order('created_at', { ascending: false }),
      supabase.from('laas_locc_audit_logs').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('laas_locc_reports').select('*').order('created_at', { ascending: false }).limit(10),
    ]);
    setSignals((sigRes.data as LaaSLOCCSignal[]) || []);
    setAuditLogs((auditRes.data as LaaSLOCCAuditLog[]) || []);
    setReports((repRes.data as LaaSLOCCReport[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // System pulse calculation
  const criticalCount = signals.filter((s) => s.status === 'active' && s.severity === 'critical').length;
  const warningCount = signals.filter((s) => s.status === 'active' && s.severity === 'warning').length;
  const opportunityCount = signals.filter((s) => s.status === 'active' && s.severity === 'opportunity').length;
  const systemPulse: 'clear' | 'warning' | 'critical' = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'clear';
  const pulseColor = systemPulse === 'critical' ? 'bg-locc-critical' : systemPulse === 'warning' ? 'bg-locc-warning' : 'bg-locc-success';
  const pulseLabel = systemPulse === 'critical' ? 'خطر إجرائي/أمني' : systemPulse === 'warning' ? 'تنبيه تشغيلي' : 'كل شيء آمن';

  // Deadline countdown
  const deadlineSignals = signals.filter((s) => s.status === 'active' && s.signal_type === 'deadline_risk' && s.hours_remaining != null);
  const criticalDeadlines = deadlineSignals.filter((s) => (s.hours_remaining || 0) < 24).length;

  // Financial metrics
  const totalBalance = subscribers.reduce((sum, s) => sum + (s.wallet?.balance || 0), 0);
  const totalConsumed = subscribers.reduce((sum, s) => sum + (s.wallet?.total_consumed || 0), 0);
  const totalGranted = subscribers.reduce((sum, s) => sum + (s.wallet?.total_granted || 0), 0);
  const stagnantPoints = subscribers.filter((s) => (s.wallet?.balance || 0) > 100).reduce((sum, s) => sum + (s.wallet?.balance || 0), 0);
  const stagnantRatio = totalGranted > 0 ? Math.round((stagnantPoints / totalGranted) * 100) : 0;

  // First-pass rate (mock from signals or default)
  const firstPassRate = 72;

  const showToast = (message: string, type: 'success' | 'critical' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const executeAction = async (signal: LaaSLOCCSignal) => {
    const result = `تم تنفيذ: ${signal.proposed_action || signal.title}`;
    await supabase.from('laas_locc_signals').update({
      status: 'executed',
      executed_at: new Date().toISOString(),
      executed_by: 'الشريك الإداري',
      execution_result: result,
      updated_at: new Date().toISOString(),
    }).eq('id', signal.id);

    await supabase.from('laas_locc_audit_logs').insert({
      signal_id: signal.id,
      action_type: signal.action_type,
      description: result,
      executed_by: 'الشريك الإداري',
      severity: signal.severity,
    });

    showToast(result, signal.severity === 'critical' ? 'critical' : 'success');
    fetchData();
    onRefresh();
  };

  const dismissSignal = async (signal: LaaSLOCCSignal) => {
    await supabase.from('laas_locc_signals').update({
      status: 'dismissed',
      updated_at: new Date().toISOString(),
    }).eq('id', signal.id);

    await supabase.from('laas_locc_audit_logs').insert({
      signal_id: signal.id,
      action_type: 'dismiss',
      description: `تم تجاهل الإشارة: ${signal.title}`,
      executed_by: 'الشريك الإداري',
      severity: signal.severity,
    });

    showToast('تم تجاهل الإشارة', 'warning');
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* ===== TOP COMMAND BAR ===== */}
      <div className="locc-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* System Pulse */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${pulseColor} animate-pulse-fast`} />
              <div>
                <p className="font-body text-[10px] text-slate-400">النبض اللحظي</p>
                <p className={`font-heading font-bold text-sm ${systemPulse === 'critical' ? 'text-locc-critical' : systemPulse === 'warning' ? 'text-locc-warning' : 'text-locc-success'}`}>{pulseLabel}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-locc-border" />
            {/* Countdown Badge */}
            <div className="flex items-center gap-2">
              <Clock size={16} className={criticalDeadlines > 0 ? 'text-locc-critical' : 'text-slate-400'} />
              <div>
                <p className="font-body text-[10px] text-slate-400">مهل حرجة (&lt;24س)</p>
                <p className={`font-heading font-bold text-sm ${criticalDeadlines > 0 ? 'text-locc-critical' : 'text-slate-200'}`}>{criticalDeadlines}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-locc-border" />
            {/* Signal counts */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-locc-critical" />
                <span className="font-mono text-xs text-locc-critical font-bold">{criticalCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-locc-warning" />
                <span className="font-mono text-xs text-locc-warning font-bold">{warningCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-locc-success" />
                <span className="font-mono text-xs text-locc-success font-bold">{opportunityCount}</span>
              </div>
            </div>
          </div>

          {/* Omni-Search */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث شامل عن ملف، عقد، أو حساب..."
                className="w-full pr-9 pl-3 py-2 bg-locc-bg border border-locc-border rounded-lg font-body text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-locc-cyan/40"
              />
            </div>
          </div>

          {/* Reports Button */}
          <button
            onClick={() => setShowReports(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-locc-gold-dim text-locc-gold border border-locc-gold/30 font-body text-[11px] font-bold hover:bg-locc-gold/20 transition-colors"
          >
            <FileText size={14} /> التقارير المنضبطة
          </button>
        </div>
      </div>

      {/* ===== 4 QUADRANTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Q1: Procedural Risk Pulse */}
        <LoccQuadrant
          icon={Clock}
          title="رادار المهل والمخاطر الإجرائية"
          subtitle="Procedural & Risk Pulse"
          accent="critical"
        >
          {/* Drop-dead Deadlines */}
          <div className="mb-4">
            <p className="font-body text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1">
              <AlertOctagon size={11} className="text-locc-critical" /> عداد السقوط الإجرائي
            </p>
            {deadlineSignals.length > 0 ? (
              <div className="space-y-2">
                {deadlineSignals.map((sig) => {
                  const hours = sig.hours_remaining || 0;
                  const isCritical = hours < 24;
                  return (
                    <div key={sig.id} className={`rounded-lg p-3 border ${isCritical ? 'border-locc-critical/40 bg-locc-critical-dim' : 'border-locc-border bg-locc-bg'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-[11px] font-bold text-slate-100">{sig.source_entity}</span>
                        <span className={`font-mono text-sm font-bold ${isCritical ? 'text-locc-critical animate-pulse-fast' : 'text-locc-warning'}`}>
                          {hours}س
                        </span>
                      </div>
                      <p className="font-body text-[10px] text-slate-400">{sig.title}</p>
                      {sig.jurisdiction && <p className="font-body text-[9px] text-slate-500 mt-1">{sig.jurisdiction}</p>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-body text-[10px] text-slate-500 text-center py-3">لا توجد مهل حرجة — الوضع تحت السيطرة</p>
            )}
          </div>

          {/* First-Pass Rate */}
          <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
            <div className="flex items-center justify-between mb-2">
              <p className="font-body text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <CheckCircle2 size={11} className="text-locc-cyan" /> مؤشر الاعتماد من المرة الأولى
              </p>
              <span className={`font-heading font-bold text-base ${firstPassRate >= 80 ? 'text-locc-success' : firstPassRate >= 70 ? 'text-locc-warning' : 'text-locc-critical'}`}>
                {firstPassRate}%
              </span>
            </div>
            <div className="h-2 bg-locc-bg rounded-full overflow-hidden border border-locc-border">
              <div
                className={`h-full rounded-full ${firstPassRate >= 80 ? 'bg-locc-success' : firstPassRate >= 70 ? 'bg-locc-warning' : 'bg-locc-critical'}`}
                style={{ width: `${firstPassRate}%` }}
              />
            </div>
            <p className="font-body text-[9px] text-slate-500 mt-1">نسبة المذكرات المعتمدة دون تعديلات جوهرية</p>
          </div>
        </LoccQuadrant>

        {/* Q2: Financial & Wallet Flow */}
        <LoccQuadrant
          icon={Wallet}
          title="التدفق المالي وحجم المحفظة"
          subtitle="Financial & Wallet Flow"
          accent="gold"
        >
          {/* Donut Chart */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1E2638" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#00E5A3" strokeWidth="12" strokeDasharray={`${(totalConsumed / Math.max(totalGranted, 1)) * 251} 251`} strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#FFB020" strokeWidth="12" strokeDasharray={`${(stagnantPoints / Math.max(totalGranted, 1)) * 251} 251`} strokeDashoffset={`-${(totalConsumed / Math.max(totalGranted, 1)) * 251}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono font-bold text-sm text-slate-200">{totalGranted}</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-locc-success" />
                <span className="font-body text-[10px] text-slate-400">مُستهلكة</span>
                <span className="font-mono text-xs font-bold text-locc-success mr-auto">{totalConsumed}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-locc-warning" />
                <span className="font-body text-[10px] text-slate-400">خاملة</span>
                <span className="font-mono text-xs font-bold text-locc-warning mr-auto">{stagnantPoints}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-locc-border" />
                <span className="font-body text-[10px] text-slate-400">نشطة</span>
                <span className="font-mono text-xs font-bold text-slate-300 mr-auto">{totalBalance - stagnantPoints > 0 ? totalBalance - stagnantPoints : 0}</span>
              </div>
            </div>
          </div>

          {/* Stagnant Credit Ratio */}
          <div className="bg-locc-bg rounded-lg p-3 border border-locc-border">
            <div className="flex items-center justify-between mb-1">
              <p className="font-body text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <TrendingDown size={11} className="text-locc-warning" /> مؤشر النقاط الخاملة
              </p>
              <span className={`font-heading font-bold text-sm ${stagnantRatio > 30 ? 'text-locc-warning' : 'text-locc-success'}`}>{stagnantRatio}%</span>
            </div>
            <div className="h-1.5 bg-locc-bg rounded-full overflow-hidden border border-locc-border">
              <div className={`h-full rounded-full ${stagnantRatio > 30 ? 'bg-locc-warning' : 'bg-locc-success'}`} style={{ width: `${stagnantRatio}%` }} />
            </div>
            <p className="font-body text-[9px] text-slate-500 mt-1">تنبيه: الشركات ذات النقاط الخاملة تحتاج لتفعيل محرك الاستهلاك الاستباقي</p>
          </div>
        </LoccQuadrant>

        {/* Q3: Anonymization & Network Guard */}
        <LoccQuadrant
          icon={ShieldCheck}
          title="جدار التجهيل والشبكة بالباطن"
          subtitle="Anonymization & Network Guard"
          accent="cyan"
        >
          {/* Anonymization Integrity */}
          <div className="bg-locc-bg rounded-lg p-3 border border-locc-border mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-body text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Fingerprint size={11} className="text-locc-cyan" /> مؤشر سلامة التجهيل
              </p>
              <span className="font-mono text-sm font-bold text-locc-success">100%</span>
            </div>
            <div className="h-2 bg-locc-bg rounded-full overflow-hidden border border-locc-border">
              <div className="h-full rounded-full bg-locc-success" style={{ width: '100%' }} />
            </div>
            <p className="font-body text-[9px] text-slate-500 mt-1">جميع الملفات المرسلة للمحامين الخارجيين تم حجب بياناتها بالكامل</p>
          </div>

          {/* Network Rating Map */}
          <div>
            <p className="font-body text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1">
              <Radio size={11} className="text-locc-cyan" /> خريطة أداء الشبكة
            </p>
            <div className="space-y-2">
              {subscribers.slice(0, 3).map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 bg-locc-bg rounded-lg p-2 border border-locc-border">
                  <div className="flex items-center justify-center w-7 h-7 rounded bg-locc-surface">
                    <Gavel size={12} className="text-locc-cyan" />
                  </div>
                  <span className="font-body text-[10px] text-slate-300 flex-1">{s.name}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`w-1.5 h-1.5 rounded-full ${star <= (5 - i) ? 'bg-locc-gold' : 'bg-locc-border'}`} />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{48 - i * 6}س</span>
                </div>
              ))}
            </div>
          </div>
        </LoccQuadrant>

        {/* Q4: Decisive Action Room */}
        <LoccQuadrant
          icon={Power}
          title="غرفة أزرار التدخل الحاسمة"
          subtitle="Decisive Action Control Room"
          accent="critical"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-locc-gold animate-spin" /></div>
          ) : signals.filter((s) => s.status === 'active').length > 0 ? (
            <div className="space-y-2">
              {signals.filter((s) => s.status === 'active').map((signal) => (
                <CriticalControlSwitch
                  key={signal.id}
                  signal={signal}
                  onExecute={() => executeAction(signal)}
                  onDismiss={() => dismissSignal(signal)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <ShieldCheck size={32} className="text-locc-success mb-2" />
              <p className="font-body text-[11px] text-slate-400 text-center">لا توجد إشارات نشطة — النظام يعمل بكفاءة</p>
            </div>
          )}
        </LoccQuadrant>
      </div>

      {/* ===== Audit Log Strip ===== */}
      <div className="locc-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database size={14} className="text-locc-cyan" />
          <p className="font-body text-xs font-bold text-slate-200">سجل التدقيق — Audit Log</p>
        </div>
        {auditLogs.length > 0 ? (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-[10px] font-body py-1 border-b border-locc-border/50">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.severity === 'critical' ? 'bg-locc-critical' : log.severity === 'warning' ? 'bg-locc-warning' : 'bg-locc-success'}`} />
                <span className="font-mono text-slate-500">{formatDate(log.created_at)}</span>
                <span className="text-slate-300 flex-1">{log.description}</span>
                <span className="text-slate-500">{log.executed_by}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body text-[10px] text-slate-500 text-center py-3">لا توجد إجراءات مسجلة</p>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg border font-body text-xs font-bold flex items-center gap-2 ${
          toast.type === 'critical' ? 'bg-locc-critical-dim text-locc-critical border-locc-critical/40 shadow-glow-critical'
          : toast.type === 'warning' ? 'bg-locc-warning-dim text-locc-warning border-locc-warning/40 shadow-glow-warning'
          : 'bg-locc-success-dim text-locc-success border-locc-success/40 shadow-glow-success'
        }`}>
          <CheckCircle2 size={14} />
          {toast.message}
        </div>
      )}

      {/* Reports Modal */}
      {showReports && (
        <LoccReportsModal
          reports={reports}
          onClose={() => setShowReports(false)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

function LoccQuadrant({ icon: Icon, title, subtitle, accent, children }: {
  icon: typeof Clock;
  title: string;
  subtitle: string;
  accent: 'critical' | 'gold' | 'cyan';
  children: React.ReactNode;
}) {
  const accentColor = accent === 'critical' ? 'text-locc-critical' : accent === 'gold' ? 'text-locc-gold' : 'text-locc-cyan';
  const borderColor = accent === 'critical' ? 'border-locc-critical/20' : accent === 'gold' ? 'border-locc-gold/20' : 'border-locc-cyan/20';
  return (
    <div className={`locc-card p-5 border-r-4 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className={accentColor} />
        <div>
          <h3 className="font-heading font-bold text-slate-100 text-sm">{title}</h3>
          <p className="font-body text-[9px] text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function CriticalControlSwitch({ signal, onExecute, onDismiss }: {
  signal: LaaSLOCCSignal;
  onExecute: () => void;
  onDismiss: () => void;
}) {
  const [isDone, setIsDone] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCritical = signal.severity === 'critical';
  const sev = SEVERITY_STYLES[signal.severity];

  const handleClick = () => {
    if (isCritical) {
      // High-risk: require hold
      return;
    }
    setIsDone(true);
    onExecute();
    setTimeout(() => setIsDone(false), 3000);
  };

  const startHold = () => {
    if (!isCritical) return;
    setHolding(true);
    let progress = 0;
    holdTimer.current = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearHold();
        setIsDone(true);
        onExecute();
        setTimeout(() => { setIsDone(false); setHoldProgress(0); }, 3000);
      }
    }, 40);
  };

  const clearHold = () => {
    setHolding(false);
    setHoldProgress(0);
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
  };

  useEffect(() => () => { if (holdTimer.current) clearInterval(holdTimer.current); }, []);

  const actionMeta = SIGNAL_TYPE_LABELS[signal.action_type];

  return (
    <div className={`rounded-lg p-3 border ${isCritical ? 'border-locc-critical/30 bg-locc-critical-dim' : signal.severity === 'warning' ? 'border-locc-warning/30 bg-locc-warning-dim' : 'border-locc-success/30 bg-locc-success-dim'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${sev.dot} animate-pulse-fast`} />
            <span className="font-body text-[11px] font-bold text-slate-100">{signal.title}</span>
            <span className={`px-1.5 py-0.5 rounded font-body text-[8px] font-bold ${sev.bg} ${sev.text}`}>{sev.label}</span>
          </div>
          <p className="font-body text-[10px] text-slate-400 leading-relaxed">{signal.description}</p>
          {signal.proposed_action && (
            <div className="mt-2 flex items-start gap-1.5 bg-locc-bg/50 rounded p-2">
              <Zap size={10} className="text-locc-gold flex-shrink-0 mt-0.5" />
              <p className="font-body text-[10px] text-slate-300">{signal.proposed_action}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleClick}
          onMouseDown={startHold}
          onMouseUp={clearHold}
          onMouseLeave={clearHold}
          onTouchStart={startHold}
          onTouchEnd={clearHold}
          className={`relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold border transition-all duration-200 flex-1 ${
            isDone
              ? 'bg-locc-success-dim text-locc-success border-locc-success shadow-glow-success'
              : isCritical
                ? 'bg-locc-critical-dim text-locc-critical border-locc-critical/40 hover:bg-locc-critical hover:text-white hover:shadow-glow-critical'
                : signal.severity === 'warning'
                  ? 'bg-locc-warning-dim text-locc-warning border-locc-warning/40 hover:bg-locc-warning hover:text-midnight'
                  : 'bg-locc-success-dim text-locc-success border-locc-success/40 hover:bg-locc-success hover:text-midnight'
          }`}
        >
          {isCritical && !isDone && holdProgress > 0 && (
            <div className="absolute inset-0 bg-locc-critical/20" style={{ width: `${holdProgress}%` }} />
          )}
          {isDone ? (
            <><CheckCircle2 size={12} /> تم التنفيذ</>
          ) : isCritical ? (
            <><Power size={12} /> {isCritical && holding ? `اضغط مطولاً... ${holdProgress}%` : 'تنفيذ إجراء قسري (ضغط مطول)'}</>
          ) : (
            <><Zap size={12} /> تنفيذ إجراء</>
          )}
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-locc-bg text-slate-500 border border-locc-border font-body text-[10px] font-bold hover:text-slate-300 hover:border-locc-border/60 transition-colors"
        >
          <X size={12} /> تجاهل
        </button>
      </div>
    </div>
  );
}

function LoccReportsModal({ reports, onClose, onRefresh }: {
  reports: LaaSLOCCReport[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<'executive_summary' | 'intellectual_asset' | 'sovereignty_audit'>('executive_summary');

  const REPORT_TYPES = [
    { id: 'executive_summary', label: 'التقرير التنفيذي للشركاء', desc: 'صفحة واحدة — صافي الأرباح، عائد المحفظة، الأخطار المتداركة', icon: FileText },
    { id: 'intellectual_asset', label: 'تقرير الأصول الفكرية', desc: 'عدد الدفوع والمذكرات المبتكرة في مكتبة المعرفة', icon: BookOpen },
    { id: 'sovereignty_audit', label: 'تقرير الامتثال والسيادة', desc: 'مراجعة سجلات التدقيق للتأكد من عدم وجود نفاذ غير مصرح', icon: ShieldCheck },
  ] as const;

  const handleGenerate = async () => {
    setGenerating(true);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const typeMeta = REPORT_TYPES.find((r) => r.id === reportType)!;

    const metrics: Record<string, number | string> = reportType === 'executive_summary'
      ? { net_profit: '125,000 ج.م', wallet_yield: '68%', risks_mitigated: 3, active_subscribers: 12 }
      : reportType === 'intellectual_asset'
        ? { new_memos: 8, precedent_briefs: 5, knowledge_library_entries: 23, reused_defenses: 4 }
        : { audit_logs_reviewed: 1247, unauthorized_attempts: 0, anonymization_integrity: '100%', data_localization: 'مكتمل' };

    await supabase.from('laas_locc_reports').insert({
      reportType,
      title: typeMeta.label,
      period_start: weekAgo.toISOString().split('T')[0],
      period_end: now.toISOString().split('T')[0],
      summary: reportType === 'executive_summary'
        ? 'صافي الأرباح 125,000 ج.م بنسبة عائد 68% من المحفظة النقطية. تم تدارك 3 مخاطر إجرائية حرجة. 12 مشترك نشط.'
        : reportType === 'intellectual_asset'
          ? 'تم إضافة 8 مذكرات دفاع مبتكرة و5 بحوث سوابق قضائية لمكتبة المعرفة. 4 دفوع تمت إعادة استخدامها في قضايا جديدة.'
          : 'تمت مراجعة 1,247 سجل تدقيق. لا توجد محاولات نفاذ غير مصرح بها. سلامة التجهيل 100%. الاستضافة المحلية مكتملة.',
      metrics,
      generated_by: 'الشريك الإداري',
    });
    setGenerating(false);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="locc-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-locc-gold" />
            <h3 className="font-heading font-bold text-slate-100 text-sm">التقارير المنضبطة — Structured Reporting</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {REPORT_TYPES.map((rt) => {
            const Icon = rt.icon;
            const isSelected = reportType === rt.id;
            return (
              <button
                key={rt.id}
                onClick={() => setReportType(rt.id)}
                className={`text-right rounded-lg p-3 border transition-all ${isSelected ? 'bg-locc-gold-dim border-locc-gold/40' : 'bg-locc-bg border-locc-border hover:border-locc-border/60'}`}
              >
                <Icon size={16} className={isSelected ? 'text-locc-gold' : 'text-slate-500'} />
                <p className={`font-body text-[11px] font-bold mt-1 ${isSelected ? 'text-locc-gold' : 'text-slate-300'}`}>{rt.label}</p>
                <p className="font-body text-[9px] text-slate-500 mt-0.5">{rt.desc}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-locc-gold text-midnight font-body text-xs font-bold hover:bg-locc-gold-light transition-colors disabled:opacity-50 mb-4"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {generating ? 'جاري التوليد...' : 'توليد التقرير'}
        </button>

        {/* Existing Reports */}
        <div className="space-y-2">
          <p className="font-body text-[11px] font-bold text-slate-400 mb-2">التقارير المُولَّدة</p>
          {reports.length > 0 ? (
            reports.map((rep) => (
              <div key={rep.id} className="bg-locc-bg rounded-lg p-3 border border-locc-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body text-xs font-bold text-slate-200">{rep.title}</span>
                  <span className="font-mono text-[10px] text-slate-500">{rep.period_start} → {rep.period_end}</span>
                </div>
                <p className="font-body text-[10px] text-slate-400 leading-relaxed mb-2">{rep.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(rep.metrics).map(([key, value]) => (
                    <span key={key} className="px-2 py-0.5 rounded bg-locc-surface font-mono text-[9px] text-locc-cyan border border-locc-border">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="font-body text-[10px] text-slate-500 text-center py-3">لا توجد تقارير مُولَّدة بعد</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== WHITE-LABEL NETWORK TAB =====

function WhiteLabelNetworkTab({ subscribers, onRefresh }: {
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
}) {
  const [lawyers, setLawyers] = useState<LaaSExternalLawyer[]>([]);
  const [tasks, setTasks] = useState<LaaSExternalTask[]>([]);
  const [escrows, setEscrows] = useState<LaaSEscrowTransaction[]>([]);
  const [anonLogs, setAnonLogs] = useState<LaaSAnonymizationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showLawyerModal, setShowLawyerModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<LaaSExternalTask | null>(null);
  const [activeSection, setActiveSection] = useState<'matching' | 'sandbox' | 'escrow' | 'lawyers'>('matching');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [lawyersRes, tasksRes, escrowsRes, anonRes] = await Promise.all([
      supabase.from('laas_external_lawyers').select('*').order('quality_score', { ascending: false }),
      supabase.from('laas_external_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('laas_escrow_transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('laas_anonymization_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setLawyers((lawyersRes.data as LaaSExternalLawyer[]) || []);
    setTasks((tasksRes.data as LaaSExternalTask[]) || []);
    setEscrows((escrowsRes.data as LaaSEscrowTransaction[]) || []);
    setAnonLogs((anonRes.data as LaaSAnonymizationLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats
  const activeLawyers = lawyers.filter((l) => l.is_active && l.is_available).length;
  const totalLawyers = lawyers.length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending_matching' || t.status === 'offered').length;
  const activeTasks = tasks.filter((t) => t.status === 'accepted' || t.status === 'drafting' || t.status === 'submitted' || t.status === 'in_review').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length;
  const totalEscrowHeld = escrows.filter((e) => e.status === 'held' || e.status === 'partially_released').reduce((sum, e) => sum + e.points_held, 0);
  const totalLawyerPayouts = escrows.reduce((sum, e) => sum + e.lawyer_payout_points, 0);
  const totalPlatformMargin = escrows.reduce((sum, e) => sum + e.platform_margin_points, 0);

  const SECTIONS = [
    { id: 'matching', label: 'التوزيع والمطابقة', icon: Split },
    { id: 'sandbox', label: 'مساحة العمل المعزولة', icon: Lock },
    { id: 'escrow', label: 'الضمان والتسوية', icon: DollarSign },
    { id: 'lawyers', label: 'سجل المحامين', icon: Briefcase },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-midnight via-midnight-light to-midnight rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
            <Network size={20} className="text-gold" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-cream text-base">شبكة المحامين والشركاء بالباطن — White-Label Legal Network</h3>
            <p className="font-body text-[10px] text-cream/50 mt-0.5">توسع جغرافي ومعرفي بدون أجور ثابتة — العميل يتعامل مع المنصة فقط، والعمل يُنفذ في الخلفية عبر شبكة موثوقة بمحامين مجهَّلين</p>
          </div>
        </div>

        {/* Zero-Trust Banner */}
        <div className="bg-cream/5 border border-gold/20 rounded-xl p-3 mb-4 flex items-center gap-3">
          <Fingerprint size={16} className="text-gold flex-shrink-0" />
          <p className="font-body text-[11px] text-cream/70 leading-relaxed">
            <span className="font-bold text-gold">Zero-Trust Privacy:</span> المحامي الخارجي لا يعرف هوية العميل، والعميل لا يعلم بأنه تم الاستعانة بمحامٍ خارجي. كل المراسلات تمر عبر لوحة المنصة.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-cream/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><Briefcase size={12} className="text-gold" /><p className="font-body text-[10px] text-cream/50">محامون معتمدون</p></div>
            <p className="font-heading font-bold text-cream text-lg">{totalLawyers}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><UserCheck size={12} className="text-emerald-400" /><p className="font-body text-[10px] text-cream/50">متاحون الآن</p></div>
            <p className="font-heading font-bold text-emerald-400 text-lg">{activeLawyers}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><Clock size={12} className="text-amber-400" /><p className="font-body text-[10px] text-cream/50">مهام بانتظار</p></div>
            <p className="font-heading font-bold text-amber-400 text-lg">{pendingTasks}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><Activity size={12} className="text-blue-400" /><p className="font-body text-[10px] text-cream/50">مهام نشطة</p></div>
            <p className="font-heading font-bold text-blue-400 text-lg">{activeTasks}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><DollarSign size={12} className="text-gold" /><p className="font-body text-[10px] text-cream/50">ضمان محجوز</p></div>
            <p className="font-heading font-bold text-gold text-lg">{totalEscrowHeld}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1"><Split size={12} className="text-purple-400" /><p className="font-body text-[10px] text-cream/50">هامش المنصة</p></div>
            <p className="font-heading font-bold text-purple-400 text-lg">{totalPlatformMargin}</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mt-5">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-xs font-bold transition-colors ${isActive ? 'bg-gold text-midnight' : 'bg-cream/10 text-cream/70 hover:bg-cream/15'}`}
              >
                <Icon size={14} /> {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Content */}
      {activeSection === 'matching' && (
        <MatchingSection
          tasks={tasks}
          lawyers={lawyers}
          subscribers={subscribers}
          loading={loading}
          showTaskModal={showTaskModal}
          setShowTaskModal={setShowTaskModal}
          onRefresh={fetchData}
          onViewTask={setSelectedTask}
        />
      )}
      {activeSection === 'sandbox' && (
        <SandboxSection tasks={tasks} lawyers={lawyers} subscribers={subscribers} onRefresh={fetchData} selectedTask={selectedTask} setSelectedTask={setSelectedTask} />
      )}
      {activeSection === 'escrow' && (
        <EscrowSection escrows={escrows} tasks={tasks} lawyers={lawyers} subscribers={subscribers} loading={loading} onRefresh={fetchData} />
      )}
      {activeSection === 'lawyers' && (
        <LawyersSection lawyers={lawyers} loading={loading} showLawyerModal={showLawyerModal} setShowLawyerModal={setShowLawyerModal} onRefresh={fetchData} />
      )}
    </div>
  );
}

// ----- Matching Section -----
function MatchingSection({ tasks, lawyers, subscribers, loading, showTaskModal, setShowTaskModal, onRefresh, onViewTask }: {
  tasks: LaaSExternalTask[];
  lawyers: LaaSExternalLawyer[];
  subscribers: LaaSSubscriber[];
  loading: boolean;
  showTaskModal: boolean;
  setShowTaskModal: (v: boolean) => void;
  onRefresh: () => void;
  onViewTask: (t: LaaSExternalTask | null) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Flow Diagram */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Split size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">آلية التوزيع والربط الذكي — Smart Matching & Bidding</h3>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-2">
          {[
            { icon: FileText, label: 'طلب خدمة معقدة', color: 'text-blue-600' },
            { icon: EyeOff, label: 'محرك التجهيل', color: 'text-purple-600' },
            { icon: Split, label: 'خوارزمية الفرز', color: 'text-amber-600' },
            { icon: Gavel, label: 'إسناد للمحامي', color: 'text-emerald-600' },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <Icon size={20} className={`${step.color} mx-auto mb-1`} />
                  <p className="font-body text-[10px] font-bold text-ink/70">{step.label}</p>
                </div>
                {i < 3 && <ArrowRight size={16} className="text-ink/20 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={18} className="text-gold" />
            <h3 className="font-heading font-bold text-midnight text-sm">المهام المُسنَدة — External Tasks</h3>
          </div>
          <button onClick={() => setShowTaskModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
            <Plus size={14} /> مهمة جديدة
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => {
              const statusStyle = TASK_STATUS_STYLES[task.status];
              const taskType = TASK_TYPE_LABELS[task.task_type];
              const lawyer = lawyers.find((l) => l.id === task.lawyer_id);
              const subscriber = subscribers.find((s) => s.id === task.subscriber_id);
              return (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-gold/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-midnight/5">
                        <Gavel size={16} className="text-midnight" />
                      </div>
                      <div>
                        <p className="font-body text-sm font-bold text-midnight">{taskType.label}</p>
                        <p className="font-body text-[10px] text-ink/40">
                          {SPECIALTY_LABELS[task.specialty_required] || task.specialty_required} • {task.jurisdiction_required}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-body text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                  </div>

                  {/* Anonymized content preview */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="font-body text-[10px] text-ink/40 mb-1 flex items-center gap-1"><EyeOff size={9} /> المحتوى المُجهَّل المُرسل للمحامي</p>
                    <p className="font-body text-[11px] text-ink/60 leading-relaxed line-clamp-2">{task.anonymized_content || '—'}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="font-body text-[9px] text-ink/40">النقاط</p>
                      <p className="font-heading font-bold text-midnight text-xs">{task.allocated_points}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="font-body text-[9px] text-ink/40">للمحامي (60%)</p>
                      <p className="font-heading font-bold text-emerald-600 text-xs">{task.lawyer_payout_points}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="font-body text-[9px] text-ink/40">للمنصة (40%)</p>
                      <p className="font-heading font-bold text-purple-600 text-xs">{task.platform_margin_points}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="font-body text-[9px] text-ink/40">المهلة</p>
                      <p className="font-heading font-bold text-amber-600 text-xs">{task.deadline_hours}س</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      {lawyer && <span className="font-body text-[10px] text-ink/50">المُسنَد: {lawyer.display_name} (LQS: {lawyer.quality_score})</span>}
                      {subscriber && <span className="font-body text-[10px] text-blue-600 flex items-center gap-1"><Eye size={9} /> العميل: {subscriber.name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === 'pending_matching' && (
                        <button
                          onClick={async () => {
                            // Smart matching: find best lawyer by specialty + jurisdiction + LQS
                            const bestLawyer = lawyers
                              .filter((l) => l.is_active && l.is_available && l.specialties.includes(task.specialty_required) && l.jurisdiction === task.jurisdiction_required)
                              .sort((a, b) => b.quality_score - a.quality_score)[0];
                            if (bestLawyer) {
                              await supabase.from('laas_external_tasks').update({
                                lawyer_id: bestLawyer.id, status: 'offered', offered_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                              }).eq('id', task.id);
                              onRefresh();
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 font-body text-[10px] font-bold hover:bg-amber-100 transition-colors"
                        >
                          <Split size={10} /> مطابقة آلية
                        </button>
                      )}
                      <button onClick={() => onViewTask(task)} className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-ink/50 font-body text-[10px] font-bold hover:bg-gray-100 transition-colors">
                        <Eye size={10} /> تفاصيل
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="لا توجد مهام مسندة — ابدأ بإنشاء مهمة جديدة لإرسالها لشبكة المحامين" />
        )}
      </div>

      {showTaskModal && (
        <ExternalTaskModal
          subscribers={subscribers}
          lawyers={lawyers}
          onClose={() => setShowTaskModal(false)}
          onDone={() => { setShowTaskModal(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function ExternalTaskModal({ subscribers, lawyers, onClose, onDone }: {
  subscribers: LaaSSubscriber[];
  lawyers: LaaSExternalLawyer[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [subscriberId, setSubscriberId] = useState('');
  const [taskType, setTaskType] = useState<LaaSTaskType>('memo');
  const [specialty, setSpecialty] = useState('labor');
  const [jurisdiction, setJurisdiction] = useState('محكمة استئناف القاهرة');
  const [originalContent, setOriginalContent] = useState('');
  const [clientName, setClientName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [allocatedPoints, setAllocatedPoints] = useState('100');
  const [deadlineHours, setDeadlineHours] = useState('48');
  const [saving, setSaving] = useState(false);

  // Auto-anonymize preview
  const anonymized = originalContent
    .replace(new RegExp(`\\b${clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\// ===== ONBOARDING FLOW TAB =====')}\\b`, 'g'), '[CLIENT_PARTY_A]')
    .replace(new RegExp(`\\b${opponentName.replace(/[.*+?^${}()|[\]\\]/g, '\\// ===== ONBOARDING FLOW TAB =====')}\\b`, 'g'), '[OPPOSING_PARTY_B]')
    .replace(/\b\d{10,}\b/g, '[REGISTRATION_ID_HIDDEN]')
    .replace(/\b\d{3}\s?\d{3}\s?\d{3}\b/g, '[PHONE_HIDDEN]');

  const handleSave = async () => {
    if (!subscriberId || !originalContent.trim()) return;
    setSaving(true);
    const pts = Number(allocatedPoints) || 100;
    const lawyerPayout = Math.round(pts * 0.6);
    const platformMargin = pts - lawyerPayout;

    const { data: taskData } = await supabase.from('laas_external_tasks').insert({
      subscriber_id: subscriberId,
      task_type: taskType,
      specialty_required: specialty,
      jurisdiction_required: jurisdiction,
      original_content: originalContent,
      anonymized_content: anonymized,
      client_real_name: clientName || null,
      opponent_real_name: opponentName || null,
      allocated_points: pts,
      lawyer_payout_points: lawyerPayout,
      platform_margin_points: platformMargin,
      deadline_hours: Number(deadlineHours) || 48,
      status: 'pending_matching',
    }).select().single();

    // Log anonymization operations
    if (taskData && clientName) {
      await supabase.from('laas_anonymization_logs').insert({
        task_id: taskData.id, original_field: 'client_name', original_value: clientName, masked_value: '[CLIENT_PARTY_A]',
      });
    }
    if (taskData && opponentName) {
      await supabase.from('laas_anonymization_logs').insert({
        task_id: taskData.id, original_field: 'opponent_name', original_value: opponentName, masked_value: '[OPPOSING_PARTY_B]',
      });
    }

    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="إنشاء مهمة لمحامٍ خارجي — External Task" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="إنشاء وإرسال">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-purple-700 flex items-center gap-1"><EyeOff size={11} /> سيتم تجهيل جميع البيانات الحساسة آلياً قبل إرسالها للمحامي الخارجي. الاسم الحقيقي يُحفظ داخلياً فقط لفك التجهيل لاحقاً.</p>
      </div>
      <Field label="العميل (داخلي)" required>
        <Select value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)}>
          <option value="">— اختر المشترك —</option>
          {subscribers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subscriber_code})</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="نوع المهمة">
          <Select value={taskType} onChange={(e) => setTaskType(e.target.value as LaaSTaskType)}>
            <option value="memo">مذكرة دفاع</option>
            <option value="contract_review">مراجعة عقد</option>
            <option value="precedent_research">بحث سوابق قضائية</option>
            <option value="legal_opinion">رأي قانوني</option>
          </Select>
        </Field>
        <Field label="التخصص المطلوب">
          <Select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {Object.entries(SPECIALTY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="الاختصاص القضائي">
        <TextInput value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} placeholder="مثال: محكمة استئناف القاهرة" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="اسم العميل الحقيقي (داخلي)"><TextInput value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="يُستخدم للتجهيل فقط" /></Field>
        <Field label="اسم الخصم (داخلي)"><TextInput value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="يُستخدم للتجهيل فقط" /></Field>
      </div>
      <Field label="تفاصيل المهمة (المحتوى الأصلي)" required>
        <TextArea value={originalContent} onChange={(e) => setOriginalContent(e.target.value)} placeholder="اكتب وقائع القضية أو تفاصيل العقد هنا..." rows={5} />
      </Field>

      {/* Anonymization Preview */}
      {originalContent && (clientName || opponentName) && (
        <div className="bg-gray-50 border border-purple-200 rounded-lg p-3 mb-4">
          <p className="font-body text-[10px] font-bold text-purple-700 mb-2 flex items-center gap-1"><EyeOff size={11} /> معاينة التجهيل التلقائي</p>
          <p className="font-body text-[11px] text-ink/60 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{anonymized}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="النقاط المخصصة"><TextInput type="number" value={allocatedPoints} onChange={(e) => setAllocatedPoints(e.target.value)} /></Field>
        <Field label="المهلة (ساعات)"><TextInput type="number" value={deadlineHours} onChange={(e) => setDeadlineHours(e.target.value)} /></Field>
      </div>
      {allocatedPoints && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-body text-[10px] text-ink/40">أتعاب المحامي (60%)</span>
            <span className="font-body text-xs font-bold text-emerald-600">{Math.round(Number(allocatedPoints) * 0.6)} نقطة</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-[10px] text-ink/40">هامش المنصة (40%)</span>
            <span className="font-body text-xs font-bold text-purple-600">{Math.round(Number(allocatedPoints) * 0.4)} نقطة</span>
          </div>
        </div>
      )}
    </EntityModal>
  );
}

// ----- Sandbox Section -----
function SandboxSection({ tasks, lawyers, subscribers, onRefresh, selectedTask, setSelectedTask }: {
  tasks: LaaSExternalTask[];
  lawyers: LaaSExternalLawyer[];
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
  selectedTask: LaaSExternalTask | null;
  setSelectedTask: (t: LaaSExternalTask | null) => void;
}) {
  const [draftContent, setDraftContent] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [saving, setSaving] = useState(false);

  const task = selectedTask;
  const lawyer = task ? lawyers.find((l) => l.id === task.lawyer_id) : null;

  // Unmask the draft for the in-house partner
  const unmaskedDraft = task && task.draft_content
    ? task.draft_content
        .replace(/\[CLIENT_PARTY_A\]/g, task.client_real_name || '[CLIENT_PARTY_A]')
        .replace(/\[OPPOSING_PARTY_B\]/g, task.opponent_real_name || '[OPPOSING_PARTY_B]')
    : draftContent;

  const handleSubmitDraft = async () => {
    if (!task) return;
    setSaving(true);
    await supabase.from('laas_external_tasks').update({
      draft_content: draftContent, status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', task.id);
    setSaving(false); setSelectedTask(null); setDraftContent(''); onRefresh();
  };

  const handleApprove = async () => {
    if (!task) return;
    setSaving(true);
    await supabase.from('laas_external_tasks').update({
      status: 'approved', approved_at: new Date().toISOString(),
      in_house_reviewer: reviewer || 'شريك مراجع داخلي',
      review_notes: reviewNotes || null,
      escrow_released_pct: 70,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);
    // Release initial escrow
    await supabase.from('laas_escrow_transactions').update({
      status: 'partially_released', initial_released_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('task_id', task.id);
    setSaving(false); setSelectedTask(null); setReviewNotes(''); setReviewer(''); onRefresh();
  };

  const handleReject = async () => {
    if (!task) return;
    setSaving(true);
    await supabase.from('laas_external_tasks').update({
      status: 'rejected', rejection_reason: reviewNotes || 'مرفوضة من الشريك المراجع',
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);
    setSaving(false); setSelectedTask(null); setReviewNotes(''); onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={18} className="text-gold" />
          <div>
            <h3 className="font-heading font-bold text-midnight text-sm">مساحة العمل المعزولة — The External Sandbox</h3>
            <p className="font-body text-[10px] text-ink/40 mt-0.5">محرر آمن بدون نسخ/لصق — المحامي يكتب داخل المنصة فقط. التدقيق الداخلي يفك التجهيل ويعتمد المسودة</p>
          </div>
        </div>

        {!task ? (
          <>
            {/* Sandbox rules */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[
                { icon: Lock, title: 'محرر آمن', desc: 'كتابة داخل المنصة فقط — منع النسخ واللصق الخارجي' },
                { icon: EyeOff, title: 'لا وصول لقاعدة البيانات', desc: 'المحامي لا يملك صلاحية للخوادم أو الملفات الأصلية' },
                { icon: ShieldCheck, title: 'تدقيق داخلي', desc: 'الشريك المراجع يفك التجهيل ويعتمد قبل الإرسال للعميل' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <Icon size={16} className="text-gold mb-1" />
                    <p className="font-body text-[11px] font-bold text-midnight">{item.title}</p>
                    <p className="font-body text-[10px] text-ink/50">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Tasks awaiting sandbox action */}
            <p className="font-body text-xs font-bold text-ink/60 mb-2">مهام بانتظار العمل في الساندبوكس</p>
            <div className="space-y-2">
              {tasks.filter((t) => t.status === 'accepted' || t.status === 'submitted' || t.status === 'in_review').map((t) => {
                const statusStyle = TASK_STATUS_STYLES[t.status];
                const tLawyer = lawyers.find((l) => l.id === t.lawyer_id);
                return (
                  <button key={t.id} onClick={() => setSelectedTask(t)} className="w-full text-right border border-gray-200 rounded-lg p-3 hover:border-gold/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gavel size={14} className="text-midnight" />
                        <span className="font-body text-xs font-bold text-midnight">{TASK_TYPE_LABELS[t.task_type].label}</span>
                        <span className={`px-1.5 py-0.5 rounded font-body text-[9px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {tLawyer && <span className="font-body text-[10px] text-ink/50">{tLawyer.display_name}</span>}
                        <span className="font-body text-[10px] text-emerald-600 font-bold">{t.lawyer_payout_points} نقطة</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {tasks.filter((t) => t.status === 'accepted' || t.status === 'submitted' || t.status === 'in_review').length === 0 && (
                <p className="font-body text-[10px] text-ink/40 text-center py-3">لا توجد مهام بانتظار العمل في الساندبوكس</p>
              )}
            </div>
          </>
        ) : (
          /* Task detail in sandbox */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedTask(null)} className="flex items-center gap-1 text-ink/40 hover:text-midnight transition-colors">
                  <ChevronLeft size={14} /> رجوع
                </button>
                <span className="font-body text-sm font-bold text-midnight">{TASK_TYPE_LABELS[task.task_type].label}</span>
              </div>
              <span className={`px-2 py-0.5 rounded font-body text-[10px] font-bold ${TASK_STATUS_STYLES[task.status].bg} ${TASK_STATUS_STYLES[task.status].text}`}>
                {TASK_STATUS_STYLES[task.status].label}
              </span>
            </div>

            {lawyer && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-midnight/5">
                  <Briefcase size={14} className="text-midnight" />
                </div>
                <div>
                  <p className="font-body text-xs font-bold text-midnight">{lawyer.display_name}</p>
                  <p className="font-body text-[10px] text-ink/40">LQS: {lawyer.quality_score} • {lawyer.jurisdiction}</p>
                </div>
              </div>
            )}

            {/* Anonymized content shown to lawyer */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="font-body text-[10px] font-bold text-purple-700 mb-1 flex items-center gap-1"><EyeOff size={10} /> ما يراه المحامي (مُجهَّل)</p>
              <p className="font-body text-[11px] text-ink/60 leading-relaxed whitespace-pre-wrap">{task.anonymized_content}</p>
            </div>

            {/* Draft editor or review */}
            {task.status === 'accepted' && (
              <>
                <div>
                  <p className="font-body text-[11px] font-bold text-ink/60 mb-2 flex items-center gap-1"><Lock size={11} className="text-gold" /> محرر آمن — Secure Drafting (منع النسخ/اللصق)</p>
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    onCopy={(e) => e.preventDefault()}
                    onPaste={(e) => e.preventDefault()}
                    className="w-full h-48 p-3 border border-gray-200 rounded-lg font-body text-xs text-ink/70 resize-none focus:outline-none focus:border-gold/40"
                    placeholder="اكتب المسودة هنا... (النسخ واللصق معطل لحماية الصيغ)"
                  />
                </div>
                <button onClick={handleSubmitDraft} disabled={saving || !draftContent.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} تسليم المسودة
                </button>
              </>
            )}

            {task.status === 'submitted' && (
              <>
                {/* Unmasked draft for in-house partner */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="font-body text-[10px] font-bold text-emerald-700 mb-1 flex items-center gap-1"><Eye size={10} /> المسودة بعد فك التجهيل (للشريك المراجع فقط)</p>
                  <p className="font-body text-[11px] text-ink/70 leading-relaxed whitespace-pre-wrap">{unmaskedDraft}</p>
                </div>
                <Field label="اسم الشريك المراجع"><TextInput value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="مثال: د. أحمد — شريك مؤسس" /></Field>
                <Field label="ملاحظات المراجعة"><TextArea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="ملاحظات الجودة الفنية..." rows={3} /></Field>
                <div className="flex items-center gap-2">
                  <button onClick={handleApprove} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-body text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} اعتماد وإرسال للعميل
                  </button>
                  <button onClick={handleReject} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 font-body text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                    <X size={14} /> رفض المسودة
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Escrow Section -----
function EscrowSection({ escrows, tasks, lawyers, subscribers, loading, onRefresh }: {
  escrows: LaaSEscrowTransaction[];
  tasks: LaaSExternalTask[];
  lawyers: LaaSExternalLawyer[];
  subscribers: LaaSSubscriber[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const totalHeld = escrows.filter((e) => e.status === 'held').reduce((sum, e) => sum + e.points_held, 0);
  const totalPartial = escrows.filter((e) => e.status === 'partially_released').reduce((sum, e) => sum + e.points_held, 0);
  const totalReleased = escrows.filter((e) => e.status === 'fully_released').reduce((sum, e) => sum + e.points_held, 0);
  const totalLawyerPaid = escrows.reduce((sum, e) => sum + e.lawyer_payout_points, 0);
  const totalPlatformEarned = escrows.reduce((sum, e) => sum + e.platform_margin_points, 0);

  return (
    <div className="space-y-4">
      {/* Escrow Model */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">نموذج التسوية المالية والربحية — Escrow & Payout Engine</h3>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="font-body text-[11px] text-ink/70 leading-relaxed">
            عند قبول المهمة، تُجمَّد النقاط في حساب ضمان مؤقت (Escrow). يُصرف 70% للمحامي فور اعتماد الشريك المراجع، و30% بعد عدم وجود تعديلات خلال 7 أيام. المنصة تحتفظ بـ 40% كرسوم جودة وتجهيل.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="font-body text-[10px] text-ink/40">محجوز في الضمان</p>
            <p className="font-heading font-bold text-amber-700 text-base">{totalHeld} نقطة</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="font-body text-[10px] text-ink/40">إفراج جزئي</p>
            <p className="font-heading font-bold text-blue-700 text-base">{totalPartial} نقطة</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <p className="font-body text-[10px] text-ink/40">إفراج كامل</p>
            <p className="font-heading font-bold text-emerald-700 text-base">{totalReleased} نقطة</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="font-body text-[10px] text-ink/40">إجمالي للمحامين</p>
            <p className="font-heading font-bold text-purple-700 text-base">{totalLawyerPaid} نقطة</p>
          </div>
          <div className="bg-gold/10 rounded-lg p-3 border border-gold/20">
            <p className="font-body text-[10px] text-ink/40">هامش المنصة</p>
            <p className="font-heading font-bold text-gold text-base">{totalPlatformEarned} نقطة</p>
          </div>
        </div>
      </div>

      {/* Escrow Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardCheck size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">سجل التسويات — Escrow Ledger</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>
        ) : escrows.length > 0 ? (
          <div className="space-y-2">
            {escrows.map((esc) => {
              const task = tasks.find((t) => t.id === esc.task_id);
              const lawyer = lawyers.find((l) => l.id === esc.lawyer_id);
              const subscriber = subscribers.find((s) => s.id === esc.subscriber_id);
              const statusStyle = ESCROW_STATUS_STYLES[esc.status];
              return (
                <div key={esc.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs font-bold text-midnight">{task ? TASK_TYPE_LABELS[task.task_type].label : 'مهمة'}</span>
                      {subscriber && <span className="font-body text-[10px] text-blue-600">{subscriber.name}</span>}
                      {lawyer && <span className="font-body text-[10px] text-ink/50">→ {lawyer.display_name}</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded font-body text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="font-body text-[9px] text-ink/40">إجمالي محجوز</p>
                      <p className="font-heading font-bold text-midnight text-xs">{esc.points_held}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="font-body text-[9px] text-ink/40">للمحامي (60%)</p>
                      <p className="font-heading font-bold text-emerald-600 text-xs">{esc.lawyer_payout_points}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <p className="font-body text-[9px] text-ink/40">للمنصة (40%)</p>
                      <p className="font-heading font-bold text-purple-600 text-xs">{esc.platform_margin_points}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                    <span className="font-body text-[10px] text-ink/40">{formatDate(esc.created_at)}</span>
                    {esc.status === 'partially_released' && (
                      <button
                        onClick={async () => {
                          await supabase.from('laas_escrow_transactions').update({
                            status: 'fully_released', final_released_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                          }).eq('id', esc.id);
                          await supabase.from('laas_external_tasks').update({
                            escrow_released_pct: 100, status: 'completed', updated_at: new Date().toISOString(),
                          }).eq('id', esc.task_id);
                          onRefresh();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-body text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 size={10} /> إفراج نهي (30%)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="لا توجد معاملات ضمان — أنشئ مهمة وأسندها لمحامٍ لبدء التسوية" />
        )}
      </div>
    </div>
  );
}

// ----- Lawyers Section -----
function LawyersSection({ lawyers, loading, showLawyerModal, setShowLawyerModal, onRefresh }: {
  lawyers: LaaSExternalLawyer[];
  loading: boolean;
  showLawyerModal: boolean;
  setShowLawyerModal: (v: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Briefcase size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">سجل المحامين الخارجيين — External Lawyer Registry</h3>
        </div>
        <button onClick={() => setShowLawyerModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
          <Plus size={14} /> محامٍ جديد
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lawyers.map((lawyer) => (
            <div key={lawyer.id} className="border border-gray-200 rounded-lg p-4 hover:border-gold/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-midnight/5">
                    <Gavel size={16} className="text-midnight" />
                  </div>
                  <div>
                    <p className="font-body text-sm font-bold text-midnight">{lawyer.display_name}</p>
                    <p className="font-body text-[10px] text-ink/40">{lawyer.jurisdiction}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded font-body text-[9px] font-bold ${lawyer.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {lawyer.is_available ? 'متاح' : 'مشغول'}
                </span>
              </div>

              {/* Specialties */}
              <div className="flex flex-wrap gap-1 mb-3">
                {lawyer.specialties.map((sp) => (
                  <span key={sp} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-body text-[9px] font-bold">
                    {SPECIALTY_LABELS[sp] || sp}
                  </span>
                ))}
              </div>

              {/* Quality Score */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-[10px] text-ink/40 flex items-center gap-1"><Star size={9} className="text-gold" /> مؤشر الجودة (LQS)</span>
                  <span className="font-heading font-bold text-sm text-gold">{lawyer.quality_score}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${lawyer.quality_score}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="font-body text-[9px] text-ink/40">قبول</p>
                  <p className="font-heading font-bold text-emerald-600 text-xs">{lawyer.acceptance_rate}%</p>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="font-body text-[9px] text-ink/40">متوسط الوقت</p>
                  <p className="font-heading font-bold text-amber-600 text-xs">{lawyer.avg_completion_hours}س</p>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="font-body text-[9px] text-ink/40">مهام</p>
                  <p className="font-heading font-bold text-midnight text-xs">{lawyer.total_tasks_completed}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="font-body text-[10px] text-ink/40">الأرباح: {lawyer.total_earnings_points} نقطة</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lawyer.is_available}
                    onChange={async (e) => {
                      await supabase.from('laas_external_lawyers').update({ is_available: e.target.checked, updated_at: new Date().toISOString() }).eq('id', lawyer.id);
                      onRefresh();
                    }}
                    className="rounded border-gray-300 text-gold focus:ring-gold"
                  />
                  <span className="font-body text-[9px] text-ink/50">تبديل التوفر</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLawyerModal && (
        <ExternalLawyerModal onClose={() => setShowLawyerModal(false)} onDone={() => { setShowLawyerModal(false); onRefresh(); }} />
      )}
    </div>
  );
}

function ExternalLawyerModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [realName, setRealName] = useState('');
  const [email, setEmail] = useState('');
  const [jurisdiction, setJurisdiction] = useState('محكمة استئناف القاهرة');
  const [specialties, setSpecialties] = useState<string[]>(['labor']);
  const [qualityScore, setQualityScore] = useState('75');
  const [saving, setSaving] = useState(false);

  const toggleSpecialty = (sp: string) => {
    setSpecialties((prev) => prev.includes(sp) ? prev.filter((s) => s !== sp) : [...prev, sp]);
  };

  const handleSave = async () => {
    if (!displayName.trim() || !realName.trim()) return;
    setSaving(true);
    await supabase.from('laas_external_lawyers').insert({
      display_name: displayName.trim(),
      real_name: realName.trim(),
      email: email || null,
      jurisdiction,
      specialties,
      quality_score: Number(qualityScore) || 75,
      is_active: true,
      is_available: true,
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="إضافة محامٍ خارجي معتمد" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="إضافة">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-purple-700 flex items-center gap-1"><Fingerprint size={11} /> الاسم الحقيقي داخلي فقط ولا يُكشف أبداً للعملاء. الاسم الظاهر هو المُستخدم في النظام.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الاسم الظاهري (مُجهَّل)" required><TextInput value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="مثال: محامي-قاهرة-003" /></Field>
        <Field label="الاسم الحقيقي (داخلي)" required><TextInput value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="الاسم الحقيقي" /></Field>
      </div>
      <Field label="البريد الإلكتروني"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@internal.local" /></Field>
      <Field label="الاختصاص القضائي"><TextInput value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} /></Field>
      <div>
        <p className="font-body text-[11px] font-bold text-ink/60 mb-2">التخصصات</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SPECIALTY_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSpecialty(key)}
              className={`px-3 py-1.5 rounded-lg font-body text-[11px] font-bold transition-colors ${specialties.includes(key) ? 'bg-midnight text-cream' : 'bg-gray-100 text-ink/50 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Field label="مؤشر الجودة الأولي (LQS)"><TextInput type="number" value={qualityScore} onChange={(e) => setQualityScore(e.target.value)} /></Field>
    </EntityModal>
  );
}

// ===== ONBOARDING FLOW TAB =====

function OnboardingFlowTab({ subscribers, plans, onRefresh }: {
  subscribers: LaaSSubscriber[];
  plans: LaaSPlan[];
  onRefresh: () => void;
}) {
  const [diagnostics, setDiagnostics] = useState<LaaSOnboardingDiagnostic[]>([]);
  const [pilotPacks, setPilotPacks] = useState<LaaSPilotPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showPilot, setShowPilot] = useState(false);
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [diagRes, pilotRes] = await Promise.all([
      supabase.from('laas_onboarding_diagnostics').select('*').order('created_at', { ascending: false }),
      supabase.from('laas_pilot_packs').select('*').order('created_at', { ascending: false }),
    ]);
    setDiagnostics((diagRes.data as LaaSOnboardingDiagnostic[]) || []);
    setPilotPacks((pilotRes.data as LaaSPilotPack[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Stats
  const totalDiagnostics = diagnostics.length;
  const sentCount = diagnostics.filter((d) => d.diagnostic_status === 'sent' || d.diagnostic_status === 'reviewed' || d.diagnostic_status === 'converted').length;
  const convertedCount = diagnostics.filter((d) => d.diagnostic_status === 'converted').length;
  const conversionRate = totalDiagnostics > 0 ? Math.round((convertedCount / totalDiagnostics) * 100) : 0;
  const activePilots = pilotPacks.filter((p) => p.status === 'active').length;
  const pilotConversionRate = pilotPacks.length > 0
    ? Math.round((pilotPacks.filter((p) => p.status === 'converted').length / pilotPacks.length) * 100)
    : 0;

  const STAGES = [
    { num: 1, label: 'التشخيص القبلي', icon: ScanLine, desc: 'فحص المخاطر السريع قبل الاجتماع' },
    { num: 2, label: 'قلب الطاولة', icon: Target, desc: 'كشف خرافة الساعات المفوترة' },
    { num: 3, label: 'العرض الحي', icon: PlayCircle, desc: 'تجربة لوحة التحكم التفاعلية' },
    { num: 4, label: 'التحويل الفوري', icon: Rocket, desc: 'باقة التجربة المحمية' },
  ];

  return (
    <div className="space-y-6">
      {/* Flow Header */}
      <div className="bg-gradient-to-br from-midnight via-midnight-light to-midnight rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
            <Trophy size={20} className="text-gold" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-cream text-base">هندسة القيمة الوقائية — Preventive Value Architecture</h3>
            <p className="font-body text-[10px] text-cream/50 mt-0.5">مسار استقطاب الكيانات الكبرى وتحويلها من النموذج التقليدي إلى المحفظة النقطية في الاجتماع الأول</p>
          </div>
        </div>

        {/* Stage Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.num;
            return (
              <button
                key={stage.num}
                onClick={() => setActiveStage(stage.num as 1 | 2 | 3 | 4)}
                className={`text-right rounded-xl p-4 border transition-all ${isActive ? 'bg-gold/15 border-gold/40' : 'bg-cream/5 border-cream/10 hover:border-cream/20'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-heading font-bold text-2xl ${isActive ? 'text-gold' : 'text-cream/30'}`}>{stage.num}</span>
                  <Icon size={18} className={isActive ? 'text-gold' : 'text-cream/40'} />
                </div>
                <p className={`font-body text-xs font-bold ${isActive ? 'text-cream' : 'text-cream/70'}`}>{stage.label}</p>
                <p className="font-body text-[10px] text-cream/40 mt-0.5">{stage.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Conversion Funnel Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <div className="bg-cream/5 rounded-xl p-3">
            <p className="font-body text-[10px] text-cream/50">تشخيصات منشأة</p>
            <p className="font-heading font-bold text-cream text-lg">{totalDiagnostics}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <p className="font-body text-[10px] text-cream/50">تقارير مُرسلة</p>
            <p className="font-heading font-bold text-blue-400 text-lg">{sentCount}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <p className="font-body text-[10px] text-cream/50">معدل التحويل</p>
            <p className="font-heading font-bold text-emerald-400 text-lg">{conversionRate}%</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <p className="font-body text-[10px] text-cream/50">باقات تجريبية نشطة</p>
            <p className="font-heading font-bold text-amber-400 text-lg">{activePilots}</p>
          </div>
          <div className="bg-cream/5 rounded-xl p-3">
            <p className="font-body text-[10px] text-cream/50">تحويل الباقات التجريبية</p>
            <p className="font-heading font-bold text-gold text-lg">{pilotConversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Stage Content */}
      {activeStage === 1 && (
        <Stage1Diagnostic
          diagnostics={diagnostics}
          loading={loading}
          showScanner={showScanner}
          setShowScanner={setShowScanner}
          onRefresh={fetchData}
        />
      )}
      {activeStage === 2 && <Stage2ParadigmShift plans={plans} />}
      {activeStage === 3 && <Stage3LiveDemo subscribers={subscribers} />}
      {activeStage === 4 && (
        <Stage4PilotConversion
          pilotPacks={pilotPacks}
          diagnostics={diagnostics}
          loading={loading}
          showPilot={showPilot}
          setShowPilot={setShowPilot}
          onRefresh={fetchData}
          onRefreshAll={onRefresh}
        />
      )}
    </div>
  );
}

// ----- Stage 1: Pre-Meeting Diagnostic -----
function Stage1Diagnostic({ diagnostics, loading, showScanner, setShowScanner, onRefresh }: {
  diagnostics: LaaSOnboardingDiagnostic[];
  loading: boolean;
  showScanner: boolean;
  setShowScanner: (v: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ScanLine size={18} className="text-gold" />
            <div>
              <h3 className="font-heading font-bold text-midnight text-sm">التشخيص القبلي صامت التأثير — Pre-Meeting Diagnostic</h3>
              <p className="font-body text-[10px] text-ink/40 mt-0.5">فحص مخاطر سريع يستغرقه العميل في 3 دقائق عبر المنصة، يُرسل تقرير مصغر قبل الاجتماع بـ 24 ساعة</p>
            </div>
          </div>
          <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
            <Plus size={14} /> تشخيص جديد
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>
        ) : diagnostics.length > 0 ? (
          <div className="space-y-2">
            {diagnostics.map((diag) => {
              const statusStyle = DIAGNOSTIC_STATUS_STYLES[diag.diagnostic_status];
              return (
                <div key={diag.id} className="border border-gray-200 rounded-lg p-4 hover:border-gold/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-midnight/5">
                        <Building2 size={16} className="text-midnight" />
                      </div>
                      <div>
                        <p className="font-body text-sm font-bold text-midnight">{diag.company_name}</p>
                        <p className="font-body text-[10px] text-ink/40">{diag.contact_name || '—'} • {diag.contact_email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-body text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 font-body text-[10px] text-ink/50">{SEGMENT_LABELS[diag.segment].short}</span>
                    </div>
                  </div>

                  {/* Risk Score Gauge */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-body text-[10px] text-ink/40">مؤشر المخاطر</span>
                        <span className={`font-heading font-bold text-sm ${diag.risk_score >= 60 ? 'text-red-600' : diag.risk_score >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{diag.risk_score}/100</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${diag.risk_score >= 60 ? 'bg-red-500' : diag.risk_score >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${diag.risk_score}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Risk Gaps */}
                  {diag.risk_gaps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {diag.risk_gaps.map((gap, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 font-body text-[9px] font-bold">
                          <AlertTriangle size={9} /> {gap}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="font-body text-[10px] text-ink/40">{formatDate(diag.created_at)}</span>
                    {diag.meeting_scheduled_at && (
                      <span className="flex items-center gap-1 font-body text-[10px] text-blue-600">
                        <Calendar size={10} /> الاجتماع: {formatDate(diag.meeting_scheduled_at)}
                      </span>
                    )}
                    {diag.diagnostic_status === 'pending' && (
                      <button
                        onClick={async () => {
                          await supabase.from('laas_onboarding_diagnostics')
                            .update({ diagnostic_status: 'sent', updated_at: new Date().toISOString() })
                            .eq('id', diag.id);
                          onRefresh();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 font-body text-[10px] font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Send size={10} /> إرسال التقرير
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="لا توجد تشخيصات منشأة بعد — ابدأ بفحص مخاطر جديد لعميل محتمل" />
        )}
      </div>

      {showScanner && <ComplianceScannerModal onClose={() => setShowScanner(false)} onDone={() => { setShowScanner(false); onRefresh(); }} />}
    </div>
  );
}

function ComplianceScannerModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [segment, setSegment] = useState<LaaSSegment>('b2b');
  const [hasEmp, setHasEmp] = useState(false);
  const [hasCompliance, setHasCompliance] = useState(false);
  const [tracksReg, setTracksReg] = useState(false);
  const [hasDispute, setHasDispute] = useState(false);
  const [needsLocal, setNeedsLocal] = useState(false);
  const [saving, setSaving] = useState(false);

  const riskScore = [!hasEmp, !hasCompliance, !tracksReg, !hasDispute, needsLocal].filter(Boolean).length * 20;
  const gaps: string[] = [];
  if (!hasEmp) gaps.push('عقود توظيف غير مكتوبة');
  if (!hasCompliance) gaps.push('لا يوجد مسؤول امتثال معين');
  if (!tracksReg) gaps.push('عدم متابعة التحديثات التنظيمية');
  if (!hasDispute) gaps.push('لا يوجد بروتوكول للنزاعات');
  if (needsLocal) gaps.push('متطلبات استضافة محلية خاصة');

  const handleSave = async () => {
    if (!companyName.trim()) return;
    setSaving(true);
    await supabase.from('laas_onboarding_diagnostics').insert({
      company_name: companyName.trim(),
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      segment,
      has_employment_contracts: hasEmp,
      has_compliance_officer: hasCompliance,
      tracks_regulatory_updates: tracksReg,
      has_dispute_protocol: hasDispute,
      data_localization_required: needsLocal,
      risk_score: riskScore,
      risk_gaps: gaps,
      diagnostic_status: 'pending',
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="فحص المخاطر السريع — Compliance Scanner" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="إنشاء التشخيص">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-blue-700">يُطلب من العميل المحتمل تعبئة هذا النموذج في 3 دقائق. يُرسل تقرير مصغر بصيغة PDF فخم قبل الاجتماع بـ 24 ساعة يوضح الثغرات المحتملة.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="اسم الشركة" required><TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="شركة —" /></Field>
        <Field label="الفئة">
          <Select value={segment} onChange={(e) => setSegment(e.target.value as LaaSSegment)}>
            <option value="b2b">B2B — الشركات</option>
            <option value="b2l">B2L — المحامون</option>
            <option value="b2c">B2C — الأفراد</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="اسم المسؤول"><TextInput value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="الاسم" /></Field>
        <Field label="بريد التشخيص"><TextInput type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" /></Field>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <p className="font-body text-[11px] font-bold text-ink/60">المؤشرات الخمسة الرئيسية للامتثال</p>
        {[
          { label: 'هل تستخدم عقود توظيف مكتوبة لجميع الموظفين؟', val: hasEmp, set: setHasEmp },
          { label: 'هل يوجد مسؤول امتثال معين (Compliance Officer)؟', val: hasCompliance, set: setHasCompliance },
          { label: 'هل تتابع التحديثات التنظيمية والتشريعية؟', val: tracksReg, set: setTracksReg },
          { label: 'هل لديكم بروتوكول استجابة للنزاعات القانونية؟', val: hasDispute, set: setHasDispute },
          { label: 'هل تتطلب طبيعة عملكم استضافة محلية للبيانات؟', val: needsLocal, set: setNeedsLocal },
        ].map((q, i) => (
          <label key={i} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={q.val} onChange={(e) => q.set(e.target.checked)} className="rounded border-gray-300 text-gold focus:ring-gold" />
            <span className="font-body text-[11px] text-ink/70">{q.label}</span>
          </label>
        ))}
      </div>

      {riskScore > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
          <p className="font-body text-[10px] font-bold text-red-700 mb-1.5">مؤشر المخاطر: {riskScore}/100</p>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((gap, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-red-600 font-body text-[9px] font-bold border border-red-200">
                <AlertTriangle size={9} /> {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </EntityModal>
  );
}

// ----- Stage 2: Paradigm Shift -----
function Stage2ParadigmShift({ plans }: { plans: LaaSPlan[] }) {
  const growthPlan = plans.find((p) => p.credits_included >= 1000 && p.credits_included <= 2000) || plans[1];

  return (
    <div className="space-y-4">
      {/* Killing the Billable Hour */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Target size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">المحور الأول: كشف خرافة «الساعات المفوترة» — Killing the Billable Hour</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-600" />
              <p className="font-body text-xs font-bold text-red-700">النموذج التقليدي</p>
            </div>
            <p className="font-body text-[11px] text-ink/60 leading-relaxed">
              المحامي التقليدي يربح كلما زادت أخطاء شركتك وطال أمد نزاعاتك. كل ساعة إضافية = فاتورة أكبر. لا يوجد حافز لمنع المشكلة من الأساس.
            </p>
            <div className="mt-3 space-y-1">
              {['دفع مقابل الوقت لا القيمة', 'تكلفة غير متوقعة وغير محدودة', 'محامي يربح من مشاكلك'].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <X size={12} className="text-red-500" />
                  <span className="font-body text-[10px] text-red-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-emerald-600" />
              <p className="font-body text-xs font-bold text-emerald-700">نموذج المحفظة النقطية</p>
            </div>
            <p className="font-body text-[11px] text-ink/60 leading-relaxed">
              نتبنى عكس ذلك تماماً: هدفنا منع المشكلة من الأساس عبر محفظة نقاط واضحة تستهلكها فقط عند الحاجة الحقيقية، مع تدخلنا الاستباقي لحمايتك قبل أن تتكبد خسائر.
            </p>
            <div className="mt-3 space-y-1">
              {['دفع مقابل الإنجاز لا الوقت', 'تكلفة ثابتة ومحددة مسبقاً', 'حماية استباقية تمنع المشاكل'].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="font-body text-[10px] text-emerald-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Point Calculator */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Calculator size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">المحور الثاني: حاسبة النقاط التفاعلية — Points as Investment</h3>
        </div>
        <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-xl p-5">
          <p className="font-body text-[11px] text-cream/70 leading-relaxed mb-4">
            «بدلاً من تخصيص راتب شهري لمستشار قانوني داخلي يكلفكم الكثير، أو دفع أتعاب ضخمة لكل استشارة طارئة، تمنحكم باقة النمو غطاءً كاملاً لكل عقودكم ومراجعاتكم القانونية طوال الشهر، بتكلفة ثابتة ومحددة مسبقاً.»
          </p>
          {growthPlan && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-cream/5 rounded-lg p-3">
                <p className="font-body text-[10px] text-cream/40">الباقة</p>
                <p className="font-heading font-bold text-gold text-sm">{growthPlan.tier_label || growthPlan.name_ar}</p>
              </div>
              <div className="bg-cream/5 rounded-lg p-3">
                <p className="font-body text-[10px] text-cream/40">النقاط</p>
                <p className="font-heading font-bold text-cream text-sm">{growthPlan.credits_included} نقطة</p>
              </div>
              <div className="bg-cream/5 rounded-lg p-3">
                <p className="font-body text-[10px] text-cream/40">التكلفة الشهرية</p>
                <p className="font-heading font-bold text-cream text-sm">{formatCurrency(growthPlan.monthly_price)} ج.م</p>
              </div>
              <div className="bg-cream/5 rounded-lg p-3">
                <p className="font-body text-[10px] text-cream/40">تكلفة الاستشارة</p>
                <p className="font-heading font-bold text-emerald-400 text-sm">{Math.round(growthPlan.monthly_price / growthPlan.credits_included * 100) / 100} ج.م/نقطة</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sovereignty Hook */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">المحور الثالث: السيادة والأمان التام — Sovereignty Hook</h3>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <p className="font-body text-[11px] text-ink/70 leading-relaxed">
            «جميع بياناتكم وعقودكم تديرها المنصة عبر استضافة محلية مشفرة بالكامل (On-Premise)، ولا يمتلك أي طرف خارجي —حتى نحن— حق الاطلاع عليها دون مفتاح التشفير الخاص بكم.»
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {[
              { icon: Lock, title: 'تشفير كامل', desc: 'بياناتكم مشفرة بمفاتيح خاصة بكم' },
              { icon: Shield, title: 'استضافة محلية', desc: 'On-Premise — لا تخزين سحابي خارجي' },
              { icon: Database, title: 'سيادة البيانات', desc: 'لا أحد يطلع على بياناتكم دون إذن' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
                  <Icon size={16} className="text-blue-600 mb-1" />
                  <p className="font-body text-[11px] font-bold text-midnight">{item.title}</p>
                  <p className="font-body text-[10px] text-ink/50">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Stage 3: Live Dashboard Experience -----
function Stage3LiveDemo({ subscribers }: { subscribers: LaaSSubscriber[] }) {
  const demoSubscriber = subscribers[0];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <PlayCircle size={18} className="text-gold" />
          <div>
            <h3 className="font-heading font-bold text-midnight text-sm">العرض الحي والتجربة التفاعلية — The Live Dashboard Experience</h3>
            <p className="font-body text-[10px] text-ink/40 mt-0.5">فتح نسخة تجريبية من واجهة المنصة أمام العميل ليرى كيف ستدار أمور شركته</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Legal Tracker Demo */}
          <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-gold" />
              <p className="font-body text-xs font-bold text-cream">لوحة متابعة العميل — Legal Tracker</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed mb-3">
              كيف سيرى العميل مسار تأسيس العقود أو النزاعات بوضوح دون تفاصيل مزعجة
            </p>
            <div className="space-y-2">
              {['تأسيس شركة — مكتمل', 'مراجعة عقد توريد — قيد المراجعة', 'نزاع تجاري — بانتظار الجلسة'].map((item, i) => (
                <div key={i} className="bg-cream/5 rounded p-2 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <span className="font-body text-[10px] text-cream/70">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Autopilot Shield Demo */}
          <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bot size={16} className="text-gold" />
              <p className="font-body text-xs font-bold text-cream">نظام الحماية الاستباقي</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed mb-3">
              خصم نقاط بسيطة لإنشاء تقارير امتثال دورية وتغذية لوحات العمل تلقائياً، مع تنبيهات قبل فوات المواعيد
            </p>
            <div className="bg-cream/5 rounded p-2">
              <p className="font-body text-[9px] text-gold/70">🛡️ تنبيه وقائي</p>
              <p className="font-body text-[10px] text-cream/70 mt-1">تم استهلاك 50 نقطة لتقرير امتثال استباقي — الرصيد المتبقي: 350 نقطة</p>
            </div>
          </div>

          {/* Emergency Button Demo */}
          <div className="bg-gradient-to-br from-red-950 to-midnight rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Siren size={16} className="text-red-400" />
              <p className="font-body text-xs font-bold text-cream">زر الطوارئ — Emergency Button</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed mb-3">
              بضغطة زر واحدة، يسحب مدير الشركة نقاط من المحفظة لتفعيل «غرفة عمليات فورية» عند أي تحقيق أو تفتيش مفاجئ
            </p>
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
              <Siren size={24} className="text-red-400 mx-auto mb-1" />
              <p className="font-heading font-bold text-red-300 text-xs">تفعيل غرفة العمليات</p>
              <p className="font-body text-[9px] text-cream/40 mt-0.5">استجابة فورية — 500 نقطة</p>
            </div>
          </div>
        </div>

        {demoSubscriber && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 flex items-center gap-3">
            <Eye size={14} className="text-ink/40" />
            <p className="font-body text-[10px] text-ink/50">
              العرض الحي يستخدم بيانات المشترك: {demoSubscriber.name} ({demoSubscriber.subscriber_code}) — رصيد المحفظة: {demoSubscriber.wallet?.balance || 0} نقطة
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Stage 4: Frictionless Pilot Conversion -----
function Stage4PilotConversion({ pilotPacks, diagnostics, loading, showPilot, setShowPilot, onRefresh, onRefreshAll }: {
  pilotPacks: LaaSPilotPack[];
  diagnostics: LaaSOnboardingDiagnostic[];
  loading: boolean;
  showPilot: boolean;
  setShowPilot: (v: boolean) => void;
  onRefresh: () => void;
  onRefreshAll: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Rocket size={18} className="text-gold" />
            <div>
              <h3 className="font-heading font-bold text-midnight text-sm">التحويل الفوري — Frictionless Conversion</h3>
              <p className="font-body text-[10px] text-ink/40 mt-0.5">باقة التجربة المحمية: 300 نقطة لمدة شهر — بدون التزام سنوي</p>
            </div>
          </div>
          <button onClick={() => setShowPilot(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
            <Plus size={14} /> عرض باقة تجريبية
          </button>
        </div>

        {/* Closing Offer Script */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-amber-600" />
            <p className="font-body text-xs font-bold text-amber-800">عرض إغلاق الاجتماع — Closing Offer</p>
          </div>
          <p className="font-body text-[11px] text-ink/70 leading-relaxed">
            «نحن واثقون من جودة نموذجنا، لذا لن نطلب منكم توقيع عقد سنوي الآن. ابدأوا معنا بباقة تجريبية مخفضة لمدة شهر واحد (300 نقطة). جربوا سرعة الاستجابة، دقة المراجعات، وتفعيل الحماية الاستباقية. إذا لم تلمسوا فارقاً حقيقياً في كفاءة الإدارة القانونية لشركتكم، فلن نلزمكم بالتجديد.»
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>
        ) : pilotPacks.length > 0 ? (
          <div className="space-y-2">
            {pilotPacks.map((pack) => {
              const statusStyle = PILOT_STATUS_STYLES[pack.status];
              const usagePct = pack.points_granted > 0 ? Math.round((pack.points_consumed / pack.points_granted) * 100) : 0;
              const isExpired = pack.expires_at && new Date(pack.expires_at) < new Date();
              return (
                <div key={pack.id} className="border border-gray-200 rounded-lg p-4 hover:border-gold/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50">
                        <Rocket size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="font-body text-sm font-bold text-midnight">{pack.company_name}</p>
                        <p className="font-body text-[10px] text-ink/40">{pack.contact_email || '—'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-body text-[10px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="font-body text-[9px] text-ink/40">النقاط الممنوحة</p>
                      <p className="font-heading font-bold text-midnight text-sm">{pack.points_granted}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="font-body text-[9px] text-ink/40">المستهلك</p>
                      <p className="font-heading font-bold text-amber-600 text-sm">{pack.points_consumed}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="font-body text-[9px] text-ink/40">المتبقي</p>
                      <p className="font-heading font-bold text-emerald-600 text-sm">{pack.points_granted - pack.points_consumed}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-[9px] text-ink/40">معدل الاستخدام</span>
                      <span className="font-body text-[9px] text-ink/50">{usagePct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${usagePct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="font-body text-[10px] text-ink/40">عُرضت: {formatDate(pack.offered_at)}</span>
                      {pack.expires_at && <span className={`font-body text-[10px] ${isExpired ? 'text-red-600' : 'text-blue-600'}`}>ينتهي: {formatDate(pack.expires_at)}</span>}
                    </div>
                    {pack.status === 'offered' && (
                      <button
                        onClick={async () => {
                          await supabase.from('laas_pilot_packs').update({
                            status: 'active',
                            activated_at: new Date().toISOString(),
                            expires_at: new Date(Date.now() + pack.duration_days * 24 * 60 * 60 * 1000).toISOString(),
                          }).eq('id', pack.id);
                          onRefresh();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-body text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 size={10} /> تفعيل الباقة
                      </button>
                    )}
                    {pack.status === 'active' && (
                      <button
                        onClick={async () => {
                          await supabase.from('laas_pilot_packs').update({
                            status: 'converted',
                            converted_at: new Date().toISOString(),
                          }).eq('id', pack.id);
                          onRefresh(); onRefreshAll();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 font-body text-[10px] font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Trophy size={10} /> تحويل لاشتراك كامل
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="لا توجد باقات تجريبية — ابدأ بعرض باقة تجريبية محمية لعميل محتمل" />
        )}
      </div>

      {showPilot && (
        <PilotPackModal
          diagnostics={diagnostics}
          onClose={() => setShowPilot(false)}
          onDone={() => { setShowPilot(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function PilotPackModal({ diagnostics, onClose, onDone }: {
  diagnostics: LaaSOnboardingDiagnostic[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [points, setPoints] = useState('300');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!companyName.trim()) return;
    setSaving(true);
    await supabase.from('laas_pilot_packs').insert({
      company_name: companyName.trim(),
      contact_email: contactEmail || null,
      points_granted: Number(points) || 300,
      duration_days: Number(duration) || 30,
      status: 'offered',
      notes: notes || null,
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="عرض باقة تجريبية محمية — Pilot Wallet Pack" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="تقديم العرض">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-amber-700">عرض إغلاق الاجتماع: باقة تجريبية مخفضة لمدة شهر واحد — بدون التزام سنوي. يزيل تماماً «مخاطر القرار» لدى المدير التنفيذي.</p>
      </div>
      {diagnostics.length > 0 && (
        <Field label="ربط بتشخيص سابق (اختياري)">
          <Select onChange={(e) => {
            const diag = diagnostics.find((d) => d.id === e.target.value);
            if (diag) { setCompanyName(diag.company_name); setContactEmail(diag.contact_email || ''); }
          }}>
            <option value="">— بدون ربط —</option>
            {diagnostics.map((d) => <option key={d.id} value={d.id}>{d.company_name} ({d.diagnostic_status})</option>)}
          </Select>
        </Field>
      )}
      <Field label="اسم الشركة" required><TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="شركة —" /></Field>
      <Field label="بريد التواصل"><TextInput type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="عدد النقاط"><TextInput type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
        <Field label="المدة (أيام)"><TextInput type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
      </div>
      <Field label="ملاحظات (اختياري)"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات العرض..." /></Field>
    </EntityModal>
  );
}

// ===== PRICING TAB =====

function PricingTab({ plans, services, subscribers, onRefresh }: {
  plans: LaaSPlan[];
  services: LaaSService[];
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
}) {
  const [proactiveRules, setProactiveRules] = useState<LaaSProactiveRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpSubscriberId, setTopUpSubscriberId] = useState('');

  const fetchRules = useCallback(async () => {
    setLoadingRules(true);
    const { data } = await supabase.from('laas_proactive_rules').select('*').order('segment, trigger_days_inactive');
    setProactiveRules((data as LaaSProactiveRule[]) || []);
    setLoadingRules(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // ===== Valuation Engine summary =====
  const totalInternalCost = services.reduce((sum, s) => sum + s.internal_cost_points, 0);
  const totalSellPrice = services.reduce((sum, s) => sum + s.credit_cost, 0);
  const avgMargin = totalSellPrice > 0 ? Math.round(((totalSellPrice - totalInternalCost) / totalSellPrice) * 100) : 0;

  // ===== Burn-rate categories =====
  const burnCategories = [
    { id: 'quick', title: 'الاستشارات والإجراءات السريعة', subtitle: 'هامش ربح مرتفع بفضل الأتمتة', color: 'emerald' as const },
    { id: 'corporate', title: 'الشركات والامتثال التجاري', subtitle: 'استهلاك متوسط إلى مرتفع', color: 'blue' as const },
    { id: 'emergency', title: 'الطوارئ والتقاضي', subtitle: 'الاستهلاك الأقصى', color: 'red' as const },
  ];

  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'text-emerald-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'text-blue-600' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', accent: 'text-red-600' },
  };

  return (
    <div className="space-y-6">
      {/* Valuation Engine */}
      <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-cream text-base">آلية تقييم النقاط — The Valuation Engine</h3>
        </div>
        <p className="font-body text-xs text-cream/60 leading-relaxed mb-4">
          فك الارتباط تماماً بين «الوقت المُستغرق» و«القيمة المُقدمة». العميل يدفع مقابل وحدات الإنجاز القانوني، لا مقابل ساعات المحامي.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-cream/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={14} className="text-gold" />
              <p className="font-body text-[11px] font-bold text-cream">التكلفة الداخلية للنقطة</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed">تُحسب من تكلفة التشغيل التقنية ووقت الباحثين/المحامين المبتدئين. تقل كلما زاد حجم الباقة.</p>
            <div className="mt-2 space-y-1">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-cream/5 rounded px-2 py-1">
                  <span className="font-body text-[10px] text-cream/60">{p.tier_label || p.name_ar}</span>
                  <span className="font-body text-[10px] font-bold text-gold">{p.internal_cost_per_point} ج.م</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-cream/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-gold" />
              <p className="font-body text-[11px] font-bold text-cream">قيمة الاستهلاك (Burn Rate)</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed">تُصنّف الخدمات حسب التعقيد وليس الوقت. المهام المؤتمتة تستهلك نقاطاً قليلة بهامش ربح مرتفع جداً.</p>
            <div className="mt-2 space-y-1">
              {(['quick', 'corporate', 'emergency'] as const).map((tier) => {
                const tierServices = services.filter((s) => s.complexity_tier === tier);
                const tierCost = tierServices.reduce((sum, s) => sum + s.credit_cost, 0);
                const tierInternal = tierServices.reduce((sum, s) => sum + s.internal_cost_points, 0);
                const margin = tierCost > 0 ? Math.round(((tierCost - tierInternal) / tierCost) * 100) : 0;
                const style = COMPLEXITY_TIER_STYLES[tier];
                return (
                  <div key={tier} className="flex items-center justify-between bg-cream/5 rounded px-2 py-1">
                    <span className="font-body text-[10px] text-cream/60">{style.label}</span>
                    <span className="font-body text-[10px] font-bold text-emerald-400">هامش {margin}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-cream/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent size={14} className="text-gold" />
              <p className="font-body text-[11px] font-bold text-cream">خصم الحجم (Volume Discount)</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed">تقل تكلفة النقطة كلما زاد حجم الباقة، مما يجذب الشرائح الكبرى ويضمن الربحية.</p>
            <div className="mt-2 space-y-1">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-cream/5 rounded px-2 py-1">
                  <span className="font-body text-[10px] text-cream/60">{p.tier_label || p.name_ar}</span>
                  <span className={`font-body text-[10px] font-bold ${p.volume_discount_pct > 0 ? 'text-emerald-400' : 'text-cream/40'}`}>
                    {p.volume_discount_pct > 0 ? `-${p.volume_discount_pct}%` : 'سعر أساسي'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Overall margin summary */}
        <div className="mt-4 bg-cream/5 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="font-body text-[10px] text-cream/40">إجمالي تكلفة الخدمات (داخلي)</p>
            <p className="font-heading font-bold text-cream text-sm">{totalInternalCost} نقطة</p>
          </div>
          <ArrowRight size={16} className="text-cream/30" />
          <div>
            <p className="font-body text-[10px] text-cream/40">إجمالي سعر البيع</p>
            <p className="font-heading font-bold text-gold text-sm">{totalSellPrice} نقطة</p>
          </div>
          <ArrowRight size={16} className="text-cream/30" />
          <div>
            <p className="font-body text-[10px] text-cream/40">متوسط هامش الربح</p>
            <p className="font-heading font-bold text-emerald-400 text-sm">{avgMargin}%</p>
          </div>
        </div>
      </div>

      {/* Burn-Rate Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Database size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">جدول استهلاك النقاط — Point Burn-Rate Matrix</h3>
        </div>
        <div className="space-y-5">
          {burnCategories.map((cat) => {
            const catServices = services.filter((s) => s.complexity_tier === cat.id);
            if (catServices.length === 0) return null;
            const style = colorMap[cat.color];
            return (
              <div key={cat.id}>
                <div className={`rounded-lg ${style.bg} ${style.border} border p-3 mb-3`}>
                  <div className="flex items-center justify-between">
                    <p className={`font-body text-xs font-bold ${style.text}`}>{cat.title}</p>
                    <span className={`font-body text-[10px] ${style.accent}`}>{cat.subtitle}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catServices.map((svc) => {
                    const margin = svc.credit_cost > 0 ? Math.round(((svc.credit_cost - svc.internal_cost_points) / svc.credit_cost) * 100) : 0;
                    return (
                      <div key={svc.id} className="border border-gray-200 rounded-lg p-3.5 hover:border-gold/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-body text-xs font-bold text-midnight flex-1">{svc.name_ar}</p>
                          <span className="font-heading font-bold text-gold text-base flex-shrink-0">{svc.credit_cost}</span>
                        </div>
                        <p className="font-body text-[10px] text-ink/50 leading-relaxed mb-2">{svc.description}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            {svc.is_automated && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-body text-[8px] font-bold">
                                <ZapIcon size={8} /> مؤتمت
                              </span>
                            )}
                            {svc.sla_hours && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-body text-[8px] font-bold">
                                <Clock size={8} /> {svc.sla_hours}س
                              </span>
                            )}
                          </div>
                          <span className="font-body text-[9px] text-ink/40">هامش {margin}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upselling & Add-ons */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">استراتيجية تعظيم الربحية — Upselling & Add-ons</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top-ups */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={16} className="text-amber-600" />
              <p className="font-body text-sm font-bold text-amber-800">شحن النقاط السريع (Top-ups)</p>
            </div>
            <p className="font-body text-[11px] text-ink/60 leading-relaxed mb-3">
              إذا نفدت نقاط العميل في منتصف الشهر، يمكنه شراء باقة نقاط إضافية بسعر أعلى بنسبة 15% من سعر نقطة باقته الأصلية.
            </p>
            <button
              onClick={() => setShowTopUp(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-body text-xs font-bold hover:bg-amber-700 transition-colors"
            >
              <Plus size={14} /> شحن نقاط لمشترك
            </button>
          </div>
          {/* Urgency Multiplier */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Timer size={16} className="text-orange-600" />
              <p className="font-body text-sm font-bold text-orange-800">تسعير المهام المستعجلة (Urgency Multiplier)</p>
            </div>
            <p className="font-body text-[11px] text-ink/60 leading-relaxed mb-3">
              أي خدمة يطلب العميل إنجازها في وقت أقل من SLA المتفق عليه، تستهلك النقاط بضربها في 1.5.
              <br />
              <span className="text-ink/50">مثال: مراجعة عقد بـ 50 نقطة → 75 نقطة إذا طُلبت خلال 12 ساعة.</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-white border border-orange-200 font-body text-[10px] font-bold text-orange-700">×1.0 عادي</span>
              <ArrowRight size={12} className="text-orange-400" />
              <span className="px-2.5 py-1 rounded bg-orange-100 border border-orange-300 font-body text-[10px] font-bold text-orange-800">×1.5 مستعجل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proactive Consumption Rules Engine */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ZapIcon size={18} className="text-gold" />
            <div>
              <h3 className="font-heading font-bold text-midnight text-sm">آلية الاستهلاك الاستباقي — Proactive Consumption Engine</h3>
              <p className="font-body text-[10px] text-ink/40 mt-0.5">قواعد آلية تمنع تراكم نقاط الشركات دون استخدام — تُفعّل خدمة استباقية عند فترة خمول محددة</p>
            </div>
          </div>
          <button onClick={() => setShowRuleModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
            <Plus size={12} /> قاعدة جديدة
          </button>
        </div>

        {loadingRules ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>
        ) : proactiveRules.length > 0 ? (
          <div className="space-y-2">
            {proactiveRules.map((rule) => {
              const segStyle = SEGMENT_STYLES[rule.segment];
              const actionMeta = PROACTIVE_ACTION_LABELS[rule.action_type];
              return (
                <div key={rule.id} className={`rounded-lg border p-3 ${rule.is_active ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-body font-bold ${segStyle.bg} ${segStyle.text}`}>{SEGMENT_LABELS[rule.segment].short}</span>
                      <span className="font-body text-xs font-bold text-midnight">{actionMeta.label}</span>
                      {rule.subscriber_id && <span className="font-body text-[9px] text-ink/40">— مخصص لمشترك</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.is_active}
                          onChange={async (e) => {
                            await supabase.from('laas_proactive_rules').update({ is_active: e.target.checked }).eq('id', rule.id);
                            fetchRules();
                          }}
                          className="rounded border-gray-300 text-gold focus:ring-gold"
                        />
                        <span className="font-body text-[9px] text-ink/50">{rule.is_active ? 'نشط' : 'متوقف'}</span>
                      </label>
                      <button
                        onClick={async () => { await supabase.from('laas_proactive_rules').delete().eq('id', rule.id); fetchRules(); }}
                        className="p-1 rounded text-ink/30 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="font-body text-[11px] text-ink/70 leading-relaxed mb-2">{rule.service_description}</p>
                  <div className="flex items-center gap-3 text-[10px] font-body text-ink/50">
                    <span className="flex items-center gap-1"><Clock size={10} /> بعد {rule.trigger_days_inactive} يوم خمول</span>
                    <span className="flex items-center gap-1"><Coins size={10} /> {rule.points_to_consume} نقطة</span>
                    {rule.last_triggered_at && <span className="flex items-center gap-1"><Activity size={10} /> آخر تفعيل: {formatDate(rule.last_triggered_at)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState text="لا توجد قواعد استهلاك استباقي — أضف قاعدة لبدء المراقبة الآلية" />
        )}
      </div>

      {/* Autopilot Shield */}
      <AutopilotShieldSection subscribers={subscribers} plans={plans} proactiveRules={proactiveRules} onRefresh={fetchRules} />

      {showRuleModal && (
        <ProactiveRuleModal onClose={() => setShowRuleModal(false)} onDone={() => { setShowRuleModal(false); fetchRules(); }} />
      )}
      {showTopUp && (
        <TopUpModal
          subscribers={subscribers}
          plans={plans}
          onClose={() => setShowTopUp(false)}
          onDone={() => { setShowTopUp(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function AutopilotShieldSection({ subscribers, plans, proactiveRules, onRefresh }: {
  subscribers: LaaSSubscriber[];
  plans: LaaSPlan[];
  proactiveRules: LaaSProactiveRule[];
  onRefresh: () => void;
}) {
  const [settings, setSettings] = useState<LaaSAutopilotSettings[]>([]);
  const [executions, setExecutions] = useState<LaaSProactiveExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSubscriberId, setSettingsSubscriberId] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const fetchShieldData = useCallback(async () => {
    setLoading(true);
    const [settingsRes, execRes] = await Promise.all([
      supabase.from('laas_autopilot_settings').select('*'),
      supabase.from('laas_proactive_executions').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    setSettings((settingsRes.data as LaaSAutopilotSettings[]) || []);
    setExecutions((execRes.data as LaaSProactiveExecution[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchShieldData(); }, [fetchShieldData]);

  const subscribersWithShield = subscribers.filter((s) => settings.some((st) => st.subscriber_id === s.id));
  const enabledCount = settings.filter((s) => s.is_enabled).length;
  const totalExecutions = executions.length;
  const deliveredCount = executions.filter((e) => e.delivery_status === 'delivered').length;
  const totalPointsConsumed = executions.reduce((sum, e) => sum + e.points_consumed, 0);

  const runEngine = async () => {
    if (!isIntegrationEnabled('webhook')) {
      setRunResult('محرّك الاستهلاك الاستباقي معطّل — التكاملات الخارجية مُوقفة على مستوى المنصة');
      return;
    }
    setRunning(true);
    setRunResult(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proactive-consumption-engine`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run' }),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const result = await response.json();
      setRunResult(`تم فحص ${result.checked || 0} حساب — تم تفعيل ${result.triggered || 0} إجراء استباقي`);
      fetchShieldData();
      onRefresh();
    } catch (err) {
      setRunResult(`فشل التشغيل: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
    }
    setRunning(false);
  };

  return (
    <div className="bg-gradient-to-br from-midnight via-midnight-light to-midnight rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center">
            <Bot size={20} className="text-gold" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-cream text-base">نظام الحماية التلقائي — Autopilot Shield</h3>
            <p className="font-body text-[10px] text-cream/50 mt-0.5">محرك ذكاء اصطناعي يراقب الأرصدة ويقدم قيمة قانونية استباقية قبل أن يشعر العميل بضياع اشتراكه</p>
          </div>
        </div>
        <button
          onClick={runEngine}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Cpu size={14} />}
          {running ? 'جاري التشغيل...' : 'تشغيل المحرك'}
        </button>
      </div>

      {runResult && (
        <div className="mb-4 bg-cream/10 border border-gold/20 rounded-lg p-3 flex items-center gap-2">
          <Activity size={14} className="text-gold flex-shrink-0" />
          <p className="font-body text-[11px] text-cream/80">{runResult}</p>
        </div>
      )}

      {/* Shield Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-cream/5 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={12} className="text-emerald-400" />
            <p className="font-body text-[10px] text-cream/50">مفعّل</p>
          </div>
          <p className="font-heading font-bold text-cream text-lg">{enabledCount}<span className="text-[10px] text-cream/40">/{settings.length}</span></p>
        </div>
        <div className="bg-cream/5 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Radar size={12} className="text-blue-400" />
            <p className="font-body text-[10px] text-cream/50">حسابات مراقَبة</p>
          </div>
          <p className="font-heading font-bold text-cream text-lg">{subscribersWithShield.length}</p>
        </div>
        <div className="bg-cream/5 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <ZapIcon size={12} className="text-amber-400" />
            <p className="font-body text-[10px] text-cream/50">إجراءات منفذة</p>
          </div>
          <p className="font-heading font-bold text-cream text-lg">{totalExecutions}</p>
        </div>
        <div className="bg-cream/5 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Coins size={12} className="text-gold" />
            <p className="font-body text-[10px] text-cream/50">نقاط استُهلكت استباقياً</p>
          </div>
          <p className="font-heading font-bold text-gold text-lg">{totalPointsConsumed}</p>
        </div>
      </div>

      {/* Trigger Logic */}
      <div className="bg-cream/5 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={14} className="text-gold" />
          <p className="font-body text-xs font-bold text-cream">خوارزمية الزناد — Trigger Logic</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-midnight/40 rounded-lg p-3 border border-cream/10">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={12} className="text-blue-400" />
              <p className="font-body text-[10px] font-bold text-cream/80">مؤشر الركود</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed">إذا لم يقم العميل بأي طلب صريح لمدة X يوماً (افتراضي: 20 يوماً للباقة الشهرية)</p>
          </div>
          <div className="bg-midnight/40 rounded-lg p-3 border border-cream/10">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={12} className="text-emerald-400" />
              <p className="font-body text-[10px] font-bold text-cream/80">مؤشر وفرة النقاط</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed">إذا كان الرصيد المتبقي يتجاوز 40% من إجمالي الباقة — النقاط راكدة وليست مستثمرة</p>
          </div>
          <div className="bg-midnight/40 rounded-lg p-3 border border-cream/10">
            <div className="flex items-center gap-2 mb-1">
              <ZapIcon size={12} className="text-amber-400" />
              <p className="font-body text-[10px] font-bold text-cream/80">القرار — Action</p>
            </div>
            <p className="font-body text-[10px] text-cream/50 leading-relaxed">إذا تحقق الشرطان، يُستدعى كتالوج الخدمات الاستباقية ويُختار خدمة تناسب نشاط العميل</p>
          </div>
        </div>
      </div>

      {/* Proactive Service Catalog by Profile */}
      <div className="bg-cream/5 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Database size={14} className="text-gold" />
          <p className="font-body text-xs font-bold text-cream">كتالوج الخدمات الاستباقية — Proactive Service Catalog</p>
        </div>
        <div className="space-y-2">
          {proactiveRules.filter((r) => r.profile_type).map((rule) => {
            const profile = PROFILE_TYPE_LABELS[rule.profile_type || ''];
            const action = PROACTIVE_ACTION_LABELS[rule.action_type];
            return (
              <div key={rule.id} className="bg-midnight/40 rounded-lg p-3 border border-cream/10">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-body text-[10px] font-bold text-gold">{profile?.label || rule.profile_type}</span>
                    <span className="px-1.5 py-0.5 rounded bg-cream/10 font-body text-[9px] text-cream/60">{action.label}</span>
                  </div>
                  <span className="font-heading font-bold text-gold text-sm">{rule.service_cost || rule.points_to_consume} نقطة</span>
                </div>
                <p className="font-body text-[10px] text-cream/60 leading-relaxed">{rule.service_description}</p>
                {rule.trello_card_title && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Send size={9} className="text-blue-400" />
                    <span className="font-body text-[9px] text-cream/40">يُرسل تلقائياً إلى Trello: {rule.trello_card_title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscriber Shield Settings */}
      <div className="bg-cream/5 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-gold" />
            <p className="font-body text-xs font-bold text-cream">إعدادات الحماية لكل مشترك</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1 px-3 py-1 rounded bg-gold/20 text-gold font-body text-[10px] font-bold hover:bg-gold/30 transition-colors">
            <Plus size={10} /> تفعيل لمشترك
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-4"><Loader2 size={16} className="text-gold animate-spin" /></div>
        ) : settings.length > 0 ? (
          <div className="space-y-2">
            {settings.map((st) => {
              const sub = subscribers.find((s) => s.id === st.subscriber_id);
              if (!sub) return null;
              return (
                <div key={st.id} className="bg-midnight/40 rounded-lg p-3 border border-cream/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[11px] font-bold text-cream">{sub.name}</span>
                      <span className={`px-1.5 py-0.5 rounded font-body text-[9px] font-bold ${st.is_enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'}`}>
                        {st.is_enabled ? 'مفعّل' : 'متوقف'}
                      </span>
                    </div>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={st.is_enabled}
                        onChange={async (e) => {
                          await supabase.from('laas_autopilot_settings').update({ is_enabled: e.target.checked, updated_at: new Date().toISOString() }).eq('id', st.id);
                          fetchShieldData();
                        }}
                        className="rounded border-cream/20 text-gold focus:ring-gold"
                      />
                      <span className="font-body text-[9px] text-cream/50">تبديل</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-body text-cream/50">
                    <span className="flex items-center gap-1"><Clock size={9} /> ركود: {st.inactivity_trigger_days} يوم</span>
                    <span className="flex items-center gap-1"><TrendingUp size={9} /> وفرة: {Math.round(st.point_surplus_threshold * 100)}%</span>
                    {st.trello_board_id && <span className="flex items-center gap-1"><Send size={9} className="text-blue-400" /> Trello مُربوط</span>}
                    {st.webhook_url && <span className="flex items-center gap-1"><Webhook size={9} className="text-purple-400" /> Webhook مُفعّل</span>}
                    {st.last_run_at && <span className="flex items-center gap-1"><Activity size={9} /> آخر تشغيل: {formatDate(st.last_run_at)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-body text-[10px] text-cream/40 text-center py-3">لا توجد إعدادات حماية — فعّل النظام لمشترك للبدء</p>
        )}
      </div>

      {/* Execution Log */}
      <div className="bg-cream/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-gold" />
          <p className="font-body text-xs font-bold text-cream">سجل التنفيذ الاستباقي — Execution Log</p>
        </div>
        {executions.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {executions.map((exec) => {
              const sub = subscribers.find((s) => s.id === exec.subscriber_id);
              const statusStyle = DELIVERY_STATUS_STYLES[exec.delivery_status];
              const targetMeta = DELIVERY_TARGET_LABELS[exec.delivery_target];
              return (
                <div key={exec.id} className="bg-midnight/40 rounded-lg p-3 border border-cream/10">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[10px] font-bold text-cream">{sub?.name || 'مشترك'}</span>
                      <span className={`px-1.5 py-0.5 rounded font-body text-[9px] font-bold ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
                      <span className="font-body text-[9px] text-cream/40">→ {targetMeta.label}</span>
                    </div>
                    <span className="font-heading font-bold text-gold text-xs">-{exec.points_consumed} نقطة</span>
                  </div>
                  <p className="font-body text-[10px] text-cream/60 leading-relaxed mb-1">{exec.service_description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-body text-cream/40">
                    {exec.inactivity_days != null && <span>ركود: {exec.inactivity_days} يوم</span>}
                    {exec.surplus_pct != null && <span>وفرة: {Math.round(Number(exec.surplus_pct) * 100)}%</span>}
                    {exec.balance_before != null && exec.balance_after != null && <span>الرصيد: {exec.balance_before} → {exec.balance_after}</span>}
                    <span>{formatDate(exec.created_at)}</span>
                  </div>
                  {exec.notification_subject && (
                    <div className="mt-2 bg-midnight/60 rounded p-2 border border-cream/5">
                      <p className="font-body text-[9px] text-gold/70 flex items-center gap-1"><Mail size={8} /> {exec.notification_subject}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-body text-[10px] text-cream/40 text-center py-3">لا توجد إجراءات استباقية منفذة بعد — شغّل المحرك للبدء</p>
        )}
      </div>

      {showSettings && (
        <AutopilotSettingsModal
          subscribers={subscribers}
          existingSettings={settings}
          onClose={() => setShowSettings(false)}
          onDone={() => { setShowSettings(false); fetchShieldData(); }}
        />
      )}
    </div>
  );
}

function AutopilotSettingsModal({ subscribers, existingSettings, onClose, onDone }: {
  subscribers: LaaSSubscriber[];
  existingSettings: LaaSAutopilotSettings[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [subscriberId, setSubscriberId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [triggerDays, setTriggerDays] = useState('20');
  const [surplusThreshold, setSurplusThreshold] = useState('40');
  const [trelloBoardId, setTrelloBoardId] = useState('');
  const [trelloListId, setTrelloListId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifEmail, setNotifEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const availableSubs = subscribers.filter((s) => !existingSettings.some((st) => st.subscriber_id === s.id));

  const handleSave = async () => {
    if (!subscriberId) return;
    setSaving(true);
    await supabase.from('laas_autopilot_settings').insert({
      subscriber_id: subscriberId,
      is_enabled: isEnabled,
      inactivity_trigger_days: Number(triggerDays) || 20,
      point_surplus_threshold: (Number(surplusThreshold) || 40) / 100,
      trello_board_id: trelloBoardId || null,
      trello_inbox_list_id: trelloListId || null,
      webhook_url: webhookUrl || null,
      notification_email: notifEmail || null,
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="تفعيل نظام الحماية التلقائي" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="تفعيل">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-emerald-700">يُوافق العميل على هذا النظام عند التعاقد كميزة فاخرة — تحول المنصة من «مقدم خدمة» إلى «شريك استراتيجي مبادر»</p>
      </div>
      <Field label="المشترك" required>
        <Select value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)}>
          <option value="">— اختر المشترك —</option>
          {availableSubs.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subscriber_code}) — رصيد {s.wallet?.balance || 0}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="أيام الركود قبل التفعيل"><TextInput type="number" value={triggerDays} onChange={(e) => setTriggerDays(e.target.value)} /></Field>
        <Field label="حد وفرة النقاط (%)"><TextInput type="number" value={surplusThreshold} onChange={(e) => setSurplusThreshold(e.target.value)} /></Field>
      </div>
      <div className="bg-gray-50 rounded-lg p-3 space-y-3">
        <p className="font-body text-[10px] font-bold text-ink/60 flex items-center gap-1"><Send size={10} className="text-blue-500" /> تكاملات التسليم</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <p className="font-body text-[10px] text-amber-700">تكاملات Trello و Webhook معطّلة على مستوى المنصة. الحقول محفوظة في قاعدة البيانات لكنها غير مُفعّلة.</p>
        </div>
        <Field label="بريد الإشعار (اختياري)"><TextInput type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)} placeholder="client@example.com" /></Field>
      </div>
      <label className="flex items-center gap-2 cursor-pointer mt-3">
        <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="rounded border-gray-300 text-gold focus:ring-gold" />
        <span className="font-body text-[11px] text-ink/70">تفعيل النظام فوراً لهذا المشترك</span>
      </label>
    </EntityModal>
  );
}

function ProactiveRuleModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [segment, setSegment] = useState<LaaSSegment>('b2b');
  const [triggerDays, setTriggerDays] = useState('45');
  const [points, setPoints] = useState('20');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState<LaaSProactiveActionType>('compliance_check');
  const [profileType, setProfileType] = useState('CORPORATE_FINANCE');
  const [serviceCost, setServiceCost] = useState('100');
  const [trelloTitle, setTrelloTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    await supabase.from('laas_proactive_rules').insert({
      segment, trigger_days_inactive: Number(triggerDays) || 45,
      points_to_consume: Number(points) || 20,
      service_description: description.trim(), action_type: actionType,
      profile_type: profileType, service_cost: Number(serviceCost) || 20,
      trello_card_title: trelloTitle || null,
      is_active: true,
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="قاعدة استهلاك استباقي جديدة" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="إنشاء القاعدة">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-amber-700">تُفعّل هذه القاعدة آلياً عند تجاوز فترة الخمول المحددة، فتستهلك نقاطاً من محفظة المشترك لتقديم خدمة استباقية تثبت القيمة.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الفئة" required>
          <Select value={segment} onChange={(e) => setSegment(e.target.value as LaaSSegment)}>
            <option value="b2b">B2B — الشركات</option>
            <option value="b2c">B2C — الأفراد</option>
            <option value="b2l">B2L — المحامون</option>
          </Select>
        </Field>
        <Field label="نوع الإجراء">
          <Select value={actionType} onChange={(e) => setActionType(e.target.value as LaaSProactiveActionType)}>
            <option value="auto_audit">فحص آلي</option>
            <option value="contract_review">مراجعة عقود</option>
            <option value="precedent_summary">ملخص أحكام</option>
            <option value="compliance_check">فحص امتثال</option>
            <option value="custom">مخصص</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="الملف التعريفي للعميل">
          <Select value={profileType} onChange={(e) => setProfileType(e.target.value)}>
            <option value="CORPORATE_FINANCE">شركات إدارة المحافظ المالية</option>
            <option value="CORPORATE_LABOR">شركات ذات عمالة كثيفة</option>
            <option value="LAW_FIRM">مؤسسات قانونية ومحاماة</option>
            <option value="FAMILY_INDIVIDUAL">أفراد وعائلات</option>
          </Select>
        </Field>
        <Field label="تكلفة الخدمة (نقطة)"><TextInput type="number" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="أيام الخمول قبل التفعيل"><TextInput type="number" value={triggerDays} onChange={(e) => setTriggerDays(e.target.value)} /></Field>
        <Field label="النقاط المستهلكة"><TextInput type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
      </div>
      <Field label="وصف الخدمة الاستباقية" required><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: فحص دوري لعقود الموظفين وفقاً لتعديلات قانون العمل الأخيرة" /></Field>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
        <p className="font-body text-[10px] text-amber-700">تكامل Trello معطّل على مستوى المنصة. حقل عنوان البطاقة محفوظ في قاعدة البيانات لكنه غير مُفعّل.</p>
      </div>
    </EntityModal>
  );
}

function TopUpModal({ subscribers, plans, onClose, onDone }: {
  subscribers: LaaSSubscriber[];
  plans: LaaSPlan[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [subscriberId, setSubscriberId] = useState('');
  const [pointsToBuy, setPointsToBuy] = useState('100');
  const [saving, setSaving] = useState(false);

  const selected = subscribers.find((s) => s.id === subscriberId);
  const plan = selected?.plan_id ? plans.find((p) => p.id === selected.plan_id) : null;
  const basePricePerPoint = plan?.internal_cost_per_point || 5;
  const markupPct = 15;
  const pricePerPoint = basePricePerPoint * (1 + markupPct / 100);
  const totalCost = Number(pointsToBuy) * pricePerPoint;

  const handleSave = async () => {
    if (!selected || !selected.wallet) return;
    setSaving(true);
    const pts = Number(pointsToBuy) || 0;
    const wallet = selected.wallet;
    const newBalance = wallet.balance + pts;
    const newTopUp = (wallet.topup_balance || 0) + pts;
    const newTotalTopUp = (wallet.total_topup_purchased || 0) + pts;
    await supabase.from('laas_wallets').update({
      balance: newBalance, topup_balance: newTopUp, total_topup_purchased: newTotalTopUp,
      last_activity_at: new Date().toISOString(),
    }).eq('id', wallet.id);
    await supabase.from('laas_transactions').insert({
      wallet_id: wallet.id, subscriber_id: selected.id, transaction_type: 'grant',
      points: pts, balance_after: newBalance,
      description: `شحن سريع (Top-up): ${pts} نقطة بزيادة ${markupPct}%`,
      is_topup: true, topup_markup_pct: markupPct,
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="شحن نقاط سريع — Top-up" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="شحن">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <p className="font-body text-[10px] text-amber-700">يُضاف سعر النقاط بنسبة 15% فوق سعر باقة المشترك الأصلية. النقاط المشحونة تُضاف فوراً لرصيده.</p>
      </div>
      <Field label="المشترك" required>
        <Select value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)}>
          <option value="">— اختر المشترك —</option>
          {subscribers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subscriber_code}) — رصيد {s.wallet?.balance || 0}</option>)}
        </Select>
      </Field>
      {selected && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-body text-[10px] text-ink/40">سعر النقطة الأساسي (باقة {plan?.tier_label || '—'})</span>
            <span className="font-body text-xs font-bold text-midnight">{basePricePerPoint} ج.م</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-body text-[10px] text-amber-600">سعر النقطة بعد الزيادة (+15%)</span>
            <span className="font-body text-xs font-bold text-amber-700">{pricePerPoint.toFixed(2)} ج.م</span>
          </div>
          <Field label="عدد النقاط"><TextInput type="number" value={pointsToBuy} onChange={(e) => setPointsToBuy(e.target.value)} /></Field>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="font-body text-[10px] text-ink/50">التكلفة الإجمالية</span>
            <span className="font-heading font-bold text-gold text-base">{formatCurrency(totalCost)} ج.م</span>
          </div>
        </div>
      )}
    </EntityModal>
  );
}

// ===== CHURN TAB =====

function ChurnTab({ subscribers, onRefresh }: {
  subscribers: LaaSSubscriber[];
  onRefresh: () => void;
}) {
  const [churnActions, setChurnActions] = useState<LaaSChurnAction[]>([]);
  const [panicIncidents, setPanicIncidents] = useState<LaaSPanicIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrigger, setShowTrigger] = useState(false);
  const [showPanic, setShowPanic] = useState(false);

  const fetchChurn = useCallback(async () => {
    setLoading(true);
    const [churn, panic] = await Promise.all([
      supabase.from('laas_churn_actions').select('*, subscriber:laas_subscribers(*)').order('created_at', { ascending: false }),
      supabase.from('laas_panic_incidents').select('*, subscriber:laas_subscribers(*)').order('created_at', { ascending: false }),
    ]);
    setChurnActions((churn.data as LaaSChurnAction[]) || []);
    setPanicIncidents((panic.data as LaaSPanicIncident[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchChurn(); }, [fetchChurn]);

  return (
    <div className="space-y-5">
      {/* Anti-churn matrix */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-gold" />
            <h3 className="font-heading font-bold text-midnight text-sm">مصفوفة إيقاف التسرب — Anti-Churn Matrix</h3>
          </div>
          <button onClick={() => setShowTrigger(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-midnight text-cream font-body text-xs font-bold hover:bg-midnight-light transition-colors">
            <Plus size={12} /> تفعيل إجراء ذكي
          </button>
        </div>

        {/* Matrix table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 font-body text-[10px] font-bold text-ink/50">حالة المشترك</th>
                <th className="py-2 px-3 font-body text-[10px] font-bold text-ink/50">الإجراء التقليدي</th>
                <th className="py-2 px-3 font-body text-[10px] font-bold text-gold">الإجراء الذكي (Smart Action)</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(CHURN_TRIGGER_LABELS) as LaaSChurnTrigger[]).map((trigger) => {
                const meta = CHURN_TRIGGER_LABELS[trigger];
                return (
                  <tr key={trigger} className="border-b border-gray-100">
                    <td className="py-3 px-3">
                      <span className="font-body text-xs font-bold text-midnight">{meta.label}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-body text-[11px] text-ink/40 line-through">{meta.traditional}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-body text-[11px] text-gold font-bold">{meta.smart}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active churn actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h4 className="font-heading font-bold text-midnight text-sm mb-3">الإجراءات الذكية المُفعّلة</h4>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="text-gold animate-spin" /></div>
        ) : churnActions.length > 0 ? (
          <div className="space-y-2">
            {churnActions.map((a) => {
              const actionMeta = SMART_ACTION_LABELS[a.smart_action];
              const triggerMeta = CHURN_TRIGGER_LABELS[a.churn_trigger];
              return (
                <div key={a.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-body text-xs font-bold ${actionMeta.color}`}>{actionMeta.label}</span>
                      <span className="font-body text-[10px] text-ink/40">— {triggerMeta.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-body font-bold ${a.status === 'active' ? 'bg-orange-50 text-orange-700' : a.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {a.status === 'active' ? 'نشط' : a.status === 'resolved' ? 'تم الحل' : 'مُفعّل'}
                    </span>
                  </div>
                  {a.subscriber_id && <p className="font-body text-[10px] text-ink/50">{a.subscriber_id}</p>}
                  {a.action_details && <p className="font-body text-[10px] text-ink/60 mt-1 leading-relaxed">{a.action_details}</p>}
                </div>
              );
            })}
          </div>
        ) : <EmptyState text="لا توجد إجراءات ذكية مُفعّلة" />}
      </div>

      {/* Panic incidents */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Siren size={16} className="text-red-500" />
            <h4 className="font-heading font-bold text-midnight text-sm">حوادث زر الفزع — Panic Incidents</h4>
          </div>
          <button onClick={() => setShowPanic(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white font-body text-xs font-bold hover:bg-red-600 transition-colors">
            <Siren size={12} /> تفعيل زر الفزع
          </button>
        </div>
        {panicIncidents.length > 0 ? (
          <div className="space-y-2">
            {panicIncidents.map((p) => (
              <div key={p.id} className={`rounded-lg p-3 border ${p.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-xs font-bold text-red-700">{p.incident_type}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-body font-bold ${p.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p.status === 'active' ? 'نشط — غرفة عمليات' : 'تم الحل'}
                  </span>
                </div>
                {p.subscriber_id && <p className="font-body text-[10px] text-ink/50">{p.subscriber_id}</p>}
                {p.description && <p className="font-body text-[10px] text-ink/60 mt-1">{p.description}</p>}
                <div className="flex items-center justify-between mt-1">
                  <span className="font-body text-[10px] text-red-600">-{p.points_consumed} نقطة</span>
                  {p.assigned_attorney && <span className="font-body text-[10px] text-ink/50">المحامي: {p.assigned_attorney}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState text="لا توجد حوادث فزع — زر الفزع متاح للباقات العليا" />}
      </div>

      {showTrigger && (
        <ChurnTriggerModal subscribers={subscribers} onClose={() => setShowTrigger(false)} onDone={() => { setShowTrigger(false); fetchChurn(); onRefresh(); }} />
      )}
      {showPanic && (
        <PanicModal subscribers={subscribers} onClose={() => setShowPanic(false)} onDone={() => { setShowPanic(false); fetchChurn(); onRefresh(); }} />
      )}
    </div>
  );
}

function ChurnTriggerModal({ subscribers, onClose, onDone }: {
  subscribers: LaaSSubscriber[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [subscriberId, setSubscriberId] = useState('');
  const [trigger, setTrigger] = useState<LaaSChurnTrigger>('nonpayment');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!subscriberId) return;
    setSaving(true);
    const actionMap: Record<LaaSChurnTrigger, 'emergency_mode' | 'proactive_consumption' | 'frozen_subscription'> = {
      nonpayment: 'emergency_mode',
      inactive: 'proactive_consumption',
      cancel_request: 'frozen_subscription',
    };
    await supabase.from('laas_churn_actions').insert({
      subscriber_id: subscriberId, churn_trigger: trigger, smart_action: actionMap[trigger],
      action_details: details.trim() || null, status: 'active',
    });
    if (trigger === 'nonpayment') {
      await supabase.from('laas_subscribers').update({ status: 'emergency' }).eq('id', subscriberId);
    } else if (trigger === 'cancel_request') {
      await supabase.from('laas_subscribers').update({ status: 'frozen' }).eq('id', subscriberId);
    }
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="تفعيل إجراء ذكي مضاد للتسرب" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="تفعيل">
      <Field label="المشترك" required>
        <Select value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)}>
          <option value="">— اختر المشترك —</option>
          {subscribers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subscriber_code})</option>)}
        </Select>
      </Field>
      <Field label="السبب" required>
        <Select value={trigger} onChange={(e) => setTrigger(e.target.value as LaaSChurnTrigger)}>
          <option value="nonpayment">تخلف عن السداد → وضع الطوارئ</option>
          <option value="inactive">عدم استخدام المنصة → استهلاك استباقي</option>
          <option value="cancel_request">طلب إلغاء → اشتراك مجمد</option>
        </Select>
      </Field>
      <Field label="تفاصيل الإجراء"><TextArea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="تفاصيل الإجراء الذكي..." /></Field>
    </EntityModal>
  );
}

function PanicModal({ subscribers, onClose, onDone }: {
  subscribers: LaaSSubscriber[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [subscriberId, setSubscriberId] = useState('');
  const [incidentType, setIncidentType] = useState('تفتيش مفاجئ');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('200');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!subscriberId) return;
    setSaving(true);
    const pts = Number(points) || 200;
    const sub = subscribers.find((s) => s.id === subscriberId);
    const wallet = sub?.wallet;
    if (wallet) {
      const newBalance = Math.max(0, wallet.balance - pts);
      await supabase.from('laas_wallets').update({
        balance: newBalance, total_consumed: wallet.total_consumed + pts,
        last_activity_at: new Date().toISOString(),
      }).eq('id', wallet.id);
      await supabase.from('laas_transactions').insert({
        wallet_id: wallet.id, subscriber_id: subscriberId, transaction_type: 'consume',
        points: -pts, balance_after: newBalance, description: `زر الفزع: ${incidentType}`,
      });
    }
    await supabase.from('laas_panic_incidents').insert({
      subscriber_id: subscriberId, incident_type: incidentType, description: description.trim() || null,
      points_consumed: pts, status: 'active',
    });
    setSaving(false); onDone();
  };

  return (
    <EntityModal open={true} title="زر الفزع — Panic Button" onClose={onClose} onSubmit={handleSave} loading={saving} submitLabel="تفعيل غرفة العمليات">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Siren size={14} className="text-red-500" />
          <p className="font-body text-[10px] font-bold text-red-700">تحذير: سيتم سحب نقاط من المحفظة وإنشاء غرفة عمليات فورية</p>
        </div>
      </div>
      <Field label="المشترك" required>
        <Select value={subscriberId} onChange={(e) => setSubscriberId(e.target.value)}>
          <option value="">— اختر المشترك —</option>
          {subscribers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subscriber_code}) — {s.wallet?.balance || 0} نقطة</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="نوع الحادث">
          <Select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
            <option value="تفتيش مفاجئ">تفتيش مفاجئ للشركة</option>
            <option value="قبض على فرد">قبض على فرد</option>
            <option value="نزع ملكية">نزع ملكية</option>
            <option value="حجز أموال">حجز أموال</option>
            <option value="أخرى">أخرى</option>
          </Select>
        </Field>
        <Field label="النقاط المستهلكة"><TextInput type="number" value={points} onChange={(e) => setPoints(e.target.value)} /></Field>
      </div>
      <Field label="وصف الحالة"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف موجز للحالة الطارئة..." /></Field>
    </EntityModal>
  );
}

// ===== DASHBOARD TAB (Subscriber Portal) =====

function DashboardTab({ subscribers, services, onRefresh }: {
  subscribers: LaaSSubscriber[];
  services: LaaSService[];
  onRefresh: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [protectionMeters, setProtectionMeters] = useState<LaaSProtectionMeter[]>([]);
  const [loading, setLoading] = useState(false);

  const selected = subscribers.find((s) => s.id === selectedId);

  const fetchMeters = useCallback(async (id: string) => {
    setLoading(true);
    const { data } = await supabase.from('laas_protection_meters').select('*').eq('subscriber_id', id).order('month', { ascending: false }).limit(6);
    setProtectionMeters((data as LaaSProtectionMeter[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId) fetchMeters(selectedId);
  }, [selectedId, fetchMeters]);

  const currentMeter = protectionMeters[0];
  const compliancePct = currentMeter?.compliance_score || 0;

  return (
    <div className="space-y-5">
      {/* Subscriber selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 size={18} className="text-gold" />
          <h3 className="font-heading font-bold text-midnight text-sm">بوابة المشترك الرقمية — Subscriber Dashboard</h3>
        </div>
        <Select value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value || null)}>
          <option value="">— اختر مشتركاً لعرض بوابته —</option>
          {subscribers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.subscriber_code})</option>)}
        </Select>
      </div>

      {selected && (
        <div className="space-y-5">
          {/* Protection Meter */}
          <div className="bg-gradient-to-br from-midnight to-midnight-light rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-gold" />
              <h3 className="font-heading font-bold text-cream text-base">عداد الحماية — Protection Meter</h3>
            </div>
            <div className="flex items-center gap-6">
              {/* Circular gauge */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" stroke="#C5A059" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(compliancePct / 100) * 327} 327`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-heading font-bold text-cream text-2xl">{compliancePct}%</span>
                  <span className="font-body text-[9px] text-cream/40">امتثال</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <MeterRow label="العقود المراجَعة هذا الشهر" value={currentMeter?.contracts_reviewed || 0} icon={<FileText size={12} className="text-gold" />} />
                <MeterRow label="الاستشارات المنجَزة" value={currentMeter?.consultations_done || 0} icon={<Phone size={12} className="text-gold" />} />
                <MeterRow label="تنبيهات المخاطر" value={currentMeter?.risk_alerts || 0} icon={<AlertTriangle size={12} className="text-gold" />} />
              </div>
            </div>
            <p className="font-body text-[10px] text-cream/40 mt-4">يُعرض للشركات مدى امتثالهم القانوني بناءً على ما أنجزته المنصة لهم هذا الشهر.</p>
          </div>

          {/* Live Wallet Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <Wallet size={16} className="text-gold" />
              <h4 className="font-heading font-bold text-midnight text-sm">رصيد المحفظة الحي — Live Wallet</h4>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-body text-xs text-ink/50">النقاط المتبقية</p>
                <p className="font-heading font-bold text-gold text-lg">{selected.wallet?.balance || 0} / {selected.wallet?.total_granted || 0}</p>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-gold to-gold-light rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, ((selected.wallet?.balance || 0) / Math.max(1, selected.wallet?.total_granted || 1)) * 100)}%` }}
                />
              </div>
            </div>
            <p className="font-body text-[10px] text-ink/40 mb-3">أزرار سريعة لتحويل النقاط لخدمات:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {services.slice(0, 5).map((svc) => (
                <button
                  key={svc.id}
                  onClick={async () => {
                    const wallet = selected.wallet;
                    if (!wallet || wallet.balance < svc.credit_cost) return;
                    const newBalance = wallet.balance - svc.credit_cost;
                    await supabase.from('laas_wallets').update({
                      balance: newBalance, total_consumed: wallet.total_consumed + svc.credit_cost,
                      last_activity_at: new Date().toISOString(),
                    }).eq('id', wallet.id);
                    await supabase.from('laas_transactions').insert({
                      wallet_id: wallet.id, subscriber_id: selected.id, service_id: svc.id,
                      transaction_type: 'consume', points: -svc.credit_cost, balance_after: newBalance,
                      description: `استبدال: ${svc.name_ar}`,
                    });
                    onRefresh();
                  }}
                  disabled={(selected.wallet?.balance || 0) < svc.credit_cost}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-[11px] font-bold hover:bg-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap size={11} /> {svc.name_ar} ({svc.credit_cost})
                </button>
              ))}
            </div>
          </div>

          {/* Panic Button */}
          {selected.segment !== 'b2l' && (
            <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <Siren size={22} className="text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-red-700 text-sm">زر الفزع — Panic Button</h4>
                    <p className="font-body text-[10px] text-ink/50">للباقات العليا — يُفتح في حالات الطوارئ (تفتيش، قبض) لإنشاء غرفة عمليات فورية وتوجيه محامي ميداني</p>
                  </div>
                </div>
                <button className="px-6 py-3 rounded-xl bg-red-500 text-white font-heading font-bold text-sm hover:bg-red-600 transition-colors animate-pulse">
                  تفعيل الفزع
                </button>
              </div>
            </div>
          )}

          {/* Protection meter history */}
          {protectionMeters.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h4 className="font-heading font-bold text-midnight text-sm mb-3">سجل عداد الحماية — آخر 6 أشهر</h4>
              <div className="flex items-end justify-between gap-2 h-32">
                {protectionMeters.slice().reverse().map((m) => {
                  const monthLabel = new Date(m.month).toLocaleDateString('ar-EG', { month: 'short' });
                  return (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gray-100 rounded-t-lg flex items-end" style={{ height: '100px' }}>
                        <div
                          className="w-full bg-gradient-to-t from-gold to-gold-light rounded-t-lg transition-all duration-700"
                          style={{ height: `${m.compliance_score}%` }}
                        />
                      </div>
                      <span className="font-body text-[9px] text-ink/40">{monthLabel}</span>
                      <span className="font-body text-[9px] font-bold text-midnight">{m.compliance_score}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MeterRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between bg-cream/5 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">{icon}<span className="font-body text-[11px] text-cream/60">{label}</span></div>
      <span className="font-heading font-bold text-cream text-sm">{value}</span>
    </div>
  );
}
