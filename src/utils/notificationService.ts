import { Loan, EMI, UserSettings } from '../types';

const NOTIF_LOG_KEY = 'emi_tracker_notification_log';

type NotificationType =
  | 'reminder_7d'
  | 'reminder_3d'
  | 'reminder_1d'
  | 'reminder_due'
  | 'overdue_daily';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getNotifLog(): Set<string> {
  try {
    const raw = localStorage.getItem(NIF_LOG_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

const NIF_LOG_KEY = NOTIF_LOG_KEY;

function saveNotifLog(log: Set<string>): void {
  try {
    localStorage.setItem(NIF_LOG_KEY, JSON.stringify([...log]));
  } catch {}
}

function hasNotified(log: Set<string>, emiId: string, type: NotificationType, date: string): boolean {
  return log.has(`${emiId}:${type}:${date}`);
}

function markNotified(log: Set<string>, emiId: string, type: NotificationType, date: string): void {
  log.add(`${emiId}:${type}:${date}`);
}

function calendarDaysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / (1000 * 60 * 60 * 24));
}

function parseDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0].split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function getNotifTitle(type: NotificationType, loan: Loan, days: number): string {
  switch (type) {
    case 'reminder_7d':
      return `EMI due in 7 days — ${loan.loanName}`;
    case 'reminder_3d':
      return `EMI due in 3 days — ${loan.loanName}`;
    case 'reminder_1d':
      return `EMI due tomorrow — ${loan.loanName}`;
    case 'reminder_due':
      return `EMI due today — ${loan.loanName}`;
    case 'overdue_daily':
      return `EMI overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} — ${loan.loanName}`;
  }
}

function getNotifBody(type: NotificationType, emi: EMI, days: number): string {
  const amount = `₹${emi.amount.toLocaleString('en-IN')}`;
  switch (type) {
    case 'reminder_7d':
      return `${amount} is due in 7 days. Plan your payment ahead of time.`;
    case 'reminder_3d':
      return `${amount} is due in 3 days. Make sure funds are ready.`;
    case 'reminder_1d':
      return `${amount} is due tomorrow. Don't forget to pay.`;
    case 'reminder_due':
      return `${amount} is due today. Pay now to stay on track.`;
    case 'overdue_daily':
      return `${amount} is ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue. Pay as soon as possible to avoid penalties.`;
  }
}

async function sendNotification(title: string, body: string): Promise<void> {
  const options: NotificationOptions = {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: title,
    requireInteraction: false,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch {}

  try {
    new Notification(title, options);
  } catch {}
}

export async function checkAndNotify(): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  let settings: UserSettings;
  try {
    const raw = localStorage.getItem('emi_tracker_settings');
    if (!raw) return;
    settings = JSON.parse(raw);
  } catch {
    return;
  }

  if (!settings.notificationSettings.enabled) return;

  let loans: Loan[];
  let emis: EMI[];
  try {
    const loansRaw = localStorage.getItem('emi_tracker_loans');
    const emisRaw = localStorage.getItem('emi_tracker_emis');
    if (!loansRaw || !emisRaw) return;
    loans = JSON.parse(loansRaw);
    emis = JSON.parse(emisRaw);
  } catch {
    return;
  }

  const activeLoans = loans.filter(l => l.status === 'active');
  const activeEmis = emis.filter(e => {
    if (e.status === 'Paid' || e.status === 'Skipped') return false;
    const loan = activeLoans.find(l => l.id === e.loanId);
    return !!loan;
  });

  if (activeEmis.length === 0) return;

  const today = new Date();
  const todayStr = todayKey();
  const log = getNotifLog();
  const settings_ = settings.notificationSettings;

  const notifications: Promise<void>[] = [];

  for (const emi of activeEmis) {
    const loan = activeLoans.find(l => l.id === emi.loanId)!;
    const emiDate = parseDate(emi.dueDate);
    const daysUntil = calendarDaysBetween(today, emiDate);

    if (daysUntil === 7 && settings_.reminder7Days && !hasNotified(log, emi.id, 'reminder_7d', todayStr)) {
      markNotified(log, emi.id, 'reminder_7d', todayStr);
      notifications.push(sendNotification(getNotifTitle('reminder_7d', loan, daysUntil), getNotifBody('reminder_7d', emi, daysUntil)));
    }

    if (daysUntil === 3 && settings_.reminder3Days && !hasNotified(log, emi.id, 'reminder_3d', todayStr)) {
      markNotified(log, emi.id, 'reminder_3d', todayStr);
      notifications.push(sendNotification(getNotifTitle('reminder_3d', loan, daysUntil), getNotifBody('reminder_3d', emi, daysUntil)));
    }

    if (daysUntil === 1 && settings_.reminder1Day && !hasNotified(log, emi.id, 'reminder_1d', todayStr)) {
      markNotified(log, emi.id, 'reminder_1d', todayStr);
      notifications.push(sendNotification(getNotifTitle('reminder_1d', loan, daysUntil), getNotifBody('reminder_1d', emi, daysUntil)));
    }

    if (daysUntil === 0 && settings_.reminderOnDueDate && !hasNotified(log, emi.id, 'reminder_due', todayStr)) {
      markNotified(log, emi.id, 'reminder_due', todayStr);
      notifications.push(sendNotification(getNotifTitle('reminder_due', loan, daysUntil), getNotifBody('reminder_due', emi, daysUntil)));
    }

    if (daysUntil < 0 && settings_.dailyOverdueReminder && !hasNotified(log, emi.id, 'overdue_daily', todayStr)) {
      markNotified(log, emi.id, 'overdue_daily', todayStr);
      notifications.push(sendNotification(getNotifTitle('overdue_daily', loan, daysUntil), getNotifBody('overdue_daily', emi, daysUntil)));
    }
  }

  if (notifications.length > 0) {
    await Promise.allSettled(notifications);
    saveNotifLog(log);
  }
}
