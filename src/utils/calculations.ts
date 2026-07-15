import { Loan, EMI, FinancialHealth, AIInsight, DashboardSummary } from '../types';
import { getLoanOutstanding, getLoanCompletionPercent, getLastEMIDate } from './emiSchedule';
import { parseLocalDate, toISODate, getWeekStart, getWeekEnd } from './dateHelpers';

export function calculateTotalOutstanding(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + getLoanOutstanding(loan), 0);
}

export function calculateTotalOriginalLiability(loans: Loan[]): number {
  return loans.reduce((sum, l) => sum + l.emiAmount * l.totalEmis, 0);
}

export function calculateTotalMonthlyEMI(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + loan.emiAmount, 0);
}

export function calculateCompletionPercentage(loan: Loan): number {
  return getLoanCompletionPercent(loan);
}

export function calculatePaidThisMonth(emis: EMI[]): number {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  return emis
    .filter(emi => {
      if (emi.status !== 'Paid' || !emi.paymentDate) return false;
      const pd = parseLocalDate(emi.paymentDate);
      return pd.getMonth() === currentMonth && pd.getFullYear() === currentYear;
    })
    .reduce((sum, emi) => sum + emi.amount, 0);
}

export function calculateDebtReduction(loans: Loan[]): number {
  const original = calculateTotalOriginalLiability(loans);
  const outstanding = calculateTotalOutstanding(loans);
  if (original <= 0) return 0;
  return Math.max(0, Math.min(100, ((original - outstanding) / original) * 100));
}

