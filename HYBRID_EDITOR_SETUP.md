# Hybrid Document Editor - Python + FastAPI Backend

## 📋 نظرة عامة

هذا المشروع يجمع بين:
- **Frontend**: React + Tiptap (محرر نصوص غني)
- **Desktop Shell**: Tauri 2.x (نافذة تطبيق خفيفة)
- **Backend**: Python + FastAPI (معالجة المستندات محليًا)

```
┌─────────────────────┐
│  React + Tiptap    │
│   (UI Layer)        │
└──────────┬──────────┘
           │ HTTP/WebSockets
           ▼
┌─────────────────────┐
│  Tauri 2.x Shell   │
│  (Window Manager)   │
└──────────┬──────────┘
           │ Sidecar/IPC
           ▼
┌─────────────────────┐
│ Python + FastAPI   │
│ (Local Microservice)│
└─────────────────────┘
```

## 🚀 البدء السريع

### المتطلبات الأساسية
```bash
# Node.js 18+ و npm
node --version
npm --version

# Python 3.11+
python3 --version

# Tauri CLI
npm install -g @tauri-apps/cli
```

### التثبيت

#### 1. تثبيت تبعيات الواجهة الأمامية
```bash
npm install
```

#### 2. تثبيت تبعيات Python
```bash
cd backend
pip install -r requirements.txt
# أو استخدم Poetry:
poetry install
```

**المكتبات المطلوبة**:
```
fastapi>=0.104.0
uvicorn>=0.24.0
python-docx>=0.8.11
pypandoc>=1.11
python-multipart>=0.0.6
```

#### 3. تثبيت أدوات التحويل (اختياري لكن موصى به)
```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt-get install pandoc

# Windows
choco install pandoc
```

### تشغيل التطبيق

#### في بيئة التطوير:
```bash
# الخادم سيبدأ تلقائيًا عند فتح التطبيق
npm run tauri dev
```

#### في الإنتاج:
```bash
npm run tauri build
```

## 📁 هيكل المشروع

```
.
├── backend/
│   ├── document_engine.py          # خادم FastAPI الرئيسي
│   ├── pyproject.toml              # تبعيات Poetry
│   └── requirements.txt             # تبعيات pip
├── src/
│   ├── components/
│   │   └── editor/
│   │       ├── HybridDocumentEditor.tsx    # محرر المستندات
│   │       ├── ExportModal.tsx              # نموذج التصدير
│   │       └── extensions/
│   │           └── VideoNode.ts             # امتداد الفيديو
│   ├── lib/
│   │   ├── documentEditorService.ts        # خدمة API
│   │   ├── pythonBackendManager.ts         # مدير Sidecar
│   │   └── backendSetup.tsx                # إعداد الاتصال
│   └── App.tsx
├── package.json
├── tauri.conf.json                 # إعدادات Tauri
└── README.md
```

## 🔌 API Endpoints

### الصحة والمعلومات
- `GET /health` - فحص صحة الخادم
- `GET /api/system/info` - معلومات النظام

### الوسائط
- `POST /api/media/upload` - رفع ملف وسائط
- `DELETE /api/media/{file_name}` - حذف ملف وسائط

### المستندات
- `POST /api/document/export` - تصدير المستند
- `GET /api/document/read/{file_name}` - قراءة المستند
- `GET /api/documents/list` - قائمة المستندات
- `DELETE /api/documents/{file_name}` - حذف المستند
- `GET /api/documents/download/{file_name}` - تنزيل المستند
- `POST /api/document/convert` - تحويل الصيغة

## ✨ الميزات

### محرر النصوص
- ✅ محرر غني (Bold, Italic, Lists, Tables)
- ✅ إدراج الصور والفيديو
- ✅ الحفظ التلقائي
- ✅ دعم اللغة العربية (RTL)

### التصدير
- ✅ DOCX (Microsoft Word)
- ✅ PDF (Adobe PDF)
- ✅ Markdown
- ✅ EPUB (E-Book)
- ✅ HTML

### إدارة الملفات
- ✅ تحميل الملفات تلقائي
- ✅ حذف الملفات
- ✅ قائمة المستندات
- ✅ تنزيل المستندات

## 🔐 الأمان

### CORS
- السماح فقط بالطلبات من `localhost` و `127.0.0.1`
- رفع الملفات محلي فقط

### التحقق من المسارات
- منع directory traversal
- التحقق من أنواع الملفات المسموحة

### البيانات الحساسة
- جميع البيانات محفوظة محليًا
- عدم الاتصال بالإنترنت (بدون تتبع)

## 🐛 استكشاف الأخطاء

### الخادم لا يستجيب
```bash
# تحقق من أن Python مثبت
python3 --version

# جرب تشغيل الخادم يدويًا
cd backend
python3 document_engine.py
```

### المكتبات ناقصة
```bash
# أعد تثبيت التبعيات
cd backend
pip install --upgrade -r requirements.txt
```

### مشاكل التصدير
```bash
# تأكد من تثبيت pandoc
pandoc --version

# أو استخدم الاتصال بـ PyMuPDF للـ PDF
```

## 📚 المراجع

- [Tauri Documentation](https://tauri.app/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Tiptap Editor](https://tiptap.dev/)
- [python-docx Documentation](https://python-docx.readthedocs.io/)
- [Pandoc Documentation](https://pandoc.org/)

## 📄 الترخيص

MIT License - يمكن الاستخدام الحر مع الإشارة للمصدر

## 🤝 المساهمة

المساهمات مرحب بها! يرجى:
1. عمل Fork للمشروع
2. إنشاء فرع للميزة الجديدة
3. عمل Commit للتغييرات
4. فتح Pull Request

---

**تم الإنشاء بواسطة**: Luxury Law Firm Development Team
**الإصدار**: 1.0.0
**آخر تحديث**: 2024
