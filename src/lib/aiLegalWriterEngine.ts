/**
 * AI Legal Writer Engine (M114.AI)
 * وكيل ذكاء اصطناعي مستقل لتحسين الكتابة والصياغة القانونية
 * - تحليل وتحسين النصوص القانونية
 * - اقتراح صياغات بديلة وأكثر دقة
 * - التحقق من الامتثال القانوني
 * - الربط مع المكتبة القانونية والقضائية
 */

export interface LegalDocument {
  id: string;
  content: string;
  language: 'ar' | 'en';
  documentType: 'contract' | 'memo' | 'pleading' | 'appeal' | 'petition';
  jurisdiction: string;
}

export interface WriterSuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  category: 'grammar' | 'legal' | 'compliance' | 'clarity' | 'style';
  linkedSources?: string[]; // مراجع قانونية
}

export interface LegalTemplate {
  id: string;
  name: string;
  nameAr: string;
  type: 'contract' | 'memo' | 'pleading' | 'appeal' | 'petition';
  category: string;
  content: string;
  variables: Record<string, string>;
  relatedLaws: string[];
  linkedEngine: string; // M10, M47, M48, etc.
}

export interface ComplianceCheck {
  id: string;
  documentId: string;
  violationType: 'legal' | 'procedural' | 'formatting' | 'mandatory';
  severity: 'warning' | 'critical';
  detail: string;
  suggestedFix: string;
  relatedArticle: string;
  timestamp: string;
}

