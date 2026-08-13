/**
 * Comprehensive timezone database with major cities and UTC offsets
 */

export interface TimeZoneInfo {
  name: string;
  timezone: string;
  offset: number; // minutes from UTC
  country: string;
  region: string;
}

export const TIMEZONES: TimeZoneInfo[] = [
  // Europe
  { name: 'London', timezone: 'Europe/London', offset: 0, country: 'UK', region: 'Europe' },
  { name: 'Paris', timezone: 'Europe/Paris', offset: 60, country: 'France', region: 'Europe' },
  { name: 'Berlin', timezone: 'Europe/Berlin', offset: 60, country: 'Germany', region: 'Europe' },
  { name: 'Rome', timezone: 'Europe/Rome', offset: 60, country: 'Italy', region: 'Europe' },
  { name: 'Madrid', timezone: 'Europe/Madrid', offset: 60, country: 'Spain', region: 'Europe' },
  { name: 'Amsterdam', timezone: 'Europe/Amsterdam', offset: 60, country: 'Netherlands', region: 'Europe' },
  { name: 'Brussels', timezone: 'Europe/Brussels', offset: 60, country: 'Belgium', region: 'Europe' },
  { name: 'Vienna', timezone: 'Europe/Vienna', offset: 60, country: 'Austria', region: 'Europe' },
  { name: 'Prague', timezone: 'Europe/Prague', offset: 60, country: 'Czech Republic', region: 'Europe' },
  { name: 'Budapest', timezone: 'Europe/Budapest', offset: 60, country: 'Hungary', region: 'Europe' },
  { name: 'Warsaw', timezone: 'Europe/Warsaw', offset: 60, country: 'Poland', region: 'Europe' },
  { name: 'Moscow', timezone: 'Europe/Moscow', offset: 180, country: 'Russia', region: 'Europe' },
  { name: 'Istanbul', timezone: 'Europe/Istanbul', offset: 180, country: 'Turkey', region: 'Europe' },
  { name: 'Athens', timezone: 'Europe/Athens', offset: 120, country: 'Greece', region: 'Europe' },
  { name: 'Dublin', timezone: 'Europe/Dublin', offset: 0, country: 'Ireland', region: 'Europe' },
  { name: 'Lisbon', timezone: 'Europe/Lisbon', offset: 0, country: 'Portugal', region: 'Europe' },
  { name: 'Stockholm', timezone: 'Europe/Stockholm', offset: 60, country: 'Sweden', region: 'Europe' },
  { name: 'Oslo', timezone: 'Europe/Oslo', offset: 60, country: 'Norway', region: 'Europe' },
  { name: 'Copenhagen', timezone: 'Europe/Copenhagen', offset: 60, country: 'Denmark', region: 'Europe' },
  { name: 'Zurich', timezone: 'Europe/Zurich', offset: 60, country: 'Switzerland', region: 'Europe' },

  // Asia
  { name: 'Tokyo', timezone: 'Asia/Tokyo', offset: 540, country: 'Japan', region: 'Asia' },
  { name: 'Bangkok', timezone: 'Asia/Bangkok', offset: 420, country: 'Thailand', region: 'Asia' },
  { name: 'Hong Kong', timezone: 'Asia/Hong_Kong', offset: 480, country: 'Hong Kong', region: 'Asia' },
  { name: 'Shanghai', timezone: 'Asia/Shanghai', offset: 480, country: 'China', region: 'Asia' },
  { name: 'Singapore', timezone: 'Asia/Singapore', offset: 480, country: 'Singapore', region: 'Asia' },
  { name: 'Dubai', timezone: 'Asia/Dubai', offset: 240, country: 'UAE', region: 'Asia' },
  { name: 'Bangkok', timezone: 'Asia/Bangkok', offset: 420, country: 'Thailand', region: 'Asia' },
  { name: 'Jakarta', timezone: 'Asia/Jakarta', offset: 420, country: 'Indonesia', region: 'Asia' },
  { name: 'Manila', timezone: 'Asia/Manila', offset: 480, country: 'Philippines', region: 'Asia' },
  { name: 'Seoul', timezone: 'Asia/Seoul', offset: 540, country: 'South Korea', region: 'Asia' },
  { name: 'Delhi', timezone: 'Asia/Kolkata', offset: 330, country: 'India', region: 'Asia' },
  { name: 'Mumbai', timezone: 'Asia/Kolkata', offset: 330, country: 'India', region: 'Asia' },
  { name: 'Karachi', timezone: 'Asia/Karachi', offset: 300, country: 'Pakistan', region: 'Asia' },
  { name: 'Bangkok', timezone: 'Asia/Bangkok', offset: 420, country: 'Thailand', region: 'Asia' },
  { name: 'Hanoi', timezone: 'Asia/Ho_Chi_Minh', offset: 420, country: 'Vietnam', region: 'Asia' },
  { name: 'Kuala Lumpur', timezone: 'Asia/Kuala_Lumpur', offset: 480, country: 'Malaysia', region: 'Asia' },
  { name: 'Tehran', timezone: 'Asia/Tehran', offset: 210, country: 'Iran', region: 'Asia' },
  { name: 'Jerusalem', timezone: 'Asia/Jerusalem', offset: 120, country: 'Israel', region: 'Asia' },

  // Americas - North
  { name: 'New York', timezone: 'America/New_York', offset: -300, country: 'USA', region: 'North America' },
  { name: 'Los Angeles', timezone: 'America/Los_Angeles', offset: -480, country: 'USA', region: 'North America' },
  { name: 'Chicago', timezone: 'America/Chicago', offset: -360, country: 'USA', region: 'North America' },
  { name: 'Denver', timezone: 'America/Denver', offset: -420, country: 'USA', region: 'North America' },
  { name: 'Anchorage', timezone: 'America/Anchorage', offset: -540, country: 'USA', region: 'North America' },
  { name: 'Honolulu', timezone: 'Pacific/Honolulu', offset: -600, country: 'USA', region: 'North America' },
  { name: 'Toronto', timezone: 'America/Toronto', offset: -300, country: 'Canada', region: 'North America' },
  { name: 'Vancouver', timezone: 'America/Vancouver', offset: -480, country: 'Canada', region: 'North America' },
  { name: 'Mexico City', timezone: 'America/Mexico_City', offset: -360, country: 'Mexico', region: 'North America' },

  // Americas - South
  { name: 'São Paulo', timezone: 'America/Sao_Paulo', offset: -180, country: 'Brazil', region: 'South America' },
  { name: 'Buenos Aires', timezone: 'America/Argentina/Buenos_Aires', offset: -180, country: 'Argentina', region: 'South America' },
  { name: 'Lima', timezone: 'America/Lima', offset: -300, country: 'Peru', region: 'South America' },
  { name: 'Bogotá', timezone: 'America/Bogota', offset: -300, country: 'Colombia', region: 'South America' },
  { name: 'Santiago', timezone: 'America/Santiago', offset: -180, country: 'Chile', region: 'South America' },
  { name: 'Caracas', timezone: 'America/Caracas', offset: -240, country: 'Venezuela', region: 'South America' },

  // Africa
  { name: 'Cairo', timezone: 'Africa/Cairo', offset: 120, country: 'Egypt', region: 'Africa' },
  { name: 'Lagos', timezone: 'Africa/Lagos', offset: 60, country: 'Nigeria', region: 'Africa' },
  { name: 'Johannesburg', timezone: 'Africa/Johannesburg', offset: 120, country: 'South Africa', region: 'Africa' },
  { name: 'Nairobi', timezone: 'Africa/Nairobi', offset: 180, country: 'Kenya', region: 'Africa' },
  { name: 'Casablanca', timezone: 'Africa/Casablanca', offset: 0, country: 'Morocco', region: 'Africa' },
  { name: 'Algiers', timezone: 'Africa/Algiers', offset: 60, country: 'Algeria', region: 'Africa' },
  { name: 'Tunis', timezone: 'Africa/Tunis', offset: 60, country: 'Tunisia', region: 'Africa' },

  // Oceania
  { name: 'Sydney', timezone: 'Australia/Sydney', offset: 600, country: 'Australia', region: 'Oceania' },
  { name: 'Melbourne', timezone: 'Australia/Melbourne', offset: 600, country: 'Australia', region: 'Oceania' },
  { name: 'Brisbane', timezone: 'Australia/Brisbane', offset: 600, country: 'Australia', region: 'Oceania' },
  { name: 'Perth', timezone: 'Australia/Perth', offset: 480, country: 'Australia', region: 'Oceania' },
  { name: 'Auckland', timezone: 'Pacific/Auckland', offset: 720, country: 'New Zealand', region: 'Oceania' },
  { name: 'Fiji', timezone: 'Pacific/Fiji', offset: 720, country: 'Fiji', region: 'Oceania' },
];

/**
 * Get timezone by name (city)
 */
export function getTimeZoneByName(name: string): TimeZoneInfo | undefined {
  return TIMEZONES.find(
    (tz) => tz.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get timezones by region
 */
export function getTimeZonesByRegion(region: string): TimeZoneInfo[] {
  return TIMEZONES.filter((tz) => tz.region === region);
}

/**
 * Get all unique regions
 */
export function getAllRegions(): string[] {
  return Array.from(new Set(TIMEZONES.map((tz) => tz.region)));
}
