import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Target,
  PieChart,
  LineChart
} from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { formatCurrency, getDaysUntil, formatDate } from '../utils/formatters';
import {
  calculateTotalOutstanding,
  calculateTotalMonthlyEMI,
  getNextEMIDate,
  calculateOverdueAmount,
  calculatePaidThisMonth
} from '../utils/calculations';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer as PieResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export function Dashboard() {
  const { loans, emis, loading } = useLoans();

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const totalOutstanding = calculateTotalOutstanding(loans);
  const totalMonthlyEMI = calculateTotalMonthlyEMI(loans);
  const nextEMIDate = getNextEMIDate(loans);
  const overdueAmount = calculateOverdueAmount(emis);
  const paidThisMonth = calculatePaidThisMonth(emis);
  const totalLoans = loans.length;
  const remainingEMIs = loans.reduce((sum, loan) => sum + loan.emisRemaining, 0);

  const nextEMILoan = loans.find(loan => {
    const nextDate = new Date();
    nextDate.setDate(loan.dueDate);
    if (nextDate < new Date()) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextEMIDate && nextDate.getTime() === nextEMIDate.getTime();
  });

  const debtOverTime = loans.map(loan => ({
    name: loan.loanName.substring(0, 10),
    value: loan.currentOutstanding
  }));

  const debtDistribution = loans.map(loan => ({
    name: loan.loanName,
    value: loan.currentOutstanding
  }));

  const monthlyEMIData = loans.map(loan => ({
    name: loan.loanName.substring(0, 10),
    value: loan.emiAmount
  }));

  return (
    <div className="p-4 pb-24 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card gradient>
            <CardHeader>
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <TrendingUp size={16} />
                Total Debt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalOutstanding)}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Calendar size={16} />
                Monthly EMI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalMonthlyEMI)}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Target size={16} />
                Total Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{totalLoans}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <Clock size={16} />
                Remaining EMIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{remainingEMIs}</p>
            </CardContent>
          </Card>

          {nextEMIDate && nextEMILoan && (
            <Card gradient className="col-span-2">
              <CardHeader>
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <Calendar size={16} />
                  Next EMI
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <div>
                  <p className="text-xl font-bold text-white">{formatCurrency(nextEMILoan.emiAmount)}</p>
                  <p className="text-sm text-slate-400">{nextEMILoan.loanName}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-blue-400">{formatDate(nextEMIDate)}</p>
                  <p className="text-sm text-slate-400">{getDaysUntil(nextEMIDate.toISOString())} days</p>
                </div>
              </CardContent>
            </Card>
          )}

          {overdueAmount > 0 && (
            <Card gradient className="col-span-2 border-red-500/50">
              <CardHeader>
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Overdue Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(overdueAmount)}</p>
              </CardContent>
            </Card>
          )}

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <CheckCircle size={16} />
                Paid This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(paidThisMonth)}</p>
            </CardContent>
          </Card>

          <Card gradient>
            <CardHeader>
              <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                <TrendingDown size={16} />
                Debt Reduction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-400">
                {totalOutstanding > 0 ? formatPercentage((paidThisMonth / totalOutstanding) * 100) : '0%'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {loans.length > 0 && (
          <div className="space-y-4">
            <Card gradient>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <LineChart size={20} />
                  Outstanding Debt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={debtOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
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
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart size={20} />
                  Debt Distribution
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
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {debtDistribution.map((entry, index) => (
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
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar size={20} />
                  Monthly EMI Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={monthlyEMIData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
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

        {loans.length === 0 && (
          <Card gradient className="text-center py-12">
            <CardContent>
              <Target size={48} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">No loans yet</h3>
              <p className="text-slate-400">Add your first loan to start tracking</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
