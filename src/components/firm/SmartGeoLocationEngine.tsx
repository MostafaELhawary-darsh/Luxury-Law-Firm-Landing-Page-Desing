import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Navigation, Clock, AlertTriangle, CheckCircle2, Loader2,
  Plus, Trash2, MapPinned, Route, Cloud, Users, LogIn, LogOut,
  Radar, Shield, Zap, X, Edit3, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/financeUtils';

interface GeofenceZone {
  id: string;
  name: string;
  name_en: string | null;
  zone_type: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address: string | null;
  active: boolean;
  linked_task_id: string | null;
  linked_case_id: string | null;
  created_at: string;
}

interface FieldAttendance {
  id: string;
  user_id: string;
  user_name: string | null;
  zone_id: string;
  zone_name: string | null;
  event_type: string;
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  verified_via_geofence: boolean;
  timestamp: string;
}

interface TaskPresence {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string | null;
  zone_id: string;
  zone_name: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  status: string;
  distance_meters: number | null;
  estimated_travel_min: number | null;
  delay_risk_min: number;
  delay_alert_sent: boolean;
  traffic_index: number;
  weather_alert: string | null;
  created_at: string;
}

interface RouteAlert {
  id: string;
  user_id: string;
  user_name: string | null;
  task_id: string | null;
  zone_id: string;
  zone_name: string | null;
  alert_type: string;
  severity: string;
  message: string;
  estimated_delay_min: number;
  traffic_index: number;
  weather_condition: string | null;
  departure_needed_at: string | null;
  session_time: string | null;
  acknowledged: boolean;
  created_at: string;
}

type Tab = 'zones' | 'attendance' | 'presence' | 'alerts';

const ZONE_TYPE_LABELS: Record<string, { label: string; color: string; bg: string; icon: typeof MapPin }> = {
  COURT: { label: 'محكمة', color: 'text-midnight', bg: 'bg-blue-50', icon: Shield },
  EXPERT_OFFICE: { label: 'مكتب خبير', color: 'text-amber-700', bg: 'bg-amber-50', icon: MapPin },
  CLIENT_OFFICE: { label: 'مكتب عميل', color: 'text-green-700', bg: 'bg-green-50', icon: Users },
  FIRM_HQ: { label: 'المقر الرئيسي', color: 'text-gold', bg: 'bg-gold/10', icon: MapPinned },
};

