// src/components/firm/MeetingDashboard.tsx
// لوحة تحكم الاجتماعات المتقدمة مع تكامل الذكاء الاصطناعي

import React, { useState, useEffect, useCallback } from 'react';
import {
  Video, Users, FileText, Brain, Languages, Calendar, Lock, Shield,
  Clock, CheckCircle, AlertCircle, TrendingUp, Download, Share2,
  ArrowRight, Star, MessageSquare, BarChart3, Zap, Settings,
  ChevronDown, Filter, Search, Plus, Copy, Eye, EyeOff
} from 'lucide-react';
import type { Meeting } from '@/lib/firmTypes';
import { supabase } from '@/lib/financeUtils';
import {
  analyzeConversation,
  generateSmartMOM,
  getConversationRecommendations,
  type ConversationAnalysis
} from '@/lib/meetingAIAgent';

/**
 * لوحة تحكم الاجتماعات المتقدمة
 * توفر عرضاً شاملاً وسهلاً للاجتماعات والمهام والتحليلات
 */
export const MeetingDashboard: React.FC<{ voiceAdd?: (command: string) => void }> = ({ voiceAdd }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [generatedMOM, setGeneratedMOM] = useState<string>('');
  const [stats, setStats] = useState({
    totalMeetings: 0,
    activeMeetings: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });

  // جلب البيانات
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lf_meetings')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('خطأ في جلب الاجتماعات:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = (meetingList: Meeting[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    setStats({
      totalMeetings: meetingList.length,
      activeMeetings: meetingList.filter(m => m.status === 'منعقدة').length,
      pendingTasks: meetingList.reduce((sum, m) => sum + (m.agenda ? 1 : 0), 0),
      completedTasks: meetingList.filter(m => m.mom_status === 'approved').length,
    });
  };

  const filteredMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.scheduled_date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // تطبيق المرشح الزمني
    switch (filter) {
      case 'today':
        return meetingDate.toDateString() === today.toDateString();
      case 'upcoming':
        return meetingDate > now && meetingDate.toDateString() !== today.toDateString();
      case 'past':
        return meetingDate < now;
      default:
        return true;
    }
  }).filter(meeting => {
    // تطبيق البحث
    return (
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.agenda?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meeting.participants || []).some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleAnalyzeMeeting = useCallback(async (meeting: Meeting) => {
    if (!meeting.id) return;

    setLoading(true);
    setSelectedMeeting(meeting);
    try {
      // جلب التفريغ
      const { data: transcripts, error } = await supabase
        .from('lf_meeting_transcripts')
        .select('*')
        .eq('meeting_id', meeting.id);

      if (error) throw error;

      // دمج التفريغات
      const transcriptText = (transcripts || [])
        .map((t: any) => `${t.speaker}: ${t.text_ar || t.text_translated}`)
        .join(' ');

      // تحليل المحادثة
      const analysisResult = await analyzeConversation(
        meeting.id,
        transcriptText || meeting.agenda || '',
        {}
      );

      setAnalysis(analysisResult);
      setShowAnalysisPanel(true);

      // توليد المحضر
      const mom = await generateSmartMOM(meeting.id, analysisResult, meeting);
      setGeneratedMOM(mom);
    } catch (err) {
      console.error('خطأ في تحليل الاجتماع:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-midnight-900 via-midnight-800 to-midnight-900 text-cream-100">
      {/* الرأس */}
      <div className="border-b border-gold-400/20 bg-midnight-900/80 backdrop-blur-sm p-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-gold-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-300 to-cream-100 bg-clip-text text-transparent">
              لوحة تحكم الاجتماعات
            </h1>
          </div>
          <button
            onClick={() => voiceAdd?.('إنشاء اجتماع جديد')}
            className="flex items-center gap-2 px-4 py-2 bg-gold-400 text-midnight-900 rounded-lg hover:bg-gold-300 transition font-semibold"
          >
            <Plus className="w-5 h-5" />
            اجتماع جديد
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border-b border-gold-400/20">
        <StatCard icon={Video} label="إجمالي الاجتماعات" value={stats.totalMeetings} />
        <StatCard icon={Zap} label="اجتماعات نشطة" value={stats.activeMeetings} color="gold" />
        <StatCard icon={Clock} label="مهام معلقة" value={stats.pendingTasks} color="orange" />
        <StatCard icon={CheckCircle} label="محاضر معتمدة" value={stats.completedTasks} color="green" />
      </div>

      <div className="flex h-[calc(100vh-200px)]">
        {/* اللوحة الجانبية - قائمة الاجتماعات */}
        <div className="w-96 border-r border-gold-400/20 flex flex-col bg-midnight-800">
          {/* شريط البحث والتصفية */}
          <div className="p-4 space-y-3 border-b border-gold-400/20">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gold-400/50" />
              <input
                type="text"
                placeholder="البحث في الاجتماعات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-midnight-900 border border-gold-400/30 rounded-lg text-cream-100 placeholder-cream-400 focus:border-gold-400 outline-none transition"
              />
            </div>
            
            <div className="flex gap-2">
              {(['all', 'today', 'upcoming', 'past'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    filter === f
                      ? 'bg-gold-400 text-midnight-900'
                      : 'bg-midnight-900 text-cream-100 border border-gold-400/20 hover:border-gold-400/50'
                  }`}
                >
                  {f === 'all' && 'الكل'}
                  {f === 'today' && 'اليوم'}
                  {f === 'upcoming' && 'قادمة'}
                  {f === 'past' && 'انتهت'}
                </button>
              ))}
            </div>
          </div>

          {/* قائمة الاجتماعات */}
          <div className="flex-1 overflow-y-auto space-y-2 p-4">
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-8 text-cream-400">لا توجد اجتماعات</div>
            ) : (
              filteredMeetings.map(meeting => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  isSelected={selectedMeeting?.id === meeting.id}
                  onSelect={() => handleAnalyzeMeeting(meeting)}
                />
              ))
            )}
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="flex-1 flex flex-col">
          {selectedMeeting ? (
            <>
              {/* معلومات الاجتماع */}
              <div className="p-6 border-b border-gold-400/20 bg-gradient-to-r from-midnight-800 to-midnight-900">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-cream-100 mb-2">{selectedMeeting.title}</h2>
                    <div className="flex items-center gap-4 text-cream-400 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedMeeting.scheduled_date).toLocaleDateString('ar-EG')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {selectedMeeting.participants?.length || 0} مشاركين
                      </span>
                      <StatusBadge status={selectedMeeting.status} />
                    </div>
                  </div>
                  <MeetingActions meeting={selectedMeeting} />
                </div>

                {/* الوسوم والعلامات */}
                <div className="flex flex-wrap gap-2">
                  {selectedMeeting.meeting_type && (
                    <Tag icon={Video} label={selectedMeeting.meeting_type} color="blue" />
                  )}
                  {selectedMeeting.language && (
                    <Tag icon={Languages} label={selectedMeeting.language} color="purple" />
                  )}
                  {selectedMeeting.privilege_mode && (
                    <Tag icon={Lock} label="مداولة سرية" color="red" />
                  )}
                  {selectedMeeting.recording_enabled && (
                    <Tag icon={Video} label="مسجّل" color="green" />
                  )}
                </div>
              </div>

              {/* لوحة التحليل والمحضر */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin mb-4">
                        <Brain className="w-12 h-12 text-gold-400" />
                      </div>
                      <p className="text-cream-400">جاري تحليل الاجتماع...</p>
                    </div>
                  </div>
                ) : analysis ? (
                  <AnalysisPanel analysis={analysis} generatedMOM={generatedMOM} />
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gold-400/50 mx-auto mb-4" />
                    <p className="text-cream-400 mb-4">اختر اجتماعاً لتحليله</p>
                    <p className="text-sm text-cream-500">سيقوم الذكاء الاصطناعي بتحليل المحادثة واستخراج القرارات والمهام</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-20 h-20 text-gold-400/30 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-cream-100 mb-2">اختر اجتماعاً</h3>
                <p className="text-cream-400">حدد اجتماعاً من القائمة لعرض التفاصيل والتحليل</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * بطاقة الاجتماع الواحد
 */
const MeetingCard: React.FC<{
  meeting: Meeting;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ meeting, isSelected, onSelect }) => {
  const meetingDate = new Date(meeting.scheduled_date);
  const isToday = meetingDate.toDateString() === new Date().toDateString();
  const isPast = meetingDate < new Date();

  return (
    <button
      onClick={onSelect}
      className={`w-full text-right p-4 rounded-lg transition border-2 ${
        isSelected
          ? 'border-gold-400 bg-gold-400/10'
          : 'border-gold-400/20 bg-midnight-900/50 hover:border-gold-400/40 hover:bg-midnight-900/70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-cream-100 line-clamp-2">{meeting.title}</h3>
          <div className="mt-2 space-y-1 text-sm text-cream-400">
            <div>{meetingDate.toLocaleDateString('ar-EG')}</div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {meeting.participants?.length || 0} مشاركين
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          {isToday && <span className="text-xs px-2 py-1 bg-gold-400 text-midnight-900 rounded font-semibold">اليوم</span>}
          {isPast && meeting.mom_status === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
          {isPast && !meeting.mom_status && <AlertCircle className="w-5 h-5 text-orange-400" />}
        </div>
      </div>
    </button>
  );
};

/**
 * لوحة التحليل والمحضر
 */
const AnalysisPanel: React.FC<{
  analysis: ConversationAnalysis;
  generatedMOM: string;
}> = ({ analysis, generatedMOM }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'decisions' | 'tasks' | 'risks' | 'mom'>('summary');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* التبويبات */}
      <div className="flex gap-2 border-b border-gold-400/20 -mx-6 px-6">
        {(['summary', 'decisions', 'tasks', 'risks', 'mom'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 font-medium border-b-2 transition ${
              activeTab === tab
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-cream-400 hover:text-cream-100'
            }`}
          >
            {tab === 'summary' && 'الملخص'}
            {tab === 'decisions' && `القرارات (${analysis.decisions.length})`}
            {tab === 'tasks' && `المهام (${analysis.tasks.length})`}
            {tab === 'risks' && `المخاطر (${analysis.risks.length})`}
            {tab === 'mom' && 'المحضر'}
          </button>
        ))}
      </div>

      {/* محتوى التبويب */}
      <div>
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="p-4 bg-midnight-900/50 border border-gold-400/20 rounded-lg">
              <p className="text-cream-100 leading-relaxed">{analysis.summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {analysis.keyPoints.map((point, i) => (
                <div key={i} className="p-3 bg-gold-400/10 border border-gold-400/20 rounded-lg">
                  <p className="text-sm text-cream-100">{point}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="space-y-3">
            {analysis.decisions.map(decision => (
              <DecisionCard key={decision.id} decision={decision} />
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {analysis.tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-3">
            {analysis.risks.map((risk, i) => (
              <RiskCard key={i} risk={risk} />
            ))}
          </div>
        )}

        {activeTab === 'mom' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(generatedMOM)}
                className="flex items-center gap-2 px-4 py-2 bg-gold-400 text-midnight-900 rounded-lg hover:bg-gold-300 transition font-semibold"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-midnight-900 border border-gold-400/30 text-cream-100 rounded-lg hover:border-gold-400 transition font-semibold">
                <Download className="w-4 h-4" />
                تنزيل PDF
              </button>
            </div>
            <pre className="p-4 bg-midnight-900/50 border border-gold-400/20 rounded-lg overflow-auto text-xs text-cream-300 font-mono">
              {generatedMOM}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * بطاقة القرار
 */
const DecisionCard: React.FC<{ decision: ConversationAnalysis['decisions'][0] }> = ({ decision }) => (
  <div className="p-4 bg-midnight-900/50 border border-gold-400/20 rounded-lg">
    <div className="flex items-start justify-between mb-2">
      <h4 className="font-semibold text-cream-100">{decision.text}</h4>
      <span className={`text-xs px-2 py-1 rounded font-semibold ${
        decision.priority === 'حرج' ? 'bg-red-500/20 text-red-300' :
        decision.priority === 'عالي' ? 'bg-orange-500/20 text-orange-300' :
        'bg-yellow-500/20 text-yellow-300'
      }`}>
        {decision.priority}
      </span>
    </div>
    <div className="text-sm text-cream-400">
      <div>الناطق: {decision.speaker}</div>
      {decision.legalReferences.length > 0 && (
        <div className="mt-2 text-xs text-gold-400">
          المراجع: {decision.legalReferences.join(', ')}
        </div>
      )}
    </div>
  </div>
);

/**
 * بطاقة المهمة
 */
const TaskCard: React.FC<{ task: ConversationAnalysis['tasks'][0] }> = ({ task }) => (
  <div className="p-4 bg-midnight-900/50 border border-gold-400/20 rounded-lg">
    <div className="flex items-start justify-between mb-2">
      <h4 className="font-semibold text-cream-100">{task.title}</h4>
      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded font-semibold">
        {task.priority}
      </span>
    </div>
    <div className="grid grid-cols-3 gap-2 text-sm text-cream-400">
      <div>👤 {task.assignee}</div>
      {task.deadline && <div>📅 {task.deadline}</div>}
      {task.estimatedHours && <div>⏱️ {task.estimatedHours} ساعات</div>}
    </div>
  </div>
);

/**
 * بطاقة المخاطر
 */
const RiskCard: React.FC<{ risk: ConversationAnalysis['risks'][0] }> = ({ risk }) => (
  <div className={`p-4 border rounded-lg ${
    risk.severity === 'حرج' ? 'bg-red-500/10 border-red-500/30' :
    risk.severity === 'تحذير' ? 'bg-orange-500/10 border-orange-500/30' :
    'bg-yellow-500/10 border-yellow-500/30'
  }`}>
    <div className="flex items-start gap-2">
      <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
        risk.severity === 'حرج' ? 'text-red-400' :
        risk.severity === 'تحذير' ? 'text-orange-400' :
        'text-yellow-400'
      }`} />
      <div>
        <h4 className="font-semibold text-cream-100">{risk.message}</h4>
        <div className="text-sm text-cream-400 mt-1">
          <span className="font-semibold">{risk.type}</span> • {risk.severity}
        </div>
      </div>
    </div>
  </div>
);

/**
 * بطاقة الإحصائيات
 */
const StatCard: React.FC<{
  icon: React.FC<any>;
  label: string;
  value: number;
  color?: 'gold' | 'orange' | 'green';
}> = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colorClasses = {
    gold: 'text-gold-400 bg-gold-400/10 border-gold-400/30',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    green: 'text-green-400 bg-green-400/10 border-green-400/30',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]} bg-midnight-900/50`}>
      <Icon className="w-6 h-6 mb-2" />
      <div className="text-3xl font-bold text-cream-100 mb-1">{value}</div>
      <div className="text-sm text-cream-400">{label}</div>
    </div>
  );
};

/**
 * شارة الحالة
 */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
    status === 'منعقدة' ? 'bg-green-500/20 text-green-300' :
    status === 'مجدولة' ? 'bg-blue-500/20 text-blue-300' :
    'bg-red-500/20 text-red-300'
  }`}>
    {status}
  </span>
);

/**
 * الوسم
 */
const Tag: React.FC<{
  icon: React.FC<any>;
  label: string;
  color?: 'blue' | 'purple' | 'red' | 'green';
}> = ({ icon: Icon, label, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  return (
    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm border ${colorClasses[color]}`}>
      <Icon className="w-4 h-4" />
      {label}
    </div>
  );
};

/**
 * أزرار إجراءات الاجتماع
 */
const MeetingActions: React.FC<{ meeting: Meeting }> = ({ meeting }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-gold-400/20 rounded-lg transition"
      >
        <MessageSquare className="w-5 h-5 text-gold-400" />
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-midnight-900 border border-gold-400/30 rounded-lg shadow-lg z-10">
          <button className="w-full text-right px-4 py-2 hover:bg-gold-400/20 transition flex items-center gap-2">
            <Download className="w-4 h-4" />
            تنزيل المحضر
          </button>
          <button className="w-full text-right px-4 py-2 hover:bg-gold-400/20 transition flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            مشاركة
          </button>
          <button className="w-full text-right px-4 py-2 hover:bg-gold-404/20 transition flex items-center gap-2">
            <Settings className="w-4 h-4" />
            تحرير
          </button>
        </div>
      )}
    </div>
  );
};

export default MeetingDashboard;
