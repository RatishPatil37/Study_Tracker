/**
 * StudyOS Date & Timezone Utilities
 * Pure functions strictly adhering to Asia/Kolkata (IST, UTC+05:30)
 * Eliminates UTC day truncation and off-by-one errors.
 */

export const IST_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MINUTES = 330; // UTC+5:30 = 330 minutes

/**
 * Returns today's date in IST formatted as YYYY-MM-DD
 */
export function getTodayIST(refDate: Date = new Date()): string {
  return formatToISTDateString(refDate);
}

/**
 * Formats a JavaScript Date object into an IST YYYY-MM-DD string
 */
export function formatToISTDateString(date: Date): string {
  // Use Intl.DateTimeFormat to reliably resolve Asia/Kolkata date components
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Parses YYYY-MM-DD into a Date instance pinned to midnight IST (00:00:00.000 IST)
 */
export function parseISTDate(dateString: string): Date {
  const parts = dateString.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid IST date string: "${dateString}". Expected format YYYY-MM-DD.`);
  }
  const [year, month, day] = parts;
  // Midnight IST is year-month-dayT00:00:00+05:30
  // Month is 1-indexed in string, 0-indexed in Date constructor UTC representation
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  // Subtract 330 minutes to pin UTC timestamp to 00:00:00.000 IST
  return new Date(utcDate.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
}

/**
 * Adds integer days to an IST YYYY-MM-DD string and returns a new YYYY-MM-DD string
 */
export function addDaysIST(dateString: string, days: number): string {
  const date = parseISTDate(dateString);
  const nextDate = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return formatToISTDateString(nextDate);
}

/**
 * Returns the difference in calendar days between two IST date strings (b - a)
 */
export function diffDaysIST(startDateString: string, endDateString: string): number {
  const a = parseISTDate(startDateString);
  const b = parseISTDate(endDateString);
  const diffMs = b.getTime() - a.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Returns day of week for an IST date: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function getDayOfWeekIST(dateString: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    weekday: "narrow",
  });
  // Or extract standard weekday from parsed IST date
  const date = parseISTDate(dateString);
  // Get day in IST timezone
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
  });
  const weekdayShort = istFormatter.format(date);
  switch (weekdayShort) {
    case "Sun": return 0;
    case "Mon": return 1;
    case "Tue": return 2;
    case "Wed": return 3;
    case "Thu": return 4;
    case "Fri": return 5;
    case "Sat": return 6;
    default: return date.getUTCDay();
  }
}

/**
 * True if Saturday (6) or Sunday (0)
 */
export function isWeekendIST(dateString: string): boolean {
  const day = getDayOfWeekIST(dateString);
  return day === 0 || day === 6;
}

/**
 * Generates an inclusive array of YYYY-MM-DD dates from startDate to endDate
 */
export function generateDateRangeIST(startDate: string, endDate: string): string[] {
  const count = diffDaysIST(startDate, endDate);
  if (count < 0) {
    return [];
  }
  const dates: string[] = [];
  let current = startDate;
  for (let i = 0; i <= count; i++) {
    dates.push(current);
    current = addDaysIST(current, 1);
  }
  return dates;
}

/**
 * Formats a local date string for display (e.g. "Wed, 21 Oct 2026")
 */
export function formatDisplayDateIST(dateString: string): string {
  const date = parseISTDate(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
