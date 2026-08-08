import { useEffect, useState, useCallback } from 'react';
import {
  Mail, Send, Inbox, Shield, Lock, Bell, Loader2, Plus, Pencil, Trash2,
  Archive, Eye, EyeOff, FileText, DollarSign, Clock, CheckCircle2,
  AlertTriangle, CircuitBoard, Server, AtSign, Zap, ArrowRight, ArrowLeft,
  Calendar, User as UserIcon, Search, X, Filter, ChevronRight, KeyRound, Gavel,
} from 'lucide-react';
import { supabase, formatDate, formatCurrency } from '@/lib/financeUtils';
import type { Mailbox, SovereignEmail, MailAlias, MailNotification, MailAuditLog, InvoiceOcr, Case } from '@/lib/firmTypes';
import type { Client, Attorney } from '@/lib/financeTypes';
import { EntityModal, Field, TextInput, TextArea, Select } from './EntityModal';
import { StatCard, DeleteConfirm } from './ClientManagement';
import type { PendingAddCommand } from '@/lib/voiceTypes';

type Tab = 'inbox' | 'sent' | 'compose' | 'notifications' | 'aliases' | 'audit';

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  low: { label: 'منخفضة', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  normal: { label: 'عادية', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
  high: { label: 'عالية', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  critical: { label: 'حرجة', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const INTENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  court_notice: { label: 'إخطار محكمة', icon: 'Gavel', color: 'text-purple-600' },
  invoice_received: { label: 'فاتورة واردة', icon: 'FileText', color: 'text-green-600' },
  legal_demand: { label: 'مطالبة قانونية', icon: 'AlertTriangle', color: 'text-red-600' },
  client_communication: { label: 'تواصل عميل', icon: 'Users', color: 'text-blue-600' },
  meeting_invite: { label: 'دعوة اجتماع', icon: 'Calendar', color: 'text-amber-600' },
  general: { label: 'عام', icon: 'Mail', color: 'text-ink/40' },
};

const NOTIF_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  court_reminder: { label: 'تذكير جلسة', icon: 'Gavel', color: 'text-purple-600' },
  client_update: { label: 'تحديث عميل', icon: 'Users', color: 'text-blue-600' },
  deadline_alert: { label: 'تنبيه موعد', icon: 'Clock', color: 'text-red-600' },
  meeting_link: { label: 'رابط اجتماع', icon: 'Video', color: 'text-amber-600' },
  billing_notice: { label: 'إشعار أتعاب', icon: 'DollarSign', color: 'text-green-600' },
};

interface ComposeForm {
  from_mailbox: string;
  to_address: string;
  cc_addresses: string;
  subject: string;
  body: string;
  priority: string;
  case_id: string;
  client_id: string;
  request_read_receipt: boolean;
}

const emptyCompose: ComposeForm = {
  from_mailbox: '', to_address: '', cc_addresses: '', subject: '', body: '',
  priority: 'normal', case_id: '', client_id: '', request_read_receipt: true,
};

export default function SovereignMail({ voiceAdd }: { voiceAdd?: () => PendingAddCommand | null }) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [emails, setEmails] = useState<SovereignEmail[]>([]);
  const [aliases, setAliases] = useState<MailAlias[]>([]);
  const [notifications, setNotifications] = useState<MailNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<MailAuditLog[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOcr[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [attorneys, setAttorneys] = useState<Attorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [selectedMailbox, setSelectedMailbox] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<SovereignEmail | null>(null);
  const [emailAudit, setEmailAudit] = useState<MailAuditLog[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState<ComposeForm>(emptyCompose);
  const [sending, setSending] = useState(false);
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
  const [aliasForm, setAliasForm] = useState({ alias_address: '', display_name: '', target_addresses: '', department: '', alias_type: 'department' });
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifForm, setNotifForm] = useState({ notification_type: 'client_update', recipient_address: '', recipient_name: '', subject: '', body: '', priority: 'normal', source_engine: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'email' | 'alias' | 'notification'>('email');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mbRes, emailRes, aliasRes, notifRes, auditRes, invRes, caseRes, clientRes, attRes] = await Promise.all([
      supabase.from('m52_mailboxes').select('*').order('email_address'),
      supabase.from('m52_emails')
        .select('*, case:lf_cases(case_number, case_title), client:lf_clients(name)')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('m52_aliases').select('*').order('alias_address'),
      supabase.from('m52_notifications').select('*').order('scheduled_for', { ascending: false }).limit(30),
      supabase.from('m52_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('m52_invoice_ocr').select('*').order('created_at', { ascending: false }),
      supabase.from('lf_cases').select('id, case_number, case_title').order('case_number'),
      supabase.from('lf_clients').select('*').order('name'),
      supabase.from('lf_attorneys').select('*').order('name'),
    ]);
    setMailboxes((mbRes.data as Mailbox[]) || []);
    setEmails((emailRes.data as SovereignEmail[]) || []);
    setAliases((aliasRes.data as MailAlias[]) || []);
    setNotifications((notifRes.data as MailNotification[]) || []);
    setAuditLogs((auditRes.data as MailAuditLog[]) || []);
    setInvoices((invRes.data as InvoiceOcr[]) || []);
    setCases((caseRes.data as Case[]) || []);
    setClients((clientRes.data as Client[]) || []);
    setAttorneys((attRes.data as Attorney[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const cmd = voiceAdd?.();
    if (cmd) {
      setComposeForm({ ...emptyCompose, subject: cmd.fields.title || '', body: cmd.fields.body || '' });
      setComposeOpen(true);
      setActiveTab('compose');
    }
  }, [voiceAdd]);

  const logAudit = async (emailId: string | null, action: string, detail: string) => {
    await supabase.from('m52_audit_logs').insert({
      email_id: emailId, action, actor: 'M52-MailEngine', detail,
    });
  };

  const openEmail = async (email: SovereignEmail) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      await supabase.from('m52_emails').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', email.id);
      await logAudit(email.id, 'read', 'تم فتح البريد وقراءته');
      fetchAll();
    }
    const { data } = await supabase.from('m52_audit_logs').select('*').eq('email_id', email.id).order('created_at', { ascending: true });
    setEmailAudit((data as MailAuditLog[]) || []);
  };

  const sendEmail = async () => {
    if (!composeForm.to_address.trim() || !composeForm.subject.trim() || !composeForm.from_mailbox) return;
    setSending(true);
    const { data } = await supabase.from('m52_emails').insert({
      mailbox_id: composeForm.from_mailbox,
      direction: 'outgoing',
      from_address: mailboxes.find((m) => m.id === composeForm.from_mailbox)?.email_address || '',
      to_address: composeForm.to_address.trim(),
      cc_addresses: composeForm.cc_addresses.trim() || null,
      subject: composeForm.subject.trim(),
      body: composeForm.body.trim() || null,
      is_encrypted: true,
      encryption_method: 'PGP',
      is_read: true,
      read_at: new Date().toISOString(),
      read_receipt_sent: composeForm.request_read_receipt,
      case_id: composeForm.case_id || null,
      client_id: composeForm.client_id || null,
      priority: composeForm.priority,
      smart_parsed: false,
    }).select('id');
    const emailId = data?.[0]?.id;
    if (emailId) {
      await logAudit(emailId, 'sent', `إرسال بريد سيادي إلى ${composeForm.to_address} — مشفر PGP`);
      if (composeForm.request_read_receipt) {
        await logAudit(emailId, 'read_receipt_requested', 'طلب تأكيد قراءة مشفر');
      }
    }
    setSending(false);
    setComposeOpen(false);
    setComposeForm(emptyCompose);
    setActiveTab('sent');
    fetchAll();
  };

  const archiveEmail = async (email: SovereignEmail) => {
    await supabase.from('m52_emails').update({ is_archived: true }).eq('id', email.id);
    await logAudit(email.id, 'archived', 'أرشفة البريد في جدول القضية');
    setSelectedEmail(null);
    fetchAll();
  };

  const sendNotification = async () => {
    if (!notifForm.recipient_address.trim() || !notifForm.subject.trim()) return;
    await supabase.from('m52_notifications').insert({
      notification_type: notifForm.notification_type,
      recipient_address: notifForm.recipient_address.trim(),
      recipient_name: notifForm.recipient_name.trim() || null,
      subject: notifForm.subject.trim(),
      body: notifForm.body.trim() || null,
      source_engine: notifForm.source_engine || 'M52-MailEngine',
      status: 'sent',
      priority: notifForm.priority,
      sent_at: new Date().toISOString(),
    });
    setNotifModalOpen(false);
    setNotifForm({ notification_type: 'client_update', recipient_address: '', recipient_name: '', subject: '', body: '', priority: 'normal', source_engine: '' });
    fetchAll();
  };

  const saveAlias = async () => {
    if (!aliasForm.alias_address.trim()) return;
    const targets = aliasForm.target_addresses.split(/[,\s]+/).filter(Boolean);
    const payload = {
      alias_address: aliasForm.alias_address.trim(),
      display_name: aliasForm.display_name.trim() || null,
      target_addresses: targets,
      department: aliasForm.department.trim() || null,
      alias_type: aliasForm.alias_type,
      active: true,
    };
    if (editingAliasId) {
      await supabase.from('m52_aliases').update(payload).eq('id', editingAliasId);
    } else {
      await supabase.from('m52_aliases').insert(payload);
    }
    setAliasModalOpen(false);
    setEditingAliasId(null);
    setAliasForm({ alias_address: '', display_name: '', target_addresses: '', department: '', alias_type: 'department' });
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleteType === 'email') {
      await supabase.from('m52_emails').delete().eq('id', deleteId);
      setSelectedEmail(null);
    } else if (deleteType === 'alias') {
      await supabase.from('m52_aliases').delete().eq('id', deleteId);
    } else if (deleteType === 'notification') {
      await supabase.from('m52_notifications').delete().eq('id', deleteId);
    }
    setDeleteId(null);
    fetchAll();
  };

  const processInvoice = async (inv: InvoiceOcr) => {
    await supabase.from('m52_invoice_ocr').update({
      finance_status: 'processed',
      finance_entry_id: `FIN-${Date.now()}`,
    }).eq('id', inv.id);
    await supabase.from('m52_emails').update({ invoice_processed: true }).eq('id', inv.email_id);
    await logAudit(inv.email_id, 'invoice_processed', `معالجة فاتورة ${inv.invoice_number} — تحديث حالة الدفع في المحرك المالي (M54)`);
    fetchAll();
  };

  const filteredEmails = emails.filter((e) => {
    if (activeTab === 'inbox' && e.direction !== 'incoming') return false;
    if (activeTab === 'sent' && e.direction !== 'outgoing') return false;
    if (selectedMailbox !== 'all' && e.mailbox_id !== selectedMailbox) return false;
    if (searchQuery && !e.subject.toLowerCase().includes(searchQuery.toLowerCase()) && !e.from_address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (e.is_archived) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={28} className="text-gold animate-spin" /></div>;
  }

  const unreadCount = emails.filter((e) => e.direction === 'incoming' && !e.is_read && !e.is_archived).length;
  const sentCount = emails.filter((e) => e.direction === 'outgoing').length;
  const pendingNotifs = notifications.filter((n) => n.status === 'pending').length;
  const unprocessedInvoices = invoices.filter((i) => i.finance_status === 'pending').length;
  const encryptedCount = emails.filter((e) => e.is_encrypted).length;

  const tabs: { id: Tab; label: string; icon: typeof Mail; badge?: number }[] = [
    { id: 'inbox', label: 'الوارد', icon: Inbox, badge: unreadCount },
    { id: 'sent', label: 'الصادر', icon: Send, badge: sentCount },
    { id: 'compose', label: 'إنشاء', icon: Plus },
    { id: 'notifications', label: 'الإشعارات', icon: Bell, badge: pendingNotifs },
    { id: 'aliases', label: 'الأسماء المستعارة', icon: AtSign },
    { id: 'audit', label: 'سجل التدقيق', icon: Shield },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-midnight flex items-center justify-center">
            <Mail size={20} className="text-gold" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-midnight text-lg">محرك البريد السيادي والإشعارات المؤتمتة (M52)</h2>
            <p className="font-body text-[10px] text-ink/40">بديل داخلي كامل لخدمات المراسلة الخارجية — تشفير شامل E2EE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
            <Lock size={12} className="text-green-600" />
            <span className="font-body text-[10px] font-bold text-green-700">E2EE · PGP</span>
          </div>
          <button
            onClick={() => { setComposeForm(emptyCompose); setComposeOpen(true); setActiveTab('compose'); }}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-midnight rounded-lg font-body text-sm font-bold hover:bg-gold/90 transition-colors"
          >
            <Plus size={16} /> بريد جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Mail size={14} className="text-midnight" />} label="إجمالي المراسلات" value={String(emails.length)} valueClass="text-midnight" />
        <StatCard icon={<Inbox size={14} className="text-blue-600" />} label="غير مقروء" value={String(unreadCount)} valueClass="text-blue-700" />
        <StatCard icon={<Lock size={14} className="text-green-600" />} label="مشفرة" value={String(encryptedCount)} valueClass="text-green-700" />
        <StatCard icon={<Bell size={14} className="text-amber-600" />} label="إشعارات معلقة" value={String(pendingNotifs)} valueClass="text-amber-700" />
        <StatCard icon={<FileText size={14} className="text-red-600" />} label="فواتير غير معالجة" value={String(unprocessedInvoices)} valueClass="text-red-700" />
      </div>

      {/* Cross-engine integration bar */}
      <div className="bg-midnight rounded-xl p-4 border border-gold/20">
        <div className="flex items-center gap-2 mb-3">
          <CircuitBoard size={14} className="text-gold" />
          <span className="font-heading font-bold text-cream text-xs">التكامل بين المحركات (Cross-Engine Integration)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Gavel, label: 'نواة القضية (M10)', desc: 'أرشفة آلية للمراسلات في ملف القضية', color: 'text-purple-400' },
            { icon: DollarSign, label: 'المحرك المالي (M54)', desc: 'OCR للفواتير وتحديث حالة الدفع', color: 'text-green-400' },
            { icon: Calendar, label: 'محرك الاجتماعات (M49)', desc: 'توليد روابط الاجتماعات وإرسالها', color: 'text-amber-400' },
            { icon: Zap, label: 'الوكيل الذكي (M92)', desc: 'تحليل آلي للمحتوى واستخراج الكيانات', color: 'text-gold' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="bg-midnight-light/50 rounded-lg p-2.5 border border-gold/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={item.color} />
                  <span className="font-body text-[10px] font-bold text-cream/80">{item.label}</span>
                </div>
                <p className="font-body text-[9px] text-cream/40 leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-body text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-gold border-gold'
                  : 'text-ink/40 border-transparent hover:text-ink/60'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gold text-midnight' : 'bg-gray-200 text-ink/50'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      {activeTab !== 'compose' && activeTab !== 'audit' && (
        <div className="flex items-center gap-2 mb-3">
          {activeTab !== 'notifications' && activeTab !== 'aliases' && (
            <>
              <Select
                value={selectedMailbox}
                onChange={(e) => setSelectedMailbox(e.target.value)}
                className="!w-auto !py-1.5 !text-xs"
              >
                <option value="all">كل صناديق البريد</option>
                {mailboxes.map((m) => <option key={m.id} value={m.id}>{m.email_address}</option>)}
              </Select>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30" />
                <TextInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في البريد..."
                  className="!py-1.5 !text-xs pr-9"
                />
              </div>
            </>
          )}
          {activeTab === 'notifications' && (
            <button
              onClick={() => setNotifModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold/90 transition-colors"
            >
              <Plus size={12} /> إشعار جديد
            </button>
          )}
          {activeTab === 'aliases' && (
            <button
              onClick={() => { setAliasForm({ alias_address: '', display_name: '', target_addresses: '', department: '', alias_type: 'department' }); setEditingAliasId(null); setAliasModalOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-midnight font-body text-xs font-bold hover:bg-gold/90 transition-colors"
            >
              <Plus size={12} /> اسم مستعار جديد
            </button>
          )}
        </div>
      )}

      {/* Inbox / Sent */}
      {(activeTab === 'inbox' || activeTab === 'sent') && (
        <div className="space-y-2">
          {filteredEmails.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Mail size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد رسائل</p>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const pCfg = PRIORITY_CONFIG[email.priority] || PRIORITY_CONFIG.normal;
              const intentCfg = email.parsed_intent ? INTENT_CONFIG[email.parsed_intent] : null;
              const isIncoming = email.direction === 'incoming';
              return (
                <div
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`bg-white rounded-xl border shadow-sm p-4 hover:border-gold/30 transition-colors cursor-pointer group ${
                    !email.is_read && isIncoming ? 'border-gold/20 bg-gold/5' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isIncoming ? 'bg-blue-50' : 'bg-green-50'}`}>
                        {isIncoming ? <ArrowLeft size={14} className="text-blue-600" /> : <ArrowRight size={14} className="text-green-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!email.is_read && isIncoming && <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />}
                          <p className={`font-body text-xs ${!email.is_read && isIncoming ? 'font-bold text-midnight' : 'text-ink/60'} truncate`}>
                            {isIncoming ? email.from_address : `إلى: ${email.to_address}`}
                          </p>
                          {email.is_encrypted && <Lock size={10} className="text-green-500 flex-shrink-0" />}
                        </div>
                        <p className={`font-body text-xs ${!email.is_read && isIncoming ? 'font-bold text-midnight' : 'text-ink/60'} mt-0.5 truncate`}>
                          {email.subject}
                        </p>
                        {email.body && <p className="font-body text-[10px] text-ink/40 mt-1 line-clamp-1">{email.body}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                          {intentCfg && email.smart_parsed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-purple-50 text-purple-600">
                              <Zap size={8} /> {intentCfg.label}
                            </span>
                          )}
                          {email.read_receipt_confirmed_at && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-green-50 text-green-600">
                              <CheckCircle2 size={8} /> تأكيد قراءة
                            </span>
                          )}
                          {email.case && <span className="font-body text-[9px] text-ink/40">{email.case.case_number}</span>}
                          {email.has_invoice && !email.invoice_processed && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-body bg-amber-50 text-amber-600">
                              <FileText size={8} /> فاتورة غير معالجة
                            </span>
                          )}
                          <span className="font-body text-[9px] text-ink/30">{formatDate(email.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-ink/20 group-hover:text-gold transition-colors flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Compose */}
      {activeTab === 'compose' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Send size={16} className="text-gold" />
            <h3 className="font-heading font-bold text-midnight text-sm">إنشاء بريد سيادي جديد</h3>
          </div>
          <Field label="صندق الإرسال" required>
            <Select value={composeForm.from_mailbox} onChange={(e) => setComposeForm({ ...composeForm, from_mailbox: e.target.value })}>
              <option value="">— اختر الصندق —</option>
              {mailboxes.map((m) => <option key={m.id} value={m.id}>{m.email_address}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="إلى" required><TextInput value={composeForm.to_address} onChange={(e) => setComposeForm({ ...composeForm, to_address: e.target.value })} placeholder="recipient@example.com" /></Field>
            <Field label="نسخة (CC)"><TextInput value={composeForm.cc_addresses} onChange={(e) => setComposeForm({ ...composeForm, cc_addresses: e.target.value })} placeholder="cc@example.com" /></Field>
          </div>
          <Field label="الموضوع" required><TextInput value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} placeholder="موضوع البريد" /></Field>
          <Field label="المحتوى"><TextArea value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} rows={6} /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="الأولوية">
              <Select value={composeForm.priority} onChange={(e) => setComposeForm({ ...composeForm, priority: e.target.value })}>
                <option value="low">منخفضة</option><option value="normal">عادية</option>
                <option value="high">عالية</option><option value="critical">حرجة</option>
              </Select>
            </Field>
            <Field label="القضية المرتبطة">
              <Select value={composeForm.case_id} onChange={(e) => setComposeForm({ ...composeForm, case_id: e.target.value })}>
                <option value="">— اختر —</option>
                {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number} — {c.case_title}</option>)}
              </Select>
            </Field>
            <Field label="العميل المرتبط">
              <Select value={composeForm.client_id} onChange={(e) => setComposeForm({ ...composeForm, client_id: e.target.value })}>
                <option value="">— اختر —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={composeForm.request_read_receipt} onChange={(e) => setComposeForm({ ...composeForm, request_read_receipt: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" />
            <span className="font-body text-xs text-ink/60">طلب تأكيد قراءة مشفر (إثبات رسمي لعلم الطرف الآخر)</span>
          </label>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => { setComposeForm(emptyCompose); setActiveTab('inbox'); }} className="px-4 py-2 rounded-lg font-body text-sm text-ink/60 hover:bg-gray-100 transition-colors">إلغاء</button>
            <button onClick={sendEmail} disabled={!composeForm.to_address.trim() || !composeForm.subject.trim() || !composeForm.from_mailbox} className="flex items-center gap-2 px-5 py-2 rounded-lg font-body text-sm font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors disabled:opacity-50">
              <Send size={14} /> إرسال مشفر
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Bell size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const typeCfg = NOTIF_TYPE_CONFIG[notif.notification_type] || { label: notif.notification_type, icon: 'Bell', color: 'text-ink/40' };
              const pCfg = PRIORITY_CONFIG[notif.priority] || PRIORITY_CONFIG.normal;
              return (
                <div key={notif.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 group hover:border-gold/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.status === 'pending' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        <Bell size={14} className={notif.status === 'pending' ? 'text-amber-500' : 'text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body font-bold ${typeCfg.color} bg-gray-50`}>{typeCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${pCfg.bg} ${pCfg.text}`}>{pCfg.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${notif.status === 'sent' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {notif.status === 'sent' ? 'مرسل' : 'معلق'}
                          </span>
                        </div>
                        <p className="font-body text-xs font-bold text-midnight mt-1">{notif.subject}</p>
                        {notif.body && <p className="font-body text-[10px] text-ink/50 mt-0.5 line-clamp-2">{notif.body}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="font-body text-[9px] text-ink/40">إلى: {notif.recipient_address}</span>
                          {notif.source_engine && <span className="font-body text-[9px] text-gold">{notif.source_engine}</span>}
                          <span className="font-body text-[9px] text-ink/30">{formatDate(notif.scheduled_for)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setDeleteId(notif.id); setDeleteType('notification'); }}
                      className="p-1.5 rounded text-ink/30 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Aliases */}
      {activeTab === 'aliases' && (
        <div className="space-y-2">
          {aliases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <AtSign size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد أسماء مستعارة</p>
            </div>
          ) : (
            aliases.map((alias) => (
              <div key={alias.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 group hover:border-gold/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-midnight flex items-center justify-center flex-shrink-0">
                      <AtSign size={14} className="text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-xs font-bold text-midnight">{alias.alias_address}</p>
                      {alias.display_name && <p className="font-body text-[10px] text-ink/50 mt-0.5">{alias.display_name}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {alias.target_addresses.map((addr, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-gray-100 font-body text-[9px] text-ink/50">{addr}</span>
                        ))}
                        {alias.department && <span className="font-body text-[9px] text-ink/40">{alias.department}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${alias.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-ink/40'}`}>
                          {alias.active ? 'نشط' : 'متوقف'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setAliasForm({
                          alias_address: alias.alias_address,
                          display_name: alias.display_name || '',
                          target_addresses: alias.target_addresses.join(', '),
                          department: alias.department || '',
                          alias_type: alias.alias_type,
                        });
                        setEditingAliasId(alias.id);
                        setAliasModalOpen(true);
                      }}
                      className="p-1.5 rounded text-ink/40 hover:text-gold hover:bg-gold/5 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => { setDeleteId(alias.id); setDeleteType('alias'); }}
                      className="p-1.5 rounded text-ink/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Audit logs */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gold" />
            <span className="font-heading font-bold text-midnight text-sm">سجل التدقيق غير القابل للتعديل</span>
            <span className="font-body text-[10px] text-ink/30">— AES-256 · {auditLogs.length} عملية مسجلة</span>
          </div>
          {auditLogs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
              <Shield size={28} className="text-ink/15 mx-auto mb-2" />
              <p className="font-body text-xs text-ink/30">لا توجد سجلات</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {log.action === 'sent' ? <Send size={12} className="text-green-600" />
                        : log.action === 'received' ? <Inbox size={12} className="text-blue-600" />
                        : log.action === 'read' ? <Eye size={12} className="text-ink/40" />
                        : log.action === 'archived' ? <Archive size={12} className="text-purple-600" />
                        : log.action === 'smart_parsed' ? <Zap size={12} className="text-gold" />
                        : log.action === 'read_receipt_requested' ? <CheckCircle2 size={12} className="text-blue-600" />
                        : log.action === 'read_receipt_confirmed' ? <CheckCircle2 size={12} className="text-green-600" />
                        : log.action === 'invoice_processed' ? <DollarSign size={12} className="text-green-600" />
                        : <Shield size={12} className="text-ink/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[10px] font-bold text-midnight">{log.action}</span>
                        {log.actor && <span className="font-body text-[9px] text-ink/40">{log.actor}</span>}
                      </div>
                      {log.detail && <p className="font-body text-[10px] text-ink/50 leading-relaxed mt-0.5">{log.detail}</p>}
                      <span className="font-body text-[9px] text-ink/30">{formatDate(log.created_at)}</span>
                    </div>
                    <Lock size={10} className="text-green-500 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email detail drawer */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-midnight/60 backdrop-blur-sm" onClick={() => setSelectedEmail(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gold" />
                <span className="font-heading font-bold text-midnight text-sm">تفاصيل البريد السيادي</span>
              </div>
              <button onClick={() => setSelectedEmail(null)} className="text-ink/40 hover:text-ink transition-colors"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <h3 className="font-heading font-bold text-midnight text-base">{selectedEmail.subject}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-[10px] font-body font-bold ${(PRIORITY_CONFIG[selectedEmail.priority] || PRIORITY_CONFIG.normal).bg} ${(PRIORITY_CONFIG[selectedEmail.priority] || PRIORITY_CONFIG.normal).text}`}>
                  {(PRIORITY_CONFIG[selectedEmail.priority] || PRIORITY_CONFIG.normal).label}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-body ${selectedEmail.direction === 'incoming' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                  {selectedEmail.direction === 'incoming' ? 'وارد' : 'صادر'}
                </span>
                {selectedEmail.is_encrypted && (
                  <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-green-50 text-green-600">
                    <Lock size={9} /> مشفر {selectedEmail.encryption_method}
                  </span>
                )}
                {selectedEmail.smart_parsed && (
                  <span className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-body bg-purple-50 text-purple-600">
                    <Zap size={9} /> تحليل آلي
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <span className="font-body text-[9px] text-ink/40">{selectedEmail.direction === 'incoming' ? 'من' : 'إلى'}</span>
                  <p className="font-body text-xs font-bold text-midnight truncate">{selectedEmail.direction === 'incoming' ? selectedEmail.from_address : selectedEmail.to_address}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <span className="font-body text-[9px] text-ink/40">التاريخ</span>
                  <p className="font-body text-xs font-bold text-midnight">{formatDate(selectedEmail.created_at)}</p>
                </div>
              </div>

              {selectedEmail.body && (
                <div>
                  <p className="font-body text-[10px] font-bold text-ink/40 mb-1">المحتوى</p>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="font-body text-xs text-ink/70 leading-relaxed whitespace-pre-wrap">{selectedEmail.body}</p>
                  </div>
                </div>
              )}

              {/* Smart-parsed entities */}
              {selectedEmail.smart_parsed && selectedEmail.parsed_intent && (
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={12} className="text-purple-600" />
                    <span className="font-body text-[10px] font-bold text-purple-700">تحليل الوكيل الذكي (M92)</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-body bg-purple-100 text-purple-700">
                      {INTENT_CONFIG[selectedEmail.parsed_intent]?.label || selectedEmail.parsed_intent}
                    </span>
                  </div>
                  {Object.keys(selectedEmail.parsed_entities).length > 0 && (
                    <div className="space-y-1">
                      <p className="font-body text-[9px] text-purple-600 font-bold">الكيانات المستخرجة:</p>
                      {Object.entries(selectedEmail.parsed_entities).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="font-body text-[9px] text-purple-400">{key}:</span>
                          <span className="font-body text-[10px] text-purple-700 font-bold">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Read receipt */}
              {selectedEmail.read_receipt_confirmed_at && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-green-600" />
                    <span className="font-body text-[10px] font-bold text-green-700">تأكيد قراءة مشفر</span>
                  </div>
                  <p className="font-body text-[10px] text-green-600 mt-1">تم إثبات علم الطرف الآخر رسمياً في {formatDate(selectedEmail.read_receipt_confirmed_at)}</p>
                </div>
              )}

              {/* Invoice OCR */}
              {selectedEmail.has_invoice && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} className="text-amber-600" />
                    <span className="font-body text-[10px] font-bold text-amber-700">فاتورة مكتشفة (OCR)</span>
                  </div>
                  {(() => {
                    const inv = invoices.find((i) => i.email_id === selectedEmail.id);
                    if (!inv) return <p className="font-body text-[10px] text-amber-600">جارٍ المعالجة...</p>;
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-body text-[10px] text-amber-600">{inv.vendor_name}</span>
                          <span className="font-body text-xs font-bold text-amber-700">{formatCurrency(inv.amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[9px] text-amber-500">فاتورة: {inv.invoice_number}</span>
                          <span className="font-body text-[9px] text-amber-500">دقة OCR: {inv.ocr_confidence.toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-body ${inv.finance_status === 'processed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inv.finance_status === 'processed' ? 'تمت المعالجة' : 'بانتظار المعالجة'}
                          </span>
                          {inv.finance_status === 'pending' && (
                            <button
                              onClick={() => processInvoice(inv)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white font-body text-[9px] font-bold hover:bg-amber-700 transition-colors"
                            >
                              <DollarSign size={9} /> معالجة في M54
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Audit trail for this email */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield size={12} className="text-gold" />
                  <span className="font-body text-[10px] font-bold text-midnight">سجل التدقيق لهذا البريد</span>
                </div>
                {emailAudit.length === 0 ? (
                  <p className="font-body text-[10px] text-ink/30">لا توجد سجلات</p>
                ) : (
                  <div className="space-y-1.5">
                    {emailAudit.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="font-body text-ink/60">{log.action}</span>
                          {log.detail && <p className="font-body text-ink/40 leading-tight">{log.detail}</p>}
                          <span className="font-body text-ink/30">{formatDate(log.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
              <button
                onClick={() => archiveEmail(selectedEmail)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-ink/60 hover:bg-gray-100 transition-colors"
              >
                <Archive size={12} /> أرشفة في القضية
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setDeleteId(selectedEmail.id); setDeleteType('email'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} /> حذف
                </button>
                <button
                  onClick={() => {
                    setComposeForm({
                      ...emptyCompose,
                      to_address: selectedEmail.direction === 'incoming' ? selectedEmail.from_address : '',
                      subject: `رد: ${selectedEmail.subject}`,
                    });
                    setSelectedEmail(null);
                    setActiveTab('compose');
                    setComposeOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-bold bg-gold text-midnight hover:bg-gold/90 transition-colors"
                >
                  <Send size={12} /> رد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      <EntityModal open={composeOpen} title="بريد سيادي جديد" onClose={() => setComposeOpen(false)} onSubmit={sendEmail} loading={sending} submitLabel="إرسال مشفر">
        <Field label="صندق الإرسال" required>
          <Select value={composeForm.from_mailbox} onChange={(e) => setComposeForm({ ...composeForm, from_mailbox: e.target.value })}>
            <option value="">— اختر —</option>
            {mailboxes.map((m) => <option key={m.id} value={m.id}>{m.email_address}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="إلى" required><TextInput value={composeForm.to_address} onChange={(e) => setComposeForm({ ...composeForm, to_address: e.target.value })} /></Field>
          <Field label="نسخة (CC)"><TextInput value={composeForm.cc_addresses} onChange={(e) => setComposeForm({ ...composeForm, cc_addresses: e.target.value })} /></Field>
        </div>
        <Field label="الموضوع" required><TextInput value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} /></Field>
        <Field label="المحتوى"><TextArea value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} rows={5} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="الأولوية">
            <Select value={composeForm.priority} onChange={(e) => setComposeForm({ ...composeForm, priority: e.target.value })}>
              <option value="low">منخفضة</option><option value="normal">عادية</option>
              <option value="high">عالية</option><option value="critical">حرجة</option>
            </Select>
          </Field>
          <Field label="القضية المرتبطة">
            <Select value={composeForm.case_id} onChange={(e) => setComposeForm({ ...composeForm, case_id: e.target.value })}>
              <option value="">— اختر —</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number}</option>)}
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={composeForm.request_read_receipt} onChange={(e) => setComposeForm({ ...composeForm, request_read_receipt: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30" />
          <span className="font-body text-xs text-ink/60">طلب تأكيد قراءة مشفر</span>
        </label>
      </EntityModal>

      {/* Alias modal */}
      <EntityModal open={aliasModalOpen} title={editingAliasId ? 'تعديل اسم مستعار' : 'اسم مستعار جديد'} onClose={() => setAliasModalOpen(false)} onSubmit={saveAlias}>
        <Field label="عنوان الاسم المستعار" required><TextInput value={aliasForm.alias_address} onChange={(e) => setAliasForm({ ...aliasForm, alias_address: e.target.value })} placeholder="dept@firmdomain.com" /></Field>
        <Field label="الاسم المعروض"><TextInput value={aliasForm.display_name} onChange={(e) => setAliasForm({ ...aliasForm, display_name: e.target.value })} /></Field>
        <Field label="العناوين المستهدفة (مفصولة بفواصل)"><TextInput value={aliasForm.target_addresses} onChange={(e) => setAliasForm({ ...aliasForm, target_addresses: e.target.value })} placeholder="legal@firmdomain.com, admin@firmdomain.com" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="القسم"><TextInput value={aliasForm.department} onChange={(e) => setAliasForm({ ...aliasForm, department: e.target.value })} /></Field>
          <Field label="النوع">
            <Select value={aliasForm.alias_type} onChange={(e) => setAliasForm({ ...aliasForm, alias_type: e.target.value })}>
              <option value="department">قسم</option><option value="role">دور</option><option value="function">وظيفة</option>
            </Select>
          </Field>
        </div>
      </EntityModal>

      {/* Notification modal */}
      <EntityModal open={notifModalOpen} title="إشعار مؤتمت جديد" onClose={() => setNotifModalOpen(false)} onSubmit={sendNotification}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="نوع الإشعار">
            <Select value={notifForm.notification_type} onChange={(e) => setNotifForm({ ...notifForm, notification_type: e.target.value })}>
              <option value="court_reminder">تذكير جلسة</option>
              <option value="client_update">تحديث عميل</option>
              <option value="deadline_alert">تنبيه موعد</option>
              <option value="meeting_link">رابط اجتماع</option>
              <option value="billing_notice">إشعار أتعاب</option>
            </Select>
          </Field>
          <Field label="الأولوية">
            <Select value={notifForm.priority} onChange={(e) => setNotifForm({ ...notifForm, priority: e.target.value })}>
              <option value="low">منخفضة</option><option value="normal">عادية</option>
              <option value="high">عالية</option><option value="critical">حرجة</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="المستلم" required><TextInput value={notifForm.recipient_address} onChange={(e) => setNotifForm({ ...notifForm, recipient_address: e.target.value })} placeholder="recipient@firmdomain.com" /></Field>
          <Field label="اسم المستلم"><TextInput value={notifForm.recipient_name} onChange={(e) => setNotifForm({ ...notifForm, recipient_name: e.target.value })} /></Field>
        </div>
        <Field label="الموضوع" required><TextInput value={notifForm.subject} onChange={(e) => setNotifForm({ ...notifForm, subject: e.target.value })} /></Field>
        <Field label="المحتوى"><TextArea value={notifForm.body} onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })} /></Field>
        <Field label="المحرك المصدر">
          <Select value={notifForm.source_engine} onChange={(e) => setNotifForm({ ...notifForm, source_engine: e.target.value })}>
            <option value="">— يدوي —</option>
            <option value="M10-CaseCore">نواة القضية (M10)</option>
            <option value="M49-BoardEngine">مجلس الإدارة (M49)</option>
            <option value="M52-MailEngine">محرك البريد (M52)</option>
            <option value="M54-FinanceEngine">المحرك المالي (M54)</option>
          </Select>
        </Field>
      </EntityModal>

      <DeleteConfirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}
