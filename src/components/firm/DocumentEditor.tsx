import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Youtube from '@tiptap/extension-youtube';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Code, Minus, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Youtube as YoutubeIcon, AlignRight, AlignCenter, AlignLeft, AlignJustify,
  Undo2, Redo2, Save, FileDown, FileText, FileType, Eye, EyeOff, Highlighter, Palette,
  ChevronDown, Plus, Trash2, CheckSquare, Clock, AlertCircle, FileEdit, Sparkles, Printer,
  RotateCcw, Columns3, Rows3, Square, PanelRightClose, PanelRightOpen,
  type LucideIcon,
} from 'lucide-react';

type ExportFormat = 'html' | 'txt' | 'md' | 'json';
type Direction = 'rtl' | 'ltr';

interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface EditorDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'doc_editor_docs';

function loadDocs(): EditorDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EditorDoc[];
  } catch {
    return [];
  }
}

function saveDocs(docs: EditorDoc[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

const PRIORITY_COLORS: Record<TaskItem['priority'], string> = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  high: 'text-red-600 bg-red-50 border-red-200',
};

const PRIORITY_LABELS: Record<TaskItem['priority'], string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
};

function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.innerText;
}

function htmlToMarkdown(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  let md = '';
  for (const node of Array.from(div.childNodes)) {
    const el = node as HTMLElement;
    if (el.nodeType === Node.TEXT_NODE) {
      md += el.textContent || '';
      continue;
    }
    const tag = el.tagName?.toLowerCase();
    if (tag === 'h1') md += `\n# ${el.textContent}\n`;
    else if (tag === 'h2') md += `\n## ${el.textContent}\n`;
    else if (tag === 'h3') md += `\n### ${el.textContent}\n`;
    else if (tag === 'p') md += `\n${el.textContent}\n`;
    else if (tag === 'ul') {
      for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
        md += `- ${li.textContent}\n`;
      }
    } else if (tag === 'ol') {
      let i = 1;
      for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
        md += `${i}. ${li.textContent}\n`;
        i++;
      }
    } else if (tag === 'blockquote') md += `\n> ${el.textContent}\n`;
    else if (tag === 'pre') md += `\n\`\`\`\n${el.textContent}\n\`\`\`\n`;
    else if (tag === 'hr') md += `\n---\n`;
    else md += el.textContent || '';
  }
  return md.trim();
}

