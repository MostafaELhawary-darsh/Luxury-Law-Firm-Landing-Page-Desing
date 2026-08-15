# دليل تفعيل التكامل الكامل بين المكتبة والإدارة

## 🎯 الملفات الجديدة المضافة

تم إضافة ثلاثة ملفات جديدة لتفعيل التكامل الكامل:

### 1. `src/lib/draftAssistant.ts` 
**الوظيفة:** اقتراح المراجع الذكية أثناء الصياغة

#### الدوال الرئيسية:
```typescript
// اقتراح مراجع بناءً على نوع الصياغة
suggestReferencesForDraft(draftType, draftData, libraryEntries)
  → { suggestedReferences[], keywords[], relatedCases[] }

// تقييم جودة الصياغة
evaluateDraftQuality(draftText, suggestedReferences)
  → { score: 0-100, feedback[], recommendations[] }

// اقتراح محركات ذات صلة
suggestRelatedEngines(draftType)
  → ['SmartCaseCore', 'DocumentManagement', ...]
```

#### الاستخدام في DocumentManagement.tsx:
```typescript
import { suggestReferencesForDraft, evaluateDraftQuality } from '@/lib/draftAssistant';

// عند فتح نموذج الصياغة:
useEffect(() => {
  if (modalType === 'draft' && draftForm.draft_type) {
    const suggestions = suggestReferencesForDraft(
      draftForm.draft_type,
      draftForm,
      libraryEntries
    );
    setSuggestedReferences(suggestions.suggestedReferences);
    setClausesTemplate(suggestions.suggestedClausesTemplate);
  }
}, [draftForm.draft_type]);

// عند معاينة الصياغة:
const handleDraftPreview = () => {
  const generatedText = generateDraftText(draftForm.draft_type, draftForm);
  const quality = evaluateDraftQuality(generatedText, suggestedReferences);
  setDraftQuality(quality);
  setDraftPreview(generatedText);
};
```

---

### 2. `src/lib/librarySync.ts`
**الوظيفة:** تحديث المكتبة من نتائج المؤسسة

#### الدوال الرئيسية:
```typescript
// إضافة حكم جديد كسابقة قضائية
addRulingToLibrary(rulingData)
  → { success: bool, id?: string, error?: string }

// إضافة فتوى جديدة
addFatwaToLibrary(fatwaData)
  → { success: bool, id?: string, error?: string }

// إضافة نموذج عقد
addContractTemplateToLibrary(templateData)
  → { success: bool, id?: string, error?: string }

// ربط وثيقة بمرجع
linkDocumentToReference(docId, refId, refType, linkType)
  → { success: bool, id?: string, error?: string }

// جلب إحصائيات التكامل
getIntegrationStats()
  → { totalReferences, firmGeneratedReferences, linkedDocuments, recentUpdates }
```

#### الاستخدام في SmartCaseCore.tsx:
```typescript
import { addRulingToLibrary, linkDocumentToReference } from '@/lib/librarySync';

// عند إصدار حكم:
const handleRulingComplete = async (rulingData) => {
  // 1. حفظ الحكم في SmartCase
  const { data: caseData } = await supabase
    .from('m10_cases')
    .insert(rulingData)
    .select();

  // 2. حفظه كسابقة جديدة في المكتبة
  const libResult = await addRulingToLibrary({
    court: rulingData.court,
    rulingNumber: rulingData.ruling_number,
    judicialYear: new Date().getFullYear(),
    subject: rulingData.subject,
    principle: rulingData.principle,
    rulingText: rulingData.full_text,
    sessionDate: new Date().toISOString(),
  });

  // 3. ربط الحكم بالوثائق المرتبطة
  if (libResult.success && caseData?.[0]?.id) {
    await linkDocumentToReference(
      caseData[0].id,
      libResult.id!,
      'judicial_precedent',
      'referenced_in'
    );
  }
};
```

---

### 3. `src/lib/types.ts` (تحديث مقترح)
**إضافة أنواع جديدة لدعم التكامل:**

