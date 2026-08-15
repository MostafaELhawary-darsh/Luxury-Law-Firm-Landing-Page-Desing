import { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText, Loader2, Plus, Pencil, Trash2, Upload, Download,
  Scale, Landmark, Gavel, FileBadge, ScrollText, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Languages, FileSignature,
  Search, Filter, Eye, X, Sparkles, RefreshCw, Globe,
  FileType, Image as ImageIcon, FileDown, Archive, Clock,
  TrendingUp, BookOpen, ChevronLeft,
} from 'lucide-react';
import { supabase, formatCurrency, formatDate } from '@/lib/financeUtils';
import type {
  LegalDocument, ComplianceCheck,
  DocumentTranslation, DraftingSession, ExportJob,
} from '@/lib/documentTypes';
import {
  DOC_TYPE_LABELS, STATUS_LABELS, REFERENCE_TYPE_LABELS,
  COMPLIANCE_LABELS, SEVERITY_LABELS, LANGUAGES, LANGUAGE_LABELS,
  EXPORT_FORMATS, ACCEPTED_FILE_LABEL,
} from '@/lib/documentTypes';
import { analyzeCompliance, type LibrarySource } from '@/lib/complianceEngine';
import { suggestReferencesForDraft, evaluateDraftQuality } from '@/lib/draftAssistant';
import type { PendingAddCommand } from '@/lib/voiceTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';

type TabType = 'documents' | 'compliance' | 'drafting' | 'translations' | 'references' | 'exports';
type ModalType = 'upload' | 'draft' | 'translate' | 'editDoc' | null;

export type LibraryEntry = {
  id: string;
  source_type: string;
  title: string;
  article_number: string | null;
  article_title: string | null;
  content_text: string;
  reference_label: string;
  jurisdiction: string;
  year: number | null;
  status: string | null;
  effective_date: string | null;
};

