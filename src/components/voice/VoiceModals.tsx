import { useState, useEffect } from 'react';
import { useVoice } from '@/lib/voiceContext';
import ReminderModal from './ReminderModal';
import EmailModal from './EmailModal';

export default function VoiceModals() {
  const { pendingRemind, consumePendingRemind, pendingEmail, consumePendingEmail, language } = useVoice();
  const [remindOpen, setRemindOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [remindData, setRemindData] = useState({ title: '', date: '' });
  const [emailData, setEmailData] = useState({ recipient: '', subject: '' });

  useEffect(() => {
    if (pendingRemind) {
      setRemindData({ title: pendingRemind.title, date: pendingRemind.dueDate });
      setRemindOpen(true);
      consumePendingRemind();
    }
  }, [pendingRemind, consumePendingRemind]);

  useEffect(() => {
    if (pendingEmail) {
      setEmailData({ recipient: pendingEmail.recipient, subject: pendingEmail.subject });
      setEmailOpen(true);
      consumePendingEmail();
    }
  }, [pendingEmail, consumePendingEmail]);

  return (
    <>
      <ReminderModal
        open={remindOpen}
        onClose={() => setRemindOpen(false)}
        initialTitle={remindData.title}
        initialDateToken={remindData.date}
        language={language}
      />
      <EmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        initialRecipient={emailData.recipient}
        initialSubject={emailData.subject}
        language={language}
      />
    </>
  );
}