// القوالب الجاهزة للعقود والمستندات القانونية
export const LEGAL_TEMPLATES: LegalTemplate[] = [
  {
    id: 'contract-rental-ar',
    name: 'Rental Agreement',
    nameAr: 'عقد الإيجار',
    type: 'contract',
    category: 'Real Estate',
    content: `عقد إيجار
الحمد لله رب العالمين والصلاة والسلام على أشرف الأنبياء والمرسلين

تم الاتفاق بين:
- المؤجر: {{landlord_name}} رقم الهوية: {{landlord_id}}
- المستأجر: {{tenant_name}} رقم الهوية: {{tenant_id}}

على ما يلي:
1. العقار المؤجر: {{property_description}}
2. مدة الإيجار: {{lease_duration}} سنة
3. قيمة الإيجار: {{monthly_rent}} ريال سعودي شهرياً
4. طريقة السداد: {{payment_method}}
5. تاريخ بدء الإيجار: {{start_date}}
6. تاريخ نهاية الإيجار: {{end_date}}

الشروط والأحكام:
- يلتزم المستأجر بدفع قيمة الإيجار في موعدها المحدد
- يحافظ المستأجر على سلامة العقار وعدم تحويره
- لا يجوز تأجير العقار من الباطن إلا بموافقة خطية من المؤجر
- ينتهي العقد بانتهاء المدة المحددة

الإمضاء:
المؤجر: _________________________ التاريخ: _________
المستأجر: _______________________ التاريخ: _________
الشاهد الأول: ______________________ التاريخ: _________
الشاهد الثاني: ______________________ التاريخ: _________`,
    variables: {
      landlord_name: 'اسم المؤجر',
      landlord_id: 'رقم هوية المؤجر',
      tenant_name: 'اسم المستأجر',
      tenant_id: 'رقم هوية المستأجر',
      property_description: 'وصف العقار',
      lease_duration: 'مدة الإيجار',
      monthly_rent: 'قيمة الإيجار الشهري',
      payment_method: 'طريقة السداد',
      start_date: 'تاريخ البدء',
      end_date: 'تاريخ الانتهاء',
    },
    relatedLaws: ['نظام الإيجار السعودي', 'اللائحة الموحدة للعقود'],
    linkedEngine: 'M30-RealEstate',
  },

  {
    id: 'memo-legal-defense-ar',
    name: 'Legal Defense Memo',
    nameAr: 'مذكرة الدفاع القانونية',
    type: 'memo',
    category: 'Litigation',
    content: `مذكرة دفاع قانونية

إلى محكمة: {{court_name}}
القضية رقم: {{case_number}}
الخصم: {{defendant_name}}

تحت رعاية محادثتنا القانونية، نقدم هذه المذكرة الدفاعية:

أولاً: الوقائع:
{{case_facts}}

ثانياً: الأساس القانوني:
{{legal_basis}}

ثالثاً: الدفوع القانونية:
1. {{defense_point_1}}
2. {{defense_point_2}}
3. {{defense_point_3}}

رابعاً: الطلبات:
نطلب من المحكمة الكريمة:
1. {{request_1}}
2. {{request_2}}

وفق القانون والعدالة، نرفع هذه المذكرة.

محامي الدفاع: ____________________
التاريخ: _________
التوقيع: ___________________`,
    variables: {
      court_name: 'اسم المحكمة',
      case_number: 'رقم القضية',
      defendant_name: 'اسم الخصم',
      case_facts: 'وقائع القضية',
      legal_basis: 'الأساس القانوني',
      defense_point_1: 'الدفع الأول',
      defense_point_2: 'الدفع الثاني',
      defense_point_3: 'الدفع الثالث',
      request_1: 'الطلب الأول',
      request_2: 'الطلب الثاني',
    },
    relatedLaws: ['نظام المرافعات الشرعية', 'نظام المحاكم', 'قواعد الإجراءات'],
    linkedEngine: 'M10-SmartCase',
  },

  {
    id: 'pleading-lawsuit-ar',
    name: 'Lawsuit Pleading',
    nameAr: 'صحيفة الدعوى',
    type: 'pleading',
    category: 'Litigation',
    content: `صحيفة دعوى

إلى محكمة: {{court_name}}
درجة القضاء: {{court_degree}}

المدعي: {{plaintiff_name}}
رقم الهوية: {{plaintiff_id}}
الجنسية: {{plaintiff_nationality}}

المدعى عليه: {{defendant_name}}
رقم الهوية: {{defendant_id}}
الجنسية: {{defendant_nationality}}

الموضوع: {{lawsuit_subject}}

نقدم هذه الدعوى:

أولاً: الوقائع:
{{facts_description}}

ثانياً: الحقوق والمطالب:
{{claims}}

ثالثاً: الأساس القانوني:
{{legal_articles}}

رابعاً: الطلبات:
نطلب الحكم بـ: {{judicial_request}}

مع التعويض عن الضرر بمبلغ: {{compensation_amount}}

خامساً: المرفقات:
{{attachments}}

صحة هذا الدعوى معلقة بصحة بياناتها، وأتعهد بتصديقها.

توقيع المدعي:
الاسم: ____________________
التاريخ: _________
التوقيع: ___________________`,
    variables: {
      court_name: 'اسم المحكمة',
      court_degree: 'درجة القضاء',
      plaintiff_name: 'اسم المدعي',
      plaintiff_id: 'رقم هوية المدعي',
      plaintiff_nationality: 'جنسية المدعي',
      defendant_name: 'اسم المدعى عليه',
      defendant_id: 'رقم هوية المدعى عليه',
      defendant_nationality: 'جنسية المدعى عليه',
      lawsuit_subject: 'موضوع الدعوى',
      facts_description: 'وصف الوقائع',
      claims: 'الحقوق والمطالب',
      legal_articles: 'المواد القانونية',
      judicial_request: 'الطلب القضائي',
      compensation_amount: 'مبلغ التعويض',
      attachments: 'المرفقات',
    },
    relatedLaws: ['نظام المرافعات الشرعية', 'نظام الإجراءات الجزائية'],
    linkedEngine: 'M10-SmartCase',
  },

  {
    id: 'appeal-petition-ar',
    name: 'Appeal Petition',
    nameAr: 'صحيفة الاستئناف',
    type: 'appeal',
    category: 'Appellate Litigation',
    content: `صحيفة استئناف

إلى محكمة الاستئناف: {{appeal_court_name}}
القضية الأصلية رقم: {{original_case_number}}
الحكم المستأنف رقم: {{judgment_number}}
تاريخ الحكم: {{judgment_date}}

المستأنف: {{appellant_name}}
المستأنف ضده: {{respondent_name}}

الموضوع: استئناف الحكم الصادر من {{original_court_name}}

يقدم هذه الصحيفة:

أولاً: تفاصيل الحكم المستأنف:
{{judgment_details}}

ثانياً: أسباب الاستئناف:
{{appeal_reasons}}

ثالثاً: الأخطاء القانونية:
{{legal_errors}}

رابعاً: الطلبات:
نطلب من محكمة الاستئناف الكريمة:
1. نقض الحكم المستأنف
2. {{appeal_request_1}}
3. {{appeal_request_2}}

خامساً: المرفقات:
- صورة الحكم المستأنف
- {{attachment_1}}
- {{attachment_2}}

نعلن بأن هذه الوثيقة صادقة في جميع بياناتها.

توقيع المستأنف:
الاسم: ____________________
التاريخ: _________
التوقيع: ___________________`,
    variables: {
      appeal_court_name: 'اسم محكمة الاستئناف',
      original_case_number: 'رقم القضية الأصلية',
      judgment_number: 'رقم الحكم المستأنف',
      judgment_date: 'تاريخ الحكم',
      appellant_name: 'اسم المستأنف',
      respondent_name: 'اسم المستأنف ضده',
      original_court_name: 'اسم المحكمة الأولى',
      judgment_details: 'تفاصيل الحكم',
      appeal_reasons: 'أسباب الاستئناف',
      legal_errors: 'الأخطاء القانونية',
      appeal_request_1: 'الطلب الأول',
      appeal_request_2: 'الطلب الثاني',
      attachment_1: 'المرفق الأول',
      attachment_2: 'المرفق الثاني',
    },
    relatedLaws: ['نظام المرافعات الشرعية', 'نظام الاستئناف'],
    linkedEngine: 'M10-SmartCase',
  },

  {
    id: 'petition-cassation-ar',
    name: 'Cassation Petition',
    nameAr: 'صحيفة النقض',
    type: 'petition',
    category: 'Supreme Litigation',
    content: `صحيفة نقض

إلى ديوان المظالم: {{supreme_court_name}}
القضية الأصلية رقم: {{original_case_number}}
حكم الاستئناف رقم: {{appeal_judgment_number}}
تاريخ حكم الاستئناف: {{appeal_judgment_date}}

الطاعن: {{petitioner_name}}
المطعون ضده: {{respondent_name}}

الموضوع: طلب نقض حكم صادر من {{appeal_court_name}}

يقدم هذا الطلب:

أولاً: حكم الاستئناف المطعون فيه:
{{appeal_judgment_details}}

ثانياً: أسباب الطعن:
{{petition_reasons}}

ثالثاً: المخالفات القانونية:
{{legal_violations}}

رابعاً: الأحكام القضائية الثابتة:
{{established_precedents}}

خامساً: الطلبات:
نطلب من المحكمة العليا:
1. قبول الطعن شكلاً
2. نقض حكم الاستئناف
3. {{petition_request_1}}

سادساً: المستندات المرفقة:
- صورة من حكم الاستئناف
- {{document_1}}
- {{document_2}}

نعلن صحة هذا الطلب وصدقه.

توقيع الطاعن:
الاسم: ____________________
التاريخ: _________
التوقيع: ___________________`,
    variables: {
      supreme_court_name: 'اسم المحكمة العليا',
      original_case_number: 'رقم القضية الأصلية',
      appeal_judgment_number: 'رقم حكم الاستئناف',
      appeal_judgment_date: 'تاريخ حكم الاستئناف',
      petitioner_name: 'اسم الطاعن',
      respondent_name: 'اسم المطعون ضده',
      appeal_court_name: 'اسم محكمة الاستئناف',
      appeal_judgment_details: 'تفاصيل حكم الاستئناف',
      petition_reasons: 'أسباب الطعن',
      legal_violations: 'المخالفات القانونية',
      established_precedents: 'الأحكام القضائية الثابتة',
      petition_request_1: 'الطلب الأساسي',
      document_1: 'المستند الأول',
      document_2: 'المستند الثاني',
    },
    relatedLaws: ['نظام ديوان المظالم', 'نظام الطعن والنقض'],
    linkedEngine: 'M10-SmartCase',
  },
];

