import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { supabase } from '@/lib/financeUtils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { parseCommand } from '@/lib/voiceCommands';
import type { VoiceLanguage, VoiceCommand, VoiceLogEntry, VoiceEmailEntry, Section, FirmModuleId, FinanceModuleId, PendingAddCommand, PendingRemind, PendingEmail } from '@/lib/voiceTypes';

interface VoiceContextValue {
  supported: boolean;
  listening: boolean;
  interim: string;
  language: VoiceLanguage;
  setLanguage: (lang: VoiceLanguage) => void;
  startListening: () => void;
  stopListening: () => void;
  lastCommand: VoiceCommand | null;
  feedback: string | null;
  feedbackError: boolean;
  dismissFeedback: () => void;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
  pendingAdd: PendingAddCommand | null;
  consumePendingAdd: () => PendingAddCommand | null;
  pendingRemind: PendingRemind | null;
  consumePendingRemind: () => PendingRemind | null;
  pendingEmail: PendingEmail | null;
  consumePendingEmail: () => PendingEmail | null;
  navigateSection: (s: Section) => void;
  navigateFirmModule: (m: FirmModuleId) => void;
  navigateFinanceModule: (m: FinanceModuleId) => void;
  registerSectionNav: (fn: (s: Section) => void) => void;
  registerFirmModuleNav: (fn: (m: FirmModuleId) => void) => void;
  registerFinanceModuleNav: (fn: (m: FinanceModuleId) => void) => void;
  log: VoiceLogEntry[];
  emailLog: VoiceEmailEntry[];
  refreshLog: () => void;
  refreshEmailLog: () => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
  return ctx;
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { supported, listening, interim, start, stop, error } = useSpeechRecognition();
  const [language, setLanguageState] = useState<VoiceLanguage>('ar-EG');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<PendingAddCommand | null>(null);
  const [pendingRemind, setPendingRemind] = useState<PendingRemind | null>(null);
  const [pendingEmail, setPendingEmail] = useState<PendingEmail | null>(null);
  const [log, setLog] = useState<VoiceLogEntry[]>([]);
  const [emailLog, setEmailLog] = useState<VoiceEmailEntry[]>([]);

  const sectionNavRef = useRef<((s: Section) => void) | null>(null);
  const firmModuleNavRef = useRef<((m: FirmModuleId) => void) | null>(null);
  const financeModuleNavRef = useRef<((m: FinanceModuleId) => void) | null>(null);

  const loadLanguage = useCallback(async () => {
    const { data, error } = await supabase.from('voice_settings').select('language').eq('id', 1).maybeSingle();
    if (error) return;
    if (data?.language) setLanguageState(data.language as VoiceLanguage);
  }, []);