```typescript
// إضافة في types.ts:
export interface DocumentReferenceLink {
  id: string;
  document_id: string;
  reference_id: string;
  reference_type: 'legislation' | 'court_ruling' | 'fatwa' | 'contract_template';
  link_type: 'referenced_in' | 'compliant_with' | 'violates' | 'extends' | 'clarifies';
  created_at: string;
  updated_at: string;
}

export interface ReferenceUpdateAlert {
  id: string;
  reference_id: string;
  reference_type: string;
  update_type: 'amended' | 'obsolete' | 'new_precedent' | 'clarification';
  description: string;
  affected_documents: string[];
  alert_status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
}

export interface IntegrationStats {
  totalReferences: number;
  firmGeneratedReferences: number;
  linkedDocuments: number;
  recentUpdates: number;
  lastSyncTime?: string;
}
```

---

## 📋 خطة التنفيذ

### المرحلة 1: تحديث واجهة الصياغة (1-2 أيام)

#### تعديل `DocumentManagement.tsx`:

**الخطوة 1:** استيراد الدوال الجديدة
```typescript
import { 
  suggestReferencesForDraft, 
  evaluateDraftQuality 
} from '@/lib/draftAssistant';
```

**الخطوة 2:** إضافة state للمقترحات
```typescript
const [suggestedReferences, setSuggestedReferences] = useState<LibraryEntry[]>([]);
const [draftQuality, setDraftQuality] = useState<any>(null);
```

**الخطوة 3:** تحديث handleDraftPreview
```typescript
const handleDraftPreview = () => {
  const generatedText = generateDraftText(draftForm.draft_type, draftForm);
  
  // تقييم الجودة
  const quality = evaluateDraftQuality(generatedText, suggestedReferences);
  setDraftQuality(quality);
  
  setDraftPreview(generatedText);
};
```

**الخطوة 4:** إضافة قسم المراجع المقترحة في نموذج الصياغة
```tsx
{modalType === 'draft' && !draftPreview && (
  <div className="space-y-4 pt-4 border-t border-gray-100">
    <div className="flex items-center gap-2">
      <BookOpen size={16} className="text-gold" />
      <h4 className="font-heading font-bold text-midnight text-sm">
        المراجع المقترحة ({suggestedReferences.length})
      </h4>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
      {suggestedReferences.map(ref => (
        <div key={ref.id} className="bg-gold/5 rounded-lg p-3 border border-gold/20">
          <p className="font-body text-xs font-bold text-midnight mb-1">
            {ref.title}
          </p>
          <p className="font-body text-[10px] text-ink/60 mb-2">
            {ref.reference_label} • {ref.year || ''}
          </p>
          <button 
            className="text-gold font-body text-xs font-bold hover:underline"
            onClick={() => {
              // نسخ المرجع إلى الصياغة
              setDraftForm({...draftForm, references: (draftForm.references || '') + '\n' + ref.title})
            }}
          >
            إضافة إلى الصياغة
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

---

### المرحلة 2: تفعيل التحديثات العكسية (2-3 أيام)

#### تعديل `SmartCaseCore.tsx`:

**الخطوة 1:** استيراد الدوال
```typescript
import { 
  addRulingToLibrary, 
  linkDocumentToReference,
  createReferenceUpdateAlert 
} from '@/lib/librarySync';
```

**الخطوة 2:** إضافة زر "حفظ كسابقة" عند اكتمال الحكم
```tsx
<button 
  onClick={async () => {
    // 1. حفظ الحكم
    const { data } = await supabase
      .from('m10_cases')
      .insert(selectedCase)
      .select();
    
    // 2. إضافة إلى المكتبة
    const libResult = await addRulingToLibrary({
      court: selectedCase.court_type,
      rulingNumber: selectedCase.case_number,
      judicialYear: selectedCase.judicial_year,
      subject: selectedCase.subject,
      principle: selectedCase.ruling_principle,
      rulingText: selectedCase.ruling_text,
      sessionDate: selectedCase.session_date,
    });
    
    if (libResult.success) {
      toast.success('تم حفظ الحكم كسابقة قضائية جديدة');
    }
  }}
  className="bg-gold text-midnight px-4 py-2 rounded-lg font-bold"
>
  ✨ حفظ كسابقة قضائية
</button>
```

#### تعديل `KnowledgeManagementEngine.tsx`:

**الخطوة 1:** إضافة خيار "حفظ في المكتبة"
```tsx
<button 
  onClick={async () => {
    await addContractTemplateToLibrary({
      title: form.document_title,
      content: form.description,
      contractType: form.document_type,
      keywords: form.keywords?.split(',') || [],
    });
    toast.success('تم حفظ القالب في المكتبة');
  }}