// دالة لتحسين النصوص القانونية
export async function improveLegalText(content: string, documentType: string): Promise<WriterSuggestion[]> {
  const suggestions: WriterSuggestion[] = [];

  // تحليلات أساسية محلية (بدون اتصال خارجي)
  const analyzeGrammar = (text: string): WriterSuggestion[] => {
    const localSuggestions: WriterSuggestion[] = [];

    // فحص الأخطاء الشائعة
    if (text.includes('في حال')) {
      localSuggestions.push({
        id: `grammar-${Math.random()}`,
        originalText: 'في حال',
        suggestedText: 'إذا',
        reason: 'الصيغة الحديثة أكثر وضوحاً',
        severity: 'low',
        category: 'grammar',
      });
    }

    if (text.includes('الأشخاص')) {
      localSuggestions.push({
        id: `grammar-${Math.random()}`,
        originalText: 'الأشخاص',
        suggestedText: 'الأطراف',
        reason: 'المصطلح القانوني الأصح',
        severity: 'medium',
        category: 'legal',
      });
    }

    return localSuggestions;
  };

  // فحص الامتثال القانوني
  const analyzeCompliance = (text: string): WriterSuggestion[] => {
    const complianceSuggestions: WriterSuggestion[] = [];

    if (!text.includes('التاريخ') && documentType !== 'contract') {
      complianceSuggestions.push({
        id: `compliance-${Math.random()}`,
        originalText: 'نهاية المستند',
        suggestedText: 'إضافة التاريخ والتوقيع',
        reason: 'المستندات القانونية تتطلب تاريخاً وتوقيعاً',
        severity: 'high',
        category: 'compliance',
      });
    }

    return complianceSuggestions;
  };

  suggestions.push(...analyzeGrammar(content));
  suggestions.push(...analyzeCompliance(content));

  return suggestions;
}

