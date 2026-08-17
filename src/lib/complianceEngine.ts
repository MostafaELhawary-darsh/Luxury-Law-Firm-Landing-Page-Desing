import type { LegalDocument, ComplianceCheck } from './documentTypes';

export interface LibrarySource {
  id: string;
  source_type: 'constitution' | 'law' | 'ministerial_decision' | 'regulation' | 'judicial_precedent' | 'fatwa';
  title: string;
  article_number: string | null;
  article_title: string | null;
  content_text: string;
  reference_label: string;
}

export interface ComplianceResult {
  checks: Omit<ComplianceCheck, 'id' | 'created_at'>[];
  overallStatus: 'compliant' | 'non_compliant' | 'needs_review';
  summary: {
    total: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    needsReview: number;
    criticalCount: number;
    warningCount: number;
    avgConfidence: number;
  };
}

// Arabic legal keywords that indicate compliance-relevant topics
const LEGAL_KEYWORDS: { terms: string[]; category: string }[] = [
  { terms: ['عقد', 'تعاقد', 'اتفاق', 'التزام', 'التزامات'], category: 'العقود' },
  { terms: ['عمل', 'عامل', 'أجر', 'تشغيل', 'إجازة', 'إنهاء عقد'], category: 'قانون العمل' },
  { terms: ['ملكية', 'بيع', 'شراء', 'نقل ملكية', 'تسليم'], category: 'الملكية والعقود' },
  { terms: ['دستور', 'دستوري', 'حرية', 'حق', 'حقوق'], category: 'الدستور' },
  { terms: ['محكمة', 'قاضى', 'قضاء', 'حكم', 'دعوى', 'خصومة'], category: 'القضاء' },
  { terms: ['سرقة', 'اختلاس', 'نصب', 'احتيال', 'جريمة'], category: 'قانون العقوبات' },
  { terms: ['شركة', 'مساهمة', 'أسهم', 'رأس مال', 'مجلس إدارة'], category: 'قانون الشركات' },
  { terms: ['إيجار', 'مؤجر', 'مستأجر', 'عين مؤجرة'], category: 'قانون الإيجار' },
  { terms: ['إفلاس', 'مدين', 'دائن', 'إعادة هيكلة'], category: 'قانون الإفلاس' },
  { terms: ['منافسة', 'احتكار', 'مركز مهيمن'], category: 'حماية المنافسة' },
  { terms: ['استثمار', 'مستثمر', 'مشروع استثماري'], category: 'قانون الاستثمار' },
  { terms: ['تأمين', 'معاش', 'تقاعد'], category: 'التأمين الاجتماعي' },
  { terms: ['بنك', 'مصرف', 'ائتمان'], category: 'القانون المصرفي' },
  { terms: ['إداري', 'قرار إداري', 'إلغاء', 'تعويض'], category: 'القضاء الإداري' },
  { terms: ['تحكيم', 'محكم', 'حكم تحكيم'], category: 'التحكيم' },
];

// Terms that indicate potential compliance issues
const RISK_TERMS: { terms: string[]; risk: string; severity: 'critical' | 'warning' }[] = [
  { terms: ['باطل', 'بطلان', 'غير قانوني', 'مخالف'], risk: 'نص قد يشير إلى بطلان أو مخالفة قانونية', severity: 'critical' },
  { terms: ['إلزام', 'إجبار', 'إكراه'], risk: 'نص قد يشير إلى إكراه أو إجبار يبطل الرضا', severity: 'warning' },
  { terms: ['تنازل', 'نزول عن', 'إسقاط حق'], risk: 'تنازل عن حق قد يكون مخالفاً للنظام العام', severity: 'warning' },
  { terms: ['غرامة', 'شرط جزائي', 'تعويض اتفاقي'], risk: 'شرط جزائي قد يحتاج مراجعة مدى ملاءمته', severity: 'warning' },
  { terms: ['حبس', 'سجن', 'عقوبة'], risk: 'نص قد يتعلق بالعقوبات ويحتاج مراجعة قانونية', severity: 'critical' },
  { terms: ['أمر مباشر', 'بدون مناقصة', 'بدون مزايدة'], risk: 'تعاقد بالأمر المباشر قد يحتاج مبرر قانوني', severity: 'warning' },
];

