export function safeParseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const d = new Date(dateStr);
  return d;
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toISODate(date: Date): string {
  return toLocalDateString(date);
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  return new Date(dateStr);
}

export function getDay(dateStr: string): number {
  return parseLocalDate(dateStr).getDate();
}

export function getMonth(dateStr: string): number {
  return parseLocalDate(dateStr).getMonth();
}

export function getYear(dateStr: string): number {
  return parseLocalDate(dateStr).getFullYear();
}

export function addEMIMonths(baseDate: Date, intendedDay: number, monthOffset: number): Date {
  const result = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
  const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(intendedDay, maxDay));
  return result;
}

export function generateScheduleDates(
  startDate: string,
  dueDay: number,
  totalEmis: number
): Date[] {
  const base = parseLocalDate(startDate);
  const dates: Date[] = [];
  for (let i = 0; i < totalEmis; i++) {
    dates.push(addEMIMonths(base, dueDay, i));
  }
  return dates;
}

export function getEMIScheduleFromNext(
  nextEMIDate: string,
  intendedDay: number,
  remainingEmis: number
): Date[] {
  const base = parseLocalDate(nextEMIDate);
  const dates: Date[] = [];
  for (let i = 0; i < remainingEmis; i++) {
    dates.push(addEMIMonths(base, intendedDay, i));
  }
  return dates;
}

export function datesEqual(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function dateKey(date: Date): string {
  return toLocalDateString(date);
}

export function dateKeyFromStr(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return dateKey(d);
}

export function isSameMonthYear(dateStr: string, refDate: Date): boolean {
  const d = parseLocalDate(dateStr);
  return d.getMonth() === refDate.getMonth() && d.getFullYear() === refDate.getFullYear();
}

export function isBeforeMonthYear(dateStr: string, refDate: Date): boolean {
  const d = parseLocalDate(dateStr);
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  return d.getFullYear() < refYear || (d.getFullYear() === refYear && d.getMonth() < refMonth);
}

export function isAfterMonthYear(dateStr: string, refDate: Date): boolean {
  const d = parseLocalDate(dateStr);
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  return d.getFullYear() > refYear || (d.getFullYear() === refYear && d.getMonth() > refMonth);
}