// دالة للتحقق من الامتثال القانوني
export async function checkLegalCompliance(
  documentId: string,
  content: string,
  jurisdiction: string
): Promise<ComplianceCheck[]> {
  const checks: ComplianceCheck[] = [];

  // فحوصات محلية أساسية
  if (!content.includes('الأطراف') && !content.includes('الطرفان')) {
    checks.push({
      id: `check-${Math.random()}`,
      documentId,
      violationType: 'mandatory',
      severity: 'critical',
      detail: 'يجب تحديد أطراف العقد بوضوح',
      suggestedFix: 'أضف بيان واضح للأطراف المتعاقدة في بداية المستند',
      relatedArticle: 'المادة 45 من نظام العقود السعودي',
      timestamp: new Date().toISOString(),
    });
  }

  if (!content.includes('التاريخ')) {
    checks.push({
      id: `check-${Math.random()}`,
      documentId,
      violationType: 'formatting',
      severity: 'critical',
      detail: 'يجب تضمين تاريخ التوقيع',
      suggestedFix: 'أضف التاريخ الهجري والميلادي للعقد',
      relatedArticle: 'المادة 23 من نظام العقود السعودي',
      timestamp: new Date().toISOString(),
    });
  }

  return checks;
}

// دالة لربط المستند مع المكتبة القانونية
export async function linkToLegalLibrary(
  documentId: string,
  content: string,
  relatedCases?: string[]
): Promise<{ linkedCases: string[]; relevantLaws: string[] }> {
  // محاكاة البحث في المكتبة القانونية
  const linkedCases = relatedCases || [];
  const relevantLaws: string[] = [];

  if (content.includes('عقد') || content.includes('اتفاق')) {
    relevantLaws.push('نظام العقود السعودي');
    relevantLaws.push('اللائحة الموحدة للعقود');
  }

  if (content.includes('دعوى') || content.includes('قضية')) {
    relevantLaws.push('نظام المرافعات الشرعية');
    relevantLaws.push('نظام الإجراءات الجزائية');
  }

  if (content.includes('استئناف') || content.includes('نقض')) {
    relevantLaws.push('نظام الاستئناف');
    relevantLaws.push('نظام ديوان المظالم');
  }

  return {
    linkedCases,
    relevantLaws,
  };
}

// دالة لتوليد نسخة محسّنة من المستند
export async function generateImprovedVersion(
  content: string,
  suggestions: WriterSuggestion[]
): Promise<string> {
  let improvedContent = content;

  // تطبيق الاقتراحات تدريجياً
  for (const suggestion of suggestions.filter((s) => s.severity === 'high')) {
    improvedContent = improvedContent.replace(suggestion.originalText, suggestion.suggestedText);
  }

  return improvedContent;
}
