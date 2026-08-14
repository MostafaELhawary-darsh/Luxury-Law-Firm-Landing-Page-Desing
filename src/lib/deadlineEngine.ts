// Multi-Jurisdiction Procedural Deadline Engine
// Computes legal deadlines across Latin/Arab, Common Law, and French civil traditions.
// Formula: Deadline = triggerDate + legalDuration + distanceAllowance + holidayRule

export interface Jurisdiction {
  id: string;
  country_code: string;
  country_name: string;
  legal_tradition: 'latin_arab' | 'common_law' | 'french_civil';
  weekend_days: number[];
  distance_allowance_days: number;
  distance_rule: string;
  clear_days_rule: string;
  short_threshold_days: number;
}

export interface DeadlineRule {
  id: string;
  jurisdiction_id: string;
  court_type: string;
  trigger_event: string;
  deadline_type: string;
  base_days: number;
  distance_allowance_applies: boolean;
  clear_days_rule: boolean;
  exclude_weekends_short: boolean;
  exclude_weekends_long: boolean;
  extend_to_next_business_day: boolean;
  legal_basis: string;
}

export interface Holiday {
  id: string;
  jurisdiction_id: string;
  holiday_date: string;
  holiday_name: string;
  year: number;
}

export interface ComputedDeadline {
  deadlineDate: Date;
  totalDays: number;
  baseDays: number;
  distanceDays: number;
  excludedDays: number;
  extendedForHoliday: boolean;
  rule: DeadlineRule;
  jurisdiction: Jurisdiction;
}

export function isWeekend(date: Date, weekendDays: number[]): boolean {
  return weekendDays.includes(date.getDay());
}

export function isHoliday(date: Date, holidays: Holiday[], jurisdictionId: string): boolean {
  const dateStr = date.toISOString().slice(0, 10);
  return holidays.some((h) => h.jurisdiction_id === jurisdictionId && h.holiday_date === dateStr);
}

export function isBusinessDay(date: Date, jurisdiction: Jurisdiction, holidays: Holiday[]): boolean {
  return !isWeekend(date, jurisdiction.weekend_days) && !isHoliday(date, holidays, jurisdiction.id);
}

export function computeMultiJurisdictionDeadline(
  triggerDate: Date,
  rule: DeadlineRule,
  jurisdiction: Jurisdiction,
  holidays: Holiday[],
  distanceApplies: boolean = false,
): ComputedDeadline {
  let totalDays = rule.base_days;
  let distanceDays = 0;

  // Distance allowance (mيعاد المسافة / Délai de distance)
  if (rule.distance_allowance_applies && distanceApplies) {
    distanceDays = jurisdiction.distance_allowance_days;
    totalDays += distanceDays;
  }

  // Determine if this is a "short" or "long" deadline
  const isShort = rule.base_days <= jurisdiction.short_threshold_days;
  const excludeWeekends = isShort ? rule.exclude_weekends_short : rule.exclude_weekends_long;

  // Start from trigger date
  const current = new Date(triggerDate);

  // Clear days rule: skip the trigger day itself (don't count day of sending/receipt)
  if (rule.clear_days_rule) {
    current.setDate(current.getDate() + 1);
  }

  let excludedDays = 0;
  let added = 0;

  while (added < totalDays) {
    current.setDate(current.getDate() + 1);
    if (excludeWeekends && !isBusinessDay(current, jurisdiction, holidays)) {
      excludedDays++;
      continue;
    }
    if (!excludeWeekends && isHoliday(current, holidays, jurisdiction.id) && rule.extend_to_next_business_day) {
      excludedDays++;
      continue;
    }
    added++;
  }

  // Extend to next business day if deadline falls on weekend/holiday
  let extendedForHoliday = false;
  if (rule.extend_to_next_business_day && !isBusinessDay(current, jurisdiction, holidays)) {
    extendedForHoliday = true;
    while (!isBusinessDay(current, jurisdiction, holidays)) {
      current.setDate(current.getDate() + 1);
    }
  }

  return {
    deadlineDate: current,
    totalDays: totalDays,
    baseDays: rule.base_days,
    distanceDays,
    excludedDays,
    extendedForHoliday,
    rule,
    jurisdiction,
  };
}

