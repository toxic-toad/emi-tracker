import { Loan, EMI, FinancialHealth } from '../types';

export function calculateCompletionPercentage(loan: Loan): number {
  if (loan.totalEmis === 0) return 0;
  const completed = loan.totalEmis - loan.emisRemaining;
  return (completed / loan.totalEmis) * 100;
}

export function calculateRemainingInterest(loan: Loan): number {
  const remainingInterest = loan.emisRemaining * loan.emiAmount - loan.currentOutstanding;
  return Math.max(0, remainingInterest);
}

export function calculateDebtFreeDate(loan: Loan): Date {
  const endDate = new Date(loan.loanEndDate);
  return endDate;
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
    .map(loan => {
      const nextDate = new Date();
      nextDate.setDate(loan.dueDate);
      if (nextDate < today) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      return nextDate;
    })
    .filter(date => date >= today)
    .sort((a, b) => a.getTime() - b.getTime());
  
  return upcomingDates[0] || null;
}

export function calculateOverdueAmount(emis: EMI[]): number {
  return emis
    .filter(emi => emi.status === 'Overdue')
    .reduce((sum, emi) => sum + emi.amount + (emi.lateFee || 0), 0);
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

export function calculateFinancialHealth(
  loans: Loan[],
  emis: EMI[],
  monthlySalary?: number
): FinancialHealth {
  const totalDebt = calculateTotalOutstanding(loans);
  const totalMonthlyEMI = calculateTotalMonthlyEMI(loans);
  
  // Calculate on-time payment rate
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
  
  // Calculate payment streak
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
  
  // Calculate debt-to-income ratio
  const debtToIncomeRatio = monthlySalary && monthlySalary > 0
    ? (totalMonthlyEMI / monthlySalary) * 100
    : 0;
  
  // Calculate health score (0-100)
  let score = 100;
  score -= (debtToIncomeRatio > 50 ? 30 : debtToIncomeRatio > 30 ? 15 : 0);
  score -= (100 - onTimePaymentRate) * 0.3;
  score -= (totalDebt > 1000000 ? 10 : totalDebt > 500000 ? 5 : 0);
  score = Math.max(0, Math.min(100, score));
  
  // Determine risk level
  const riskLevel: 'Low' | 'Medium' | 'High' =
    score >= 70 ? 'Low' : score >= 40 ? 'Medium' : 'High';
  
  // Generate suggestions
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
  
  const completedLoans = loans.filter(l => l.emisRemaining === 0);
  if (completedLoans.length > 0) {
    const savings = completedLoans.reduce((sum, l) => sum + l.emiAmount, 0);
    suggestions.push(`You've saved ₹${savings.toLocaleString()}/month by completing ${completedLoans.length} loan(s).`);
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

export function generateMonthlyEMIs(loan: Loan): EMI[] {
  const emis: EMI[] = [];
  const startDate = new Date(loan.loanStartDate);
  const endDate = new Date(loan.loanEndDate);
  
  let currentDate = new Date(startDate);
  currentDate.setDate(loan.dueDate);
  
  let emiCount = 0;
  while (emiCount < loan.totalEmis && currentDate <= endDate) {
    const dueDate = new Date(currentDate);
    const month = dueDate.toISOString().slice(0, 7); // YYYY-MM
    
    emis.push({
      id: `${loan.id}-${emiCount}`,
      loanId: loan.id,
      userId: loan.userId,
      month,
      dueDate: dueDate.toISOString(),
      amount: loan.emiAmount,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    currentDate.setMonth(currentDate.getMonth() + 1);
    emiCount++;
  }
  
  return emis;
}
