import { useCallback } from 'react';
import { useVoice } from '@/lib/voiceContext';
import type { LibrarySection, SearchFilters } from '@/lib/types';
import { buildCaseLibraryContext } from '@/lib/legalLibraryIntegration';

export interface CaseResearchContext {
  caseId?: string;
  caseNumber?: string;
  title?: string;
  legalBasis?: string;
  court?: string;
  courtCircuit?: string;
  caseCategory?: string;
  factsSummary?: string;
  partiesSummary?: string;
}

export function useLibrarySearch() {
  const { registerSectionNav } = useVoice();

  const openLibrary = useCallback(
    (options: {
      section?: LibrarySection;
      query?: string;
      filters?: Partial<SearchFilters>;
      caseContext?: CaseResearchContext;
    }) => {
      let section = options.section || 'search-legislation';
      let query = options.query || '';
      let filters = options.filters;

      // إذا كان هناك سياق قضية، أنشئ البحث منه
      if (options.caseContext) {
        const context = buildCaseLibraryContext({
          title: options.caseContext.title,
          legal_basis: options.caseContext.legalBasis,
          case_number: options.caseContext.caseNumber,
          court: options.caseContext.court,
          court_circuit: options.caseContext.courtCircuit,
          case_category: options.caseContext.caseCategory,
          facts_summary: options.caseContext.factsSummary,
          parties_summary: options.caseContext.partiesSummary,
        });
        section = context.section;
        query = context.query;
        filters = context.filters;
      }

      // بناء URL مع query parameters
      const params = new URLSearchParams();
      params.set('section', section);
      params.set('query', query);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== '') {
            if (Array.isArray(value)) {
              params.set(key, value.join(','));
            } else {
              params.set(key, String(value));
            }
          }
        });
      }

      // إرسال الأمر للتنقل للمكتبة
      const libraryUrl = `/library?${params.toString()}`;
      window.location.hash = libraryUrl;

      // تعريف الملاح بالقسم الجديد
      registerSectionNav?.((s: string) => {
        if (s === 'library') {
          // تم الانتقال للمكتبة
        }
      });
    },
    [registerSectionNav]
  );

  return { openLibrary };
}
