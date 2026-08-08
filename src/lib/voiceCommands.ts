import type { VoiceCommand, VoiceCommandType, VoiceLanguage, Section, FirmModuleId, FinanceModuleId } from './voiceTypes';

/* ============================================================
 * Natural-language voice command parser
 * Understands free-form speech in Arabic, English, and French.
 * Uses fuzzy keyword matching + context-based field extraction.
 * ============================================================ */

/* ---------- Normalization ---------- */

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[\u0640]/g, '') // remove Arabic tatweel
    .replace(/[إأآا]/g, 'ا') // normalize alef variants
    .replace(/ى/g, 'ي') // alef maqsura -> ya
    .replace(/ة/g, 'ه') // ta marbuta -> ha
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '') // strip Arabic diacritics
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ç]/g, 'c')
    .replace(/[\u2010-\u2015]/g, '-') // dash variants
    .replace(/\s+/g, ' ')
    .trim();

/* ---------- Fuzzy matching ---------- */

/**
 * Check if any keyword appears in text, with tolerance for:
 * - word order differences
 * - extra words between keywords
 * - partial matches (at least 60% of keyword words present)
 */
function fuzzyMatch(text: string, keyword: string): boolean {
  const t = normalize(text);
  const k = normalize(keyword);

  if (t.includes(k)) return true;

  // For multi-word keywords, check if all significant words appear in order or nearby
  const kWords = k.split(' ').filter((w) => w.length > 1);
  if (kWords.length <= 1) return t.includes(k);

  let searchFrom = 0;
  let matched = 0;
  for (const kw of kWords) {
    const idx = t.indexOf(kw, searchFrom);
    if (idx !== -1) {
      matched++;
      searchFrom = idx + kw.length;
    }
  }

  // Accept if at least 60% of keyword words matched in order
  return matched / kWords.length >= 0.6;
}

/**
 * Score how well text matches a set of keywords — higher is better.
 */
function matchScore(text: string, keywords: string[]): number {
  let best = 0;
  for (const kw of keywords) {
    const t = normalize(text);
    const k = normalize(kw);
    if (t.includes(k)) {
      // Longer keyword matches score higher
      best = Math.max(best, k.length);
    }
  }
  return best;
}

/* ---------- Smart field extraction ---------- */

/**
 * Extract a name (person or company) from text after removing the command keyword.
 * Handles patterns like "اسمه محمد", "يدعى أحمد", "named John", "nommé Pierre".
 */
function extractPersonName(text: string, markers: string[]): string {
  const t = normalize(text);
  for (const m of markers) {
    const mn = normalize(m);
    const idx = t.indexOf(mn);
    if (idx !== -1) {
      const rest = t.slice(idx + mn.length).trim();
      // Take up to 4 words as a name, stop at stop-words
      const stopWords = ['في', 'بشركه', 'شركة', 'مؤسسة', 'بموضوع', 'بخصوص', 'رقم', 'تاريخ', 'يوم', 'at', 'from', 'company', 'société', 'about', 'subject', 'date', 'number'];
      const parts = rest.split(' ').filter((w) => w.length > 0);
      const nameParts: string[] = [];
      for (const p of parts) {
        if (stopWords.includes(p)) break;
        nameParts.push(p);
        if (nameParts.length >= 4) break;
      }
      if (nameParts.length > 0) return nameParts.join(' ');
    }
  }
  return '';
}

/**
 * Extract text after a marker, stopping at common stop-words.
 */
function extractAfterMarker(text: string, markers: string[], stopWords: string[] = []): string {
  const t = normalize(text);
  for (const m of markers) {
    const mn = normalize(m);
    const idx = t.indexOf(mn);
    if (idx !== -1) {
      const rest = t.slice(idx + mn.length).trim();
      if (stopWords.length === 0) return rest;
      const parts = rest.split(' ').filter((w) => w.length > 0);
      const result: string[] = [];
      for (const p of parts) {
        if (stopWords.includes(p)) break;
        result.push(p);
      }
      return result.join(' ');
    }
  }
  return '';
}

/**
 * Extract a date reference from text — handles relative dates, weekday names, and ISO dates.
 */
function extractDate(text: string, language: VoiceLanguage): string {
  const t = normalize(text);

  const relativeMap: Record<string, string> = {};

  if (language === 'ar-EG') {
    Object.assign(relativeMap, {
      'اليوم': relativeDate(0),
      'النهارده': relativeDate(0),
      'بكرة': relativeDate(1),
      'غدا': relativeDate(1),
      'بعد غد': relativeDate(2),
      'بعد بكرة': relativeDate(2),
      'الاسبوع الجاي': relativeDate(7),
      'الاسبوع القادم': relativeDate(7),
      'الاسبوع المقبل': relativeDate(7),
      'الاسبوع الجاية': relativeDate(7),
    });
    const weekdays: Record<string, number> = {
      'الحد': 0, 'الاحد': 0, 'الاثنين': 1, 'الاتنين': 1,
      'الثلاثاء': 2, 'الاربعاء': 3, 'الخميس': 4,
      'الجمعة': 5, 'الجمعه': 5, 'السبت': 6,
    };
    for (const [name, day] of Object.entries(weekdays)) {
      relativeMap[name] = nextWeekday(day);
    }
  } else if (language === 'en-US') {
    Object.assign(relativeMap, {
      'today': relativeDate(0),
      'tomorrow': relativeDate(1),
      'day after tomorrow': relativeDate(2),
      'next week': relativeDate(7),
    });
    const weekdays: Record<string, number> = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 0,
    };
    for (const [name, day] of Object.entries(weekdays)) {
      relativeMap[name] = nextWeekday(day);
    }
  } else {
    Object.assign(relativeMap, {
      "aujourd'hui": relativeDate(0),
      'aujourdhui': relativeDate(0),
      'demain': relativeDate(1),
      'apres demain': relativeDate(2),
      'semaine prochaine': relativeDate(7),
    });
    const weekdays: Record<string, number> = {
      'lundi': 1, 'mardi': 2, 'mercredi': 3,
      'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0,
    };
    for (const [name, day] of Object.entries(weekdays)) {
      relativeMap[name] = nextWeekday(day);
    }
  }

  for (const [keyword, date] of Object.entries(relativeMap)) {
    if (t.includes(normalize(keyword))) return date;
  }

  // ISO date pattern
  const isoMatch = t.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = t.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return '';
}

function relativeDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextWeekday(target: number): string {
  const today = new Date();
  const day = today.getDay();
  let diff = target - day;
  if (diff <= 0) diff += 7;
  today.setDate(today.getDate() + diff);
  return today.toISOString().slice(0, 10);
}

/**
 * Extract a number from text — handles Arabic and Western numerals.
 */
function extractNumber(text: string): string {
  const t = normalize(text);
  const arabicDigits: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  let converted = t;
  for (const [ar, en] of Object.entries(arabicDigits)) {
    converted = converted.replace(new RegExp(ar, 'g'), en);
  }
  const match = converted.match(/\d+/);
  return match ? match[0] : '';
}

/**
 * Extract company name from text.
 */
function extractCompany(text: string, language: VoiceLanguage): string {
  const t = normalize(text);
  const markers = language === 'ar-EG'
    ? ['شركة', 'مؤسسه', 'مؤسسة', 'شركه']
    : language === 'en-US'
    ? ['company', 'from company', 'corporation', 'inc', 'llc']
    : ['société', 'societe', 'entreprise'];
  return extractAfterMarker(t, markers);
}

/* ---------- Command definitions ---------- */

interface CommandDef {
  type: VoiceCommandType;
  keywords: string[];
  extract: (text: string, language: VoiceLanguage) => Record<string, string>;
}

