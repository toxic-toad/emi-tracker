import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Loan, LoanType } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { ProgressRing } from '../components/ui/ProgressRing';
import { cn } from '../utils/cn';
import {
  formatCurrency,
  formatDate
} from '../utils/formatters';
import { calculateCompletionPercentage, calculateNextEMI } from '../utils/calculations';
import { toast } from 'react-hot-toast';

const LOAN_TYPES: LoanType[] = ['Home', 'Personal', 'Credit Card', 'Vehicle', 'Education', 'Gold', 'BNPL', 'Other'];
const LOAN_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'];

interface LoanFormData {
  loanName: string;
  lenderName: string;
  loanType: LoanType;
  originalLoanAmount: string;
  emiAmount: string;
  totalEmis: string;
  emisRemaining: string;
  loanStartDate: string;
  nextEMIDate: string;
  notes: string;
  colorTag: string;
}

const emptyForm: LoanFormData = {
  loanName: '',
  lenderName: '',
  loanType: 'Personal',
  originalLoanAmount: '',
  emiAmount: '',
  totalEmis: '',
  emisRemaining: '',
  loanStartDate: '',
  nextEMIDate: '',
  notes: '',
  colorTag: '#3b82f6'
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Loans' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'completed', label: 'Completed' },
  { value: 'due_week', label: 'Due This Week' },
  { value: 'due_month', label: 'Due This Month' },
  { value: 'overdue', label: 'Overdue' },
];

