let _currency = '₹';

export function setCurrency(currency: string) {
  _currency = currency;
}

export function getCurrency(): string {
  return _currency;
}

export function formatCurrency(amount: number, currency?: string): string {
  const sym = currency || _currency;
  return `${sym}${amount.toLocaleString('en-IN')}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(date: string | Date, format: string = 'DD/MM/YYYY'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  } else if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  } else if (format === 'YYYY-MM-DD') {
    return `${year}-${month}-${day}`;
  }

  return `${day}/${month}/${year}`;
}

export function getDaysUntil(date: string): number {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
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
