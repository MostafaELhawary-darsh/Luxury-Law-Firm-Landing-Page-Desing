// src/lib/meetingAIAgent.ts
// وكيل الذكاء الاصطناعي المتخصص لتحليل الاجتماعات والمحاضر

import type { Meeting, MeetingAiPrompt, MeetingTask, MeetingMinute } from './firmTypes';
import { supabase } from './financeUtils';

/**
 * نتيجة تحليل المحادثة
 */
export interface ConversationAnalysis {
  decisions: {
    id: string;
    text: string;
    speaker: string;
    timestamp: number;
    priority: 'حرج' | 'عالي' | 'متوسط' | 'منخفض';
    legalReferences: string[];
  }[];
  tasks: {
    id: string;
    title: string;
    assignee: string;
    deadline?: string;
    priority: 'حرج' | 'عالي' | 'متوسط' | 'منخفض';
    estimatedHours?: number;
  }[];
  risks: {
    type: 'قانوني' | 'إجرائي' | 'مالي' | 'تنظيمي';
    message: string;
    severity: 'حرج' | 'تحذير' | 'معلومة';
  }[];
  recommendations: {
    legalReference: string;
    text: string;
    applicableToDecisions: string[];
  }[];
  summary: string;
  keyPoints: string[];
}

/**
 * توصيات المحادثة
 */
export interface ConversationRecommendations {
  missingParticipants: {
    name: string;
    role: string;
    reason: string;
  }[];
  suggestedFollowUp: {
    actionItem: string;
    targetDate: string;
    responsibleParty: string;
  }[];
  documentationNeeded: {
    docType: string;
    description: string;
    priority: string;
  }[];
  timelineIssues: {
    conflictDescription: string;
    affectedMeeting: string;
    suggestedResolution: string;
  }[];
}

/**
 * محلل المحادثة الذكي
 * يحلل نصوص التفريغ ويستخرج القرارات والمهام والمخاطر
 */
export async function analyzeConversation(
  meetingId: string,
  transcriptText: string,
  speakersMap: Record<string, string> = {}
): Promise<ConversationAnalysis> {
  const analysisResult: ConversationAnalysis = {
    decisions: [],
    tasks: [],
    risks: [],
    recommendations: [],
    summary: '',
    keyPoints: [],
  };

  // 1. فصل التفريغ إلى جمل وكلمات مفتاحية
  const sentences = transcriptText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const keywords = extractLegalKeywords(transcriptText);
  
  // 2. تحديد القرارات
  analysisResult.decisions = extractDecisions(transcriptText, speakersMap);
  
  // 3. استخراج المهام
  analysisResult.tasks = extractTasks(transcriptText, analysisResult.decisions);
  
  // 4. تحديد المخاطر
  analysisResult.risks = identifyRisks(transcriptText, keywords);
  
  // 5. ربط المراجع القانونية
  analysisResult.recommendations = await linkLegalReferences(keywords, meetingId);
  
  // 6. كتابة الملخص
  analysisResult.summary = generateSummary(analysisResult);
  
  // 7. استخراج النقاط الرئيسية
  analysisResult.keyPoints = extractKeyPoints(analysisResult);

  return analysisResult;
}

/**
 * استخراج الكلمات المفتاحية القانونية
 */
function extractLegalKeywords(text: string): string[] {
  const legalTerms = [
    'عقد', 'مسؤولية', 'التزام', 'حق', 'واجب', 'طرف', 'نزاع', 'تسوية',
    'تعويض', 'عطل', 'خلل', 'ضمان', 'شرط', 'بند', 'فسخ', 'إلغاء',
    'تجديد', 'نهاية', 'مديونية', 'دين', 'إفلاس', 'حجز', 'توثيق',
    'شهادة', 'إقرار', 'إثبات', 'سند', 'وثيقة', 'محضر', 'قرار',
    'حكم', 'سابقة', 'فتوى', 'توصية', 'اقتراح', 'معارضة', 'اعتراض',
    'تصرف', 'تفويض', 'توكيل', 'وصاية', 'ولاية', 'إدارة', 'استثمار'
  ];

  const regex = new RegExp(`\\b(${legalTerms.join('|')})\\b`, 'gi');
  const matches = text.match(regex) || [];
  return [...new Set(matches.map(m => m.trim()))];
}

