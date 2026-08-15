# ✅ قائمة التفقد السريعة

## 🔍 التحقق من الملفات المضافة

```
✅ draftAssistant.ts              (src/lib/)      [8 KB]
✅ librarySync.ts                 (src/lib/)      [12 KB]
✅ INTEGRATION_ANALYSIS_REPORT.md (جذر)          [15 KB]
✅ INTEGRATION_IMPLEMENTATION_GUIDE.md (جذر)     [20 KB]
✅ FINAL_INTEGRATION_REPORT.md    (جذر)          [12 KB]
✅ QUICK_START_SUMMARY.md         (جذر)          [5 KB]
✅ FILES_INVENTORY.md             (جذر)          [8 KB]
✅ CHECKLIST.md                   (جذر)          [هذا الملف]
```

---

## 📋 المهام الفورية (اليوم)

- [ ] اقرأ QUICK_START_SUMMARY.md (5 دقائق)
- [ ] اقرأ INTEGRATION_IMPLEMENTATION_GUIDE.md (30 دقيقة)
- [ ] اطلع على draftAssistant.ts (10 دقائق)
- [ ] اطلع على librarySync.ts (10 دقائق)
- [ ] ناقش مع الفريق (30 دقيقة)

**الوقت الإجمالي:** ~90 دقيقة

---

## 🔧 مهام التطبيق - الأسبوع الأول

### المرحلة 1: دمج draftAssistant (يوم 1-2)

**في DocumentManagement.tsx:**

- [ ] أضف الاستيراد:
  ```typescript
  import { suggestReferencesForDraft, evaluateDraftQuality } from '@/lib/draftAssistant';
  ```

- [ ] أضف State جديد:
  ```typescript
  const [suggestedReferences, setSuggestedReferences] = useState<LibraryEntry[]>([]);
  const [draftQuality, setDraftQuality] = useState<any>(null);
  ```

- [ ] حدّث handleDraftPreview():
  ```typescript
  const quality = evaluateDraftQuality(generatedText, suggestedReferences);
  ```

- [ ] أضف قسم "المراجع المقترحة" في JSX

- [ ] اختبر مع صياغة عقد

- [ ] يجب أن تظهر 8 قوانين مقترحة

**الوقت:** 1-2 ساعة | **الجهد:** سهل | **التأثير:** 🔴 حرج

---

### المرحلة 2: إنشاء جداول Supabase (يوم 2-3)

**في Supabase Dashboard:**

- [ ] انسخ SQL من INTEGRATION_IMPLEMENTATION_GUIDE.md

