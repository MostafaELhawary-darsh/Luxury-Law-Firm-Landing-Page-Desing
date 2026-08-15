import type { LibraryEntry } from '@/components/firm/DocumentManagement';

/**
 * محرك الاقتراحات الذكية للصياغة القانونية
 * يقترح المراجع المناسبة بناءً على نوع الصياغة والبيانات المدخلة
 */

interface DraftAssistanceResult {
  suggestedReferences: LibraryEntry[];
  suggestedClausesTemplate: string;
  keywords: string[];
  relatedCases?: LibraryEntry[];
}

/**
 * اقتراح مراجع قانونية بناءً على نوع الصياغة
 */
export function suggestReferencesForDraft(
  draftType: string,
  draftData: Record<string, string>,
  libraryEntries: LibraryEntry[]
): DraftAssistanceResult {
  const keywords = extractKeywordsFromDraft(draftType, draftData);
  const legalCategories = mapDraftTypeToLegalCategories(draftType);

  // تصفية المراجع المناسبة
  const suggestedReferences = libraryEntries
    .map(entry => ({
      entry,
      relevanceScore: calculateRelevanceScore(
        entry,
        keywords,
        legalCategories
      ),
    }))
    .filter(item => item.relevanceScore > 30)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 8)
    .map(item => item.entry);

  // البحث عن حالات مشابهة
  const relatedCases = suggestedReferences.filter(
    ref => ref.source_type === 'judicial_precedent'
  );

  // اقتراح قالب للبنود المهمة
  const suggestedClausesTemplate = generateClausesTemplate(draftType, draftData);

  return {
    suggestedReferences,
    suggestedClausesTemplate,
    keywords,
    relatedCases,
  };
}

/**
 * استخراج الكلمات المفتاحية من بيانات الصياغة
 */
function extractKeywordsFromDraft(
  draftType: string,
  draftData: Record<string, string>
): string[] {
  const keywords = new Set<string>();

  // إضافة الكلمات المفتاحية من النوع
  const typeKeywords: Record<string, string[]> = {
    contract: ['عقد', 'توريد', 'خدمات', 'التزام', 'شروط', 'بند'],
    appeal: ['طعن', 'حكم', 'استئناف', 'مخالفة', 'قانون', 'قضية'],
    lawsuit: ['دعوى', 'مدعي', 'مدعى عليه', 'طلبات', 'وقائع'],
    legal_opinion: ['رأي', 'استشارة', 'قانون', 'شرعي', 'قانوني'],
    memo: ['مذكرة', 'دفاع', 'رد', 'وقائع', 'قانون'],
    regulation: ['لائحة', 'قرار', 'إداري', 'تنظيم'],
    ruling: ['حكم', 'محكمة', 'منطوق', 'مبدأ'],
    clause: ['بند', 'شرط', 'عقد', 'التزام'],
  };

  const type = draftType as keyof typeof typeKeywords;
  if (typeKeywords[type]) {
    typeKeywords[type].forEach(k => keywords.add(k));
  }

  // إضافة الكلمات من البيانات المدخلة
  Object.values(draftData).forEach(value => {
    if (!value || value.length < 2) return;
    
    const words = value.split(/[\s،\-()]/);
    words.forEach(word => {
      if (word.length > 3 && !isCommonWord(word)) {
        keywords.add(word);
      }
    });
  });

  return Array.from(keywords);
}

/**
 * تعيين نوع الصياغة إلى فئات قانونية
 */
function mapDraftTypeToLegalCategories(draftType: string): string[] {
  const categoryMap: Record<string, string[]> = {
    contract: ['قانون الشركات', 'العقود', 'القانون التجاري'],
    appeal: ['القضاء', 'الإجراءات', 'قانون المرافعات'],
    lawsuit: ['القضاء', 'القانون المدني', 'القانون الجنائي'],
    legal_opinion: ['جميع الفئات', 'الاستشارات القانونية'],
    memo: ['القضاء', 'الدفاع', 'قانون المرافعات'],
    regulation: ['القانون الإداري', 'اللوائح التنفيذية'],
    ruling: ['أحكام المحاكم', 'السوابق القضائية'],
    clause: ['العقود', 'الشروط القانونية'],
  };

  return categoryMap[draftType] || ['جميع الفئات'];
}

/**
 * حساب درجة الارتباط بين المرجع والصياغة
 */
function calculateRelevanceScore(
  entry: LibraryEntry,
  keywords: string[],
  categories: string[]
): number {
  let score = 0;

  // 1. مطابقة النوع (40 نقطة)
  const typeScore: Record<string, Record<string, number>> = {
    legislation: { contract: 20, clause: 20, appeal: 5 },
    law: { contract: 25, appeal: 15, lawsuit: 10 },
    regulation: { contract: 15, regulation: 40, clause: 10 },
    judicial_precedent: { appeal: 35, lawsuit: 35, memo: 25 },
    fatwa: { legal_opinion: 40, contract: 10 },
  };

  // 2. مطابقة الكلمات المفتاحية (40 نقطة)
  const keywordMatches = keywords.filter(k =>
    entry.title.toLowerCase().includes(k.toLowerCase()) ||
    entry.content_text.toLowerCase().includes(k.toLowerCase())
  ).length;

  const keywordScore = (keywordMatches / keywords.length) * 40;

  // 3. الحداثة (20 نقطة) — المراجع الحديثة أفضل
  const ageScore = entry.year
    ? Math.max(0, 20 - (new Date().getFullYear() - entry.year) * 2)
    : 10;

  score = (keywordScore + ageScore) || 0;

  return Math.round(score);
}