const PRESENCE_STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ON_SITE: { label: 'في الموقع', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  COMPLETED: { label: 'مكتمل', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  DELAYED_BY_TRAFFIC: { label: 'متأخر بالازدحام', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

const ALERT_SEVERITY: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: 'حرج', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { label: 'تحذير', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  info: { label: 'معلومة', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function SmartGeoLocationEngine() {
  const [activeTab, setActiveTab] = useState<Tab>('zones');
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [attendance, setAttendance] = useState<FieldAttendance[]>([]);
  const [presence, setPresence] = useState<TaskPresence[]>([]);
  const [alerts, setAlerts] = useState<RouteAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [deleteZone, setDeleteZone] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState(false);

  const [zoneForm, setZoneForm] = useState({
    name: '', name_en: '', zone_type: 'COURT',
    latitude: '', longitude: '', radius_meters: '150',
    address: '', active: true,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [zRes, aRes, pRes, alRes] = await Promise.all([
      supabase.from('m107_geofence_zones').select('*').order('created_at', { ascending: false }),
      supabase.from('m107_field_attendance').select('*').order('timestamp', { ascending: false }).limit(50),
      supabase.from('m107_task_presence').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('m107_route_alerts').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setZones((zRes.data as GeofenceZone[]) || []);
    setAttendance((aRes.data as FieldAttendance[]) || []);
    setPresence((pRes.data as TaskPresence[]) || []);
    setAlerts((alRes.data as RouteAlert[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => {
    setZoneForm({ name: '', name_en: '', zone_type: 'COURT', latitude: '', longitude: '', radius_meters: '150', address: '', active: true });
    setEditingZone(null);
    setModalOpen(true);
  };

  const openEdit = (z: GeofenceZone) => {
    setZoneForm({
      name: z.name, name_en: z.name_en || '', zone_type: z.zone_type,
      latitude: String(z.latitude), longitude: String(z.longitude),
      radius_meters: String(z.radius_meters), address: z.address || '', active: z.active,
    });
    setEditingZone(z.id);
    setModalOpen(true);
  };

  const handleSaveZone = async () => {
    if (!zoneForm.name.trim() || !zoneForm.latitude || !zoneForm.longitude) return;
    const payload = {
      name: zoneForm.name.trim(),
      name_en: zoneForm.name_en.trim() || null,
      zone_type: zoneForm.zone_type,
      latitude: parseFloat(zoneForm.latitude),
      longitude: parseFloat(zoneForm.longitude),
      radius_meters: parseFloat(zoneForm.radius_meters) || 150,
      address: zoneForm.address.trim() || null,
      active: zoneForm.active,
    };
    if (editingZone) {
      await supabase.from('m107_geofence_zones').update(payload).eq('id', editingZone);
    } else {
      await supabase.from('m107_geofence_zones').insert(payload);
    }
    setModalOpen(false);
    fetchAll();
  };

  const handleDeleteZone = async () => {
    if (!deleteZone) return;
    await supabase.from('m107_geofence_zones').delete().eq('id', deleteZone);
    setDeleteZone(null);
    fetchAll();
  };

  const acknowledgeAlert = async (id: string) => {
    await supabase.from('m107_route_alerts').update({ acknowledged: true }).eq('id', id);
    fetchAll();
  };

  const handlePingLocation = async () => {
    setPingLoading(true);
    setPingResult(null);
    if (!navigator.geolocation) {
      setPingResult('المتصفح لا يدعم تحديد الموقع الجغرافي');
      setPingLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest: { zone: GeofenceZone; dist: number } | null = null;
        for (const z of zones) {
          if (!z.active) continue;
          const dist = haversineMeters(latitude, longitude, z.latitude, z.longitude);
          if (dist <= z.radius_meters && (!nearest || dist < nearest.dist)) {
            nearest = { zone: z, dist };
          }
        }
        if (nearest) {
          const eventType = nearest.zone.zone_type === 'FIRM_HQ' ? 'ENTRY_CHECKIN' : 'ENTRY_CHECKIN';
          await supabase.from('m107_field_attendance').insert({
            user_id: 'usr-current',
            user_name: 'المستخدم الحالي',
            zone_id: nearest.zone.id,
            zone_name: nearest.zone.name,
            event_type: eventType,
            latitude,
            longitude,
            distance_meters: nearest.dist,
            verified_via_geofence: true,
          });
          setPingResult(`تم تسجيل الدخول في نطاق: ${nearest.zone.name} (على بُعد ${nearest.dist}م)`);
        } else {
          setPingResult('أنت خارج جميع النطاقات الجغرافية المسجلة');
        }
        setPingLoading(false);
        fetchAll();
      },
      (err) => {
        setPingResult(`فشل تحديد الموقع: ${err.message}`);
        setPingLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const createRouteGuidanceAlert = async () => {
    const activeZone = zones.find((zone) => zone.active) || null;
    const trafficIndex = Math.min(10, Math.max(3, Math.round((Math.random() * 7) + 2)));
    const weatherOptions = ['أمطار خفيفة', 'رياح قوية', 'ضباب خفيف', 'سماء صافية', 'مطر غزير'];
    const weatherCondition = weatherOptions[Math.floor(Math.random() * weatherOptions.length)];
    const estimatedDelayMin = trafficIndex >= 8 ? 26 : trafficIndex >= 6 ? 16 : 8;
    const departureNeededAt = new Date(Date.now() + (estimatedDelayMin + 15) * 60000).toISOString();
    const alertMessage = trafficIndex >= 7
      ? `توجيه فوري: ازدحام مروري مرتفع على المسار، يوصى بمغادرة الموقع قبل ${Math.max(15, estimatedDelayMin - 8)} دقيقة لضمان حضور الجلسة في الوقت المحدد.`
      : `توجيه ميداني: حالة الطريق ${weatherCondition}، وقد يطرأ تأخير مقدّر بـ ${estimatedDelayMin} دقيقة؛ يُنصح بتحديث مسار القيادة وتخصيص وقت احتياطي.`;

    const payload = {
      user_id: 'usr-current',
      user_name: 'المستخدم الحالي',
      task_id: 'SESSION-ROUTE-ADJUSTMENT',
      zone_id: activeZone?.id || null,
      zone_name: activeZone?.name || 'المسار الميداني',
      alert_type: trafficIndex >= 7 ? 'TRAFFIC_DELAY' : 'WEATHER_ALERT',
      severity: estimatedDelayMin >= 20 ? 'critical' : 'warning',
      message: alertMessage,
      estimated_delay_min: estimatedDelayMin,
      traffic_index: trafficIndex,
      weather_condition: weatherCondition,
      departure_needed_at: departureNeededAt,
      session_time: new Date(Date.now() + 45 * 60000).toISOString(),
      acknowledged: false,
    };

    const { data, error } = await supabase.from('m107_route_alerts').insert(payload).select('*');

    if (!error && data && data[0]) {
      const presencePayload = {
        task_id: 'SESSION-ROUTE-ADJUSTMENT',
        user_id: 'usr-current',
        user_name: 'المستخدم الحالي',
        zone_id: activeZone?.id || 'route-guidance',
        zone_name: activeZone?.name || 'المسار الميداني',
        arrival_time: new Date(Date.now() + 35 * 60000).toISOString(),
        departure_time: departureNeededAt,
        status: estimatedDelayMin >= 20 ? 'DELAYED_BY_TRAFFIC' : 'ON_SITE',
        distance_meters: Math.max(150, trafficIndex * 80),
        estimated_travel_min: Math.max(estimatedDelayMin, 12),
        delay_risk_min: estimatedDelayMin,
        delay_alert_sent: true,
        traffic_index: trafficIndex,
        weather_alert: weatherCondition,
      };

      const { data: presenceData, error: presenceError } = await supabase.from('m107_task_presence').insert(presencePayload).select('*');

      if (!presenceError && presenceData && presenceData[0]) {
        setPresence((prev) => [presenceData[0], ...prev]);
      }

      setAlerts((prev) => [data[0], ...prev]);
      setPingResult('تم إنشاء تنبيه توجيه مسار جديد وتحديث حالة المهمة إلى وضع المراقبة والتأخير المحتمل.');
      setActiveTab('alerts');
    } else {
      setPingResult(`فشل إنشاء تنبيه المسار: ${error?.message || 'خطأ غير محدد'}`);
    }
    fetchAll();
  };

  const tabs: { id: Tab; label: string; icon: typeof MapPin; count: number }[] = [
    { id: 'zones', label: 'النطاقات الجغرافية', icon: MapPinned, count: zones.length },
    { id: 'attendance', label: 'سجل الحضور', icon: LogIn, count: attendance.length },
    { id: 'presence', label: 'التواجد في المهام', icon: Radar, count: presence.length },
    { id: 'alerts', label: 'تنبيهات الطريق', icon: AlertTriangle, count: alerts.filter(a => !a.acknowledged).length },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const activeAlertsCount = alerts.filter(a => !a.acknowledged).length;
  const onSiteCount = presence.filter(p => p.status === 'ON_SITE').length;
  const delayedCount = presence.filter(p => p.status === 'DELAYED_BY_TRAFFIC').length;
  const checkInCount = attendance.filter(a => a.event_type === 'ENTRY_CHECKIN').length;
  const checkOutCount = attendance.filter(a => a.event_type === 'EXIT_CHECKOUT').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <MapPin size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك الموقع الجغرافي الذكي</h2>
            <p className="font-body text-xs text-ink/40">M107 — ربط GPS مع المهام الميدانية والحضور والتنبيهات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createRouteGuidanceAlert}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-body text-sm font-medium hover:bg-amber-200 transition-colors"
          >
            <AlertTriangle size={16} />
            توجيه المسار
          </button>
          <button
            onClick={handlePingLocation}
            disabled={pingLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {pingLoading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            تحديد موقعي
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-midnight text-white rounded-lg font-body text-sm font-medium hover:bg-midnight/90 transition-colors"
          >
            <Plus size={16} />
            نطاق جديد
          </button>
        </div>
      </div>

      {pingResult && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-body">
          <Navigation size={16} />
          {pingResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={MapPinned} label="النطاقات النشطة" value={zones.filter(z => z.active).length} color="text-midnight" bg="bg-blue-50" />
        <StatCard icon={LogIn} label="سجلات الدخول" value={checkInCount} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={LogOut} label="سجلات الخروج" value={checkOutCount} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={Radar} label="في الموقع الآن" value={onSiteCount} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={AlertTriangle} label="تنبيهات نشطة" value={activeAlertsCount} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-body font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'text-gold border-b-2 border-gold bg-gold/5' : 'text-ink/50 hover:text-ink/70 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-gold/20 text-gold' : 'bg-gray-100 text-ink/40'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===== Zones Tab ===== */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => {
            const typeInfo = ZONE_TYPE_LABELS[zone.zone_type] || ZONE_TYPE_LABELS.COURT;
            const TypeIcon = typeInfo.icon;
            return (
              <div key={zone.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.bg}`}>
                      <TypeIcon size={18} className={typeInfo.color} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-midnight text-sm">{zone.name}</h3>
                      {zone.name_en && <p className="font-body text-xs text-ink/30">{zone.name_en}</p>}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-body ${typeInfo.bg} ${typeInfo.color}`}>{typeInfo.label}</span>
                </div>
                <div className="space-y-1.5 text-xs font-body text-ink/50">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-ink/30" />
                    <span>{zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation size={12} className="text-ink/30" />
                    <span>النطاق: {zone.radius_meters}م</span>
                  </div>
                  {zone.address && (
                    <div className="flex items-center gap-2">
                      <MapPinned size={12} className="text-ink/30" />
                      <span>{zone.address}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <span className={`inline-flex items-center gap-1 text-xs font-body ${zone.active ? 'text-green-600' : 'text-ink/30'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${zone.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {zone.active ? 'نشط' : 'معطّل'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(zone)} className="p-1.5 text-ink/40 hover:text-gold transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => setDeleteZone(zone.id)} className="p-1.5 text-ink/40 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Attendance Tab ===== */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {attendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <LogIn size={40} className="text-ink/20 mb-2" />
              <p className="font-body text-sm text-ink/40">لا توجد سجلات حضور</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase">المستخدم</th>
                    <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase">النطاق</th>
                    <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase">الحدث</th>
                    <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase">المسافة</th>
                    <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase">التحقق</th>
                    <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-body text-sm text-midnight font-medium">{rec.user_name || rec.user_id}</td>
                      <td className="px-4 py-3 font-body text-xs text-ink/60">{rec.zone_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-body font-medium ${
                          rec.event_type === 'ENTRY_CHECKIN' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {rec.event_type === 'ENTRY_CHECKIN' ? <LogIn size={12} /> : <LogOut size={12} />}
                          {rec.event_type === 'ENTRY_CHECKIN' ? 'دخول' : 'خروج'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-ink/40">{rec.distance_meters != null ? `${rec.distance_meters}م` : '—'}</td>
                      <td className="px-4 py-3">
                        {rec.verified_via_geofence ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <X size={16} className="text-ink/30" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-ink/40">{formatTime(rec.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== Presence Tab ===== */}
      {activeTab === 'presence' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presence.map((p) => {
            const statusInfo = PRESENCE_STATUS[p.status] || PRESENCE_STATUS.ON_SITE;
            return (
              <div key={p.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-bold text-midnight text-sm">{p.user_name || p.user_id}</h3>
                    <p className="font-body text-xs text-ink/40">مهمة: {p.task_id}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-body font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                    {statusInfo.label}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-body text-ink/50">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-ink/30" />
                    <span>{p.zone_name || '—'}</span>
                  </div>
                  {p.distance_meters != null && (
                    <div className="flex items-center gap-2">
                      <Navigation size={12} className="text-ink/30" />
                      <span>المسافة: {p.distance_meters > 1000 ? `${(p.distance_meters / 1000).toFixed(1)}كم` : `${p.distance_meters}م`}</span>
                    </div>
                  )}
                  {p.estimated_travel_min != null && (
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-ink/30" />
                      <span>وقت السفر المتوقع: {p.estimated_travel_min}د</span>
                    </div>
                  )}
                  {p.delay_risk_min > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className="text-red-400" />
                      <span className="text-red-600">تأخير متوقع: {p.delay_risk_min}د</span>
                    </div>
                  )}
                  {p.traffic_index > 0 && (
                    <div className="flex items-center gap-2">
                      <Route size={12} className="text-ink/30" />
                      <span>مؤشر الازدحام: {p.traffic_index}/10</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-ink/30" />
                    <span>الوصول: {formatTime(p.arrival_time)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Alerts Tab ===== */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle2 size={40} className="text-ink/20 mb-2" />
              <p className="font-body text-sm text-ink/40">لا توجد تنبيهات</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const sev = ALERT_SEVERITY[alert.severity] || ALERT_SEVERITY.info;
              return (
                <div key={alert.id} className={`rounded-xl p-4 border ${sev.bg} ${sev.border}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${sev.bg}`}>
                        {alert.alert_type === 'TRAFFIC_DELAY' ? <AlertTriangle size={18} className={sev.color} /> : <Cloud size={18} className={sev.color} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-body font-medium ${sev.bg} ${sev.color}`}>{sev.label}</span>
                          <span className="font-body text-xs text-ink/40">{alert.zone_name}</span>
                          {alert.acknowledged && <CheckCircle2 size={14} className="text-green-500" />}
                        </div>
                        <p className="font-body text-sm text-midnight leading-relaxed">{alert.message}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-body text-ink/40">
                          {alert.estimated_delay_min > 0 && <span>تأخير: {alert.estimated_delay_min}د</span>}
                          {alert.traffic_index > 0 && <span>الازدحام: {alert.traffic_index}/10</span>}
                          {alert.weather_condition && <span>الطقس: {alert.weather_condition}</span>}
                          {alert.departure_needed_at && <span>مطلوب المغادرة: {formatTime(alert.departure_needed_at)}</span>}
                          {alert.session_time && <span>الجلسة: {formatTime(alert.session_time)}</span>}
                          <span>{formatTime(alert.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-body font-medium text-ink/60 hover:text-gold hover:border-gold/30 transition-colors"
                      >
                        تأكيد القراءة
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Zone Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-heading font-bold text-midnight text-base">{editingZone ? 'تعديل نطاق' : 'نطاق جغرافي جديد'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-ink/30 hover:text-ink/60 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="الاسم (عربي)">
                  <input type="text" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} className="form-input" placeholder="محكمة النقض" />
                </FormField>
                <FormField label="الاسم (إنجليزي)">
                  <input type="text" value={zoneForm.name_en} onChange={(e) => setZoneForm({ ...zoneForm, name_en: e.target.value })} className="form-input" placeholder="Court of Cassation" />
                </FormField>
              </div>
              <FormField label="نوع النطاق">
                <select value={zoneForm.zone_type} onChange={(e) => setZoneForm({ ...zoneForm, zone_type: e.target.value })} className="form-input">
                  {Object.entries(ZONE_TYPE_LABELS).map(([val, info]) => (
                    <option key={val} value={val}>{info.label}</option>
                  ))}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="خط العرض">
                  <input type="number" step="any" value={zoneForm.latitude} onChange={(e) => setZoneForm({ ...zoneForm, latitude: e.target.value })} className="form-input" placeholder="30.0626" dir="ltr" />
                </FormField>
                <FormField label="خط الطول">
                  <input type="number" step="any" value={zoneForm.longitude} onChange={(e) => setZoneForm({ ...zoneForm, longitude: e.target.value })} className="form-input" placeholder="31.2497" dir="ltr" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="نصف القطر (متر)">
                  <input type="number" value={zoneForm.radius_meters} onChange={(e) => setZoneForm({ ...zoneForm, radius_meters: e.target.value })} className="form-input" placeholder="150" />
                </FormField>
                <FormField label="العنوان">
                  <input type="text" value={zoneForm.address} onChange={(e) => setZoneForm({ ...zoneForm, address: e.target.value })} className="form-input" placeholder="القاهرة، مصر" />
                </FormField>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={zoneForm.active} onChange={(e) => setZoneForm({ ...zoneForm, active: e.target.checked })} className="w-4 h-4 accent-gold" />
                <span className="font-body text-sm text-ink/60">النطاق نشط</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-ink/50 hover:text-ink/70 font-body text-sm transition-colors">إلغاء</button>
              <button onClick={handleSaveZone} className="px-5 py-2 bg-midnight text-white rounded-lg font-body text-sm font-medium hover:bg-midnight/90 transition-colors">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/40 backdrop-blur-sm" onClick={() => setDeleteZone(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="font-heading font-bold text-midnight text-base">حذف النطاق</h3>
            </div>
            <p className="font-body text-sm text-ink/60 mb-5">سيتم حذف هذا النطاق وجميع سجلات الحضور المرتبطة به. هل أنت متأكد؟</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteZone(null)} className="px-4 py-2 text-ink/50 hover:text-ink/70 font-body text-sm transition-colors">إلغاء</button>
              <button onClick={handleDeleteZone} className="px-5 py-2 bg-red-500 text-white rounded-lg font-body text-sm font-medium hover:bg-red-600 transition-colors">حذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof MapPin; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} mb-2`}>
        <Icon size={18} className={color} />
      </div>
      <p className="font-heading font-bold text-midnight text-xl">{value}</p>
      <p className="font-body text-xs text-ink/40 mt-0.5">{label}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-body text-xs font-medium text-ink/60">{label}</label>
      {children}
    </div>
  );
}
