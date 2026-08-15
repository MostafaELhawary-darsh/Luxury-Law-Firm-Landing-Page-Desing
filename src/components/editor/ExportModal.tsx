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