export function Loans() {
  const { loans, emis, addLoan, updateLoan, deleteLoan, loading } = useLoans();
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LoanFormData, string>>>({});
  const [formData, setFormData] = useState<LoanFormData>(emptyForm);

  const filteredLoans = useMemo(() => {
    let result = loans;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(loan =>
        loan.loanName.toLowerCase().includes(q) ||
        loan.lenderName.toLowerCase().includes(q)
      );
    }

    switch (filterStatus) {
      case 'active':
        result = result.filter(l => l.status === 'active' || !l.status);
        break;
      case 'archived':
        result = result.filter(l => l.status === 'archived');
        break;
      case 'completed':
        result = result.filter(l => l.status === 'completed' || l.emisRemaining === 0);
        break;
      case 'due_week': {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        result = result.filter(l => {
          const due = new Date();
          due.setDate(l.dueDate);
          return l.emisRemaining > 0 && due <= weekEnd;
        });
        break;
      }
      case 'due_month': {
        const monthEnd = new Date();
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        result = result.filter(l => {
          const due = new Date();
          due.setDate(l.dueDate);
          return l.emisRemaining > 0 && due <= monthEnd;
        });
        break;
      }
      case 'overdue': {
        const overdueEmiLoanIds = new Set(emis.filter(e => e.status === 'Overdue').map(e => e.loanId));
        result = result.filter(l => overdueEmiLoanIds.has(l.id));
        break;
      }
    }

    return result;
  }, [loans, searchQuery, filterStatus, emis]);

  const validate = (): boolean => {
    const errors: Partial<Record<keyof LoanFormData, string>> = {};

    if (!formData.loanName.trim()) errors.loanName = 'Loan name is required';
    if (!formData.lenderName.trim()) errors.lenderName = 'Lender name is required';
    if (!formData.originalLoanAmount || parseFloat(formData.originalLoanAmount) <= 0) errors.originalLoanAmount = 'Original loan amount must be greater than zero';
    if (!formData.emiAmount || parseFloat(formData.emiAmount) <= 0) errors.emiAmount = 'EMI amount must be greater than zero';
    if (!formData.totalEmis || parseInt(formData.totalEmis) <= 0) errors.totalEmis = 'Total EMIs must be greater than zero';
    if (!formData.emisRemaining || parseInt(formData.emisRemaining) < 0) errors.emisRemaining = 'Remaining EMIs cannot be negative';
    if (formData.emisRemaining && formData.totalEmis && parseInt(formData.emisRemaining) > parseInt(formData.totalEmis)) errors.emisRemaining = 'Remaining EMIs cannot exceed Total EMIs';
    if (!formData.loanStartDate) errors.loanStartDate = 'Start date is required';
    if (formData.loanStartDate && formData.nextEMIDate && formData.nextEMIDate < formData.loanStartDate) errors.nextEMIDate = 'Next EMI date cannot be before Loan Start Date';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const emiAmount = parseFloat(formData.emiAmount);
    const emiRemaining = parseInt(formData.emisRemaining);
    const totalEmis = parseInt(formData.totalEmis);
    const outstanding = emiAmount * emiRemaining;
    const computedLoan = { loanStartDate: formData.loanStartDate, totalEmis, emisRemaining: emiRemaining, dueDate: 1 } as Loan;
    const defaultNext = calculateNextEMI(computedLoan);
    const nextDate = formData.nextEMIDate || (defaultNext ? defaultNext.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    const loanData = {
      loanName: formData.loanName.trim(),
      lenderName: formData.lenderName.trim(),
      loanType: formData.loanType,
      originalLoanAmount: parseFloat(formData.originalLoanAmount),
      currentOutstanding: outstanding,
      emiAmount: emiAmount,
      interestRate: 0,
      processingFee: 0,
      emisRemaining: emiRemaining,
      totalEmis: totalEmis,
      dueDate: 1,
      nextEMIDate: nextDate,
      loanStartDate: formData.loanStartDate,
      loanEndDate: formData.loanStartDate,
      accountNumber: undefined,
      notes: formData.notes || undefined,
      colorTag: formData.colorTag,
      loanIcon: 'loan',
      status: 'active' as const,
    };

    try {
      if (editingLoan) {
        await updateLoan(editingLoan.id, loanData);
        toast.success('Loan updated');
      } else {
        await addLoan(loanData);
        toast.success('Loan added');
      }
      handleCloseModal();
    } catch {
      toast.error('Operation failed');
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      loanName: loan.loanName,
      lenderName: loan.lenderName,
      loanType: loan.loanType,
      originalLoanAmount: loan.originalLoanAmount.toString(),
      emiAmount: loan.emiAmount.toString(),
      totalEmis: loan.totalEmis.toString(),
      emisRemaining: loan.emisRemaining.toString(),
      loanStartDate: loan.loanStartDate.split('T')[0],
      nextEMIDate: loan.nextEMIDate?.split('T')[0] || '',
      notes: loan.notes || '',
      colorTag: loan.colorTag,
    });
    setShowModal(true);
  };

  const handleDelete = async (loanId: string) => {
    await deleteLoan(loanId);
    setShowDeleteConfirm(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLoan(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const openAddModal = () => {
    setEditingLoan(null);
    setFormData(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="p-4 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-10 w-28 bg-slate-800 rounded-xl animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Loans</h1>
        <Button onClick={openAddModal} icon={<Plus size={20} />} size="sm">Add Loan</Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search loans or lenders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-36 text-sm"
        >
          {FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {filteredLoans.length === 0 ? (
        <Card gradient className="text-center py-12">
          <CardContent>
            <p className="text-slate-400 text-lg mb-2">No loans found</p>
            <p className="text-slate-500 text-sm">
              {searchQuery || filterStatus !== 'all' ? 'Try a different search or filter' : 'Add your first loan to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((loan) => {
            const completion = calculateCompletionPercentage(loan);
            return (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <Card gradient>
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <ProgressRing progress={completion} size={72} className="flex-shrink-0">
                        <span className="text-base font-bold text-white">{completion.toFixed(0)}%</span>
                      </ProgressRing>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white truncate">{loan.loanName}</h3>
                          {loan.status && loan.status !== 'active' && (
                            <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize', {
                              'bg-slate-700 text-slate-400': loan.status === 'archived',
                              'bg-green-900/50 text-green-400': loan.status === 'completed'
                            })}>
                              {loan.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">{loan.lenderName} · {loan.loanType}</p>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-4 sm:gap-y-1 text-sm">
                          <div className="sm:flex sm:justify-between">
                            <span className="block text-slate-500 sm:inline">Outstanding</span>
                            <span className="block font-semibold text-white sm:inline">{formatCurrency(loan.currentOutstanding)}</span>
                          </div>
                          <div className="sm:flex sm:justify-between">
                            <span className="block text-slate-500 sm:inline">Monthly EMI</span>
                            <span className="block font-semibold text-white sm:inline">{formatCurrency(loan.emiAmount)}</span>
                          </div>
                          <div className="sm:flex sm:justify-between">
                            <span className="block text-slate-500 sm:inline">Remaining EMIs</span>
                            <span className="block font-semibold text-white sm:inline">{loan.emisRemaining}/{loan.totalEmis}</span>
                          </div>
                          <div className="sm:flex sm:justify-between">
                            <span className="block text-slate-500 sm:inline">Next EMI</span>
                            <span className="block font-semibold text-blue-400 sm:inline">
                              {loan.nextEMIDate ? formatDate(loan.nextEMIDate) : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{(loan.totalEmis - loan.emisRemaining)} / {loan.totalEmis} EMIs Paid</span>
                      <span>{completion.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completion}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Edit size={14} />}
                        onClick={() => handleEdit(loan)}
                        className="flex-1 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 size={14} />}
                        onClick={() => setShowDeleteConfirm(loan.id)}
                        className="flex-1 text-xs"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Loan">
        <div className="space-y-4">
          <p className="text-slate-300">Are you sure you want to delete this loan and all its EMI records? This action cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(showDeleteConfirm!)} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingLoan ? 'Edit Loan' : 'Add New Loan'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Loan Name *"
              value={formData.loanName}
              onChange={(e) => setFormData({ ...formData, loanName: e.target.value })}
              error={formErrors.loanName}
              placeholder="e.g. Home Loan"
              required
            />
            <Input
              label="Lender Name *"
              value={formData.lenderName}
              onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
              error={formErrors.lenderName}
              placeholder="e.g. SBI"
              required
            />
          </div>

          <Select
            label="Loan Type *"
            value={formData.loanType}
            onChange={(e) => setFormData({ ...formData, loanType: e.target.value as LoanType })}
            required
          >
            {LOAN_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Original Loan Amount *"
              type="number"
              min="0"
              step="0.01"
              value={formData.originalLoanAmount}
              onChange={(e) => setFormData({ ...formData, originalLoanAmount: e.target.value })}
              error={formErrors.originalLoanAmount}
              placeholder="e.g. 5000000"
              required
            />
            <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl flex flex-col justify-center">
              <span className="text-xs text-slate-400 mb-0.5">Outstanding Amount (auto-calculated)</span>
              <span className="text-lg font-bold text-white">
                {formData.emiAmount && formData.emisRemaining
                  ? formatCurrency(parseFloat(formData.emiAmount) * parseInt(formData.emisRemaining))
                  : '—'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="EMI Amount *"
              type="number"
              min="0"
              step="0.01"
              value={formData.emiAmount}
              onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
              error={formErrors.emiAmount}
              placeholder="e.g. 45000"
              required
            />
            <Input
              label="Total EMIs *"
              type="number"
              min="1"
              value={formData.totalEmis}
              onChange={(e) => setFormData({ ...formData, totalEmis: e.target.value })}
              error={formErrors.totalEmis}
              placeholder="e.g. 120"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Remaining EMIs *"
              type="number"
              min="0"
              value={formData.emisRemaining}
              onChange={(e) => setFormData({ ...formData, emisRemaining: e.target.value })}
              error={formErrors.emisRemaining}
              placeholder="e.g. 84"
              required
            />
            <Input
              label="Loan Start Date *"
              type="date"
              value={formData.loanStartDate}
              onChange={(e) => setFormData({ ...formData, loanStartDate: e.target.value })}
              error={formErrors.loanStartDate}
              required
            />
          </div>

          <Input
            label="Next EMI Date"
            type="date"
            value={formData.nextEMIDate}
            onChange={(e) => setFormData({ ...formData, nextEMIDate: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color Tag</label>
            <div className="flex gap-2 flex-wrap">
              {LOAN_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, colorTag: color })}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    formData.colorTag === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
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
            placeholder="Any additional notes about this loan..."
          />

          <Button type="submit" className="w-full">
            {editingLoan ? 'Update Loan' : 'Add Loan'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
