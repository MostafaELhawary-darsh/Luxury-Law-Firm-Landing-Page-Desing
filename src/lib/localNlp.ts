// Local NLP Engine client — calls the local-nlp-engine edge function
// All processing happens on the firm's Supabase instance. No external API calls.

import { supabase } from '@/lib/financeUtils';

const NLP_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/local-nlp-engine`;

const headers = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export interface NlpEntity {
  type: string;
  value: string;
  position: number;
  method: string;
}

export interface NlpLegalTerm {
  term: string;
  category: string;
  suggestion: string;
}

export interface NlpResult {
  success: boolean;
  document_id: string;
  processing_type: string;
  entities: NlpEntity[];
  legal_terms: NlpLegalTerm[];
  risk_flags: string[];
  anonymized_preview?: string;
  masked_text?: string;
  entity_count: number;
  term_count: number;
  processing_ms: number;
  privacy_status: string;
  privacy_guarantee: string;
  log_id?: string;
  error?: string;
}

export async function analyzeDocument(text: string, documentId: string): Promise<NlpResult> {
  const res = await fetch(`${NLP_FUNCTION_URL}/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, document_id: documentId, processing_type: 'entity_extraction' }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return {
      success: false,
      document_id: documentId,
      processing_type: 'entity_extraction',
      entities: [],
      legal_terms: [],
      risk_flags: [],
      entity_count: 0,
      term_count: 0,
      processing_ms: 0,
      privacy_status: 'local_only',
      privacy_guarantee: '',
      error: errBody?.error || `Request failed (${res.status})`,
    };
  }
  const data = await res.json();
  return data as NlpResult;
}

export async function anonymizeDocument(text: string, documentId: string): Promise<NlpResult> {
  const res = await fetch(`${NLP_FUNCTION_URL}/anonymize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, document_id: documentId }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    return {
      success: false,
      document_id: documentId,
      processing_type: 'anonymization',
      entities: [],
      legal_terms: [],
      risk_flags: [],
      entity_count: 0,
      term_count: 0,
      processing_ms: 0,
      privacy_status: 'local_only',
      privacy_guarantee: '',
      error: errBody?.error || `Request failed (${res.status})`,
    };
  }
  const data = await res.json();
  return data as NlpResult;
}

export async function saveCalculation(
  documentId: string,
  sessionId: string | null,
  label: string,
  expression: string,
  inputValues: Record<string, string>,
  resultValue: number,
  resultDisplay: string,
  category: string
): Promise<boolean> {
  const { error } = await supabase.from('m114_spreadsheet_calculations').insert({
    document_id: documentId,
    session_id: sessionId,
    formula_label: label,
    formula_expression: expression,
    input_values: inputValues,
    result_value: resultValue,
    result_display: resultDisplay,
    category,
    created_by: 'system',
  });
  if (error) {
    console.error('Failed to save calculation', error);
    return false;
  }
  return true;
}

export async function fetchCalculationHistory(documentId: string) {
  const { data, error } = await supabase
    .from('m114_spreadsheet_calculations')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    console.error('Failed to fetch calculation history', error);
    return [];
  }
  return data || [];
}
