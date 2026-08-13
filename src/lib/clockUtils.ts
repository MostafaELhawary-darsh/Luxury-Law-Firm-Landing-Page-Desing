/**
 * Utility functions for digital clock
 */

/**
 * Format time for a specific timezone
 */
export function formatTimeInTimeZone(
  date: Date,
  timezone: string,
  format24h: boolean,
  showSeconds: boolean
): string {
  try {
    const timeString = date.toLocaleString('en-US', {
      timeZone: timezone,
      hour12: !format24h,
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
    });

    if (format24h) {
      // Convert 12h format from toLocaleString to 24h
      const parts = timeString.split(/[:,\s]/);;
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const seconds = showSeconds ? parts[2] : '';
      const period = parts[showSeconds ? 3 : 2]?.toUpperCase();

      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      const formatted = `${String(hours).padStart(2, '0')}:${minutes}${
        showSeconds ? `:${seconds}` : ''
      }`;
      return formatted;
    }

    return timeString;
  } catch (error) {
    console.error(`Error formatting time for timezone ${timezone}:`, error);
    return '00:00' + (showSeconds ? ':00' : '');
  }
}

/**
 * Get UTC offset for a timezone (in minutes)
 */
export function getTimeZoneOffset(timezone: string): number {
  try {
    // Create a date in the target timezone
    const date = new Date();
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // Calculate offset in minutes
    const offset = (utcDate.getTime() - tzDate.getTime()) / 60000;
    return -offset;
  } catch (error) {
    console.error(`Error getting offset for timezone ${timezone}:`, error);
    return 0;
  }
}

/**
 * Get all available timezones
 */
export function getAvailableTimezones(): string[] {
  return Intl.DateTimeFormat.supportedLocalesOf(
    Intl.DateTimeFormat().resolvedOptions().locale
  ).length > 0
    ? []
    : [];
}

/**
 * Convert time between timezones
 */
export function convertTimeToTimeZone(date: Date, timezone: string): Date {
  try {
    const tzString = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(tzString);
  } catch (error) {
    console.error(`Error converting time to timezone ${timezone}:`, error);
    return new Date();
  }
}

/**
 * Check if a timezone string is valid
 */
export function isValidTimeZone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}
