import { useState } from 'react';
import { Mic, MicOff, X, HelpCircle, Languages, Loader2 } from 'lucide-react';
import { useVoice, translateFeedback } from '@/lib/voiceContext';
import { LANGUAGE_LABELS } from '@/lib/voiceTypes';
import type { VoiceLanguage } from '@/lib/voiceTypes';

export default function VoiceButton() {
  const {
    supported,
    listening,
    interim,
    language,
    setLanguage,
    startListening,
    stopListening,
    feedback,
    feedbackError,
    dismissFeedback,
    showHelp,
    setShowHelp,
  } = useVoice();

  const [langOpen, setLangOpen] = useState(false);

  if (!supported) {
    return (
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-lg border border-gray-200">
        <MicOff size={18} className="text-ink/40" />
        <span className="font-body text-xs text-ink/50 max-w-[140px] leading-tight">
          {translateFeedback('unsupported', language)}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Feedback toast */}
      {feedback && (
        <div className="fixed bottom-24 left-6 z-50 max-w-xs">
          <div className={`rounded-lg px-4 py-3 shadow-xl border flex items-start gap-2.5 ${
            feedbackError
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-white border-gold/30 text-midnight'
          }`}>
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${feedbackError ? 'bg-red-500' : 'bg-gold animate-pulse'}`} />
            <p className="font-body text-xs leading-relaxed flex-1">{feedback}</p>
            <button onClick={dismissFeedback} className="text-ink/30 hover:text-ink/60 transition-colors flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Help panel */}
      {showHelp && <HelpPanel language={language} onClose={() => setShowHelp(false)} />}

      {/* Language selector dropdown */}
      {langOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
          <div className="fixed bottom-24 left-6 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-40">
            {(Object.keys(LANGUAGE_LABELS) as VoiceLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => { setLanguage(lang); setLangOpen(false); }}
                className={`w-full px-4 py-2.5 text-right font-body text-sm transition-colors flex items-center justify-between ${
                  language === lang ? 'bg-gold/10 text-gold font-bold' : 'text-ink/70 hover:bg-gray-50'
                }`}
              >
                {LANGUAGE_LABELS[lang]}
                {language === lang && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main button cluster */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-ink/50 hover:text-gold hover:border-gold/30 transition-all duration-300"
          aria-label="Help"
          title={language === 'ar-EG' ? 'الأوامر المتاحة' : language === 'en-US' ? 'Available commands' : 'Commandes disponibles'}
        >
          <HelpCircle size={18} />
        </button>

        <button
          onClick={() => setLangOpen(!langOpen)}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-ink/50 hover:text-gold hover:border-gold/30 transition-all duration-300"
          aria-label="Language"
          title={LANGUAGE_LABELS[language]}
        >
          <Languages size={18} />
        </button>

        <button
          onClick={listening ? stopListening : startListening}
          className={`relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 ${
            listening
              ? 'bg-red-500 text-white scale-110'
              : 'bg-gold text-midnight hover:scale-105'
          }`}
          aria-label={listening ? 'Stop' : 'Start voice command'}
        >
          {listening ? (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              <MicOff size={22} className="relative" />
            </>
          ) : (
            <Mic size={22} />
          )}
        </button>
      </div>

      {/* Live transcript indicator */}
      {listening && (
        <div className="fixed bottom-24 left-24 z-50 max-w-sm">
          <div className="bg-midnight/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-2xl border border-gold/20 flex items-center gap-3">
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="w-1 h-4 bg-gold rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-6 bg-gold rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-3 bg-gold rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              <span className="w-1 h-5 bg-gold rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
            </div>
            <div className="flex-1 min-w-0">
              {interim ? (
                <p className="font-body text-xs text-cream leading-relaxed truncate">{interim}</p>
              ) : (
                <p className="font-body text-xs text-cream/50 italic">
                  {language === 'ar-EG' ? 'أستمع الآن...' : language === 'en-US' ? 'Listening...' : 'Écoute...'}
                </p>
              )}
            </div>
            <Loader2 size={14} className="text-gold animate-spin flex-shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}

function HelpPanel({ language, onClose }: { language: VoiceLanguage; onClose: () => void }) {
  const commands = getHelpCommands(language);
  const title = language === 'ar-EG' ? 'الأوامر الصوتية المتاحة' : language === 'en-US' ? 'Available Voice Commands' : 'Commandes Vocales Disponibles';
  const subtitle = language === 'ar-EG' ? 'اضغط المايكروفون ثم انطق أحد هذه الأوامر' : language === 'en-US' ? 'Press the mic, then speak any of these commands' : 'Appuyez sur le micro, puis prononcez l\'une de ces commandes';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-heading font-bold text-midnight text-lg">{title}</h3>
            <p className="font-body text-xs text-ink/50 mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-6">
          {commands.map((group) => (
            <div key={group.title}>
              <p className="font-heading font-bold text-gold text-sm mb-3">{group.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <div key={item.phrase} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <p className="font-body text-sm font-bold text-midnight">{item.phrase}</p>
                    <p className="font-body text-[11px] text-ink/50 mt-0.5">{item.action}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="font-body text-[11px] text-ink/40 text-center">
            {language === 'ar-EG' ? 'يمكنك أيضاً الضغط على Ctrl+Shift+V لبدء الاستماع' : language === 'en-US' ? 'You can also press Ctrl+Shift+V to start listening' : 'Vous pouvez aussi appuyer sur Ctrl+Shift+V pour commencer à écouter'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface HelpGroup { title: string; items: { phrase: string; action: string }[] }

function getHelpCommands(lang: VoiceLanguage): HelpGroup[] {
  if (lang === 'ar-EG') {
    return [
      {
        title: 'إضافة سجلات',
        items: [
          { phrase: 'أضف عميل اسمه شركة النيل', action: 'يفتح نافذة إضافة عميل ويملأ الاسم' },
          { phrase: 'أضف قضية بعنوان طعن رقم 12', action: 'يفتح نافذة إضافة قضية ويملأ العنوان' },
          { phrase: 'أضف توكيل رقم 456', action: 'يفتح نافذة إضافة توكيل ويملأ الرقم' },
          { phrase: 'أضف مهمة بعنوان إعداد مذكرة', action: 'يفتح نافذة إضافة مهمة ويملأ العنوان' },
          { phrase: 'أضف جلسة يوم 2024-03-15', action: 'يفتح نافذة إضافة جلسة قضائية' },
          { phrase: 'أضف اجتماع بعنوان مراجعة', action: 'يفتح نافذة إضافة اجتماع' },
          { phrase: 'أضف حساب بنكي في بنك مصر', action: 'يفتح نافذة إضافة حساب بنكي' },
          { phrase: 'أضف شيك رقم 789', action: 'يفتح نافذة إضافة شيك' },
          { phrase: 'أضف موظف اسمه أحمد', action: 'يفتح نافذة إضافة موظف' },
          { phrase: 'أضف مرتب', action: 'يفتح نافذة إضافة مرتب' },
        ],
      },
      {
        title: 'التذكيرات والبريد',
        items: [
          { phrase: 'ذكّرني بـ إعداد مذكرة غداً', action: 'يفتح نافذة تذكير بتاريخ الغد' },
          { phrase: 'أرسل بريد إلى client@email.com', action: 'يفتح نافذة كتابة بريد إلكتروني' },
        ],
      },
      {
        title: 'التنقل بين الأقسام',
        items: [
          { phrase: 'افتح المكتبة القانونية', action: 'ينتقل للمكتبة القانونية' },
          { phrase: 'افتح الإدارة المالية', action: 'ينتقل للإدارة المالية' },
          { phrase: 'افتح إدارة المؤسسة', action: 'ينتقل لإدارة المؤسسة' },
          { phrase: 'ارجع للرئيسية', action: 'يعود للصفحة الرئيسية' },
        ],
      },
      {
        title: 'التنقل داخل الوحدات',
        items: [
          { phrase: 'افتح القضايا', action: 'ينتقل لوحدة الدعاوى' },
          { phrase: 'افتح العملاء', action: 'ينتقل لوحدة العملاء' },
          { phrase: 'افتح التوكيلات', action: 'ينتقل لوحدة التوكيلات' },
          { phrase: 'افتح المهام', action: 'ينتقل لوحدة المهام' },
          { phrase: 'افتح الأجندة', action: 'ينتقل للأجندة القضائية' },
          { phrase: 'افتح الاجتماعات', action: 'ينتقل لوحدة الاجتماعات' },
          { phrase: 'افتح الموظفين', action: 'ينتقل لوحدة الموظفين' },
          { phrase: 'افتح الحسابات', action: 'ينتقل لوحدة الحسابات والشيكات' },
          { phrase: 'افتح لوحة المتابعة', action: 'ينتقل للوحة متابعة العميل' },
          { phrase: 'افتح العقول القانونية', action: 'ينتقل لوحدة الموارد البشرية القانونية' },
        ],
      },
    ];
  }
  if (lang === 'en-US') {
    return [
      {
        title: 'Add Records',
        items: [
          { phrase: 'add client named Acme Corp', action: 'Opens add client form with name filled' },
          { phrase: 'add case titled Appeal No. 12', action: 'Opens add case form with title filled' },
          { phrase: 'add power of attorney number 456', action: 'Opens add POA form with number filled' },
          { phrase: 'add task titled Draft memo', action: 'Opens add task form with title filled' },
          { phrase: 'add session on 2024-03-15', action: 'Opens add court session form' },
          { phrase: 'add meeting titled Review', action: 'Opens add meeting form' },
          { phrase: 'add bank account at Bank of Egypt', action: 'Opens add bank account form' },
          { phrase: 'add check number 789', action: 'Opens add check form' },
          { phrase: 'add staff named Ahmed', action: 'Opens add staff form' },
          { phrase: 'add salary', action: 'Opens add salary form' },
        ],
      },
      {
        title: 'Reminders & Email',
        items: [
          { phrase: 'remind me to prepare memo tomorrow', action: 'Opens reminder form dated tomorrow' },
          { phrase: 'send email to client@email.com', action: 'Opens email composer' },
        ],
      },
      {
        title: 'Navigate Sections',
        items: [
          { phrase: 'open library', action: 'Goes to the legal library' },
          { phrase: 'open finance', action: 'Goes to the finance department' },
          { phrase: 'open firm management', action: 'Goes to firm management' },
          { phrase: 'go home', action: 'Returns to the home page' },
        ],
      },
      {
        title: 'Navigate Modules',
        items: [
          { phrase: 'open cases', action: 'Goes to cases module' },
          { phrase: 'open clients', action: 'Goes to clients module' },
          { phrase: 'open poa', action: 'Goes to power of attorney module' },
          { phrase: 'open tasks', action: 'Goes to tasks module' },
          { phrase: 'open agenda', action: 'Goes to judicial agenda' },
          { phrase: 'open meetings', action: 'Goes to meetings module' },
          { phrase: 'open staff', action: 'Goes to staff module' },
          { phrase: 'open banking', action: 'Goes to banking module' },
          { phrase: 'open tracker', action: 'Goes to legal client tracker' },
          { phrase: 'open talent', action: 'Goes to legal talent architecture' },
        ],
      },
    ];
  }
  return [
    {
      title: 'Ajouter des enregistrements',
      items: [
        { phrase: 'ajouter client nommé Acme Corp', action: 'Ouvre le formulaire d\'ajout de client avec le nom rempli' },
        { phrase: 'ajouter affaire intitulé Appel No. 12', action: 'Ouvre le formulaire d\'ajout d\'affaire avec le titre rempli' },
        { phrase: 'ajouter procuration numéro 456', action: 'Ouvre le formulaire d\'ajout de procuration avec le numéro rempli' },
        { phrase: 'ajouter tâche intitulé Préparer mémo', action: 'Ouvre le formulaire d\'ajout de tâche avec le titre rempli' },
        { phrase: 'ajouter audience le 2024-03-15', action: 'Ouvre le formulaire d\'ajout d\'audience' },
        { phrase: 'ajouter réunion intitulé Révision', action: 'Ouvre le formulaire d\'ajout de réunion' },
        { phrase: 'ajouter compte bancaire à Banque d\'Egypte', action: 'Ouvre le formulaire d\'ajout de compte bancaire' },
        { phrase: 'ajouter chèque numéro 789', action: 'Ouvre le formulaire d\'ajout de chèque' },
        { phrase: 'ajouter employé nommé Ahmed', action: 'Ouvre le formulaire d\'ajout d\'employé' },
        { phrase: 'ajouter salaire', action: 'Ouvre le formulaire d\'ajout de salaire' },
      ],
    },
    {
      title: 'Rappels & Email',
      items: [
        { phrase: 'rappelle-moi de préparer mémo demain', action: 'Ouvre le formulaire de rappel daté demain' },
        { phrase: 'envoie email à client@email.com', action: 'Ouvre l\'éditeur d\'email' },
      ],
    },
    {
      title: 'Naviguer entre les sections',
      items: [
        { phrase: 'ouvrir bibliothèque', action: 'Va à la bibliothèque juridique' },
        { phrase: 'ouvrir finances', action: 'Va au département des finances' },
        { phrase: 'ouvrir gestion cabinet', action: 'Va à la gestion du cabinet' },
        { phrase: 'retour accueil', action: 'Retour à la page d\'accueil' },
      ],
    },
    {
      title: 'Naviguer entre les modules',
      items: [
        { phrase: 'ouvrir affaires', action: 'Va au module des affaires' },
        { phrase: 'ouvrir clients', action: 'Va au module des clients' },
        { phrase: 'ouvrir procurations', action: 'Va au module des procurations' },
        { phrase: 'ouvrir tâches', action: 'Va au module des tâches' },
        { phrase: 'ouvrir agenda', action: 'Va à l\'agenda judiciaire' },
        { phrase: 'ouvrir réunions', action: 'Va au module des réunions' },
        { phrase: 'ouvrir personnel', action: 'Va au module du personnel' },
        { phrase: 'ouvrir comptes', action: 'Va au module bancaire' },
        { phrase: 'ouvrir suivi', action: 'Va au suivi client' },
      ],
    },
  ];
}
