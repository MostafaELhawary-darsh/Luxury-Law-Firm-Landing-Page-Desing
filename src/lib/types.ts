export type LibrarySection =
  | 'dashboard'
  | 'today'
  | 'search-legislation'
  | 'egyptian-laws'
  | 'gazette'
  | 'cassation'
  | 'cassation-alpha'
  | 'constitutional'
  | 'supreme-admin'
  | 'unification'
  | 'admin-judiciary'
  | 'admin-judiciary-2'
  | 'fatwas';

export interface Legislation {
  id: string;
  title: string;
  legislation_number: string;
  year: number;
  type: string;
  issuing_authority: string | null;
  publication_date: string | null;
  gazette_issue_number: string | null;
  gazette_issue_date: string | null;
  full_text: string | null;
  status: string;
  created_at: string;
}

export interface CourtRuling {
  id: string;
  court_type: string;
  ruling_number: string;
  judicial_year: string | null;
  session_date: string | null;
  session_date_to: string | null;
  circuit: string | null;
  subject: string | null;
  principle: string;
  appeal_summary: string | null;
  ruling_text: string | null;
  ruling_type: string;
  created_at: string;
}

export interface Fatwa {
  id: string;
  fatwa_number: string;
  year: string;
  file_number: string | null;
  fatwa_date: string | null;
  session_date: string | null;
  subject: string | null;
  principle: string | null;
  text_content: string;
  created_at: string;
}

export interface GazetteIssue {
  id: string;
  issue_number: string;
  year: number;
  publication_date: string | null;
  sector: string;
  content_summary: string | null;
  full_text: string | null;
  created_at: string;
}

export interface LawStructureNode {
  id: string;
  legislation_id: string | null;
  parent_id: string | null;
  node_type: string;
  node_number: string | null;
  title: string;
  content: string | null;
  sort_order: number;
  children?: LawStructureNode[];
}

export interface SubjectIndexNode {
  id: string;
  parent_id: string | null;
  subject_name: string;
  category: string | null;
  reference_type: string | null;
  reference_id: string | null;
  sort_order: number;
  children?: SubjectIndexNode[];
}

export type SearchPrecision = 'all' | 'phrase' | 'any';
export type ViewMode = 'list' | 'grid';
export type SortOrder = 'newest' | 'oldest' | 'number';

export interface SearchFilters {
  query: string;
  precision: SearchPrecision;
  legislationNumber: string;
  year: string;
  articleText: string;
  gazetteType: string;
  gazetteIssue: string;
  pubDateFrom: string;
  pubDateTo: string;
  legislationTypes: string[];
  scope: string;
  courtType: string;
  circuit: string;
  rulingType: string;
  sessionDateFrom: string;
  sessionDateTo: string;
  fileNumber: string;
  fatwaDateFrom: string;
  fatwaDateTo: string;
  sector: string;
}

export const defaultFilters: SearchFilters = {
  query: '',
  precision: 'all',
  legislationNumber: '',
  year: '',
  articleText: '',
  gazetteType: '',
  gazetteIssue: '',
  pubDateFrom: '',
  pubDateTo: '',
  legislationTypes: [],
  scope: '',
  courtType: '',
  circuit: '',
  rulingType: '',
  sessionDateFrom: '',
  sessionDateTo: '',
  fileNumber: '',
  fatwaDateFrom: '',
  fatwaDateTo: '',
  sector: 'كافة القطاعات',
};