- [ ] أنشئ جدول `document_reference_links`:
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
  ```

- [ ] أنشئ الفهارس:
  ```sql
  CREATE INDEX idx_doc_links ON document_reference_links(document_id);
  CREATE INDEX idx_ref_links ON document_reference_links(reference_id);
  ```

- [ ] تحقق من نجاح الإنشاء

**الوقت:** 30 دقيقة | **الجهد:** سهل | **التأثير:** 🔴 حرج

---

### المرحلة 3: دمج librarySync (يوم 4-5)

**في SmartCaseCore.tsx:**

- [ ] أضف الاستيراد:
  ```typescript
  import { addRulingToLibrary, linkDocumentToReference } from '@/lib/librarySync';
  ```

- [ ] أضف زر "حفظ كسابقة قضائية":
  ```tsx
  <button onClick={handleRulingComplete}>
    ✨ حفظ كسابقة قضائية
  </button>
  ```

- [ ] طبّق handleRulingComplete():
  ```typescript
  const result = await addRulingToLibrary({ ... });
  if (result.success) {
    toast.success('تم الحفظ');
  }
  ```

- [ ] أضف ربط الوثيقة:
  ```typescript
  await linkDocumentToReference(caseId, result.id, 'judicial_precedent');
  ```

- [ ] اختبر بإنشاء حكم جديد

- [ ] تحقق من ظهوره في court_rulings

**الوقت:** 2-3 ساعات | **الجهد:** متوسط | **التأثير:** 🔴 حرج

---

### المرحلة 4: التحقق الشامل (يوم 6-7)

**اختبر السيناريو الكامل:**

- [ ] افتح وثيقة موجودة

- [ ] اضغط "صياغة قانونية"

- [ ] اختر نوع "عقد"

- [ ] تحقق من ظهور المراجع المقترحة ✅

- [ ] أضف مرجع إلى الصياغة

- [ ] اضغط "معاينة" وتحقق من درجة الجودة

- [ ] اضغط "حفظ كمسودة"

- [ ] افتح SmartCaseCore وأضف حكم جديد

- [ ] اضغط "حفظ كسابقة قضائية"

- [ ] تحقق من ظهور الحكم في المراجع

- [ ] تحقق من الربط في document_reference_links

**الوقت:** 1 ساعة | **الجهد:** سهل | **التأثير:** 🟢 تحقق

---

## 🧪 اختبارات التحقق

### اختبار 1: اقتراحات الصياغة
```
[ ] يظهر القسم "المراجع المقترحة"
[ ] يظهر 8 مراجع بحد أقصى
[ ] المراجع ذات صلة بنوع الصياغة
[ ] يمكن النقر لإضافة المرجع
[ ] درجة الجودة تظهر بعد المعاينة
[ ] الدرجة بين 0-100
```

### اختبار 2: حفظ السوابق
```
[ ] يظهر الزر "حفظ كسابقة قضائية"
[ ] ينقر بدون أخطاء
[ ] يظهر رسالة نجاح
[ ] الحكم يظهر في court_rulings خلال 5 ثواني
[ ] الحكم يظهر في المراجع المقترحة
[ ] تاريخ الإنشاء صحيح
```

### اختبار 3: الربط بين الوثائق
```
[ ] جدول document_reference_links موجود
[ ] يمكن إنشاء ربط جديد
[ ] يمكن حذف الربط
[ ] الروابط تظهر في تبويب "المراجع"
[ ] لا توجد روابط مكررة
```

---

## 📊 مقاييس النجاح

بعد الأسبوع الأول يجب أن تشاهد:

- [ ] ❌→✅ اقتراحات مراجع عند الصياغة
- [ ] ❌→✅ حفظ السوابق الجديدة في المكتبة
- [ ] ❌→✅ ربط الوثائق بالمراجع
- [ ] 50%→90% جودة الصياغة المقدرة
- [ ] 0→100+ سابقة جديدة/سنة (متوقع)

---

## 🚨 التحذيرات والملاحظات

### الأمان
- [ ] تحقق من صلاحيات المستخدم قبل الحفظ
- [ ] لا تسمح بحفظ معلومات حساسة
- [ ] استخدم Audit Trail

### الأداء
- [ ] استخدم lazy loading للمراجع المقترحة
- [ ] cache النتائج لمدة 5 دقائق
- [ ] اختبر مع 1000+ مرجع

### توافقية
- [ ] اختبر في Chrome و Safari و Firefox
- [ ] اختبر على الجوال والسطح
- [ ] تأكد من اتجاه RTL

---

## 📞 الدعم والمساعدة

**إذا واجهت مشاكل:**

| المشكلة | الحل |
|--------|------|
| المراجع لا تظهر | راجع console للأخطاء، تحقق من libraryEntries |
| جدول لا يُنشأ | تحقق من صلاحيات Supabase |
| الحكم لا ينقذ | افحص رسالة الخطأ، تحقق من البيانات |
| الأداء بطيء | استخدم cache، قلل عدد المراجع |

**للمزيد:** اقرأ INTEGRATION_IMPLEMENTATION_GUIDE.md

---

## ✨ النتيجة النهائية

بعد 3-4 أسابيع:

```
المكتبة              ↕ ↔ ↕              الإدارة
(جودة)          (اقتراحات)         (سوابق جديدة)
   ↑                                      ↓
   └──────────  ربط ثنائي الاتجاه ──────┘
   
✅ اقتراحات ذكية للصياغة
✅ حفظ السوابق الجديدة
✅ ربط الوثائق بالمراجع
✅ امتثال أفضل
✅ مكتبة متنامية
```

---

## 🎯 الخطة الزمنية النهائية

```
📅 الآن (اليوم):      قراءة واستيعاب
📅 غداً (يوم 1-2):    دمج draftAssistant
📅 يوم 3:             إنشاء الجداول
📅 يوم 4-5:           دمج librarySync
📅 يوم 6-7:           اختبار شامل
📅 الأسبوع 2-4:      تحسينات وإضافات

⏱️ المدة الإجمالية: 3-4 أسابيع
👥 الفريق: مطور واحد يمكنه العمل وحده
💰 التكلفة: منخفضة جداً (الكود موجود)
```

---

**جاهز للبدء؟ ابدأ الآن! 🚀**

آخر تحديث: 15 أغسطس 2026