const arabicAddCommands: CommandDef[] = [
  {
    type: 'add_client',
    keywords: ['ضيف عميل', 'عميل جديد', 'سجل عميل', 'ضيف موكل', 'موكل جديد', 'سجل موكل', 'ضيف عملاء', 'عميل', 'موكل', 'ضيف زبون', 'زبون جديد'],
    extract: (t, lang) => {
      const name = extractPersonName(t, ['اسمه', 'اسمها', 'باسم', 'باسمه', 'باسمها', 'يدعى', 'تدعى', 'اسم', 'نسميه', 'نسميها'])
        || extractAfterMarker(t, ['عميل', 'موكل'], ['في', 'بشركه', 'شركة', 'مؤسسه', 'مؤسسة', 'رقم', 'تاريخ']);
      const company = extractCompany(t, lang);
      return { name, company };
    },
  },
  {
    type: 'add_case',
    keywords: ['ضيف قضيه', 'قضيه جديده', 'سجل قضيه', 'ضيف دعوى', 'دعوى جديده', 'سجل دعوى', 'قضيه', 'دعوى', 'قضية', 'قضية جديدة', 'أضف قضية', 'أضف دعوى'],
    extract: (t) => {
      const title = extractPersonName(t, ['بعنوان', 'باسم', 'عنوانها', 'عنوانه', 'يدعى', 'تدعى'])
        || extractAfterMarker(t, ['قضيه', 'قضية', 'دعوى'], ['في', 'ضد', 'للمحكمه', 'للمحكمة', 'رقم', 'تاريخ', 'يوم']);
      return { title };
    },
  },
  {
    type: 'add_poa',
    keywords: ['ضيف توكيل', 'توكيل جديد', 'سجل توكيل', 'توكيل', 'أضف توكيل'],
    extract: (t) => {
      const number = extractNumber(t) || extractAfterMarker(t, ['رقم', 'رقمه', 'رقمه']);
      const client = extractPersonName(t, ['للموكل', 'للعميل', 'لـ', 'ل']);
      return { number, client };
    },
  },
  {
    type: 'add_task',
    keywords: ['ضيف مهمه', 'مهمه جديده', 'سجل مهمه', 'ضيف عمل', 'ضيف تذكير', 'مهمه', 'مهمة', 'مهمة جديدة', 'أضف مهمة', 'أضف تذكير'],
    extract: (t) => {
      const title = extractPersonName(t, ['بعنوان', 'باسم', 'عنوانها', 'عنوانه', 'بـ', 'بخصوص', 'يتعلق بـ'])
        || extractAfterMarker(t, ['مهمه', 'مهمة', 'تذكير'], ['في', 'للقضيه', 'للقضية', 'رقم', 'تاريخ', 'يوم']);
      return { title };
    },
  },
  {
    type: 'add_session',
    keywords: ['ضيف جلسه', 'جلسه جديده', 'سجل جلسه', 'ضيف جلسه قضائيه', 'جلسه قضائيه جديده', 'جلسه', 'جلسة', 'جلسة جديدة', 'جلسة قضائية', 'أضف جلسة'],
    extract: (t, lang) => {
      const date = extractDate(t, lang);
      const caseRef = extractAfterMarker(t, ['للقضيه', 'للقضية', 'بخصوص قضيه', 'بخصوص قضية'], ['يوم', 'تاريخ', 'في']);
      return { date, caseRef };
    },
  },
  {
    type: 'add_meeting',
    keywords: ['ضيف اجتماع', 'اجتماع جديد', 'سجل اجتماع', 'اجتماع', 'اجتماع جديد', 'أضف اجتماع'],
    extract: (t, lang) => {
      const title = extractPersonName(t, ['بعنوان', 'باسم', 'عنوانه', 'عنوانها', 'بخصوص'])
        || extractAfterMarker(t, ['اجتماع'], ['في', 'مع', 'يوم', 'تاريخ']);
      const date = extractDate(t, lang);
      return { title, date };
    },
  },
  {
    type: 'add_account',
    keywords: ['ضيف حساب بنكي', 'حساب بنكي جديد', 'سجل حساب بنكي', 'ضيف حساب', 'حساب بنك', 'حساب بنكي', 'أضف حساب بنكي', 'أضف حساب'],
    extract: (t) => {
      const bank = extractAfterMarker(t, ['بنك', 'في بنك', 'ببنك', 'حساب في', 'حساب ببنك'], ['رقم', 'للعميل']);
      return { bank };
    },
  },
  {
    type: 'add_check',
    keywords: ['ضيف شيك', 'شيك جديد', 'سجل شيك', 'شيك', 'شيك جديد', 'أضف شيك'],
    extract: (t) => {
      const number = extractNumber(t) || extractAfterMarker(t, ['رقم', 'رقمه']);
      const bank = extractAfterMarker(t, ['بنك', 'من بنك', 'على بنك'], ['رقم', 'بمبلغ']);
      return { number, bank };
    },
  },
  {
    type: 'add_staff',
    keywords: ['ضيف موظف', 'موظف جديد', 'سجل موظف', 'ضيف مستشار', 'مستشار جديد', 'موظف', 'مستشار', 'أضف موظف', 'أضف مستشار'],
    extract: (t) => {
      const name = extractPersonName(t, ['اسمه', 'اسمها', 'باسم', 'يدعى', 'تدعى'])
        || extractAfterMarker(t, ['موظف', 'مستشار'], ['في', 'كقائد', 'كمحامي', 'رقم']);
      return { name };
    },
  },
  {
    type: 'add_salary',
    keywords: ['ضيف مرتب', 'مرتب جديد', 'سجل مرتب', 'ضيف راتب', 'راتب جديد', 'مرتب', 'راتب', 'أضف مرتب', 'أضف راتب', 'صرف مرتب'],
    extract: (t) => {
      const name = extractPersonName(t, ['للموظف', 'للمستشار', 'لـ', 'ل']);
      const amount = extractNumber(t);
      return { name, amount };
    },
  },
  {
    type: 'add_document',
    keywords: ['ضيف مستند', 'مستند جديد', 'سجل مستند', 'ضيف صياغه', 'صياغه جديده', 'صياغه', 'مستند', 'أضف مستند', 'أضف صياغة', 'صياغة جديدة', 'صياغة'],
    extract: (t) => {
      const title = extractPersonName(t, ['بعنوان', 'باسم', 'عنوانه', 'عنوانها', 'بخصوص'])
        || extractAfterMarker(t, ['مستند', 'صياغه', 'صياغة'], ['نوع', 'للمستند', 'رقم']);
      return { title };
    },
  },
];

const englishAddCommands: CommandDef[] = [
  {
    type: 'add_client',
    keywords: ['add client', 'new client', 'create client', 'add a client', 'register client', 'client', 'new customer'],
    extract: (t) => {
      const name = extractPersonName(t, ['named', 'called', 'name is', 'name'])
        || extractAfterMarker(t, ['client', 'customer'], ['at', 'from', 'company', 'about']);
      const company = extractCompany(t, 'en-US');
      return { name, company };
    },
  },
  {
    type: 'add_case',
    keywords: ['add case', 'new case', 'create case', 'add a case', 'register case', 'case', 'lawsuit'],
    extract: (t) => {
      const title = extractPersonName(t, ['titled', 'called', 'title', 'about'])
        || extractAfterMarker(t, ['case', 'lawsuit'], ['against', 'for', 'number', 'date']);
      return { title };
    },
  },
  {
    type: 'add_poa',
    keywords: ['add power of attorney', 'new power of attorney', 'add poa', 'new poa', 'power of attorney', 'poa'],
    extract: (t) => {
      const number = extractNumber(t) || extractAfterMarker(t, ['number', 'numbered']);
      const client = extractPersonName(t, ['for', 'client']);
      return { number, client };
    },
  },
  {
    type: 'add_task',
    keywords: ['add task', 'new task', 'create task', 'add a task', 'task', 'to-do', 'reminder'],
    extract: (t) => {
      const title = extractPersonName(t, ['titled', 'called', 'about', 'for'])
        || extractAfterMarker(t, ['task', 'reminder'], ['for', 'by', 'date']);
      return { title };
    },
  },
  {
    type: 'add_session',
    keywords: ['add session', 'new session', 'add court session', 'new court session', 'court session', 'hearing'],
    extract: (t, lang) => {
      const date = extractDate(t, lang);
      const caseRef = extractAfterMarker(t, ['for case', 'about case'], ['on', 'date']);
      return { date, caseRef };
    },
  },
  {
    type: 'add_meeting',
    keywords: ['add meeting', 'new meeting', 'create meeting', 'schedule meeting', 'meeting'],
    extract: (t, lang) => {
      const title = extractPersonName(t, ['titled', 'called', 'about'])
        || extractAfterMarker(t, ['meeting'], ['with', 'on', 'at', 'date']);
      const date = extractDate(t, lang);
      return { title, date };
    },
  },
  {
    type: 'add_account',
    keywords: ['add bank account', 'new bank account', 'add account', 'bank account', 'account'],
    extract: (t) => {
      const bank = extractAfterMarker(t, ['at', 'bank', 'from', 'with'], ['number', 'for']);
      return { bank };
    },
  },
  {
    type: 'add_check',
    keywords: ['add check', 'new check', 'add cheque', 'new cheque', 'check', 'cheque'],
    extract: (t) => {
      const number = extractNumber(t) || extractAfterMarker(t, ['number', 'numbered']);
      const bank = extractAfterMarker(t, ['from', 'bank', 'at'], ['amount', 'for']);
      return { number, bank };
    },
  },
  {
    type: 'add_staff',
    keywords: ['add staff', 'new staff', 'add employee', 'new employee', 'add attorney', 'staff', 'employee', 'hire'],
    extract: (t) => {
      const name = extractPersonName(t, ['named', 'called', 'name'])
        || extractAfterMarker(t, ['employee', 'staff', 'attorney', 'hire'], ['as', 'for', 'at']);
      return { name };
    },
  },
  {
    type: 'add_salary',
    keywords: ['add salary', 'new salary', 'add payroll', 'new payroll', 'salary', 'payroll', 'pay salary'],
    extract: (t) => {
      const name = extractPersonName(t, ['for', 'to']);
      const amount = extractNumber(t);
      return { name, amount };
    },
  },
];

const frenchAddCommands: CommandDef[] = [
  {
    type: 'add_client',
    keywords: ['ajouter client', 'nouveau client', 'creer client', 'ajouter un client', 'client', 'nouveau client'],
    extract: (t) => {
      const name = extractPersonName(t, ['nomme', 'appele', 'nom'])
        || extractAfterMarker(t, ['client'], ['de', 'societe', 'entreprise', 'numero']);
      const company = extractCompany(t, 'fr-FR');
      return { name, company };
    },
  },
  {
    type: 'add_case',
    keywords: ['ajouter affaire', 'nouvelle affaire', 'creer affaire', 'ajouter une affaire', 'affaire'],
    extract: (t) => {
      const title = extractPersonName(t, ['intitule', 'appele', 'titre'])
        || extractAfterMarker(t, ['affaire'], ['contre', 'pour', 'numero', 'date']);
      return { title };
    },
  },
  {
    type: 'add_poa',
    keywords: ['ajouter procuration', 'nouvelle procuration', 'ajouter poa', 'nouveau poa', 'procuration'],
    extract: (t) => {
      const number = extractNumber(t) || extractAfterMarker(t, ['numero', 'numérote']);
      const client = extractPersonName(t, ['pour', 'client']);
      return { number, client };
    },
  },
  {
    type: 'add_task',
    keywords: ['ajouter tache', 'nouvelle tache', 'creer tache', 'ajouter une tache', 'tache', 'rappel'],
    extract: (t) => {
      const title = extractPersonName(t, ['intitule', 'appele', 'titre', 'a propos de'])
        || extractAfterMarker(t, ['tache', 'rappel'], ['pour', 'par', 'date']);
      return { title };
    },
  },
  {
    type: 'add_session',
    keywords: ['ajouter audience', 'nouvelle audience', 'creer audience', 'audience', 'seance', 'séance'],
    extract: (t, lang) => {
      const date = extractDate(t, lang);
      const caseRef = extractAfterMarker(t, ['pour affaire', 'a propos affaire'], ['le', 'date']);
      return { date, caseRef };
    },
  },
  {
    type: 'add_meeting',
    keywords: ['ajouter reunion', 'nouvelle reunion', 'creer reunion', 'planifier reunion', 'reunion', 'réunion'],
    extract: (t, lang) => {
      const title = extractPersonName(t, ['intitule', 'appele', 'titre', 'a propos de'])
        || extractAfterMarker(t, ['reunion', 'réunion'], ['avec', 'le', 'date']);
      const date = extractDate(t, lang);
      return { title, date };
    },
  },
  {
    type: 'add_account',
    keywords: ['ajouter compte bancaire', 'nouveau compte bancaire', 'ajouter compte', 'compte bancaire', 'compte'],
    extract: (t) => {
      const bank = extractAfterMarker(t, ['a', 'banque', 'de'], ['numero', 'pour']);
      return { bank };
    },
  },
  {
    type: 'add_check',
    keywords: ['ajouter cheque', 'nouveau cheque', 'creer cheque', 'cheque'],
    extract: (t) => {
      const number = extractNumber(t) || extractAfterMarker(t, ['numero', 'numérote']);
      const bank = extractAfterMarker(t, ['banque', 'de'], ['montant', 'pour']);
      return { number, bank };
    },
  },
  {
    type: 'add_staff',
    keywords: ['ajouter employe', 'nouvel employe', 'ajouter personnel', 'nouveau personnel', 'employe', 'personnel'],
    extract: (t) => {
      const name = extractPersonName(t, ['nomme', 'appele', 'nom'])
        || extractAfterMarker(t, ['employe', 'personnel'], ['comme', 'pour', 'a']);
      return { name };
    },
  },
  {
    type: 'add_salary',
    keywords: ['ajouter salaire', 'nouveau salaire', 'ajouter paie', 'nouvelle paie', 'salaire', 'paie'],
    extract: (t) => {
      const name = extractPersonName(t, ['pour', 'a']);
      const amount = extractNumber(t);
      return { name, amount };
    },
  },
];

