import { createClient } from '@supabase/supabase-js';

export type LegalSourceKind = 'legislation' | 'regulation' | 'ruling' | 'fatwa' | 'scholarly' | 'thesis';

export const LEGAL_SOURCE_OPTIONS = [
  { value: 'legislation', label: 'قانون / تشريع' },
  { value: 'regulation', label: 'لوائح / قرارات تنفيذية' },
  { value: 'ruling', label: 'حكم / قرار قضائي' },
  { value: 'fatwa', label: 'فتوى / رأي شرعي' },
  { value: 'scholarly', label: 'مؤلف فقهى / قانوني' },
  { value: 'thesis', label: 'رسالة ماجستير / دكتوراه' },
] as const;

export interface LegalLibrarySourceInput {
  kind: LegalSourceKind;
  title: string;
  number?: string;
  year?: number | string;
  type?: string;
  authority?: string;
  publicationDate?: string;
  fullText?: string;
  summary?: string;
  subject?: string;
  principle?: string;
  courtType?: string;
  decisionDate?: string;
  author?: string;
  category?: string;
}

export interface LegalLibraryPayload {
  table: 'legislation' | 'court_rulings' | 'fatwas' | 'subject_index';
  record: Record<string, unknown>;
}

function getSupabaseClient() {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : undefined;
  const url = env?.VITE_SUPABASE_URL;
  const key = env?.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

export function buildLegalLibraryPayload(input: LegalLibrarySourceInput): LegalLibraryPayload {
  const yearNumber = Number(input.year ?? new Date().getFullYear());
  const normalizedYear = Number.isFinite(yearNumber) ? yearNumber : new Date().getFullYear();

  if (input.kind === 'ruling') {
    return {
      table: 'court_rulings',
      record: {
        court_type: input.courtType || 'النقض',
        ruling_number: input.number || `R-${Date.now()}`,
        judicial_year: String(normalizedYear),
        session_date: input.decisionDate || input.publicationDate || null,
        subject: input.subject || input.title,
        principle: input.principle || input.summary || 'مبدأ قانوني جديد',
        appeal_summary: input.summary || input.fullText || null,
        ruling_text: input.fullText || input.summary || 'لا يوجد نص',
        ruling_type: input.type || 'مدني',
      },
    };
  }

  if (input.kind === 'fatwa') {
    return {
      table: 'fatwas',
      record: {
        fatwa_number: input.number || `F-${Date.now()}`,
        year: String(normalizedYear),
        subject: input.subject || input.title,
        principle: input.principle || input.summary || '',
        text_content: input.fullText || input.summary || 'لا يوجد نص',
        fatwa_date: input.decisionDate || input.publicationDate || null,
        file_number: input.authority || null,
      },
    };
  }

  if (input.kind === 'scholarly' || input.kind === 'thesis') {
    return {
      table: 'subject_index',
      record: {
        subject_name: input.title,
        category: input.kind === 'thesis' ? 'رسالة علمية' : input.category || 'مؤلف فقهي',
        reference_type: input.kind,
        reference_id: null,
        sort_order: 0,
      },
    };
  }

  return {
    table: 'legislation',
    record: {
      title: input.title,
      legislation_number: input.number || `L-${Date.now()}`,
      year: normalizedYear,
      type: input.kind === 'regulation' ? 'لوائح تنفيذية' : input.type || 'قانون',
      issuing_authority: input.authority || 'جهة إصدار غير محددة',
      publication_date: input.publicationDate || null,
      gazette_issue_number: input.number || null,
      full_text: input.fullText || input.summary || 'لا يوجد نص',
      status: 'ساري',
    },
  };
}

export function insertLegalLibrarySource(input: LegalLibrarySourceInput): Promise<{ success: boolean; table?: string; record?: Record<string, unknown>; id?: string; error?: string }> | { success: boolean; table?: string; record?: Record<string, unknown>; id?: string; error?: string } {
  const payload = buildLegalLibraryPayload(input);
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      success: true,
      table: payload.table,
      record: payload.record,
      id: `local-${Date.now()}`,
    };
  }

  const performInsert = async (): Promise<{ success: boolean; table?: string; record?: Record<string, unknown>; id?: string; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from(payload.table)
        .insert(payload.record)
        .select('id');

      if (error) throw error;

      return {
        success: true,
        table: payload.table,
        record: payload.record,
        id: data?.[0]?.id,
      };
    } catch (err) {
      return {
        success: false,
        table: payload.table,
        record: payload.record,
        error: err instanceof Error ? err.message : 'خطأ في إدراج مصدر مكتبة قانونية',
      };
    }
  };

  return performInsert();
}
