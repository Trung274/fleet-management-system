// Expiry dates (driver license, vehicle inspection) are valid through the END of the stored day.
// They are saved as UTC midnight of the calendar date (date inputs send YYYY-MM-DD), so read
// the date part and end that day in local time — same rule as the backend checks.

export type ExpiryStatus = 'valid' | 'expiring' | 'expired';

export function validUntilEndOfDay(isoDate: string): Date {
  const [y, m, d] = isoDate.substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/** Whole calendar days from today (0 = today, negative = in the past) */
export function daysFromToday(date: Date, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** Days left until an expiry date (0 = expires today, negative = expired) */
export function expiryDaysLeft(isoDate: string, now = new Date()): number {
  return daysFromToday(validUntilEndOfDay(isoDate), now);
}

export function expiryStatus(isoDate: string, warnDays: number, now = new Date()): ExpiryStatus {
  const days = expiryDaysLeft(isoDate, now);
  if (days < 0) return 'expired';
  if (days <= warnDays) return 'expiring';
  return 'valid';
}

/** "Còn N ngày" / "Hết hạn hôm nay" / "Đã hết hạn" */
export function expiryLabel(isoDate: string, now = new Date()): string {
  const days = expiryDaysLeft(isoDate, now);
  if (days < 0) return 'Đã hết hạn';
  if (days === 0) return 'Hết hạn hôm nay';
  return `Còn ${days} ngày`;
}