>
  📚 حفظ كنموذج في المكتبة
</button>
```

---

### المرحلة 3: الربط بين الوثائق والمراجع (2-3 أيام)

#### إضافة جدول قاعدة البيانات:
```sql
CREATE TABLE document_reference_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES ld_documents(id),
  reference_id UUID NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  link_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_doc_links ON document_reference_links(document_id);
CREATE INDEX idx_ref_links ON document_reference_links(reference_id);
```

#### تعديل `DocumentManagement.tsx` - تبويب المراجع:
```tsx
{activeTab === 'references' && selectedDocId && (
  <div>
    <h3>المراجع المرتبطة بهذه الوثيقة</h3>
    {/* عرض المراجع المرتبطة */}
    {linkedReferences.map(ref => (
      <div key={ref.id} className="border rounded-lg p-3">
        {/* عرض المرجع */}
        <button
          onClick={() => {
            // إزالة الربط
            await supabase
              .from('document_reference_links')
              .delete()
              .eq('document_id', selectedDocId)
              .eq('reference_id', ref.id);
          }}
          className="text-red-500 text-sm"
        >
          إزالة الربط
        </button>
      </div>
    ))}
  </div>
)}
```

---

## 🧪 اختبار التكامل

### اختبار 1: اقتراحات الصياغة
```
1. فتح "صياغة قانونية"
2. اختيار نوع "عقد"
3. إدخال بيانات (طرفين، موضوع، إلخ)
4. ✅ المتوقع: عرض قائمة بالقوانين ذات الصلة
5. ✅ عرض قالب البنود المقترحة
```

### اختبار 2: إضافة سابقة جديدة
```
1. فتح SmartCaseCore
2. إنشاء حكم جديد
3. الضغط على "حفظ كسابقة قضائية"
4. ✅ المتوقع: حفظ الحكم في جدول court_rulings
5. ✅ ظهور الحكم الجديد في المراجع
```

### اختبار 3: الربط بين الوثائق والمراجع
```
1. فتح وثيقة
2. تشغيل "تحليل الامتثال"
3. ✅ المتوقع: ظهور المراجع المرتبطة
4. ✅ إمكانية إزالة الروابط
```

---

## 📊 مقاييس النجاح

| المقياس | الهدف | الطريقة |
|--------|-------|--------|
| **جودة الصياغة** | +40% | قياس عدد المراجع المستخدمة |
| **درقة الامتثال** | +25% | معدل الأخطاء المكتشفة |
| **تطور المكتبة** | +100 سابقة/سنة | عدد الأحكام المضافة |
| **الكفاءة** | -30% وقت بحث | متوسط وقت البحث عن المراجع |

---

## 🚨 ملاحظات مهمة

### 1. قاعدة البيانات
تأكد من وجود الجداول التالية في Supabase:
- ✅ `ld_documents` (موجود)
- ✅ `legislation` (موجود)
- ✅ `court_rulings` (موجود)
- ✅ `fatwas` (موجود)
- ⚠️ `document_reference_links` (يحتاج إنشاء)
- ⚠️ `reference_update_alerts` (يحتاج إنشاء)
- ⚠️ `library_backups` (اختياري)

### 2. الأداء
- المراجع المقترحة تُحسب عند فتح نموذج الصياغة (lazy loading)
- تخزين مؤقت للاقتراحات لمدة 5 دقائق
- تحديثات بطيئة للمكتبة لتجنب زيادة الحمل

### 3. الأمان
- التحقق من صلاحيات المستخدم قبل الحفظ في المكتبة
- حفظ معلومات من أضاف الحكم/الفتوى (audit trail)
- نسخ احتياطية أسبوعية للمكتبة

### 4. المراقبة
- تسجيل كل إضافة إلى المكتبة
- إشعارات عند تحديثات المراجع الحرجة
- تقارير شهرية عن نمو المكتبة

---

## 📞 الدعم والمساعدة

إذا واجهت أي مشاكل:

1. تحقق من أن جميع الجداول موجودة في Supabase
2. تأكد من صلاحيات الكتابة والقراءة
3. راجع سجلات Supabase للأخطاء التفصيلية
4. جرب الاختبارات أولاً قبل الإطلاق على الإنتاج

---

**آخر تحديث:** 15 أغسطس 2026
