import { useState, useEffect } from 'react';
import { Mail, X, Loader2, Send } from 'lucide-react';
import { supabase } from '@/lib/financeUtils';
import type { VoiceLanguage } from '@/lib/voiceTypes';

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  initialRecipient: string;
  initialSubject: string;
  language: VoiceLanguage;
}

export default function EmailModal({ open, onClose, initialRecipient, initialSubject, language }: EmailModalProps) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setRecipient(initialRecipient);
      setSubject(initialSubject);
      setBody('');
    }
  }, [open, initialRecipient, initialSubject]);

  if (!open) return null;

  const handleSend = async () => {
    if (!recipient.trim()) return;
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('voice_email_log').insert({
      recipient: recipient.trim(),
      subject: subject.trim() || null,
      body: body.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError(language === 'ar-EG' ? 'فشل حفظ السجل' : 'Failed to save log');
      return;
    }
    const mailto = `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const link = document.createElement('a');
    link.href = mailto;
    link.click();
    onClose();
  };

  const labels = {
    title: language === 'ar-EG' ? 'إرسال بريد إلكتروني' : language === 'en-US' ? 'Send Email' : 'Envoyer un email',
    recipient: language === 'ar-EG' ? 'المرسل إليه' : language === 'en-US' ? 'Recipient' : 'Destinataire',
    subject: language === 'ar-EG' ? 'الموضوع' : language === 'en-US' ? 'Subject' : 'Sujet',
    body: language === 'ar-EG' ? 'نص الرسالة' : language === 'en-US' ? 'Message body' : 'Corps du message',
    send: language === 'ar-EG' ? 'إرسال' : language === 'en-US' ? 'Send' : 'Envoyer',
    cancel: language === 'ar-EG' ? 'إلغاء' : language === 'en-US' ? 'Cancel' : 'Annuler',
    recipientPlaceholder: 'name@example.com',
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <Mail size={18} className="text-gold" />
            </div>
            <h3 className="font-heading font-bold text-midnight text-base">{labels.title}</h3>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink/70 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">{labels.recipient}</label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={labels.recipientPlaceholder}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">{labels.subject}</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="font-body text-xs font-bold text-ink/60 mb-1.5 block">{labels.body}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:border-gold focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        {error && <p className="font-body text-xs text-red-600 px-6 pb-2">{error}</p>}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors">
            {labels.cancel}
          </button>
          <button
            onClick={handleSend}
            disabled={saving || !recipient.trim()}
            className="px-5 py-2 rounded-lg font-body text-sm font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {labels.send}
          </button>
        </div>
      </div>
    </div>
  );
}