/**
 * استخراج القرارات من النص
 */
function extractDecisions(
  text: string,
  speakersMap: Record<string, string>
): ConversationAnalysis['decisions'] {
  const decisions: ConversationAnalysis['decisions'] = [];
  
  // أنماط القرارات
  const decisionPatterns = [
    /(?:قررنا|قرار|تقرير|اتفقنا على|سيتم|يجب|يتعين|ملزم):\s*([^.!?]+)/gi,
    /(?:موافق على|أوافق على|نوافق على):\s*([^.!?]+)/gi,
    /(?:من الآن|ابتداءً من).*?(?:سيكون|سنقوم|سيتم):\s*([^.!?]+)/gi,
  ];

  let decisionId = 1;
  decisionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      decisions.push({
        id: `DEC-${decisionId++}`,
        text: match[1].trim(),
        speaker: Object.keys(speakersMap)[0] || 'غير محدد',
        timestamp: 0,
        priority: determinePriority(match[1]),
        legalReferences: [],
      });
    }
  });

  return decisions;
}

/**
 * استخراج المهام من النص
 */
function extractTasks(
  text: string,
  decisions: ConversationAnalysis['decisions']
): ConversationAnalysis['tasks'] {
  const tasks: ConversationAnalysis['tasks'] = [];
  
  // أنماط المهام
  const taskPatterns = [
    /(?:يجب على|يتعين على|سيقوم|يقوم|يكلف)(\s+[^.!?]+?)(?:بـ|ب|في|خلال):\s*([^.!?]+)/gi,
    /(?:مهمة|مسؤولية|متابعة):\s*([^.!?]+)/gi,
    /(?:موعد نهائي|deadline|في):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر))/gi,
  ];

  let taskId = 1;
  // البحث عن النصوص المتعلقة بالمهام
  const sentencesWithTasks = text.split(/[.!?]+/)
    .filter(s => /(?:يجب|يتعين|يقوم|مهمة|متابعة|موعد)/i.test(s));

  sentencesWithTasks.forEach(sentence => {
    if (sentence.trim().length > 10) {
      const assigneeMatch = sentence.match(/(?:يجب على|يتعين على)\s+([^،.!?]+)/i);
      const titleMatch = sentence.match(/:\s*([^.!?]+)$/) || [null, sentence];
      const deadlineMatch = sentence.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{4})/);

      tasks.push({
        id: `TSK-${taskId++}`,
        title: titleMatch[1]?.trim() || sentence.trim(),
        assignee: assigneeMatch?.[1]?.trim() || 'غير محدد',
        deadline: deadlineMatch?.[1],
        priority: /(?:حرج|عاجل|فوري)/i.test(sentence) ? 'حرج' : 'متوسط',
        estimatedHours: estimateHours(sentence),
      });
    }
  });

  return tasks;
}

/**
 * تحديد أولوية المهمة
 */
function determinePriority(text: string): 'حرج' | 'عالي' | 'متوسط' | 'منخفض' {
  if (/(?:حرج|عاجل|فوري|طارئ|كارثة)/i.test(text)) return 'حرج';
  if (/(?:مهم|أساسي|حيوي|ضروري)/i.test(text)) return 'عالي';
  if (/(?:عادي|معتاد|طبيعي)/i.test(text)) return 'منخفض';
  return 'متوسط';
}

/**
 * تقدير عدد الساعات المطلوبة للمهمة
 */
