let _currency = '₹';

export function setCurrency(currency: string) {
  _currency = currency;
}

export function getCurrency(): string {
  return _currency;
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return `${_currency}0`;
  const rounded = Math.round(amount);
  return `${_currency}${rounded.toLocaleString('en-IN')}`;
}

export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}%`;
  return `${rounded.toFixed(1)}%`;
}

export function formatDate(date: string | Date, format: string = 'DD/MM/YYYY'): string {
  let d: Date;
  if (typeof date === 'string') {
    const parts = date.split('T')[0].split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

export function getDaysUntil(date: string): number {
  const parts = date.split('T')[0].split('-');
  const target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getMonthName(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('default', { month: 'long' });
}

export function getYear(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear();
}

export function getRelativeDateLabel(date: string): string {
  const days = getDaysUntil(date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `In ${days} days`;
}

export function formatRelativeDate(date: string): string {
  const days = getDaysUntil(date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return `${days}d left`;
}

export function safeNumber(value: number, fallback: number = 0): number {
  return Number.isFinite(value) ? value : fallback;
}
