import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CreditCard, CheckCircle } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate, getDaysUntil } from '../utils/formatters';
import { EMI, PaymentStatus } from '../types';

export function Calendar() {
  const { loans, emis, markEMIPaid, loading } = useLoans();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmiId, setSelectedEmiId] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const liveSelectedEMI = useMemo(() => {
    if (!selectedEmiId) return null;
    return emis.find(e => e.id === selectedEmiId) || null;
  }, [selectedEmiId, emis]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-96 animate-pulse" />
      </div>
    );
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEMIForDate = (day: number): EMI | null => {
    return emis.find(emi => {
      const emiDate = new Date(emi.dueDate);
      return emiDate.getDate() === day &&
             emiDate.getMonth() === month &&
             emiDate.getFullYear() === year;
    }) || null;
  };

  const getStatusColor = (status: PaymentStatus): string => {
    switch (status) {
      case 'Paid': return 'bg-green-500';
      case 'Pending': return 'bg-yellow-500';
      case 'Overdue': return 'bg-red-500';
      case 'Skipped': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  const handleConfirmPayment = async () => {
    if (!liveSelectedEMI) return;
    await markEMIPaid(liveSelectedEMI.id, liveSelectedEMI.loanId);
    setConfirmingPayment(false);
    setPaymentSuccess(true);
    setTimeout(() => setPaymentSuccess(false), 2000);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
      </div>

      <Card gradient>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-6">
            <Button onClick={prevMonth} size="sm" variant="ghost">
              <ChevronLeft size={20} />
            </Button>
            <h2 className="text-xl font-semibold text-white">
              {monthNames[month]} {year}
            </h2>
            <Button onClick={nextMonth} size="sm" variant="ghost">
              <ChevronRight size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const emi = getEMIForDate(day);
                const today = isToday(day);

                return (
                    <motion.button
                      key={day}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { emi && setSelectedEmiId(emi.id); setPaymentSuccess(false); }}
                      className={cn(
                      'aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs',
                      'border border-slate-700/50 bg-slate-800/30',
                      today && 'ring-2 ring-blue-500',
                      emi ? 'cursor-pointer hover:bg-slate-700/50' : 'cursor-default'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      today ? 'text-blue-400' : 'text-slate-300'
                    )}>
                      {day}
                    </span>
                    {emi && (
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-0.5', getStatusColor(emi.status))} />
                    )}
                  </motion.button>
                );
              })}
          </div>

          <div className="flex gap-4 mt-6 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-slate-400">Paid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-slate-400">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-slate-400">Overdue</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EMI Detail Modal */}
      <Modal
        isOpen={!!selectedEmiId}
        onClose={() => { setSelectedEmiId(null); setConfirmingPayment(false); setPaymentSuccess(false); }}
        title="EMI Details"
      >
        {liveSelectedEMI && (() => {
          const loan = loans.find(l => l.id === liveSelectedEMI.loanId);
          const daysUntil = getDaysUntil(liveSelectedEMI.dueDate);
          const loanEmis = emis.filter(e => e.loanId === liveSelectedEMI.loanId);
          const paidCount = loanEmis.filter(e => e.status === 'Paid').length;
          const totalCount = loanEmis.length;
          const isPaid = liveSelectedEMI.status === 'Paid';

          return (
            <div className="space-y-4">
              {paymentSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-500/30 rounded-xl"
                >
                  <CheckCircle size={20} className="text-green-400" />
                  <span className="text-green-400 font-medium">Payment recorded successfully!</span>
                </motion.div>
              )}

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <CreditCard size={20} className="text-slate-400" />
                <div>
                  <p className="font-medium text-white">{loan?.loanName || 'Unknown Loan'}</p>
                  <p className="text-sm text-slate-400">{loan?.lenderName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">EMI Amount</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(liveSelectedEMI.amount)}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Current Status</p>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium inline-block mt-1',
                    isPaid && 'bg-green-500/20 text-green-400',
                    liveSelectedEMI.status === 'Pending' && 'bg-yellow-500/20 text-yellow-400',
                    liveSelectedEMI.status === 'Overdue' && 'bg-red-500/20 text-red-400',
                    liveSelectedEMI.status === 'Skipped' && 'bg-slate-500/20 text-slate-400'
                  )}>
                    {isPaid ? '✓ Paid' : liveSelectedEMI.status}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Due Date</p>
                  <p className="text-sm font-semibold text-white">{formatDate(liveSelectedEMI.dueDate)}</p>
                  {!isPaid && daysUntil >= 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Payment Date</p>
                  <p className={cn('text-sm font-semibold', isPaid ? 'text-green-400' : 'text-slate-500')}>
                    {liveSelectedEMI.paymentDate ? formatDate(liveSelectedEMI.paymentDate) : '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Remaining EMIs</p>
                  <p className="text-lg font-bold text-white">{loan?.emisRemaining ?? '—'}</p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Outstanding Balance</p>
                  <p className="text-lg font-bold text-white">
                    {loan ? formatCurrency(loan.currentOutstanding) : '—'}
                  </p>
                </div>
              </div>

              {loan && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Progress</p>
                  <p className="text-sm text-slate-300">{paidCount} / {totalCount} EMIs Paid</p>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalCount > 0 ? (paidCount / totalCount) * 100 : 0}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                    />
                  </div>
                </div>
              )}

              {liveSelectedEMI.notes && (
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-white">{liveSelectedEMI.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => { setSelectedEmiId(null); setConfirmingPayment(false); setPaymentSuccess(false); }} className="flex-1">
                  Cancel
                </Button>
                {isPaid ? (
                  <Button variant="secondary" disabled className="flex-1" icon={<CheckCircle size={16} />}>
                    ✓ EMI Already Paid
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmingPayment(true)} className="flex-1" icon={<CheckCircle size={16} />}>
                    Mark EMI as Paid
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Payment Confirmation Modal */}
      <Modal
        isOpen={confirmingPayment}
        onClose={() => setConfirmingPayment(false)}
        title="Confirm Payment"
      >
        <div className="space-y-4">
          <p className="text-slate-300 text-center text-lg">
            Have you successfully paid this EMI?
          </p>
          <p className="text-slate-400 text-center text-sm">
            {liveSelectedEMI && (
              <>{formatCurrency(liveSelectedEMI.amount)} for {loans.find(l => l.id === liveSelectedEMI.loanId)?.loanName}</>
            )}
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConfirmingPayment(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} className="flex-1">
              Yes, Mark Paid
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
