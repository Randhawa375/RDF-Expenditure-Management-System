
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { jsPDF } from 'jspdf';
import { PdfGenerator } from '../services/pdfGenerator';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const filtered = useMemo(() =>
    transactions.filter(t => t.date.startsWith(selectedMonth))
      // Sorting ascending (1 to onwards)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [transactions, selectedMonth]
  );

  const stats = useMemo(() => filtered.reduce((acc, t) => {
    if (t.type === TransactionType.INCOME) acc.inc += t.amount;
    else acc.exp += t.amount;
    return acc;
  }, { inc: 0, exp: 0 }), [filtered]);

  const monthYear = new Date(selectedMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });

  const generatePDF = async () => {
    try {
      const doc = await PdfGenerator.initPDF();

      PdfGenerator.addHeader(
        doc,
        'MONTHLY FINANCIAL STATEMENT',
        '',
        `STATEMENT PERIOD: ${monthYear.toUpperCase()}`
      );

      // Financial Summary Dashboard
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 55, 170, 35, 3, 3, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL RECEIVED', 30, 65);
      doc.text('TOTAL EXPENSES', 85, 65);
      doc.text('NET BALANCE', 140, 65);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text(`PKR ${stats.inc.toLocaleString()}`, 30, 78);
      doc.text(`PKR ${stats.exp.toLocaleString()}`, 85, 78);

      const balance = stats.inc - stats.exp;
      if (balance >= 0) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(225, 29, 72);
      doc.text(`PKR ${balance.toLocaleString()}`, 140, 78);

      // Table Header text
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Transaction History', 20, 100);

      const tableColumn = ["Date", "Description / Remarks", "Type", "Amount (PKR)"];
      const tableRows = filtered.map(t => [
        t.date,
        t.description,
        t.type === TransactionType.INCOME ? 'Received' : 'Expense',
        t.amount.toLocaleString()
      ]);

      autoTable(doc, {
        startY: 110,
        head: [tableColumn],
        body: tableRows,
        styles: {
          font: 'Amiri', // Use the Urdu font
          fontStyle: 'normal',
          fontSize: 10,
          textColor: [30, 41, 59],
          valign: 'middle',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: 'bold',
          font: 'helvetica'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 'auto' }, // Description gets remaining space
          2: { cellWidth: 30 },
          3: { cellWidth: 35, halign: 'right' },
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252]
        },
        margin: { top: 30, right: 20, left: 20 },
        didParseCell: (data: any) => {
          // Color coding for amount column
          if (data.section === 'body' && data.column.index === 3) {
            const isIncome = filtered[data.row.index].type === TransactionType.INCOME;
            if (isIncome) {
              data.cell.styles.textColor = [16, 185, 129];
            } else {
              data.cell.styles.textColor = [225, 29, 72];
            }
          }
        }
      });

      PdfGenerator.addFooter(doc);

      doc.save(`RDF_Financial_Statement_${selectedMonth}.pdf`);
    } catch (error) {
      console.error(error);
      alert("Error generating statement: " + (error as any).message);
    }
  };

  const netBalance = stats.inc - stats.exp;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Financial Reports</h1>
          <p className="font-urdu text-lg text-slate-400 mt-1 leading-none">مالی رپورٹس اور تفصیلات</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-100 p-1.5 rounded-xl flex items-center shadow-sm">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest px-3">Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border-none px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer"
            />
          </div>
          <button
            onClick={generatePDF}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-800 transition-all shadow-md active:scale-95 group h-[44px]"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[8px] font-black uppercase tracking-widest">Download PDF Statement</span>
              <span className="font-urdu text-[10px] opacity-70">پی ڈی ایف رپورٹ</span>
            </div>
          </button>
        </div>
      </header>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 leading-none">Payment Received</p>
          <div className="text-2xl font-black text-emerald-600 mb-0.5 leading-none">PKR {stats.inc.toLocaleString()}</div>
          <p className="font-urdu text-base font-bold text-slate-400 leading-none">ادائیگی موصول ہوئی</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 leading-none">Monthly Expenses</p>
          <div className="text-2xl font-black text-rose-600 mb-0.5 leading-none">PKR {stats.exp.toLocaleString()}</div>
          <p className="font-urdu text-base font-bold text-slate-400 leading-none">کل اخراجات</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 leading-none">Net Balance</p>
          <div className={`text-2xl font-black mb-0.5 leading-none ${netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>PKR {netBalance.toLocaleString()}</div>
          <p className={`font-urdu text-base font-bold leading-none ${netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>خالص منافع</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h2 className="font-black text-slate-800 uppercase tracking-widest text-[10px] leading-none">Statement Entries ({filtered.length})</h2>
          <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">{monthYear}</span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                <th className="px-6 py-3">Date</th>
                <th className="px-3 py-3">Description / Remarks</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-bold text-slate-500">{t.date}</span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col overflow-hidden max-w-[200px] md:max-w-none">
                      <span className="font-black text-slate-800 text-sm tracking-tight truncate leading-tight">{t.description}</span>
                      <span className="font-urdu text-xs text-slate-400 mt-0.5 leading-none truncate" dir="auto">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className={`text-base font-black leading-none ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'} {t.amount.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-300 font-bold text-xs italic">
                    No transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