export function calculateEstimatedDebtFreeDate(loans: Loan[]): Date | null {
  const dates = loans
    .filter(l => l.emisRemaining > 0 && l.nextEMIDate)
    .map(l => getLastEMIDate(l))
    .filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

export function calculateDebtFreeDateForLoan(loan: Loan): Date | null {
  if (loan.emisRemaining <= 0 || !loan.nextEMIDate) return null;
  return getLastEMIDate(loan);
}

export function calculateNextEMI(loan: Loan): Date | null {
  if (!loan.nextEMIDate || loan.emisRemaining <= 0) return null;
  return parseLocalDate(loan.nextEMIDate);
}

export function calculateNextEMIDetails(loans: Loan[]): { date: Date | null; amount: number; loanName: string } {
  const active = loans.filter(l => l.emisRemaining > 0 && l.nextEMIDate);
  if (active.length === 0) return { date: null, amount: 0, loanName: '' };
  const upcoming = active
    .map(loan => ({
      date: parseLocalDate(loan.nextEMIDate!),
      amount: loan.emiAmount,
      loanName: loan.loanName,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return upcoming[0] || { date: null, amount: 0, loanName: '' };
}

export function calculateOverdueAmount(emis: EMI[]): number {
  return emis
    .filter(emi => emi.status === 'Overdue')
    .reduce((sum, emi) => sum + emi.amount + (emi.lateFee || 0), 0);
}

export function calculateDueToday(_emis: EMI[], loans: Loan[]): number {
  const todayStr = toISODate(new Date());
  return loans
    .filter(loan => loan.emisRemaining > 0 && loan.nextEMIDate === todayStr)
    .reduce((sum, loan) => sum + loan.emiAmount, 0);
}

export function calculateDueThisWeek(_emis: EMI[], loans: Loan[]): number {
  const today = new Date();
  const weekStartStr = toISODate(getWeekStart(today));
  const weekEndStr = toISODate(getWeekEnd(today));
  return loans
    .filter(loan => {
      if (loan.emisRemaining <= 0 || !loan.nextEMIDate) return false;
      return loan.nextEMIDate >= weekStartStr && loan.nextEMIDate <= weekEndStr;
    })
    .reduce((sum, loan) => sum + loan.emiAmount, 0);
}

export function calculateAverageEMI(loans: Loan[]): number {
  if (loans.length === 0) return 0;
  return loans.reduce((sum, l) => sum + l.emiAmount, 0) / loans.length;
}

export function calculateMonthlySavings(loans: Loan[]): number {
  return loans
    .filter(l => l.status === 'completed' || l.emisRemaining === 0)
    .reduce((sum, l) => sum + l.emiAmount, 0);
}

export function calculateOnTimePaymentRate(emis: EMI[]): { rate: number; hasData: boolean } {
  const paidEmis = emis.filter(e => e.status === 'Paid' && e.paymentDate);
  if (paidEmis.length === 0) return { rate: 0, hasData: false };
  const onTime = paidEmis.filter(e => {
    const paymentDate = parseLocalDate(e.paymentDate!);
    const dueDate = parseLocalDate(e.dueDate);
    return paymentDate <= dueDate;
  });
  return { rate: (onTime.length / paidEmis.length) * 100, hasData: true };
}

export function calculatePaymentStreak(emis: EMI[]): number {
  const paidWithDates = emis
    .filter(e => e.status === 'Paid' && e.paymentDate)
    .sort((a, b) => parseLocalDate(b.paymentDate!).getTime() - parseLocalDate(a.paymentDate!).getTime());

  let streak = 0;
  for (const emi of paidWithDates) {
    const paymentDate = parseLocalDate(emi.paymentDate!);
    const dueDate = parseLocalDate(emi.dueDate);
    if (paymentDate <= dueDate) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateFinancialHealth(
  loans: Loan[],
  emis: EMI[],
  monthlySalary?: number,
  averageMonthlyTradingIncome?: number
): FinancialHealth {
  const totalDebt = calculateTotalOutstanding(loans);
  const totalMonthlyEMI = calculateTotalMonthlyEMI(loans);

  const { rate: onTimeRate, hasData: hasPaymentData } = calculateOnTimePaymentRate(emis);
  const streak = calculatePaymentStreak(emis);

  const safeSalary = (monthlySalary !== undefined && Number.isFinite(monthlySalary) && monthlySalary > 0) ? monthlySalary : 0;
  const safeTradingIncome = (averageMonthlyTradingIncome !== undefined && Number.isFinite(averageMonthlyTradingIncome) && averageMonthlyTradingIncome > 0) ? averageMonthlyTradingIncome : 0;
  const estimatedTotalMonthlyIncome = safeSalary + safeTradingIncome;
  const hasAnyIncome = estimatedTotalMonthlyIncome > 0;
  const debtToIncomeRatio = hasAnyIncome ? (totalMonthlyEMI / estimatedTotalMonthlyIncome) * 100 : -1;

  let score = 50;
  if (hasPaymentData) {
    score = onTimeRate;
  }
  if (debtToIncomeRatio >= 0) {
    if (debtToIncomeRatio > 50) score -= 20;
    else if (debtToIncomeRatio > 30) score -= 10;
    else if (debtToIncomeRatio <= 20) score += 10;
  }
  if (totalDebt <= 0) score += 20;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const riskLevel: 'Low' | 'Medium' | 'High' =
    !hasPaymentData && !hasAnyIncome ? 'Low' :
    score >= 70 ? 'Low' : score >= 40 ? 'Medium' : 'High';

  const suggestions: string[] = [];
  if (!hasAnyIncome) {
    suggestions.push('Add your monthly income in Settings to calculate debt-to-income risk.');
  } else if (debtToIncomeRatio > 40) {
    suggestions.push('Your monthly EMI is high relative to your estimated monthly income. Consider debt consolidation.');
  }
  if (hasPaymentData && onTimeRate < 80) {
    suggestions.push('Improve your payment discipline to boost your credit score.');
  }
  if (totalDebt > 500000) {
    suggestions.push('Consider paying off high-interest loans first to save on interest.');
  }
  if (loans.length > 0) {
    const activeLoans = loans.filter(l => l.emisRemaining > 0);
    if (activeLoans.length > 0) {
      const highestInterestLoan = [...activeLoans].sort((a, b) => b.interestRate - a.interestRate)[0];
      if (highestInterestLoan.interestRate > 0) {
        suggestions.push(`Prioritize paying off ${highestInterestLoan.loanName} (${highestInterestLoan.interestRate}% interest) to save money.`);
      }
    }
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
    onTimePaymentRate: hasPaymentData ? onTimeRate : -1,
    riskLevel,
    suggestions
  };
}

export function generateAIInsights(loans: Loan[], emis: EMI[]): AIInsight[] {
  const insights: AIInsight[] = [];
  const activeLoans = loans.filter(l => l.status === 'active' || !l.status);
  const emisForDue = emis.filter(e => e.status !== 'Paid');
  const dueWeek = calculateDueThisWeek(emisForDue, loans);
  if (dueWeek > 0) {
    insights.push({
      id: 'due_week',
      type: 'upcoming',
      title: `₹${dueWeek.toLocaleString('en-IN')} due in next 7 days`,
      description: `You have payments due this week.`,
      severity: 'warning'
    });
  }
  if (activeLoans.length > 0) {
    const highestEMI = [...activeLoans].sort((a, b) => b.emiAmount - a.emiAmount)[0];
    insights.push({
      id: 'highest_emi',
      type: 'highest_emi',
      title: `Highest EMI: ₹${highestEMI.emiAmount.toLocaleString('en-IN')}`,
      description: `${highestEMI.loanName} has the highest monthly EMI.`,
      severity: 'info',
      loanId: highestEMI.id
    });
    const highestInterest = [...activeLoans].sort((a, b) => b.interestRate - a.interestRate)[0];
    if (highestInterest.interestRate > 0) {
      insights.push({
        id: 'highest_interest',
        type: 'highest_interest',
        title: `Highest Interest: ${highestInterest.interestRate}%`,
        description: `${highestInterest.loanName} has the highest interest rate at ${highestInterest.interestRate}%.`,
        severity: 'warning',
        loanId: highestInterest.id
      });
    }
    const closestToCompletion = [...activeLoans].sort((a, b) => a.emisRemaining - b.emisRemaining)[0];
    if (closestToCompletion.emisRemaining > 0 && closestToCompletion.emisRemaining <= 6) {
      insights.push({
        id: 'closest_completion',
        type: 'closest_completion',
        title: `Almost there: ${closestToCompletion.loanName}`,
        description: `Only ${closestToCompletion.emisRemaining} EMI(s) remaining. Pay ₹${(closestToCompletion.emisRemaining * closestToCompletion.emiAmount).toLocaleString('en-IN')} to clear it!`,
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
        title: `Saving ₹${savings.toLocaleString('en-IN')}/month`,
        description: `${completed.length} loan(s) completed, freeing up ₹${savings.toLocaleString('en-IN')} monthly.`,
        severity: 'success'
      });
    }
    const payoffStrategy = generatePayoffStrategy(activeLoans);
    if (payoffStrategy) insights.push(payoffStrategy);
  }
  const debtFreeDate = calculateEstimatedDebtFreeDate(activeLoans);
  if (debtFreeDate) {
    const now = new Date();
    const months = Math.max(0, (debtFreeDate.getFullYear() - now.getFullYear()) * 12 + debtFreeDate.getMonth() - now.getMonth());
    insights.push({
      id: 'debt_free_month',
      type: 'debt_free_month',
      title: `Debt-free by ${debtFreeDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
      description: `Approximately ${months} month${months !== 1 ? 's' : ''} until all active loans are cleared.`,
      severity: 'info'
    });
  }
  return insights;
}

function generatePayoffStrategy(loans: Loan[]): AIInsight | null {
  if (loans.length === 0) return null;
  const sorted = [...loans].sort((a, b) => {
    const aPct = a.totalEmis > 0 ? (a.totalEmis - a.emisRemaining) / a.totalEmis : 0;
    const bPct = b.totalEmis > 0 ? (b.totalEmis - b.emisRemaining) / b.totalEmis : 0;
    const aScore = a.interestRate * 0.6 + aPct * 0.3 + (1 / (a.emisRemaining || 1)) * 0.1;
    const bScore = b.interestRate * 0.6 + bPct * 0.3 + (1 / (b.emisRemaining || 1)) * 0.1;
    return bScore - aScore;
  });
  const top = sorted[0];
  const remainingCost = top.emisRemaining * top.emiAmount;
  let description = `Focus on clearing "${top.loanName}" first — it has ${top.interestRate}% interest with ${top.emisRemaining} EMIs left (₹${remainingCost.toLocaleString('en-IN')}).`;
  return {
    id: 'payoff_strategy',
    type: 'payoff_strategy',
    title: `Pay off "${top.loanName}" first`,
    description,
    severity: 'info',
    loanId: top.id
  };
}

export function generateDashboardSummary(loans: Loan[], emis: EMI[]): DashboardSummary {
  const activeLoans = loans.filter(l => l.status === 'active' || !l.status);
  const nextEMI = calculateNextEMIDetails(activeLoans);
  return {
    totalOutstanding: calculateTotalOutstanding(activeLoans),
    totalMonthlyEMI: calculateTotalMonthlyEMI(activeLoans),
    totalLoans: activeLoans.length,
    nextEMIAmount: nextEMI.amount,
    nextEMIDate: nextEMI.date?.toISOString() || null,
    nextEMILoanName: nextEMI.loanName,
    dueToday: calculateDueToday(emis, activeLoans),
    dueThisWeek: calculateDueThisWeek(emis, activeLoans),
    overdueAmount: calculateOverdueAmount(emis),
    debtFreeDate: calculateEstimatedDebtFreeDate(activeLoans)?.toISOString() || null,
    paidThisMonth: calculatePaidThisMonth(emis),
    remainingEMIs: activeLoans.reduce((sum, loan) => sum + loan.emisRemaining, 0),
    averageEMI: calculateAverageEMI(activeLoans),
    debtReductionPercent: calculateDebtReduction(activeLoans)
  };
}