export function daysUntil(deadlineDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAlertLevel(deadlineDate: Date): 'info' | 'warning' | 'urgent' | 'critical' {
  const days = daysUntil(deadlineDate);
  if (days < 0) return 'critical';
  if (days <= 1) return 'critical';
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'warning';
  return 'info';
}

export function getWaterfallAlert(days: number): { level: string; message: string } {
  if (days <= 1) {
    return { level: 'critical', message: 'تنبيه حرج: إشعار الشريك المشرف + قفل البطاقات الإدارية غير العاجلة للمحامي' };
  }
  if (days <= 3) {
    return { level: 'urgent', message: 'تنبيه عاجل: إشعار المحامي الأول (Senior)' };
  }
  if (days <= 7) {
    return { level: 'warning', message: 'تنبيه: إشعار المحامي المباشر' };
  }
  return { level: 'info', message: 'الموعد بعيد — لا تنبيه حالياً' };
}

export const LEGAL_TRADITION_LABELS: Record<string, { label: string; description: string }> = {
  latin_arab: { label: 'المدرسة اللاتينية/العربية', description: 'أيام تقويمية + ميعاد مسافة + ترحيل للعطلات' },
  common_law: { label: 'القانون العام (Common Law)', description: 'FRCP/CPR — تمييز المهل القصيرة والطويلة + Clear Days' },
  french_civil: { label: 'القانون المدني الفرنسي', description: 'Délai de distance + ترحيل صارم للعطلات' },
};

// Legacy single-jurisdiction helpers (kept for backward compat with existing deadlineEngine)
const WEEKEND_DAYS = [5, 6];
const HOLIDAYS_2026 = [
  '2026-02-20', '2026-03-07', '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-06-10', '2026-06-11', '2026-06-12', '2026-09-23',
];

export function isHolidaySimple(date: Date): boolean {
  return HOLIDAYS_2026.includes(date.toISOString().slice(0, 10));
}

export function isWeekendSimple(date: Date): boolean {
  return WEEKEND_DAYS.includes(date.getDay());
}

export function isBusinessDaySimple(date: Date): boolean {
  return !isWeekendSimple(date) && !isHolidaySimple(date);
}

export function addBusinessDays(startDate: Date, days: number): Date {
  const current = new Date(startDate);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDaySimple(current)) added++;
  }
  return current;
}

export function computeDeadline(triggerDate: Date, daysAllowed: number, excludeHolidays: boolean = true): Date {
  if (excludeHolidays) return addBusinessDays(triggerDate, daysAllowed);
  const d = new Date(triggerDate);
  d.setDate(d.getDate() + daysAllowed);
  return d;
}

export const APPEAL_DEADLINES: Record<string, { days: number; basis: string }> = {
  'استئناف حكم أول درجة': { days: 30, basis: 'ميعاد الاستئناف 30 يوم من تاريخ التبليغ — قانون المرافعات' },
  'الطعن بالنقض': { days: 30, basis: 'ميعاد الطعن بالنقض 30 يوم من تاريخ التبليغ — قانون المرافعات' },
  'الطعن بالتمييز': { days: 30, basis: 'ميعاد الطعن بالتمييز 30 يوم — قانون المرافعات' },
  'سقوط الحق بالتقادم العمالي': { days: 365, basis: 'تقادم الحقوق العمالية بسنة من انتهاء علاقة العمل — قانون العمل' },
  'الاعتراض على حكم غيابي': { days: 15, basis: 'ميعاد الاعتراض 15 يوم من تاريخ التبليغ — قانون المرافعات' },
};

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Document integrity verification — SHA-256 hash simulation
export function generateDocumentHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

export function verifyDocumentIntegrity(originalHash: string, currentHash: string): boolean {
  return originalHash === currentHash;
}

// Dynamic watermarking metadata
export function generateWatermark(userName: string, ipAddress: string): string {
  const timestamp = new Date().toISOString();
  return `CONFIDENTIAL | ${userName} | ${timestamp} | IP: ${ipAddress}`;
}

// Generate a fake IP for demo purposes
export function generateFakeIP(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

// Generate a fake MAC address for demo
export function generateFakeMAC(): string {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':');
}
