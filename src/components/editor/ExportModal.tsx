import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string, title: string) => Promise<void>;
  isLoading: boolean;
}

const EXPORT_FORMATS = [
  { id: 'docx', label: 'Word Document', icon: '📄', description: 'Microsoft Word (.docx)' },
  { id: 'pdf', label: 'PDF Document', icon: '📕', description: 'Adobe PDF (.pdf)' },
  { id: 'md', label: 'Markdown', icon: '📝', description: 'Markdown Format (.md)' },
  { id: 'epub', label: 'E-Book', icon: '📖', description: 'EPUB Format (.epub)' },
  { id: 'html', label: 'Web Page', icon: '🌐', description: 'HTML Format (.html)' },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  isLoading,
}) => {
  const [title, setTitle] = useState('My Document');
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);

  const handleExport = async () => {
    if (!selectedFormat || !title.trim()) return;
    await onExport(selectedFormat, title.trim());
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4 z-50">
        <div className="bg-slate-800 rounded-lg shadow-2xl overflow-hidden border border-slate-700">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-700/50">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تصدير المستند
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-600 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-200">عنوان المستند</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان المستند..."
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-slate-200">اختر صيغة التصدير</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EXPORT_FORMATS.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedFormat === format.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-2xl mb-2">{format.icon}</div>
                    <div className="font-semibold text-white">{format.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{format.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Info */}
            {selectedFormat && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                <p className="text-sm text-blue-200">
                  {selectedFormat === 'docx' && '✅ سيتم تصدير المستند إلى صيغة Word القابلة للتحرير'}
                  {selectedFormat === 'pdf' && '✅ سيتم تصدير المستند كملف PDF محمي'}
                  {selectedFormat === 'md' && '✅ سيتم تصدير المستند بصيغة Markdown'}
                  {selectedFormat === 'epub' && '✅ سيتم تصدير المستند ككتاب إلكتروني'}
                  {selectedFormat === 'html' && '✅ سيتم تصدير المستند كصفحة ويب'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 bg-slate-700/50 border-t border-slate-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium transition-colors text-white"
            >
              إلغاء
            </button>
            <button
              onClick={handleExport}
              disabled={!selectedFormat || !title.trim() || isLoading}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-white"
            >
              {isLoading ? 'جاري التصدير...' : 'تصدير المستند'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
