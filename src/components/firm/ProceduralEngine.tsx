import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Globe, Scale, Calendar, Zap, Loader2, X, Send, Clock,
  AlertTriangle, MapPin, CheckCircle2, Info, ChevronDown,
} from 'lucide-react';
import type {
  ScmJurisdiction, ScmCourtType, ScmDeadlineRule, ScmHoliday,
} from '@/lib/smartCaseTypes';
import {
  computeMultiJurisdictionDeadline, daysUntil, getAlertLevel,
  getWaterfallAlert, formatDate, LEGAL_TRADITION_LABELS, type Jurisdiction,
} from '@/lib/deadlineEngine';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ProceduralEngineProps {
  caseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ProceduralEngine({ caseId, onClose, onSaved }: ProceduralEngineProps) {
  const [jurisdictions, setJurisdictions] = useState<ScmJurisdiction[]>([]);
  const [courtTypes, setCourtTypes] = useState<ScmCourtType[]>([]);
  const [rules, setRules] = useState<ScmDeadlineRule[]>([]);
  const [holidays, setHolidays] = useState<ScmHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState<string>('');
  const [selectedCourtType, setSelectedCourtType] = useState<string>('');
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [triggerDate, setTriggerDate] = useState('');
  const [distanceApplies, setDistanceApplies] = useState(false);
  const [computed, setComputed] = useState<ReturnType<typeof computeMultiJurisdictionDeadline> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [j, ct, h] = await Promise.all([
      supabase.from('scm_jurisdictions').select('*').order('country_name'),
      supabase.from('scm_court_types').select('*'),
      supabase.from('scm_holiday_calendars').select('*'),
    ]);
    setJurisdictions((j.data as ScmJurisdiction[]) || []);
    setCourtTypes((ct.data as ScmCourtType[]) || []);
    setHolidays((h.data as ScmHoliday[]) || []);
    if (j.data && j.data.length > 0) setSelectedJurisdictionId(j.data[0].id);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch rules when jurisdiction or court type changes
  useEffect(() => {
    if (!selectedJurisdictionId || !selectedCourtType) {
      setRules([]);
      setSelectedRuleId('');
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('scm_deadline_rules')
        .select('*')
        .eq('jurisdiction_id', selectedJurisdictionId)
        .eq('court_type', selectedCourtType);
      setRules((data as ScmDeadlineRule[]) || []);
      if (data && data.length > 0) setSelectedRuleId(data[0].id);
      else setSelectedRuleId('');
    })();
  }, [selectedJurisdictionId, selectedCourtType]);

  // Compute deadline live
  useEffect(() => {
    if (!triggerDate || !selectedRuleId || !selectedJurisdictionId) {
      setComputed(null);
      return;
    }
    const rule = rules.find((r) => r.id === selectedRuleId);
    const jurisdiction = jurisdictions.find((j) => j.id === selectedJurisdictionId);
    if (!rule || !jurisdiction) {
      setComputed(null);
      return;
    }
    const result = computeMultiJurisdictionDeadline(
      new Date(triggerDate),
      rule,
      jurisdiction as unknown as Jurisdiction,
      holidays,
      distanceApplies,
    );
    setComputed(result);
  }, [triggerDate, selectedRuleId, selectedJurisdictionId, rules, jurisdictions, holidays, distanceApplies]);

  const availableCourtTypes = courtTypes.filter((c) => c.jurisdiction_id === selectedJurisdictionId);
  const selectedJurisdiction = jurisdictions.find((j) => j.id === selectedJurisdictionId);
  const selectedRule = rules.find((r) => r.id === selectedRuleId);
  const traditionInfo = selectedJurisdiction ? LEGAL_TRADITION_LABELS[selectedJurisdiction.legal_tradition] : null;

  const handleSave = async () => {
    if (!computed || !selectedRule || !selectedJurisdiction) return;
    setSaving(true);
    const alertLevel = getAlertLevel(computed.deadlineDate);
    await supabase.from('scm_deadlines').insert({
      case_id: caseId,
      deadline_type: selectedRule.deadline_type,
      trigger_event: selectedRule.trigger_event,
      trigger_date: triggerDate,
      deadline_date: computed.deadlineDate.toISOString().slice(0, 10),
      legal_basis: selectedRule.legal_basis,
      days_allowed: computed.totalDays,
      alert_level: alertLevel,
      notes: `الاختصاص: ${selectedJurisdiction.country_name} | المحكمة: ${selectedCourtType} | ميعاد المسافة: ${computed.distanceDays} يوم | الأيام المستبعدة: ${computed.excludedDays} | ${computed.extendedForHoliday ? 'تم الترحيل لأول يوم عمل' : 'لم يُرحّل'}`,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-gold" />
            <h3 className="font-heading font-bold text-midnight text-base">محرك المهل متعدد الأنظمة القضائية</h3>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70 transition-colors"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          {/* Step 1: Jurisdiction */}
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 flex items-center gap-1.5">
              <Globe size={12} />
              1. الدولة / الاختصاص المكاني
            </label>
            <select
              value={selectedJurisdictionId}
              onChange={(e) => { setSelectedJurisdictionId(e.target.value); setSelectedCourtType(''); }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
            >
              {jurisdictions.map((j) => <option key={j.id} value={j.id}>{j.country_name}</option>)}
            </select>
            {traditionInfo && (
              <div className="mt-2 bg-blue-50 rounded-lg p-2.5">
                <p className="font-body text-[10px] text-blue-700 font-bold">{traditionInfo.label}</p>
                <p className="font-body text-[10px] text-blue-600 mt-0.5">{traditionInfo.description}</p>
              </div>
            )}
          </div>

          {/* Step 2: Court type */}
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 flex items-center gap-1.5">
              <Scale size={12} />
              2. نوع المحكمة (الاختصاص النوعي)
            </label>
            <select
              value={selectedCourtType}
              onChange={(e) => setSelectedCourtType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
            >
              <option value="">— اختر نوع المحكمة —</option>
              {availableCourtTypes.map((c) => <option key={c.id} value={c.court_type}>{c.court_label}</option>)}
            </select>
          </div>

          {/* Step 3: Rule */}
          {rules.length > 0 && (
            <div>
              <label className="font-body text-xs font-bold text-ink/60 mb-1.5 flex items-center gap-1.5">
                <Clock size={12} />
                3. نوع الموعد الإجرائي
              </label>
              <select
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none bg-white"
              >
                {rules.map((r) => <option key={r.id} value={r.id}>{r.deadline_type} ({r.base_days} يوم)</option>)}
              </select>
              {selectedRule && (
                <div className="mt-2 bg-gray-50 rounded-lg p-2.5">
                  <p className="font-body text-[10px] text-ink/50"><strong>الواقعة المُنشئة:</strong> {selectedRule.trigger_event}</p>
                  <p className="font-body text-[10px] text-ink/50 mt-0.5"><strong>الأساس القانوني:</strong> {selectedRule.legal_basis}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Trigger date + distance */}
          {selectedRule && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-xs font-bold text-ink/60 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={12} />
                    4. تاريخ الواقعة المُنشئة
                  </label>
                  <input
                    type="date"
                    value={triggerDate}
                    onChange={(e) => setTriggerDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-body text-xs font-bold text-ink/60 mb-1.5 flex items-center gap-1.5">
                    <MapPin size={12} />
                    ميعاد المسافة
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-2.5">
                    <input
                      type="checkbox"
                      checked={distanceApplies}
                      onChange={(e) => setDistanceApplies(e.target.checked)}
                      disabled={!selectedRule.distance_allowance_applies}
                      className="accent-gold"
                    />
                    <span className="font-body text-xs text-ink/60">
                      {selectedRule.distance_allowance_applies
                        ? `يُطبق ميعاد المسافة (${selectedJurisdiction?.distance_allowance_days} يوم)`
                        : 'لا يُطبق ميعاد مسافة في هذا الاختصاص'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Computed result */}
              {computed && (
                <div className="bg-gradient-to-br from-midnight to-ink rounded-xl p-5 text-cream">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-gold" />
                    <p className="font-heading font-bold text-sm">الموعد النهائي المحسوب</p>
                  </div>
                  <p className="font-heading font-bold text-2xl text-gold">{formatDate(computed.deadlineDate)}</p>
                  <p className="font-body text-xs text-cream/70 mt-1">{daysUntil(computed.deadlineDate)} يوم من اليوم</p>

                  {/* Breakdown */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cream/60">المدة القانونية الأساسية</span>
                      <span className="text-cream font-bold">{computed.baseDays} يوم</span>
                    </div>
                    {computed.distanceDays > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cream/60">ميعاد المسافة</span>
                        <span className="text-cream font-bold">+{computed.distanceDays} يوم</span>
                      </div>
                    )}
                    {computed.excludedDays > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cream/60">أيام مستبعدة (عطلات/نهايات أسبوع)</span>
                        <span className="text-cream font-bold">{computed.excludedDays} يوم</span>
                      </div>
                    )}
                    {computed.extendedForHoliday && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-300 mt-1">
                        <AlertTriangle size={11} />
                        <span>تم ترحيل الموعد لأول يوم عمل (نهاية الأسبوع/عطلة)</span>
                      </div>
                    )}
                  </div>

                  {/* Waterfall alert */}
                  {(() => {
                    const days = daysUntil(computed.deadlineDate);
                    const wf = getWaterfallAlert(days);
                    return (
                      <div className={`mt-4 rounded-lg p-2.5 flex items-start gap-2 ${
                        wf.level === 'critical' ? 'bg-red-500/20' : wf.level === 'urgent' ? 'bg-orange-500/20' : 'bg-amber-500/20'
                      }`}>
                        <Info size={12} className="text-cream mt-0.5 flex-shrink-0" />
                        <p className="font-body text-[10px] text-cream/80">{wf.message}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Rule details */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <p className="font-body text-[10px] font-bold text-ink/60 mb-1">قواعد التطبيق:</p>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <p className="font-body text-[10px] text-ink/60">استثناء عطلات نهاية الأسبوع (المهل القصيرة): {selectedRule.exclude_weekends_short ? 'نعم' : 'لا'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <p className="font-body text-[10px] text-ink/60">قاعدة الأيام الصافية (Clear Days): {selectedRule.clear_days_rule ? 'نعم' : 'لا'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <p className="font-body text-[10px] text-ink/60">ترحيل لعطلة إلى أول يوم عمل: {selectedRule.extend_to_next_business_day ? 'نعم' : 'لا'}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors">إلغاء</button>
          <button
            onClick={handleSave}
            disabled={saving || !computed}
            className="px-5 py-2 rounded-lg font-body text-sm font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            حفظ الموعد
          </button>
        </div>
      </div>
    </div>
  );
}
