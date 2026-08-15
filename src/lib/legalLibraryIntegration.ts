import { defaultFilters, type LibrarySection, type SearchFilters } from './types.ts';

export interface CaseLibraryContext {
  section: LibrarySection;
  query: string;
  filters: Partial<SearchFilters>;
}

export function buildCaseLibraryContext(caseData: {
  title?: string | null;
  legal_basis?: string | null;
  case_number?: string | null;
  court?: string | null;
  court_circuit?: string | null;
  case_category?: string | null;
  source_engine?: string | null;
  facts_summary?: string | null;
  parties_summary?: string | null;
}): CaseLibraryContext {
  const strongTerms = [
    caseData.title,
    caseData.legal_basis,
    caseData.case_number,
    caseData.court,
    caseData.court_circuit,
    caseData.case_category,
    caseData.source_engine,
    caseData.facts_summary,
    caseData.parties_summary,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const normalizedTerms = strongTerms
    .flatMap((value) => value.split(/[\s\|،؛]+/).filter(Boolean))
    .filter((token, index, arr) => token.length > 2 && arr.indexOf(token) === index)
    .slice(0, 10);

  const query = normalizedTerms.length > 0
    ? normalizedTerms.join(' ')
    : 'بحث قانوني متقدم';

  const legalBasis = caseData.legal_basis?.trim() || '';
  const filters: Partial<SearchFilters> = {
    ...defaultFilters,
    query,
    precision: 'all',
    scope: 'الموضوع',
    articleText: legalBasis,
  };

  return {
    section: 'search-legislation',
    query,
    filters,
  };
}
