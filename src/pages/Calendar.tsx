import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate, getDaysUntil } from '../utils/formatters';
import { parseLocalDate, toISODate, dateKey, addEMIMonths } from '../utils/dateHelpers';
import { getLoanOutstanding, getLoanPaidEMIs, getEffectiveDay } from '../utils/emiSchedule';
import { EMI } from '../types';

interface DayEMIEntry {
  emi: EMI;
  displayStatus: 'paid' | 'pending' | 'future';
}

export function Calendar() {
  const { loans, emis, markEMIPaid, loading } = useLoans();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEmis, setSelectedDayEmis] = useState<DayEMIEntry[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedEmiId, setSelectedEmiId] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const liveSelectedEMI = useMemo(() => {
    if (!selectedEmiId) return null;
    return emis.find(e => e.id === selectedEmiId) || selectedDayEmis.find(e => e.emi.id === selectedEmiId)?.emi || null;
  }, [selectedEmiId, emis, selectedDayEmis]);

  const calendarMap = useMemo(() => {
    const map = new Map<string, DayEMIEntry[]>();
    const activeLoans = loans.filter(l => l.status === 'active' || !l.status);

    for (const loan of activeLoans) {
      const paidCount = getLoanPaidEMIs(loan);
      const intendedDay = getEffectiveDay(loan);
      const startDate = parseLocalDate(loan.loanStartDate);
      const nextEMIDateParsed = loan.nextEMIDate ? parseLocalDate(loan.nextEMIDate) : null;
      const nextMonthKey = nextEMIDateParsed ? nextEMIDateParsed.getFullYear() * 12 + nextEMIDateParsed.getMonth() : -1;

      for (let i = 0; i < loan.totalEmis; i++) {
        const scheduleDate = addEMIMonths(startDate, intendedDay, i);
        const key = dateKey(scheduleDate);
        const scheduleMonthKey = scheduleDate.getFullYear() * 12 + scheduleDate.getMonth();

        const existingEmi = emis.find(e => {
          if (e.loanId !== loan.id) return false;
          return e.dueDate === toISODate(scheduleDate);
        });

        let displayStatus: 'paid' | 'pending' | 'future';
        if (existingEmi && existingEmi.status === 'Paid') {
          displayStatus = 'paid';
        } else if (nextMonthKey >= 0 && scheduleMonthKey === nextMonthKey) {
          displayStatus = 'pending';
        } else if (i < paidCount) {
          displayStatus = 'paid';
        } else {
          displayStatus = 'future';
        }

        const emiRecord: EMI = existingEmi || {
          id: `${loan.id}_cal_${i}`,
          loanId: loan.id,
          userId: loan.userId,
          month: toISODate(new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), 1)),
          dueDate: toISODate(scheduleDate),
          amount: loan.emiAmount,
          status: displayStatus === 'paid' ? 'Paid' : 'Pending',
          lateFee: 0,
          notes: '',
          createdAt: loan.createdAt,
          updatedAt: loan.updatedAt,
        };

        const existing = map.get(key) || [];
        if (!existing.find(e => e.emi.loanId === loan.id && e.emi.id === emiRecord.id)) {
          existing.push({ emi: emiRecord, displayStatus });
          map.set(key, existing);
        }
      }
    }

    return map;
  }, [loans, emis]);

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
  const today = new Date();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (day: number): boolean => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const getDayEntries = (day: number): DayEMIEntry[] => {
    const d = new Date(year, month, day);
    const key = dateKey(d);
    return calendarMap.get(key) || [];
  };

  const handleDayClick = (day: number) => {
    const entries = getDayEntries(day);
    if (entries.length > 0) {
      setSelectedDayEmis(entries);
      setSelectedDayKey(dateKey(new Date(year, month, day)));
      setSelectedEmiId(null);
      setPaymentSuccess(false);
    }
  };

  const openEmiDetail = (emiId: string) => {
    setSelectedEmiId(emiId);
  };

  const handleConfirmPayment = async () => {
    if (!liveSelectedEMI) return;
    await markEMIPaid(liveSelectedEMI.id, liveSelectedEMI.loanId);
    setConfirmingPayment(false);
    setPaymentSuccess(true);

    setSelectedDayEmis(prev =>
      prev.map(item =>
        item.emi.id === liveSelectedEMI.id
          ? { ...item, displayStatus: 'paid' as const, emi: { ...item.emi, status: 'Paid' as const } }
          : item
      )
    );

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
              const entries = getDayEntries(day);
              const todayHighlight = isToday(day);
              const hasEmis = entries.length > 0;
              const paidCount = entries.filter(e => e.displayStatus === 'paid').length;
              const pendingCount = entries.filter(e => e.displayStatus === 'pending').length;
              const futureCount = entries.filter(e => e.displayStatus === 'future').length;

              return (
                <motion.button
                  key={day}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => hasEmis && handleDayClick(day)}
                  className={cn(
                    'aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs',
                    'border border-slate-700/50 bg-slate-800/30',
                    todayHighlight && 'ring-2 ring-blue-500',
                    hasEmis ? 'cursor-pointer hover:bg-slate-700/50' : 'cursor-default'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium',
                    todayHighlight ? 'text-blue-400' : 'text-slate-300'
                  )}>
                    {day}
                  </span>
                  {hasEmis && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {pendingCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      )}
                      {pendingCount === 0 && paidCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                      {pendingCount === 0 && paidCount === 0 && futureCount > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                      {entries.length > 1 && (
                        <span className="text-[8px] text-slate-400 font-bold ml-0.5 leading-none">
                          {entries.length}
                        </span>
                      )}
                    </div>
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
              <span className="text-sm text-slate-400">Due Now</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-sm text-slate-400">Future</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day EMIs List Modal */}
      <Modal
        isOpen={selectedDayEmis.length > 0 && !selectedEmiId}
        onClose={() => { setSelectedDayEmis([]); setSelectedDayKey(null); setPaymentSuccess(false); }}
        title={selectedDayKey ? formatDate(selectedDayKey, 'DD/MM/YYYY') : 'EMIs'}
      >
        <div className="space-y-3">
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

          {selectedDayEmis.map(({ emi, displayStatus }) => {
            const loan = loans.find(l => l.id === emi.loanId);
            const isPaid = emi.status === 'Paid';
            const effectivePaid = isPaid || displayStatus === 'paid';

            return (
              <motion.button
                key={emi.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => openEmiDetail(emi.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                  effectivePaid && 'bg-green-900/10 border-green-500/20 hover:bg-green-900/20',
                  displayStatus === 'pending' && 'bg-yellow-900/10 border-yellow-500/20 hover:bg-yellow-900/20',
                  displayStatus === 'future' && 'bg-blue-900/10 border-blue-500/20 hover:bg-blue-900/20'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  effectivePaid && 'bg-green-500/20',
                  displayStatus === 'pending' && 'bg-yellow-500/20',
                  displayStatus === 'future' && 'bg-blue-500/20'
                )}>
                  {effectivePaid
                    ? <CheckCircle size={18} className="text-green-400" />
                    : displayStatus === 'pending'
                      ? <AlertCircle size={18} className="text-yellow-400" />
                      : <AlertCircle size={18} className="text-blue-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">
                    {loan?.loanName || 'Unknown Loan'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{loan?.lenderName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-white text-sm">{formatCurrency(emi.amount)}</p>
                  <span className={cn(
                    'text-xs font-medium',
                    effectivePaid ? 'text-green-400' : displayStatus === 'pending' ? 'text-yellow-400' : 'text-blue-400'
                  )}>
                    {effectivePaid ? 'Paid' : displayStatus === 'pending' ? 'Due' : 'Future'}
                  </span>
                </div>
              </motion.button>
            );
          })}

          <Button variant="secondary" onClick={() => { setSelectedDayEmis([]); setSelectedDayKey(null); setPaymentSuccess(false); }} className="w-full">
            Close
          </Button>
        </div>
      </Modal>

      {/* EMI Detail Modal */}
      <Modal
        isOpen={!!selectedEmiId}
        onClose={() => { setSelectedEmiId(null); setConfirmingPayment(false); setPaymentSuccess(false); }}
        title="EMI Details"
      >
        {liveSelectedEMI && (() => {
          const loan = loans.find(l => l.id === liveSelectedEMI.loanId);
          const daysUntil = getDaysUntil(liveSelectedEMI.dueDate);
          const totalCount = loan?.totalEmis ?? 0;
          const paidCount = getLoanPaidEMIs(loan!);
          const isPaid = liveSelectedEMI.status === 'Paid';
          const outstanding = loan ? getLoanOutstanding(loan) : 0;

          const emiParsed = parseLocalDate(liveSelectedEMI.dueDate);
          const todayDate = new Date();
          const isPastEmi = emiParsed < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
          const effectivePaid = isPaid || (isPastEmi && !isPaid);
          const canMarkPaid = !effectivePaid;

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
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium inline-block mt-1',
                    effectivePaid && 'bg-green-500/20 text-green-400',
                    !effectivePaid && isPastEmi && 'bg-red-500/20 text-red-400',
                    !effectivePaid && !isPastEmi && 'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {effectivePaid ? '✓ Paid' : isPastEmi ? 'Overdue' : 'Pending'}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Due Date</p>
                  <p className="text-sm font-semibold text-white">{formatDate(liveSelectedEMI.dueDate)}</p>
                  {!effectivePaid && daysUntil >= 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {daysUntil === 0 ? 'Today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">Payment Date</p>
                  <p className={cn('text-sm font-semibold', effectivePaid ? 'text-green-400' : 'text-slate-500')}>
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
                  <p className="text-xs text-slate-400 mb-1">Outstanding</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(outstanding)}</p>
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
                  {selectedDayEmis.length > 0 ? 'Back' : 'Cancel'}
                </Button>
                {effectivePaid ? (
                  <Button variant="secondary" disabled className="flex-1" icon={<CheckCircle size={16} />}>
                    ✓ EMI Already Paid
                  </Button>
                ) : canMarkPaid ? (
                  <Button onClick={() => setConfirmingPayment(true)} className="flex-1" icon={<CheckCircle size={16} />}>
                    Mark EMI as Paid
                  </Button>
                ) : null}
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
