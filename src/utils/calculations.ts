import { Loan, EMI, FinancialHealth, AIInsight, DashboardSummary } from '../types';

export function calculateEMI(P: number, annualRate: number, n: number): number {
  if (annualRate === 0) return P / n;
  const r = annualRate / 12 / 100;
  const emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  totalMonths: number,
  emiAmount?: number
): { month: number; emi: number; interest: number; principal: number; balance: number }[] {
  if (totalMonths === 0) return [];
  const r = annualRate / 12 / 100;
  const emi = emiAmount || calculateEMI(principal, annualRate, totalMonths);
  const schedule: { month: number; emi: number; interest: number; principal: number; balance: number }[] = [];
  let balance = principal;

  for (let month = 1; month <= totalMonths && balance > 0; month++) {
    const interest = Math.round(balance * r);
    const principalPaid = Math.min(emi - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    schedule.push({ month, emi: Math.min(emi, principalPaid + interest), interest, principal: principalPaid, balance });
  }
  return schedule;
}

export function calculateTotalInterest(loan: Loan): number {
  const schedule = calculateAmortizationSchedule(loan.originalLoanAmount, loan.interestRate, loan.totalEmis, loan.emiAmount);
  return schedule.reduce((sum, s) => sum + s.interest, 0);
}

export function calculateRemainingInterest(loan: Loan): number {
  const totalInterest = calculateTotalInterest(loan);
  const paidMonths = loan.totalEmis - loan.emisRemaining;
  const schedule = calculateAmortizationSchedule(loan.originalLoanAmount, loan.interestRate, loan.totalEmis, loan.emiAmount);
  const paidInterest = schedule.slice(0, paidMonths).reduce((sum, s) => sum + s.interest, 0);
  return Math.max(0, totalInterest - paidInterest);
}

export function calculateCompletionPercentage(loan: Loan): number {
  if (loan.totalEmis === 0) return 0;
  const completed = loan.totalEmis - loan.emisRemaining;
  return (completed / loan.totalEmis) * 100;
}

export function calculateDebtFreeDate(loan: Loan): Date {
  return new Date(loan.loanEndDate);
}

export function calculateEstimatedDebtFreeDate(loans: Loan[]): Date | null {
  if (loans.length === 0) return null;
  const dates = loans
    .filter(l => l.emisRemaining > 0)
    .map(l => {
      const start = new Date(l.loanStartDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + l.emisRemaining);
      return end;
    });
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

export function calculateTotalOutstanding(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + loan.currentOutstanding, 0);
}

export function calculateTotalMonthlyEMI(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + loan.emiAmount, 0);
}