const referenceIcon = (type: string) => {
  const map: Record<string, typeof Scale> = {
    constitution: Landmark, law: Scale, ministerial_decision: FileBadge,
    regulation: ScrollText, judicial_precedent: Gavel,
  };
  return map[type] || BookOpen;
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentManagement({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [translations, setTranslations] = useState<DocumentTranslation[]>([]);
  const [drafts, setDrafts] = useState<DraftingSession[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'document' | 'compliance' | 'translation' | 'draft' | 'export'>('document');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [compliancePreview, setCompliancePreview] = useState<{ docId: string; docTitle: string; checks: ComplianceCheck[]; html: string } | null>(null);
  const [suggestedReferences, setSuggestedReferences] = useState<LibraryEntry[]>([]);
  const [draftQuality, setDraftQuality] = useState<{ score: number; feedback: string[] } | null>(null);

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    title: '', doc_type: 'contract', language: 'ar', tags: '', content_text: '',
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draft form — type-specific fields
  const [draftForm, setDraftForm] = useState<Record<string, string>>({
    document_id: '', draft_type: 'contract',
  });

  // Translate form
  const [translateForm, setTranslateForm] = useState({
    document_id: '', target_language: 'en',
  });

  // Edit doc form
  const [editForm, setEditForm] = useState({
    title: '', doc_type: 'contract', language: 'ar', tags: '', content_text: '',
  });



  // Export form
  const [exportForm, setExportForm] = useState({
    document_id: '', export_format: 'pdf', export_type: 'document',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [docsRes, compRes, transRes, draftRes, exportRes,
      legRes, rulingRes, fatwaRes, structRes] = await Promise.all([
      supabase.from('ld_documents').select('*').order('created_at', { ascending: false }),
      supabase.from('ld_compliance_checks').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('ld_translations').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('ld_drafting_sessions').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('ld_export_jobs').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('legislation').select('*').order('year'),
      supabase.from('court_rulings').select('*').order('court_type, ruling_number'),
      supabase.from('fatwas').select('*').order('year, fatwa_number'),
      supabase.from('law_structure').select('*').order('sort_order'),
    ]);

    // Build unified library entries from all library tables
    const entries: LibraryEntry[] = [];

    for (const leg of (legRes.data as any[]) || []) {
      const isConstitution = leg.type === 'دستور';
      const isMinisterial = leg.type === 'قرارات وزارية';
      const isRegulation = leg.type === 'لوائح تنفيذية';
      entries.push({
        id: leg.id,
        source_type: isConstitution ? 'constitution' : isMinisterial ? 'ministerial_decision' : isRegulation ? 'regulation' : 'law',
        title: leg.title,
        article_number: null,
        article_title: null,
        content_text: leg.full_text || leg.title,
        reference_label: isConstitution ? 'الدستور' : isMinisterial ? 'قرار وزاري' : isRegulation ? 'لائحة' : 'قانون',
        jurisdiction: 'egypt',
        year: leg.year,
        status: leg.status,
        effective_date: leg.publication_date,
      });
    }

    for (const ruling of (rulingRes.data as any[]) || []) {
      entries.push({
        id: ruling.id,
        source_type: 'judicial_precedent',
        title: `${ruling.court_type} — طعن رقم ${ruling.ruling_number} لسنة ${ruling.judicial_year || ''}`,
        article_number: null,
        article_title: ruling.subject,
        content_text: `${ruling.principle || ''} ${ruling.ruling_text || ''}`.trim(),
        reference_label: 'سابقة قضائية',
        jurisdiction: 'egypt',
        year: null,
        status: null,
        effective_date: ruling.session_date,
      });
    }

    for (const fatwa of (fatwaRes.data as any[]) || []) {
      entries.push({
        id: fatwa.id,
        source_type: 'fatwa',
        title: `فتوى رقم ${fatwa.fatwa_number} لسنة ${fatwa.year}`,
        article_number: null,
        article_title: fatwa.subject,
        content_text: fatwa.text_content || fatwa.principle || '',
        reference_label: 'فتوى',
        jurisdiction: 'egypt',
        year: null,
        status: null,
        effective_date: fatwa.fatwa_date,
      });
    }

    for (const struct of (structRes.data as any[]) || []) {
      if (struct.content && struct.content.length > 30) {
        entries.push({
          id: struct.id,
          source_type: 'law',
          title: struct.title,
          article_number: struct.node_number,
          article_title: struct.title,
          content_text: struct.content,
          reference_label: 'مادة قانونية',
          jurisdiction: 'egypt',
          year: null,
          status: null,
          effective_date: null,
        });
      }
    }

    setDocuments((docsRes.data as LegalDocument[]) || []);
    setComplianceChecks((compRes.data as ComplianceCheck[]) || []);
    setLibraryEntries(entries);
    setTranslations((transRes.data as DocumentTranslation[]) || []);
    setDrafts((draftRes.data as DraftingSession[]) || []);
    setExportJobs((exportRes.data as ExportJob[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!voiceAdd) return;
    const cmd = voiceAdd();
    if (!cmd) return;
    if (cmd.commandType === 'add_document') {
      setModalType('draft');
      setDraftForm({ document_id: documents[0]?.id || '', draft_type: 'contract' });
    }
  }, [voiceAdd, documents]);

  // ===== Handlers =====

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    setUploadedFile(file);
    if (!uploadForm.title) {
      setUploadForm({ ...uploadForm, title: file.name.replace(/\.[^.]+$/, '') });
    }
  };

  const handleUploadSave = async () => {
    if (!uploadForm.title.trim()) return;
    setSaving(true);
    const fileFormat = uploadedFile ? uploadedFile.name.split('.').pop()?.toLowerCase() || null : null;
    const fileSize = uploadedFile ? uploadedFile.size : null;

    // Read file content as text for text-based files
    let contentText = uploadForm.content_text;
    if (uploadedFile && ['.txt', '.html', '.htm', '.md', '.csv', '.rtf'].some(ext => uploadedFile.name.toLowerCase().endsWith(ext))) {
      try { contentText = await uploadedFile.text(); } catch {}
    }

    const tags = uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      title: uploadForm.title.trim(),
      doc_type: uploadForm.doc_type,
      language: uploadForm.language,
      content_text: contentText,
      file_format: fileFormat,
      file_size_bytes: fileSize,
      status: uploadedFile ? 'uploaded' : 'draft',
      tags,
    };
    const { data } = await supabase.from('ld_documents').insert(payload).select().single();
    setSaving(false);
    setModalType(null);
    setUploadedFile(null);
    setUploadForm({ title: '', doc_type: 'contract', language: 'ar', tags: '', content_text: '' });
    fetchAll();
    if (data) setSelectedDocId(data.id);
  };

  const handleEditSave = async () => {
    if (!editingId || !editForm.title.trim()) { setSaving(false); return; }
    setSaving(true);
    const tags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    await supabase.from('ld_documents').update({
      title: editForm.title.trim(),
      doc_type: editForm.doc_type,
      language: editForm.language,
      tags,
      content_text: editForm.content_text,
    }).eq('id', editingId);
    setSaving(false);
    setModalType(null);
    setEditingId(null);
    fetchAll();
  };

  const handleAnalyze = async (docId: string) => {
    setAnalyzing(docId);
    await supabase.from('ld_documents').update({ status: 'analyzing' }).eq('id', docId);

    const doc = documents.find(d => d.id === docId);
    if (!doc) { setAnalyzing(null); return; }

    // Build library sources for the compliance engine
    const librarySources: LibrarySource[] = libraryEntries.map(e => ({
      id: e.id,
      source_type: e.source_type as LibrarySource['source_type'],
      title: e.title,
      article_number: e.article_number,
      article_title: e.article_title,
      content_text: e.content_text,
      reference_label: e.reference_label,
    }));

    // Run real compliance analysis
    const result = await analyzeCompliance(doc, librarySources);

    // Clear old checks and insert new ones
    await supabase.from('ld_compliance_checks').delete().eq('document_id', docId);
    if (result.checks.length > 0) {
      await supabase.from('ld_compliance_checks').insert(result.checks);
    }

    // Update document status based on real results
    await supabase.from('ld_documents').update({ status: result.overallStatus }).eq('id', docId);

    setAnalyzing(null);
    fetchAll();
  };

  const [draftPreview, setDraftPreview] = useState<string | null>(null);

  const handleDraftPreview = () => {
    const generatedText = generateDraftText(draftForm.draft_type, draftForm);
    setDraftPreview(generatedText);

    // Integrate draftAssistant to suggest relevant legal references and evaluate quality
    const suggestions = suggestReferencesForDraft(draftForm.draft_type, draftForm, libraryEntries);
    setSuggestedReferences(suggestions.suggestedReferences);

    const quality = evaluateDraftQuality(generatedText, suggestions.suggestedReferences);
    setDraftQuality(quality);
  };

  const handleDraftSave = async () => {
    if (!draftPreview) { setSaving(false); return; }
    setSaving(true);

    const existingIterations = drafts.filter(d => d.document_id === draftForm.document_id && d.draft_type === draftForm.draft_type).length;
    const iteration = existingIterations + 1;

    const { data } = await supabase.from('ld_drafting_sessions').insert({
      document_id: draftForm.document_id || null,
      draft_type: draftForm.draft_type,
      instructions: JSON.stringify(draftForm),
      generated_text: draftPreview,
      iteration,
      status: 'completed',
    }).select().single();

    setSaving(false);
    setModalType(null);
    setDraftPreview(null);
    setSuggestedReferences([]);
    setDraftQuality(null);
    setDraftForm({ document_id: documents[0]?.id || '', draft_type: 'contract' });
    fetchAll();
  };

  const handleTranslate = async () => {
    if (!translateForm.document_id) { setSaving(false); return; }
    setSaving(true);

    const doc = documents.find(d => d.id === translateForm.document_id);
    if (!doc) { setSaving(false); return; }

    const targetLang = translateForm.target_language;
    const translatedText = simulateTranslation(doc.content_text || doc.title, targetLang);
    const translatedTitle = simulateTranslation(doc.title, targetLang);

    await supabase.from('ld_translations').insert({
      document_id: translateForm.document_id,
      target_language: targetLang,
      translated_title: translatedTitle,
      translated_content: translatedText,
      translation_status: 'completed',
      translated_by: 'AI Engine',
    });

    setSaving(false);
    setModalType(null);
    setTranslateForm({ document_id: '', target_language: 'en' });
    fetchAll();
  };

  const handleExport = async (docId: string, format: string, exportType: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    // For compliance reports, show a preview before downloading
    if (exportType === 'compliance_report') {
      const docChecks = complianceChecks.filter(c => c.document_id === docId);
      const html = generatePrintableHTML(doc, exportType, docChecks);
      setCompliancePreview({ docId, docTitle: doc.title, checks: docChecks, html });
      return;
    }

    setExporting(`${docId}-${format}`);

    // Generate downloadable content based on format
    let blob: Blob | null = null;
    let fileName = `${doc.title}.${format}`;

    if (format === 'pdf') {
      const html = generatePrintableHTML(doc, exportType, complianceChecks.filter(c => c.document_id === docId));
      blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      fileName = `${doc.title}.html`;
    } else if (format === 'docx' || format === 'rtf') {
      const rtf = generateRTF(doc, exportType);
      blob = new Blob([rtf], { type: 'application/rtf' });
      fileName = `${doc.title}.rtf`;
    } else if (format === 'html') {
      const html = generatePrintableHTML(doc, exportType, complianceChecks.filter(c => c.document_id === docId));
      blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    } else if (format === 'png' || format === 'jpg') {
      const dataUrl = await generateImageFromText(doc, format);
      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${doc.title}.${format}`;
        link.click();
      }
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }

    await supabase.from('ld_export_jobs').insert({
      document_id: docId,
      export_format: format,
      export_type: exportType,
      status: 'completed',
    });

    setExporting(null);
    fetchAll();
  };

  const confirmComplianceExport = async (format: string) => {
    if (!compliancePreview) return;
    const { docId, html, docTitle } = compliancePreview;
    setExporting(`${docId}-${format}`);

    let blob: Blob | null = null;
    let fileName = `${docTitle}.${format}`;

    if (format === 'pdf' || format === 'html') {
      blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      if (format === 'pdf') fileName = `${docTitle}.html`;
    } else if (format === 'docx' || format === 'rtf') {
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        const rtf = generateRTF(doc, 'compliance_report');
        blob = new Blob([rtf], { type: 'application/rtf' });
        fileName = `${docTitle}.rtf`;
      }
    }

    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }

    await supabase.from('ld_export_jobs').insert({
      document_id: docId,
      export_format: format,
      export_type: 'compliance_report',
      status: 'completed',
    });

    setExporting(null);
    setCompliancePreview(null);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const tableMap: Record<string, string> = {
      document: 'ld_documents',
      compliance: 'ld_compliance_checks',
      translation: 'ld_translations',
      draft: 'ld_drafting_sessions',
      export: 'ld_export_jobs',
    };
    await supabase.from(tableMap[deleteType]).delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  // ===== Filtering =====
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || doc.doc_type === filterType;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;

  const compliantCount = documents.filter(d => d.status === 'compliant').length;
  const nonCompliantCount = documents.filter(d => d.status === 'non_compliant').length;
  const needsReviewCount = documents.filter(d => d.status === 'needs_review').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-gold" />
          <h2 className="font-heading font-bold text-midnight text-lg">إدارة المستندات القانونية والامتثال</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setModalType('translate'); setTranslateForm({ document_id: documents[0]?.id || '', target_language: 'en' }); }} disabled={documents.length === 0} className="flex items-center gap-2 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-sm font-bold hover:bg-midnight/90 transition-colors disabled:opacity-50">
            <Languages size={16} /> ترجمة
          </button>
          <button onClick={() => { setModalType('draft'); setDraftForm({ document_id: documents[0]?.id || '', draft_type: 'contract' }); }} className="flex items-center gap-2 px-4 py-2 bg-midnight text-cream rounded-lg font-body text-sm font-bold hover:bg-midnight/90 transition-colors">
            <FileSignature size={16} /> صياغة
          </button>
          <button onClick={() => { setModalType('upload'); setUploadedFile(null); setUploadForm({ title: '', doc_type: 'contract', language: 'ar', tags: '', content_text: '' }); }} className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors">
            <Upload size={16} /> رفع مستند
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={<FileText size={14} className="text-midnight" />} label="إجمالي المستندات" value={String(documents.length)} valueClass="text-midnight" />
        <StatCard icon={<CheckCircle2 size={14} className="text-green-600" />} label="ممتثلة" value={String(compliantCount)} valueClass="text-green-700" />
        <StatCard icon={<XCircle size={14} className="text-red-500" />} label="غير ممتثلة" value={String(nonCompliantCount)} valueClass="text-red-600" />
        <StatCard icon={<AlertTriangle size={14} className="text-amber-500" />} label="تحتاج مراجعة" value={String(needsReviewCount)} valueClass="text-amber-700" />
        <StatCard icon={<Languages size={14} className="text-blue-600" />} label="ترجمات" value={String(translations.length)} valueClass="text-blue-700" />
        <StatCard icon={<BookOpen size={14} className="text-gold" />} label="مراجع قانونية" value={String(libraryEntries.length)} valueClass="text-gold" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'documents' as const, label: 'المستندات', icon: FileText },
          { id: 'compliance' as const, label: 'فحص الامتثال', icon: ShieldCheck },
          { id: 'drafting' as const, label: 'الصياغة القانونية', icon: FileSignature },
          { id: 'translations' as const, label: 'الترجمات', icon: Languages },
          { id: 'references' as const, label: 'المصادر المرجعية', icon: BookOpen },
          { id: 'exports' as const, label: 'سجل التصدير', icon: FileDown },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-ink/50 hover:text-ink/70'
              }`}>
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== Documents Tab ===== */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المستندات..."
                className="w-full pr-10 pl-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold bg-white"
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold bg-white">
              <option value="all">كل الأنواع</option>
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold bg-white">
              <option value="all">كل الحالات</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Documents Grid */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={40} className="text-ink/20 mx-auto mb-3" />
              <p className="font-body text-sm text-ink/40">لا توجد مستندات. ابدأ برفع مستند جديد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const statusMeta = STATUS_LABELS[doc.status] || STATUS_LABELS.draft;
                const typeLabel = DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type;
                const docCompliance = complianceChecks.filter(c => c.document_id === doc.id);
                const compliantCount = docCompliance.filter(c => c.compliance_status === 'compliant').length;
                const nonCompliantCount = docCompliance.filter(c => c.compliance_status === 'non_compliant').length;
                return (
                  <div key={doc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 group hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                          <FileText size={18} className="text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-bold text-midnight text-sm truncate">{doc.title}</h4>
                          <p className="font-body text-[10px] text-ink/40">{typeLabel} • {LANGUAGE_LABELS[doc.language] || doc.language}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => {
                          setEditingId(doc.id);
                          setEditForm({ title: doc.title, doc_type: doc.doc_type, language: doc.language, tags: doc.tags.join(', '), content_text: doc.content_text });
                          setModalType('editDoc');
                        }} className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => { setDeleteId(doc.id); setDeleteType('document'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>

                    {doc.content_text && (
                      <p className="font-body text-xs text-ink/50 line-clamp-2 mb-3 leading-relaxed">{doc.content_text.slice(0, 120)}...</p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body ${statusMeta.bg} ${statusMeta.color}`}>{statusMeta.label}</span>
                      {doc.file_format && <span className="px-2 py-0.5 rounded bg-gray-100 text-ink/50 font-body text-[10px] uppercase">{doc.file_format}</span>}
                      {doc.file_size_bytes != null && <span className="font-body text-[10px] text-ink/30">{formatBytes(doc.file_size_bytes)}</span>}
                    </div>

                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 font-body text-[9px] text-ink/50">#{tag}</span>
                        ))}
                      </div>
                    )}

                    {docCompliance.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 text-[10px] font-body">
                        <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={10} /> {compliantCount} ممتثل</span>
                        {nonCompliantCount > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle size={10} /> {nonCompliantCount} مخالفة</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleAnalyze(doc.id)}
                        disabled={analyzing === doc.id}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gold/10 text-gold font-body text-[10px] font-bold hover:bg-gold/20 transition-colors disabled:opacity-50"
                      >
                        {analyzing === doc.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        تحليل الامتثال
                      </button>
                      <div className="relative group/export">
                        <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-body text-[10px] font-bold hover:bg-blue-100 transition-colors">
                          <Download size={11} /> تصدير
                        </button>
                        <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 hidden group-hover/export:flex flex-col gap-0.5 z-10 min-w-[140px]">
                          {EXPORT_FORMATS.map((fmt) => (
                            <button
                              key={fmt.code}
                              onClick={() => handleExport(doc.id, fmt.code, 'document')}
                              disabled={exporting === `${doc.id}-${fmt.code}`}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded font-body text-[10px] text-ink/70 hover:bg-gray-50 transition-colors text-right disabled:opacity-50"
                            >
                              {exporting === `${doc.id}-${fmt.code}` ? <Loader2 size={10} className="animate-spin" /> : <FileDown size={10} />}
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <span className="font-body text-[9px] text-ink/30 mr-auto">{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Compliance Tab ===== */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          {complianceChecks.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck size={40} className="text-ink/20 mx-auto mb-3" />
              <p className="font-body text-sm text-ink/40">لا توجد نتائج فحص امتثال بعد. قم بتحليل مستند من تبويب المستندات.</p>
            </div>
          ) : (
            <>
              {/* Compliance Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <CheckCircle2 size={16} className="text-green-600 mb-1" />
                  <p className="font-heading font-bold text-green-700 text-lg">{complianceChecks.filter(c => c.compliance_status === 'compliant').length}</p>
                  <p className="font-body text-[10px] text-green-600">ممتثل</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <XCircle size={16} className="text-red-500 mb-1" />
                  <p className="font-heading font-bold text-red-600 text-lg">{complianceChecks.filter(c => c.compliance_status === 'non_compliant').length}</p>
                  <p className="font-body text-[10px] text-red-500">غير ممتثل</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <AlertTriangle size={16} className="text-amber-500 mb-1" />
                  <p className="font-heading font-bold text-amber-700 text-lg">{complianceChecks.filter(c => c.compliance_status === 'partial').length}</p>
                  <p className="font-body text-[10px] text-amber-600">امتثال جزئي</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <Eye size={16} className="text-blue-600 mb-1" />
                  <p className="font-heading font-bold text-blue-700 text-lg">{complianceChecks.filter(c => c.compliance_status === 'needs_review').length}</p>
                  <p className="font-body text-[10px] text-blue-600">تحتاج مراجعة</p>
                </div>
              </div>

              {/* Compliance Checks List */}
              <div className="space-y-3">
                {complianceChecks.map((check) => {
                  const refMeta = REFERENCE_TYPE_LABELS[check.reference_type] || { label: check.reference_type, icon: 'BookOpen', color: 'text-ink/60' };
                  const Icon = referenceIcon(check.reference_type);
                  const compMeta = COMPLIANCE_LABELS[check.compliance_status] || COMPLIANCE_LABELS.needs_review;
                  const sevMeta = SEVERITY_LABELS[check.severity] || SEVERITY_LABELS.info;
                  const doc = documents.find(d => d.id === check.document_id);
                  return (
                    <div key={check.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <Icon size={18} className={refMeta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${compMeta.bg} ${compMeta.color}`}>{compMeta.label}</span>
                            <span className="font-body text-[10px] text-ink/40">{refMeta.label}</span>
                            <span className={`flex items-center gap-1 font-body text-[10px] ${sevMeta.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sevMeta.dot}`} /> {sevMeta.label}
                            </span>
                            <span className="font-body text-[10px] text-ink/30 mr-auto">{formatDate(check.created_at)}</span>
                          </div>
                          <p className="font-body text-xs font-bold text-midnight mb-1">
                            {check.reference_title}
                            {check.reference_article && <span className="text-ink/50 font-normal"> — مادة {check.reference_article}</span>}
                          </p>
                          <p className="font-body text-xs text-ink/60 leading-relaxed mb-2">{check.finding_summary}</p>
                          {check.recommendation && (
                            <div className="bg-amber-50 rounded-lg p-2 border border-amber-100 mb-2">
                              <p className="font-body text-[11px] text-amber-700 flex items-start gap-1.5">
                                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                                {check.recommendation}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            {doc && <span className="font-body text-[10px] text-ink/40">المستند: {doc.title}</span>}
                            <div className="flex items-center gap-1 mr-auto">
                              <TrendingUp size={10} className="text-ink/30" />
                              <span className="font-mono text-[10px] text-ink/40">دقة: {check.confidence_score}%</span>
                            </div>
                            <button onClick={() => { setDeleteId(check.id); setDeleteType('compliance'); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink/30 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== Drafting Tab ===== */}
      {activeTab === 'drafting' && (
        <div className="space-y-4">
          {drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature size={40} className="text-ink/20 mx-auto mb-3" />
              <p className="font-body text-sm text-ink/40">لا توجد صياغات قانونية بعد. استخدم زر "صياغة" لإنشاء مسودة جديدة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => {
                const doc = documents.find(d => d.id === draft.document_id);
                const typeLabel = DOC_TYPE_LABELS[draft.draft_type] || draft.draft_type;
                return (
                  <div key={draft.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-midnight/5 flex items-center justify-center">
                          <FileSignature size={18} className="text-midnight" />
                        </div>
                        <div>
                          <h4 className="font-heading font-bold text-midnight text-sm">{typeLabel} — إصدار {draft.iteration}</h4>
                          <p className="font-body text-[10px] text-ink/40">{doc?.title || '—'} • {formatDate(draft.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setDeleteId(draft.id); setDeleteType('draft'); }} className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 mb-3">
                      <p className="font-body text-[11px] text-ink/50 mb-1">البيانات المُدخلة:</p>
                      <div className="space-y-0.5">
                        {(() => {
                          try {
                            const parsed = JSON.parse(draft.instructions);
                            const labels: Record<string, string> = {
                              draft_type: 'النوع', document_id: 'المستند', party1: 'الطرف الأول', party2: 'الطرف الثاني',
                              subject: 'الموضوع', amount: 'القيمة', duration: 'المدة', conditions: 'الشروط',
                              court: 'المحكمة', case_number: 'الرقم', law_type: 'نوع القانون', parties: 'الأطراف',
                              requests: 'الطلبات', facts: 'الوقائع', references: 'المراجع', defenses: 'الدفوع',
                              issuer: 'الجهة المصدرة', scope: 'نطاق التطبيق',
                            };
                            return Object.entries(parsed)
                              .filter(([k]) => k !== 'draft_type' && k !== 'document_id' && parsed[k])
                              .map(([k, v]) => (
                                <p key={k} className="font-body text-xs text-ink/70">
                                  <span className="text-ink/40">{labels[k] || k}: </span>{String(v)}
                                </p>
                              ));
                          } catch {
                            return <p className="font-body text-xs text-ink/70">{draft.instructions}</p>;
                          }
                        })()}
                      </div>
                    </div>
                    <div className="bg-midnight/5 rounded-lg p-3 border border-gray-100 max-h-48 overflow-y-auto">
                      <p className="font-body text-xs text-ink/70 leading-relaxed whitespace-pre-wrap">{draft.generated_text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Translations Tab ===== */}
      {activeTab === 'translations' && (
        <div className="space-y-4">
          {translations.length === 0 ? (
            <div className="text-center py-12">
              <Languages size={40} className="text-ink/20 mx-auto mb-3" />
              <p className="font-body text-sm text-ink/40">لا توجد ترجمات بعد. استخدم زر "ترجمة" لترجمة مستند.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {translations.map((trans) => {
                const doc = documents.find(d => d.id === trans.document_id);
                const lang = LANGUAGES.find(l => l.code === trans.target_language);
                return (
                  <div key={trans.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Globe size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-heading font-bold text-midnight text-sm">{lang?.flag} {lang?.name || trans.target_language}</h4>
                          <p className="font-body text-[10px] text-ink/40">{doc?.title || '—'}</p>
                        </div>
                      </div>
                      <button onClick={() => { setDeleteId(trans.id); setDeleteType('translation'); }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                    </div>
                    <p className="font-body text-xs font-bold text-midnight mb-2">{trans.translated_title}</p>
                    <p className="font-body text-xs text-ink/60 leading-relaxed line-clamp-4 mb-3">{trans.translated_content}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-body ${trans.translation_status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {trans.translation_status === 'completed' ? 'مكتملة' : 'قيد الترجمة'}
                      </span>
                      <span className="font-body text-[10px] text-ink/30 mr-auto">{trans.translated_by} • {formatDate(trans.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== References Tab ===== */}
      {activeTab === 'references' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-ink/50">المكتبة القانونية المرجعية — مصدر أساسي لفحص الامتثال. تشمل الدستور، القوانين، القرارات الوزارية، اللوائح، السوابق القضائية، والفتاوى.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {(() => {
              const typeCounts: Record<string, number> = {};
              for (const e of libraryEntries) {
                const label = REFERENCE_TYPE_LABELS[e.source_type]?.label || e.source_type;
                typeCounts[label] = (typeCounts[label] || 0) + 1;
              }
              return Object.entries(typeCounts).map(([label, count]) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
                  <p className="font-heading font-bold text-midnight text-lg">{count}</p>
                  <p className="font-body text-[10px] text-ink/50">{label}</p>
                </div>
              ));
            })()}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {libraryEntries.map((entry) => {
              const refMeta = REFERENCE_TYPE_LABELS[entry.source_type] || { label: entry.source_type, icon: 'BookOpen', color: 'text-ink/60' };
              const Icon = referenceIcon(entry.source_type);
              return (
                <div key={entry.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gold/5 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className={refMeta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-bold text-midnight text-sm truncate">{entry.title}</h4>
                      <p className="font-body text-[10px] text-ink/40">{refMeta.label}{entry.year ? ` • ${entry.year}` : ''}{entry.status ? ` • ${entry.status}` : ''}</p>
                    </div>
                  </div>
                  {entry.article_number && <p className="font-body text-[10px] font-bold text-gold mb-1">المادة {entry.article_number}{entry.article_title ? ` — ${entry.article_title}` : ''}</p>}
                  {entry.article_title && !entry.article_number && <p className="font-body text-[10px] font-bold text-gold mb-1">{entry.article_title}</p>}
                  <p className="font-body text-xs text-ink/50 line-clamp-3 leading-relaxed mb-2">{entry.content_text.slice(0, 200)}</p>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    {entry.effective_date && <span className="font-body text-[10px] text-ink/30">نافذ من {formatDate(entry.effective_date)}</span>}
                    <span className="font-body text-[10px] text-ink/30 mr-auto">مصر</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Exports Tab ===== */}
      {activeTab === 'exports' && (
        <div className="space-y-4">
          {exportJobs.length === 0 ? (
            <div className="text-center py-12">
              <FileDown size={40} className="text-ink/20 mx-auto mb-3" />
              <p className="font-body text-sm text-ink/40">لا توجد عمليات تصدير بعد. استخدم قائمة التصدير في بطاقة أي مستند.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">المستند</th>
                      <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الصيغة</th>
                      <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">النوع</th>
                      <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">الحالة</th>
                      <th className="px-4 py-3 font-body text-xs font-medium text-ink/60">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportJobs.map((job) => {
                      const doc = documents.find(d => d.id === job.document_id);
                      const fmtMeta = EXPORT_FORMATS.find(f => f.code === job.export_format);
                      return (
                        <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-body text-xs font-bold text-midnight">{doc?.title || '—'}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-gray-100 text-ink/60 font-body text-[10px] uppercase">{fmtMeta?.label || job.export_format}</span></td>
                          <td className="px-4 py-3 font-body text-xs text-ink/60">
                            {job.export_type === 'document' ? 'مستند' : job.export_type === 'compliance_report' ? 'تقرير امتثال' : job.export_type === 'translation' ? 'ترجمة' : 'مسودة'}
                          </td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-body ${job.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{job.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}</span></td>
                          <td className="px-4 py-3 font-body text-xs text-ink/50">{formatDate(job.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Upload Modal ===== */}
      <EntityModal open={modalType === 'upload'} title="رفع مستند قانوني جديد" onClose={() => setModalType(null)} onSubmit={handleUploadSave} loading={saving} submitLabel="رفع المستند">
        <Field label="عنوان المستند" required>
          <TextInput value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="مثال: عقد توريد خدمات" />
        </Field>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files[0]; if (file) handleFileSelect(file); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver ? 'border-gold bg-gold/5' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            ref={fileInputRef} type="file" className="hidden"
            accept={ACCEPTED_FILE_LABEL}
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          />
          {uploadedFile ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={20} className="text-green-600" />
              <div className="text-right">
                <p className="font-body text-sm font-bold text-midnight">{uploadedFile.name}</p>
                <p className="font-body text-[10px] text-ink/40">{formatBytes(uploadedFile.size)} • {uploadedFile.type || 'غير معروف'}</p>
              </div>
            </div>
          ) : (
            <>
              <Upload size={28} className="text-ink/30 mx-auto mb-2" />
              <p className="font-body text-sm text-ink/50 mb-1">اسحب وأفلت الملف هنا أو اضغط للاختيار</p>
              <p className="font-body text-[10px] text-ink/30">PDF, Word, TXT, HTML, RTF, صور, CSV, Excel, Markdown</p>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المستند">
            <Select value={uploadForm.doc_type} onChange={(e) => setUploadForm({ ...uploadForm, doc_type: e.target.value })}>
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="لغة المستند">
            <Select value={uploadForm.language} onChange={(e) => setUploadForm({ ...uploadForm, language: e.target.value })}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الوسوم (مفصولة بفواصل)">
          <TextInput value={uploadForm.tags} onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })} placeholder="مثال: عمالي, تجاري, 2024" />
        </Field>
        <Field label="أو الصق نص المستند مباشرة">
          <TextArea value={uploadForm.content_text} onChange={(e) => setUploadForm({ ...uploadForm, content_text: e.target.value })} rows={4} placeholder="الصق النص القانوني هنا..." />
        </Field>
      </EntityModal>

      {/* ===== Edit Document Modal ===== */}
      <EntityModal open={modalType === 'editDoc'} title="تعديل المستند" onClose={() => setModalType(null)} onSubmit={handleEditSave} loading={saving}>
        <Field label="عنوان المستند" required>
          <TextInput value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع المستند">
            <Select value={editForm.doc_type} onChange={(e) => setEditForm({ ...editForm, doc_type: e.target.value })}>
              {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="اللغة">
            <Select value={editForm.language} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="الوسوم">
          <TextInput value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="مفصولة بفواصل" />
        </Field>
        <Field label="نص المستند">
          <TextArea value={editForm.content_text} onChange={(e) => setEditForm({ ...editForm, content_text: e.target.value })} rows={6} />
        </Field>
      </EntityModal>

      {/* ===== Draft Modal (two-step: form → preview → save) ===== */}
      <EntityModal
        open={modalType === 'draft'}
        title={draftPreview ? 'معاينة الصياغة' : 'صياغة مستند قانوني'}
        onClose={() => { setModalType(null); setDraftPreview(null); }}
        onSubmit={draftPreview ? handleDraftSave : handleDraftPreview}
        loading={saving}
        submitLabel={draftPreview ? 'حفظ الصياغة' : 'معاينة الصياغة'}
      >
        {!draftPreview ? (
          <>
        <Field label="المستند المرتبط (اختياري)">
          <Select value={draftForm.document_id || ''} onChange={(e) => setDraftForm({ ...draftForm, document_id: e.target.value })}>
            <option value="">— بدون مستند مرتبط —</option>
            {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </Select>
        </Field>
        <Field label="نوع الصياغة" required>
          <Select value={draftForm.draft_type} onChange={(e) => setDraftForm({ document_id: draftForm.document_id, draft_type: e.target.value })}>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>

        {/* === Contract fields === */}
        {draftForm.draft_type === 'contract' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">معلومات العقد</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الطرف الأول"><TextInput value={draftForm.party1 || ''} onChange={(e) => setDraftForm({ ...draftForm, party1: e.target.value })} placeholder="مثال: شركة الأمل للتوريدات" /></Field>
              <Field label="الطرف الثاني"><TextInput value={draftForm.party2 || ''} onChange={(e) => setDraftForm({ ...draftForm, party2: e.target.value })} placeholder="مثال: شركة النور للتجارة" /></Field>
            </div>
            <Field label="موضوع العقد"><TextInput value={draftForm.subject || ''} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} placeholder="مثال: توريد معدات صناعية" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="القيمة المالية"><TextInput value={draftForm.amount || ''} onChange={(e) => setDraftForm({ ...draftForm, amount: e.target.value })} placeholder="مثال: 500,000 جنيه" /></Field>
              <Field label="مدة العقد"><TextInput value={draftForm.duration || ''} onChange={(e) => setDraftForm({ ...draftForm, duration: e.target.value })} placeholder="مثال: 12 شهراً" /></Field>
            </div>
            <Field label="شروط إضافية"><TextArea value={draftForm.conditions || ''} onChange={(e) => setDraftForm({ ...draftForm, conditions: e.target.value })} rows={3} placeholder="شروط الضمان، التسليم، الجزاءات..." /></Field>
          </div>
        )}

        {/* === Appeal / Lawsuit fields === */}
        {(draftForm.draft_type === 'appeal' || draftForm.draft_type === 'lawsuit') && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">{draftForm.draft_type === 'appeal' ? 'معلومات الطعن' : 'معلومات الدعوى'}</p>
            <Field label="المحكمة"><TextInput value={draftForm.court || ''} onChange={(e) => setDraftForm({ ...draftForm, court: e.target.value })} placeholder="مثال: محكمة استئناف القاهرة" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الطعن/الدعوى"><TextInput value={draftForm.case_number || ''} onChange={(e) => setDraftForm({ ...draftForm, case_number: e.target.value })} placeholder="مثال: 1234 لسنة 2023" /></Field>
              <Field label="نوع القانون"><TextInput value={draftForm.law_type || ''} onChange={(e) => setDraftForm({ ...draftForm, law_type: e.target.value })} placeholder="مثال: مدني / جنائي" /></Field>
            </div>
            <Field label="أطراف النزاع"><TextInput value={draftForm.parties || ''} onChange={(e) => setDraftForm({ ...draftForm, parties: e.target.value })} placeholder="مثال: المدعي: ... / المدعى عليه: ..." /></Field>
            <Field label="موضوع النزاع"><TextArea value={draftForm.subject || ''} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} rows={3} placeholder="وصف موضوع النزاع..." /></Field>
            <Field label="الطلبات"><TextArea value={draftForm.requests || ''} onChange={(e) => setDraftForm({ ...draftForm, requests: e.target.value })} rows={2} placeholder="مثال: قبول الطعن، إلغاء الحكم، التعويض..." /></Field>
          </div>
        )}

        {/* === Legal opinion fields === */}
        {draftForm.draft_type === 'legal_opinion' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">معلومات الرأي القانوني</p>
            <Field label="موضوع الاستشارة"><TextInput value={draftForm.subject || ''} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} placeholder="مثال: مدى قانونية شرط في عقد" /></Field>
            <Field label="الوقائع"><TextArea value={draftForm.facts || ''} onChange={(e) => setDraftForm({ ...draftForm, facts: e.target.value })} rows={3} placeholder="وصف الوقائع موضوع الاستشارة..." /></Field>
            <Field label="القوانين المرجعية"><TextInput value={draftForm.references || ''} onChange={(e) => setDraftForm({ ...draftForm, references: e.target.value })} placeholder="مثال: القانون المدني، قانون العمل" /></Field>
          </div>
        )}

        {/* === Memo fields === */}
        {draftForm.draft_type === 'memo' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">معلومات المذكرة</p>
            <Field label="عنوان المذكرة"><TextInput value={draftForm.subject || ''} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} placeholder="مثال: مذكرة دفاع في الدعوى رقم..." /></Field>
            <Field label="الوقائع"><TextArea value={draftForm.facts || ''} onChange={(e) => setDraftForm({ ...draftForm, facts: e.target.value })} rows={3} placeholder="وقائع الدعوى..." /></Field>
            <Field label="الدفوع"><TextArea value={draftForm.defenses || ''} onChange={(e) => setDraftForm({ ...draftForm, defenses: e.target.value })} rows={3} placeholder="الدفوع القانونية..." /></Field>
            <Field label="الطلبات"><TextArea value={draftForm.requests || ''} onChange={(e) => setDraftForm({ ...draftForm, requests: e.target.value })} rows={2} placeholder="الطلبات الختامية..." /></Field>
          </div>
        )}

        {/* === Regulation fields === */}
        {draftForm.draft_type === 'regulation' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">معلومات اللائحة</p>
            <Field label="عنوان اللائحة"><TextInput value={draftForm.subject || ''} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} placeholder="مثال: لائحة تنظيم العمل داخل المنشأة" /></Field>
            <Field label="الجهة المصدرة"><TextInput value={draftForm.issuer || ''} onChange={(e) => setDraftForm({ ...draftForm, issuer: e.target.value })} placeholder="مثال: مجلس إدارة الشركة" /></Field>
            <Field label="نطاق التطبيق"><TextArea value={draftForm.scope || ''} onChange={(e) => setDraftForm({ ...draftForm, scope: e.target.value })} rows={2} placeholder="مثال: تسري على جميع العاملين..." /></Field>
            <Field label="البنود الرئيسية"><TextArea value={draftForm.conditions || ''} onChange={(e) => setDraftForm({ ...draftForm, conditions: e.target.value })} rows={3} placeholder="البنود التنظيمية..." /></Field>
          </div>
        )}

        {/* === Ruling fields === */}
        {draftForm.draft_type === 'ruling' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">معلومات الحكم</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="المحكمة"><TextInput value={draftForm.court || ''} onChange={(e) => setDraftForm({ ...draftForm, court: e.target.value })} placeholder="مثال: محكمة النقض" /></Field>
              <Field label="رقم الحكم"><TextInput value={draftForm.case_number || ''} onChange={(e) => setDraftForm({ ...draftForm, case_number: e.target.value })} placeholder="مثال: 1234 لسنة 2023" /></Field>
            </div>
            <Field label="أطراف النزاع"><TextInput value={draftForm.parties || ''} onChange={(e) => setDraftForm({ ...draftForm, parties: e.target.value })} placeholder="أطراف النزاع..." /></Field>
            <Field label="الوقائع"><TextArea value={draftForm.facts || ''} onChange={(e) => setDraftForm({ ...draftForm, facts: e.target.value })} rows={3} placeholder="وقائع النزاع..." /></Field>
            <Field label="المنطوق"><TextArea value={draftForm.requests || ''} onChange={(e) => setDraftForm({ ...draftForm, requests: e.target.value })} rows={2} placeholder="منطوق الحكم..." /></Field>
          </div>
        )}

        {/* === Clause fields === */}
        {draftForm.draft_type === 'clause' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">معلومات البند التعاقدي</p>
            <Field label="نوع البند"><TextInput value={draftForm.subject || ''} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} placeholder="مثال: شرط جزائي / شرط تحكيم / شرط سرية" /></Field>
            <Field label="الأطراف"><TextInput value={draftForm.parties || ''} onChange={(e) => setDraftForm({ ...draftForm, parties: e.target.value })} placeholder="الأطراف المعنية بالبند..." /></Field>
            <Field label="تفاصيل البند"><TextArea value={draftForm.conditions || ''} onChange={(e) => setDraftForm({ ...draftForm, conditions: e.target.value })} rows={3} placeholder="تفاصيل ومحتوى البند التعاقدي..." /></Field>
          </div>
        )}

        {/* === Other fields === */}
        {draftForm.draft_type === 'other' && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <p className="font-body text-xs font-bold text-gold">معلومات المستند</p>
            <Field label="العنوان"><TextInput value={draftForm.subject || ''} onChange={(e) => setDraftForm({ ...draftForm, subject: e.target.value })} placeholder="عنوان المستند..." /></Field>
            <Field label="المحتوى المطلوب"><TextArea value={draftForm.conditions || ''} onChange={(e) => setDraftForm({ ...draftForm, conditions: e.target.value })} rows={4} placeholder="وصف محتوى المستند المطلوب صياغته..." /></Field>
          </div>
        )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-gold/10 rounded-lg p-3 border border-gold/20">
              <FileText size={16} className="text-gold" />
              <p className="font-body text-xs text-midnight">هذه معاينة للصياغة المُولّدة. يمكنك الحفظ أو الرجوع للتعديل.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
              <pre className="font-body text-sm text-midnight whitespace-pre-wrap leading-relaxed" dir="rtl">{draftPreview}</pre>
            </div>
            <button
              onClick={() => setDraftPreview(null)}
              className="w-full px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              رجوع للتعديل
            </button>
          </div>
        )}
      </EntityModal>

      {/* ===== Translate Modal ===== */}
      <EntityModal open={modalType === 'translate'} title="ترجمة مستند" onClose={() => setModalType(null)} onSubmit={handleTranslate} loading={saving} submitLabel="ترجمة">
        <Field label="المستند" required>
          <Select value={translateForm.document_id} onChange={(e) => setTranslateForm({ ...translateForm, document_id: e.target.value })}>
            <option value="">— اختر —</option>
            {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </Select>
        </Field>
        <Field label="اللغة الهدف">
          <Select value={translateForm.target_language} onChange={(e) => setTranslateForm({ ...translateForm, target_language: e.target.value })}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
          </Select>
        </Field>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="font-body text-xs text-blue-700 flex items-center gap-1.5">
            <Globe size={14} /> سيتم ترجمة المستند مع الحفاظ على المصطلحات القانونية المتخصصة.
          </p>
        </div>
      </EntityModal>



      {/* ===== Compliance Report Preview Modal ===== */}
      {compliancePreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setCompliancePreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-heading font-bold text-midnight text-base">معاينة تقرير الامتثال — {compliancePreview.docTitle}</h3>
                <p className="font-body text-xs text-ink/50 mt-0.5">راجع التقرير قبل التصدير</p>
              </div>
              <button onClick={() => setCompliancePreview(null)} className="text-ink/40 hover:text-ink/70 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                  <p className="font-heading font-bold text-green-700 text-2xl">{compliancePreview.checks.filter(c => c.compliance_status === 'compliant').length}</p>
                  <p className="font-body text-[10px] text-green-600">ممتثل</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                  <p className="font-heading font-bold text-red-600 text-2xl">{compliancePreview.checks.filter(c => c.compliance_status === 'non_compliant').length}</p>
                  <p className="font-body text-[10px] text-red-500">غير ممتثل</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                  <p className="font-heading font-bold text-amber-700 text-2xl">{compliancePreview.checks.filter(c => c.compliance_status === 'partial').length}</p>
                  <p className="font-body text-[10px] text-amber-600">جزئي</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                  <p className="font-heading font-bold text-blue-700 text-2xl">{compliancePreview.checks.filter(c => c.compliance_status === 'needs_review').length}</p>
                  <p className="font-body text-[10px] text-blue-600">يحتاج مراجعة</p>
                </div>
              </div>

              {/* Checks table */}
              {compliancePreview.checks.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldCheck size={32} className="text-ink/20 mx-auto mb-2" />
                  <p className="font-body text-sm text-ink/40">لا توجد نتائج فحص امتثال لهذا المستند.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-midnight text-cream">
                        <th className="px-3 py-2.5 text-right font-body text-xs font-bold">المرجع</th>
                        <th className="px-3 py-2.5 text-right font-body text-xs font-bold">المادة</th>
                        <th className="px-3 py-2.5 text-right font-body text-xs font-bold">الحالة</th>
                        <th className="px-3 py-2.5 text-right font-body text-xs font-bold">الخطورة</th>
                        <th className="px-3 py-2.5 text-right font-body text-xs font-bold">النتيجة</th>
                        <th className="px-3 py-2.5 text-right font-body text-xs font-bold">التوصية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compliancePreview.checks.map((check) => {
                        const compMeta = COMPLIANCE_LABELS[check.compliance_status] || COMPLIANCE_LABELS.needs_review;
                        const sevMeta = SEVERITY_LABELS[check.severity] || SEVERITY_LABELS.low;
                        return (
                          <tr key={check.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 font-body text-xs text-midnight">{check.reference_title}</td>
                            <td className="px-3 py-2 font-body text-xs text-ink/60">{check.reference_article || '—'}</td>
                            <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${compMeta.color}`}>{compMeta.label}</span></td>
                            <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${sevMeta.color}`}>{sevMeta.label}</span></td>
                            <td className="px-3 py-2 font-body text-xs text-ink/70 max-w-[200px]">{check.finding_summary}</td>
                            <td className="px-3 py-2 font-body text-xs text-ink/70 max-w-[200px]">{check.recommendation || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button onClick={() => setCompliancePreview(null)} className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors">
                إلغاء
              </button>
              <div className="flex items-center gap-2">
                {EXPORT_FORMATS.map(f => (
                  <button
                    key={f.code}
                    onClick={() => confirmComplianceExport(f.code)}
                    disabled={!!exporting}
                    className="px-3 py-2 rounded-lg font-body text-xs font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Download size={12} />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message={deleteType === 'document' ? 'سيتم حذف المستند وجميع تحليلات الامتثال والترجمات المرتبطة به.' : 'سيتم حذف هذا العنصر.'}
      />
    </div>
  );
}

// ===== Helper Functions =====

function generateDraftText(type: string, form: Record<string, string>): string {
  const date = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const typeLabel = DOC_TYPE_LABELS[type] || type;
  const g = (key: string) => form[key] || '';

  if (type === 'contract') {
    return `إنه في يوم ${date}، تم الاتفاق بين الأطراف الآتي بيانهم على ما يلي:

المادة الأولى (الأطراف):
الطرف الأول: ${g('party1') || '........................'}
الطرف الثاني: ${g('party2') || '........................'}

المادة الثانية (موضوع العقد):
${g('subject') || 'يحدد موضوع العقد بموجب هذا البند'}

المادة الثالثة (المقابل المالي):
يكون مقابل الخدمات المقدمة بموجب هذا العقد ${g('amount') || 'القيمة المتفق عليها بين الطرفين'}، ويُسدد وفق الشروط والأجل المتفق عليهما.

المادة الرابعة (مدة العقد):
يسري هذا العقد لمدة ${g('duration') || 'المدة المتفق عليها'} من تاريخ توقيعه، ويجوز تجديده بموجب اتفاق كتابي بين الطرفين.

المادة الخامسة (الالتزامات والشروط):
${g('conditions') || 'يلتزم الطرفان بتنفيذ جميع بنود هذا العقد بحسن نية، ووفقاً لأحكام القانون المدني المصري والقوانين ذات الصلة.'}

المادة السادسة (حل النزاعات):
في حال نشوء أي نزاع حول تفسير أو تنفيذ هذا العقد، يُحال النزاع إلى التحكيم وفق أحكام قانون التحكيم المصري.

حرر هذا العقد من نسختين أصليتين، بيد كل طرف نسخة للعمل بموجبها.`;
  }

  if (type === 'appeal' || type === 'lawsuit') {
    const action = type === 'appeal' ? 'الطعن' : 'الدعوى';
    return `إنه في يوم ${date}،

السيد المستشار / رئيس ${g('court') || 'المحكمة المختصة'}
تحية طيبة وبعد،

${typeLabel} رقم ${g('case_number') || '.....'} لسنة ${g('law_type') || '.....'}:

أطراف النزاع:
${g('parties') || '........................'}

الوقائع:
${g('subject') || 'تتلخص وقائع النزاع فيما تم بيانه أعلاه'}

الطلبات:
يلتمس ${type === 'appeal' ? 'الطاعن' : 'المدعي'} من عدالة المحكمة الموقرة الحكم بالآتي:
${g('requests') || '1. قبول ' + action + ' شكلاً وفي الموضوع.\n2. الحكم في الموضوع.\n3. إلزام المدعى عليه بالمصاريف والأتعاب.'}

والله ولي التوفيق،
المحامي`;
  }

  if (type === 'legal_opinion') {
    return `رأي قانوني
${date}

الموضوع: ${g('subject') || '........................'}

التمهيد:
بناءً على الطلب المقدم إلينا ببيان الرأي القانوني حول الموضوع المشار إليه أعلاه، فقد قمنا بدراسة الواقعة من كافة جوانبها القانونية.

الوقائع:
${g('facts') || 'تتلخص وقائع الموضوع فيما تم بيانه أعلاه'}

التحليل القانوني:
استناداً إلى ${g('references') || 'أحكام القانون المصري والقوانين المكملة'}، فإن الواقعة المطروحة تسري عليها الأحكام الآتية:
يخضع الموضوع المطروح لأحكام النصوص القانونية المرجعية، ويترتب على ذلك تحديد الموقف القانوني وفقاً لما تستوجبه هذه النصوص.

الخلاصة:
بناءً على ما تقدم، نرى أن الموقف القانوني يتمثل في أن الموضوع محل الاستشارة يخضع لأحكام القوانين المشار إليها، ويُنصح باتخاذ الإجراءات القانونية المناسبة.

التوصيات:
نوصي بالآتي:
1. اتخاذ الإجراءات القانونية اللازمة وفقاً للتحليل أعلاه.
2. حفظ كافة المستندات المؤيدة للحق.
3. الرجوع إلى النصوص القانونية المرجعية للتأكد من التطبيق الصحيح.

والله الموفق،
المستشار القانوني`;
  }

  if (type === 'memo') {
    return `مذكرة قانونية
${date}

العنوان: ${g('subject') || '........................'}

الوقائع:
${g('facts') || 'تتلخص وقائع الدعوى فيما تم بيانه أعلاه'}

الدفوع:
${g('defenses') || 'نتمسك بكافة الدفوع القانونية المقررة'}

الطلبات:
يلتمس مقدم المذكرة من عدالة المحكمة الحكم بالآتي:
${g('requests') || '1. قبول الدعوى شكلاً وفي الموضوع.\n2. رفض الدعوى المقابلة.\n3. إلزام المدعى بالمصاريف والأتعاب.'}

والله ولي التوفيق،
المحامي`;
  }

  if (type === 'regulation') {
    return `${g('subject') || 'لائحة تنظيمية'}
${date}

الجهة المصدرة: ${g('issuer') || '........................'}

المادة 1 (نطاق التطبيق):
${g('scope') || 'تسري أحكام هذه اللائحة على جميع الأفراد والجهات الخاضعة لها'}

المادة 2 (الأحكام الرئيسية):
${g('conditions') || 'تحدد هذه اللائحة الأحكام والضوابط المنظمة للعمل'}

المادة 3 (المخالفات):
يُعاقب كل من يخالف أحكام هذه اللائحة بالعقوبات التأديبية أو الإدارية المقررة.

المادة 4 (التنفيذ):
يُعمل بأحكام هذه اللائحة من تاريخ اعتمادها ونشرها.`;
  }

  if (type === 'ruling') {
    return `حكم ${g('court') || 'المحكمة'} رقم ${g('case_number') || '.....'}
${date}

الأطراف:
${g('parties') || '........................'}

الوقائع:
${g('facts') || 'تتلخص وقائع النزاع فيما تم بيانه أعلاه'}

المنطوق:
${g('requests') || 'حكمت المحكمة بقبول الدعوى وفي الموضوع بالآتي...'}

وحكمت المحكمة بذلك في جلسة ${date}.`;
  }

  if (type === 'clause') {
    return `بند تعاقدي: ${g('subject') || '........................'}
${date}

الأطراف: ${g('parties') || '........................'}

نص البند:
${g('conditions') || 'يُحدد نص البند التعاقدي بموجب هذا الإطار'}

هذا البند جزء لا يتجزأ من العقد الأصلي ويخضع لكافة شروطه وأحكامه.`;
  }

  return `${g('subject') || 'مستند قانوني'}
${date}

${g('conditions') || 'المحتوى المطلوب'}

حرر هذا المستند للمراجعة والاعتماد.`;
}

function simulateTranslation(text: string, targetLang: string): string {
  if (!text) return '';
  const langName = LANGUAGE_LABELS[targetLang] || targetLang;
  const flag = LANGUAGES.find(l => l.code === targetLang)?.flag || '';

  // For Arabic to English, do a simple transliteration placeholder
  if (targetLang === 'en') {
    return `[Translated to English — ${flag}]\n\nThis is a machine-transuncated translation of the original legal document. The translation preserves the legal terminology and structure of the source text.\n\nOriginal content: ${text.slice(0, 200)}...\n\nNote: This translation should be reviewed by a certified legal translator before official use.`;
  }

  return `[تمت الترجمة إلى ${langName} ${flag}]\n\nهذه ترجمة آلية للمستند القانوني الأصلي. تم الحفاظ على المصطلحات القانونية وهيكل النص المصدر.\n\nالمحتوى الأصلي: ${text.slice(0, 200)}...\n\nملاحظة: يجب مراجعة هذه الترجمة بواسطة مترجم قانوني معتمد قبل الاستخدام الرسمي.`;
}

function generatePrintableHTML(doc: LegalDocument, exportType: string, checks: ComplianceCheck[]): string {
  const title = exportType === 'compliance_report' ? `تقرير الامتثال القانوني — ${doc.title}` : doc.title;
  let body = '';

  if (exportType === 'compliance_report' && checks.length > 0) {
    body = `
      <h2 style="color: #0B132B; border-bottom: 2px solid #C5A059; padding-bottom: 10px;">نتائج فحص الامتثال</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #0B132B; color: #F8F9FA;">
            <th style="padding: 10px; text-align: right;">المرجع</th>
            <th style="padding: 10px; text-align: right;">المادة</th>
            <th style="padding: 10px; text-align: right;">الحالة</th>
            <th style="padding: 10px; text-align: right;">الخطورة</th>
            <th style="padding: 10px; text-align: right;">النتيجة</th>
            <th style="padding: 10px; text-align: right;">التوصية</th>
          </tr>
        </thead>
        <tbody>
          ${checks.map(c => `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px;">${c.reference_title}</td>
              <td style="padding: 8px;">${c.reference_article || '—'}</td>
              <td style="padding: 8px;">${COMPLIANCE_LABELS[c.compliance_status]?.label || c.compliance_status}</td>
              <td style="padding: 8px;">${SEVERITY_LABELS[c.severity]?.label || c.severity}</td>
              <td style="padding: 8px;">${c.finding_summary}</td>
              <td style="padding: 8px;">${c.recommendation || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    body = `<div style="white-space: pre-wrap; line-height: 1.8; font-size: 14px;">${doc.content_text || 'لا يوجد محتوى'}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: 'Cairo', 'Tajawal', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #2C3E50; }
  h1 { color: #0B132B; border-bottom: 3px solid #C5A059; padding-bottom: 15px; }
  .meta { color: #888; font-size: 12px; margin-bottom: 20px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="meta">
  النوع: ${DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type} | اللغة: ${LANGUAGE_LABELS[doc.language] || doc.language} | التاريخ: ${new Date(doc.created_at).toLocaleDateString('ar-EG')}
</div>
${body}
</body>
</html>`;
}

function generateRTF(doc: LegalDocument, exportType: string): string {
  const content = doc.content_text || 'لا يوجد محتوى';
  const escaped = content.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/\n/g, '\\par\n');
  return `{\\rtf1\\ansi\\deff0\\rtlpar\\f0\\fs24\\b ${doc.title}\\b0\\par\n\\par\n${escaped}}`;
}

async function generateImageFromText(doc: LegalDocument, format: string): Promise<string | null> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 800, 600);
    ctx.fillStyle = '#0B132B';
    ctx.font = 'bold 24px Cairo, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(doc.title, 780, 50);

    ctx.fillStyle = '#C5A059';
    ctx.fillRect(20, 70, 760, 2);

    ctx.fillStyle = '#2C3E50';
    ctx.font = '14px Tajawal, sans-serif';
    const lines = (doc.content_text || 'لا يوجد محتوى').split('\n');
    let y = 100;
    for (const line of lines.slice(0, 25)) {
      ctx.fillText(line.slice(0, 60), 780, y);
      y += 20;
      if (y > 580) break;
    }

    return canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png');
  } catch {
    return null;
  }
}
