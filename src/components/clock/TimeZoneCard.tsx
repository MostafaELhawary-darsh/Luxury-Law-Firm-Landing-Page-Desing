import React, { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import { formatTimeInTimeZone, getTimeZoneOffset } from '@/lib/clockUtils';
import type { TimeZone, ClockSettings } from '@/lib/clockTypes';

interface TimeZoneCardProps {
  timeZone: TimeZone;
  currentTime: Date;
  settings: ClockSettings;
  onRemove: () => void;
  onUpdate: (timeZone: TimeZone) => void;
  isDarkMode: boolean;
}

const TimeZoneCard: React.FC<TimeZoneCardProps> = ({
  timeZone,
  currentTime,
  settings,
  onRemove,
  onUpdate,
  isDarkMode,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(timeZone.name);

  const formattedTime = formatTimeInTimeZone(
    currentTime,
    timeZone.timezone,
    settings.format24h,
    settings.showSeconds
  );

  const date = new Date(currentTime.toLocaleString('en-US', { timeZone: timeZone.timezone }));
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const offset = getTimeZoneOffset(timeZone.timezone);
  const offsetSign = offset >= 0 ? '+' : '';
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetString = `UTC${offsetSign}${offsetHours}:${String(offsetMinutes).padStart(2, '0')}`;

  const handleSaveEdit = () => {
    if (editedName.trim()) {
      onUpdate({ ...timeZone, name: editedName.trim() });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(timeZone.name);
    setIsEditing(false);
  };

  return (
    <div
      className={`rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600'
          : 'bg-gradient-to-br from-white to-indigo-50 border border-indigo-200'
      }`}
    >
      {/* Card Header */}
      <div
        className={`px-6 py-4 border-b ${
          isDarkMode ? 'border-slate-600 bg-slate-700/50' : 'border-indigo-200 bg-indigo-100/30'
        }`}
      >
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className={`flex-1 px-3 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? 'bg-slate-600 border-slate-500 text-white'
                    : 'bg-white border-indigo-300 text-slate-900'
                }`}
                autoFocus
              />
              <button
                onClick={handleSaveEdit}
                className="text-green-500 hover:text-green-400 transition-colors"
                title="Save"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-red-500 hover:text-red-400 transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold">{timeZone.name}</h3>
              <button
                onClick={() => setIsEditing(true)}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-600 text-slate-400 hover:text-slate-200'
                    : 'hover:bg-indigo-200 text-slate-600 hover:text-slate-900'
                }`}
                title="Edit name"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-6 py-6">
        {/* Time Display */}
        <div className="mb-6">
          <p className="text-5xl font-bold font-mono tracking-tight mb-2">
            {formattedTime}
          </p>
          {settings.showDate && (
            <p
              className={`text-sm opacity-75 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {formattedDate}
            </p>
          )}
        </div>

        {/* Timezone Info */}
        <div
          className={`mb-4 px-3 py-2 rounded-lg text-sm font-mono ${
            isDarkMode ? 'bg-slate-600/50 text-slate-300' : 'bg-indigo-100/50 text-slate-700'
          }`}
        >
          <div className="flex justify-between items-center">
            <span>{timeZone.timezone}</span>
            <span className="font-semibold text-indigo-500">{offsetString}</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div
        className={`px-6 py-3 border-t ${
          isDarkMode ? 'border-slate-600 bg-slate-700/30' : 'border-indigo-200 bg-indigo-50/30'
        }`}
      >
        <button
          onClick={onRemove}
          className="flex items-center gap-2 w-full justify-center py-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Remove this timezone"
        >
          <Trash2 className="w-4 h-4" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
};

export default TimeZoneCard;
