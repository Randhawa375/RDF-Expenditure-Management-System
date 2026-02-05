
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionType } from '../types';
import { jsPDF } from 'jspdf';
import { PdfGenerator } from '../services/pdfGenerator';

interface TransactionsPageProps {
  type: TransactionType;
  transactions: Transaction[];
  onAdd: () => void;
}

const TransactionsPage: React.FC<TransactionsPageProps> = ({ type, transactions, onAdd }) => {
  const navigate = useNavigate();
  const todayRef = useRef<HTMLButtonElement>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit'
    }).format(new Date()).slice(0, 7);
  });

  useEffect(() => {
    if (todayRef.current) {
      setTimeout(() => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [selectedMonth]);

  const ledgerDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dates.push(dateString);
    }
    // Changed from .reverse() to normal order as per user request (1 to onwards)
    return dates;
  }, [selectedMonth]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.type === type && t.date.startsWith(selectedMonth));
  }, [transactions, type, selectedMonth]);

  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      totals[t.date] = (totals[t.date] || 0) + t.amount;
    });
    return totals;
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    const values = Object.values(dailyTotals) as number[];
    const total = values.reduce((sum, val) => sum + val, 0);
    return { total };
  }, [dailyTotals]);

  const isExpense = type === TransactionType.EXPENSE;
  const monthName = new Date(selectedMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });

  const downloadReport = async () => {
    try {
      const doc = await PdfGenerator.initPDF();
      const title = isExpense ? 'EXPENSE RECORDS' : 'PAYMENT RECEIVED RECORDS';

      PdfGenerator.addHeader(
        doc,
        'RDF EXPENDITURE',
        title,
        `PERIOD: ${monthName.toUpperCase()}`,
        isExpense
      );

      // Total Summary Banner
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, 55, 170, 25, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`MONTHLY TOTAL ${isExpense ? 'EXPENSES' : 'RECEIVED'}:`, 30, 71);

      doc.setTextColor(isExpense ? 225 : 16, isExpense ? 29 : 185, isExpense ? 72 : 129);
      doc.setFontSize(18);
      doc.text(`PKR ${stats.total.toLocaleString()}`, 190, 71, { align: 'right' });

      // Table Header
      let y = 100;
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 6, 170, 10, 'F');

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.text('DATE', 25, y);
      doc.text('DESCRIPTION / DETAILS', 60, y);
      doc.text('AMOUNT (PKR)', 185, y, { align: 'right' });

      y += 10;
      // Switch to Urdu font for content
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      // Data Rows - Sorted Ascending
      const sorted = [...filteredTransactions].sort((a, b) => a.date.localeCompare(b.date));

      sorted.forEach((t, index) => {
        if (y > 275) {
          doc.addPage();
          y = 25;
          // Re-add table header on new page
          doc.setFillColor(241, 245, 249);
          doc.rect(20, y - 6, 170, 10, 'F');
          doc.setFont('helvetica', 'bold');
          doc.text('DATE', 25, y);
          doc.text('DESCRIPTION / DETAILS', 60, y);
          doc.text('AMOUNT (PKR)', 185, y, { align: 'right' });
          // Switch back to Amri
          doc.setFont('Amiri', 'normal');
          doc.setFont('normal');
          doc.setTextColor(30, 41, 59);
          y += 10;
        }

        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, y - 5, 170, 9, 'F');
        }

        doc.text(t.date, 25, y);
        const desc = t.description.length > 60 ? t.description.substring(0, 57) + '...' : t.description;
        doc.text(desc, 60, y); // Urdu supported
        doc.text(t.amount.toLocaleString(), 185, y, { align: 'right' });

        y += 9;
      });

      PdfGenerator.addFooter(doc);

      doc.save(`RDF_${isExpense ? 'Expenses' : 'Income'}_Report_${selectedMonth}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error generating PDF");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
      {/* Visual Header Card - Compact Responsive Version */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Top Left: Title & Info */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${isExpense ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-500'}`}>
              {isExpense ? (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              )}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-tight truncate">
                {isExpense ? 'Expense Records' : 'Payment Received'}
              </h1>
              <p className="font-urdu text-sm md:text-base text-slate-400 mt-0.5 leading-none truncate">
                {isExpense ? 'اخراجات کی تفصیل' : 'ادائیگی موصول ہوئی'}
              </p>
              {/* Debug Info: Remove after fixing */}
              <div className="text-[9px] text-slate-300 font-mono mt-1 leading-none">
                Sys: {new Date().toLocaleTimeString()} <br />
                PKT: {(() => {
                  const now = new Date();
                  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                  const pkt = new Date(utc + (5 * 3600000));
                  return pkt.toISOString().split('T')[0];
                })()}
              </div>
            </div>
          </div>

          {/* Top Right: Month Selector & Download */}
          <div className="flex items-center gap-2 justify-start md:justify-end">
            <div className="bg-slate-50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-slate-100 flex flex-col min-w-[120px]">
              <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Month</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-[10px] md:text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={downloadReport}
              className="bg-slate-900 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-all shadow active:scale-95 h-[36px] md:h-[42px]"
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="text-[10px] md:text-xs font-bold font-urdu">رپورٹ</span>
            </button>
          </div>

          {/* Bottom Left: Monthly Total */}
          <div className="bg-slate-50/50 rounded-lg md:rounded-xl p-3 md:p-4 border border-slate-100 flex flex-row md:flex-col justify-between items-center md:items-start">
            <div className="leading-tight">
              <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block">Monthly Total</span>
              <span className="font-urdu text-[10px] md:text-xs text-slate-400">کل رقم</span>
            </div>
            <div className={`text-xl md:text-2xl font-black ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
              PKR {stats.total.toLocaleString()}
            </div>
          </div>

          {/* Bottom Right: New Record Button */}
          <button
            onClick={onAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg md:rounded-xl shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center h-[52px] md:h-full gap-0.5 group"
          >
            <div className="flex items-center gap-2 leading-none">
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">New Entry</span>
              <svg className="w-3 h-3 md:w-4 md:h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="font-urdu text-sm md:text-base leading-none">(نیا ریکارڈ)</span>
          </button>
        </div>
      </div>

      {/* Ledger List */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          {ledgerDays.map(dateStr => {
            const total = dailyTotals[dateStr] || 0;
            const [y, m, d] = dateStr.split('-').map(Number);
            const dayObj = new Date(y, m - 1, d);
            const dayName = dayObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum = dayObj.getDate();
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const pktDate = new Date(utc + (5 * 3600000));
            const localISODate = pktDate.toISOString().split('T')[0];
            const isToday = localISODate === dateStr;
            const targetPath = isExpense ? `/expenses/${dateStr}` : `/receipts/${dateStr}`;

            return (
              <button
                key={dateStr}
                ref={isToday ? todayRef : null}
                onClick={() => navigate(targetPath)}
                className={`w-full flex items-center justify-between p-4 md:p-5 transition-all hover:bg-slate-50/50 group ${isToday
                  ? 'bg-indigo-50 border border-indigo-100 shadow-sm transform scale-[1.01] z-10'
                  : 'border border-transparent'
                  }`}
              >
                <div className="flex items-center gap-4 md:gap-6">
                  {/* Date Block */}
                  <div className="flex flex-col items-center justify-center min-w-[40px] md:min-w-[50px]">
                    <span className={`text-2xl md:text-3xl font-black leading-none ${isExpense ? 'text-rose-500/90' : 'text-emerald-500/90'}`}>
                      {dayNum}
                    </span>
                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest mt-1 text-slate-400">
                      {dayName}
                    </span>
                  </div>

                  {/* Entry Text */}
                  <div className="text-left overflow-hidden">
                    <div className="flex items-center gap-2 max-w-full">
                      <span className="text-base md:text-lg font-bold text-slate-800 tracking-tight leading-none truncate">Daily Record</span>
                      {isToday && (
                        <span className="bg-indigo-600 text-[6px] md:text-[7px] font-black text-white px-1 md:px-1.5 py-0.5 rounded-full uppercase tracking-widest leading-none shrink-0">Today</span>
                      )}
                    </div>
                    <div className="font-urdu text-xs md:text-base text-slate-400 mt-1 leading-none">روزانہ کا کھاتہ</div>
                  </div>
                </div>

                {/* Amount or Placeholder */}
                <div className="flex items-center gap-3 md:gap-4 shrink-0">
                  {total > 0 ? (
                    <div className="text-right leading-none">
                      <div className={`text-lg md:text-xl font-black ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {total.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 md:w-12 h-1 bg-slate-100 rounded-full opacity-30"></div>
                  )}
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 group-hover:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
