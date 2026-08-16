import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Upload,
  FileText,
  Link2,
  Files,
  Search,
  Filter,
  Trash2,
  Download,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Loader2,
  Tag,
  Calendar,
  User,
  Globe,
  FileType,
  HardDrive,
  TrendingUp,
  Clock,
  ChevronDown,
} from 'lucide-react';
import {
  DOC_TYPE_LABELS,
  STATUS_LABELS,
  LANGUAGES,
  LANGUAGE_LABELS,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_FILE_LABEL,
  type LegalDocument,
} from '@/lib/documentTypes';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type UploadTab = 'file' | 'url' | 'bulk' | 'manual';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResult {
  status: UploadStatus;
  message: string;
  fileName?: string;
}

interface BulkFileEntry {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface LibraryStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  totalSize: number;
  legislationCount: number;
  rulingsCount: number;
  fatwasCount: number;
  gazetteCount: number;
}

const DOC_TYPE_OPTIONS = Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_BADGE = STATUS_LABELS;

const getFileFormat = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const formatMap: Record<string, string> = {
    pdf: 'pdf', doc: 'doc', docx: 'docx', txt: 'txt', rtf: 'rtf',
    html: 'html', htm: 'html', jpg: 'jpg', jpeg: 'jpg', png: 'png',
    gif: 'gif', bmp: 'bmp', tiff: 'tiff', csv: 'csv', xlsx: 'xlsx',
    xls: 'xls', odt: 'odt', md: 'md',
  };
  return formatMap[ext] || ext || 'unknown';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function LibraryDashboard() {
  const [activeTab, setActiveTab] = useState<UploadTab>('file');
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
  const [stats, setStats] = useState<LibraryStats>({ total: 0, byType: {} as Record<string, number>, byStatus: {} as Record<string, number>, totalSize: 0, legislationCount: 0, rulingsCount: 0, fatwasCount: 0, gazetteCount: 0 });

  // Single file upload state
  const [dragOver, setDragOver] = useState(false);
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleMeta, setSingleMeta] = useState({ title: '', doc_type: 'other', language: 'ar', tags: '' });
  const [uploadResult, setUploadResult] = useState<UploadResult>({ status: 'idle', message: '' });

  // URL import state
  const [urlInput, setUrlInput] = useState('');
  const [urlMeta, setUrlMeta] = useState({ title: '', doc_type: 'other', language: 'ar', tags: '' });
  const [urlResult, setUrlResult] = useState<UploadResult>({ status: 'idle', message: '' });

  // Bulk upload state
  const [bulkFiles, setBulkFiles] = useState<BulkFileEntry[]>([]);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const [bulkMeta, setBulkMeta] = useState({ doc_type: 'other', language: 'ar', tags: '' });

  // Manual entry state
  const [manualForm, setManualForm] = useState({ title: '', doc_type: 'other', language: 'ar', content_text: '', tags: '' });
  const [manualResult, setManualResult] = useState<UploadResult>({ status: 'idle', message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const [docsRes, legRes, rulingsRes, fatwasRes, gazetteRes] = await Promise.all([
      supabase.from('ld_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('legislation').select('id', { count: 'exact', head: true }),
      supabase.from('court_rulings').select('id', { count: 'exact', head: true }),
      supabase.from('fatwas').select('id', { count: 'exact', head: true }),
      supabase.from('gazette_issues').select('id', { count: 'exact', head: true }),
    ]);
    if (docsRes.error) {
      console.error('Fetch error:', docsRes.error);
    } else {
      const data = docsRes.data;
      setDocuments((data as LegalDocument[]) || []);
      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let totalSize = 0;
      (data as LegalDocument[] || []).forEach((doc) => {
        byType[doc.doc_type] = (byType[doc.doc_type] || 0) + 1;
        byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
        totalSize += doc.file_size_bytes || 0;
      });
      setStats({
        total: (data as LegalDocument[])?.length || 0,
        byType,
        byStatus,
        totalSize,
        legislationCount: legRes.count || 0,
        rulingsCount: rulingsRes.count || 0,
        fatwasCount: fatwasRes.count || 0,
        gazetteCount: gazetteRes.count || 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // ===== Single File Upload =====
  const handleSingleUpload = async () => {
    if (!singleFile) return;
    setUploadResult({ status: 'uploading', message: 'جاري رفع المستند...' });
    try {
      const fileFormat = getFileFormat(singleFile.name);
      const title = singleMeta.title.trim() || singleFile.name.replace(/\.[^/.]+$/, '');
      const tags = singleMeta.tags ? singleMeta.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

      const { data, error } = await supabase.from('ld_documents').insert({
        title,
        doc_type: singleMeta.doc_type,
        language: singleMeta.language,
        content_text: '',
        file_url: singleFile.name,
        file_format: fileFormat,
        file_size_bytes: singleFile.size,
        status: 'uploaded',
        uploaded_by: 'الشريك الإداري',
        tags,
      }).select().single();

      if (error) throw error;
      setUploadResult({ status: 'success', message: 'تم رفع المستند بنجاح', fileName: title });
      setSingleFile(null);
      setSingleMeta({ title: '', doc_type: 'other', language: 'ar', tags: '' });
      fetchDocuments();
    } catch (err) {
      setUploadResult({ status: 'error', message: 'فشل رفع المستند: ' + (err as Error).message });
    }
  };

  // ===== URL Import =====
  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlResult({ status: 'uploading', message: 'جاري استيراد المستند من الرابط...' });
    try {
      const title = urlMeta.title.trim() || urlInput.split('/').pop() || 'مستند مستورد';
      const tags = urlMeta.tags ? urlMeta.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const fileFormat = getFileFormat(urlInput);

      const { error } = await supabase.from('ld_documents').insert({
        title,
        doc_type: urlMeta.doc_type,
        language: urlMeta.language,
        content_text: '',
        file_url: urlInput.trim(),
        file_format: fileFormat,
        file_size_bytes: 0,
        status: 'uploaded',
        uploaded_by: 'الشريك الإداري',
        tags,
      });

      if (error) throw error;
      setUrlResult({ status: 'success', message: 'تم استيراد المستند بنجاح' });
      setUrlInput('');
      setUrlMeta({ title: '', doc_type: 'other', language: 'ar', tags: '' });
      fetchDocuments();
    } catch (err) {
      setUrlResult({ status: 'error', message: 'فشل الاستيراد: ' + (err as Error).message });
    }
  };

  // ===== Bulk Upload =====
  const handleBulkFileAdd = (files: FileList) => {
    const entries: BulkFileEntry[] = Array.from(files).map((file) => ({
      file, progress: 0, status: 'pending' as const,
    }));
    setBulkFiles((prev) => [...prev, ...entries]);
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    const tags = bulkMeta.tags ? bulkMeta.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

    for (let i = 0; i < bulkFiles.length; i++) {
      setBulkFiles((prev) => prev.map((entry, idx) => idx === i ? { ...entry, status: 'uploading' } : entry));
      try {
        const file = bulkFiles[i].file;
        const fileFormat = getFileFormat(file.name);
        const title = file.name.replace(/\.[^/.]+$/, '');

        const { error } = await supabase.from('ld_documents').insert({
          title,
          doc_type: bulkMeta.doc_type,
          language: bulkMeta.language,
          content_text: '',
          file_url: file.name,
          file_format: fileFormat,
          file_size_bytes: file.size,
          status: 'uploaded',
          uploaded_by: 'الشريك الإداري',
          tags,
        });

        if (error) throw error;
        setBulkFiles((prev) => prev.map((entry, idx) => idx === i ? { ...entry, status: 'done', progress: 100 } : entry));
      } catch (err) {
        setBulkFiles((prev) => prev.map((entry, idx) => idx === i ? { ...entry, status: 'error', error: (err as Error).message } : entry));
      }
    }
    fetchDocuments();
  };

  // ===== Manual Entry =====
  const handleManualSubmit = async () => {
    if (!manualForm.title.trim()) return;
    setManualResult({ status: 'uploading', message: 'جاري حفظ المستند...' });
    try {
      const tags = manualForm.tags ? manualForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const { error } = await supabase.from('ld_documents').insert({
        title: manualForm.title.trim(),
        doc_type: manualForm.doc_type,
        language: manualForm.language,
        content_text: manualForm.content_text,
        file_url: null,
        file_format: null,
        file_size_bytes: 0,
        status: 'draft',
        uploaded_by: 'الشريك الإداري',
        tags,
      });
      if (error) throw error;
      setManualResult({ status: 'success', message: 'تم حفظ المستند بنجاح' });
      setManualForm({ title: '', doc_type: 'other', language: 'ar', content_text: '', tags: '' });
      fetchDocuments();
    } catch (err) {
      setManualResult({ status: 'error', message: 'فشل الحفظ: ' + (err as Error).message });
    }
  };

  // ===== Delete Document =====
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('ld_documents').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
    } else {
      fetchDocuments();
      setSelectedDoc(null);
    }
  };

  // ===== Filtered Documents =====
  const filteredDocs = documents.filter((doc) => {
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType !== 'all' && doc.doc_type !== filterType) return false;
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
    if (filterLanguage !== 'all' && doc.language !== filterLanguage) return false;
    return true;
  });

  const tabs: { id: UploadTab; label: string; icon: typeof Upload }[] = [
    { id: 'file', label: 'رفع ملف', icon: Upload },
    { id: 'url', label: 'استيراد برابط', icon: Link2 },
    { id: 'bulk', label: 'رفع جماعي', icon: Files },
    { id: 'manual', label: 'إدخال يدوي', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="إجمالي المستندات" value={stats.total} color="text-midnight" bg="bg-blue-50" />
        <StatCard icon={FileType} label="التشريعات" value={stats.legislationCount} color="text-gold" bg="bg-amber-50" />
        <StatCard icon={CheckCircle2} label="أحكام المحاكم" value={stats.rulingsCount} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={HardDrive} label="الفتاوى والوقائع" value={stats.fatwasCount + stats.gazetteCount} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-body font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-gold border-b-2 border-gold bg-gold/5'
                    : 'text-ink/50 hover:text-ink/70 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* ===== Single File Upload ===== */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) setSingleFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gold/50 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_LABEL}
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) setSingleFile(e.target.files[0]); }}
                />
                {singleFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={32} className="text-gold" />
                    <div className="text-right">
                      <p className="font-body font-medium text-midnight text-sm">{singleFile.name}</p>
                      <p className="font-body text-xs text-ink/40">{formatFileSize(singleFile.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSingleFile(null); }}
                      className="p-1 text-ink/30 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUp size={40} className="mx-auto text-ink/30" />
                    <p className="font-body text-sm text-ink/50">اسحب الملف هنا أو اضغط للاختيار</p>
                    <p className="font-body text-xs text-ink/30">الصيغ المدعومة: {ACCEPTED_FILE_LABEL}</p>
                  </div>
                )}
              </div>

              {singleFile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="عنوان المستند">
                    <input
                      type="text"
                      value={singleMeta.title}
                      onChange={(e) => setSingleMeta({ ...singleMeta, title: e.target.value })}
                      placeholder={singleFile.name.replace(/\.[^/.]+$/, '')}
                      className="form-input"
                    />
                  </FormField>
                  <FormField label="نوع المستند">
                    <select
                      value={singleMeta.doc_type}
                      onChange={(e) => setSingleMeta({ ...singleMeta, doc_type: e.target.value })}
                      className="form-input"
                    >
                      {DOC_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="اللغة">
                    <select
                      value={singleMeta.language}
                      onChange={(e) => setSingleMeta({ ...singleMeta, language: e.target.value })}
                      className="form-input"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="الوسوم (مفصولة بفاصلة)">
                    <input
                      type="text"
                      value={singleMeta.tags}
                      onChange={(e) => setSingleMeta({ ...singleMeta, tags: e.target.value })}
                      placeholder="عقد، تجاري، 2024"
                      className="form-input"
                    />
                  </FormField>
                </div>
              )}

              {uploadResult.status !== 'idle' && <ResultBanner result={uploadResult} />}

              <button
                onClick={handleSingleUpload}
                disabled={!singleFile || uploadResult.status === 'uploading'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-midnight text-white rounded-xl font-body font-medium text-sm hover:bg-midnight/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadResult.status === 'uploading' ? (
                  <><Loader2 size={18} className="animate-spin" /> جاري الرفع...</>
                ) : (
                  <><Upload size={18} /> رفع المستند</>
                )}
              </button>
            </div>
          )}

          {/* ===== URL Import ===== */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <FormField label="رابط المستند">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/document.pdf"
                  className="form-input"
                  dir="ltr"
                />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="عنوان المستند">
                  <input
                    type="text"
                    value={urlMeta.title}
                    onChange={(e) => setUrlMeta({ ...urlMeta, title: e.target.value })}
                    placeholder="عنوان اختياري"
                    className="form-input"
                  />
                </FormField>
                <FormField label="نوع المستند">
                  <select
                    value={urlMeta.doc_type}
                    onChange={(e) => setUrlMeta({ ...urlMeta, doc_type: e.target.value })}
                    className="form-input"
                  >
                    {DOC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="اللغة">
                  <select
                    value={urlMeta.language}
                    onChange={(e) => setUrlMeta({ ...urlMeta, language: e.target.value })}
                    className="form-input"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="الوسوم">
                  <input
                    type="text"
                    value={urlMeta.tags}
                    onChange={(e) => setUrlMeta({ ...urlMeta, tags: e.target.value })}
                    placeholder="عقد، تجاري"
                    className="form-input"
                  />
                </FormField>
              </div>
              {urlResult.status !== 'idle' && <ResultBanner result={urlResult} />}
              <button
                onClick={handleUrlImport}
                disabled={!urlInput.trim() || urlResult.status === 'uploading'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-midnight text-white rounded-xl font-body font-medium text-sm hover:bg-midnight/90 transition-colors disabled:opacity-50"
              >
                {urlResult.status === 'uploading' ? (
                  <><Loader2 size={18} className="animate-spin" /> جاري الاستيراد...</>
                ) : (
                  <><Link2 size={18} /> استيراد المستند</>
                )}
              </button>
            </div>
          )}

          {/* ===== Bulk Upload ===== */}
          {activeTab === 'bulk' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setBulkDragOver(true); }}
                onDragLeave={() => setBulkDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setBulkDragOver(false);
                  if (e.dataTransfer.files.length > 0) handleBulkFileAdd(e.dataTransfer.files);
                }}
                onClick={() => bulkInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  bulkDragOver ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gold/50'
                }`}
              >
                <input
                  ref={bulkInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_LABEL}
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) handleBulkFileAdd(e.target.files); }}
                />
                <Files size={36} className="mx-auto text-ink/30 mb-2" />
                <p className="font-body text-sm text-ink/50">اسحب عدة ملفات هنا أو اضغط للاختيار</p>
                <p className="font-body text-xs text-ink/30 mt-1">يمكن رفع عدة ملفات دفعة واحدة</p>
              </div>

              {bulkFiles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bulkFiles.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <FileText size={18} className="text-ink/40 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-xs font-medium text-midnight truncate">{entry.file.name}</p>
                        <p className="font-body text-xs text-ink/30">{formatFileSize(entry.file.size)}</p>
                      </div>
                      {entry.status === 'done' && <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />}
                      {entry.status === 'error' && <AlertCircle size={18} className="text-red-500 flex-shrink-0" />}
                      {entry.status === 'uploading' && <Loader2 size={18} className="text-gold animate-spin flex-shrink-0" />}
                      {entry.status === 'pending' && (
                        <button
                          onClick={() => setBulkFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-ink/30 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="نوع موحد">
                  <select
                    value={bulkMeta.doc_type}
                    onChange={(e) => setBulkMeta({ ...bulkMeta, doc_type: e.target.value })}
                    className="form-input"
                  >
                    {DOC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="اللغة">
                  <select
                    value={bulkMeta.language}
                    onChange={(e) => setBulkMeta({ ...bulkMeta, language: e.target.value })}
                    className="form-input"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="وسوم موحدة">
                  <input
                    type="text"
                    value={bulkMeta.tags}
                    onChange={(e) => setBulkMeta({ ...bulkMeta, tags: e.target.value })}
                    placeholder="مجموعة، 2024"
                    className="form-input"
                  />
                </FormField>
              </div>

              <button
                onClick={handleBulkUpload}
                disabled={bulkFiles.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-midnight text-white rounded-xl font-body font-medium text-sm hover:bg-midnight/90 transition-colors disabled:opacity-50"
              >
                <Files size={18} /> رفع {bulkFiles.length} ملف
              </button>
            </div>
          )}

          {/* ===== Manual Entry ===== */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <FormField label="عنوان المستند">
                <input
                  type="text"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  placeholder="أدخل عنوان المستند"
                  className="form-input"
                />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="نوع المستند">
                  <select
                    value={manualForm.doc_type}
                    onChange={(e) => setManualForm({ ...manualForm, doc_type: e.target.value })}
                    className="form-input"
                  >
                    {DOC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="اللغة">
                  <select
                    value={manualForm.language}
                    onChange={(e) => setManualForm({ ...manualForm, language: e.target.value })}
                    className="form-input"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </FormField>
              </div>
              <FormField label="نص المستند">
                <textarea
                  value={manualForm.content_text}
                  onChange={(e) => setManualForm({ ...manualForm, content_text: e.target.value })}
                  placeholder="أدخل نص المستند القانوني..."
                  rows={6}
                  className="form-input resize-y"
                />
              </FormField>
              <FormField label="الوسوم">
                <input
                  type="text"
                  value={manualForm.tags}
                  onChange={(e) => setManualForm({ ...manualForm, tags: e.target.value })}
                  placeholder="عقد، تجاري، 2024"
                  className="form-input"
                />
              </FormField>
              {manualResult.status !== 'idle' && <ResultBanner result={manualResult} />}
              <button
                onClick={handleManualSubmit}
                disabled={!manualForm.title.trim() || manualResult.status === 'uploading'}
                className="w-full flex items-center justify-center gap-2 py-3 bg-midnight text-white rounded-xl font-body font-medium text-sm hover:bg-midnight/90 transition-colors disabled:opacity-50"
              >
                {manualResult.status === 'uploading' ? (
                  <><Loader2 size={18} className="animate-spin" /> جاري الحفظ...</>
                ) : (
                  <><FileText size={18} /> حفظ المستند</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المستندات..."
                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 rounded-lg text-sm font-body text-ink border border-gray-100 focus:border-gold/50 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-body transition-colors ${
                showFilters ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-gray-50 text-ink/50 border border-gray-100'
              }`}
            >
              <Filter size={18} />
              تصفية
              <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="form-input"
              >
                <option value="all">كل الأنواع</option>
                {DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-input"
              >
                <option value="all">كل الحالات</option>
                {Object.entries(STATUS_BADGE).map(([value, info]) => (
                  <option key={value} value={value}>{info.label}</option>
                ))}
              </select>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="form-input"
              >
                <option value="all">كل اللغات</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-gold animate-spin" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText size={48} className="text-ink/20 mb-3" />
            <p className="font-body text-sm text-ink/40">لا توجد مستندات مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase tracking-wider">العنوان</th>
                  <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase tracking-wider">النوع</th>
                  <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase tracking-wider">الحالة</th>
                  <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase tracking-wider">اللغة</th>
                  <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase tracking-wider">الحجم</th>
                  <th className="text-right px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase tracking-wider">التاريخ</th>
                  <th className="text-center px-4 py-3 font-body text-xs font-medium text-ink/40 uppercase tracking-wider">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocs.map((doc) => {
                  const statusInfo = STATUS_BADGE[doc.status] || { label: doc.status, color: 'text-ink/50', bg: 'bg-gray-100' };
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-ink/30 flex-shrink-0" />
                          <span className="font-body text-sm text-midnight font-medium truncate max-w-xs">{doc.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body text-xs text-ink/60">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-body font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body text-xs text-ink/60">{LANGUAGE_LABELS[doc.language] || doc.language}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body text-xs text-ink/40">{doc.file_size_bytes ? formatFileSize(doc.file_size_bytes) : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body text-xs text-ink/40">{formatDate(doc.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            className="p-1.5 text-ink/40 hover:text-gold transition-colors"
                            title="عرض"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-ink/40 hover:text-red-500 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocDetailModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}

// ===== Sub-components =====

function StatCard({ icon: Icon, label, value, color, bg }: { icon: typeof FileText; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} mb-3`}>
        <Icon size={20} className={color} />
      </div>
      <p className="font-heading font-bold text-midnight text-2xl">{value}</p>
      <p className="font-body text-xs text-ink/40 mt-1">{label}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block font-body text-xs font-medium text-ink/60">{label}</label>
      {children}
    </div>
  );
}

function ResultBanner({ result }: { result: UploadResult }) {
  if (result.status === 'idle') return null;
  const isSuccess = result.status === 'success';
  const isError = result.status === 'error';
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-body ${
      isSuccess ? 'bg-green-50 text-green-700' : isError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
    }`}>
      {isSuccess && <CheckCircle2 size={18} />}
      {isError && <AlertCircle size={18} />}
      {result.status === 'uploading' && <Loader2 size={18} className="animate-spin" />}
      <span>{result.message}</span>
    </div>
  );
}

function DocDetailModal({ doc, onClose }: { doc: LegalDocument; onClose: () => void }) {
  const statusInfo = STATUS_BADGE[doc.status] || { label: doc.status, color: 'text-ink/50', bg: 'bg-gray-100' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="font-heading font-bold text-midnight text-lg">{doc.title}</h3>
          <button onClick={onClose} className="p-1.5 text-ink/30 hover:text-ink/60 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailField icon={FileType} label="النوع" value={DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type} />
            <DetailField icon={CheckCircle2} label="الحالة" value={statusInfo.label} badgeColor={statusInfo.color} badgeBg={statusInfo.bg} />
            <DetailField icon={Globe} label="اللغة" value={LANGUAGE_LABELS[doc.language] || doc.language} />
            <DetailField icon={HardDrive} label="الحجم" value={doc.file_size_bytes ? formatFileSize(doc.file_size_bytes) : '—'} />
            <DetailField icon={User} label="رفع بواسطة" value={doc.uploaded_by} />
            <DetailField icon={Calendar} label="التاريخ" value={formatDate(doc.created_at)} />
          </div>
          {doc.file_url && (
            <DetailField icon={Link2} label="الرابط" value={doc.file_url} />
          )}
          {doc.file_format && (
            <DetailField icon={FileText} label="الصيغة" value={doc.file_format.toUpperCase()} />
          )}
          {doc.tags.length > 0 && (
            <div className="space-y-2">
              <p className="font-body text-xs font-medium text-ink/60">الوسوم</p>
              <div className="flex flex-wrap gap-2">
                {doc.tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-gold/10 text-gold rounded-full text-xs font-body">
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {doc.content_text && (
            <div className="space-y-2">
              <p className="font-body text-xs font-medium text-ink/60">نص المستند</p>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="font-body text-sm text-ink/70 leading-relaxed whitespace-pre-wrap">{doc.content_text}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ icon: Icon, label, value, badgeColor, badgeBg }: {
  icon: typeof FileText; label: string; value: string; badgeColor?: string; badgeBg?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="text-ink/30" />
        <p className="font-body text-xs font-medium text-ink/40">{label}</p>
      </div>
      {badgeColor && badgeBg ? (
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-body font-medium ${badgeBg} ${badgeColor}`}>{value}</span>
      ) : (
        <p className="font-body text-sm text-midnight font-medium truncate" dir={label === 'الرابط' ? 'ltr' : 'rtl'}>{value}</p>
      )}
    </div>
  );
}
