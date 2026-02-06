
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Transaction, TransactionType } from '../types';
import { jsPDF } from 'jspdf';
import { PdfGenerator } from '../services/pdfGenerator';

interface DailyLedgerPageProps {
  type: TransactionType;
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onAdd: (date: string) => void;
}

const DailyLedgerPage: React.FC<DailyLedgerPageProps> = ({ type, transactions, onEdit, onDelete, onAdd }) => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dayItems = useMemo(() => {
    return transactions
      .filter(t => (t.type === type || (type === TransactionType.EXPENSE && t.type === TransactionType.TRANSFER)) && t.date === date)
      .sort((a, b) => a.id.localeCompare(b.id)); // Order items chronologically
  }, [transactions, type, date]);

  const total = useMemo(() => {
    return dayItems.reduce((sum, item) => sum + item.amount, 0);
  }, [dayItems]);

  if (!date) return null;

  const [y, m, d] = date.split('-').map(Number);
  const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-US', { dateStyle: 'medium' });
  const isExpense = type === TransactionType.EXPENSE;
  const accentText = isExpense ? 'text-rose-600' : 'text-emerald-600';
  const accentBg = isExpense ? 'bg-rose-500' : 'bg-emerald-500';

  const downloadDailyReport = async () => {
    try {
      const doc = await PdfGenerator.initPDF();
      const category = isExpense ? 'EXPENSE' : 'PAYMENT RECEIVED';

      PdfGenerator.addHeader(
        doc,
        `DAILY ${category}`,
        'RDF EMS',
        `DATE: ${displayDate.toUpperCase()}`,
        isExpense
      );

      // Daily Total Box
      const accentColor = isExpense ? [225, 29, 72] : [16, 185, 129];
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, 50, 170, 25, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DAILY TOTAL AMOUNT:', 30, 66);

      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setFontSize(16);
      doc.text(`PKR ${total.toLocaleString()}`, 190, 66, { align: 'right' });

      // Table Header
      let y = 90;
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(20, y - 7, 170, 10, 'F');

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('SR#', 25, y);
      doc.text('DESCRIPTION / REMARKS', 45, y);
      doc.text('AMOUNT (PKR)', 185, y, { align: 'right' });

      y += 8;
      // Switch to Urdu font for lists
      doc.setFont('Amiri', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      dayItems.forEach((t, index) => {
        if (y > 270) {
          doc.addPage();
          y = 30;
          // Re-head
          doc.setFillColor(15, 23, 42);
          doc.rect(20, y - 7, 170, 10, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('SR#', 25, y);
          doc.text('DESCRIPTION / REMARKS', 45, y);
          doc.text('AMOUNT (PKR)', 185, y, { align: 'right' });

          doc.setFont('Amiri', 'normal');
          doc.setTextColor(30, 41, 59);
          y += 10;
        }

        if (index % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(20, y - 6, 170, 10, 'F');
        }

        // SR#
        doc.text((index + 1).toString(), 25, y);

        const isTransfer = t.type === TransactionType.TRANSFER;
        const prefix = isTransfer ? '(Transfer) ' : '';
        const descText = prefix + t.description;
        const desc = descText.length > 75 ? descText.substring(0, 72) + '...' : descText;
        doc.text(desc, 45, y);

        doc.text(t.amount.toLocaleString(), 185, y, { align: 'right' });

        y += 10;
      });

      PdfGenerator.addFooter(doc);

      doc.save(`RDF_Daily_${isExpense ? 'Expense' : 'Received'}_${date}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error generating PDF");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-[10px] font-black text-slate-500 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 uppercase tracking-widest"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          Back (واپس)
        </button>
        <button
          onClick={() => onAdd(date)}
          className={`${accentBg} text-white px-5 py-2.5 rounded-xl text-[10px] font-black shadow hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          New Entry (نیا ریکارڈ)
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative">
        <div className="md:order-last">
          <button
            onClick={downloadDailyReport}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-800 transition-all shadow-md active:scale-95 group"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[8px] font-black uppercase tracking-widest">Download Report</span>
              <span className="font-urdu text-[10px] opacity-70">رپورٹ ڈاؤن لوڈ کریں</span>
            </div>
          </button>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{displayDate}</h1>
          <p className={`font-urdu text-lg font-bold mt-1 ${accentText} leading-none`}>
            {isExpense ? 'روزانہ کے اخراجات' : 'ادائیگی موصول ہوئی'}
          </p>
        </div>
        <div className="text-center md:text-right flex-1 md:border-r border-slate-50 md:mr-6 md:pr-6">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-0.5 leading-none">Daily Total</span>
          <div className={`text-3xl font-black ${accentText} leading-none`}>
            PKR {total.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {dayItems.length > 0 ? (
          dayItems.map((t) => {
            const isTransfer = t.type === TransactionType.TRANSFER;
            return (
              <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${isTransfer ? 'bg-indigo-50 text-indigo-500' :
                    isExpense ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
                    }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isTransfer ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isExpense ? "M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
                      )}
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                    <div className="flex justify-between items-start gap-4">
                      <div className={`font-urdu font-bold text-slate-800 text-lg leading-[2] tracking-wide ${expandedId === t.id ? 'whitespace-pre-wrap' : 'truncate'}`}>
                        {t.description}
                      </div>
                      <div className={`text-xl font-black shrink-0 ${isTransfer ? 'text-indigo-600' : accentText} tabular-nums tracking-tight`}>
                        {t.amount.toLocaleString()}
                      </div>
                    </div>

                    {/* Expand/Collapse Indicator */}
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${expandedId === t.id ? 'text-indigo-500' : 'text-slate-300 group-hover:text-slate-400'}`}>
                        {expandedId === t.id ? 'Show Less' : 'View Details'}
                      </span>
                      <svg className={`w-3 h-3 text-slate-300 transition-transform duration-300 ${expandedId === t.id ? 'rotate-180 text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                {/* Actions (Only visible when expanded or on hover on desktop) */}
                <div className={`mt-4 pt-4 border-t border-slate-50 flex justify-end gap-3 transition-all duration-300 ${expandedId === t.id ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                    className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-rose-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-slate-50 rounded-3xl p-12 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
            </div>
            <p className="font-black text-slate-300 tracking-tight text-lg mb-0.5 leading-none">No entries found.</p>
            <p className="font-urdu text-base text-slate-200 opacity-70 leading-none">کوئی ریکارڈ موجود نہیں ہے۔</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyLedgerPage;
