import {
  RefreshCw,
  Bookmark,
  FileText,
  ScrollText,
  Gavel,
  Library,
  Landmark,
  Scale,
  CalendarCheck2,
  ListChecks,
  Building2,
  FileCheck2,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import type { LibrarySection } from './types';

export interface LibraryCardConfig {
  id: LibrarySection;
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
}

export const libraryCards: LibraryCardConfig[] = [
  {
    id: 'dashboard',
    title: 'لوحة تحكم المكتبة',
    description: 'إدارة وتحميل المستندات القانونية بكافة الصيغ',
    icon: LayoutDashboard,
    iconColor: 'text-midnight',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'today',
    title: 'تشريعات اليوم',
    description: 'أحدث التشريعات الصادرة',
    icon: RefreshCw,
    iconColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'search-legislation',
    title: 'البحث في التشريعات',
    description: 'بحث متقدم في النصوص التشريعية',
    icon: Bookmark,
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  {
    id: 'egyptian-laws',
    title: 'القوانين المصرية بارتباطاتها',
    description: 'فهرس شامل للقوانين المصرية',
    icon: FileText,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'gazette',
    title: 'الجريدة الرسمية والوقائع',
    description: 'أعداد الجريدة الرسمية',
    icon: ScrollText,
    iconColor: 'text-gray-800',
    bgColor: 'bg-gray-100',
  },
  {
    id: 'cassation',
    title: 'أحكام محكمة النقض',
    description: 'أحكام محكمة النقض المصرية',
    icon: Gavel,
    iconColor: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  {
    id: 'cassation-alpha',
    title: 'أحكام محكمة النقض أبجدي',
    description: 'فهرس أبجدي لأحكام النقض',
    icon: Library,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'constitutional',
    title: 'أحكام المحكمة الدستورية',
    description: 'أحكام المحكمة الدستورية العليا',
    icon: Landmark,
    iconColor: 'text-amber-800',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'supreme-admin',
    title: 'الأحكام الإدارية العليا',
    description: 'أحكام المحكمة الإدارية العليا',
    icon: Scale,
    iconColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'unification',
    title: 'دائرة توحيد المبادئ',
    description: 'مبادئ توحيد الأحكام',
    icon: CalendarCheck2,
    iconColor: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  {
    id: 'admin-judiciary',
    title: 'أحكام القضاء الإداري',
    description: 'أحكام محكمة القضاء الإداري',
    icon: ListChecks,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'admin-judiciary-2',
    title: 'أحكام القضاء الإداري (دوائر)',
    description: 'تصفح حسب الدوائر',
    icon: Building2,
    iconColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    id: 'fatwas',
    title: 'فتاوى الجمعية العمومية',
    description: 'فتاوى الجمعية العمومية',
    icon: FileCheck2,
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
];

export interface SearchFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'date' | 'select' | 'checkbox-group';
  options?: string[];
  full?: boolean;
}

export interface SearchSectionConfig {
  title: string;
  subtitle: string;
  fields: SearchFieldConfig[];
  showPrecision: boolean;
  showScopeToggle?: boolean;
  resultColumns: ResultColumn[];
  dataSource: 'legislation' | 'court_rulings' | 'fatwas' | 'gazette_issues';
  courtTypeFilter?: string;
}

export interface ResultColumn {
  key: string;
  label: string;
  width?: string;
}

export const sectionConfigs: Record<LibrarySection, SearchSectionConfig> = {
  today: {
    title: 'تشريعات اليوم',
    subtitle: 'أحدث التشريعات الصادرة في الجريدة الرسمية',
    fields: [],
    showPrecision: false,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'issuing_authority', label: 'جهة الإصدار', width: 'w-40' },
      { key: 'legislation_number', label: 'رقم التشريع', width: 'w-28' },
      { key: 'year', label: 'السنة', width: 'w-24' },
      { key: 'publication_date', label: 'التاريخ', width: 'w-32' },
      { key: 'gazette_issue_number', label: 'رقم العدد', width: 'w-28' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'legislation',
  },
  'search-legislation': {
    title: 'البحث في التشريعات',
    subtitle: 'بحث متقدم في النصوص التشريعية المصرية',
    fields: [
      { key: 'query', label: 'ابحث عن التشريع', placeholder: 'اسم التشريع أو كلمات منه', type: 'text', full: true },
      { key: 'articleText', label: 'نصوص المواد', placeholder: 'نص المادة', type: 'text', full: true },
      { key: 'gazetteType', label: 'نوع الجريدة', placeholder: 'اختر النوع', type: 'select', options: ['الجريدة الرسمية', 'الوقائع المصرية', 'النشرة الرسمية'] },
      { key: 'gazetteIssue', label: 'رقم العدد', placeholder: 'رقم العدد', type: 'text' },
      { key: 'legislationNumber', label: 'رقم التشريع', placeholder: 'رقم التشريع', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
      { key: 'pubDateFrom', label: 'تاريخ النشر من', placeholder: '', type: 'date' },
      { key: 'pubDateTo', label: 'إلى', placeholder: '', type: 'date' },
    ],
    showPrecision: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'issuing_authority', label: 'جهة الإصدار', width: 'w-40' },
      { key: 'legislation_number', label: 'رقم التشريع', width: 'w-28' },
      { key: 'year', label: 'السنة', width: 'w-24' },
      { key: 'publication_date', label: 'التاريخ', width: 'w-32' },
      { key: 'gazette_issue_number', label: 'مكان النشر', width: 'w-28' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'legislation',
  },
  'egyptian-laws': {
    title: 'القوانين المصرية بارتباطاتها',
    subtitle: 'فهرس شامل للقوانين المصرية مع هيكلها الشجري',
    fields: [
      { key: 'query', label: 'ابحث عن قانون', placeholder: 'اسم القانون', type: 'text', full: true },
      { key: 'legislationNumber', label: 'رقم التشريع', placeholder: 'رقم التشريع', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
      { key: 'articleText', label: 'نصوص المواد', placeholder: 'نص المادة', type: 'text' },
    ],
    showPrecision: true,
    showScopeToggle: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'title', label: 'اسم القانون', width: 'flex-1' },
      { key: 'legislation_number', label: 'رقم القانون', width: 'w-28' },
      { key: 'year', label: 'السنة', width: 'w-24' },
      { key: 'status', label: 'الحالة', width: 'w-24' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'legislation',
  },
  gazette: {
    title: 'الجريدة الرسمية والوقائع',
    subtitle: 'البحث في أعداد الجريدة الرسمية والوقائع المصرية',
    fields: [
      { key: 'query', label: 'نص البحث', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'gazetteIssue', label: 'الرقم', placeholder: 'رقم العدد', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
      { key: 'articleText', label: 'نصوص المواد', placeholder: 'نص المادة', type: 'text' },
      { key: 'sector', label: 'القطاع', placeholder: 'اختر القطاع', type: 'select', options: ['كافة القطاعات', 'الحالي', 'التشريعات', 'الإدارية', 'الاقتصادية'] },
    ],
    showPrecision: false,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'issue_number', label: 'رقم العدد', width: 'w-28' },
      { key: 'year', label: 'السنة', width: 'w-24' },
      { key: 'publication_date', label: 'تاريخ النشر', width: 'w-32' },
      { key: 'sector', label: 'القطاع', width: 'w-32' },
      { key: 'content_summary', label: 'المحتوى', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'gazette_issues',
  },
  cassation: {
    title: 'أحكام محكمة النقض',
    subtitle: 'البحث في أحكام محكمة النقض المصرية',
    fields: [
      { key: 'scope', label: 'نطاق البحث', placeholder: 'اختر النطاق', type: 'select', options: ['الموضوع', 'المبدأ', 'موجز الطعن', 'نص الحكم'] },
      { key: 'query', label: 'كلمات البحث', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'legislationNumber', label: 'رقم الطعن', placeholder: 'رقم الطعن', type: 'text' },
      { key: 'year', label: 'السنة القضائية', placeholder: 'السنة القضائية', type: 'text' },
      { key: 'sessionDateFrom', label: 'تاريخ الجلسة من', placeholder: '', type: 'date' },
      { key: 'sessionDateTo', label: 'إلى', placeholder: '', type: 'date' },
      { key: 'rulingType', label: 'نوع القانون', placeholder: 'اختر النوع', type: 'select', options: ['مدني', 'جنائي'] },
    ],
    showPrecision: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'ruling_number', label: 'رقم الطعن', width: 'w-28' },
      { key: 'judicial_year', label: 'السنة القضائية', width: 'w-32' },
      { key: 'session_date', label: 'تاريخ الجلسة', width: 'w-32' },
      { key: 'circuit', label: 'الدائرة', width: 'w-32' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'court_rulings',
    courtTypeFilter: 'النقض',
  },
  'cassation-alpha': {
    title: 'أحكام محكمة النقض - الفهرس الأبجدي',
    subtitle: 'تصفح أحكام محكمة النقض مرتبة أبجدياً حسب الموضوع',
    fields: [
      { key: 'query', label: 'ابحث في الفهرس', placeholder: 'اسم الموضوع', type: 'text', full: true },
    ],
    showPrecision: false,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'ruling_number', label: 'رقم الطعن', width: 'w-28' },
      { key: 'judicial_year', label: 'السنة', width: 'w-24' },
      { key: 'session_date', label: 'تاريخ الجلسة', width: 'w-32' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'court_rulings',
    courtTypeFilter: 'النقض',
  },
  constitutional: {
    title: 'أحكام المحكمة الدستورية',
    subtitle: 'البحث في أحكام المحكمة الدستورية العليا',
    fields: [
      { key: 'scope', label: 'نطاق البحث', placeholder: 'اختر النطاق', type: 'select', options: ['منطوق الحكم', 'نص الحكم', 'موضوع الحكم'] },
      { key: 'query', label: 'كلمات البحث', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'legislationNumber', label: 'رقم الحكم', placeholder: 'رقم الحكم', type: 'text' },
      { key: 'year', label: 'السنة القضائية', placeholder: 'السنة القضائية', type: 'text' },
      { key: 'sessionDateFrom', label: 'تاريخ الجلسة من', placeholder: '', type: 'date' },
      { key: 'sessionDateTo', label: 'إلى', placeholder: '', type: 'date' },
    ],
    showPrecision: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'ruling_number', label: 'رقم الحكم', width: 'w-28' },
      { key: 'judicial_year', label: 'السنة القضائية', width: 'w-32' },
      { key: 'session_date', label: 'تاريخ الجلسة', width: 'w-32' },
      { key: 'circuit', label: 'الدائرة', width: 'w-32' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'court_rulings',
    courtTypeFilter: 'الدستورية',
  },
  'supreme-admin': {
    title: 'الأحكام الإدارية العليا',
    subtitle: 'البحث في أحكام المحكمة الإدارية العليا',
    fields: [
      { key: 'query', label: 'مبدأ أو موضوع الطعن', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'legislationNumber', label: 'رقم الطعن', placeholder: 'رقم الطعن', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
      { key: 'circuit', label: 'الدائرة', placeholder: 'اختر الدائرة', type: 'select', options: ['الدائرة الأولى', 'الدائرة الثانية', 'الدائرة الثالثة'] },
      { key: 'sessionDateFrom', label: 'تاريخ الجلسة من', placeholder: '', type: 'date' },
      { key: 'sessionDateTo', label: 'إلى', placeholder: '', type: 'date' },
    ],
    showPrecision: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'ruling_number', label: 'رقم الطعن', width: 'w-28' },
      { key: 'judicial_year', label: 'السنة', width: 'w-24' },
      { key: 'session_date', label: 'تاريخ الجلسة', width: 'w-32' },
      { key: 'circuit', label: 'الدائرة', width: 'w-32' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'court_rulings',
    courtTypeFilter: 'الإدارية العليا',
  },
  unification: {
    title: 'دائرة توحيد المبادئ',
    subtitle: 'مبادئ المحكمة الإدارية العليا - دائرة توحيد المبادئ',
    fields: [
      { key: 'query', label: 'مبدأ أو موضوع', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'legislationNumber', label: 'رقم الطعن', placeholder: 'رقم الطعن', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
      { key: 'sessionDateFrom', label: 'تاريخ الجلسة من', placeholder: '', type: 'date' },
      { key: 'sessionDateTo', label: 'إلى', placeholder: '', type: 'date' },
    ],
    showPrecision: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'ruling_number', label: 'رقم الطعن', width: 'w-28' },
      { key: 'judicial_year', label: 'السنة', width: 'w-24' },
      { key: 'session_date', label: 'تاريخ الجلسة', width: 'w-32' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'court_rulings',
    courtTypeFilter: 'الإدارية العليا',
  },
  'admin-judiciary': {
    title: 'أحكام القضاء الإداري',
    subtitle: 'البحث في أحكام محكمة القضاء الإداري',
    fields: [
      { key: 'query', label: 'مبدأ أو موضوع الطعن', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'legislationNumber', label: 'رقم الطعن', placeholder: 'رقم الطعن', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
      { key: 'circuit', label: 'الدائرة', placeholder: 'اختر الدائرة', type: 'select', options: ['الدائرة الأولى', 'الدائرة الثانية', 'الدائرة الثالثة'] },
      { key: 'sessionDateFrom', label: 'تاريخ الجلسة من', placeholder: '', type: 'date' },
      { key: 'sessionDateTo', label: 'إلى', placeholder: '', type: 'date' },
    ],
    showPrecision: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'ruling_number', label: 'رقم الطعن', width: 'w-28' },
      { key: 'judicial_year', label: 'السنة', width: 'w-24' },
      { key: 'session_date', label: 'تاريخ الجلسة', width: 'w-32' },
      { key: 'circuit', label: 'الدائرة', width: 'w-32' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'court_rulings',
    courtTypeFilter: 'القضاء الإداري',
  },
  'admin-judiciary-2': {
    title: 'أحكام القضاء الإداري - حسب الدوائر',
    subtitle: 'تصفح أحكام القضاء الإداري مصنفة حسب الدوائر',
    fields: [
      { key: 'query', label: 'كلمات البحث', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'circuit', label: 'الدائرة', placeholder: 'اختر الدائرة', type: 'select', options: ['الدائرة الأولى', 'الدائرة الثانية', 'الدائرة الثالثة'] },
      { key: 'legislationNumber', label: 'رقم الطعن', placeholder: 'رقم الطعن', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
    ],
    showPrecision: false,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'ruling_number', label: 'رقم الطعن', width: 'w-28' },
      { key: 'judicial_year', label: 'السنة', width: 'w-24' },
      { key: 'session_date', label: 'تاريخ الجلسة', width: 'w-32' },
      { key: 'circuit', label: 'الدائرة', width: 'w-32' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'court_rulings',
    courtTypeFilter: 'القضاء الإداري',
  },
  fatwas: {
    title: 'فتاوى الجمعية العمومية',
    subtitle: 'البحث في فتاوى الجمعية العمومية لقسم التشريع بمجلس الدولة',
    fields: [
      { key: 'scope', label: 'نطاق البحث', placeholder: 'اختر النطاق', type: 'select', options: ['نص الفتوى', 'موضوع الفتوى', 'مبدأ الفتوى'] },
      { key: 'query', label: 'كلمات البحث', placeholder: 'كلمات البحث', type: 'text', full: true },
      { key: 'legislationNumber', label: 'رقم الفتوى', placeholder: 'رقم الفتوى', type: 'text' },
      { key: 'year', label: 'السنة', placeholder: 'السنة', type: 'text' },
      { key: 'fileNumber', label: 'رقم الملف', placeholder: 'رقم الملف', type: 'text' },
      { key: 'fatwaDateFrom', label: 'تاريخ الفتوى من', placeholder: '', type: 'date' },
      { key: 'fatwaDateTo', label: 'إلى', placeholder: '', type: 'date' },
    ],
    showPrecision: true,
    resultColumns: [
      { key: 'index', label: 'م', width: 'w-12' },
      { key: 'fatwa_number', label: 'رقم الفتوى', width: 'w-28' },
      { key: 'year', label: 'السنة', width: 'w-24' },
      { key: 'file_number', label: 'رقم الملف', width: 'w-28' },
      { key: 'fatwa_date', label: 'تاريخ الفتوى', width: 'w-32' },
      { key: 'subject', label: 'الموضوع', width: 'flex-1' },
      { key: 'actions', label: 'عرض', width: 'w-20' },
    ],
    dataSource: 'fatwas',
  },
};

export const legislationTypeOptions = [
  'دستور',
  'قانون',
  'قرارات جمهورية',
  'قرارات وزارية',
  'لوائح تنفيذية',
  'منشورات',
  'نصوص حاكمة',
];
