import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { postContactRequest } from '@/services/api';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setStatus('idle');
      setName('');
      setEmail('');
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setStatus('submitting');
    setErrorMessage(null);

    try {
      await postContactRequest(name.trim(), email.trim());
      setStatus('success');

      // Close modal automatically after short success display
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setName('');
        setEmail('');
      }, 1800);
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(err?.message || 'حدث خطأ غير متوقع');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-midnight-deep/90 backdrop-blur-sm animate-fade-in"
        onClick={() => { if (status !== 'submitting') onClose(); }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-midnight border border-gold/30 p-10 lg:p-12 animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={() => { if (status !== 'submitting') onClose(); }}
          className="absolute top-5 left-5 text-cream/40 hover:text-gold transition-colors duration-300"
          aria-label="إغلاق"
        >
          <X size={22} />
        </button>

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-6">
              <CheckCircle2 size={56} strokeWidth={1} className="text-gold" />
            </div>
            <h3 className="font-heading font-bold text-cream text-xl mb-4">
              تم استلام طلبك
            </h3>
            <p className="font-body font-light text-cream/60 text-sm leading-[1.9] mb-8">
              سنتواصل معك في أقرب وقت ممكن عبر البريد الإلكتروني،
              ضمن بروتوكول السرية التامة الخاص بالمؤسسة.
            </p>
            <button
              onClick={() => { onClose(); setStatus('idle'); }}
              className="px-8 py-3 border border-gold/40 text-gold hover:bg-gold hover:text-midnight transition-all duration-500 text-sm font-body"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="w-10 h-px bg-gold/50" />
                <span className="text-gold text-2xl font-serif-en">"</span>
                <span className="w-10 h-px bg-gold/50" />
              </div>
              <h3 className="font-heading font-bold text-cream text-xl mb-3">
                طلب اجتماع استراتيجي مغلق
              </h3>
              <p className="font-body font-light text-cream/50 text-sm leading-[1.9]">
                اترك اسمك وبريدك الإلكتروني فقط، وسنتولى الباقي
                ضمن بروتوكول السرية التامة.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-body text-xs text-cream/50 mb-3 tracking-wide">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={status === 'submitting'}
                  className="w-full bg-transparent border-b border-cream/20 focus:border-gold py-3 text-cream font-body text-base outline-none transition-colors duration-500 placeholder:text-cream"
                  placeholder="أدخل اسمك"
                />
              </div>

              <div>
                <label className="block font-body text-xs text-cream/50 mb-3 tracking-wide">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === 'submitting'}
                  className="w-full bg-transparent border-b border-cream/20 focus:border-gold py-3 text-cream font-body text-base outline-none transition-colors duration-500 placeholder:text-cream"
                  placeholder="name@example.com"
                  dir="ltr"
                />
              </div>

              {status === 'error' && (
                <p className="font-body text-sm text-red-400 text-center">
                  {errorMessage || 'حدث خطأ ما. يرجى المحاولة مرة أخرى.'}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="group relative w-full px-8 py-4 border border-gold/50 hover:border-gold transition-all duration-700 ease-luxury overflow-hidden disabled:opacity-50"
              >
                <span className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-luxury" />
                <span className="relative flex items-center justify-center gap-2 font-body text-sm text-gold group-hover:text-midnight transition-colors duration-700 ease-luxury tracking-wide">
                  {status === 'submitting' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    'تأكيد الطلب'
                  )}
                </span>
              </button>
            </form>

            <p className="font-body text-[10px] text-cream/30 text-center mt-6 leading-[1.9]">
              * تخضع كافة المراسلات لبروتوكول «السرية التامة» من اللحظة الأولى.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