const addCommandSets: Record<VoiceLanguage, CommandDef[]> = {
  'ar-EG': arabicAddCommands,
  'en-US': englishAddCommands,
  'fr-FR': frenchAddCommands,
};

/* ---------- Navigation commands ---------- */

interface NavDef {
  type: VoiceCommandType;
  keywords: string[];
  target: string;
}

const arabicNavCommands: NavDef[] = [
  { type: 'navigate_section', keywords: ['افتح المكتبه', 'المكتبه القانونيه', 'افتح المكتبة', 'المكتبة القانونية', 'المكتبه', 'المكتبة', 'روح المكتبه', 'روح المكتبة', 'المكتبه القانونيه'], target: 'library' },
  { type: 'navigate_section', keywords: ['افتح الاداره الماليه', 'الاداره الماليه', 'افتح الماليه', 'الإدارة المالية', 'افتح الإدارة المالية', 'الماليه', 'المالية', 'روح الماليه', 'روح المالية'], target: 'finance' },
  { type: 'navigate_section', keywords: ['افتح اداره المؤسسه', 'اداره المؤسسه', 'افتح المؤسسه', 'إدارة المؤسسة', 'افتح إدارة المؤسسة', 'المؤسسه', 'المؤسسة', 'روح المؤسسه', 'روح المؤسسة', 'اداره المؤسسه'], target: 'firm' },
  { type: 'navigate_home', keywords: ['ارجع للرئيسيه', 'الرئيسيه', 'الصفحه الرئيسيه', 'ارجع للموقع', 'الرئيسية', 'ارجع للرئيسية', 'الصفحة الرئيسية', 'ارجع', 'روح الرئيسيه', 'روح الرئيسية', 'الرئيسيه'], target: 'site' },
  { type: 'navigate_module', keywords: ['افتح الاجنده', 'الاجنده القضائيه', 'افتح الجدول', 'الأجندة', 'الأجندة القضائية', 'افتح الأجندة', 'الاجنده', 'اجنده', 'جدول الجلسات'], target: 'agenda' },
  { type: 'navigate_module', keywords: ['افتح القضايا', 'الدعاوى', 'افتح الدعاوى', 'القضايا', 'قضايا', 'دعاوى', 'روح القضايا', 'روح الدعاوى', 'القضية الذكية', 'نواة القضية'], target: 'smart-case' },
  { type: 'navigate_module', keywords: ['افتح العملاء', 'الموكلون', 'افتح الموكلون', 'العملاء', 'موكلون', 'روح العملاء', 'روح الموكلون', 'العملاء'], target: 'clients' },
  { type: 'navigate_module', keywords: ['افتح التوكيلات', 'التوكيلات', 'توكيلات', 'روح التوكيلات'], target: 'poa' },
  { type: 'navigate_module', keywords: ['افتح المهام', 'المهام', 'مهام', 'روح المهام', 'قائمة المهام'], target: 'tasks' },
  { type: 'navigate_module', keywords: ['افتح الموظفين', 'الموظفون', 'افتح المستشارين', 'الموظفين', 'مستشارين', 'موظفين', 'روح الموظفين', 'روح المستشارين'], target: 'staff' },
  { type: 'navigate_module', keywords: ['افتح الحسابات', 'الحسابات البنكيه', 'افتح الشيكات', 'الحسابات', 'حسابات بنكيه', 'شيكات', 'بنك', 'روح الحسابات', 'روح الشيكات', 'الحسابات البنكية'], target: 'banking' },
  { type: 'navigate_module', keywords: ['افتح الاجتماعات', 'الاجتماعات', 'اجتماعات', 'روح الاجتماعات'], target: 'meetings' },
  { type: 'navigate_module', keywords: ['افتح لوحه المتابعه', 'لوحه متابعه العميل', 'افتح المتابعات', 'المتابعات', 'المتابعة', 'متابعه', 'روح المتابعات', 'لوحة المتابعة', 'متابعة العميل'], target: 'tracker' },
  { type: 'navigate_module', keywords: ['افتح العقول القانونيه', 'هندسه العقول', 'افتح الموارد البشريه', 'الموارد البشريه', 'افتح تقييم المحامين', 'العقول القانونية', 'الموارد البشرية', 'روح العقول القانونيه', 'روح الموارد البشريه'], target: 'talent' },
  { type: 'navigate_module', keywords: ['افتح الصلاحيات', 'صلاحيات الموظفين', 'افتح صلاحيات', 'الصلاحيات', 'صلاحيات المستشارين', 'روح الصلاحيات', 'افتح تحديد الصلاحيات'], target: 'permissions' },
  { type: 'navigate_module', keywords: ['افتح المستندات', 'افتح المستندات القانونيه', 'افتح تحليل المستندات', 'افتح الامتثال', 'افتح فحص الامتثال', 'المستندات القانونية', 'تحليل المستندات', 'الامتثال القانوني', 'روح المستندات', 'روح الامتثال', 'افتح صياغة المستندات', 'افتح مكتبة المستندات'], target: 'documents' },
  { type: 'navigate_module', keywords: ['افتح قمره القياده', 'قمره قياده المحامي', 'افتح القمره', 'افتح الكوكبت', 'الكوكبت', 'قمرة القيادة', 'افتح قمرة القيادة', 'روح القمره', 'روح الكوكبت'], target: 'cockpit' },
  { type: 'navigate_module', keywords: ['افتح الخدمه كاشتراك', 'الخدمه القانونيه كاشتراك', 'افتح الاشتراكات', 'لاس', 'laas', 'المحفظه القانونيه', 'افتح المحفظه الذكيه', 'الخدمة القانونية كاشتراك', 'المحفظة القانونية', 'افتح المحفظة الذكية', 'روح الاشتراكات', 'روح لاس'], target: 'laas' },
  { type: 'navigate_module', keywords: ['افتح براءات الاختراع', 'براءات الاختراع', 'براءه', 'افتح البراءات', 'البراءات', 'روح البراءات', 'براءة اختراع', 'سجل براءة'], target: 'patents' },
  { type: 'navigate_module', keywords: ['افتح حقوق المؤلف', 'حقوق المؤلف', 'حقوق الطبع', 'افتح حقوق الطبع', 'روح حقوق المؤلف', 'حقوق النشر'], target: 'copyrights' },
  { type: 'navigate_module', keywords: ['افتح الامن السيبراني', 'الامن السيبراني', 'الامن الرقمي', 'افتح الامن الرقمي', 'حمايه البيانات', 'حماية البيانات', 'روح الامن السيبراني', 'السيبراني'], target: 'cyber-security' },
  { type: 'navigate_module', keywords: ['افتح الجرائم الالكترونيه', 'الجرائم الالكترونيه', 'جرائم تقنيه المعلومات', 'افتح الجرائم الرقميه', 'روح الجرائم الالكترونيه', 'الجرائم الإلكترونية', 'الجرائم الرقمية'], target: 'cyber-crime' },
  { type: 'navigate_module', keywords: ['افتح التوقيع الالكتروني', 'التوقيع الالكتروني', 'التوقيع الرقمي', 'افتح التوقيع الرقمي', 'روح التوقيع الالكتروني', 'المعاملات الرقميه', 'المعاملات الرقمية'], target: 'digital-signature' },
  { type: 'navigate_module', keywords: ['افتح النشر الرقمي', 'النشر الرقمي', 'النشر الالكتروني', 'افتح النشر الالكتروني', 'روح النشر الرقمي', 'الوسائط المتعدده', 'الوسائط المتعددة'], target: 'digital-publishing' },
  { type: 'navigate_module', keywords: ['افتح الاصول الرقميه', 'الاصول الرقميه', 'الذكاء الاصطناعي', 'افتح الذكاء الاصطناعي', 'روح الاصول الرقميه', 'حوكه الذكاء الاصطناعي', 'حوكة الذكاء الاصطناعي'], target: 'digital-assets' },
  { type: 'navigate_module', keywords: ['افتح العقود التجاريه', 'العقود التجاريه', 'عقود التوريدات', 'افتح عقود التوريدات', 'روح العقود التجاريه', 'العقود التجارية', 'عقود التوريدات'], target: 'commercial-contracts' },
  { type: 'navigate_module', keywords: ['افتح الاستحواذ والاندماج', 'الاستحواذ والاندماج', 'الاستحواذ', 'افتح الاستحواذ', 'روح الاستحواذ', 'الاندماج', 'صفقات الاستحواذ'], target: 'merger-acquisition' },
  { type: 'navigate_module', keywords: ['افتح الاستثمار الاجنبي', 'الاستثمار الاجنبي', 'الاستثمار المباشر', 'افتح الاستثمار المباشر', 'روح الاستثمار الاجنبي', 'تاسيس الشركات', 'تأسيس الشركات'], target: 'fdi' },
  { type: 'navigate_module', keywords: ['افتح العقارات', 'العقارات', 'التطوير العقاري', 'افتح التطوير العقاري', 'روح العقارات', 'العقارات والتطوير', 'صفقات عقاريه', 'صفقات عقارية'], target: 'real-estate' },
  { type: 'navigate_module', keywords: ['افتح التوزيع والوكالات', 'التوزيع والوكالات', 'الوكالات التجاريه', 'افتح الوكالات', 'روح التوزيع', 'الفرنشايز', 'التوزيع التجاري'], target: 'distribution' },
  { type: 'navigate_module', keywords: ['افتح التجاره البحريه', 'التجاره البحريه', 'الشحن البحري', 'افتح الشحن البحري', 'روح التجاره البحريه', 'التجاره الجويه', 'الشحن الجوي', 'التجارة البحرية', 'التجارة الجوية'], target: 'maritime-commerce' },
  { type: 'navigate_module', keywords: ['افتح التمويل الاستراتيجي', 'التمويل الاستراتيجي', 'الاستثمار الاستراتيجي', 'افتح الاستثمار', 'روح التمويل', 'اتفاقيات التمويل', 'القروض الاستراتيجيه'], target: 'strategic-finance' },
  { type: 'navigate_module', keywords: ['افتح الامتثال التجاري', 'الامتثال التجاري', 'منع الاحتكار', 'افتح منع الاحتكار', 'روح الامتثال', 'حمايه المنافسه', 'حماية المنافسة'], target: 'antitrust' },
  { type: 'navigate_module', keywords: ['افتح التركات والمواريث', 'التركات والمواريث', 'المواريث', 'افتح المواريث', 'روح التركات', 'تصفيه التركات', 'تصفية التركات', 'التركه', 'التركة'], target: 'inheritance' },
  { type: 'navigate_module', keywords: ['افتح الاوقاف', 'الاوقاف', 'الحراسه القضائيه', 'افتح الحراسه القضائيه', 'روح الاوقاف', 'الوقف', 'النظاره', 'الأوقاف', 'الحراسة القضائية'], target: 'endowment' },
  { type: 'navigate_module', keywords: ['افتح العقود المدنيه', 'العقود المدنيه', 'الايجارات', 'افتح الايجارات', 'روح العقود المدنيه', 'عقد ايجار', 'العقود المدنية', 'الإيجارات'], target: 'civil-contracts' },
  { type: 'navigate_module', keywords: ['افتح التعويضات', 'التعويضات', 'المسؤوليه التقصيريه', 'افتح المسؤوليه التقصيريه', 'روح التعويضات', 'دعاوى التعويض', 'المسؤولية التقصيرية'], target: 'compensation' },
  { type: 'navigate_module', keywords: ['افتح الملكيه الشائعه', 'الملكيه الشائعه', 'الفرز والتجنيب', 'افتح الفرز والتجنيب', 'روح الملكيه الشائعه', 'الملكية الشائعة', 'التجميع العقاري'], target: 'joint-property' },
  { type: 'navigate_module', keywords: ['افتح العقود الشفهيه', 'العقود الشفهيه', 'الاثبات المدني', 'افتح الاثبات', 'روح العقود الشفهيه', 'الشهود', 'العقود الشفهية', 'الإثبات المدني'], target: 'oral-contracts' },
  { type: 'navigate_module', keywords: ['افتح الضمانات العينيه', 'الضمانات العينيه', 'الرهون', 'افتح الرهون', 'روح الضمانات', 'الحقوق العينيه', 'الضمانات العينية', 'الحقوق العينية'], target: 'real-estate-security' },
  { type: 'navigate_module', keywords: ['افتح الشؤون القنصليه', 'الشؤون القنصليه', 'القنصليه', 'افتح القنصليه', 'روح الشؤون القنصليه', 'الشؤون القنصلية', 'القنصلية'], target: 'consular-affairs' },
  { type: 'navigate_module', keywords: ['افتح الجمارك والضرائب', 'الجمارك والضرائب', 'الضرائب العقاريه', 'افتح الضرائب', 'روح الجمارك', 'الملفات الضريبيه', 'الملفات الضريبية'], target: 'customs-tax' },
  { type: 'navigate_module', keywords: ['افتح البيئه', 'البيئه', 'التنميه المستدامه', 'افتح التنميه المستدامه', 'روح البيئه', 'الاستدامه', 'البيئة', 'التنمية المستدامة'], target: 'environmental' },
  { type: 'navigate_module', keywords: ['افتح الطاقه', 'الطاقه', 'الموارد الطبيعيه', 'افتح الموارد الطبيعيه', 'روح الطاقه', 'البترول', 'الغاز', 'الطاقة', 'الموارد الطبيعية'], target: 'energy-resources' },
  { type: 'navigate_module', keywords: ['افتح حمايه المستهلك', 'حمايه المستهلك', 'المنافسه', 'افتح المنافسه', 'روح حمايه المستهلك', 'شكاوى المستهلكين', 'حماية المستهلك', 'المنافسة'], target: 'consumer-protection' },
  { type: 'navigate_module', keywords: ['افتح الرياضه', 'الرياضه', 'الاتحادات الرياضيه', 'افتح الاتحادات الرياضيه', 'روح الرياضه', 'عقود الرياضه', 'الرياضة', 'الاتحادات الرياضية'], target: 'sports' },
  { type: 'navigate_module', keywords: ['افتح التعليم العالي', 'التعليم العالي', 'القطاع الاكاديمي', 'افتح القطاع الاكاديمي', 'روح التعليم العالي', 'الجامعات', 'الاكاديمي'], target: 'academic' },
  { type: 'navigate_module', keywords: ['افتح التعليم قبل الجامعي', 'التعليم قبل الجامعي', 'المدارس', 'افتح المدارس', 'روح التعليم قبل الجامعي', 'مدارس', 'المدارس'], target: 'pre-university' },
  { type: 'navigate_module', keywords: ['افتح الاداره المحليه', 'الاداره المحليه', 'الاشغالات', 'افتح الاشغالات', 'روح الاداره المحليه', 'التنظيم العمراني', 'الإدارة المحلية', 'الإشغالات'], target: 'local-administration' },
  { type: 'navigate_module', keywords: ['افتح النقل واللوجستيات', 'النقل واللوجستيات', 'النقل والمواصلات', 'افتح النقل', 'روح النقل', 'اللوجستيات', 'الأساطيل'], target: 'transport-logistics' },
  { type: 'navigate_module', keywords: ['افتح الحوكمه الاداريه', 'الحوكمه الاداريه', 'الهياكل التنظيميه', 'افتح الهياكل', 'روح الحوكمه', 'الحوكمة الإدارية', 'الهياكل التنظيمية'], target: 'administrative-governance' },
  { type: 'navigate_module', keywords: ['افتح التحقيقات الداخليه', 'التحقيقات الداخليه', 'التاديب', 'افتح التاديب', 'روح التحقيقات', 'المحاسبه الاداريه', 'التحقيقات الداخلية', 'التأديب'], target: 'internal-investigations' },
  { type: 'navigate_module', keywords: ['افتح اداره المعرفه', 'اداره المعرفه', 'الوثائق الذكيه', 'افتح الوثائق الذكيه', 'روح اداره المعرفه', 'المكتبه المعرفيه', 'إدارة المعرفة', 'الوثائق الذكية'], target: 'knowledge-management' },
  { type: 'navigate_module', keywords: ['افتح التعرف الذكي', 'التعرف الذكي', 'توجيه المستندات', 'افتح توجيه المستندات', 'روح التعرف الذكي', 'التعرف الضوئي', 'الـ OCR'], target: 'integrated-documents' },
  { type: 'navigate_module', keywords: ['افتح الارشفه الجماعيه', 'الارشفه الجماعيه', 'ارشفه الملفات', 'افتح ارشفه الملفات', 'روح الارشفه', 'الارشيف الذكي', 'الأرشفة الجماعية'], target: 'bulk-archiver' },
  { type: 'navigate_module', keywords: ['افتح مجلس الاداره', 'مجلس الاداره', 'غرفه الاجتماعات السياديه', 'افتح غرفه الاجتماعات', 'روح مجلس الاداره', 'الحوكمه التنفيذيه', 'مجلس الإدارة'], target: 'boardroom-governance' },
  { type: 'navigate_module', keywords: ['افتح التحليل التنبؤي', 'التحليل التنبؤي', 'تدقيق المخاطر', 'افتح تدقيق المخاطر', 'روح المخاطر', 'المخاطر القانونية', 'التحليل الاستباقي'], target: 'risk-engine' },
  { type: 'navigate_module', keywords: ['افتح محرك المهام', 'محرك المهام', 'اللوحات التعاونية', 'افتح اللوحات', 'روح المهام الداخلية', 'مهام داخلية', 'لوحة المهام'], target: 'internal-tasks' },
  { type: 'navigate_module', keywords: ['افتح البريد السيادي', 'البريد السيادي', 'البريد المشفر', 'افتح البريد', 'روح البريد', 'الإشعارات المؤتمتة', 'المراسلات السيادية'], target: 'sovereign-mail' },
  { type: 'navigate_module', keywords: ['افتح محرر المستندات', 'محرر المستندات', 'استوديو المستندات', 'افتح استوديو المستندات', 'روح محرر المستندات', 'تحرير المستندات', 'المستندات السيادية'], target: 'integrated-documents' },
  { type: 'navigate_module', keywords: ['افتح GenOffice', 'جين اوفيس', 'محرر GenOffice', 'افتح المحرر السيادي', 'روح GenOffice', 'تحرير سيادي', 'المحرر السيادي'], target: 'genoffice-editor' },
  { type: 'navigate_module', keywords: ['افتح التخزين السيادي', 'التخزين السيادي', 'المستودع الموزع', 'افتح المستودع', 'روح التخزين', 'الحصن الرقمي', 'التخزين المحلي'], target: 'sovereign-storage' },
  { type: 'navigate_module', keywords: ['افتح التفريغ الصوتي', 'التفريغ الصوتي', 'تحويل الصوت لنص', 'افتح تحويل الصوت', 'روح التفريغ الصوتي', 'التفريغ الذكي', 'تفريغ الصوت'], target: 'audio-transcription' },
  { type: 'navigate_module', keywords: ['افتح الرفاهيه', 'الرفاهيه المؤسسيه', 'الصحه المهنيه', 'افتح الصحه المهنيه', 'روح الرفاهيه', 'اللياقه البدنيه', 'الرفاهية المؤسسية'], target: 'wellness' },
  { type: 'navigate_module', keywords: ['افتح النقابات', 'النقابات المهنيه', 'النقابه', 'افتح النقابه', 'روح النقابات', 'الاتحادات', 'النقابات'], target: 'syndicates' },
  { type: 'navigate_module', keywords: ['افتح المؤسسات الطبيه', 'المؤسسات الطبيه', 'القطاع الصحي', 'افتح القطاع الصحي', 'روح الطبيه', 'المستشفيات', 'الطبية'], target: 'medical-institutions' },
  { type: 'navigate_module', keywords: ['افتح القطاع الهندسي', 'القطاع الهندسي', 'المكاتب الاستشاريه', 'افتح المكاتب الاستشاريه', 'روح الهندسي', 'عقود الفيديك', 'الهندسي'], target: 'engineering-consulting' },
  { type: 'navigate_module', keywords: ['افتح المؤسسات الاقتصاديه', 'المؤسسات الاقتصاديه', 'الاستثمارات الكبرى', 'افتح الاستثمارات', 'روح الاقتصاديه', 'الكيانات القابضه', 'الاقتصادية'], target: 'economic-investment' },
  { type: 'navigate_module', keywords: ['افتح السفارات', 'السفارات', 'البعثات الدبلوماسيه', 'افتح البعثات', 'روح القنصليه', 'الشؤون القنصليه', 'الدبلوماسية'], target: 'embassies-consular' },
  { type: 'navigate_module', keywords: ['افتح العقود الدوليه', 'العقود الدوليه', 'العقود العابره للحدود', 'افتح العقود العابره', 'روح الدوليه', 'الاتفاقيات الدوليه', 'الدولية'], target: 'cross-border-contracts' },
  { type: 'navigate_module', keywords: ['افتح المنظمات الدوليه', 'المنظمات الدوليه', 'الوكالات الامميه', 'افتح الوكالات الامميه', 'روح المنظمات', 'الهيئات الاقليميه', 'المنظمات الدولية'], target: 'intl-organizations' },
  { type: 'navigate_module', keywords: ['افتح الجمعيات الاهليه', 'الجمعيات الاهليه', 'العمل الاهلي', 'افتح العمل الاهلي', 'روح الجمعيات', 'المنظمات غير الربحيه', 'الجمعيات الأهلية'], target: 'ngos-civil-society' },
  { type: 'navigate_module', keywords: ['افتح التامينات الاجتماعيه', 'التامينات الاجتماعيه', 'المعاشات', 'افتح المعاشات', 'روح التامينات', 'الحمايه الاقتصاديه', 'التأمينات الاجتماعية'], target: 'social-insurance' },
  { type: 'navigate_module', keywords: ['افتح علاقات العمل', 'علاقات العمل', 'عقود العمل', 'افتح عقود العمل', 'روح العماليه', 'المنازعات العماليه', 'العمل'], target: 'labor-relations' },
  { type: 'navigate_module', keywords: ['افتح المؤسسات الاعلاميه', 'المؤسسات الاعلاميه', 'الصحافه', 'افتح الصحافه', 'روح الاعلام', 'منصات النشر', 'الإعلام'], target: 'press-media' },
  { type: 'navigate_module', keywords: ['افتح البنوك', 'البنوك', 'المؤسسات المصرفيه', 'افتح المصرفيه', 'روح البنوك', 'غسل الاموال', 'المصرفية'], target: 'banking-finance' },
  { type: 'navigate_module', keywords: ['افتح الادارات القانونيه', 'الادارات القانونيه', 'الامتثال المؤسسي', 'افتح الامتثال', 'روح القانوني', 'القسم القانوني', 'الإدارات القانونية'], target: 'inhouse-legal' },
  { type: 'navigate_module', keywords: ['افتح الموارد البشريه', 'الموارد البشريه', 'الشؤون الاداريه', 'افتح الشؤون', 'روح الموظفين', 'مسير الرواتب', 'الموارد البشرية'], target: 'human-resources' },
  { type: 'navigate_module', keywords: ['افتح التجمعات السكنيه', 'التجمعات السكنيه', 'الكومباوندات', 'افتح الكومباوند', 'روح الكومباوند', 'اتحادات الشاغلين', 'التجمعات السكنية'], target: 'compound-hoa' },
  { type: 'navigate_module', keywords: ['افتح الاندية الرياضيه', 'الاندية الرياضيه', 'الاتحادات الرياضيه', 'افتح الاندية', 'روح الرياضه', 'النادي الرياضي', 'الأندية الرياضية'], target: 'sports-clubs' },
  { type: 'navigate_module', keywords: ['افتح الامومه والطفوله', 'الامومه والطفوله', 'الرعايه الاسريه', 'افتح الرعايه', 'روح الاسره', 'الحضانه', 'الأمومة والطفولة'], target: 'family-welfare' },
  { type: 'navigate_module', keywords: ['افتح الانتاج الاعلامي', 'الانتاج الاعلامي', 'المصنفات الفنيه', 'افتح المصنفات', 'روح الانتاج', 'حقوق المؤلف', 'الإنتاج الإعلامي'], target: 'media-production' },
];

