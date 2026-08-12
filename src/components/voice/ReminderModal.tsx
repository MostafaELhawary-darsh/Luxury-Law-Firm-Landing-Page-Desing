import { useState, useEffect } from 'react';
import { Bell, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/financeUtils';
import { resolveRelativeDate } from '@/lib/voiceCommands';
import type { VoiceLanguage } from '@/lib/voiceTypes';

interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
  initialTitle: string;
  initialDateToken: string;
  language: VoiceLanguage;
}

export default function ReminderModal({ open, onClose, initialTitle, initialDateToken, language }: ReminderModalProps) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('متوسطة');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      const resolved = initialDateToken ? resolveRelativeDate(initialDateToken, language) : '';
      setDueDate(resolved || new Date().toISOString().slice(0, 10));
    }
  }, [open, initialTitle, initialDateToken, language]);

  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('lf_tasks').insert({
      title: title.trim(),
      description: null,
      task_type: 'تذكير',
      priority,
      status: 'بانتظار',
      due_date: dueDate || null,
      assigned_to: null,
      case_id: null,
      client_id: null,
    });
    setSaving(false);
    if (insertError) {
      setError(language === 'ar-EG' ? 'فشل حفظ التذكير' : 'Failed to save reminder');
      return;
    }
    onClose();
  };

  const labels = {
    title: language === 'ar-EG' ? 'تذكير جديد' : language === 'en-US' ? 'New Reminder' : 'Nouveau rappel',
    taskTitle: language === 'ar-EG' ? 'عنوان التذكير' : language === 'en-US' ? 'Reminder title' : 'Titre du rappel',
    dueDate: language === 'ar-EG' ? 'تاريخ الاستحقاق' : language === 'en-US' ? 'Due date' : 'Date d\'échéance',
    priority: language === 'ar-EG' ? 'الأولوية' : language === 'en-US' ? 'Priority' : 'Priorité',
    save: language === 'ar-EG' ? 'حفظ التذكير' : language === 'en-US' ? 'Save reminder' : 'Enregistrer le rappel',
    cancel: language === 'ar-EG' ? 'إلغاء' : language === 'en-US' ? 'Cancel' : 'Annuler',
    high: language === 'ar-EG' ? 'عالية' : language === 'en-US' ? 'High' : 'Haute',
    medium: language === 'ar-EG' ? 'متوسطة' : language === 'en-US' ? 'Medium' : 'Moyenne',
    low: language === 'ar-EG' ? 'منخفضة' : language === 'en-US' ? 'Low' : 'Basse',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <Bell size={18} className="text-gold" />
            </div>
            <h3 className="font-heading font-bold text-midnight text-base">{labels.title}</h3>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">{labels.taskTitle}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">{labels.dueDate}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">{labels.priority}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none transition-colors bg-white"
            >
              <option value="عالية">{labels.high}</option>
              <option value="متوسطة">{labels.medium}</option>
              <option value="منخفضة">{labels.low}</option>
            </select>
          </div>
        </div>

        {error && <p className="font-body text-xs text-red-600 px-6 pb-2">{error}</p>}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors">
            {labels.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-5 py-2 rounded-lg font-body text-sm font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {labels.save}
          </button>
        </div>
      </div>
    </div>
  );
}
