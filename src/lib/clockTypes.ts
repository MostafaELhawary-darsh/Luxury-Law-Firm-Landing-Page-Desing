export interface TimeZone {
  id: string;
  name: string;
  timezone: string;
  offset: number; // minutes from UTC
}

export interface ClockSettings {
  format24h: boolean;
  showSeconds: boolean;
  showDate: boolean;
  isDarkMode: boolean;
}

export interface ClockState {
  timeZones: TimeZone[];
  currentTime: Date;
  settings: ClockSettings;
}