export function getNextEMIDate(loans: Loan[]): Date | null {
  if (loans.length === 0) return null;

  const today = new Date();
  const upcomingDates = loans
    .filter(l => l.emisRemaining > 0)
    .map(loan => {
      const nextDate = new Date();
      nextDate.setDate(loan.dueDate);
      if (nextDate <= today) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      return { date: nextDate, loan };
    })
    .filter(({ date }) => date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcomingDates[0]?.date || null;
}

export function getNextEMIDetails(loans: Loan[]): { date: Date | null; amount: number; loanName: string } {
  if (loans.length === 0) return { date: null, amount: 0, loanName: '' };

  const today = new Date();
  const upcoming = loans
    .filter(l => l.emisRemaining > 0)
    .map(loan => {
      const nextDate = new Date();
      nextDate.setDate(loan.dueDate);
      if (nextDate <= today) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      return { date: nextDate, amount: loan.emiAmount, loanName: loan.loanName, loan };
    })
    .filter(({ date }) => date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return upcoming[0] || { date: null, amount: 0, loanName: '' };
}

export function calculateOverdueAmount(emis: EMI[]): number {
  return emis
    .filter(emi => emi.status === 'Overdue')
    .reduce((sum, emi) => sum + emi.amount + (emi.lateFee || 0), 0);
}

export function calculateDueToday(emis: EMI[]): number {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  return emis
    .filter(emi => emi.status !== 'Paid' && emi.dueDate.split('T')[0] === dateStr)
    .reduce((sum, emi) => sum + emi.amount, 0);
}

export function calculateDueThisWeek(emis: EMI[]): number {
  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return emis
    .filter(emi => {
      if (emi.status === 'Paid') return false;
      const due = new Date(emi.dueDate);
      return due >= today && due <= weekEnd;
    })
    .reduce((sum, emi) => sum + emi.amount, 0);
}

export function calculatePaidThisMonth(emis: EMI[]): number {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  return emis
    .filter(emi => {
      const paymentDate = emi.paymentDate ? new Date(emi.paymentDate) : null;
      return (
        emi.status === 'Paid' &&
        paymentDate &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, emi) => sum + emi.amount, 0);
}

export function calculateAverageEMI(loans: Loan[]): number {
  if (loans.length === 0) return 0;
  return loans.reduce((sum, l) => sum + l.emiAmount, 0) / loans.length;
}

export function calculateDebtReductionPercent(loans: Loan[], emis: EMI[]): number {
  const totalOutstanding = calculateTotalOutstanding(loans);
  const paidThisMonth = calculatePaidThisMonth(emis);
  if (totalOutstanding <= 0) return 0;
  return (paidThisMonth / totalOutstanding) * 100;
}

export function calculateMonthlySavings(loans: Loan[]): number {
  return loans
    .filter(l => l.status === 'completed' || l.emisRemaining === 0)
    .reduce((sum, l) => sum + l.emiAmount, 0);
}

export function calculateFinancialHealth(
  loans: Loan[],
  emis: EMI[],
  monthlySalary?: number
): FinancialHealth {
  const totalDebt = calculateTotalOutstanding(loans);
  const totalMonthlyEMI = calculateTotalMonthlyEMI(loans);

  const paidEmis = emis.filter(e => e.status === 'Paid');
  const onTimePayments = paidEmis.filter(e => {
    if (!e.paymentDate) return false;
    const paymentDate = new Date(e.paymentDate);
    const dueDate = new Date(e.dueDate);
    return paymentDate <= dueDate;
  });
  const onTimePaymentRate = paidEmis.length > 0
    ? (onTimePayments.length / paidEmis.length) * 100
    : 100;

  const sortedEmis = [...emis]
    .filter(e => e.status === 'Paid')
    .sort((a, b) => new Date(b.paymentDate || '').getTime() - new Date(a.paymentDate || '').getTime());

  let streak = 0;
  for (const emi of sortedEmis) {
    if (emi.status === 'Paid') {
      streak++;
    } else {
      break;
    }
  }

  const debtToIncomeRatio = monthlySalary && monthlySalary > 0
    ? (totalMonthlyEMI / monthlySalary) * 100
    : 0;

  let score = 100;
  score -= (debtToIncomeRatio > 50 ? 30 : debtToIncomeRatio > 30 ? 15 : 0);
  score -= (100 - onTimePaymentRate) * 0.3;
  score -= (totalDebt > 1000000 ? 10 : totalDebt > 500000 ? 5 : 0);
  score = Math.max(0, Math.min(100, score));

  const riskLevel: 'Low' | 'Medium' | 'High' =
    score >= 70 ? 'Low' : score >= 40 ? 'Medium' : 'High';

  const suggestions: string[] = [];
  if (debtToIncomeRatio > 40) {
    suggestions.push('Your monthly EMI is high relative to your income. Consider debt consolidation.');
  }
  if (onTimePaymentRate < 80) {
    suggestions.push('Improve your payment discipline to boost your credit score.');
  }
  if (totalDebt > 500000) {
    suggestions.push('Consider paying off high-interest loans first to save on interest.');
  }
  if (loans.length > 0) {
    const highestInterestLoan = [...loans].sort((a, b) => b.interestRate - a.interestRate)[0];
    suggestions.push(`Prioritize paying off ${highestInterestLoan.loanName} (${highestInterestLoan.interestRate}% interest) to save money.`);
  }

  const completedLoans = loans.filter(l => l.status === 'completed' || l.emisRemaining === 0);
  if (completedLoans.length > 0) {
    const savings = completedLoans.reduce((sum, l) => sum + l.emiAmount, 0);
    suggestions.push(`You've saved ₹${savings.toLocaleString('en-IN')}/month by completing ${completedLoans.length} loan(s).`);
  }

  return {
    score,
    debtToIncomeRatio,
    totalDebt,
    totalMonthlyEMI,
    paymentStreak: streak,
    onTimePaymentRate,
    riskLevel,
    suggestions
  };
}

export function generateAIInsights(loans: Loan[], emis: EMI[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const activeLoans = loans.filter(l => l.status === 'active' || !l.status);

  const dueThisWeek = calculateDueThisWeek(emis);
  if (dueThisWeek > 0) {
    insights.push({
      id: 'due_week',
      type: 'upcoming',
      title: `${formatCurrency(dueThisWeek)} due in next 7 days`,
      description: `You have ${emis.filter(e => {
        if (e.status === 'Paid') return false;
        const due = new Date(e.dueDate);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        return due >= new Date() && due <= weekEnd;
      }).length} payment(s) due this week.`,
      severity: 'warning'
    });
  }

  if (activeLoans.length > 0) {
    const highestEMI = [...activeLoans].sort((a, b) => b.emiAmount - a.emiAmount)[0];
    insights.push({
      id: 'highest_emi',
      type: 'highest_emi',
      title: `Highest EMI: ${formatCurrency(highestEMI.emiAmount)}`,
      description: `${highestEMI.loanName} has the highest monthly EMI at ${formatCurrency(highestEMI.emiAmount)}.`,
      severity: 'info',
      loanId: highestEMI.id
    });

    const highestInterest = [...activeLoans].sort((a, b) => b.interestRate - a.interestRate)[0];
    insights.push({
      id: 'highest_interest',
      type: 'highest_interest',
      title: `Highest Interest: ${highestInterest.interestRate}%`,
      description: `${highestInterest.loanName} has the highest interest rate at ${highestInterest.interestRate}%. Consider prepayment.`,
      severity: 'warning',
      loanId: highestInterest.id
    });

    const closestToCompletion = [...activeLoans].sort((a, b) => a.emisRemaining - b.emisRemaining)[0];
    if (closestToCompletion.emisRemaining > 0) {
      insights.push({
        id: 'closest_completion',
        type: 'closest_completion',
        title: `Almost there: ${closestToCompletion.loanName}`,
        description: `Only ${closestToCompletion.emisRemaining} EMI(s) remaining for ${closestToCompletion.loanName}.`,
        severity: 'success',
        loanId: closestToCompletion.id
      });
    }

    const completed = loans.filter(l => l.status === 'completed' || (l.emisRemaining === 0 && l.totalEmis > 0));
    if (completed.length > 0) {
      const savings = completed.reduce((sum, l) => sum + l.emiAmount, 0);
      insights.push({
        id: 'completion_savings',
        type: 'completion_savings',
        title: `Saving ${formatCurrency(savings)}/month`,
        description: `Completing ${completed.length} loan(s) has freed up ${formatCurrency(savings)} monthly.`,
        severity: 'success'
      });
    }
  }

  const totalOutstanding = calculateTotalOutstanding(loans);
  const paidThisMonth = calculatePaidThisMonth(emis);
  if (totalOutstanding > 0) {
    const reduction = (paidThisMonth / totalOutstanding) * 100;
    insights.push({
      id: 'debt_reduction',
      type: 'debt_reduction',
      title: `Debt reduced by ${reduction.toFixed(1)}% this month`,
      description: `You've paid off ${formatCurrency(paidThisMonth)} of your total debt this month.`,
      severity: 'success'
    });
  }

  const debtFreeDate = calculateEstimatedDebtFreeDate(activeLoans);
  if (debtFreeDate) {
    const months = Math.max(0, (debtFreeDate.getFullYear() - new Date().getFullYear()) * 12 + debtFreeDate.getMonth() - new Date().getMonth());
    insights.push({
      id: 'debt_free_month',
      type: 'debt_free_month',
      title: `Debt-free by ${debtFreeDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
      description: `Approximately ${months} months until all active loans are cleared.`,
      severity: 'info'
    });
  }

  return insights;
}

export function generateDashboardSummary(loans: Loan[], emis: EMI[]): DashboardSummary {
  const activeLoans = loans.filter(l => l.status === 'active' || !l.status);
  const nextEMI = getNextEMIDetails(activeLoans);

  return {
    totalOutstanding: calculateTotalOutstanding(activeLoans),
    totalMonthlyEMI: calculateTotalMonthlyEMI(activeLoans),
    totalLoans: activeLoans.length,
    nextEMIAmount: nextEMI.amount,
    nextEMIDate: nextEMI.date?.toISOString() || null,
    nextEMILoanName: nextEMI.loanName,
    dueToday: calculateDueToday(emis),
    dueThisWeek: calculateDueThisWeek(emis),
    overdueAmount: calculateOverdueAmount(emis),
    debtFreeDate: calculateEstimatedDebtFreeDate(activeLoans)?.toISOString() || null,
    paidThisMonth: calculatePaidThisMonth(emis),
    remainingEMIs: activeLoans.reduce((sum, loan) => sum + loan.emisRemaining, 0),
    averageEMI: calculateAverageEMI(activeLoans),
    debtReductionPercent: calculateDebtReductionPercent(activeLoans, emis)
  };
}

export function generateMonthlyEMIs(loan: Loan): EMI[] {
  const emis: EMI[] = [];
  const startDate = new Date(loan.loanStartDate);
  const endDate = new Date(loan.loanEndDate);

  let currentDate = new Date(startDate);
  currentDate.setDate(loan.dueDate);

  let emiCount = 0;
  while (emiCount < loan.totalEmis && currentDate <= endDate) {
    const dueDate = new Date(currentDate);
    const month = dueDate.toISOString().slice(0, 7);

    emis.push({
      id: `${loan.id}-${emiCount}-${Date.now()}`,
      loanId: loan.id,
      userId: loan.userId,
      month,
      dueDate: dueDate.toISOString(),
      amount: loan.emiAmount,
      status: 'Pending',
      lateFee: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
    emiCount++;
  }

  return emis;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