export default function DocumentEditor() {
  const [direction, setDirection] = useState<Direction>('rtl');
  const [title, setTitle] = useState('مستند جديد');
  const [docs, setDocs] = useState<EditorDoc[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [savedStatus, setSavedStatus] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [colorPaletteOpen, setColorPaletteOpen] = useState(false);
  const [highlightColorOpen, setHighlightColorOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskItem['priority']>('medium');
  const [showTaskPanel, setShowTaskPanel] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Color,
      TextStyle,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: 'ابدأ الكتابة هنا... اكتب / لعرض الأوامر السريعة',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ controls: false, nocookie: true }),
    ],
    content: '<h2>مستند جديد</h2><p>ابدأ الكتابة هنا...</p>',
    editorProps: {
      attributes: {
        class: 'prose-editor',
        dir: 'rtl',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setCharCount(text.length);
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    },
  });

  useEffect(() => {
    const loaded = loadDocs();
    setDocs(loaded);
  }, []);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!showPreview);
    }
  }, [editor, showPreview]);

  const persistDocs = useCallback((updated: EditorDoc[]) => {
    setDocs(updated);
    saveDocs(updated);
  }, []);

  const handleNewDoc = useCallback(() => {
    if (editor) {
      editor.commands.setContent('<h2>مستند جديد</h2><p>ابدأ الكتابة هنا...</p>');
    }
    setTitle('مستند جديد');
    setCurrentDocId(null);
    setSavedStatus('');
  }, [editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const content = editor.getHTML();
    const now = new Date().toISOString();
    if (currentDocId) {
      const updated = docs.map((d) =>
        d.id === currentDocId ? { ...d, title, content, updatedAt: now } : d
      );
      persistDocs(updated);
    } else {
      const newDoc: EditorDoc = {
        id: crypto.randomUUID(),
        title,
        content,
        createdAt: now,
        updatedAt: now,
      };
      persistDocs([...docs, newDoc]);
      setCurrentDocId(newDoc.id);
    }
    setSavedStatus('تم الحفظ بنجاح');
    setTimeout(() => setSavedStatus(''), 2500);
  }, [editor, currentDocId, docs, title, persistDocs]);

  const handleLoadDoc = useCallback((doc: EditorDoc) => {
    if (!editor) return;
    editor.commands.setContent(doc.content);
    setTitle(doc.title);
    setCurrentDocId(doc.id);
    setSavedStatus('');
  }, [editor]);

  const handleDeleteDoc = useCallback((id: string) => {
    const updated = docs.filter((d) => d.id !== id);
    persistDocs(updated);
    if (currentDocId === id) {
      handleNewDoc();
    }
  }, [docs, currentDocId, persistDocs, handleNewDoc]);

  const toggleDirection = useCallback(() => {
    const newDir: Direction = direction === 'rtl' ? 'ltr' : 'rtl';
    setDirection(newDir);
    if (editor) {
      editor.view.dom.setAttribute('dir', newDir);
      editor.commands.setTextAlign(newDir === 'rtl' ? 'right' : 'left');
    }
  }, [direction, editor]);

  const handleExport = useCallback((format: ExportFormat) => {
    if (!editor) return;
    const content = editor.getHTML();
    let exportContent = '';
    let mimeType = '';
    let extension = '';

    switch (format) {
      case 'html':
        exportContent = `<!DOCTYPE html>\n<html lang="ar" dir="${direction}">\n<head>\n<meta charset="UTF-8">\n<title>${title}</title>\n</head>\n<body>\n${content}\n</body>\n</html>`;
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'txt':
        exportContent = `${title}\n${'='.repeat(title.length)}\n\n${htmlToText(content)}`;
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'md':
        exportContent = `# ${title}\n\n${htmlToMarkdown(content)}`;
        mimeType = 'text/markdown';
        extension = 'md';
        break;
      case 'json':
        exportContent = JSON.stringify({ title, content, direction, exportedAt: new Date().toISOString() }, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
    }

    const blob = new Blob([exportContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^\w\u0600-\u06FF\s-]/g, '').trim() || 'document'}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  }, [editor, title, direction]);

  const handlePrint = useCallback(() => {
    if (!editor) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html><html lang="ar" dir="${direction}"><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:'Tajawal',sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8}h1,h2,h3{font-family:'Cairo',sans-serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}img{max-width:100%}blockquote{border-right:3px solid #C5A059;padding-right:12px;margin-right:0;color:#555}pre{background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto}code{background:#f4f4f4;padding:2px 6px;border-radius:3px}</style></head><body>${editor.getHTML()}</body></html>`);
    printWin.document.close();
    printWin.print();
  }, [editor, title, direction]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
    setImageModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [editor]);

  const insertImageByUrl = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run();
    setImageUrl('');
    setImageAlt('');
    setImageModalOpen(false);
  }, [editor, imageUrl, imageAlt]);

  const insertLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    const isSelection = editor.state.selection.content().size > 0;
    if (isSelection) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkUrl}</a>`).run();
    }
    setLinkUrl('');
    setLinkModalOpen(false);
  }, [editor, linkUrl]);

  const insertYoutube = useCallback(() => {
    if (!editor || !youtubeUrl) return;
    editor.chain().focus().setYoutubeVideo({ src: youtubeUrl }).run();
    setYoutubeUrl('');
    setYoutubeModalOpen(false);
  }, [editor, youtubeUrl]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run();
    setTableModalOpen(false);
  }, [editor, tableRows, tableCols]);

  const setTextColor = useCallback((color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
    setColorPaletteOpen(false);
  }, [editor]);

  const setHighlightColor = useCallback((color: string) => {
    if (!editor) return;
    editor.chain().focus().setHighlight({ color }).run();
    setHighlightColorOpen(false);
  }, [editor]);

  const clearFormatting = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  }, [editor]);

  const addTask = useCallback(() => {
    if (!newTaskText.trim()) return;
    const task: TaskItem = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      done: false,
      priority: newTaskPriority,
    };
    setTasks((prev) => [...prev, task]);
    setNewTaskText('');
  }, [newTaskText, newTaskPriority]);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completedTasks = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen bg-midnight">
        <div className="text-gold animate-pulse font-heading">جارٍ تحميل المحرر...</div>
      </div>
    );
  }

  const ToolbarButton = ({
    onClick, isActive, disabled, icon: Icon, label,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    icon: LucideIcon;
    label: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-2 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-gold/20 text-gold'
          : 'text-ink/60 hover:bg-midnight/10 hover:text-midnight'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <Icon size={16} />
    </button>
  );

  const Divider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

  const COLORS = ['#000000', '#C5A059', '#DC2626', '#2563EB', '#16A34A', '#9333EA', '#EA580C', '#0891B2', '#6B7280'];
  const HIGHLIGHT_COLORS = ['#FCD34D', '#FCA5A5', '#A7F3D0', '#BFDBFE', '#DDD6FE', '#FED7AA', '#67E8F9', '#FECDD3'];

  return (
    <div className="flex flex-col h-screen bg-cream" dir={direction}>
      {/* Top bar */}
      <div className="bg-midnight text-cream px-4 py-2.5 flex items-center justify-between flex-shrink-0 border-b border-gold/20">
        <div className="flex items-center gap-3">
          <FileEdit size={20} className="text-gold" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-cream font-heading font-bold text-base border-none outline-none focus:bg-midnight-light/50 px-2 py-1 rounded transition-colors min-w-[200px]"
            placeholder="عنوان المستند"
          />
        </div>
        <div className="flex items-center gap-2">
          {savedStatus && (
            <span className="text-green-400 text-xs font-body flex items-center gap-1 animate-fade-in">
              <CheckSquare size={12} /> {savedStatus}
            </span>
          )}
          <span className="text-cream/40 text-xs font-body hidden sm:inline">
            {wordCount} كلمة · {charCount} حرف
          </span>
          <button
            onClick={handleNewDoc}
            className="px-3 py-1.5 rounded-lg bg-midnight-light hover:bg-midnight-light/70 text-cream text-xs font-body flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> جديد
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-gold hover:bg-gold-dark text-midnight text-xs font-body font-bold flex items-center gap-1.5 transition-colors"
          >
            <Save size={14} /> حفظ
          </button>
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="px-3 py-1.5 rounded-lg bg-midnight-light hover:bg-midnight-light/70 text-cream text-xs font-body flex items-center gap-1.5 transition-colors"
            >
              <FileDown size={14} /> تصدير <ChevronDown size={12} />
            </button>
            {exportDropdownOpen && (
              <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[160px]">
                <button onClick={() => handleExport('html')} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-xs text-ink font-body">
                  <FileText size={14} className="text-blue-600" /> HTML
                </button>
                <button onClick={() => handleExport('txt')} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-xs text-ink font-body">
                  <FileText size={14} className="text-gray-600" /> نص عادي (TXT)
                </button>
                <button onClick={() => handleExport('md')} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-xs text-ink font-body">
                  <FileType size={14} className="text-green-600" /> Markdown (MD)
                </button>
                <button onClick={() => handleExport('json')} className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-xs text-ink font-body">
                  <FileType size={14} className="text-amber-600" /> JSON
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-midnight-light hover:bg-midnight-light/70 text-cream text-xs font-body flex items-center gap-1.5 transition-colors"
          >
            <Printer size={14} /> طباعة
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="px-3 py-1.5 rounded-lg bg-midnight-light hover:bg-midnight-light/70 text-cream text-xs font-body flex items-center gap-1.5 transition-colors"
          >
            {showSidebar ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Documents sidebar */}
        {showSidebar && (
          <div className="w-60 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h3 className="font-heading font-bold text-midnight text-sm flex items-center gap-1.5">
                <FileText size={14} className="text-gold" /> المستندات المحفوظة
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {docs.length === 0 ? (
                <p className="text-ink/30 text-xs font-body p-3 text-center">لا توجد مستندات محفوظة بعد</p>
              ) : (
                docs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleLoadDoc(doc)}
                    className={`px-3 py-2.5 cursor-pointer border-b border-gray-50 group transition-colors ${
                      currentDocId === doc.id ? 'bg-gold/10' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-bold text-midnight truncate">{doc.title}</p>
                        <p className="font-body text-[10px] text-ink/40 mt-0.5">
                          {new Date(doc.updatedAt).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                        className="text-ink/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center flex-wrap gap-0.5 flex-shrink-0">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} icon={Undo2} label="تراجع" />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} icon={Redo2} label="إعادة" />
            <Divider />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} icon={Heading1} label="عنوان 1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} icon={Heading2} label="عنوان 2" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} icon={Heading3} label="عنوان 3" />
            <Divider />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} icon={Bold} label="عريض" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} icon={Italic} label="مائل" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} icon={UnderlineIcon} label="تحته خط" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} icon={Strikethrough} label="يتوسطه خط" />
            <Divider />
            <div className="relative">
              <ToolbarButton onClick={() => setColorPaletteOpen(!colorPaletteOpen)} isActive={colorPaletteOpen} icon={Palette} label="لون النص" />
              {colorPaletteOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 grid grid-cols-3 gap-1">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setTextColor(c)} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <ToolbarButton onClick={() => setHighlightColorOpen(!highlightColorOpen)} isActive={highlightColorOpen} icon={Highlighter} label="تمييز" />
              {highlightColorOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 grid grid-cols-4 gap-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button key={c} onClick={() => setHighlightColor(c)} className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              )}
            </div>
            <Divider />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} icon={List} label="قائمة نقطية" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} icon={ListOrdered} label="قائمة مرقمة" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')} icon={ListChecks} label="قائمة مهام" />
            <Divider />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} icon={Quote} label="اقتباس" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} icon={Code} label="كود" />
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} label="خط فاصل" />
            <Divider />
            <ToolbarButton onClick={() => setLinkModalOpen(true)} isActive={editor.isActive('link')} icon={LinkIcon} label="رابط" />
            <ToolbarButton onClick={() => setImageModalOpen(true)} icon={ImageIcon} label="صورة" />
            <ToolbarButton onClick={() => setTableModalOpen(true)} icon={TableIcon} label="جدول" />
            <ToolbarButton onClick={() => setYoutubeModalOpen(true)} icon={YoutubeIcon} label="فيديو يوتيوب" />
            <Divider />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} icon={AlignRight} label="محاذاة يمين" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} icon={AlignCenter} label="توسيط" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} icon={AlignLeft} label="محاذاة يسار" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} icon={AlignJustify} label="ضبط" />
            <Divider />
            <ToolbarButton onClick={toggleDirection} icon={RotateCcw} label="تبديل اتجاه الكتابة" />
            <ToolbarButton onClick={() => setShowPreview(!showPreview)} isActive={showPreview} icon={showPreview ? EyeOff : Eye} label="معاينة" />
            <ToolbarButton onClick={clearFormatting} icon={Sparkles} label="مسح التنسيق" />
            <Divider />
            <button
              onClick={() => setShowTaskPanel(!showTaskPanel)}
              className={`px-3 py-2 rounded-lg text-xs font-body flex items-center gap-1.5 transition-colors ${
                showTaskPanel ? 'bg-gold/20 text-gold' : 'text-ink/60 hover:bg-midnight/10'
              }`}
            >
              <CheckSquare size={14} /> المهام
              {totalTasks > 0 && (
                <span className="bg-gold text-midnight rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {completedTasks}/{totalTasks}
                </span>
              )}
            </button>
          </div>

          {/* Table context toolbar */}
          {editor.isActive('table') && (
            <div className="bg-midnight/5 border-b border-gray-200 px-3 py-1.5 flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-body text-ink/40 ml-2">جدول:</span>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnBefore().run()} icon={Columns3} label="عمود قبل" />
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} icon={Columns3} label="عمود بعد" />
              <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} icon={Trash2} label="حذف عمود" />
              <Divider />
              <ToolbarButton onClick={() => editor.chain().focus().addRowBefore().run()} icon={Rows3} label="صف قبل" />
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} icon={Rows3} label="صف بعد" />
              <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} icon={Trash2} label="حذف صف" />
              <Divider />
              <ToolbarButton onClick={() => editor.chain().focus().mergeCells().run()} icon={Square} label="دمج خلايا" />
              <ToolbarButton onClick={() => editor.chain().focus().splitCell().run()} icon={Columns3} label="تقسيم خلية" />
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeaderRow().run()} icon={TableIcon} label="ترويسة" />
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} icon={Trash2} label="حذف الجدول" />
            </div>
          )}

          {/* Editor content area */}
          <div className="flex-1 overflow-y-auto bg-cream/50 flex justify-center">
            <div className="w-full max-w-4xl bg-white shadow-lg my-4 mx-4 rounded-xl overflow-hidden">
              {showPreview ? (
                <div
                  className="prose-preview p-8 min-h-[500px]"
                  dir={direction}
                  dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
                />
              ) : (
                <EditorContent editor={editor} className="editor-wrapper" />
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="bg-white border-t border-gray-200 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 text-xs font-body text-ink/40">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {currentDocId ? new Date(docs.find(d => d.id === currentDocId)?.updatedAt || Date.now()).toLocaleString('ar-EG') : 'غير محفوظ'}
              </span>
              <span>·</span>
              <span>اتجاه: {direction === 'rtl' ? 'يمين لليسار' : 'يسار لليمين'}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-body text-ink/40">
              {tasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle size={12} /> {tasks.filter(t => !t.done).length} مهمة معلقة
                </span>
              )}
              <span>·</span>
              <span>{charCount} حرف · {wordCount} كلمة</span>
            </div>
          </div>
        </div>

        {/* Task panel */}
        {showTaskPanel && (
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h3 className="font-heading font-bold text-midnight text-sm flex items-center gap-1.5">
                <CheckSquare size={14} className="text-gold" /> قائمة المهام
              </h3>
              {totalTasks > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] font-body text-ink/40 mb-1">
                    <span>{completedTasks} من {totalTasks}</span>
                    <span>{Math.round((completedTasks / totalTasks) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full transition-all duration-300" style={{ width: `${(completedTasks / totalTasks) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="px-3 py-2 border-b border-gray-100 space-y-2">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="أضف مهمة جديدة..."
                className="w-full px-2.5 py-1.5 text-xs font-body border border-gray-200 rounded-lg focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all"
              />
              <div className="flex items-center gap-1">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewTaskPriority(p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-body border transition-all ${
                      newTaskPriority === p ? PRIORITY_COLORS[p] : 'border-gray-200 text-ink/30 hover:bg-gray-50'
                    }`}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
                <button
                  onClick={addTask}
                  className="mr-auto px-2 py-0.5 rounded bg-gold/10 text-gold text-[10px] font-body font-bold hover:bg-gold/20 transition-colors"
                >
                  إضافة
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-ink/30 text-xs font-body p-3 text-center">لا توجد مهام بعد</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="px-3 py-2 border-b border-gray-50 group flex items-start gap-2">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        task.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-gold'
                      }`}
                    >
                      {task.done && <CheckSquare size={10} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-body ${task.done ? 'line-through text-ink/30' : 'text-ink/70'}`}>{task.text}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-body border ${PRIORITY_COLORS[task.priority]}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-ink/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Link modal */}
      {linkModalOpen && (
        <Modal onClose={() => setLinkModalOpen(false)} title="إدراج رابط">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && insertLink()}
            placeholder="https://example.com"
            className="form-input"
            autoFocus
          />
          <ModalButtons onCancel={() => setLinkModalOpen(false)} onConfirm={insertLink} confirmLabel="إدراج" />
        </Modal>
      )}

      {/* Image modal */}
      {imageModalOpen && (
        <Modal onClose={() => setImageModalOpen(false)} title="إدراج صورة">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-body text-ink/40 mb-1">رفع من الجهاز</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs font-body text-ink/60 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gold/10 file:text-gold file:font-bold file:cursor-pointer hover:file:bg-gold/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-body text-ink/30">أو</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-body text-ink/40 mb-1">رابط الصورة (URL)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-ink/40 mb-1">وصف بديل (Alt)</label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="وصف الصورة"
                className="form-input"
              />
            </div>
          </div>
          <ModalButtons onCancel={() => setImageModalOpen(false)} onConfirm={insertImageByUrl} confirmLabel="إدراج" />
        </Modal>
      )}

      {/* YouTube modal */}
      {youtubeModalOpen && (
        <Modal onClose={() => setYoutubeModalOpen(false)} title="إدراج فيديو يوتيوب">
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="form-input"
            autoFocus
          />
          <ModalButtons onCancel={() => setYoutubeModalOpen(false)} onConfirm={insertYoutube} confirmLabel="إدراج" />
        </Modal>
      )}

      {/* Table modal */}
      {tableModalOpen && (
        <Modal onClose={() => setTableModalOpen(false)} title="إدراج جدول">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body text-ink/40 mb-1">عدد الصفوف</label>
              <input
                type="number"
                min={1}
                max={20}
                value={tableRows}
                onChange={(e) => setTableRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-body text-ink/40 mb-1">عدد الأعمدة</label>
              <input
                type="number"
                min={1}
                max={10}
                value={tableCols}
                onChange={(e) => setTableCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="form-input"
              />
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="border-collapse border border-gray-200 w-full">
              <tbody>
                {Array.from({ length: Math.min(tableRows, 5) }).map((_, r) => (
                  <tr key={r}>
                    {Array.from({ length: Math.min(tableCols, 5) }).map((_, c) => (
                      <td key={c} className={`border border-gray-200 px-3 py-1.5 text-center text-xs ${r === 0 ? 'bg-gray-50 font-bold' : ''}`}>
                        {r === 0 ? `عمود ${c + 1}` : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(tableRows > 5 || tableCols > 5) && (
              <p className="text-xs text-ink/40 font-body text-center mt-1">معاينة مبسطة — سيتم إنشاء الجدول بالكامل</p>
            )}
          </div>
          <ModalButtons onCancel={() => setTableModalOpen(false)} onConfirm={insertTable} confirmLabel="إنشاء الجدول" />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading font-bold text-midnight text-sm mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ onCancel, onConfirm, confirmLabel }: { onCancel: () => void; onConfirm: () => void; confirmLabel: string }) {
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-xs font-body text-ink/60 hover:bg-gray-100 transition-colors">
        إلغاء
      </button>
      <button onClick={onConfirm} className="px-4 py-1.5 rounded-lg bg-gold hover:bg-gold-dark text-midnight text-xs font-body font-bold transition-colors">
        {confirmLabel}
      </button>
    </div>
  );
}
