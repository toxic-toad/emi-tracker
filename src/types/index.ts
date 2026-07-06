export type LoanType = 'Home' | 'Personal' | 'Credit Card' | 'Vehicle' | 'Education' | 'Gold' | 'BNPL' | 'Other';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Skipped';

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
  emisRemaining: number;
  totalEmis: number;
  dueDate: number; // day of month (1-31)
  loanStartDate: string; // ISO date string
  loanEndDate: string; // ISO date string
  accountNumber?: string;
  notes?: string;
  colorTag: string;
  loanIcon: string;
  createdAt: string;
  updatedAt: string;
}

export interface EMI {
  id: string;
  loanId: string;
  userId: string;
  month: string; // ISO date string for the month
  dueDate: string; // ISO date string
  amount: number;
  status: PaymentStatus;
  lateFee?: number;
  paymentDate?: string; // ISO date string
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
