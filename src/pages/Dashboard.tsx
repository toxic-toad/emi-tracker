import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Calendar, AlertCircle, CheckCircle,
  Clock, Target, PieChart, LineChart, CreditCard, Banknote,
  Brain, Shield, DollarSign, ArrowRight, Sparkles, Plus
} from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatPercentage, formatDate, getDaysUntil, formatRelativeDate } from '../utils/formatters';
import {
  generateDashboardSummary,
  generateAIInsights,
  calculateFinancialHealth,
  calculateMonthlySavings,
} from '../utils/calculations';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer as PieResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'];

export function Dashboard() {
  const { loans, emis, loading } = useLoans();

  const activeLoans = useMemo(() => loans.filter(l => l.status === 'active' || !l.status), [loans]);
  const summary = useMemo(() => generateDashboardSummary(activeLoans, emis), [activeLoans, emis]);
  const insights = useMemo(() => generateAIInsights(activeLoans, emis), [activeLoans, emis]);
  const health = useMemo(() => calculateFinancialHealth(activeLoans, emis), [activeLoans, emis]);
  const monthlySavings = useMemo(() => calculateMonthlySavings(loans), [loans]);

  const nextEMIPaid = useMemo(() => {
    if (!summary.nextEMIDate) return null;
    return emis.find(e => {
      const loan = loans.find(l => l.loanName === summary.nextEMILoanName);
      if (!loan) return false;
      const d = new Date(e.dueDate);
      const nd = new Date(summary.nextEMIDate!);
      return e.loanId === loan.id &&
        d.getFullYear() === nd.getFullYear() &&
        d.getMonth() === nd.getMonth() &&
        d.getDate() === nd.getDate();
    }) || null;
  }, [emis, loans, summary]);

  const upcomingEMIs = useMemo(() => {
    const today = new Date();
    return emis
      .filter(e => e.status === 'Pending' && new Date(e.dueDate) >= today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [emis]);

  const recentPayments = useMemo(() => {
    return emis
      .filter(e => e.status === 'Paid' && e.paymentDate)
      .sort((a, b) => new Date(b.paymentDate!).getTime() - new Date(a.paymentDate!).getTime())
      .slice(0, 5);
  }, [emis]);

  const debtOverTime = useMemo(() =>
    activeLoans.map(loan => ({
      name: loan.loanName.substring(0, 10),
      value: loan.currentOutstanding,
      fill: loan.colorTag
    })),
  [activeLoans]);

  const debtDistribution = useMemo(() =>
    activeLoans.map(loan => ({
      name: loan.loanName,
      value: loan.currentOutstanding
    })),
  [activeLoans]);

  const monthlyEMIData = useMemo(() =>
    activeLoans.map(loan => ({
      name: loan.loanName.substring(0, 10),
      value: loan.emiAmount
    })),
  [activeLoans]);

  if (loading) {
    return (
      <div className="p-4 pb-24 space-y-4">
        <div className="h-8 w-32 bg-slate-800 rounded-lg animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          {activeLoans.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
              {activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Premium Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                <TrendingUp size={14} /> Total Debt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-white">{formatCurrency(summary.totalOutstanding)}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar size={14} /> Monthly EMI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-white">{formatCurrency(summary.totalMonthlyEMI)}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                <Target size={14} /> Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-white">{summary.totalLoans}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock size={14} /> Remaining EMIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-white">{summary.remainingEMIs}</p>
            </CardContent>
          </Card>

          {summary.nextEMIDate && summary.nextEMIAmount > 0 && (
            <Card gradient className="col-span-2">
              <CardHeader>
                <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar size={14} /> Next EMI
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold text-white">{formatCurrency(summary.nextEMIAmount)}</p>
                  <p className="text-xs text-slate-400">{summary.nextEMILoanName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-400">{formatDate(summary.nextEMIDate)}</p>
                  <p className="text-xs text-slate-500">{getDaysUntil(summary.nextEMIDate)} days</p>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
                    nextEMIPaid?.status === 'Paid'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  )}>
                    {nextEMIPaid?.status === 'Paid' ? '✓ Paid' : 'Pending'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {summary.dueToday > 0 && (
            <Card gradient className="border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-xs text-blue-400 flex items-center gap-1.5">
                  <Calendar size={14} /> Due Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(summary.dueToday)}</p>
              </CardContent>
            </Card>
          )}

          {summary.dueThisWeek > 0 && (
            <Card gradient className="border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-xs text-yellow-400 flex items-center gap-1.5">
                  <Clock size={14} /> Due This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-yellow-400">{formatCurrency(summary.dueThisWeek)}</p>
              </CardContent>
            </Card>
          )}

          {summary.overdueAmount > 0 && (
            <Card gradient className="col-span-2 border-red-500/50">
              <CardHeader>
                <CardTitle className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-red-400">{formatCurrency(summary.overdueAmount)}</p>
              </CardContent>
            </Card>
          )}

          {summary.debtFreeDate && (
            <Card gradient className="col-span-2">
              <CardHeader>
                <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Target size={14} /> Debt Free Date
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <p className="text-lg font-bold text-green-400">{formatDate(summary.debtFreeDate)}</p>
                <p className="text-xs text-slate-500">{getDaysUntil(summary.debtFreeDate)} days to go</p>
              </CardContent>
            </Card>
          )}

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle size={14} /> Paid This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-400">{formatCurrency(summary.paidThisMonth)}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-xs text-slate-400 flex items-center gap-1.5">
                <TrendingDown size={14} /> Debt Reduction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-400">{formatPercentage(summary.debtReductionPercent)}</p>
            </CardContent>
          </Card>

          {monthlySavings > 0 && (
            <Card gradient className="col-span-2 border-green-500/30">
              <CardHeader>
                <CardTitle className="text-xs text-green-400 flex items-center gap-1.5">
                  <DollarSign size={14} /> Monthly Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-green-400">{formatCurrency(monthlySavings)}</p>
                <p className="text-xs text-slate-500">From completed loans</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain size={18} /> AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.slice(0, 5).map((insight) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-xl text-sm border',
                      insight.severity === 'success' && 'bg-green-900/20 border-green-800/30',
                      insight.severity === 'warning' && 'bg-yellow-900/20 border-yellow-800/30',
                      insight.severity === 'info' && 'bg-blue-900/20 border-blue-800/30',
                    )}
                  >
                    <Sparkles size={16} className={cn(
                      'flex-shrink-0 mt-0.5',
                      insight.severity === 'success' && 'text-green-400',
                      insight.severity === 'warning' && 'text-yellow-400',
                      insight.severity === 'info' && 'text-blue-400',
                    )} />
                    <div>
                      <p className="font-medium text-white text-sm">{insight.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{insight.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Health */}
        {activeLoans.length > 0 && (
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield size={18} /> Financial Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r="34" stroke="#334155" strokeWidth="6" fill="transparent" />
                    <motion.circle
                      cx="40" cy="40" r="34"
                      stroke={health.score >= 70 ? '#10b981' : health.score >= 40 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="6" fill="transparent" strokeLinecap="round"
                      initial={{ strokeDasharray: 213.6, strokeDashoffset: 213.6 }}
                      animate={{ strokeDashoffset: 213.6 - (health.score / 100) * 213.6 }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                      'text-xl font-bold',
                      health.score >= 70 ? 'text-green-400' : health.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {health.score}
                    </span>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Risk Level</span>
                    <span className={cn(
                      'font-medium',
                      health.riskLevel === 'Low' ? 'text-green-400' : health.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {health.riskLevel}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Debt/Income</span>
                    <span className="text-white font-medium">{health.debtToIncomeRatio.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">On-Time Payments</span>
                    <span className="text-white font-medium">{health.onTimePaymentRate.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Payment Streak</span>
                    <span className="text-white font-medium">{health.paymentStreak} months</span>
                  </div>
                </div>
              </div>
              {health.suggestions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Suggestions</p>
                  {health.suggestions.slice(0, 3).map((s, i) => (
                    <p key={i} className="text-xs text-slate-400 flex items-start gap-2">
                      <ArrowRight size={12} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {activeLoans.length > 0 && (
          <div className="space-y-4">
            <Card gradient>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <LineChart size={18} /> Outstanding Debt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={debtOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card gradient>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <PieChart size={18} /> Debt Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <PieResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={debtDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {debtDistribution.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </RechartsPieChart>
                  </PieResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card gradient>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <Calendar size={18} /> Monthly EMI Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={monthlyEMIData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming EMIs */}
        {upcomingEMIs.length > 0 && (
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <Calendar size={16} /> Upcoming EMIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingEMIs.map(emi => {
                  const loan = loans.find(l => l.id === emi.loanId);
                  return (
                    <div key={emi.id} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: loan?.colorTag || '#3b82f6' }} />
                        <div>
                          <p className="text-sm font-medium text-white">{loan?.loanName || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{formatDate(emi.dueDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatCurrency(emi.amount)}</p>
                        <p className="text-xs text-slate-500">{formatRelativeDate(emi.dueDate)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Payments */}
        {recentPayments.length > 0 && (
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <CheckCircle size={16} /> Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentPayments.map(emi => {
                  const loan = loans.find(l => l.id === emi.loanId);
                  return (
                    <div key={emi.id} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div>
                          <p className="text-sm font-medium text-white">{loan?.loanName || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{emi.paymentDate ? formatDate(emi.paymentDate) : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-400">{formatCurrency(emi.amount)}</p>
                        <p className="text-xs text-green-500">Paid</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Loans */}
        {activeLoans.length > 0 && (
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-sm">
                <CreditCard size={16} /> Active Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeLoans.map(loan => {
                  const pct = loan.totalEmis > 0 ? ((loan.totalEmis - loan.emisRemaining) / loan.totalEmis * 100).toFixed(0) : '0';
                  return (
                    <div key={loan.id} className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: loan.colorTag }} />
                          <p className="text-sm font-medium text-white">{loan.loanName}</p>
                        </div>
                        <p className="text-sm font-semibold text-white">{formatCurrency(loan.emiAmount)}<span className="text-xs text-slate-500">/mo</span></p>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                        />
                      </div>
                      <div className="flex justify-between mt-1.5 text-xs text-slate-500">
                        <span>{formatCurrency(loan.currentOutstanding)} outstanding</span>
                        <span>{loan.emisRemaining} EMIs left</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {activeLoans.length === 0 && (
          <Card gradient className="text-center py-12">
            <CardContent>
              <Banknote size={48} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No loans yet</h3>
              <p className="text-slate-400 mb-6">Add your first loan to start tracking your finances</p>
              <Button onClick={() => window.location.href = '/loans'} icon={<Plus size={18} />}>
                Add Your First Loan
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
