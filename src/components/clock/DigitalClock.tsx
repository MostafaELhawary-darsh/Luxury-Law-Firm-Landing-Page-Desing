import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Settings } from 'lucide-react';
import TimeZoneCard from './TimeZoneCard';
import AddTimeZoneModal from './AddTimeZoneModal';
import type { TimeZone, ClockSettings } from '@/lib/clockTypes';

const DEFAULT_TIMEZONES: TimeZone[] = [
  { id: '1', name: 'London', timezone: 'Europe/London', offset: 0 },
  { id: '2', name: 'New York', timezone: 'America/New_York', offset: -300 },
  { id: '3', name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 540 },
  { id: '4', name: 'Sydney', timezone: 'Australia/Sydney', offset: 600 },
];

const DigitalClock: React.FC = () => {
  const [timeZones, setTimeZones] = useState<TimeZone[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settings, setSettings] = useState<ClockSettings>({
    format24h: true,
    showSeconds: true,
    showDate: true,
    isDarkMode: true,
  });

  // Initialize from localStorage
  useEffect(() => {
    const savedTimeZones = localStorage.getItem('timeZones');
    const savedSettings = localStorage.getItem('clockSettings');

    if (savedTimeZones) {
      setTimeZones(JSON.parse(savedTimeZones));
    } else {
      setTimeZones(DEFAULT_TIMEZONES);
    }

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save to localStorage when timeZones change
  useEffect(() => {
    localStorage.setItem('timeZones', JSON.stringify(timeZones));
  }, [timeZones]);

  // Save to localStorage when settings change
  useEffect(() => {
    localStorage.setItem('clockSettings', JSON.stringify(settings));
  }, [settings]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAddTimeZone = (timeZone: TimeZone) => {
    setTimeZones([...timeZones, { ...timeZone, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const handleRemoveTimeZone = (id: string) => {
    setTimeZones(timeZones.filter((tz) => tz.id !== id));
  };

  const handleUpdateTimeZone = (id: string, updatedTimeZone: TimeZone) => {
    setTimeZones(
      timeZones.map((tz) => (tz.id === id ? updatedTimeZone : tz))
    );
  };

  const toggleDarkMode = () => {
    setSettings({ ...settings, isDarkMode: !settings.isDarkMode });
  };

  const toggleFormat = () => {
    setSettings({ ...settings, format24h: !settings.format24h });
  };

  const toggleSeconds = () => {
    setSettings({ ...settings, showSeconds: !settings.showSeconds });
  };

  const toggleDate = () => {
    setSettings({ ...settings, showDate: !settings.showDate });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        settings.isDarkMode
          ? 'bg-slate-900 text-white'
          : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-slate-900'
      }`}
    >
      {/* Header */}
      <header
        className={`${
          settings.isDarkMode ? 'bg-slate-800' : 'bg-white/80 backdrop-blur'
        } shadow-lg border-b ${
          settings.isDarkMode
            ? 'border-slate-700'
            : 'border-indigo-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500 rounded-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold">World Clock</h1>
            </div>

            {/* Settings Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFormat}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  settings.isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600'
                    : 'bg-white hover:bg-indigo-50'
                } border ${
                  settings.isDarkMode
                    ? 'border-slate-600'
                    : 'border-indigo-200'
                }`}
                title="Toggle 12/24 hour format"
              >
                {settings.format24h ? '24H' : '12H'}
              </button>

              <button
                onClick={toggleSeconds}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  settings.isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600'
                    : 'bg-white hover:bg-indigo-50'
                } border ${
                  settings.isDarkMode
                    ? 'border-slate-600'
                    : 'border-indigo-200'
                }`}
                title="Toggle seconds display"
              >
                {settings.showSeconds ? 'Show Sec' : 'Hide Sec'}
              </button>

              <button
                onClick={toggleDate}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  settings.isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600'
                    : 'bg-white hover:bg-indigo-50'
                } border ${
                  settings.isDarkMode
                    ? 'border-slate-600'
                    : 'border-indigo-200'
                }`}
                title="Toggle date display"
              >
                {settings.showDate ? 'Show Date' : 'Hide Date'}
              </button>

              <button
                onClick={toggleDarkMode}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  settings.isDarkMode
                    ? 'bg-slate-700 hover:bg-slate-600'
                    : 'bg-white hover:bg-indigo-50'
                } border ${
                  settings.isDarkMode
                    ? 'border-slate-600'
                    : 'border-indigo-200'
                }`}
                title="Toggle dark mode"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Add TimeZone Button */}
        <div className="mb-8 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Time Zones ({timeZones.length})</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Time Zone
          </button>
        </div>

        {/* TimeZone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {timeZones.map((timeZone) => (
            <TimeZoneCard
              key={timeZone.id}
              timeZone={timeZone}
              currentTime={currentTime}
              settings={settings}
              onRemove={() => handleRemoveTimeZone(timeZone.id)}
              onUpdate={(updated) =>
                handleUpdateTimeZone(timeZone.id, updated)
              }
              isDarkMode={settings.isDarkMode}
            />
          ))}
        </div>

        {/* Empty State */}
        {timeZones.length === 0 && (
          <div
            className={`text-center py-16 rounded-lg border-2 border-dashed ${
              settings.isDarkMode
                ? 'border-slate-700 bg-slate-800/50'
                : 'border-indigo-200 bg-indigo-50'
            }`}
          >
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg opacity-75 mb-4">No time zones added yet</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Add Your First Time Zone
            </button>
          </div>
        )}
      </main>

      {/* Add TimeZone Modal */}
      <AddTimeZoneModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddTimeZone}
        isDarkMode={settings.isDarkMode}
      />
    </div>
  );
};

export default DigitalClock;
