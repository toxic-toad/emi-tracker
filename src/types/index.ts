export type LoanType = 'Home' | 'Personal' | 'Credit Card' | 'Vehicle' | 'Education' | 'Gold' | 'BNPL' | 'Other';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Skipped';
export type LoanStatus = 'active' | 'archived' | 'completed';

export interface Loan {
  id: string;
  userId: string;
  loanName: string;
  lenderName: string;
  loanType: LoanType;
  currentOutstanding: number;
  originalLoanAmount: number;
  emiAmount: number;
  interestRate: number;
  processingFee: number;
  emisRemaining: number;
  totalEmis: number;
  dueDate: number;
  nextEMIDate: string;
  loanStartDate: string;
  loanEndDate: string;
  accountNumber?: string;
  notes?: string;
  colorTag: string;
  loanIcon: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EMI {
  id: string;
  loanId: string;
  userId: string;
  month: string;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
  lateFee?: number;
  paymentDate?: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  userId: string;
  currency: string;
  dateFormat: string;
  notificationSettings: {
    reminder7Days: boolean;
    reminder3Days: boolean;
    reminder1Day: boolean;
    reminderOnDueDate: boolean;
    dailyOverdueReminder: boolean;
  };
  darkMode: boolean;
  monthlySalary?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentHistory {
  id: string;
  loanId: string;
  userId: string;
  emiId: string;
  amount: number;
  paymentDate: string;
  transactionId?: string;
  notes?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'reminder' | 'overdue' | 'paid' | 'insight';
  loanId?: string;
  emiId?: string;
  read: boolean;
  createdAt: string;
}

export interface FinancialHealth {
  score: number;
  debtToIncomeRatio: number;
  totalDebt: number;
  totalMonthlyEMI: number;
  paymentStreak: number;
  onTimePaymentRate: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  suggestions: string[];
}

export interface AIInsight {
  id: string;
  type: 'upcoming' | 'highest_emi' | 'highest_interest' | 'closest_completion' | 'completion_savings' | 'debt_reduction' | 'debt_free_month' | 'payoff_strategy';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
  loanId?: string;
}

export interface DashboardSummary {
  totalOutstanding: number;
  totalMonthlyEMI: number;
  totalLoans: number;
  nextEMIAmount: number;
  nextEMIDate: string | null;
  nextEMILoanName: string;
  dueToday: number;
  dueThisWeek: number;
  overdueAmount: number;
  debtFreeDate: string | null;
  paidThisMonth: number;
  remainingEMIs: number;
  averageEMI: number;
  debtReductionPercent: number;
}