function estimateHours(taskText: string): number {
  const hourMatches = taskText.match(/(\d+)\s*(?:ساعة|ساعات|h|hour|hrs)/i);
  if (hourMatches) return parseInt(hourMatches[1]);
  
  const dayMatches = taskText.match(/(\d+)\s*(?:يوم|أيام|day|days)/i);
  if (dayMatches) return parseInt(dayMatches[1]) * 8;
  
  if (/(?:سريع|فوري|فوراً)/i.test(taskText)) return 2;
  if (/(?:قصير|قليل)/i.test(taskText)) return 4;
  if (/(?:طويل|كثير)/i.test(taskText)) return 16;
  
  return 8; // افتراضي
}

/**
 * تحديد المخاطر والمشاكل المحتملة
 */
function identifyRisks(text: string, keywords: string[]): ConversationAnalysis['risks'] {
  const risks: ConversationAnalysis['risks'] = [];

  // أنماط المخاطر
  const riskPatterns = [
    { pattern: /(?:مخاطر|خطر|تحذير|تحفظ|قلق|مشكلة|مشاكل):\s*([^.!?]+)/gi, type: 'قانوني' as const },
    { pattern: /(?:التزام|مسؤولية|ضمان).*?(?:غير واضح|مضبوط|محدد):\s*([^.!?]+)/gi, type: 'إجرائي' as const },
    { pattern: /(?:تكلفة|مالي|بدل|أجر|راتب).*?(?:مرتفع|مفرط):\s*([^.!?]+)/gi, type: 'مالي' as const },
    { pattern: /(?:تأخير|تأخر|تصادم|تضارب|تناقض):\s*([^.!?]+)/gi, type: 'تنظيمي' as const },
  ];

  riskPatterns.forEach(({ pattern, type }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      risks.push({
        type,
        message: match[1].trim(),
        severity: determineSeverity(match[1]),
      });
    }
  });

  return risks;
}

/**
 * تحديد درجة خطورة المخاطر
 */
function determineSeverity(riskText: string): 'حرج' | 'تحذير' | 'معلومة' {
  if (/(?:حرج|كارثي|خطير جداً|فادح)/i.test(riskText)) return 'حرج';
  if (/(?:تحذير|حذر|انتبه|احذر)/i.test(riskText)) return 'تحذير';
  return 'معلومة';
}

/**
 * ربط المراجع القانونية
 */
async function linkLegalReferences(
  keywords: string[],
  meetingId: string
): Promise<ConversationAnalysis['recommendations']> {
  const recommendations: ConversationAnalysis['recommendations'] = [];

  // قاعدة معارف المراجع (يمكن توسيعها)
  const legalKnowledge: Record<string, string[]> = {
    'عقد': ['القانون المدني - الباب الثاني: العقود', 'المادة 143-228 مدني'],
    'مسؤولية': ['القانون المدني - مسؤولية المتعاقد', 'المادة 165-227 مدني'],
    'التزام': ['القانون المدني - الالتزام والإبراء', 'المادة 140-174 مدني'],
    'حق': ['القانون المدني - الحقوق والالتزامات', 'المادة 1-60 مدني'],
    'فسخ': ['القانون المدني - فسخ العقد', 'المادة 155 مدني'],
    'تعويض': ['القانون المدني - الضرر والتعويض', 'المادة 165-171 مدني'],
  };

  // ربط الكلمات المفتاحية بالمراجع
  keywords.slice(0, 5).forEach(keyword => {
    const references = legalKnowledge[keyword] || [];
    references.forEach(ref => {
      recommendations.push({
        legalReference: ref,
        text: `مرجع قانوني متعلق بـ: ${keyword}`,
        applicableToDecisions: [],
      });
    });
  });

  return recommendations;
}

/**
 * كتابة الملخص التنفيذي
 */
