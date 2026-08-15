export interface AccessDecision {
  allowed: boolean;
  status: number;
  reason: string;
  blockedModules: string[];
  blockedEngines: string[];
  allowedModules: string[];
}

const BLOCKED_BY_DEFAULT: Record<string, string[]> = {
  'quarries-mining': ['M103'],
  'cross-border-contracts': ['M90'],
  'import-export': ['M90'],
  'maritime-commerce': ['M90'],
  'tourism-hotels': ['M86'],
  'automotive-trade': ['M94'],
  'shopping-mall': ['M99'],
};

const ENGINE_TO_MODULE: Record<string, string> = {
  M90: 'import-export',
  M94: 'automotive-trade',
  M99: 'shopping-mall',
  M86: 'tourism-hotels',
  M103: 'quarries-mining',
};

export function canAccessModule(moduleId: string, grantedModules: string[] = []): AccessDecision {
  const allowedModules = Array.from(new Set(grantedModules));
  const isGranted = allowedModules.includes(moduleId);
  const blocked = BLOCKED_BY_DEFAULT[moduleId] || [];

  if (!isGranted) {
    return {
      allowed: false,
      status: 403,
      reason: `محرك أو قطاع ${moduleId} غير مفعّل في باقة الاشتراك الحالية. يرجى التواصل مع إدارة المنظومة لترقية الحساب.`,
      blockedModules: [moduleId],
      blockedEngines: blocked,
      allowedModules: allowedModules,
    };
  }

  return {
    allowed: true,
    status: 200,
    reason: 'مسموح',
    blockedModules: [],
    blockedEngines: [],
    allowedModules,
  };
}

export function evaluateCommandAccess(subtasks: Array<{ engine_code?: string; task_title?: string }>, grantedModules: string[] = []): AccessDecision {
  const blockedEngines: string[] = [];
  const blockedModules: string[] = [];

  for (const subtask of subtasks) {
    const engineCode = subtask.engine_code || '';
    const moduleId = ENGINE_TO_MODULE[engineCode];
    if (moduleId && !grantedModules.includes(moduleId)) {
      blockedEngines.push(engineCode);
      if (!blockedModules.includes(moduleId)) blockedModules.push(moduleId);
    }
  }

  if (blockedEngines.length > 0) {
    return {
      allowed: false,
      status: 403,
      reason: `تم حظر طلبات المحرك/القطاع غير المصرح به، ويجب تفعيله في الباقة الحالية قبل تنفيذ صياغة العقد.`,
      blockedModules,
      blockedEngines,
      allowedModules: grantedModules,
    };
  }

  return {
    allowed: true,
    status: 200,
    reason: 'جميع المحركات مسموح بها',
    blockedModules: [],
    blockedEngines: [],
    allowedModules: grantedModules,
  };
}
