import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}م`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}ك`;
  return String(amount);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} س`;
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function isOverdue(invoice: { due_date: string; status: string; amount_paid: number; total: number }): boolean {
  if (invoice.status === 'مدفوعة') return false;
  const due = new Date(invoice.due_date).getTime();
  const now = Date.now();
  return due < now && invoice.amount_paid < invoice.total;
}
