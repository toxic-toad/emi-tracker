import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loan, EMI } from '../types';
import { toast } from 'react-hot-toast';

interface LoanContextType {
  loans: Loan[];
  emis: EMI[];
  loading: boolean;
  addLoan: (loan: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLoan: (id: string, loan: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  markEMIPaid: (emiId: string, loanId: string) => Promise<void>;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LOANS: 'emi_tracker_loans',
  EMIS: 'emi_tracker_emis'
};

export function LoanProvider({ children }: { children: React.ReactNode }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [emis, setEmis] = useState<EMI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data from localStorage
    const storedLoans = localStorage.getItem(STORAGE_KEYS.LOANS);
    const storedEmis = localStorage.getItem(STORAGE_KEYS.EMIS);

    if (storedLoans) {
      setLoans(JSON.parse(storedLoans));
    }
    if (storedEmis) {
      setEmis(JSON.parse(storedEmis));
    }
    setLoading(false);
  }, []);

  const saveLoans = (newLoans: Loan[]) => {
    localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(newLoans));
    setLoans(newLoans);
  };

  const saveEmis = (newEmis: EMI[]) => {
    localStorage.setItem(STORAGE_KEYS.EMIS, JSON.stringify(newEmis));
    setEmis(newEmis);
  };

  const addLoan = async (loan: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newLoan: Loan = {
        ...loan,
        id: Date.now().toString(),
        userId: 'local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedLoans = [...loans, newLoan];
      saveLoans(updatedLoans);
      
      // Generate EMIs for the loan
      const newEmis: EMI[] = [];
      const startDate = new Date(loan.loanStartDate);
      for (let i = 0; i < loan.totalEmis; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        
        const monthDate = new Date(dueDate);
        monthDate.setDate(1);
        
        newEmis.push({
          id: `${newLoan.id}_${i}`,
          loanId: newLoan.id,
          userId: 'local',
          month: monthDate.toISOString(),
          amount: loan.emiAmount,
          dueDate: dueDate.toISOString(),
          status: i === 0 ? 'Pending' : 'Pending',
          paymentDate: undefined,
          lateFee: 0,
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      const updatedEmis = [...emis, ...newEmis];
      saveEmis(updatedEmis);
      
      toast.success('Loan added successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add loan');
      throw error;
    }
  };

  const updateLoan = async (id: string, loan: Partial<Loan>) => {
    try {
      const updatedLoans = loans.map(l => 
        l.id === id ? { ...l, ...loan, updatedAt: new Date().toISOString() } : l
      );
      saveLoans(updatedLoans);
      toast.success('Loan updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update loan');
      throw error;
    }
  };

  const deleteLoan = async (id: string) => {
    try {
      const updatedLoans = loans.filter(l => l.id !== id);
      const updatedEmis = emis.filter(e => e.loanId !== id);
      
      saveLoans(updatedLoans);
      saveEmis(updatedEmis);
      
      toast.success('Loan deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete loan');
      throw error;
    }
  };

  const markEMIPaid = async (emiId: string, loanId: string) => {
    try {
      const loan = loans.find(l => l.id === loanId);
      
      if (!loan) throw new Error('Loan not found');
      
      const updatedEmis = emis.map(e => 
        e.id === emiId 
          ? { 
              ...e, 
              status: 'Paid' as const, 
              paymentDate: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            } 
          : e
      );
      
      saveEmis(updatedEmis);
      
      // Update loan
      await updateLoan(loanId, {
        emisRemaining: loan.emisRemaining - 1,
        currentOutstanding: Math.max(0, loan.currentOutstanding - loan.emiAmount)
      });
      
      toast.success('EMI marked as paid');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark EMI as paid');
      throw error;
    }
  };

  return (
    <LoanContext.Provider value={{ loans, emis, loading, addLoan, updateLoan, deleteLoan, markEMIPaid }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoans() {
  const context = useContext(LoanContext);
  if (context === undefined) {
    throw new Error('useLoans must be used within a LoanProvider');
  }
  return context;
}
