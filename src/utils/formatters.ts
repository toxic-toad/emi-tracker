export function formatCurrency(amount: number, currency: string = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN')}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
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
