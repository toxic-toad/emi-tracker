import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Loan, LoanType } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Input';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateCompletionPercentage } from '../utils/calculations';
import { ProgressRing } from '../components/ui/ProgressRing';
import { cn } from '../utils/cn';

const LOAN_TYPES: LoanType[] = ['Home', 'Personal', 'Credit Card', 'Vehicle', 'Education', 'Gold', 'BNPL', 'Other'];
const LOAN_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'];

export function Loans() {
  const { loans, addLoan, updateLoan, deleteLoan, loading } = useLoans();
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    loanName: '',
    lenderName: '',
    loanType: 'Personal' as LoanType,
    currentOutstanding: '',
    originalLoanAmount: '',
    emiAmount: '',
    interestRate: '',
    emisRemaining: '',
    totalEmis: '',
    dueDate: '1',
    loanStartDate: '',
    loanEndDate: '',
    accountNumber: '',
    notes: '',
    colorTag: '#3b82f6',
    loanIcon: 'loan'
  });

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.loanName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         loan.lenderName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || loan.loanType === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loanData = {
      loanName: formData.loanName,
      lenderName: formData.lenderName,
      loanType: formData.loanType,
      currentOutstanding: parseFloat(formData.currentOutstanding),
      originalLoanAmount: parseFloat(formData.originalLoanAmount),
      emiAmount: parseFloat(formData.emiAmount),
      interestRate: parseFloat(formData.interestRate),
      emisRemaining: parseInt(formData.emisRemaining),
      totalEmis: parseInt(formData.totalEmis),
      dueDate: parseInt(formData.dueDate),
      loanStartDate: formData.loanStartDate,
      loanEndDate: formData.loanEndDate,
      accountNumber: formData.accountNumber || undefined,
      notes: formData.notes || undefined,
      colorTag: formData.colorTag,
      loanIcon: formData.loanIcon
    };

    if (editingLoan) {
      await updateLoan(editingLoan.id, loanData);
    } else {
      await addLoan(loanData);
    }

    handleCloseModal();
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      loanName: loan.loanName,
      lenderName: loan.lenderName,
      loanType: loan.loanType,
      currentOutstanding: loan.currentOutstanding.toString(),
      originalLoanAmount: loan.originalLoanAmount.toString(),
      emiAmount: loan.emiAmount.toString(),
      interestRate: loan.interestRate.toString(),
      emisRemaining: loan.emisRemaining.toString(),
      totalEmis: loan.totalEmis.toString(),
      dueDate: loan.dueDate.toString(),
      loanStartDate: loan.loanStartDate,
      loanEndDate: loan.loanEndDate,
      accountNumber: loan.accountNumber || '',
      notes: loan.notes || '',
      colorTag: loan.colorTag,
      loanIcon: loan.loanIcon
    });
    setShowModal(true);
  };

  const handleDelete = async (loanId: string) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      await deleteLoan(loanId);
      setShowMenu(null);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLoan(null);
    setFormData({
      loanName: '',
      lenderName: '',
      loanType: 'Personal',
      currentOutstanding: '',
      originalLoanAmount: '',
      emiAmount: '',
      interestRate: '',
      emisRemaining: '',
      totalEmis: '',
      dueDate: '1',
      loanStartDate: '',
      loanEndDate: '',
      accountNumber: '',
      notes: '',
      colorTag: '#3b82f6',
      loanIcon: 'loan'
    });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Loans</h1>
        <Button
          onClick={() => setShowModal(true)}
          icon={<Plus size={20} />}
          size="sm"
        >
          Add Loan
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search loans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-32"
        >
          <option value="all">All Types</option>
          {LOAN_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </Select>
      </div>

      {/* Loans List */}
      <div className="space-y-3">
        {filteredLoans.length === 0 ? (
          <Card gradient className="text-center py-12">
            <CardContent>
              <p className="text-slate-400">No loans found</p>
            </CardContent>
          </Card>
        ) : (
          filteredLoans.map((loan) => {
            const completion = calculateCompletionPercentage(loan);
            return (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <Card gradient className="relative">
                  <div className="flex items-start gap-4">
                    <ProgressRing
                      progress={completion}
                      size={80}
                      className="flex-shrink-0"
                    >
                      <span className="text-lg font-bold text-white">{completion.toFixed(0)}%</span>
                    </ProgressRing>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">{loan.loanName}</h3>
                      <p className="text-sm text-slate-400">{loan.lenderName}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-500">Outstanding</p>
                          <p className="font-semibold text-white">{formatCurrency(loan.currentOutstanding)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">EMI</p>
                          <p className="font-semibold text-white">{formatCurrency(loan.emiAmount)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Remaining</p>
                          <p className="font-semibold text-white">{loan.emisRemaining} EMIs</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Due Date</p>
                          <p className="font-semibold text-white">{loan.dueDate}{getOrdinal(loan.dueDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === loan.id ? null : loan.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <MoreVertical size={20} className="text-slate-400" />
                      </button>
                      
                      <AnimatePresence>
                        {showMenu === loan.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 min-w-32"
                          >
                            <button
                              onClick={() => handleEdit(loan)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-700 text-white flex items-center gap-2 rounded-t-xl"
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(loan.id)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-700 text-red-400 flex items-center gap-2 rounded-b-xl"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingLoan ? 'Edit Loan' : 'Add New Loan'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Loan Name"
              value={formData.loanName}
              onChange={(e) => setFormData({ ...formData, loanName: e.target.value })}
              required
            />
            <Input
              label="Lender Name"
              value={formData.lenderName}
              onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
              required
            />
          </div>

          <Select
            label="Loan Type"
            value={formData.loanType}
            onChange={(e) => setFormData({ ...formData, loanType: e.target.value as LoanType })}
            required
          >
            {LOAN_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Current Outstanding"
              type="number"
              value={formData.currentOutstanding}
              onChange={(e) => setFormData({ ...formData, currentOutstanding: e.target.value })}
              required
            />
            <Input
              label="Original Loan Amount"
              type="number"
              value={formData.originalLoanAmount}
              onChange={(e) => setFormData({ ...formData, originalLoanAmount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="EMI Amount"
              type="number"
              value={formData.emiAmount}
              onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
              required
            />
            <Input
              label="Interest Rate (%)"
              type="number"
              step="0.1"
              value={formData.interestRate}
              onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="EMIs Remaining"
              type="number"
              value={formData.emisRemaining}
              onChange={(e) => setFormData({ ...formData, emisRemaining: e.target.value })}
              required
            />
            <Input
              label="Total EMIs"
              type="number"
              value={formData.totalEmis}
              onChange={(e) => setFormData({ ...formData, totalEmis: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date (Day of Month)"
              type="number"
              min="1"
              max="31"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Loan Start Date"
              type="date"
              value={formData.loanStartDate}
              onChange={(e) => setFormData({ ...formData, loanStartDate: e.target.value })}
              required
            />
            <Input
              label="Loan End Date"
              type="date"
              value={formData.loanEndDate}
              onChange={(e) => setFormData({ ...formData, loanEndDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Account Number (Optional)"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color Tag</label>
            <div className="flex gap-2">
              {LOAN_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, colorTag: color })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    formData.colorTag === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Notes (Optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={3}
          />

          <Button type="submit" className="w-full">
            {editingLoan ? 'Update Loan' : 'Add Loan'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
