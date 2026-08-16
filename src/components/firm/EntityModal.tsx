import { useEffect } from 'react';
import { X } from 'lucide-react';

interface EntityModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  submitLabel?: string;
  loading?: boolean;
}

export function EntityModal({ open, title, onClose, onSubmit, children, submitLabel = 'حفظ', loading = false }: EntityModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-heading font-bold text-midnight text-base">{title}</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-5 py-2 rounded-lg font-body text-sm font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'جارٍ الحفظ...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

export function Field({ label, children, required }: FieldProps) {
  return (
    <div>
      <label className="block font-body text-xs font-medium text-ink/60 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 font-body text-sm text-midnight focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-colors bg-white";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className || ''} resize-none`} rows={props.rows || 3} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className || ''}`}>{children}</select>;
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30"
      />
      <span className="font-body text-sm text-ink/70">{label}</span>
    </label>
  );
}