/**
 * إنشاء قالب بنود قانونية مقترحة
 */
function generateClausesTemplate(
  draftType: string,
  draftData: Record<string, string>
): string {
  const templates: Record<string, (data: Record<string, string>) => string> = {
    contract: () => `
📋 البنود الأساسية المقترحة:

1️⃣ بند التعريفات
• تعريف الطرفين والعلاقة التعاقدية
• تحديد الموضوع بدقة

2️⃣ بند الالتزامات
• التزامات الطرف الأول
• التزامات الطرف الثاني

3️⃣ بند الشروط الجزائية
• تحديد العقوبة عند عدم الوفاء
• طرق الحساب والسداد

4️⃣ بند فض النزاعات
• التحكيم أم القضاء
• اختيار المحكمة المختصة

5️⃣ بند السرية والملكية
• حماية المعلومات السرية
• حقوق الملكية الفكرية
    `,
    appeal: () => `
📋 عناصر الطعن الأساسية:

1️⃣ المقدمة
• تحديد الحكم المطعون فيه
• رقم الطعن والمحكمة

2️⃣ الوقائع
• ملخص وقائع القضية
• موقف الطرفين

3️⃣ الأساس القانوني
• القوانين المخالفة
• نقاط الطعن الأساسية

4️⃣ الدفوع الإجرائية
• قابلية الطعن
• الاختصاص

5️⃣ الطلبات الختامية
• ما يطلبه الطاعن
• الأساس القانوني
    `,
    legal_opinion: () => `
📋 هيكل الرأي القانوني:

1️⃣ الاستفسار
• تحديد المسألة القانونية بدقة
• السياق والحقائع

2️⃣ التحليل
• الأحكام القانونية ذات الصلة
• السوابق القضائية
• الآراء الفقهية

3️⃣ الخلاصة
• الإجابة المباشرة
• التحفظات إن وجدت

4️⃣ التوصيات
• الخطوات المقترحة
• الاحتياطات اللازمة
    `,
  };

  const template = templates[draftType];
  return template ? template(draftData) : `📋 استخدم المراجع المقترحة أعلاه كمرجع أثناء الصياغة`;
}

/**
 * التحقق من الكلمات الشائعة
 */
function isCommonWord(word: string): boolean {
  const commonWords = [
    'في', 'من', 'إلى', 'على', 'عن', 'مع', 'أو', 'و', 'ال', 'لا', 'ما',
    'هو', 'هي', 'نحن', 'أنتم', 'هم', 'قد', 'كل', 'بعض', 'ذلك', 'هذا',
  ];
  return commonWords.includes(word.toLowerCase());
}

/**
 * اقتراح محركات ذات صلة
 */
export function suggestRelatedEngines(draftType: string): string[] {
  const engineMap: Record<string, string[]> = {
    contract: ['SmartCaseCore', 'DocumentManagement', 'KnowledgeManagement'],
    appeal: ['SmartCaseCore', 'CourtCases', 'PredictiveRisk'],
    lawsuit: ['SmartCaseCore', 'JudicialAgenda', 'LawyersCockpit'],
    legal_opinion: ['InHouseLegal', 'KnowledgeManagement'],
    memo: ['InternalTaskEngine', 'DocumentManagement'],
    regulation: ['AdministrativeGovernance', 'ComplianceEngine'],
  };

  return engineMap[draftType] || [];
}

/**
 * تقييم جودة الصياغة بناءً على استخدام المراجع
 */
export function evaluateDraftQuality(
  draftText: string,
  suggestedReferences: LibraryEntry[]
): {
  score: number;
  feedback: string[];
  recommendations: string[];
} {
  const feedback: string[] = [];
  const recommendations: string[] = [];
  let score = 50; // نقطة البداية

  // 1. التحقق من استخدام المراجع
  const referencesUsed = suggestedReferences.filter(ref =>
    draftText.toLowerCase().includes(ref.title.toLowerCase()) ||
    draftText.toLowerCase().includes(ref.reference_label.toLowerCase())
  ).length;

  if (referencesUsed > 0) {
    score += referencesUsed * 5;
    feedback.push(`✅ تم استخدام ${referencesUsed} من المراجع المقترحة`);
  } else {
    recommendations.push('🔗 يُفضل الإشارة إلى المراجع القانونية في الصياغة');
  }

  // 2. التحقق من الطول والتفصيل
  const wordCount = draftText.split(/\s+/).length;
  if (wordCount < 100) {
    recommendations.push('📝 الصياغة قصيرة جداً. يُفضل إضافة المزيد من التفاصيل');
  } else if (wordCount > 5000) {
    recommendations.push('📝 الصياغة طويلة جداً. يُفضل اختصارها');
  } else {
    score += 10;
    feedback.push('✅ طول الصياغة مناسب');
  }

  // 3. التحقق من الوضوح
  const complexSentences = (draftText.match(/./g) || []).filter(c => c === '(').length;
  if (complexSentences > 10) {
    recommendations.push('📖 بعض الجمل معقدة جداً. يُفضل تبسيط الصياغة');
  } else {
    score += 5;
  }

  return {
    score: Math.min(100, score),
    feedback,
    recommendations,
  };
}