const englishNavCommands: NavDef[] = [
  { type: 'navigate_section', keywords: ['open library', 'legal library', 'open the library', 'go to library', 'library', 'show library'], target: 'library' },
  { type: 'navigate_section', keywords: ['open finance', 'finance department', 'open the finance', 'go to finance', 'finance', 'show finance'], target: 'finance' },
  { type: 'navigate_section', keywords: ['open firm management', 'firm management', 'open the firm', 'go to firm', 'firm', 'show firm'], target: 'firm' },
  { type: 'navigate_home', keywords: ['go home', 'back to home', 'home page', 'back to site', 'home', 'go to home', 'return'], target: 'site' },
  { type: 'navigate_module', keywords: ['open agenda', 'judicial agenda', 'open the agenda', 'go to agenda', 'agenda', 'calendar', 'court schedule'], target: 'agenda' },
  { type: 'navigate_module', keywords: ['open cases', 'the cases', 'open the cases', 'go to cases', 'cases', 'lawsuits', 'show cases', 'smart case', 'case matrix'], target: 'smart-case' },
  { type: 'navigate_module', keywords: ['open clients', 'the clients', 'open the clients', 'go to clients', 'clients', 'customers', 'show clients'], target: 'clients' },
  { type: 'navigate_module', keywords: ['open poa', 'power of attorney', 'open the poa', 'go to poa', 'poa', 'powers of attorney', 'show poa'], target: 'poa' },
  { type: 'navigate_module', keywords: ['open tasks', 'the tasks', 'open the tasks', 'go to tasks', 'tasks', 'to-do', 'show tasks'], target: 'tasks' },
  { type: 'navigate_module', keywords: ['open staff', 'the staff', 'open employees', 'go to staff', 'staff', 'employees', 'team', 'show staff'], target: 'staff' },
  { type: 'navigate_module', keywords: ['open banking', 'bank accounts', 'open checks', 'go to banking', 'banking', 'checks', 'cheques', 'show banking'], target: 'banking' },
  { type: 'navigate_module', keywords: ['open meetings', 'the meetings', 'open the meetings', 'go to meetings', 'meetings', 'show meetings'], target: 'meetings' },
  { type: 'navigate_module', keywords: ['open tracker', 'legal tracker', 'open legal tracker', 'client tracker', 'tracker', 'go to tracker', 'show tracker'], target: 'tracker' },
  { type: 'navigate_module', keywords: ['open cockpit', "lawyer's cockpit", 'open the cockpit', 'lawyer cockpit', 'cockpit', 'go to cockpit', 'show cockpit'], target: 'cockpit' },
  { type: 'navigate_module', keywords: ['open laas', 'legal as a service', 'open subscription', 'legal wallet', 'open the wallet', 'laas', 'go to laas', 'subscription', 'wallet', 'show laas'], target: 'laas' },
  { type: 'navigate_module', keywords: ['open patents', 'patent engine', 'open patent', 'patents', 'go to patents', 'show patents', 'patent registration'], target: 'patents' },
  { type: 'navigate_module', keywords: ['open copyrights', 'copyright engine', 'open copyright', 'copyrights', 'go to copyrights', 'show copyrights', 'digital protection'], target: 'copyrights' },
  { type: 'navigate_module', keywords: ['open cyber security', 'cybersecurity', 'cyber security', 'open security', 'go to security', 'show security', 'data protection'], target: 'cyber-security' },
  { type: 'navigate_module', keywords: ['open cyber crime', 'cyber crime', 'cybercrime', 'open cybercrime', 'go to cyber crime', 'show cyber crime', 'it crime'], target: 'cyber-crime' },
  { type: 'navigate_module', keywords: ['open digital signature', 'e-signature', 'electronic signature', 'open e-signature', 'go to signature', 'show signature', 'digital transaction'], target: 'digital-signature' },
  { type: 'navigate_module', keywords: ['open digital publishing', 'digital publishing', 'open publishing', 'multimedia', 'go to publishing', 'show publishing', 'digital media'], target: 'digital-publishing' },
  { type: 'navigate_module', keywords: ['open digital assets', 'digital assets', 'ai governance', 'open ai governance', 'go to digital assets', 'show digital assets', 'ai models'], target: 'digital-assets' },
  { type: 'navigate_module', keywords: ['open commercial contracts', 'commercial contracts', 'procurement', 'open procurement', 'go to contracts', 'show contracts', 'supply contracts'], target: 'commercial-contracts' },
  { type: 'navigate_module', keywords: ['open mergers and acquisitions', 'merger acquisition', 'm and a', 'open mna', 'go to acquisitions', 'show acquisitions', 'deals'], target: 'merger-acquisition' },
  { type: 'navigate_module', keywords: ['open foreign investment', 'fdi', 'foreign direct investment', 'open fdi', 'go to fdi', 'show fdi', 'company formation'], target: 'fdi' },
  { type: 'navigate_module', keywords: ['open real estate', 'real estate', 'property', 'open property', 'go to real estate', 'show properties', 'property development'], target: 'real-estate' },
  { type: 'navigate_module', keywords: ['open distribution', 'distribution agencies', 'commercial agencies', 'open agencies', 'go to distribution', 'show agencies', 'franchise'], target: 'distribution' },
  { type: 'navigate_module', keywords: ['open maritime commerce', 'maritime commerce', 'sea shipping', 'air cargo', 'open shipping', 'go to maritime', 'show shipments', 'bill of lading'], target: 'maritime-commerce' },
  { type: 'navigate_module', keywords: ['open strategic finance', 'strategic finance', 'strategic investment', 'open financing', 'go to finance', 'show financings', 'investment agreements'], target: 'strategic-finance' },
  { type: 'navigate_module', keywords: ['open antitrust', 'antitrust compliance', 'commercial compliance', 'open compliance', 'go to antitrust', 'show compliance', 'competition law'], target: 'antitrust' },
  { type: 'navigate_module', keywords: ['open inheritance', 'inheritance estates', 'wills and estates', 'open estates', 'go to inheritance', 'show estates', 'estate liquidation'], target: 'inheritance' },
  { type: 'navigate_module', keywords: ['open endowments', 'endowments', 'judicial guardianship', 'open guardianship', 'go to endowments', 'show endowments', 'waqf'], target: 'endowment' },
  { type: 'navigate_module', keywords: ['open civil contracts', 'civil contracts', 'leases', 'open leases', 'go to civil contracts', 'show contracts', 'rental agreements'], target: 'civil-contracts' },
  { type: 'navigate_module', keywords: ['open compensation', 'compensation claims', 'tort liability', 'open tort claims', 'go to compensation', 'show claims', 'damage claims'], target: 'compensation' },
  { type: 'navigate_module', keywords: ['open joint property', 'joint property', 'partition', 'open partition', 'go to joint property', 'show partition', 'property division'], target: 'joint-property' },
  { type: 'navigate_module', keywords: ['open oral contracts', 'oral contracts', 'civil evidence', 'open evidence', 'go to oral contracts', 'show evidence', 'witness statements'], target: 'oral-contracts' },
  { type: 'navigate_module', keywords: ['open real estate security', 'mortgages', 'in-rem rights', 'open mortgages', 'go to mortgages', 'show mortgages', 'property pledges'], target: 'real-estate-security' },
  { type: 'navigate_module', keywords: ['open consular affairs', 'consular cases', 'open consular', 'go to consular', 'show consular', 'foreign nationals'], target: 'consular-affairs' },
  { type: 'navigate_module', keywords: ['open customs tax', 'customs and tax', 'tax files', 'open tax', 'go to customs', 'show tax', 'real estate tax'], target: 'customs-tax' },
  { type: 'navigate_module', keywords: ['open environmental', 'environmental compliance', 'sustainability', 'open environment', 'go to environmental', 'show environmental', 'esg'], target: 'environmental' },
  { type: 'navigate_module', keywords: ['open energy resources', 'energy and natural resources', 'oil and gas', 'open energy', 'go to energy', 'show energy', 'renewable energy'], target: 'energy-resources' },
  { type: 'navigate_module', keywords: ['open consumer protection', 'consumer protection', 'competition', 'open consumer', 'go to consumer', 'show consumer', 'consumer complaints'], target: 'consumer-protection' },
  { type: 'navigate_module', keywords: ['open sports', 'sports and federations', 'sports contracts', 'open sports', 'go to sports', 'show sports', 'athletics'], target: 'sports' },
  { type: 'navigate_module', keywords: ['open academic', 'academic and higher education', 'universities', 'open academic', 'go to academic', 'show academic', 'higher education'], target: 'academic' },
  { type: 'navigate_module', keywords: ['open pre-university', 'pre-university education', 'schools', 'open schools', 'go to schools', 'show schools', 'k-12 education'], target: 'pre-university' },
  { type: 'navigate_module', keywords: ['open local administration', 'local administration', 'occupations', 'open occupations', 'go to local admin', 'show local admin', 'building permits'], target: 'local-administration' },
  { type: 'navigate_module', keywords: ['open transport logistics', 'transport and logistics', 'fleet management', 'open transport', 'go to transport', 'show transport', 'fleet contracts'], target: 'transport-logistics' },
  { type: 'navigate_module', keywords: ['open administrative governance', 'org structures', 'governance', 'open governance', 'go to governance', 'show governance', 'authority matrix'], target: 'administrative-governance' },
  { type: 'navigate_module', keywords: ['open internal investigations', 'internal investigations', 'disciplinary', 'open disciplinary', 'go to investigations', 'show investigations', 'administrative accountability'], target: 'internal-investigations' },
  { type: 'navigate_module', keywords: ['open knowledge management', 'knowledge management', 'smart documents', 'open documents', 'go to knowledge', 'show knowledge', 'document indexing'], target: 'knowledge-management' },
  { type: 'navigate_module', keywords: ['open document recognition', 'document recognition', 'OCR routing', 'open OCR', 'go to recognition', 'show recognition', 'smart routing'], target: 'integrated-documents' },
  { type: 'navigate_module', keywords: ['open bulk archiver', 'bulk archiver', 'batch archive', 'open archive', 'go to archiver', 'show archiver', 'bulk filing'], target: 'bulk-archiver' },
  { type: 'navigate_module', keywords: ['open boardroom', 'boardroom governance', 'board meetings', 'open board', 'go to boardroom', 'show boardroom', 'executive governance'], target: 'boardroom-governance' },
  { type: 'navigate_module', keywords: ['open risk engine', 'predictive risk', 'risk analysis', 'compliance check', 'go to risk', 'show risk', 'predictive analytics'], target: 'risk-engine' },
  { type: 'navigate_module', keywords: ['open internal tasks', 'internal task engine', 'task boards', 'open tasks', 'go to tasks', 'show task board', 'kanban'], target: 'internal-tasks' },
  { type: 'navigate_module', keywords: ['open sovereign mail', 'sovereign mail', 'encrypted mail', 'open mail', 'go to mail', 'show mail', 'sovereign messaging'], target: 'sovereign-mail' },
  { type: 'navigate_module', keywords: ['open document studio', 'document studio', 'sovereign editor', 'open editor', 'go to documents', 'show document studio', 'document editing'], target: 'integrated-documents' },
  { type: 'navigate_module', keywords: ['open genoffice', 'genoffice editor', 'sovereign document editor', 'open sovereign editor', 'go to genoffice', 'show genoffice', 'local editor'], target: 'genoffice-editor' },
  { type: 'navigate_module', keywords: ['open sovereign storage', 'sovereign storage', 'object storage', 'open storage', 'go to storage', 'show storage', 'local vault'], target: 'sovereign-storage' },
  { type: 'navigate_module', keywords: ['open audio transcription', 'audio to text', 'transcription engine', 'open transcription', 'go to transcription', 'show transcription', 'speech to text'], target: 'audio-transcription' },
  { type: 'navigate_module', keywords: ['open wellness', 'wellness and fitness', 'corporate wellness', 'open wellness', 'go to wellness', 'show wellness', 'employee health'], target: 'wellness' },
  { type: 'navigate_module', keywords: ['open syndicates', 'professional syndicates', 'federations', 'open syndicate', 'go to syndicates', 'show syndicates', 'trade unions'], target: 'syndicates' },
  { type: 'navigate_module', keywords: ['open medical institutions', 'healthcare sector', 'medical facilities', 'open medical', 'go to medical', 'show medical', 'hospitals'], target: 'medical-institutions' },
  { type: 'navigate_module', keywords: ['open engineering consulting', 'engineering sector', 'consulting firms', 'open engineering', 'go to engineering', 'show engineering', 'fidic contracts'], target: 'engineering-consulting' },
  { type: 'navigate_module', keywords: ['open economic investment', 'major economic institutions', 'holding companies', 'open economic', 'go to economic', 'show economic', 'investment funds'], target: 'economic-investment' },
  { type: 'navigate_module', keywords: ['open embassies', 'diplomatic missions', 'consular affairs', 'open consular', 'go to embassies', 'show embassies', 'foreign missions'], target: 'embassies-consular' },
  { type: 'navigate_module', keywords: ['open cross border contracts', 'international agreements', 'cross border contracts', 'open international contracts', 'go to cross border', 'show cross border', 'international contracts'], target: 'cross-border-contracts' },
  { type: 'navigate_module', keywords: ['open international organizations', 'un agencies', 'regional bodies', 'open intl organizations', 'go to organizations', 'show organizations', 'international organizations'], target: 'intl-organizations' },
  { type: 'navigate_module', keywords: ['open ngos', 'civil society', 'nonprofits', 'open ngos civil society', 'go to ngos', 'show ngos', 'charities'], target: 'ngos-civil-society' },
  { type: 'navigate_module', keywords: ['open social insurance', 'pensions', 'social security', 'open insurance', 'go to insurance', 'show insurance', 'economic security'], target: 'social-insurance' },
  { type: 'navigate_module', keywords: ['open labor relations', 'employment contracts', 'labor disputes', 'open labor', 'go to labor', 'show labor', 'collective bargaining'], target: 'labor-relations' },
  { type: 'navigate_module', keywords: ['open press media', 'media institutions', 'press licenses', 'open media', 'go to media', 'show media', 'publishing'], target: 'press-media' },
  { type: 'navigate_module', keywords: ['open banking finance', 'banks', 'financial institutions', 'open banking', 'go to banking', 'show banking', 'aml compliance'], target: 'banking-finance' },
  { type: 'navigate_module', keywords: ['open inhouse legal', 'corporate legal', 'inhouse counsel', 'open legal department', 'go to legal', 'show legal', 'compliance audit'], target: 'inhouse-legal' },
  { type: 'navigate_module', keywords: ['open human resources', 'hr', 'payroll', 'open hr', 'go to hr', 'show hr', 'personnel'], target: 'human-resources' },
  { type: 'navigate_module', keywords: ['open compound hoa', 'residential compounds', 'hoa', 'open compound', 'go to compound', 'show compound', 'homeowners'], target: 'compound-hoa' },
  { type: 'navigate_module', keywords: ['open sports clubs', 'sports federations', 'clubs', 'open clubs', 'go to clubs', 'show clubs', 'athletics'], target: 'sports-clubs' },
  { type: 'navigate_module', keywords: ['open family welfare', 'maternity childhood', 'custody', 'open welfare', 'go to welfare', 'show welfare', 'alimony'], target: 'family-welfare' },
  { type: 'navigate_module', keywords: ['open media production', 'audiovisual works', 'production', 'open production', 'go to production', 'show production', 'copyright'], target: 'media-production' },
];

