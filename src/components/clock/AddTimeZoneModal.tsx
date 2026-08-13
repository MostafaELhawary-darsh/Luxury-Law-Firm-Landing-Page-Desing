import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { TIMEZONES } from '@/lib/timezoneDatabase';
import type { TimeZone } from '@/lib/clockTypes';

interface AddTimeZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (timeZone: TimeZone) => void;
  isDarkMode: boolean;
}

const AddTimeZoneModal: React.FC<AddTimeZoneModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  isDarkMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [customName, setCustomName] = useState('');

  const filteredTimezones = TIMEZONES.filter(
    (tz) =>
      tz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tz.timezone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (selectedTimezone && customName.trim()) {
      const selected = TIMEZONES.find((tz) => tz.timezone === selectedTimezone);
      if (selected) {
        onAdd({
          id: '',
          name: customName.trim(),
          timezone: selectedTimezone,
          offset: selected.offset,
        });
        setSearchQuery('');
        setSelectedTimezone('');
        setCustomName('');
      }
    }
  };

  const handleSelectTimezone = (timezone: string) => {
    setSelectedTimezone(timezone);
    const selected = TIMEZONES.find((tz) => tz.timezone === timezone);
    if (selected && !customName) {
      setCustomName(selected.name);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 z-50">
        <div
          className={`rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b ${
              isDarkMode ? 'border-slate-700' : 'border-indigo-200'
            }`}
          >
            <h2 className="text-xl font-bold">Add Time Zone</h2>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                  : 'hover:bg-indigo-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-semibold mb-2">Search Time Zone</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by city or timezone..."
                  className={`w-full pl-9 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-indigo-50 border-indigo-300 text-slate-900 placeholder-slate-500'
                  }`}
                />
              </div>
            </div>

            {/* Timezone List */}
            <div>
              <label className="block text-sm font-semibold mb-2">Select Time Zone</label>
              <div
                className={`max-h-64 overflow-y-auto rounded-lg border ${
                  isDarkMode
                    ? 'border-slate-600 bg-slate-700/50'
                    : 'border-indigo-200 bg-indigo-50/50'
                }`}
              >
                {filteredTimezones.length > 0 ? (
                  filteredTimezones.map((tz) => (
                    <button
                      key={tz.timezone}
                      onClick={() => handleSelectTimezone(tz.timezone)}
                      className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${
                        selectedTimezone === tz.timezone
                          ? isDarkMode
                            ? 'bg-indigo-600/50 text-white'
                            : 'bg-indigo-300/50 text-slate-900'
                          : isDarkMode
                          ? 'hover:bg-slate-600/50 text-slate-300'
                          : 'hover:bg-indigo-100/50 text-slate-700'
                      } ${
                        isDarkMode ? 'border-slate-600' : 'border-indigo-200'
                      }`}
                    >
                      <div className="font-semibold">{tz.name}</div>
                      <div className="text-xs opacity-75 font-mono">{tz.timezone}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center opacity-50">
                    No time zones found
                  </div>
                )}
              </div>
            </div>

            {/* Custom Name Input */}
            <div>
              <label className="block text-sm font-semibold mb-2">Display Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., My Office, Home, etc."
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                    : 'bg-indigo-50 border-indigo-300 text-slate-900 placeholder-slate-500'
                }`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t" + (isDarkMode ? ' border-slate-700' : ' border-indigo-200')>
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedTimezone || !customName.trim()}
              className="flex-1 px-4 py-2 rounded-lg font-semibold bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            >
              Add Time Zone
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTimeZoneModal;
