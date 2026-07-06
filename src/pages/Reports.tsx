import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { useLoans } from '../contexts/LoanContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { formatCurrency, formatDate } from '../utils/formatters';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export function Reports() {
  const { loans, emis, loading } = useLoans();
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'loan'>('monthly');
  const [selectedLoan, setSelectedLoan] = useState<string>('all');

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const exportToExcel = () => {
    const data = getReportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `emi-report-${reportType}-${Date.now()}.xlsx`);
  };

  const exportToCSV = () => {
    const data = getReportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emi-report-${reportType}-${Date.now()}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const data = getReportData();
    
    doc.setFontSize(16);
    doc.text('EMI Tracker Pro Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Report Type: ${reportType}`, 20, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
    
    let yPosition = 50;
    data.forEach((item: any, index: number) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${index + 1}. ${item.loan || 'N/A'} - ${formatCurrency(item.amount || 0)}`, 20, yPosition);
      yPosition += 10;
    });
    
    doc.save(`emi-report-${reportType}-${Date.now()}.pdf`);
  };

  const getReportData = () => {
    switch (reportType) {
      case 'monthly':
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        return emis
          .filter(emi => {
            const date = new Date(emi.dueDate);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .map(emi => {
            const loan = loans.find(l => l.id === emi.loanId);
            return {
              loan: loan?.loanName,
              lender: loan?.lenderName,
              amount: emi.amount,
              status: emi.status,
              dueDate: formatDate(emi.dueDate),
              paymentDate: emi.paymentDate ? formatDate(emi.paymentDate) : 'N/A'
            };
          });
      
      case 'yearly':
        return emis
          .filter(emi => {
            const date = new Date(emi.dueDate);
            return date.getFullYear() === currentYear;
          })
          .map(emi => {
            const loan = loans.find(l => l.id === emi.loanId);
            return {
              loan: loan?.loanName,
              lender: loan?.lenderName,
              amount: emi.amount,
              status: emi.status,
              dueDate: formatDate(emi.dueDate),
              paymentDate: emi.paymentDate ? formatDate(emi.paymentDate) : 'N/A'
            };
          });
      
      case 'loan':
        return selectedLoan === 'all'
          ? loans.map(loan => ({
              loan: loan.loanName,
              lender: loan.lenderName,
              type: loan.loanType,
              outstanding: loan.currentOutstanding,
              emi: loan.emiAmount,
              interestRate: loan.interestRate,
              remainingEMIs: loan.emisRemaining,
              totalEMIs: loan.totalEmis,
              startDate: formatDate(loan.loanStartDate),
              endDate: formatDate(loan.loanEndDate)
            }))
          : loans
              .filter(l => l.id === selectedLoan)
              .map(loan => ({
                loan: loan.loanName,
                lender: loan.lenderName,
                type: loan.loanType,
                outstanding: loan.currentOutstanding,
                emi: loan.emiAmount,
                interestRate: loan.interestRate,
                remainingEMIs: loan.emisRemaining,
                totalEMIs: loan.totalEmis,
                startDate: formatDate(loan.loanStartDate),
                endDate: formatDate(loan.loanEndDate)
              }));
      
      default:
        return [];
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
      </div>

      <Card gradient>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Report Type</label>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
            >
              <option value="monthly">Monthly Report</option>
              <option value="yearly">Yearly Report</option>
              <option value="loan">Loan Report</option>
            </Select>
          </div>

          {reportType === 'loan' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Loan</label>
              <Select
                value={selectedLoan}
                onChange={(e) => setSelectedLoan(e.target.value)}
              >
                <option value="all">All Loans</option>
                {loans.map(loan => (
                  <option key={loan.id} value={loan.id}>{loan.loanName}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={exportToExcel}
              icon={<FileSpreadsheet size={20} />}
              variant="secondary"
              className="text-sm"
            >
              Excel
            </Button>
            <Button
              onClick={exportToCSV}
              icon={<FileText size={20} />}
              variant="secondary"
              className="text-sm"
            >
              CSV
            </Button>
            <Button
              onClick={exportToPDF}
              icon={<Download size={20} />}
              variant="secondary"
              className="text-sm"
            >
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card gradient>
        <CardHeader>
          <CardTitle className="text-white">Report Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getReportData().slice(0, 5).map((item: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
              >
                <div>
                  <p className="font-medium text-white">{item.loan || item.lender || 'N/A'}</p>
                  <p className="text-sm text-slate-400">
                    {item.dueDate || item.type || item.startDate}
                  </p>
                </div>
                <p className="font-semibold text-white">
                  {formatCurrency(item.amount || item.outstanding || item.emi || 0)}
                </p>
              </motion.div>
            ))}
            
            {getReportData().length === 0 && (
              <p className="text-center text-slate-400 py-8">No data available for this report</p>
            )}
            
            {getReportData().length > 5 && (
              <p className="text-center text-sm text-slate-400">
                +{getReportData().length - 5} more entries
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card gradient>
          <CardContent className="p-4">
            <p className="text-sm text-slate-400 mb-1">Total Loans</p>
            <p className="text-2xl font-bold text-white">{loans.length}</p>
          </CardContent>
        </Card>

        <Card gradient>
          <CardContent className="p-4">
            <p className="text-sm text-slate-400 mb-1">Total EMIs</p>
            <p className="text-2xl font-bold text-white">{emis.length}</p>
          </CardContent>
        </Card>

        <Card gradient>
          <CardContent className="p-4">
            <p className="text-sm text-slate-400 mb-1">Paid EMIs</p>
            <p className="text-2xl font-bold text-green-400">
              {emis.filter(e => e.status === 'Paid').length}
            </p>
          </CardContent>
        </Card>

        <Card gradient>
          <CardContent className="p-4">
            <p className="text-sm text-slate-400 mb-1">Pending EMIs</p>
            <p className="text-2xl font-bold text-yellow-400">
              {emis.filter(e => e.status === 'Pending').length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
