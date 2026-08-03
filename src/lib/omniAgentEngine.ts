import type { OmniSubtask } from './firmTypes';

export interface DecompositionResult {
  intent: string;
  intentLabel: string;
  confidence: number;
  entities: string[];
  subtasks: DecomposedSubtask[];
}

export interface DecomposedSubtask {
  engine_code: string;
  engine_name_ar: string;
  task_title: string;
  task_description: string;
  department: string;
  execution_order: number;
}

interface IntentPattern {
  intent: string;
  intentLabel: string;
  keywords: string[];
  entities: (input: string) => string[];
  subtaskBuilder: (entities: string[], input: string) => DecomposedSubtask[];
}

const patterns: IntentPattern[] = [
  {
    intent: 'project_establishment',
    intentLabel: 'تأسيس مشروع',
    keywords: ['تأسيس', 'إنشاء', 'إقامة', 'تأسيس مصنع', 'تأسيس شركة', 'تأسيس مشروع', 'افتتاح'],
    entities: (input) => {
      const entities: string[] = [];
      const factoryMatch = input.match(/(?:تأسيس|إنشاء|إقامة)\s+(مصنع\s+\S+(?:\s+\S+)?)/);
      if (factoryMatch) entities.push(factoryMatch[1]);
      const companyMatch = input.match(/(?:تأسيس|إنشاء)\s+(شركة\s+\S+(?:\s+\S+)?)/);
      if (companyMatch) entities.push(companyMatch[1]);
      const contractMatch = input.match(/(?:إعداد|تجهيز|تحضير)\s+(عقود?\s+\S+)/);
      if (contractMatch) entities.push(contractMatch[1]);
      if (entities.length === 0) {
        const words = input.split(/\s+/).slice(1, 4).join(' ');
        if (words) entities.push(words);
      }
      return entities;
    },
    subtaskBuilder: (entities, input) => {
      const subtasks: DecomposedSubtask[] = [];
      const projectName = entities[0] || 'المشروع';
      const hasContracts = /عقد|توزيع|مقاولة|توريد/.test(input);

      subtasks.push({
        engine_code: 'M10', engine_name_ar: 'نواة القضية',
        task_title: `تأسيس ملف ${projectName}`,
        task_description: `إنشاء ملف قانوني جديد لـ ${projectName} وتسجيله في النواة`,
        department: 'القسم القانوني', execution_order: 1,
      });
      if (/مصنع|صناع|إنتاج|تصنيع/.test(input)) {
        subtasks.push({
          engine_code: 'M87', engine_name_ar: 'التراخيص الصناعية',
          task_title: 'استخراج التراخيص الصناعية',
          task_description: `التقدم بطلب ترخيص تشغيل صناعي لـ ${projectName}`,
          department: 'الامتثال', execution_order: 2,
        });
      }
      subtasks.push({
        engine_code: 'M54', engine_name_ar: 'المحرك المالي',
        task_title: 'فتح مركز التكلفة المالي',
        task_description: `إنشاء مركز تكلفة مالي لمشروع ${projectName}`,
        department: 'القسم المالي', execution_order: 3,
      });
      if (hasContracts) {
        subtasks.push({
          engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي',
          task_title: 'إعداد العقود',
          task_description: `توليد العقود المطلوبة لـ ${projectName} من القوالب السيادية`,
          department: 'الأرشيف', execution_order: 4,
        });
      }
      return subtasks;
    },
  },
  {
    intent: 'food_safety_project',
    intentLabel: 'مشروع أمن غذائي',
    keywords: ['أمن غذائي', 'سلامة الغذاء', 'غذائي', 'منتجات غذائية', 'تصنيع غذائي'],
    entities: (input) => {
      const entities: string[] = [];
      const match = input.match(/(?:مشروع|تأسيس|إنشاء)\s+(.+?)(?:\s+و|$)/);
      if (match) entities.push(match[1]);
      if (/استيراد|تصدير|توريد/.test(input)) entities.push('استيراد/تصدير');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const projectName = entities[0] || 'الأمن الغذائي';
      return [
        { engine_code: 'M106', engine_name_ar: 'سلامة الغذاء', task_title: 'التحقق من مواصفات سلامة الغذاء', task_description: `فحص مواصفات سلامة الغذاء لمشروع ${projectName}`, department: 'الامتثال', execution_order: 1 },
        { engine_code: 'M90', engine_name_ar: 'الاستيراد والتصدير', task_title: 'فحص شروط الاستيراد والتصدير', task_description: `مراجعة شروط الاستيراد والتصدير للمواد الغذائية`, department: 'التجارة الخارجية', execution_order: 2 },
        { engine_code: 'M51', engine_name_ar: 'محرك المهام الداخلي', task_title: 'فتح تذاكر العمل', task_description: `إنشاء تذاكر عمل لمتابعة مشروع ${projectName}`, department: 'العمليات', execution_order: 3 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'توزيع الحصص المالية', task_description: `توزيع الحصص المالية وفق نموذج Hale & Dorr`, department: 'القسم المالي', execution_order: 4 },
      ];
    },
  },
  {
    intent: 'security_incident',
    intentLabel: 'تحقيق أمني',
    keywords: ['اختراق', 'تهديد', 'أمني', 'سيبراني', 'اختراق', 'نشاط مشبوه', 'هجوم', 'برمجية خبيثة'],
    entities: (input) => {
      const entities: string[] = [];
      const ipMatch = input.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) entities.push(ipMatch[1]);
      if (/اختراق|هجوم/.test(input)) entities.push('محاولة اختراق');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const threatDesc = entities.length > 0 ? entities.join(' — ') : 'تهديد غير محدد';
      return [
        { engine_code: 'M89', engine_name_ar: 'الأمن الخاص وحراسة المنشآت', task_title: 'تذكرة تحقيق أمني حرجة', task_description: `إنشاء تذكرة تحقيق أمني عالية الخطورة: ${threatDesc}`, department: 'الأمن السيبراني', execution_order: 1 },
        { engine_code: 'M51', engine_name_ar: 'محرك المهام الداخلي', task_title: 'توجيه المهمة لفريق الأمن', task_description: 'توجيه تذكرة التحقيق الأمني لفريق الأمن السيبراني', department: 'العمليات', execution_order: 2 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل الحادثة في سجلات التدقيق غير القابلة للتعديل', department: 'التنسيق المركزي', execution_order: 3 },
      ];
    },
  },
  {
    intent: 'board_resolution',
    intentLabel: 'تنفيذ قرار مجلس الإدارة',
    keywords: ['قرار', 'مجلس الإدارة', 'قرار إداري', 'تفكيك القرار'],
    entities: (input) => {
      const entities: string[] = [];
      const match = input.match(/قرار\s+(?:مجلس الإدارة\s+)?(?:رقم\s+)?(\S+)/);
      if (match) entities.push(`قرار رقم ${match[1]}`);
      return entities;
    },
    subtaskBuilder: (entities) => {
      const resLabel = entities[0] || 'القرار';
      return [
        { engine_code: 'M49', engine_name_ar: 'محرك مجلس الإدارة', task_title: `تفكيك ${resLabel}`, task_description: `تفكيك ${resLabel} إلى بطاقات مهام تنفيذية`, department: 'الإدارة العليا', execution_order: 1 },
        { engine_code: 'M51', engine_name_ar: 'محرك المهام الداخلي', task_title: 'توزيع المهام على المنفذين', task_description: `توجيه بطاقات المهام للمنفذين المعنيين`, department: 'العمليات', execution_order: 2 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل التنفيذ', task_description: `تسجيل تنفيذ ${resLabel} في سجل التدقيق`, department: 'التنسيق المركزي', execution_order: 3 },
      ];
    },
  },
  {
    intent: 'document_amendment',
    intentLabel: 'تعديل مستند',
    keywords: ['أضف', 'شرط', 'تعديل', 'عدل', 'لخص', 'ملخص', 'صفحة', 'مستند', 'عقد'],
    entities: (input) => {
      const entities: string[] = [];
      const clauseMatch = input.match(/(?:أضف|إضافة)\s+(شرط\s+\S+)/);
      if (clauseMatch) entities.push(clauseMatch[1]);
      if (/لخص|ملخص/.test(input)) entities.push('توليد ملخص');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const action = entities[0] || 'التعديل المطلوب';
      return [
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: `تنفيذ: ${action}`, task_description: `تنفيذ ${action} داخل المستند`, department: 'الأرشيف', execution_order: 1 },
        { engine_code: 'M11', engine_name_ar: 'المكتبة القانونية', task_title: 'مراجعة قانونية', task_description: 'مراجعة التعديل مقابل التشريعات السارية', department: 'البحث القانوني', execution_order: 2 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل التعديل في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: 3 },
      ];
    },
  },
  {
    intent: 'case_management',
    intentLabel: 'إدارة قضية',
    keywords: ['قضية', 'دعوى', 'مذكرة', 'دفوع', 'مرافعة', 'محكمة', 'جلسة'],
    entities: (input) => {
      const entities: string[] = [];
      const caseMatch = input.match(/(?:قضية|دعوى)\s+(\S+)/);
      if (caseMatch) entities.push(`قضية ${caseMatch[1]}`);
      if (/مذكرة|دفوع/.test(input)) entities.push('مذكرة قانونية');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const caseLabel = entities[0] || 'القضية';
      return [
        { engine_code: 'M10', engine_name_ar: 'نواة القضية', task_title: `فتح ${caseLabel}`, task_description: `إنشاء ملف ${caseLabel} في النواة`, department: 'القسم القانوني', execution_order: 1 },
        { engine_code: 'M10', engine_name_ar: 'نواة القضية الذكية', task_title: 'تصنيف القضية', task_description: `تصنيف وتقييم ${caseLabel} في النواة الذكية`, department: 'التحليل القانوني', execution_order: 2 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'إعداد المذكرة', task_description: 'توليد مذكرة الدفاع من القوالب', department: 'الأرشيف', execution_order: 3 },
      ];
    },
  },
  {
    intent: 'financial_operation',
    intentLabel: 'عملية مالية',
    keywords: ['أتعاب', 'فوترة', 'ربح', 'توزيع', 'محاسبة', 'قيود', 'ميزانية', 'تكلفة', 'صرف'],
    entities: (input) => {
      const entities: string[] = [];
      if (/أتعاب|فوترة/.test(input)) entities.push('أتعاب');
      if (/ربح|توزيع/.test(input)) entities.push('توزيع أرباح');
      if (/قيود|محاسبة/.test(input)) entities.push('قيود محاسبية');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const ops = entities.length > 0 ? entities : ['عملية مالية'];
      const subtasks: DecomposedSubtask[] = [];
      if (ops.includes('أتعاب')) {
        subtasks.push({ engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'حساب الأتعاب', task_description: 'حساب الأتعاب وفقاً لنموذج Hale & Dorr', department: 'القسم المالي', execution_order: 1 });
      }
      if (ops.includes('توزيع أرباح')) {
        subtasks.push({ engine_code: 'M78', engine_name_ar: 'تعويضات الشركاء', task_title: 'توزيع أرباح الشركاء', task_description: 'توزيع الأرباح وفق نموذج Hale & Dorr', department: 'الشراكة', execution_order: 2 });
      }
      if (ops.includes('قيود محاسبية')) {
        subtasks.push({ engine_code: 'M55', engine_name_ar: 'الدورة المحاسبية', task_title: 'تسجيل القيود', task_description: 'تسجيل القيود المحاسبية في الدورة', department: 'المحاسبة', execution_order: 3 });
      }
      if (subtasks.length === 0) {
        subtasks.push({ engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تنفيذ العملية المالية', task_description: 'تنفيذ العملية المالية المطلوبة', department: 'القسم المالي', execution_order: 1 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العملية المالية في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'hr_operation',
    intentLabel: 'عملية موارد بشرية',
    keywords: ['موظف', 'توظيف', 'تعيين', 'راتب', 'إجازة', 'تقييم', 'كوادر', 'موظفين'],
    entities: (input) => {
      const entities: string[] = [];
      const nameMatch = input.match(/(?:توظيف|تعيين)\s+(.+?)(?:\s+و|$)/);
      if (nameMatch) entities.push(nameMatch[1]);
      if (/راتب|أجر/.test(input)) entities.push('راتب');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const person = entities[0] || 'الموظف';
      return [
        { engine_code: 'M77', engine_name_ar: 'الموارد البشرية', task_title: `فتح ملف ${person}`, task_description: `إنشاء ملف موظف لـ ${person}`, department: 'الموارد البشرية', execution_order: 1 },
        { engine_code: 'M51', engine_name_ar: 'محرك المهام الداخلي', task_title: 'توجيه مهام الإدخال', task_description: 'توجيه مهام إدخال البيانات للقسم المعني', department: 'العمليات', execution_order: 2 },
      ];
    },
  },
  {
    intent: 'marketing_campaign',
    intentLabel: 'حملة تسويقية',
    keywords: ['إعلان', 'تسويق', 'حملة إعلانية', 'رعاية', 'مؤثر', 'حملة رقمية', 'دعاية'],
    entities: (input) => {
      const entities: string[] = [];
      const campaignMatch = input.match(/(?:حملة|إعلان)\s+(\S+(?:\s+\S+)?)/);
      if (campaignMatch) entities.push(campaignMatch[1]);
      if (/مؤثر|إنفلونسر/.test(input)) entities.push('مؤثر');
      if (/رعاية|كفيل/.test(input)) entities.push('رعاية');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const campaignName = entities[0] || 'الحملة';
      return [
        { engine_code: 'M93', engine_name_ar: 'التسويق والإعلان', task_title: `تسجيل ترخيص حملة ${campaignName}`, task_description: `استخراج الترخيص الإعلاني لحملة ${campaignName} وفحص حماية المستهلك`, department: 'التسويق', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'توليد عقود الرعاية', task_description: `توليد عقود الرعاية والمؤثرين للحملة`, department: 'الأرشيف', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل ميزانية الحملة', task_description: `فتح مركز تكلفة لميزانية حملة ${campaignName}`, department: 'القسم المالي', execution_order: 3 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل الحملة في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: 4 },
      ];
    },
  },
  {
    intent: 'automotive_trade',
    intentLabel: 'تجارة سيارات',
    keywords: ['سيارة', 'سيارات', 'معرض سيارات', 'تأجير سيارات', 'أسطول', 'تأجير تمويلي', 'تاجير', 'مركبة', 'مركبات'],
    entities: (input) => {
      const entities: string[] = [];
      const dealerMatch = input.match(/(?:معرض|شركة)\s+(\S+(?:\s+\S+)?)/);
      if (dealerMatch) entities.push(dealerMatch[1]);
      if (/تأجير|إيجار/.test(input)) entities.push('تأجير');
      if (/أسطول|أساطيل/.test(input)) entities.push('أسطول');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const dealerName = entities[0] || 'المعرض';
      return [
        { engine_code: 'M94', engine_name_ar: 'تجارة السيارات', task_title: `تسجيل ترخيص ${dealerName}`, task_description: `استخراج ترخيص معرض السيارات وتسجيل العقود`, department: 'السيارات', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'توليد عقود البيع والتأجير', task_description: `توليد عقود البيع والتأجير من القوالب السيادية`, department: 'الأرشيف', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل الأقساط', task_description: `تسجيل الأقساط المالية وفوترة العقود`, department: 'القسم المالي', execution_order: 3 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العملية في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: 4 },
      ];
    },
  },
  {
    intent: 'automotive_manufacturing',
    intentLabel: 'تصنيع سيارات',
    keywords: ['تصنيع سيارات', 'تجميع سيارات', 'تجميع مركبات', 'مصنع سيارات', 'CKD', 'SKD', 'مكون محلي', 'صناعة سيارات'],
    entities: (input) => {
      const entities: string[] = [];
      const factoryMatch = input.match(/(?:مصنع|تصنيع|تجميع)\s+(\S+(?:\s+\S+)?)/);
      if (factoryMatch) entities.push(factoryMatch[1]);
      if (/CKD|SKD|تجميع/.test(input)) entities.push('تجميع');
      if (/مكون محلي|محتوى محلي/.test(input)) entities.push('مكون محلي');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const factoryName = entities[0] || 'المصنع';
      return [
        { engine_code: 'M95', engine_name_ar: 'تصنيع السيارات', task_title: `ترخيص تجميع ${factoryName}`, task_description: `استخراج ترخيص التجميع وتسجيل نسبة المكون المحلي`, department: 'التصنيع', execution_order: 1 },
        { engine_code: 'M80', engine_name_ar: 'محرك الملكية الفكرية', task_title: 'حماية التصميمات الهندسية', task_description: `تسجيل براءات التصميم ونقل التكنولوجيا`, department: 'الملكية الفكرية', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل تكاليف R&D', task_description: `فتح مركز تكلفة لتكاليف البحث والتطوير والإتاوات`, department: 'القسم المالي', execution_order: 3 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل المشروع التصنيعي في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: 4 },
      ];
    },
  },
  {
    intent: 'chemicals_production',
    intentLabel: 'إنتاج كيماوي',
    keywords: ['أسمدة', 'كيماوي', 'كيماويات', 'بتروكيماوي', 'بتروكيماويات', 'أمونيا', 'يوريا', 'لقيم', 'مواد خطرة', 'إنتاج كيميائي'],
    entities: (input) => {
      const entities: string[] = [];
      const facilityMatch = input.match(/(?:مصنع|منشأة|إنتاج)\s+(\S+(?:\s+\S+)?)/);
      if (facilityMatch) entities.push(facilityMatch[1]);
      if (/أسمدة|سماد/.test(input)) entities.push('أسمدة');
      if (/بتروكيماوي/.test(input)) entities.push('بتروكيماوي');
      if (/خطرة|خطر/.test(input)) entities.push('مواد خطرة');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const facilityName = entities[0] || 'المنشأة';
      const hasHazmat = entities.includes('مواد خطرة');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M96', engine_name_ar: 'الأسمدة والكيماويات', task_title: `ترخيص إنتاج ${facilityName}`, task_description: `استخراج ترخيص الإنتاج وتسجيل طاقة الإنتاج`, department: 'الكيماويات', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'توليد عقود اللقيم', task_description: `توليد عقود توريد اللقيم من القوالب`, department: 'الأرشيف', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل تكاليف اللقيم', task_description: `فتح مركز تكلفة لتكاليف اللقيم والإنتاج`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (hasHazmat) {
        subtasks.push({ engine_code: 'M91', engine_name_ar: 'الصحة والسلامة', task_title: 'خطة الطوارئ للمواد الخطرة', task_description: `إعداد خطة استجابة للطوارئ للمواد الخطرة في ${facilityName}`, department: 'الصحة والسلامة', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل المشروع في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'foreign_residency',
    intentLabel: 'شؤون أجانب',
    keywords: ['أجنبي', 'أجانب', 'تصريح عمل', 'إقامة', 'إقامة مستثمر', 'جواز سفر', 'كفيل', 'ترحيل', 'خبير أجنبي', 'هجرة', 'قنصلي'],
    entities: (input) => {
      const entities: string[] = [];
      const nameMatch = input.match(/(?:تصريح|إقامة|توظيف|تعيين|خبير)\s+(\S+(?:\s+\S+)?)/);
      if (nameMatch) entities.push(nameMatch[1]);
      if (/تصريح عمل|عمل/.test(input)) entities.push('تصريح عمل');
      if (/إقامة مستثمر|استثمار/.test(input)) entities.push('إقامة مستثمر');
      if (/ترحيل/.test(input)) entities.push('ترحيل');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const personName = entities[0] || 'الأجنبي';
      const isDeportation = entities.includes('ترحيل');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M97', engine_name_ar: 'شؤون الأجانب', task_title: `فتح ملف ${personName}`, task_description: `تسجيل تصريح العمل أو الإقامة لـ ${personName}`, department: 'الهجرة', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'توليد عقد العمل', task_description: `توليد عقد العمل للخبير الأجنبي من القوالب`, department: 'الأرشيف', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل الرسوم والاستقطاعات', task_description: `تسجيل الرسوم القنصلية والاستقطاعات الضريبية`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (isDeportation) {
        subtasks.push({ engine_code: 'M10', engine_name_ar: 'نواة القضية', task_title: 'فتح ملف ترحيل', task_description: `إنشاء ملف قانوني لإجراء الترحيل`, department: 'القسم القانوني', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل الإجراء في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'capital_markets',
    intentLabel: 'أسواق المال',
    keywords: ['صندوق استثمار', 'صندوق', 'بورصة', 'أسواق المال', 'اكتتاب', 'إدراج', 'محفظة', 'صانع سوق', 'توزيعات', 'AML', 'غسل أموال'],
    entities: (input) => {
      const entities: string[] = [];
      const fundMatch = input.match(/(?:صندوق|محفظة)\s+(\S+(?:\s+\S+)?)/);
      if (fundMatch) entities.push(fundMatch[1]);
      if (/اكتتاب|إدراج/.test(input)) entities.push('اكتتاب');
      if (/AML|غسل أموال/.test(input)) entities.push('AML');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const fundName = entities[0] || 'الصندوق';
      return [
        { engine_code: 'M98', engine_name_ar: 'أسواق المال', task_title: `ترخيص ${fundName}`, task_description: `تسجيل ترخيص الصندوق والتحقق من امتثال AML/KYC`, department: 'أسواق المال', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'توليد نشرة الاكتتاب', task_description: `توليد نشرة الاكتتاب والإفصاحات من القوالب`, department: 'الأرشيف', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل التوزيعات', task_description: `تسجيل مبلغ التوزيعات والحفظ المركزي`, department: 'القسم المالي', execution_order: 3 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العملية في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: 4 },
      ];
    },
  },
  {
    intent: 'shopping_mall_lease',
    intentLabel: 'إيجار مول',
    keywords: ['مول', 'مول تجاري', 'مركز تجاري', 'إيجار تجاري', 'عقد إيجار', 'كبار المستأجرين', 'anchor', 'نسبة مبيعات', 'رسوم CAM', 'إخلاء', 'وحدة تجارية', 'مستأجر'],
    entities: (input) => {
      const entities: string[] = [];
      const mallMatch = input.match(/(?:مول|مركز تجاري)\s+(\S+(?:\s+\S+)?)/);
      if (mallMatch) entities.push(mallMatch[1]);
      const tenantMatch = input.match(/(?:مستأجر|متجر)\s+(\S+(?:\s+\S+)?)/);
      if (tenantMatch) entities.push(tenantMatch[1]);
      if (/إخلاء|طرد/.test(input)) entities.push('إخلاء');
      if (/نسبة|مبيعات/.test(input)) entities.push('نسبة مبيعات');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const mallName = entities[0] || 'المول';
      const isEviction = entities.includes('إخلاء');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M99', engine_name_ar: 'إدارة المولات والإيجارات', task_title: `تسجيل عقد إيجار ${mallName}`, task_description: `إنشاء ملف عقد الإيجار التجاري في ${mallName}`, department: 'العقارات التجارية', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'توليد عقد الإيجار', task_description: `توليد عقد الإيجار من القوالب السيادية`, department: 'الأرشيف', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'فتح مركز تكلفة الوحدة', task_description: `إنشاء مركز تكلفة لتحصيل الإيجار ورسوم CAM`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (isEviction) {
        subtasks.push({ engine_code: 'M10', engine_name_ar: 'نواة القضية', task_title: 'فتح ملف إخلاء', task_description: `إنشاء ملف قانوني لإجراء الإخلاء`, department: 'القسم القانوني', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العقد في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'library_archive',
    intentLabel: 'مكتبة وأرشيف',
    keywords: ['مكتبة', 'مكتبة عامة', 'مكتبة خاصة', 'أرشيف', 'إيداع قانوني', 'ISBN', 'ISSN', 'مخطوط', 'حقوق مؤلف', 'اقتناء', 'اشتراك رقمي', 'تصنيف', 'ديوي'],
    entities: (input) => {
      const entities: string[] = [];
      const libMatch = input.match(/(?:مكتبة|أرشيف)\s+(\S+(?:\s+\S+)?)/);
      if (libMatch) entities.push(libMatch[1]);
      if (/ISBN|ISSN/.test(input)) entities.push('ترقيم دولي');
      if (/مخطوط|نادر/.test(input)) entities.push('مخطوط نادر');
      if (/تعدي|قرصنة/.test(input)) entities.push('تعدي حقوق');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const libName = entities[0] || 'المكتبة';
      const isInfringement = entities.includes('تعدي حقوق');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M100', engine_name_ar: 'المكتبات والأرشيف', task_title: `تسجيل ملف ${libName}`, task_description: `إنشاء ملف اقتناء أو إيداع قانوني في ${libName}`, department: 'المعرفة والأرشيف', execution_order: 1 },
        { engine_code: 'M80', engine_name_ar: 'محرك الملكية الفكرية', task_title: 'حماية حقوق المؤلف', task_description: `تسجيل حقوق المؤلف والحقوق المجاورة`, department: 'الملكية الفكرية', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل تكاليف الاقتناء', task_description: `فتح مركز تكلفة لرسوم الاقتناء والاشتراكات`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (isInfringement) {
        subtasks.push({ engine_code: 'M10', engine_name_ar: 'نواة القضية', task_title: 'فتح قضية تعدي', task_description: `إنشاء ملف قانوني للتعدي على حقوق المؤلف`, department: 'القسم القانوني', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العملية في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'maintenance_warranty',
    intentLabel: 'صيانة وضمان',
    keywords: ['صيانة', 'صيانة وقائية', 'عطل', 'بلاغ عطل', 'ضمان', 'مطالبة ضمان', 'SLA', 'اتفاقية مستوى خدمة', 'تشغيل وصيانة', 'O&M', 'قطع غيار', 'فني', 'مرفق'],
    entities: (input) => {
      const entities: string[] = [];
      const facilityMatch = input.match(/(?:مرفق|مبنى|مصنع|مستشفى)\s+(\S+(?:\s+\S+)?)/);
      if (facilityMatch) entities.push(facilityMatch[1]);
      if (/ضمان/.test(input)) entities.push('ضمان');
      if (/SLA|اتفاقية مستوى/.test(input)) entities.push('SLA');
      if (/تنبؤي|تنبؤ|استباقي/.test(input)) entities.push('صيانة تنبؤية');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const facilityName = entities[0] || 'المرفق';
      const isWarranty = entities.includes('ضمان');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M101', engine_name_ar: 'الصيانة والتشغيل', task_title: `فتح تذكرة صيانة ${facilityName}`, task_description: `إنشاء تذكرة صيانة أو بلاغ عطل لـ ${facilityName}`, department: 'الصيانة والتشغيل', execution_order: 1 },
        { engine_code: 'M51', engine_name_ar: 'محرك المهام الداخلي', task_title: 'إسناد للفني المختص', task_description: `توجيه تذكرة العمل للفني المعني`, department: 'العمليات', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل تكاليف الصيانة', task_description: `فتح مركز تكلفة لقطع الغيار وأجور الفنيين`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (isWarranty) {
        subtasks.push({ engine_code: 'M88', engine_name_ar: 'التجارة الداخلية وحماية المستهلك', task_title: 'فحص مطالبة الضمان', task_description: `مراجعة مطالبة الضمان مقابل قوانين حماية المستهلك`, department: 'التجارة الداخلية', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العملية في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'interdepartmental_bridge',
    intentLabel: 'تكامل بيني',
    keywords: ['تكامل', 'تناغم', 'جسر بيني', 'نبضة تشغيلية', 'تنسيق بين الإدارات', 'تفعيل عنقودي', 'مؤشر أداء', 'تعارض قطاعي', 'مزامنة', 'ربط الإدارات'],
    entities: (input) => {
      const entities: string[] = [];
      const deptMatch = input.match(/(?:من|بين)\s+(القسم القانوني|القسم المالي|الموارد البشرية|العمليات|الامتثال)/);
      if (deptMatch) entities.push(deptMatch[1]);
      if (/تعارض|تضارب/.test(input)) entities.push('تعارض');
      if (/مؤشر|KPI/.test(input)) entities.push('مؤشر أداء');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const dept = entities[0] || 'الإدارات';
      const isConflict = entities.includes('تعارض');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M102', engine_name_ar: 'التكامل والتناغم المؤسسي', task_title: `تفعيل جسر ${dept}`, task_description: `إنشاء جسر بيني لتنسيق التدفق بين الإدارات`, department: 'التكامل الإداري', execution_order: 1 },
        { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تنسيق التنشيط العنقودي', task_description: `تنسيق استدعاء المحركات القطاعية المختصة بالتوازي`, department: 'التنسيق المركزي', execution_order: 2 },
      ];
      if (isConflict) {
        subtasks.push({ engine_code: 'M102', engine_name_ar: 'التكامل والتناغم المؤسسي', task_title: 'تنبيه تعارض قطاعي', task_description: `رصد وتنبيه التعارض بين القطاعات`, department: 'التكامل الإداري', execution_order: 3 });
      }
      subtasks.push({ engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'أرشفة القرارات المشتركة', task_description: `حفظ القرارات المنسقة بتشفير AES-256`, department: 'الأرشيف', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'quarry_mining',
    intentLabel: 'محاجر وتعدين',
    keywords: ['محجر', 'منجم', 'تعدين', 'استكشاف', 'امتياز تعديني', 'إتاوة', 'تفجير', 'رخام', 'حجر جيري', 'رمال', 'جرانيت', 'خامات معدنية', 'ثروة معدنية'],
    entities: (input) => {
      const entities: string[] = [];
      const quarryMatch = input.match(/(?:محجر|منجم)\s+(\S+(?:\s+\S+)?)/);
      if (quarryMatch) entities.push(quarryMatch[1]);
      if (/إتاوة|royalty/.test(input)) entities.push('إتاوة');
      if (/تفجير/.test(input)) entities.push('تفجير');
      if (/بيئي|بيئة/.test(input)) entities.push('تقييم بيئي');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const quarryName = entities[0] || 'المحجر';
      const hasBlasting = entities.includes('تفجير');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M103', engine_name_ar: 'المحاجر والتعدين', task_title: `تسجيل ترخيص ${quarryName}`, task_description: `استخراج ترخيص استكشاف أو استغلال لـ ${quarryName}`, department: 'التعدين', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'توليد عقد الامتياز', task_description: `توليد عقد الامتياز أو التوريد من القوالب`, department: 'الأرشيف', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تسجيل الإتاوات', task_description: `فتح مركز تكلفة لتحصيل الإتاوات الحكومية`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (hasBlasting) {
        subtasks.push({ engine_code: 'M91', engine_name_ar: 'الصحة والسلامة', task_title: 'مراجعة تصريح التفجير', task_description: `فحص اشتراطات السلامة لعمليات التفجير`, department: 'الصحة والسلامة', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل المشروع في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'ceramics_manufacturing',
    intentLabel: 'سيراميك وخزف',
    keywords: ['سيراميك', 'بورسلين', 'خزف', 'بلاط', 'طفلة', 'فلسبار', 'تصنيع سيراميك', 'مصنع سيراميك', 'خزفيات', 'بورسلين', 'تصدير سيراميك'],
    entities: (input) => {
      const entities: string[] = [];
      const factoryMatch = input.match(/(?:مصنع|تصنيع)\s+(\S+(?:\s+\S+)?)/);
      if (factoryMatch) entities.push(factoryMatch[1]);
      if (/تصدير|تصدير/.test(input)) entities.push('تصدير');
      if (/نقش|تصميم|ابتكار/.test(input)) entities.push('حماية تصميم');
      if (/طاقة|غاز/.test(input)) entities.push('عقد طاقة');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const factoryName = entities[0] || 'المصنع';
      const isExport = entities.includes('تصدير');
      const isDesign = entities.includes('حماية تصميم');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M104', engine_name_ar: 'صناعة السيراميك', task_title: `تسجيل ترخيص ${factoryName}`, task_description: `استخراج ترخيص المصنع وتسجيل خط الإنتاج`, department: 'السيراميك', execution_order: 1 },
        { engine_code: 'M103', engine_name_ar: 'المحاجر والتعدين', task_title: 'توريد الخامات', task_description: `تأمين توريد الطفلة والفلسبار من المحاجر المرخصة`, department: 'التعدين', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'فتح مركز التكلفة', task_description: `فتح مركز تكلفة للطاقة والخامات والإنتاج`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (isDesign) {
        subtasks.push({ engine_code: 'M80', engine_name_ar: 'محرك الملكية الفكرية', task_title: 'حماية نقوش التصميم', task_description: `تسجيل براءات التصميم الهندسي للبلاطات`, department: 'الملكية الفكرية', execution_order: 4 });
      }
      if (isExport) {
        subtasks.push({ engine_code: 'M90', engine_name_ar: 'الاستيراد والتصدير', task_title: 'تجهيز بوالص التصدير', task_description: `إعداد الاعتمادات المستندية وبوالص الشحن للتصدير`, department: 'التجارة الخارجية', execution_order: 5 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل المشروع في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'arbitration_hub',
    intentLabel: 'تحكيم تجاري',
    keywords: ['تحكيم', 'محكم', 'غرفة تحكيم', 'فض نزاع', 'ODR', 'تحكيم دولي', 'تحكيم تجاري', 'هيئة تحكيم', 'حكم تحكيم', 'مذكرة', 'غرفة بيانات', 'تنفيذ حكم'],
    entities: (input) => {
      const entities: string[] = [];
      const claimantMatch = input.match(/(?:المدعي|طالب)\s+(\S+(?:\s+\S+)?)/);
      if (claimantMatch) entities.push(claimantMatch[1]);
      if (/دولي|international/.test(input)) entities.push('دولي');
      if (/تنفيذ|enforcement/.test(input)) entities.push('تنفيذ');
      if (/وساطة|mediation/.test(input)) entities.push('وساطة');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const claimant = entities[0] || 'المدعي';
      const isEnforcement = entities.includes('تنفيذ');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M105', engine_name_ar: 'منصة التحكيم', task_title: `إيداع طلب التحكيم`, task_description: `فتح ملف تحكيم وغرفة بيانات مشفرة لـ ${claimant}`, department: 'التحكيم', execution_order: 1 },
        { engine_code: 'M10', engine_name_ar: 'نواة القضية', task_title: 'تأسيس ملف النزاع', task_description: `إنشاء ملف قضية وإدراج الأطراف`, department: 'القسم القانوني', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'تقدير أتعاب التحكيم', task_description: `حساب أتعاب المحكمين والرسوم الإدارية`, department: 'القسم المالي', execution_order: 3 },
        { engine_code: 'M109', engine_name_ar: 'بوابة الهوية البيومترية', task_title: 'توقيع بيومتري للحكم', task_description: `تذييل حكم التحكيم بالتوقيع البيومتري السيادي`, department: 'الهوية والأمن', execution_order: 4 },
      ];
      if (isEnforcement) {
        subtasks.push({ engine_code: 'M9', engine_name_ar: 'التنفيذ القضائي', task_title: 'تنفيذ حكم التحكيم', task_description: `تذييل الحكم بالصيغة التنفيذية`, department: 'القسم القانوني', execution_order: 5 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل التحكيم في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'food_security',
    intentLabel: 'أمن غذائي',
    keywords: ['غذاء', 'غذائي', 'سلامة الغذاء', 'HACCP', 'ISO 22000', 'قمح', 'زيوت', 'لحوم', 'سحب منتج', 'حجر زراعي', 'حجر بيطري', 'شحنة غذائية', 'تصنيع غذائي', 'سلاسل الإمداد', 'صلاحية', 'ترخيص غذائي'],
    entities: (input) => {
      const entities: string[] = [];
      const productMatch = input.match(/(?:شحنة|منتج|سلعة)\s+(\S+(?:\s+\S+)?)/);
      if (productMatch) entities.push(productMatch[1]);
      if (/سحب|recall/.test(input)) entities.push('سحب منتج');
      if (/حجر|quarantine/.test(input)) entities.push('حجر');
      if (/HACCP|ISO/.test(input)) entities.push('امتثال');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const product = entities[0] || 'المنتج';
      const isRecall = entities.includes('سحب منتج');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M106', engine_name_ar: 'الأمن الغذائي', task_title: `تسجيل ملف ${product}`, task_description: `مراجعة اشتراطات سلامة الغذاء لعقد التوريد`, department: 'الأمن الغذائي', execution_order: 1 },
        { engine_code: 'M90', engine_name_ar: 'الاستيراد والتصدير', task_title: 'الإفراج الجمركي', task_description: `مطابقة الأوراق الجمركية والحجر الزراعي`, department: 'التجارة الخارجية', execution_order: 2 },
        { engine_code: 'M54', engine_name_ar: 'المحرك المالي', task_title: 'فتح مركز التكلفة', task_description: `إدارة الاعتمادات المستندية للسلع الاستراتيجية`, department: 'القسم المالي', execution_order: 3 },
      ];
      if (isRecall) {
        subtasks.push({ engine_code: 'M10', engine_name_ar: 'نواة القضية', task_title: 'فتح ملف سحب المنتج', task_description: `إنشاء ملف قانوني لإجراءات سحب المنتج`, department: 'القسم القانوني', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العملية في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'iot_bridge',
    intentLabel: 'إنترنت أشياء',
    keywords: ['حساس', 'إنترنت الأشياء', 'IoT', 'كاميرا مراقبة', 'GPS', 'تتبع جغرافي', 'رؤية حاسوبية', 'تنبيه استباقي', 'نبض الخادم', 'MQTT', 'تليمتري', 'حساس حرارة', 'حساس رطوبة'],
    entities: (input) => {
      const entities: string[] = [];
      const deviceMatch = input.match(/(?:جهاز|حساس|كاميرا)\s+(\S+(?:\s+\S+)?)/);
      if (deviceMatch) entities.push(deviceMatch[1]);
      if (/تنبيه|alert/.test(input)) entities.push('تنبيه');
      if (/حرارة|temperature/.test(input)) entities.push('حرارة');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const device = entities[0] || 'الجهاز';
      const isAlert = entities.includes('تنبيه');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M107', engine_name_ar: 'إنترنت الأشياء', task_title: `تسجيل ${device}`, task_description: `ربط جهاز ميداني وتفعيل المراقبة اللحظية`, department: 'إنترنت الأشياء', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'أرشفة بيانات الحساس', task_description: `حفظ البيانات التليمترية بتشفير AES-256`, department: 'الأرشيف', execution_order: 2 },
      ];
      if (isAlert) {
        subtasks.push({ engine_code: 'M91', engine_name_ar: 'الصحة والسلامة', task_title: 'توثيق الحادث', task_description: `إنشاء تقرير سلامة مهنية للتنبيه الميداني`, department: 'الصحة والسلامة', execution_order: 3 });
        subtasks.push({ engine_code: 'M51', engine_name_ar: 'محرك المهام الداخلي', task_title: 'فتح تذكرة CRITICAL', task_description: `إنشاء تذكرة عاجلة للاستجابة`, department: 'العمليات', execution_order: 4 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل الحدث الميداني في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'disaster_recovery',
    intentLabel: 'تعافي كوارث',
    keywords: ['كارثة', 'تعافي', 'استمرارية', 'failover', 'غرفة حرب', 'خوادم الظل', 'DDoS', 'اختراق', 'تبديل آلي', 'طوارئ', 'air-gapped', 'BCP', 'disaster recovery'],
    entities: (input) => {
      const entities: string[] = [];
      if (/DDoS|هجوم/.test(input)) entities.push('هجوم سيبراني');
      if (/غرفة حرب|war.?room/.test(input)) entities.push('غرفة حرب');
      if (/تبديل|failover/.test(input)) entities.push('تبديل');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const isCyber = entities.includes('هجوم سيبراني');
      const isWarRoom = entities.includes('غرفة حرب');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M108', engine_name_ar: 'التعافي من الكوارث', task_title: 'تنشيط بروتوكول الطوارئ', task_description: `تفعيل التبديل الآلي لخوادم الظل`, department: 'البنية التحتية', execution_order: 1 },
      ];
      if (isCyber) {
        subtasks.push({ engine_code: 'M14', engine_name_ar: 'الأمن السيبراني', task_title: 'عزل الهجوم', task_description: `تغيير مفاتيح التشفير وعزل الأجزاء المصابة`, department: 'الأمن السيبراني', execution_order: 2 });
      }
      if (isWarRoom) {
        subtasks.push({ engine_code: 'M108', engine_name_ar: 'التعافي من الكوارث', task_title: 'تنشيط غرفة الحرب', task_description: `إغلاق منافذ APIs الخارجية وتفعيل التشغيل المغلق`, department: 'البنية التحتية', execution_order: 3 });
      }
      subtasks.push({ engine_code: 'M52', engine_name_ar: 'البريد السيادي', task_title: 'إرسال إشعار أحمر', task_description: `إبلاغ الإدارة بتفعيل بروتوكول الطوارئ`, department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      subtasks.push({ engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'مزامنة سجلات التدقيق', task_description: `نقل وتثبيت سجلات التدقيق للمستودع السيادي`, department: 'الأرشيف', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
  {
    intent: 'biometric_gateway',
    intentLabel: 'توقيع بيومتري',
    keywords: ['بصمة', 'بيومتري', 'توقيع بيومتري', 'تحقق الهوية', 'liveness', 'اختبار حيوية', 'SHA3', 'ختم سيادي', 'هوية رقمية', 'مصادقة بيومترية', 'deepfake', 'وجه', 'صوت'],
    entities: (input) => {
      const entities: string[] = [];
      const nameMatch = input.match(/(?:المدير|الشريك|المحامي|توثيق|تحقق)\s+(\S+(?:\s+\S+)?)/);
      if (nameMatch) entities.push(nameMatch[1]);
      if (/توقيع|signing/.test(input)) entities.push('توقيع');
      if (/حيوية|liveness/.test(input)) entities.push('حيوية');
      return entities;
    },
    subtaskBuilder: (entities) => {
      const subject = entities[0] || 'المستخدم';
      const isSigning = entities.includes('توقيع');
      const subtasks: DecomposedSubtask[] = [
        { engine_code: 'M109', engine_name_ar: 'بوابة الهوية البيومترية', task_title: `تحدي هوية ${subject}`, task_description: `إطلاق تحدي الهوية البيومترية واختبار الحيوية`, department: 'الهوية والأمن', execution_order: 1 },
        { engine_code: 'M53', engine_name_ar: 'محرك الوثائق السيادي', task_title: 'ختم المستند', task_description: `دمج الهوية مع هاش المستند وحفظه بتشفير AES-256`, department: 'الأرشيف', execution_order: 2 },
      ];
      if (isSigning) {
        subtasks.push({ engine_code: 'M16', engine_name_ar: 'التوقيع الإلكتروني', task_title: 'تحويل لتوقيع بيومتري', task_description: `رفع التوقيع الرقمي إلى توقيع بيومتري سيادي`, department: 'الهوية والأمن', execution_order: 3 });
      }
      subtasks.push({ engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل العملية في سجل التدقيق المحصن', department: 'التنسيق المركزي', execution_order: subtasks.length + 1 });
      return subtasks;
    },
  },
];

const fallbackPattern: IntentPattern = {
  intent: 'general',
  intentLabel: 'أمر عام',
  keywords: [],
  entities: (input) => [input.slice(0, 60)],
  subtaskBuilder: (entities) => [
    { engine_code: 'M51', engine_name_ar: 'محرك المهام الداخلي', task_title: 'تنفيذ الأمر', task_description: `تنفيذ: ${entities[0] || 'الأمر المطلوب'}`, department: 'العمليات', execution_order: 1 },
    { engine_code: 'M92', engine_name_ar: 'الوكيل الذكي السيادي', task_title: 'تسجيل في سجل التدقيق', task_description: 'تسجيل الأمر في سجلات التدقيق', department: 'التنسيق المركزي', execution_order: 2 },
  ],
};

export function decomposeCommand(input: string): DecompositionResult {
  const normalized = input.trim();
  if (!normalized) {
    return { intent: 'empty', intentLabel: 'أمر فارغ', confidence: 0, entities: [], subtasks: [] };
  }

  let bestMatch: IntentPattern | null = null;
  let bestScore = 0;

  for (const pattern of patterns) {
    let score = 0;
    for (const kw of pattern.keywords) {
      if (normalized.includes(kw)) {
        score += kw.split(/\s+/).length * 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  const matched = bestMatch && bestScore > 0 ? bestMatch : fallbackPattern;
  const entities = matched.entities(normalized);
  const subtasks = matched.subtaskBuilder(entities, normalized);
  const confidence = bestScore > 0 ? Math.min(95, 60 + bestScore * 5) : 40;

  return {
    intent: matched.intent,
    intentLabel: matched.intentLabel,
    confidence,
    entities,
    subtasks,
  };
}

export const INTENT_ICONS: Record<string, string> = {
  project_establishment: 'Building2',
  food_safety_project: 'ShieldCheck',
  security_incident: 'ShieldAlert',
  board_resolution: 'Briefcase',
  document_amendment: 'FileText',
  case_management: 'Gavel',
  financial_operation: 'DollarSign',
  hr_operation: 'Users',
  general: 'CircuitBoard',
  marketing_campaign: 'Megaphone',
  automotive_trade: 'Car',
  automotive_manufacturing: 'Cog',
  chemicals_production: 'FlaskConical',
  foreign_residency: 'Plane',
  capital_markets: 'TrendingUp',
  shopping_mall_lease: 'ShoppingBag',
  library_archive: 'Library',
  maintenance_warranty: 'Wrench',
  interdepartmental_bridge: 'Network',
  quarry_mining: 'Mountain',
  ceramics_manufacturing: 'Grid2x2',
  arbitration_hub: 'Gavel',
  food_security: 'Wheat',
  iot_bridge: 'Cpu',
  disaster_recovery: 'ShieldAlert',
  biometric_gateway: 'Fingerprint',
};

export const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'بانتظار', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  analyzing: { label: 'تحليل', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  executing: { label: 'تنفيذ', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  failed: { label: 'فشل', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export const SUBTASK_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'بانتظار', bg: 'bg-gray-100', text: 'text-gray-600' },
  running: { label: 'قيد التنفيذ', bg: 'bg-blue-50', text: 'text-blue-700' },
  completed: { label: 'مكتمل', bg: 'bg-green-50', text: 'text-green-700' },
  failed: { label: 'فشل', bg: 'bg-red-50', text: 'text-red-700' },
};

export const SEVERITY_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  info: { label: 'معلومة', bg: 'bg-blue-50', text: 'text-blue-600', icon: 'Info' },
  success: { label: 'نجاح', bg: 'bg-green-50', text: 'text-green-600', icon: 'CheckCircle2' },
  warning: { label: 'تحذير', bg: 'bg-amber-50', text: 'text-amber-600', icon: 'AlertTriangle' },
  critical: { label: 'حرج', bg: 'bg-red-50', text: 'text-red-600', icon: 'ShieldAlert' },
};

export const DEPARTMENT_LABELS: Record<string, string> = {
  'القسم القانوني': 'القانوني',
  'الأمن السيبراني': 'الأمن',
  'الإدارة العليا': 'الإدارة',
  'العمليات': 'العمليات',
  'القسم المالي': 'المالي',
  'الموارد البشرية': 'الموارد البشرية',
  'الامتثال': 'الامتثال',
  'التجارة الخارجية': 'التجارة',
  'الأرشيف': 'الأرشيف',
  'البحث القانوني': 'البحث',
  'التحليل القانوني': 'التحليل',
  'المحاسبة': 'المحاسبة',
  'الشراكة': 'الشراكة',
  'التنسيق المركزي': 'التنسيق',
  'التسويق': 'التسويق',
  'السيارات': 'السيارات',
  'التصنيع': 'التصنيع',
  'الكيماويات': 'الكيماويات',
  'الهجرة': 'الهجرة',
  'أسواق المال': 'أسواق المال',
  'الملكية الفكرية': 'الملكية الفكرية',
  'الصحة والسلامة': 'الصحة والسلامة',
  'الصيانة': 'الصيانة',
  'التكنولوجيا': 'التكنولوجيا',
  'التجارة الداخلية': 'التجارة',
  'الإعلام': 'الإعلام',
  'العقارات التجارية': 'العقارات',
  'المعرفة والأرشيف': 'المعرفة',
  'الصيانة والتشغيل': 'الصيانة',
  'التكامل الإداري': 'التكامل',
  'التعدين': 'التعدين',
  'السيراميك': 'السيراميك',
  'التحكيم': 'التحكيم',
  'الأمن الغذائي': 'الأمن الغذائي',
  'إنترنت الأشياء': 'إنترنت الأشياء',
  'البنية التحتية': 'البنية التحتية',
  'الهوية والأمن': 'الهوية والأمن',
};
