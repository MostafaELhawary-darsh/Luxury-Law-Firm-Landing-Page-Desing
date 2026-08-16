import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Home } from 'lucide-react';
import type { LibrarySection, SearchFilters } from '@/lib/types';
import { defaultFilters } from '@/lib/types';
import { sectionConfigs } from '@/lib/libraryConfig';
import LibraryHome from './LibraryHome';
import LibraryDashboard from './LibraryDashboard';
import SearchForm from './SearchForm';
import ResultsTable, { type ResultRow } from './ResultsTable';
import DocumentDetail from './DocumentDetail';
import LawIndexView from './LawIndexView';
import SubjectIndexView from './SubjectIndexView';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface LibraryPageProps {
  onBackToSite: () => void;
}

export default function LibraryPage({ onBackToSite }: LibraryPageProps) {
  const [section, setSection] = useState<LibrarySection | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ResultRow | null>(null);
  const [docDataSource, setDocDataSource] = useState<string>('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);

  const handleFilterChange = useCallback((key: string, value: string | string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setFilters(defaultFilters);
    setResults([]);
    setHasSearched(false);
  }, []);

  const buildQuery = useCallback(
    (config: typeof sectionConfigs[LibrarySection], f: SearchFilters) => {
      let query = supabase.from(config.dataSource).select('*');

      // Court type filter
      if (config.courtTypeFilter) {
        query = query.eq('court_type', config.courtTypeFilter);
      }

      // Text search
      if (f.query) {
        const searchFields = getSearchFields(config.dataSource, f.scope);
        if (searchFields.length > 0) {
          // Use or/ilike for text search
          const searchConditions = searchFields.map((field) => `${field}.ilike.%${f.query}%`);
          query = query.or(searchConditions.join(','));
        }
      }

      // Legislation number
      if (f.legislationNumber) {
        if (config.dataSource === 'legislation') {
          query = query.eq('legislation_number', f.legislationNumber);
        } else if (config.dataSource === 'court_rulings') {
          query = query.eq('ruling_number', f.legislationNumber);
        } else if (config.dataSource === 'fatwas') {
          query = query.eq('fatwa_number', f.legislationNumber);
        } else if (config.dataSource === 'gazette_issues') {
          query = query.eq('issue_number', f.legislationNumber);
        }
      }

      // Year
      if (f.year) {
        if (config.dataSource === 'fatwas' || config.dataSource === 'court_rulings') {
          query = query.eq('judicial_year', f.year);
        } else {
          query = query.eq('year', parseInt(f.year, 10) || f.year);
        }
      }

      // Article text
      if (f.articleText && config.dataSource === 'legislation') {
        query = query.ilike('full_text', `%${f.articleText}%`);
      }

      // Gazette issue
      if (f.gazetteIssue) {
        if (config.dataSource === 'legislation') {
          query = query.eq('gazette_issue_number', f.gazetteIssue);
        } else if (config.dataSource === 'gazette_issues') {
          query = query.eq('issue_number', f.gazetteIssue);
        }
      }

      // Date ranges
      if (f.pubDateFrom && config.dataSource === 'legislation') {
        query = query.gte('publication_date', f.pubDateFrom);
      }
      if (f.pubDateTo && config.dataSource === 'legislation') {
        query = query.lte('publication_date', f.pubDateTo);
      }

      if (f.sessionDateFrom && config.dataSource === 'court_rulings') {
        query = query.gte('session_date', f.sessionDateFrom);
      }
      if (f.sessionDateTo && config.dataSource === 'court_rulings') {
        query = query.lte('session_date', f.sessionDateTo);
      }

      if (f.fatwaDateFrom && config.dataSource === 'fatwas') {
        query = query.gte('fatwa_date', f.fatwaDateFrom);
      }
      if (f.fatwaDateTo && config.dataSource === 'fatwas') {
        query = query.lte('fatwa_date', f.fatwaDateTo);
      }

      // Circuit
      if (f.circuit && config.dataSource === 'court_rulings') {
        query = query.eq('circuit', f.circuit);
      }

      // Ruling type
      if (f.rulingType && config.dataSource === 'court_rulings') {
        query = query.eq('ruling_type', f.rulingType);
      }

      // File number
      if (f.fileNumber && config.dataSource === 'fatwas') {
        query = query.eq('file_number', f.fileNumber);
      }

      // Sector
      if (f.sector && f.sector !== 'كافة القطاعات' && config.dataSource === 'gazette_issues') {
        query = query.eq('sector', f.sector);
      }

      // Legislation types
      if (f.legislationTypes.length > 0 && config.dataSource === 'legislation') {
        query = query.in('type', f.legislationTypes);
      }

      query = query.order('created_at', { ascending: false }).limit(50);

      return query;
    },
    []
  );

  const getSearchFields = (dataSource: string, scope: string): string[] => {
    if (dataSource === 'legislation') return ['title', 'full_text'];
    if (dataSource === 'court_rulings') {
      if (scope === 'الموضوع') return ['subject'];
      if (scope === 'المبدأ') return ['principle'];
      if (scope === 'موجز الطعن') return ['appeal_summary'];
      if (scope === 'نص الحكم') return ['ruling_text'];
      return ['subject', 'principle', 'appeal_summary', 'ruling_text'];
    }
    if (dataSource === 'fatwas') {
      if (scope === 'نص الفتوى') return ['text_content'];
      if (scope === 'موضوع الفتوى') return ['subject'];
      if (scope === 'مبدأ الفتوى') return ['principle'];
      return ['text_content', 'subject', 'principle'];
    }
    if (dataSource === 'gazette_issues') return ['content_summary', 'full_text'];
    return [];
  };

  const handleSearch = useCallback(async () => {
    if (!section) return;
    const config = sectionConfigs[section];
    setLoading(true);
    setHasSearched(true);
    const query = buildQuery(config, filters);
    const { data, error } = await query;
    if (error) {
      console.error('Search error:', error);
    }
    setResults((data as ResultRow[]) || []);
    setLoading(false);
  }, [section, filters, buildQuery]);

  // Auto-search for "today" section
  useEffect(() => {
    if (section === 'today') {
      setLoading(true);
      setHasSearched(true);
      supabase
        .from('legislation')
        .select('*')
        .order('publication_date', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          setResults((data as ResultRow[]) || []);
          setLoading(false);
        });
    }
  }, [section]);

  const handleRowClick = (row: ResultRow) => {
    if (!section) return;
    setSelectedDoc(row);
    setDocDataSource(sectionConfigs[section].dataSource);
  };

  const handleDocSelect = (row: ResultRow, dataSource: string) => {
    setSelectedDoc(row);
    setDocDataSource(dataSource);
  };

  if (selectedDoc) {
    return (
      <DocumentDetail
        document={selectedDoc}
        dataSource={docDataSource}
        onClose={() => setSelectedDoc(null)}
        onNavigateBack={() => setSelectedDoc(null)}
      />
    );
  }

  if (!section) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <button
            onClick={onBackToSite}
            className="flex items-center gap-2 text-ink/60 hover:text-gold transition-colors font-body text-sm"
          >
            <Home size={16} />
            العودة للموقع
          </button>
          <span className="font-heading font-bold text-midnight text-sm">
            المكتبة القانونية الرقمية
          </span>
        </div>
        <LibraryHome onSelect={setSection} />
      </div>
    );
  }

  const config = sectionConfigs[section];
  const showDashboard = section === 'dashboard';
  const showLawIndex = section === 'egyptian-laws';
  const showSubjectIndex =
    section === 'cassation-alpha' ||
    section === 'unification' ||
    section === 'admin-judiciary-2';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setSection(null); setResults([]); setHasSearched(false); }}
            className="flex items-center gap-1.5 text-ink/60 hover:text-gold transition-colors font-body text-sm"
          >
            <Home size={16} />
            الرئيسية
          </button>
          <span className="text-ink/20">/</span>
          <span className="font-heading font-bold text-midnight text-sm">
            {config.title}
          </span>
        </div>
        <button
          onClick={onBackToSite}
          className="text-ink/40 hover:text-gold transition-colors font-body text-xs"
        >
          العودة للموقع
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* Dashboard */}
        {showDashboard && (
          <LibraryDashboard />
        )}

        {/* Search form */}
        {config.fields.length > 0 && (
          <SearchForm
            config={config}
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        )}

        {/* Law index view */}
        {showLawIndex && (
          <LawIndexView onDocumentSelect={handleDocSelect} />
        )}

        {/* Subject index view */}
        {showSubjectIndex && (
          <SubjectIndexView title={config.title} subtitle={config.subtitle} />
        )}

        {/* Results */}
        {hasSearched && (
          <ResultsTable
            columns={config.resultColumns}
            rows={results}
            loading={loading}
            onRowClick={handleRowClick}
          />
        )}

        {/* For sections with no search form (today), show results directly */}
        {section === 'today' && (
          <ResultsTable
            columns={config.resultColumns}
            rows={results}
            loading={loading}
            onRowClick={handleRowClick}
          />
        )}
      </div>
    </div>
  );
}