  const refreshLog = useCallback(async () => {
    const { data, error } = await supabase.from('voice_command_log').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) return;
    setLog((data as VoiceLogEntry[]) || []);
  }, []);

  const refreshEmailLog = useCallback(async () => {
    const { data, error } = await supabase.from('voice_email_log').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) return;
    setEmailLog((data as VoiceEmailEntry[]) || []);
  }, []);

  useEffect(() => {
    loadLanguage();
    refreshLog();
    refreshEmailLog();
  }, [loadLanguage, refreshLog, refreshEmailLog]);

  const setLanguage = useCallback(async (lang: VoiceLanguage) => {
    setLanguageState(lang);
    const { error } = await supabase.from('voice_settings').upsert({ id: 1, language: lang, updated_at: new Date().toISOString() });
    if (error) console.warn('Failed to persist language setting');
  }, []);

  const logCommand = useCallback((cmd: VoiceCommand, status: string) => {
    supabase.from('voice_command_log').insert({
      transcript: cmd.raw,
      language: cmd.language,
      command_type: cmd.type,
      command_payload: cmd.payload,
      status,
    }).then(() => refreshLog());
    Promise.resolve().then(() => {}).catch(() => {});
  }, [refreshLog]);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((msg: string, isError = false) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(msg);
    setFeedbackError(isError);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

  const dismissFeedback = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(null);
  }, []);

  const dispatchCommand = useCallback((cmd: VoiceCommand) => {
    setLastCommand(cmd);
    const now = Date.now();

    switch (cmd.type) {
      case 'add_client':
      case 'add_case':
      case 'add_poa':
      case 'add_task':
      case 'add_session':
      case 'add_meeting':
      case 'add_account':
      case 'add_check':
      case 'add_staff':
      case 'add_salary':
      case 'add_document': {
        const moduleMap: Record<string, FirmModuleId> = {
          add_client: 'clients',
          add_case: 'smart-case',
          add_poa: 'poa',
          add_task: 'tasks',
          add_session: 'agenda',
          add_meeting: 'meetings',
          add_account: 'banking',
          add_check: 'banking',
          add_staff: 'staff',
          add_salary: 'staff',
          add_document: 'documents',
        };
        const target = moduleMap[cmd.type];
        setPendingAdd({ module: target, commandType: cmd.type, fields: cmd.payload, timestamp: now });
        sectionNavRef.current?.('firm');
        firmModuleNavRef.current?.(target);
        showFeedback(translateFeedback(cmd.type, language));
        logCommand(cmd, 'success');
        break;
      }
      case 'remind': {
        const title = cmd.payload.title || '';
        const dateToken = cmd.payload.date || '';
        setPendingRemind({ title, dueDate: dateToken, timestamp: now });
        showFeedback(translateFeedback('remind', language));
        logCommand(cmd, 'success');
        break;
      }
      case 'email': {
        setPendingEmail({ recipient: cmd.payload.recipient || '', subject: cmd.payload.subject || '', timestamp: now });
        showFeedback(translateFeedback('email', language));
        logCommand(cmd, 'success');
        break;
      }
      case 'navigate_section': {
        const target = cmd.payload.target as Section;
        if (target === 'site') {
          sectionNavRef.current?.('site');
        } else {
          sectionNavRef.current?.(target);
        }
        showFeedback(translateFeedback('navigate_section', language));
        logCommand(cmd, 'success');
        break;
      }
      case 'navigate_module': {
        const target = cmd.payload.target as FirmModuleId;
        sectionNavRef.current?.('firm');
        firmModuleNavRef.current?.(target);
        showFeedback(translateFeedback('navigate_module', language));
        logCommand(cmd, 'success');
        break;
      }
      case 'navigate_home': {
        sectionNavRef.current?.('site');
        showFeedback(translateFeedback('navigate_home', language));
        logCommand(cmd, 'success');
        break;
      }
      default:
        showFeedback(translateFeedback('unknown', language), true);
        logCommand(cmd, 'unrecognized');
    }
  }, [language, logCommand, showFeedback]);

  const handleResult = useCallback((transcript: string) => {
    const cmd = parseCommand(transcript, language);
    dispatchCommand(cmd);
  }, [language, dispatchCommand]);

  const startListening = useCallback(() => {
    if (!supported) {
      showFeedback(translateFeedback('unsupported', language), true);
      return;
    }
    start(language, handleResult, (err) => {
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        showFeedback(translateFeedback('mic_denied', language), true);
      } else if (err === 'no-speech') {
        showFeedback(translateFeedback('no_speech', language), true);
      }
    });
  }, [supported, start, language, handleResult, showFeedback]);

  const stopListening = useCallback(() => stop(), [stop]);

  const consumePendingAdd = useCallback(() => {
    const p = pendingAdd;
    setPendingAdd(null);
    return p;
  }, [pendingAdd]);

  const consumePendingRemind = useCallback(() => {
    const p = pendingRemind;
    setPendingRemind(null);
    return p;
  }, [pendingRemind]);

  const consumePendingEmail = useCallback(() => {
    const p = pendingEmail;
    setPendingEmail(null);
    return p;
  }, [pendingEmail]);

  const navigateSection = useCallback((s: Section) => sectionNavRef.current?.(s), []);
  const navigateFirmModule = useCallback((m: FirmModuleId) => firmModuleNavRef.current?.(m), []);
  const navigateFinanceModule = useCallback((m: FinanceModuleId) => financeModuleNavRef.current?.(m), []);
  const registerSectionNav = useCallback((fn: (s: Section) => void) => { sectionNavRef.current = fn; }, []);
  const registerFirmModuleNav = useCallback((fn: (m: FirmModuleId) => void) => { firmModuleNavRef.current = fn; }, []);
  const registerFinanceModuleNav = useCallback((fn: (m: FinanceModuleId) => void) => { financeModuleNavRef.current = fn; }, []);

  useEffect(() => {
    if (error === 'unsupported') {
      showFeedback(translateFeedback('unsupported', language), true);
    }
  }, [error, language, showFeedback]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        if (listening) stopListening();
        else startListening();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [listening, startListening, stopListening]);

  const value = useMemo<VoiceContextValue>(() => ({
    supported,
    listening,
    interim,
    language,
    setLanguage,
    startListening,
    stopListening,
    lastCommand,
    feedback,
    feedbackError,
    dismissFeedback,
    showHelp,
    setShowHelp,
    pendingAdd,
    consumePendingAdd,
    pendingRemind,
    consumePendingRemind,
    pendingEmail,
    consumePendingEmail,
    navigateSection,
    navigateFirmModule,
    navigateFinanceModule,
    registerSectionNav,
    registerFirmModuleNav,
    registerFinanceModuleNav,
    log,
    emailLog,
    refreshLog,
    refreshEmailLog,
  }), [supported, listening, interim, language, setLanguage, startListening, stopListening, lastCommand, feedback, feedbackError, dismissFeedback, showHelp, pendingAdd, consumePendingAdd, pendingRemind, consumePendingRemind, pendingEmail, consumePendingEmail, navigateSection, navigateFirmModule, navigateFinanceModule, registerSectionNav, registerFirmModuleNav, registerFinanceModuleNav, log, emailLog, refreshLog, refreshEmailLog]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function translateFeedback(key: string, lang: VoiceLanguage): string {
  const ar: Record<string, string> = {
    add_client: 'جارٍ فتح نافذة إضافة عميل...',
    add_case: 'جارٍ فتح نافذة إضافة قضية...',
    add_poa: 'جارٍ فتح نافذة إضافة توكيل...',
    add_task: 'جارٍ فتح نافذة إضافة مهمة...',
    add_session: 'جارٍ فتح نافذة إضافة جلسة قضائية...',
    add_meeting: 'جارٍ فتح نافذة إضافة اجتماع...',
    add_account: 'جارٍ فتح نافذة إضافة حساب بنكي...',
    add_check: 'جارٍ فتح نافذة إضافة شيك...',
    add_staff: 'جارٍ فتح نافذة إضافة موظف...',
    add_salary: 'جارٍ فتح نافذة إضافة مرتب...',
    add_document: 'جارٍ فتح نافذة الصياغة...',
    remind: 'جارٍ فتح نافذة تذكير جديد...',
    email: 'جارٍ فتح نافذة إرسال بريد إلكتروني...',
    navigate_section: 'جارٍ التنقل بين الأقسام...',
    navigate_module: 'جارٍ التنقل إلى الوحدة المطلوبة...',
    navigate_home: 'جارٍ العودة للصفحة الرئيسية...',
    unknown: 'لم أتعرف على الأمر. جرّب قول "أضف عميل" أو "افتح القضايا".',
    unsupported: 'متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Edge.',
    mic_denied: 'لم يُسمح بالوصول إلى المايكروفون. يرجى السماح باستخدام المايكروفون.',
    no_speech: 'لم أسمع أي كلام. جرّب مرة أخرى.',
  };
  const en: Record<string, string> = {
    add_client: 'Opening add client form...',
    add_case: 'Opening add case form...',
    add_poa: 'Opening add power of attorney form...',
    add_task: 'Opening add task form...',
    add_session: 'Opening add court session form...',
    add_meeting: 'Opening add meeting form...',
    add_account: 'Opening add bank account form...',
    add_check: 'Opening add check form...',
    add_staff: 'Opening add staff form...',
    add_salary: 'Opening add salary form...',
    add_document: 'Opening drafting form...',
    remind: 'Opening new reminder form...',
    email: 'Opening email composer...',
    navigate_section: 'Navigating to section...',
    navigate_module: 'Navigating to module...',
    navigate_home: 'Returning to home page...',
    unknown: 'I didn\'t recognize that command. Try "add client" or "open cases".',
    unsupported: 'Your browser does not support speech recognition. Use Chrome or Edge.',
    mic_denied: 'Microphone access was denied. Please allow microphone access.',
    no_speech: 'I didn\'t hear anything. Please try again.',
  };
  const fr: Record<string, string> = {
    add_client: 'Ouverture du formulaire d\'ajout de client...',
    add_case: 'Ouverture du formulaire d\'ajout d\'affaire...',
    add_poa: 'Ouverture du formulaire d\'ajout de procuration...',
    add_task: 'Ouverture du formulaire d\'ajout de tâche...',
    add_session: 'Ouverture du formulaire d\'ajout d\'audience...',
    add_meeting: 'Ouverture du formulaire d\'ajout de réunion...',
    add_account: 'Ouverture du formulaire d\'ajout de compte bancaire...',
    add_check: 'Ouverture du formulaire d\'ajout de chèque...',
    add_staff: 'Ouverture du formulaire d\'ajout d\'employé...',
    add_salary: 'Ouverture du formulaire d\'ajout de salaire...',
    add_document: 'Ouverture du formulaire de rédaction...',
    remind: 'Ouverture du formulaire de rappel...',
    email: 'Ouverture de l\'éditeur d\'email...',
    navigate_section: 'Navigation vers la section...',
    navigate_module: 'Navigation vers le module...',
    navigate_home: 'Retour à la page d\'accueil...',
    unknown: 'Je n\'ai pas reconnu cette commande. Essayez "ajouter client" ou "ouvrir affaires".',
    unsupported: 'Votre navigateur ne prend pas en charge la reconnaissance vocale. Utilisez Chrome ou Edge.',
    mic_denied: 'L\'accès au microphone a été refusé. Veuillez autoriser l\'accès au microphone.',
    no_speech: 'Je n\'ai rien entendu. Veuillez réessayer.',
  };
  const table = lang === 'ar-EG' ? ar : lang === 'en-US' ? en : fr;
  return table[key] || ar[key] || key;
}