const frenchNavCommands: NavDef[] = [
  { type: 'navigate_section', keywords: ['ouvrir bibliotheque', 'bibliotheque juridique', 'ouvrir la bibliotheque', 'bibliotheque', 'aller bibliotheque'], target: 'library' },
  { type: 'navigate_section', keywords: ['ouvrir finances', 'departement finances', 'ouvrir les finances', 'finances', 'aller finances'], target: 'finance' },
  { type: 'navigate_section', keywords: ['ouvrir gestion cabinet', 'gestion cabinet', 'ouvrir le cabinet', 'cabinet', 'aller cabinet'], target: 'firm' },
  { type: 'navigate_home', keywords: ['retour accueil', "page d'accueil", 'retour au site', 'accueil', 'aller accueil'], target: 'site' },
  { type: 'navigate_module', keywords: ['ouvrir agenda', 'agenda judiciaire', "ouvrir l'agenda", 'agenda', 'aller agenda'], target: 'agenda' },
  { type: 'navigate_module', keywords: ['ouvrir affaires', 'les affaires', 'ouvrir les affaires', 'affaires', 'aller affaires'], target: 'smart-case' },
  { type: 'navigate_module', keywords: ['ouvrir clients', 'les clients', 'ouvrir les clients', 'clients', 'aller clients'], target: 'clients' },
  { type: 'navigate_module', keywords: ['ouvrir procurations', 'les procurations', 'procurations', 'aller procurations'], target: 'poa' },
  { type: 'navigate_module', keywords: ['ouvrir taches', 'les taches', 'ouvrir les taches', 'taches', 'aller taches'], target: 'tasks' },
  { type: 'navigate_module', keywords: ['ouvrir personnel', 'le personnel', 'ouvrir employes', 'personnel', 'employes', 'aller personnel'], target: 'staff' },
  { type: 'navigate_module', keywords: ['ouvrir comptes', 'comptes bancaires', 'ouvrir cheques', 'comptes', 'cheques', 'aller comptes'], target: 'banking' },
  { type: 'navigate_module', keywords: ['ouvrir reunions', 'les reunions', 'ouvrir les reunions', 'reunions', 'aller reunions'], target: 'meetings' },
  { type: 'navigate_module', keywords: ['ouvrir suivi', 'suivi client', 'ouvrir le suivi', 'suivi', 'aller suivi'], target: 'tracker' },
  { type: 'navigate_module', keywords: ['ouvrir cockpit', "cockpit de l'avocat", 'ouvrir le cockpit', 'cockpit', 'aller cockpit'], target: 'cockpit' },
  { type: 'navigate_module', keywords: ['ouvrir laas', 'service juridique', 'ouvrir abonnement', 'portefeuille juridique', 'laas', 'aller laas', 'abonnement'], target: 'laas' },
  { type: 'navigate_module', keywords: ['ouvrir brevets', 'brevets', 'brevet', 'aller brevets'], target: 'patents' },
  { type: 'navigate_module', keywords: ['ouvrir droits dauteur', 'droits dauteur', 'aller droits dauteur'], target: 'copyrights' },
  { type: 'navigate_module', keywords: ['ouvrir cybersecurite', 'cybersecurite', 'aller cybersecurite'], target: 'cyber-security' },
  { type: 'navigate_module', keywords: ['ouvrir cybercriminalite', 'cybercriminalite', 'aller cybercriminalite'], target: 'cyber-crime' },
  { type: 'navigate_module', keywords: ['ouvrir signature numerique', 'signature numerique', 'aller signature'], target: 'digital-signature' },
  { type: 'navigate_module', keywords: ['ouvrir publication numerique', 'publication numerique', 'aller publication'], target: 'digital-publishing' },
  { type: 'navigate_module', keywords: ['ouvrir actifs numeriques', 'actifs numeriques', 'gouvernance ia', 'aller actifs'], target: 'digital-assets' },
  { type: 'navigate_module', keywords: ['ouvrir contrats commerciaux', 'contrats commerciaux', 'aller contrats'], target: 'commercial-contracts' },
  { type: 'navigate_module', keywords: ['ouvrir fusions acquisitions', 'fusions acquisitions', 'aller acquisitions'], target: 'merger-acquisition' },
  { type: 'navigate_module', keywords: ['ouvrir investissement etranger', 'investissement etranger', 'aller investissement'], target: 'fdi' },
  { type: 'navigate_module', keywords: ['ouvrir immobilier', 'immobilier', 'aller immobilier'], target: 'real-estate' },
  { type: 'navigate_module', keywords: ['ouvrir distribution', 'distribution agences', 'aller distribution'], target: 'distribution' },
  { type: 'navigate_module', keywords: ['ouvrir commerce maritime', 'commerce maritime', 'aller maritime'], target: 'maritime-commerce' },
  { type: 'navigate_module', keywords: ['ouvrir finance strategique', 'finance strategique', 'aller finance'], target: 'strategic-finance' },
  { type: 'navigate_module', keywords: ['ouvrir antitrust', 'antitrust conformite', 'aller antitrust'], target: 'antitrust' },
  { type: 'navigate_module', keywords: ['ouvrir successions', 'successions heritages', 'aller successions'], target: 'inheritance' },
  { type: 'navigate_module', keywords: ['ouvrir dotations', 'dotations habous', 'aller dotations'], target: 'endowment' },
  { type: 'navigate_module', keywords: ['ouvrir contrats civils', 'contrats civils baux', 'aller contrats civils'], target: 'civil-contracts' },
  { type: 'navigate_module', keywords: ['ouvrir indemnites', 'indemnites responsabilite', 'aller indemnites'], target: 'compensation' },
  { type: 'navigate_module', keywords: ['ouvrir propriete indivise', 'propriete indivise partage', 'aller propriete indivise'], target: 'joint-property' },
  { type: 'navigate_module', keywords: ['ouvrir contrats oraux', 'contrats oraux preuve', 'aller contrats oraux'], target: 'oral-contracts' },
  { type: 'navigate_module', keywords: ['ouvrir suretes immobilieres', 'suretes immobilieres hypotheques', 'aller suretes'], target: 'real-estate-security' },
  { type: 'navigate_module', keywords: ['ouvrir affaires consulaires', 'affaires consulaires', 'aller affaires consulaires'], target: 'consular-affairs' },
  { type: 'navigate_module', keywords: ['ouvrir douanes taxes', 'douanes et taxes', 'aller douanes taxes'], target: 'customs-tax' },
  { type: 'navigate_module', keywords: ['ouvrir environnement', 'environnement developpement durable', 'aller environnement'], target: 'environmental' },
  { type: 'navigate_module', keywords: ['ouvrir energie ressources', 'energie ressources naturelles', 'aller energie'], target: 'energy-resources' },
  { type: 'navigate_module', keywords: ['ouvrir protection consommateur', 'protection consommateur concurrence', 'aller protection consommateur'], target: 'consumer-protection' },
  { type: 'navigate_module', keywords: ['ouvrir sport', 'sport federations sportives', 'aller sport'], target: 'sports' },
  { type: 'navigate_module', keywords: ['ouvrir academique', 'academique enseignement superieur', 'aller academique'], target: 'academic' },
  { type: 'navigate_module', keywords: ['ouvrir enseignement pre-universitaire', 'enseignement pre-universitaire ecoles', 'aller ecoles'], target: 'pre-university' },
  { type: 'navigate_module', keywords: ['ouvrir administration locale', 'administration locale occupations', 'aller administration locale'], target: 'local-administration' },
  { type: 'navigate_module', keywords: ['ouvrir transport logistique', 'transport logistique flotte', 'aller transport'], target: 'transport-logistics' },
  { type: 'navigate_module', keywords: ['ouvrir gouvernance administrative', 'gouvernance administrative structures', 'aller gouvernance'], target: 'administrative-governance' },
  { type: 'navigate_module', keywords: ['ouvrir enquetes internes', 'enquetes internes disciplinaire', 'aller enquetes'], target: 'internal-investigations' },
  { type: 'navigate_module', keywords: ['ouvrir gestion connaissance', 'gestion connaissance documents intelligents', 'aller connaissance'], target: 'knowledge-management' },
  { type: 'navigate_module', keywords: ['ouvrir reconnaissance documents', 'reconnaissance intelligente documents', 'aller reconnaissance'], target: 'integrated-documents' },
  { type: 'navigate_module', keywords: ['ouvrir archiveur groupé', 'archiveur groupé fichiers', 'aller archiveur'], target: 'bulk-archiver' },
  { type: 'navigate_module', keywords: ['ouvrir salle conseil', 'salle conseil gouvernance', 'aller conseil'], target: 'boardroom-governance' },
  { type: 'navigate_module', keywords: ['ouvrir moteur risques', 'analyse prédictive risques', 'aller risques'], target: 'risk-engine' },
  { type: 'navigate_module', keywords: ['ouvrir tâches internes', 'moteur tâches internes', 'aller tâches'], target: 'internal-tasks' },
  { type: 'navigate_module', keywords: ['ouvrir courrier souverain', 'courrier souverain chiffré', 'aller courrier'], target: 'sovereign-mail' },
  { type: 'navigate_module', keywords: ['ouvrir studio documents', 'studio documents souverain', 'aller studio'], target: 'integrated-documents' },
  { type: 'navigate_module', keywords: ['ouvrir genoffice', 'editeur genoffice souverain', 'aller genoffice'], target: 'genoffice-editor' },
  { type: 'navigate_module', keywords: ['ouvrir stockage souverain', 'stockage souverain distribue', 'aller stockage'], target: 'sovereign-storage' },
  { type: 'navigate_module', keywords: ['ouvrir transcription audio', 'transcription audio texte', 'aller transcription'], target: 'audio-transcription' },
  { type: 'navigate_module', keywords: ['ouvrir bien-etre', 'bien-etre forme entreprise', 'aller bien-etre'], target: 'wellness' },
  { type: 'navigate_module', keywords: ['ouvrir syndicats', 'syndicats professionnels federations', 'aller syndicats'], target: 'syndicates' },
  { type: 'navigate_module', keywords: ['ouvrir institutions medicales', 'institutions medicales sante', 'aller medicales'], target: 'medical-institutions' },
  { type: 'navigate_module', keywords: ['ouvrir ingenierie conseil', 'ingenierie conseil fidic', 'aller ingenierie'], target: 'engineering-consulting' },
  { type: 'navigate_module', keywords: ['ouvrir economique investissement', 'economique investissement holdings', 'aller economique'], target: 'economic-investment' },
  { type: 'navigate_module', keywords: ['ouvrir ambassades consulat', 'ambassades missions diplomatiques', 'aller ambassades'], target: 'embassies-consular' },
  { type: 'navigate_module', keywords: ['ouvrir contrats transfrontaliers', 'contrats transfrontaliers accords internationaux', 'aller transfrontaliers'], target: 'cross-border-contracts' },
  { type: 'navigate_module', keywords: ['ouvrir organisations internationales', 'organisations internationales agences onu', 'aller organisations'], target: 'intl-organizations' },
  { type: 'navigate_module', keywords: ['ouvrir ong societe civile', 'ong societe civile organisations non lucratives', 'aller ong'], target: 'ngos-civil-society' },
  { type: 'navigate_module', keywords: ['ouvrir assurances sociales', 'assurances sociales retraites', 'aller assurances'], target: 'social-insurance' },
  { type: 'navigate_module', keywords: ['ouvrir relations travail', 'relations travail contrats emploi', 'aller travail'], target: 'labor-relations' },
  { type: 'navigate_module', keywords: ['ouvrir presse medias', 'presse medias institutions', 'aller medias'], target: 'press-media' },
  { type: 'navigate_module', keywords: ['ouvrir banques finances', 'banques institutions financieres', 'aller banques'], target: 'banking-finance' },
  { type: 'navigate_module', keywords: ['ouvrir directions juridiques', 'directions juridiques conformite', 'aller juridique'], target: 'inhouse-legal' },
  { type: 'navigate_module', keywords: ['ouvrir ressources humaines', 'ressources humaines personnel', 'aller rh'], target: 'human-resources' },
  { type: 'navigate_module', keywords: ['ouvrir complexes residentiels', 'complexes residentiels coproprietes', 'aller complexes'], target: 'compound-hoa' },
  { type: 'navigate_module', keywords: ['ouvrir clubs sportifs', 'clubs sportifs federations', 'aller clubs'], target: 'sports-clubs' },
  { type: 'navigate_module', keywords: ['ouvrir maternite enfance', 'maternite enfance protection famille', 'aller maternite'], target: 'family-welfare' },
  { type: 'navigate_module', keywords: ['ouvrir production medias', 'production medias oeuvres audiovisuelles', 'aller production'], target: 'media-production' },
];

