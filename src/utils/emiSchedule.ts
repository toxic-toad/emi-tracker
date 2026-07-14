import { Loan, EMI } from '../types';
import { addEMIMonths, parseLocalDate, dateKey, toISODate } from './dateHelpers';

export function getLoanOutstanding(loan: Loan): number {
  return Math.max(0, loan.emiAmount * loan.emisRemaining);
}

export function getLoanPaidEMIs(loan: Loan): number {
  return Math.max(0, Math.min(loan.totalEmis, loan.totalEmis - loan.emisRemaining));
}

export function getLoanCompletionPercent(loan: Loan): number {
  if (loan.totalEmis <= 0) return 0;
  return (getLoanPaidEMIs(loan) / loan.totalEmis) * 100;
}

export function generateEMISchedule(
  nextEMIDate: string,
  intendedDay: number,
  remainingEmis: number
): { date: Date; dateStr: string; monthOffset: number }[] {
  const base = parseLocalDate(nextEMIDate);
  const schedule: { date: Date; dateStr: string; monthOffset: number }[] = [];
  for (let i = 0; i < remainingEmis; i++) {
    const d = addEMIMonths(base, intendedDay, i);
    schedule.push({ date: d, dateStr: toISODate(d), monthOffset: i });
  }
  return schedule;
}

export function getLastEMIDate(loan: Loan): Date | null {
  if (!loan.nextEMIDate || loan.emisRemaining <= 0) return null;
  const schedule = generateEMISchedule(loan.nextEMIDate, loan.dueDate, loan.emisRemaining);
  return schedule.length > 0 ? schedule[schedule.length - 1].date : null;
}

export function getEffectiveDay(loan: Loan): number {
  if (loan.nextEMIDate) {
    return parseLocalDate(loan.nextEMIDate).getDate();
  }
  return loan.dueDate || 1;
}

export function getExactEMIRecord(loanId: string, scheduledDate: Date, emis: EMI[]): EMI | undefined {
  const scheduledKey = dateKey(scheduledDate);
  return emis.find(e => {
    if (e.loanId !== loanId) return false;
    return dateKey(parseLocalDate(e.dueDate)) === scheduledKey;
  });
}

export function resolveCalendarEMIStatus(
  scheduledDate: Date,
  exactEmiRecord: EMI | undefined,
  today: Date
): 'paid' | 'pending' | 'future' {
  if (exactEmiRecord?.status === 'Paid') {
    return 'paid';
  }

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const scheduledMidnight = new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate());

  if (scheduledMidnight < todayMidnight) {
    return 'pending';
  }

  if (scheduledDate.getFullYear() === today.getFullYear() &&
      scheduledDate.getMonth() === today.getMonth()) {
    return 'pending';
  }

  return 'future';
}

export function groupEMIsByDate(
  emis: EMI[],
  loans: Loan[]
): Map<string, EMI[]> {
  const groups = new Map<string, EMI[]>();

  for (const emi of emis) {
    const loan = loans.find(l => l.id === emi.loanId);
    if (!loan) continue;

    let key: string;
    if (loan.nextEMIDate && emi.status !== 'Paid') {
      const schedule = generateEMISchedule(loan.nextEMIDate, loan.dueDate, loan.emisRemaining + (loan.totalEmis - loan.emisRemaining));
      const matchingEntry = schedule.find(s => {
        const sMonth = s.date.getMonth();
        const sYear = s.date.getFullYear();
        const emiParsed = parseLocalDate(emi.dueDate);
        return sMonth === emiParsed.getMonth() && sYear === emiParsed.getFullYear();
      });
      key = matchingEntry ? dateKey(matchingEntry.date) : dateKey(parseLocalDate(emi.dueDate));
    } else {
      key = dateKey(parseLocalDate(emi.dueDate));
    }

    const existing = groups.get(key) || [];
    existing.push(emi);
    groups.set(key, existing);
  }

  return groups;
}

export function buildCalendarEMIMap(
  loans: Loan[],
  emis: EMI[]
): Map<string, { emi: EMI; displayStatus: 'paid' | 'pending' | 'future' }[]> {
  const result = new Map<string, { emi: EMI; displayStatus: 'paid' | 'pending' | 'future' }[]>();
  const today = new Date();

  for (const loan of loans) {
    if (loan.emisRemaining <= 0 && loan.status !== 'active') continue;

    const intendedDay = getEffectiveDay(loan);
    const startDate = parseLocalDate(loan.loanStartDate);

    for (let i = 0; i < loan.totalEmis; i++) {
      const scheduleDate = addEMIMonths(startDate, intendedDay, i);
      const key = dateKey(scheduleDate);

      const existingEmi = getExactEMIRecord(loan.id, scheduleDate, emis);
      const resolvedStatus = resolveCalendarEMIStatus(scheduleDate, existingEmi, today);

      const emiRecord: EMI = existingEmi || {
        id: `${loan.id}_cal_${i}`,
        loanId: loan.id,
        userId: loan.userId,
        month: toISODate(new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), 1)),
        dueDate: toISODate(scheduleDate),
        amount: loan.emiAmount,
        status: resolvedStatus === 'paid' ? 'Paid' : 'Pending',
        lateFee: 0,
        notes: '',
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
      };

      const existing = result.get(key) || [];
      if (!existing.find(e => e.emi.loanId === loan.id && e.emi.id === emiRecord.id)) {
        existing.push({ emi: emiRecord, displayStatus: resolvedStatus });
        result.set(key, existing);
      }
    }
  }

  return result;
}
