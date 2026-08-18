export interface LegalDocument {
  id: string;
  title: string;
  doc_type: string;
  language: string;
  content_text: string;
  file_url: string | null;
  file_format: string | null;
  file_size_bytes: number | null;
  status: string;
  uploaded_by: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheck {
  id: string;
  document_id: string;
  reference_type: string;
  reference_title: string;
  reference_article: string | null;
  compliance_status: string;
  severity: string;
  finding_summary: string;
  recommendation: string | null;
  confidence_score: number;
  created_at: string;
}

export interface ReferenceSource {
  id: string;
  source_type: string;
  title: string;
  title_en: string | null;
  jurisdiction: string;
  article_number: string | null;
  article_title: string | null;
  content_text: string;
  language: string;
  effective_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentTranslation {
  id: string;
  document_id: string;
  target_language: string;
  translated_title: string;
  translated_content: string;
  translation_status: string;
  translated_by: string;
  created_at: string;
  updated_at: string;
}

export interface DraftingSession {
  id: string;
  document_id: string;
  draft_type: string;
  instructions: string;
  generated_text: string;
  iteration: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ExportJob {
  id: string;
  document_id: string;
  export_format: string;
  export_type: string;
  status: string;
  file_url: string | null;
  created_at: string;
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  contract: 'عقد',
  appeal: 'طعن / استئناف',
  lawsuit: 'دعوى قضائية',
  legal_opinion: 'رأي قانوني',
  regulation: 'لائحة تنظيمية',
  ruling: 'حكم قضائي',
  memo: 'مذكرة قانونية',
  clause: 'بند تعاقدي',
  other: 'أخرى',
};

export const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'مسودة', color: 'text-ink/50', bg: 'bg-gray-100' },
  uploaded: { label: 'مرفوع', color: 'text-blue-700', bg: 'bg-blue-50' },
  analyzing: { label: 'قيد التحليل', color: 'text-amber-700', bg: 'bg-amber-50' },
  analyzed: { label: 'تم التحليل', color: 'text-blue-700', bg: 'bg-blue-50' },
  compliant: { label: 'ممتثل', color: 'text-green-700', bg: 'bg-green-50' },
  non_compliant: { label: 'غير ممتثل', color: 'text-red-600', bg: 'bg-red-50' },
  needs_review: { label: 'يحتاج مراجعة', color: 'text-amber-700', bg: 'bg-amber-50' },
  archived: { label: 'مؤرشف', color: 'text-ink/40', bg: 'bg-gray-100' },
};

export const REFERENCE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  constitution: { label: 'الدستور', icon: 'Landmark', color: 'text-gold' },
  law: { label: 'قانون', icon: 'Scale', color: 'text-midnight' },
  ministerial_decision: { label: 'قرار وزاري', icon: 'FileBadge', color: 'text-blue-700' },
  regulation: { label: 'لائحة', icon: 'ScrollText', color: 'text-purple-700' },
  judicial_precedent: { label: 'سابقة قضائية', icon: 'Gavel', color: 'text-red-600' },
};

export const COMPLIANCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  compliant: { label: 'ممتثل', color: 'text-green-700', bg: 'bg-green-50' },
  non_compliant: { label: 'غير ممتثل', color: 'text-red-600', bg: 'bg-red-50' },
  partial: { label: 'امتثال جزئي', color: 'text-amber-700', bg: 'bg-amber-50' },
  needs_review: { label: 'يحتاج مراجعة', color: 'text-blue-700', bg: 'bg-blue-50' },
};

export const SEVERITY_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  info: { label: 'معلومة', color: 'text-blue-700', dot: 'bg-blue-500' },
  warning: { label: 'تحذير', color: 'text-amber-700', dot: 'bg-amber-500' },
  critical: { label: 'حرج', color: 'text-red-600', dot: 'bg-red-500' },
};

export const LANGUAGES: { code: string; name: string; flag: string }[] = [
  { code: 'ar', name: 'العربية', flag: '🇪🇬' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

export const LANGUAGE_LABELS: Record<string, string> = LANGUAGES.reduce((acc, l) => {
  acc[l.code] = l.name;
  return acc;
}, {} as Record<string, string>);

export const EXPORT_FORMATS: { code: string; label: string; mime: string }[] = [
  { code: 'pdf', label: 'PDF', mime: 'application/pdf' },
  { code: 'docx', label: 'Word (DOCX)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { code: 'html', label: 'HTML', mime: 'text/html' },
  { code: 'rtf', label: 'RTF', mime: 'application/rtf' },
  { code: 'png', label: 'PNG (صورة)', mime: 'image/png' },
  { code: 'jpg', label: 'JPG (صورة)', mime: 'image/jpeg' },
];

export const ACCEPTED_FILE_TYPES = [
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.html', '.htm',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff',
  '.csv', '.xlsx', '.xls', '.odt', '.md',
];

export const ACCEPTED_FILE_LABEL = '.pdf, .doc, .docx, .txt, .rtf, .html, .jpg, .png, .gif, .csv, .xlsx, .md';