const navCommandSets: Record<VoiceLanguage, NavDef[]> = {
  'ar-EG': arabicNavCommands,
  'en-US': englishNavCommands,
  'fr-FR': frenchNavCommands,
};

/* ---------- Special commands (remind, email) ---------- */

interface SpecialDef {
  type: VoiceCommandType;
  keywords: string[];
  extract: (text: string, language: VoiceLanguage) => Record<string, string>;
}

const arabicSpecialCommands: SpecialDef[] = [
  {
    type: 'remind',
    keywords: ['ذكرني', 'تذكير', 'ضيف تذكير', 'ذكرني بـ', 'فكرني', 'نبهني', 'تذكير بـ', 'ضيف تذكير بـ', 'ذكرني', 'تذكير جديد'],
    extract: (t, lang) => {
      const title = extractPersonName(t, ['ذكرني بـ', 'ذكرني ب', 'تذكير بـ', 'تذكير ب', 'فكرني بـ', 'فكرني ب', 'نبهني بـ', 'نبهني ب', 'بخصوص', 'عن'])
        || extractAfterMarker(t, ['تذكير', 'ذكرني', 'فكرني', 'نبهني'], ['يوم', 'تاريخ', 'غدا', 'بكرة', 'اليوم']);
      const date = extractDate(t, lang);
      return { title, date };
    },
  },
  {
    type: 'email',
    keywords: ['ارسل بريد', 'ارسل ايميل', 'ارسل رساله', 'بعث بريد', 'بعث ايميل', 'ابعت ايميل', 'ابعت بريد', 'ابعت رساله', 'ارسل', 'مراسله', 'أرسل بريد', 'أرسل إيميل', 'أرسل رسالة', 'رسالة'],
    extract: (t) => {
      const recipient = extractPersonName(t, ['الى', 'لـ', 'ل', 'للموكل', 'للعميل', 'للمحامي'])
        || extractAfterMarker(t, ['الى', 'لـ', 'ل'], ['بخصوص', 'موضوع', 'عنوان']);
      const subject = extractPersonName(t, ['بخصوص', 'موضوعه', 'عنوانه', 'عن', 'بشان'])
        || extractAfterMarker(t, ['بخصوص', 'موضوع', 'عنوان'], []);
      return { recipient, subject };
    },
  },
];

