import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, CheckCircle, Target } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateCompletionPercentage } from '../utils/calculations';

export function Reports() {
  const { loans, emis, loading } = useLoans();

  const activeLoans = useMemo(() => loans.filter(l => l.status === 'active' || !l.status), [loans]);

  const stats = useMemo(() => {
    const totalOutstanding = activeLoans.reduce((s, l) => s + l.currentOutstanding, 0);
    const totalPaid = activeLoans.reduce((s, l) => {
      const loanEmis = emis.filter(e => e.loanId === l.id && e.status === 'Paid');
      return s + loanEmis.reduce((sum, e) => sum + e.amount, 0);
    }, 0);
    const totalEmisCount = emis.length;
    const paidEmisCount = emis.filter(e => e.status === 'Paid').length;
    const completionRate = totalEmisCount > 0 ? (paidEmisCount / totalEmisCount) * 100 : 0;
    return { totalOutstanding, totalPaid, totalEmisCount, paidEmisCount, completionRate };
  }, [activeLoans, emis]);

  if (loading) {
    return (
      <div className="p-4 pb-24 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (activeLoans.length === 0) {
    return (
      <div className="p-4 pb-24 space-y-4">
        <h1 className="text-2xl font-bold text-white">Loan Progress</h1>
        <Card gradient className="text-center py-12">
          <CardContent>
            <TrendingUp size={48} className="mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No active loans</h3>
            <p className="text-slate-400">Add loans to track your progress</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold text-white">Loan Progress</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card gradient>
          <CardHeader>
            <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
              <TrendingUp size={14} /> Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">{formatCurrency(stats.totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card gradient>
          <CardHeader>
            <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle size={14} /> Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-green-400">{formatCurrency(stats.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card gradient>
          <CardHeader>
            <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar size={14} /> Paid EMIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-white">{stats.paidEmisCount}/{stats.totalEmisCount}</p>
          </CardContent>
        </Card>
        <Card gradient>
          <CardHeader>
            <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
              <Target size={14} /> Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-400">{stats.completionRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress Bar */}
      <Card gradient>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Overall Progress</span>
            <span className="text-sm font-semibold text-white">{stats.completionRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.completionRate}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500">
            <span>{stats.paidEmisCount} / {stats.totalEmisCount} EMIs Paid</span>
            <span>{stats.totalEmisCount - stats.paidEmisCount} remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-Loan Progress Cards */}
      <div className="space-y-3">
        {activeLoans.map((loan, index) => {
          const completion = calculateCompletionPercentage(loan);
          const loanEmis = emis.filter(e => e.loanId === loan.id);
          const paidEmis = loanEmis.filter(e => e.status === 'Paid').length;
          const nextPending = loanEmis.find(e => e.status === 'Pending');
          const remainingAmount = loan.currentOutstanding;

          return (
            <motion.div
              key={loan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card gradient>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="24" stroke="#334155" strokeWidth="5" fill="transparent" />
                        <motion.circle
                          cx="28" cy="28" r="24"
                          stroke={loan.colorTag || '#3b82f6'}
                          strokeWidth="5" fill="transparent" strokeLinecap="round"
                          initial={{ strokeDasharray: 150.8, strokeDashoffset: 150.8 }}
                          animate={{ strokeDashoffset: 150.8 - (completion / 100) * 150.8 }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{completion.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: loan.colorTag }} />
                        <h3 className="font-semibold text-white truncate">{loan.loanName}</h3>
                      </div>
                      <p className="text-xs text-slate-400">{loan.lenderName} · {loan.loanType}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500">Outstanding</span>
                      <p className="font-semibold text-white">{formatCurrency(remainingAmount)}</p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500">Monthly EMI</span>
                      <p className="font-semibold text-white">{formatCurrency(loan.emiAmount)}</p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500">EMIs Paid</span>
                      <p className="font-semibold text-green-400">{paidEmis}/{loanEmis.length}</p>
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <span className="text-slate-500">Next EMI</span>
                      <p className="font-semibold text-blue-400">
                        {nextPending ? formatDate(nextPending.dueDate) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{paidEmis} / {loanEmis.length} EMIs Paid</span>
                    <span>{completion.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completion}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${loan.colorTag || '#3b82f6'}, #8b5cf6)` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Started {formatDate(loan.loanStartDate)}</span>
                    <span>{loan.emisRemaining} EMIs left</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