function normalizeArabic(text: string): string {
  return text
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractKeywords(text: string): string[] {
  const normalized = normalizeArabic(text);
  const found = new Set<string>();
  for (const group of LEGAL_KEYWORDS) {
    for (const term of group.terms) {
      if (normalized.includes(normalizeArabic(term))) {
        found.add(group.category);
        break;
      }
    }
  }
  return Array.from(found);
}

function findRiskTerms(text: string): { risk: string; severity: 'critical' | 'warning'; term: string }[] {
  const normalized = normalizeArabic(text);
  const risks: { risk: string; severity: 'critical' | 'warning'; term: string }[] = [];
  for (const group of RISK_TERMS) {
    for (const term of group.terms) {
      if (normalized.includes(normalizeArabic(term))) {
        risks.push({ risk: group.risk, severity: group.severity, term });
      }
    }
  }
  return risks;
}

function calculateRelevanceScore(docText: string, refText: string): number {
  const normDoc = normalizeArabic(docText);
  const normRef = normalizeArabic(refText);
  if (!normDoc || !normRef) return 0;

  // Extract significant words from reference (filter out short words and common words)
  const commonWords = new Set(['في', 'من', 'الى', 'على', 'عن', 'مع', 'او', 'و', 'ال', 'لا', 'ما', 'هو', 'هي', 'قد', 'كل', 'بعض', 'ذلك', 'هذا', 'تلك', 'ان', 'اذا', 'كان', 'يكون', 'عليه', 'له', 'به', 'فيه']);
  const refWords = normRef.split(' ').filter(w => w.length > 2 && !commonWords.has(w));
  const docWords = new Set(normDoc.split(' ').filter(w => w.length > 2));

  let matches = 0;
  for (const word of refWords) {
    if (docWords.has(word)) matches++;
  }

  const score = refWords.length > 0 ? (matches / refWords.length) * 100 : 0;
  return Math.round(score);
}

export async function analyzeCompliance(
  doc: LegalDocument,
  library: LibrarySource[]
): Promise<ComplianceResult> {
  const docText = `${doc.title} ${doc.content_text}`.trim();
  if (!docText || docText.length < 10) {
    return {
      checks: [],
      overallStatus: 'needs_review',
      summary: { total: 0, compliant: 0, nonCompliant: 0, partial: 0, needsReview: 0, criticalCount: 0, warningCount: 0, avgConfidence: 0 },
    };
  }

  const docCategories = extractKeywords(docText);
  const docRisks = findRiskTerms(docText);
  const checks: Omit<ComplianceCheck, 'id' | 'created_at'>[] = [];

  // 1. Match against library sources
  const scoredSources = library
    .map(source => {
      const sourceText = `${source.title} ${source.content_text}`;
      const sourceCategories = extractKeywords(sourceText);
      const categoryMatch = docCategories.filter(c => sourceCategories.includes(c));
      const relevanceScore = calculateRelevanceScore(docText, sourceText);
      return { source, relevanceScore, categoryMatch };
    })
    .filter(item => item.relevanceScore > 5 || item.categoryMatch.length > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 12);

  for (const { source, relevanceScore, categoryMatch } of scoredSources) {
    const sourceText = `${source.title} ${source.content_text}`;
    const sourceRisks = findRiskTerms(sourceText);
    const hasCategoryMatch = categoryMatch.length > 0;
    const hasRiskOverlap = docRisks.some(dr => sourceRisks.some(sr => sr.term === dr.term));

    let complianceStatus: 'compliant' | 'non_compliant' | 'partial' | 'needs_review';
    let severity: 'info' | 'warning' | 'critical';
    let findingSummary: string;
    let recommendation: string | null = null;
    let confidence = relevanceScore;

    if (hasRiskOverlap && relevanceScore > 20) {
      // Document contains risk terms that overlap with the reference
      const overlappingRisks = docRisks.filter(dr => sourceRisks.some(sr => sr.term === dr.term));
      complianceStatus = overlappingRisks.some(r => r.severity === 'critical') ? 'non_compliant' : 'partial';
      severity = overlappingRisks.some(r => r.severity === 'critical') ? 'critical' : 'warning';
      findingSummary = `رصد المحرك مصطلحات ذات خطورة في المستند تتعلق بـ${source.reference_label}: "${source.title}"${source.article_number ? ` (المادة ${source.article_number})` : ''}. المصطلحات المرصودة: ${overlappingRisks.map(r => r.term).join('، ')}.`;
      recommendation = `يُنصح بمراجعة البنود المتعلقة بـ${overlappingRisks.map(r => r.risk).join('؛ ')} والتأكد من توافقها مع النص القانوني المرجعي.`;
      confidence = Math.min(95, relevanceScore + 15);
    } else if (relevanceScore > 30 && hasCategoryMatch) {
      // Strong relevance — likely compliant
      complianceStatus = 'compliant';
      severity = 'info';
      findingSummary = `المستند يتوافق مع ${source.reference_label}: "${source.title}"${source.article_number ? ` — المادة ${source.article_number}` : ''}. تطابق في الموضوعات: ${categoryMatch.join('، ')}. لم يُرصد مخالفات جوهرية في البنود المطابقة.`;
      recommendation = null;
      confidence = Math.min(95, relevanceScore + 10);
    } else if (relevanceScore > 15 && hasCategoryMatch) {
      // Moderate relevance — needs review
      complianceStatus = 'needs_review';
      severity = 'warning';
      findingSummary = `تطابق جزئي مع ${source.reference_label}: "${source.title}"${source.article_number ? ` — المادة ${source.article_number}` : ''}. الموضوعات المشتركة: ${categoryMatch.join('، ')}. يُنصح بمراجعة البنود المتعلقة بهذه الموضوعات للتأكد من الامتثال الكامل.`;
      recommendation = `يُنصح بمراجعة البنود المتعلقة بـ${categoryMatch.join('، ')} ومقارنتها بنص ${source.title} للتأكد من الامتثال.`;
      confidence = Math.min(85, relevanceScore + 5);
    } else {
      // Low relevance — informational
      complianceStatus = 'needs_review';
      severity = 'info';
      findingSummary = `مرجع قانوني ذو صلة محتملة: "${source.title}"${source.article_number ? ` — المادة ${source.article_number}` : ''}. درجة التطابق منخفضة، يُنصح بالرجوع إلى النص الأصلي للتأكد من مدى الانطباق.`;
      recommendation = null;
      confidence = relevanceScore;
    }

    checks.push({
      document_id: doc.id,
      reference_type: source.source_type,
      reference_title: source.title,
      reference_article: source.article_number,
      compliance_status: complianceStatus,
      severity,
      finding_summary: findingSummary,
      recommendation,
      confidence_score: confidence,
    });
  }

  // 2. Add general risk findings from document itself
  if (docRisks.length > 0 && checks.length < 15) {
    const criticalRisks = docRisks.filter(r => r.severity === 'critical');
    const warningRisks = docRisks.filter(r => r.severity === 'warning');

    if (criticalRisks.length > 0) {
      checks.push({
        document_id: doc.id,
        reference_type: 'law',
        reference_title: 'تحليل المصطلحات الخطرة في المستند',
        reference_article: null,
        compliance_status: 'non_compliant',
        severity: 'critical',
        finding_summary: `رصد محرك التحليل مصطلحات ذات خطورة حرجة في المستند: ${criticalRisks.map(r => `"${r.term}" (${r.risk})`).join('، ')}. هذه المصطلحات قد تشير إلى مخالفة قانونية محتملة.`,
        recommendation: 'يُنصح بشدة بمراجعة البنود التي تتضمن هذه المصطلحات والرجوع إلى النصوص القانونية ذات الصلة قبل الاعتماد.',
        confidence_score: 80,
      });
    }

    if (warningRisks.length > 0) {
      checks.push({
        document_id: doc.id,
        reference_type: 'law',
        reference_title: 'تحليل المصطلحات التحذيرية في المستند',
        reference_article: null,
        compliance_status: 'partial',
        severity: 'warning',
        finding_summary: `رصد المحرك مصطلحات تحذيرية في المستند: ${warningRisks.map(r => `"${r.term}" (${r.risk})`).join('، ')}. هذه المصطلحات تحتاج إلى مراجعة قانونية.`,
        recommendation: 'يُنصح بمراجعة البنود التي تتضمن هذه المصطلحات للتأكد من توافقها مع القانون.',
        confidence_score: 75,
      });
    }
  }

  // 3. If no checks at all, document may not be legal in nature
  if (checks.length === 0) {
    checks.push({
      document_id: doc.id,
      reference_type: 'law',
      reference_title: 'تحليل عام للمستند',
      reference_article: null,
      compliance_status: 'needs_review',
      severity: 'info',
      finding_summary: 'لم يرصد المحرك تطابقاً موضوعياً مع نصوص قانونية محددة في المكتبة القانونية. قد يكون المستند غير قانوني بطبيعته، أو يحتاج إلى إضافة نصوص قانونية أكثر تفصيلاً في المكتبة.',
      recommendation: 'يُنصح بإضافة المزيد من النصوص القانونية ذات الصلة بموضوع المستند إلى المكتبة القانونية، أو مراجعة المستند يدوياً.',
      confidence_score: 50,
    });
  }

  // Calculate summary
  const compliantCount = checks.filter(c => c.compliance_status === 'compliant').length;
  const nonCompliantCount = checks.filter(c => c.compliance_status === 'non_compliant').length;
  const partialCount = checks.filter(c => c.compliance_status === 'partial').length;
  const needsReviewCount = checks.filter(c => c.compliance_status === 'needs_review').length;
  const criticalCount = checks.filter(c => c.severity === 'critical').length;
  const warningCount = checks.filter(c => c.severity === 'warning').length;
  const avgConfidence = checks.length > 0
    ? Math.round(checks.reduce((sum, c) => sum + c.confidence_score, 0) / checks.length)
    : 0;

  const overallStatus: 'compliant' | 'non_compliant' | 'needs_review' =
    criticalCount > 0 ? 'non_compliant' :
    warningCount > 0 ? 'needs_review' :
    compliantCount > 0 ? 'compliant' : 'needs_review';

  return {
    checks,
    overallStatus,
    summary: {
      total: checks.length,
      compliant: compliantCount,
      nonCompliant: nonCompliantCount,
      partial: partialCount,
      needsReview: needsReviewCount,
      criticalCount,
      warningCount,
      avgConfidence,
    },
  };
}