const englishSpecialCommands: SpecialDef[] = [
  {
    type: 'remind',
    keywords: ['remind me', 'set reminder', 'reminder to', 'reminder', 'add reminder', 'notify me', 'alert me'],
    extract: (t, lang) => {
      const title = extractPersonName(t, ['remind me to', 'remind me about', 'reminder to', 'reminder about', 'about', 'for'])
        || extractAfterMarker(t, ['remind', 'reminder'], ['tomorrow', 'today', 'on', 'next', 'date']);
      const date = extractDate(t, lang);
      return { title, date };
    },
  },
  {
    type: 'email',
    keywords: ['send email', 'send mail', 'email to', 'write email', 'send message', 'email', 'mail', 'compose email'],
    extract: (t) => {
      const recipient = extractPersonName(t, ['to', 'email to', 'mail to', 'for'])
        || extractAfterMarker(t, ['to', 'for'], ['about', 'subject', 'regarding']);
      const subject = extractPersonName(t, ['about', 'subject', 'regarding', 'concerning'])
        || extractAfterMarker(t, ['about', 'subject', 'regarding'], []);
      return { recipient, subject };
    },
  },
];

const frenchSpecialCommands: SpecialDef[] = [
  {
    type: 'remind',
    keywords: ['rappelle-moi', 'rappel', 'rappel de', 'rappelle moi', 'ajouter rappel', 'notifier', 'rappel de'],
    extract: (t, lang) => {
      const title = extractPersonName(t, ['rappelle-moi de', 'rappelle-moi a propos de', 'rappel de', 'rappel a propos de', 'a propos de', 'pour'])
        || extractAfterMarker(t, ['rappel', 'rappelle'], ['demain', 'aujourdhui', 'semaine', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']);
      const date = extractDate(t, lang);
      return { title, date };
    },
  },
  {
    type: 'email',
    keywords: ['envoie email', 'envoie un email', 'envoie courriel', 'envoyer email', 'ecrire email', 'email', 'courriel', 'message'],
    extract: (t) => {
      const recipient = extractPersonName(t, ['a', 'email a', 'courriel a', 'pour'])
        || extractAfterMarker(t, ['a', 'pour'], ['sujet', 'a propos', 'concernant']);
      const subject = extractPersonName(t, ['sujet', 'a propos de', 'concernant'])
        || extractAfterMarker(t, ['sujet', 'a propos', 'concernant'], []);
      return { recipient, subject };
    },
  },
];

const specialCommandSets: Record<VoiceLanguage, SpecialDef[]> = {
  'ar-EG': arabicSpecialCommands,
  'en-US': englishSpecialCommands,
  'fr-FR': frenchSpecialCommands,
};

/* ---------- Main parser ---------- */

export function parseCommand(raw: string, language: VoiceLanguage): VoiceCommand {
  const text = normalize(raw);

  // Priority 1: Special commands (remind, email) — checked first since they're distinctive
  const specials = specialCommandSets[language];
  for (const def of specials) {
    for (const kw of def.keywords) {
      if (fuzzyMatch(text, kw)) {
        return { type: def.type, raw, language, payload: def.extract(text, language) };
      }
    }
  }

  // Priority 2: Navigation — checked before add to avoid "open" being confused with "add"
  const navs = navCommandSets[language];
  for (const def of navs) {
    for (const kw of def.keywords) {
      if (fuzzyMatch(text, kw)) {
        return { type: def.type, raw, language, payload: { target: def.target } };
      }
    }
  }

  // Priority 3: Add commands — use scoring to find best match
  const adds = addCommandSets[language];
  let bestAdd: { def: CommandDef; score: number } | null = null;
  for (const def of adds) {
    const score = matchScore(text, def.keywords);
    if (score > 0 && (!bestAdd || score > bestAdd.score)) {
      bestAdd = { def, score };
    }
  }
  if (bestAdd) {
    return { type: bestAdd.def.type, raw, language, payload: bestAdd.def.extract(text, language) };
  }

  return { type: 'unknown', raw, language, payload: {} };
}

/* ---------- Date resolver (kept for backward compatibility) ---------- */

export function resolveRelativeDate(token: string, language: VoiceLanguage): string {
  return extractDate(token, language);
}

export const SECTION_TARGETS: Section[] = ['site', 'library', 'finance', 'firm'];
export const FIRM_MODULE_TARGETS: FirmModuleId[] = ['agenda', 'smart-case', 'clients', 'poa', 'tasks', 'staff', 'banking', 'meetings', 'tracker', 'talent', 'cockpit', 'laas', 'permissions', 'documents', 'patents', 'copyrights', 'cyber-security', 'cyber-crime', 'digital-signature', 'digital-publishing', 'digital-assets', 'commercial-contracts', 'merger-acquisition', 'fdi', 'real-estate', 'distribution', 'maritime-commerce', 'strategic-finance', 'antitrust', 'inheritance', 'endowment', 'civil-contracts', 'compensation', 'joint-property', 'oral-contracts', 'real-estate-security', 'consular-affairs', 'customs-tax', 'environmental', 'energy-resources', 'consumer-protection', 'sports', 'academic', 'pre-university', 'local-administration', 'transport-logistics', 'administrative-governance', 'internal-investigations', 'knowledge-management', 'integrated-documents', 'genoffice-editor', 'bulk-archiver', 'boardroom-governance', 'risk-engine', 'internal-tasks', 'sovereign-mail', 'sovereign-storage', 'audio-transcription', 'wellness', 'syndicates', 'medical-institutions', 'engineering-consulting', 'economic-investment', 'embassies-consular', 'cross-border-contracts', 'intl-organizations', 'ngos-civil-society', 'social-insurance', 'labor-relations', 'press-media', 'banking-finance', 'inhouse-legal', 'human-resources', 'compound-hoa', 'sports-clubs', 'family-welfare', 'media-production'];
export const FINANCE_MODULE_TARGETS: FinanceModuleId[] = ['dashboard', 'trust', 'billing', 'disbursements', 'partners', 'ar', 'cycle', 'reserve'];
