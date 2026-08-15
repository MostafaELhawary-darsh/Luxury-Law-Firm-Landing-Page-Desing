import React, { useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import { Download, Upload, FileText, Save, Settings } from 'lucide-react';
import { VideoNode } from './extensions/VideoNode';
import { ExportModal } from './ExportModal';
import type { VideoNodeAttrs } from './extensions/VideoNode';

const API_BASE = 'http://127.0.0.1:8000';

interface EditorState {
  isSaving: boolean;
  lastSaved: Date | null;
  status: string;
}

const HybridDocumentEditor: React.FC = () => {
  const [editorState, setEditorState] = useState<EditorState>({
    isSaving: false,
    lastSaved: null,
    status: '✅ جاهز',
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<Map<string, string>>(new Map());
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4 border shadow-sm cursor-pointer',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      VideoNode,
      Placeholder.configure({
        placeholder: '🖊️ ابدأ بكتابة محتوى المستند...',
      }),
    ],
    content: `
      <h1>📄 محرر المستندات - Hybrid Editor</h1>
      <p>مرحباً بك في محرر المستندات المتقدم مع معالجة خادم FastAPI المحلي.</p>
      <p>يمكنك إدراج الصور والفيديو وتصدير إلى أي صيغة مدعومة!</p>
    `,
  });

  if (!editor) {
    return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  }

  // ==================== Media Upload Handlers ====================
  const handleMediaUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
      const file = event.target.files?.[0];
      if (!file) return;

      setEditorState((prev) => ({
        ...prev,
        status: `🔄 جاري رفع ${type === 'image' ? 'الصورة' : 'الفيديو'}...`,
      }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/api/media/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        setUploadedAssets((prev) => new Map(prev).set(file.name, data.url));

        if (type === 'image') {
          editor.chain().focus().setImage({ src: data.url }).run();
        } else {
          const videoAttrs: VideoNodeAttrs = {
            src: data.url,
            width: 500,
            height: 280,
          };
          editor.chain().focus().insertContent({
            type: 'video',
            attrs: videoAttrs,
          }).run();
        }

        setEditorState((prev) => ({
          ...prev,
          status: `✅ تم رفع ${type === 'image' ? 'الصورة' : 'الفيديو'} بنجاح`,
        }));
      } catch (err) {
        setEditorState((prev) => ({
          ...prev,
          status: `❌ خطأ في رفع ${type === 'image' ? 'الصورة' : 'الفيديو'}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }));
      }
    },
    [editor]
  );

  // ==================== Export Handler ====================
  const handleExport = useCallback(
    async (format: string, title: string) => {
      setEditorState((prev) => ({
        ...prev,
        isSaving: true,
        status: `🔄 جاري تصدير إلى ${format.toUpperCase()}...`,
      }));

      try {
        const response = await fetch(`${API_BASE}/api/document/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html_content: editor.getHTML(),
            output_format: format,
            document_title: title,
            author: 'Luxury Law Firm',
            file_name: title.replace(/\s+/g, '_'),
          }),
        });

        if (!response.ok) throw new Error('Export failed');

        const data = await response.json();

        // Download file
        const downloadResponse = await fetch(
          `${API_BASE}/api/documents/download/${data.file_name}`,
          { method: 'GET' }
        );

        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = data.file_name;
          link.click();
          window.URL.revokeObjectURL(url);
        }

        setEditorState((prev) => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
          status: `✅ تم التصدير بنجاح إلى ${format.toUpperCase()}`,
        }));

        setIsExportOpen(false);
      } catch (err) {
        setEditorState((prev) => ({
          ...prev,
          isSaving: false,
          status: `❌ خطأ في التصدير: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }));
      }
    },
    [editor]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white dir-rtl">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">محرر المستندات - Hybrid</h1>
                <p className="text-sm text-slate-400">Python FastAPI Backend</p>
              </div>
            </div>

            {/* Status Info */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">الحالة</p>
                <p className="text-sm font-semibold">{editorState.status}</p>
              </div>
              {editorState.lastSaved && (
                <div className="text-right text-xs text-slate-400">
                  آخر حفظ: {editorState.lastSaved.toLocaleTimeString('ar-EG')}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