function generateSummary(analysis: ConversationAnalysis): string {
  const decisionCount = analysis.decisions.length;
  const taskCount = analysis.tasks.length;
  const riskCount = analysis.risks.filter(r => r.severity === 'حرج').length;

  return `
    تم اتخاذ ${decisionCount} قرار رئيسي، وتحديد ${taskCount} مهمة جديدة.
    ${riskCount > 0 ? `تم تحديد ${riskCount} مخاطر حرجة تتطلب متابعة فورية.` : 'لم يتم تحديد مخاطر حرجة.'}
    يوصى بمراجعة المراجع القانونية المقترحة قبل المتابعة.
  `.trim();
}

/**
 * استخراج النقاط الرئيسية
 */
function extractKeyPoints(analysis: ConversationAnalysis): string[] {
  const keyPoints: string[] = [];

  // أعلى قرارات الأولوية
  analysis.decisions
    .filter(d => d.priority === 'حرج')
    .slice(0, 2)
    .forEach(d => keyPoints.push(`القرار: ${d.text}`));

  // أعلى مهام الأولوية
  analysis.tasks
    .filter(t => t.priority === 'حرج')
    .slice(0, 2)
    .forEach(t => keyPoints.push(`المهمة الحرجة: ${t.title} - ${t.assignee}`));

  // المخاطر الحرجة
  analysis.risks
    .filter(r => r.severity === 'حرج')
    .slice(0, 1)
    .forEach(r => keyPoints.push(`⚠️ ${r.message}`));

  return keyPoints;
}

/**
 * مولّد المحضر الذكي
 * يُنشئ محضراً منسقاً من تحليل المحادثة
 */
export async function generateSmartMOM(
  meetingId: string,
  analysis: ConversationAnalysis,
  meeting: Meeting
): Promise<string> {
  const momContent = `
═══════════════════════════════════════════════════════════
                    محضر اجتماع ذكي (AI-Generated)
═══════════════════════════════════════════════════════════

📋 معلومات الاجتماع
─────────────────────────────────────────────────────────
العنوان:        ${meeting.title}
التاريخ:        ${new Date(meeting.scheduled_date).toLocaleDateString('ar-EG')}
المنصة:         ${meeting.platform}
اللغة:          ${meeting.language}

📌 الملخص التنفيذي
─────────────────────────────────────────────────────────
${analysis.summary}

🎯 القرارات المتخذة (${analysis.decisions.length})
─────────────────────────────────────────────────────────
${analysis.decisions.map((d, i) => `
${i + 1}. ${d.text}
   • الأولوية: ${d.priority}
   • الناطق: ${d.speaker}
   • المراجع: ${d.legalReferences.join(', ') || 'لا توجد'}
`).join('\n')}

✅ المهام الموكلة (${analysis.tasks.length})
─────────────────────────────────────────────────────────
${analysis.tasks.map((t, i) => `
${i + 1}. ${t.title}
   • المسؤول: ${t.assignee}
   • الموعد النهائي: ${t.deadline || 'لم يُحدد'}
   • الأولوية: ${t.priority}
   • الساعات المقدرة: ${t.estimatedHours || '?'} ساعة
`).join('\n')}

⚠️ المخاطر والتحفظات (${analysis.risks.length})
─────────────────────────────────────────────────────────
${analysis.risks.map((r, i) => `
${i + 1}. [${r.type}] ${r.message}
   • الخطورة: ${r.severity}
`).join('\n')}

📚 المراجع القانونية المطبقة
─────────────────────────────────────────────────────────
${analysis.recommendations.slice(0, 5).map((r, i) => `
${i + 1}. ${r.legalReference}
   ${r.text}
`).join('\n')}

💡 التوصيات والمتابعة
─────────────────────────────────────────────────────────
• قم بمراجعة جميع القرارات ذات الأولوية العالية والحرجة
• تأكد من إسناد المهام بوضوح للمسؤولين
• راقب المخاطر المحددة وتتبع الإجراءات التصحيحية
• قم بمزامنة المهام مع أدوات إدارة المشاريع

📝 النقاط الرئيسية
─────────────────────────────────────────────────────────
${analysis.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

═══════════════════════════════════════════════════════════
تم التوليد بواسطة: نظام المحاضر الذكي
التاريخ: ${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
═══════════════════════════════════════════════════════════
  `.trim();

  return momContent;
}

