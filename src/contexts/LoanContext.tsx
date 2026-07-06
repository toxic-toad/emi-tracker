import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Loan, EMI, PaymentHistory } from '../types';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { addMonths } from 'date-fns';

interface LoanContextType {
  loans: Loan[];
  emis: EMI[];
  paymentHistory: PaymentHistory[];
  loading: boolean;
  error: string | null;
  addLoan: (loan: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLoan: (id: string, loan: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  duplicateLoan: (id: string) => Promise<void>;
  archiveLoan: (id: string) => Promise<void>;
  markEMIPaid: (emiId: string, loanId: string) => Promise<void>;
  updateEMI: (emiId: string, data: Partial<EMI>) => Promise<void>;
  deleteEMI: (emiId: string, loanId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LOANS: 'emi_tracker_loans',
  EMIS: 'emi_tracker_emis',
  PAYMENT_HISTORY: 'emi_tracker_payment_history'
};

function getLocalData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function LoanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [emis, setEmis] = useState<EMI[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribers = useRef<(() => void)[]>([]);

  const userId = user?.uid || 'local';

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (isFirebaseConfigured() && userId !== 'local') {
      try {
        const loansQuery = query(
          collection(db!, 'loans'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const unsubLoans = onSnapshot(loansQuery,
          (snapshot) => {
            const loanData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                loanStartDate: data.loanStartDate?.toDate?.()?.toISOString() || data.loanStartDate,
                loanEndDate: data.loanEndDate?.toDate?.()?.toISOString() || data.loanEndDate,
                nextEMIDate: data.nextEMIDate?.toDate?.()?.toISOString() || data.nextEMIDate,
              } as Loan;
            });
            setLoans(loanData);
            setLoading(false);
          },
          (err) => {
            console.error('Loans snapshot error:', err);
            setError('Failed to load loans from Firestore');
            setLoading(false);
          }
        );
        unsubscribers.current.push(unsubLoans);

        const emisQuery = query(
          collection(db!, 'emis'),
          where('userId', '==', userId),
          orderBy('dueDate', 'asc')
        );

        const unsubEmis = onSnapshot(emisQuery,
          (snapshot) => {
            const emiData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                dueDate: data.dueDate?.toDate?.()?.toISOString() || data.dueDate,
                paymentDate: data.paymentDate?.toDate?.()?.toISOString() || data.paymentDate,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
              } as EMI;
            });
            setEmis(emiData);
            setLoading(false);
          },
          (err) => {
            console.error('EMIs snapshot error:', err);
            setError('Failed to load EMIs from Firestore');
            setLoading(false);
          }
        );
        unsubscribers.current.push(unsubEmis);

        return () => {
          unsubscribers.current.forEach(unsub => unsub());
          unsubscribers.current = [];
        };
      } catch (err) {
        console.error('Firestore init error:', err);
        setError('Failed to initialize Firestore');
        setLoading(false);
      }
    }

    const storedLoans = getLocalData<Loan>(STORAGE_KEYS.LOANS);
    const storedEmis = getLocalData<EMI>(STORAGE_KEYS.EMIS);
    const storedPaymentHistory = getLocalData<PaymentHistory>(STORAGE_KEYS.PAYMENT_HISTORY);
    setLoans(storedLoans);
    setEmis(storedEmis);
    setPaymentHistory(storedPaymentHistory);
    setLoading(false);
  }, [userId]);

  const addLoan = useCallback(async (loan: Omit<Loan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const newLoan: Loan = {
      ...loan,
      id: generateId(),
      userId,
      status: loan.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newEmis: EMI[] = [];
    const startDate = new Date(loan.loanStartDate);
    for (let i = 0; i < loan.totalEmis; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(loan.dueDate);

      const monthDate = new Date(dueDate);
      monthDate.setDate(1);

      newEmis.push({
        id: `${newLoan.id}_${i}`,
        loanId: newLoan.id,
        userId,
        month: monthDate.toISOString(),
        amount: loan.emiAmount,
        dueDate: dueDate.toISOString(),
        status: 'Pending',
        lateFee: 0,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (isFirebaseConfigured() && userId !== 'local') {
      try {
        const batch = writeBatch(db!);
        const loanRef = doc(collection(db!, 'loans'));
        batch.set(loanRef, {
          ...newLoan,
          id: loanRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          loanStartDate: Timestamp.fromDate(new Date(loan.loanStartDate)),
          loanEndDate: Timestamp.fromDate(new Date(loan.loanEndDate)),
          nextEMIDate: loan.nextEMIDate ? Timestamp.fromDate(new Date(loan.nextEMIDate)) : null,
        });

        for (const emi of newEmis) {
          const emiRef = doc(collection(db!, 'emis'));
          batch.set(emiRef, {
            ...emi,
            id: emiRef.id,
            dueDate: Timestamp.fromDate(new Date(emi.dueDate)),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        await batch.commit();
        toast.success('Loan added successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to add loan');
        throw err;
      }
    } else {
      setLoans(prev => {
        const updated = [...prev, { ...newLoan, id: newLoan.id }];
        setLocalData(STORAGE_KEYS.LOANS, updated);
        return updated;
      });
      setEmis(prev => {
        const updated = [...prev, ...newEmis];
        setLocalData(STORAGE_KEYS.EMIS, updated);
        return updated;
      });
      toast.success('Loan added successfully');
    }
  }, [userId]);

  const updateLoan = useCallback(async (id: string, loanData: Partial<Loan>) => {
    const updated = { ...loanData, updatedAt: new Date().toISOString() };

    if (isFirebaseConfigured() && userId !== 'local') {
      try {
        const loanRef = doc(db!, 'loans', id);
        const firestoreData: any = { ...updated };
        if (updated.loanStartDate) firestoreData.loanStartDate = Timestamp.fromDate(new Date(updated.loanStartDate));
        if (updated.loanEndDate) firestoreData.loanEndDate = Timestamp.fromDate(new Date(updated.loanEndDate));
        if (updated.nextEMIDate) firestoreData.nextEMIDate = Timestamp.fromDate(new Date(updated.nextEMIDate));
        await updateDoc(loanRef, firestoreData);
        toast.success('Loan updated successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to update loan');
        throw err;
      }
    } else {
      setLoans(prev => {
        const updatedLoans = prev.map(l => l.id === id ? { ...l, ...updated } : l);
        setLocalData(STORAGE_KEYS.LOANS, updatedLoans);
        return updatedLoans;
      });
      toast.success('Loan updated successfully');
    }
  }, [userId]);

  const deleteLoan = useCallback(async (id: string) => {
    if (isFirebaseConfigured() && userId !== 'local') {
      try {
        const batch = writeBatch(db!);
        batch.delete(doc(db!, 'loans', id));

        const emisSnapshot = await getDocs(query(collection(db!, 'emis'), where('loanId', '==', id)));
        emisSnapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();

        toast.success('Loan deleted successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete loan');
        throw err;
      }
    } else {
      setLoans(prev => {
        const updated = prev.filter(l => l.id !== id);
        setLocalData(STORAGE_KEYS.LOANS, updated);
        return updated;
      });
      setEmis(prev => {
        const updated = prev.filter(e => e.loanId !== id);
        setLocalData(STORAGE_KEYS.EMIS, updated);
        return updated;
      });
      toast.success('Loan deleted successfully');
    }
  }, [userId]);

  const duplicateLoan = useCallback(async (id: string) => {
    const loan = loans.find(l => l.id === id);
    if (!loan) {
      toast.error('Loan not found');
      return;
    }
    const { id: _id, userId: _uid, createdAt: _c, updatedAt: _u, ...rest } = loan;
    await addLoan({
      ...rest,
      loanName: `${rest.loanName} (Copy)`,
    });
    toast.success('Loan duplicated successfully');
  }, [loans, addLoan]);

  const archiveLoan = useCallback(async (id: string) => {
    await updateLoan(id, { status: 'archived' });
  }, [updateLoan]);

  const markEMIPaid = useCallback(async (emiId: string, loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) {
      toast.error('Loan not found');
      return;
    }

    const now = new Date().toISOString();

    if (isFirebaseConfigured() && userId !== 'local') {
      try {
        const batch = writeBatch(db!);

        const emisQuery = query(collection(db!, 'emis'), where('loanId', '==', loanId));
        const emisSnapshot = await getDocs(emisQuery);
        emisSnapshot.docs.forEach(d => {
          const data = d.data();
          if (d.id === emiId || data.id === emiId) {
            batch.update(d.ref, {
              status: 'Paid',
              paymentDate: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        });

        const newRemaining = loan.emisRemaining - 1;
        const nextDate = newRemaining > 0
          ? Timestamp.fromDate(addMonths(new Date(loan.nextEMIDate || loan.loanStartDate), 1))
          : null;
        const loanUpdate: Record<string, any> = {
          emisRemaining: Math.max(0, newRemaining),
          currentOutstanding: Math.max(0, loan.currentOutstanding - loan.emiAmount),
          updatedAt: serverTimestamp()
        };
        if (nextDate) {
          loanUpdate.nextEMIDate = nextDate;
        }
        if (newRemaining <= 0) {
          loanUpdate.status = 'completed';
        }
        batch.update(doc(db!, 'loans', loanId), loanUpdate);

        await batch.commit();
        toast.success('EMI marked as paid');
      } catch (err: any) {
        toast.error(err.message || 'Failed to mark EMI as paid');
      }
    } else {
      const newRemaining = loan.emisRemaining - 1;

      setEmis(prev => {
        const updated = prev.map(e =>
          e.id === emiId
            ? { ...e, status: 'Paid' as const, paymentDate: now, updatedAt: now, lateFee: 0 }
            : e
        );
        setLocalData(STORAGE_KEYS.EMIS, updated);
        return updated;
      });

      setLoans(prev => {
        const newOutstanding = Math.max(0, loan.currentOutstanding - loan.emiAmount);
        const nextDate = newRemaining > 0
          ? addMonths(new Date(loan.nextEMIDate || loan.loanStartDate), 1).toISOString()
          : undefined;
        const updated = prev.map(l =>
          l.id === loanId
            ? {
                ...l,
                emisRemaining: Math.max(0, newRemaining),
                currentOutstanding: newOutstanding,
                nextEMIDate: nextDate || l.nextEMIDate,
                ...(newRemaining <= 0 ? { status: 'completed' as const } : {}),
                updatedAt: now
              }
            : l
        );
        setLocalData(STORAGE_KEYS.LOANS, updated);
        return updated;
      });

      setPaymentHistory(prev => {
        const record: PaymentHistory = {
          id: generateId(),
          loanId,
          userId,
          emiId,
          amount: loan.emiAmount,
          paymentDate: now,
          createdAt: now
        };
        const updated = [record, ...prev];
        setLocalData(STORAGE_KEYS.PAYMENT_HISTORY, updated);
        return updated;
      });

      toast.success('EMI marked as paid');
    }
  }, [loans, emis, userId]);

  const updateEMI = useCallback(async (emiId: string, data: Partial<EMI>) => {
    if (isFirebaseConfigured() && userId !== 'local') {
      try {
        const emisQuery = query(collection(db!, 'emis'), where('loanId', '==', data.loanId));
        const emisSnapshot = await getDocs(emisQuery);
        emisSnapshot.docs.forEach(d => {
          const dData = d.data();
          if (d.id === emiId || dData.id === emiId) {
            updateDoc(d.ref, { ...data, updatedAt: serverTimestamp() });
          }
        });
      } catch (err: any) {
        toast.error(err.message || 'Failed to update EMI');
      }
    } else {
      setEmis(prev => {
        const updated = prev.map(e => e.id === emiId ? { ...e, ...data, updatedAt: new Date().toISOString() } : e);
        setLocalData(STORAGE_KEYS.EMIS, updated);
        return updated;
      });
    }
  }, [userId]);

  const deleteEMI = useCallback(async (emiId: string, loanId: string) => {
    if (isFirebaseConfigured() && userId !== 'local') {
      try {
        const emisQuery = query(collection(db!, 'emis'), where('loanId', '==', loanId));
        const emisSnapshot = await getDocs(emisQuery);
        emisSnapshot.docs.forEach(d => {
          const dData = d.data();
          if (d.id === emiId || dData.id === emiId) {
            deleteDoc(d.ref);
          }
        });
        toast.success('EMI deleted');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete EMI');
      }
    } else {
      setEmis(prev => {
        const updated = prev.filter(e => e.id !== emiId);
        setLocalData(STORAGE_KEYS.EMIS, updated);
        return updated;
      });
      toast.success('EMI deleted');
    }
  }, [userId]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    if (isFirebaseConfigured() && userId !== 'local') {
      return;
    }
    const storedLoans = getLocalData<Loan>(STORAGE_KEYS.LOANS);
    const storedEmis = getLocalData<EMI>(STORAGE_KEYS.EMIS);
    const storedPaymentHistory = getLocalData<PaymentHistory>(STORAGE_KEYS.PAYMENT_HISTORY);
    setLoans(storedLoans);
    setEmis(storedEmis);
    setPaymentHistory(storedPaymentHistory);
    setLoading(false);
  }, [userId]);

  return (
    <LoanContext.Provider value={{
      loans, emis, paymentHistory, loading, error,
      addLoan, updateLoan, deleteLoan, duplicateLoan, archiveLoan,
      markEMIPaid, updateEMI, deleteEMI, refreshData
    }}>
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
