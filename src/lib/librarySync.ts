/**
 * محرك التحديث العكسي: حفظ نتائج المؤسسة في المكتبة القانونية
 * يتيح للمؤسسة إثراء المكتبة من خلال عملها اليومي
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * إضافة حكم جديد كسابقة قضائية في المكتبة
 */
export async function addRulingToLibrary(rulingData: {
  court: string;
  rulingNumber: string;
  judicialYear: number;
  subject: string;
  principle: string;
  rulingText: string;
  sessionDate: string;
  courtType?: string;
  circuit?: string;
  ruling_type?: string;
  justification?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const payload = {
      court: rulingData.court,
      ruling_number: rulingData.rulingNumber,
      judicial_year: rulingData.judicialYear,
      subject: rulingData.subject,
      principle: rulingData.principle,
      ruling_text: rulingData.rulingText,
      session_date: rulingData.sessionDate,
      court_type: rulingData.courtType || rulingData.court,
      circuit: rulingData.circuit || '',
      ruling_type: rulingData.ruling_type || 'حكم نهائي',
      justification: rulingData.justification || null,
      status: 'active',
      source_type: 'firm_generated',
      created_by_firm: true,
      sync_timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('court_rulings')
      .insert(payload)
      .select('id');

    if (error) throw error;

    return {
      success: true,
      id: data?.[0]?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطأ في حفظ الحكم',
    };
  }
}

/**
 * إضافة فتوى جديدة في المكتبة
 */
export async function addFatwaToLibrary(fatwaData: {
  subject: string;
  textContent: string;
  principle?: string;
  fatwaNumber: string;
  year: number;
  fatwaDate: string;
  fileNumber?: string;
  issuingJurisdiction?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const payload = {
      subject: fatwaData.subject,
      text_content: fatwaData.textContent,
      principle: fatwaData.principle || '',
      fatwa_number: fatwaData.fatwaNumber,
      year: fatwaData.year,
      fatwa_date: fatwaData.fatwaDate,
      file_number: fatwaData.fileNumber || null,
      issuing_jurisdiction: fatwaData.issuingJurisdiction || 'مصر',
      status: 'active',
      source_type: 'firm_generated',
      created_by_firm: true,
      sync_timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('fatwas')
      .insert(payload)
      .select('id');

    if (error) throw error;

    return {
      success: true,
      id: data?.[0]?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطأ في حفظ الفتوى',
    };
  }
}

/**
 * إضافة نموذج عقد أو قالب في هيكل القوانين
 */
export async function addContractTemplateToLibrary(templateData: {
  title: string;
  content: string;
  contractType: string; // 'بيع', 'إيجار', 'توريد', 'خدمات', إلخ
  jurisdiction?: string;
  keywords?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const payload = {
      title: `نموذج عقد: ${templateData.title}`,
      content: templateData.content,
      node_type: 'contract_template',
      node_number: `CT-${Date.now()}`,
      contract_type: templateData.contractType,
      jurisdiction: templateData.jurisdiction || 'مصر',
      keywords: templateData.keywords || [],
      status: 'active',
      source_type: 'firm_generated',
      created_by_firm: true,
      sync_timestamp: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('law_structure')
      .insert(payload)
      .select('id');

    if (error) throw error;

    return {
      success: true,
      id: data?.[0]?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطأ في حفظ النموذج',
    };
  }
}

/**
 * تحديث مرجع موجود بناءً على حكم أو قرار جديد
 */
export async function updateLawWithNewPrecedent(
  referenceId: string,
  referenceType: string, // 'legislation', 'regulation', etc
  precedentData: {
    principleText: string;
    precedentDate: string;
    courtType: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // جلب المرجع الحالي
    const table = referenceType === 'legislation' ? 'legislation' : 'court_rulings';
    const { data: existing, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', referenceId)
      .single();

    if (fetchError || !existing) throw new Error('المرجع غير موجود');

    // تحديث المرجع
    const payload = {
      related_precedents: (existing.related_precedents || []).concat({
        court: precedentData.courtType,
        principle: precedentData.principleText,
        date: precedentData.precedentDate,
      }),
      last_updated: new Date().toISOString(),
      firm_updated: true,
    };

    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', referenceId);

    if (error) throw error;

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطأ في التحديث',
    };
  }
}

/**
 * تسجيل ربط بين وثيقة ومرجع قانوني
 */
export async function linkDocumentToReference(
  documentId: string,
  referenceId: string,
  referenceType: string, // 'legislation', 'court_ruling', 'fatwa', etc
  linkType: string = 'referenced_in' // 'referenced_in', 'compliant_with', 'violates', etc
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const payload = {
      document_id: documentId,
      reference_id: referenceId,
      reference_type: referenceType,
      link_type: linkType,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('document_reference_links')
      .insert(payload)
      .select('id');

    if (error) throw error;

    return {
      success: true,
      id: data?.[0]?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطأ في إنشاء الربط',
    };
  }
}

/**
 * جلب كل الوثائق المرتبطة بمرجع معين
 */
export async function getLinkedDocuments(
  referenceId: string,
  referenceType: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('document_reference_links')
      .select('document_id')
      .eq('reference_id', referenceId)
      .eq('reference_type', referenceType);

    if (error) throw error;

    return (data || []).map(item => item.document_id);
  } catch (err) {
    console.error('Error fetching linked documents:', err);
    return [];
  }
}

/**
 * تحديث حالة الامتثال لكل الوثائق المرتبطة بمرجع تم تحديثه
 */
export async function revalidateLinkedDocumentsCompliance(
  referenceId: string,
  referenceType: string
): Promise<{ count: number; error?: string }> {
  try {
    const linkedDocs = await getLinkedDocuments(referenceId, referenceType);

    // تحديث حالة كل الوثائق إلى 'needs_review'
    const { error } = await supabase
      .from('ld_documents')
      .update({ status: 'needs_review' })
      .in('id', linkedDocs);

    if (error) throw error;

    return { count: linkedDocs.length };
  } catch (err) {
    return {
      count: 0,
      error: err instanceof Error ? err.message : 'خطأ في التحديث',
    };
  }
}

/**
 * نسخ احتياطي من المكتبة بعد تحديثات جديدة
 */
export async function backupLibraryVersion(description: string): Promise<{
  success: boolean;
  backupId?: string;
  error?: string;
}> {
  try {
    // جلب كل البيانات من المكتبة
    const [legRes, rulingRes, fatwaRes, structRes] = await Promise.all([
      supabase.from('legislation').select('*'),
      supabase.from('court_rulings').select('*'),
      supabase.from('fatwas').select('*'),
      supabase.from('law_structure').select('*'),
    ]);

    const backupData = {
      timestamp: new Date().toISOString(),
      description,
      legislation: legRes.data || [],
      court_rulings: rulingRes.data || [],
      fatwas: fatwaRes.data || [],
      law_structure: structRes.data || [],
    };

    // حفظ النسخة الاحتياطية
    const { data, error } = await supabase
      .from('library_backups')
      .insert({
        backup_data: backupData,
        created_at: new Date().toISOString(),
        description,
      })
      .select('id');

    if (error) throw error;

    return {
      success: true,
      backupId: data?.[0]?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطأ في النسخ الاحتياطي',
    };
  }
}

/**
 * إنشاء تنبيه عند تحديث مرجع يؤثر على الوثائق
 */
export async function createReferenceUpdateAlert(
  referenceId: string,
  referenceType: string,
  updateType: 'amended' | 'obsolete' | 'new_precedent' | 'clarification',
  description: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // جلب الوثائق المرتبطة
    const linkedDocs = await getLinkedDocuments(referenceId, referenceType);

    const payload = {
      reference_id: referenceId,
      reference_type: referenceType,
      update_type: updateType,
      description,
      affected_documents: linkedDocs,
      alert_status: 'active',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('reference_update_alerts')
      .insert(payload)
      .select('id');

    if (error) throw error;

    return {
      success: true,
      id: data?.[0]?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'خطأ في إنشاء التنبيه',
    };
  }
}

/**
 * جلب إحصائيات التكامل
 */
export async function getIntegrationStats(): Promise<{
  totalReferences: number;
  firmGeneratedReferences: number;
  linkedDocuments: number;
  recentUpdates: number;
  error?: string;
}> {
  try {
    const [legCount, ruleCount, fatwaCount, linkCount, updateCount] = await Promise.all([
      supabase.from('legislation').select('id', { count: 'exact', head: true }),
      supabase.from('court_rulings').select('id', { count: 'exact', head: true }),
      supabase.from('fatwas').select('id', { count: 'exact', head: true }),
      supabase
        .from('document_reference_links')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('reference_update_alerts')
        .select('id', { count: 'exact', head: true }),
    ]);

    const firmGenerated = await supabase
      .from('court_rulings')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_firm', true);

    return {
      totalReferences:
        (legCount.count || 0) + (ruleCount.count || 0) + (fatwaCount.count || 0),
      firmGeneratedReferences: firmGenerated.count || 0,
      linkedDocuments: linkCount.count || 0,
      recentUpdates: updateCount.count || 0,
    };
  } catch (err) {
    return {
      totalReferences: 0,
      firmGeneratedReferences: 0,
      linkedDocuments: 0,
      recentUpdates: 0,
      error: err instanceof Error ? err.message : 'خطأ في جلب الإحصائيات',
    };
  }
}