/**
 * محرك التوصيات الذكي
 * يقدم توصيات بناءً على نوع الاجتماع والسياق
 */
export async function getConversationRecommendations(
  meetingId: string,
  analysis: ConversationAnalysis,
  previousMeetings: Meeting[]
): Promise<ConversationRecommendations> {
  const recommendations: ConversationRecommendations = {
    missingParticipants: [],
    suggestedFollowUp: [],
    documentationNeeded: [],
    timelineIssues: [],
  };

  // 1. المشاركون المفقودون
  // تحليل الاجتماعات السابقة لتحديد من كان يجب أن يكون حاضراً
  if (previousMeetings.length > 0) {
    const commonParticipants = new Map<string, number>();
    previousMeetings.forEach(m => {
      (m.participants || []).forEach(p => {
        commonParticipants.set(p, (commonParticipants.get(p) || 0) + 1);
      });
    });

    // المشاركون الذين كانوا في 70% من الاجتماعات السابقة
    const threshold = Math.ceil(previousMeetings.length * 0.7);
    commonParticipants.forEach((count, name) => {
      if (count >= threshold) {
        recommendations.missingParticipants.push({
          name,
          role: 'متكرر',
          reason: `كان موجوداً في ${count} من ${previousMeetings.length} اجتماع سابق`,
        });
      }
    });
  }

  // 2. متابعة مقترحة
  analysis.tasks.forEach(task => {
    recommendations.suggestedFollowUp.push({
      actionItem: task.title,
      targetDate: task.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      responsibleParty: task.assignee,
    });
  });

  // 3. الوثائق المطلوبة
  if (analysis.decisions.length > 3) {
    recommendations.documentationNeeded.push({
      docType: 'محضر اجتماع موثق',
      description: 'يجب توثيق القرارات بناءً على العدد الكبير من القرارات المتخذة',
      priority: 'عالي',
    });
  }

  if (analysis.risks.some(r => r.severity === 'حرج')) {
    recommendations.documentationNeeded.push({
      docType: 'تقرير المخاطر',
      description: 'تم تحديد مخاطر حرجة تتطلب توثيقاً رسمياً',
      priority: 'حرج',
    });
  }

  return recommendations;
}

/**
 * تطبيق التحليل على الاجتماع
 * يحفظ النتائج في قاعدة البيانات
 */
export async function applyAnalysisToMeeting(
  meetingId: string,
  analysis: ConversationAnalysis
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // حفظ القرارات
    if (analysis.decisions.length > 0) {
      const { error } = await supabase.from('lf_meeting_ai_prompts').insert(
        analysis.decisions.map(d => ({
          meeting_id: meetingId,
          trigger_term: 'قرار-آلي',
          legal_reference: d.legalReferences.join('; '),
          suggestion_text: d.text,
          shown_at: new Date().toISOString(),
        }))
      );
      if (error) errors.push(`خطأ في حفظ القرارات: ${error.message}`);
    }

    // حفظ المهام
    if (analysis.tasks.length > 0) {
      const { error } = await supabase.from('lf_meeting_tasks').insert(
        analysis.tasks.map(t => ({
          meeting_id: meetingId,
          title: t.title,
          assignee: t.assignee,
          deadline: t.deadline,
          status: 'pending',
        }))
      );
      if (error) errors.push(`خطأ في حفظ المهام: ${error.message}`);
    }

    return { success: errors.length === 0, errors };
  } catch (err) {
    errors.push(`خطأ عام: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, errors };
  }
}
