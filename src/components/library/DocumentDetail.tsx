import { useState } from 'react';
import {
  X,
  FileText,
  Image,
  Printer,
  Link2,
  ScrollText,
  Edit3,
  ChevronLeft,
} from 'lucide-react';
import type { ResultRow } from './ResultsTable';

interface DocumentDetailProps {
  document: ResultRow | null;
  dataSource: string;
  onClose: () => void;
  onNavigateBack?: () => void;
}

const toolbarTabs = [
  { id: 'text', label: 'نص الحكم / التشريع', icon: FileText },
  { id: 'image', label: 'صورة التشريع', icon: Image },
  { id: 'fatwas', label: 'الفتاوى', icon: ScrollText },
  { id: 'amendments', label: 'التعديلات', icon: Edit3 },
  { id: 'print', label: 'الطباعة', icon: Printer },
  { id: 'related', label: 'تشريعات مرتبطة', icon: Link2 },
];

export default function DocumentDetail({
  document,
  dataSource,
  onClose,
  onNavigateBack,
}: DocumentDetailProps) {
  const [activeTab, setActiveTab] = useState('text');

  if (!document) return null;

  const getHeader = (): string => {
    if (dataSource === 'court_rulings') {
      const courtType = document.court_type as string;
      if (courtType === 'النقض') return 'بسم الله الرحمن الرحيم\nباسم الشعب\nمحكمة النقض';
      if (courtType === 'الدستورية') return 'بسم الله الرحمن الرحيم\nباسم الشعب\nالمحكمة الدستورية العليا';
      if (courtType === 'الإدارية العليا') return 'بسم الله الرحمن الرحيم\nباسم الشعب\nمجلس الدولة — المحكمة الإدارية العليا';
      if (courtType === 'القضاء الإداري') return 'بسم الله الرحمن الرحيم\nباسم الشعب\nمجلس الدولة — محكمة القضاء الإداري';
      return 'بسم الله الرحمن الرحيم\nباسم الشعب';
    }
    if (dataSource === 'fatwas') {
      return 'بسم الله الرحمن الرحيم\nمجلس الدولة — الجمعية العمومية للفتاوى';
    }
    return 'بسم الله الرحمن الرحيم\nباسم الشعب';
  };

  const getMainContent = (): string => {
    if (dataSource === 'legislation') {
      return document.full_text as string || 'لا يتوفر النص الكامل لهذا التشريع.';
    }
    if (dataSource === 'court_rulings') {
      return document.ruling_text as string || 'لا يتوفر نص الحكم.';
    }
    if (dataSource === 'fatwas') {
      return document.text_content as string || 'لا يتوفر نص الفتوى.';
    }
    if (dataSource === 'gazette_issues') {
      return document.full_text as string || 'لا يتوفر النص الكامل لهذا العدد.';
    }
    return '';
  };

  const getPrinciple = (): string | null => {
    if (dataSource === 'court_rulings') return document.principle as string;
    if (dataSource === 'fatwas') return document.principle as string;
    return null;
  };

  const principle = getPrinciple();

  return (
    <div className="fixed inset-0 z-[80] bg-gray-50 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-1 text-ink/60 hover:text-gold transition-colors font-body text-sm"
            >
              <ChevronLeft size={18} />
              رجوع
            </button>
          )}
          <span className="font-body text-sm text-ink/40">|</span>
          <span className="font-heading font-bold text-midnight text-sm">
            {String(document.title || document.subject || `رقم ${document.ruling_number || document.fatwa_number || document.issue_number || ''}`)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-ink/40 hover:text-gold transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Toolbar tabs */}
      <div className="sticky top-[49px] z-10 bg-white border-b border-gray-100 px-6 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {toolbarTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-body text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'bg-midnight text-cream'
                    : 'text-ink/60 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {activeTab === 'text' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 lg:p-12">
            {/* Preamble */}
            <div className="text-center mb-8 pb-6 border-b border-gray-100">
              <pre className="font-heading font-bold text-midnight text-base whitespace-pre-wrap leading-loose">
                {String(getHeader())}
              </pre>
              {Boolean(document.circuit) && (
                <p className="font-body text-sm text-ink/60 mt-2">
                  {String(document.circuit)}
                </p>
              )}
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {dataSource === 'legislation' && (
                <>
                  <MetaItem label="رقم التشريع" value={String(document.legislation_number ?? '')} />
                  <MetaItem label="السنة" value={String(document.year)} />
                  <MetaItem label="النوع" value={String(document.type ?? '')} />
                  <MetaItem label="الحالة" value={String(document.status ?? '')} />
                </>
              )}
              {dataSource === 'court_rulings' && (
                <>
                  <MetaItem label="رقم الطعن" value={String(document.ruling_number ?? '')} />
                  <MetaItem label="السنة القضائية" value={String(document.judicial_year ?? '')} />
                  <MetaItem label="تاريخ الجلسة" value={String(document.session_date ?? '')} />
                  <MetaItem label="نوع القانون" value={String(document.ruling_type ?? '')} />
                </>
              )}
              {dataSource === 'fatwas' && (
                <>
                  <MetaItem label="رقم الفتوى" value={String(document.fatwa_number ?? '')} />
                  <MetaItem label="السنة" value={String(document.year ?? '')} />
                  <MetaItem label="رقم الملف" value={String(document.file_number ?? '')} />
                  <MetaItem label="تاريخ الفتوى" value={String(document.fatwa_date ?? '')} />
                </>
              )}
              {dataSource === 'gazette_issues' && (
                <>
                  <MetaItem label="رقم العدد" value={String(document.issue_number ?? '')} />
                  <MetaItem label="السنة" value={String(document.year)} />
                  <MetaItem label="تاريخ النشر" value={String(document.publication_date ?? '')} />
                  <MetaItem label="القطاع" value={String(document.sector ?? '')} />
                </>
              )}
            </div>

            {/* Subject */}
            {Boolean(document.subject) && (
              <div className="mb-6">
                <h3 className="font-heading font-bold text-midnight text-sm mb-2">الموضوع</h3>
                <p className="font-body text-sm text-ink/70 leading-[1.9]">
                  {String(document.subject)}
                </p>
              </div>
            )}

            {/* Appeal summary */}
            {Boolean(document.appeal_summary) && (
              <div className="mb-6">
                <h3 className="font-heading font-bold text-midnight text-sm mb-2">موجز الطعن</h3>
                <p className="font-body text-sm text-ink/70 leading-[1.9]">
                  {String(document.appeal_summary)}
                </p>
              </div>
            )}

            {/* Principle */}
            {Boolean(principle) && (
              <div className="mb-6 p-5 bg-gold/5 border-r-2 border-gold rounded-l-lg">
                <h3 className="font-heading font-bold text-gold text-sm mb-2">المبدأ القانوني</h3>
                <p className="font-body text-sm text-ink/80 leading-[2]">
                  {String(principle)}
                </p>
              </div>
            )}

            {/* Full text */}
            <div>
              <h3 className="font-heading font-bold text-midnight text-sm mb-3">النص الكامل</h3>
              <div className="font-body text-sm text-ink/70 leading-[2.1] whitespace-pre-wrap">
                {String(getMainContent())}
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'text' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            {(() => {
              const tab = toolbarTabs.find((t) => t.id === activeTab);
              const Icon = tab?.icon || FileText;
              return <Icon size={40} strokeWidth={1} className="text-ink/20 mx-auto mb-4" />;
            })()}
            <p className="font-body text-sm text-ink/50">
              {activeTab === 'image' && 'صورة التشريع الأصلية غير متوفرة حالياً.'}
              {activeTab === 'fatwas' && 'لا توجد فتاوى مرتبطة بهذا المستند حالياً.'}
              {activeTab === 'amendments' && 'لا توجد تعديلات مسجلة لهذا المستند حالياً.'}
              {activeTab === 'print' && 'يمكنك طباعة هذه الصفحة عبر متصفحك (Ctrl+P).'}
              {activeTab === 'related' && 'لا توجد تشريعات مرتبطة حالياً.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-center">
      <p className="font-body text-[10px] text-ink/40 mb-1">{label}</p>
      <p className="font-body text-sm text-ink/80">{value || '—'}</p>
    </div>
  );
}
