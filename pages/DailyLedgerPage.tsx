
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Transaction, TransactionType } from '../types';
import { jsPDF } from 'jspdf';

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

  const dayItems = useMemo(() => {
    return transactions
      .filter(t => t.type === type && t.date === date)
      .sort((a, b) => a.id.localeCompare(b.id)); // Order items chronologically by entry ID (ascending)
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

  const downloadDailyReport = () => {
    try {
      const doc = new jsPDF();
      const category = isExpense ? 'EXPENSE' : 'PAYMENT RECEIVED';
      const timestamp = new Date().toLocaleString();

      // Top Branding Banner
      doc.setFillColor(isExpense ? 225 : 16, isExpense ? 29 : 185, isExpense ? 72 : 129);
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('RDF EXPENDITURE', 20, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`DAILY ${category} REPORT`, 20, 33);
      doc.text(`DATE: ${displayDate.toUpperCase()}`, 190, 25, { align: 'right' });
      doc.setFontSize(8);
      doc.text(`Generated: ${timestamp}`, 190, 31, { align: 'right' });

      // Daily Total Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, 55, 170, 25, 2, 2, 'FD');

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DAILY TOTAL AMOUNT:', 30, 71);

      doc.setTextColor(isExpense ? 225 : 16, isExpense ? 29 : 185, isExpense ? 72 : 129);
      doc.setFontSize(18);
      doc.text(`PKR ${total.toLocaleString()}`, 190, 71, { align: 'right' });

      // Table Header
      let y = 100;
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 6, 170, 10, 'F');

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.text('SR#', 25, y);
      doc.text('DESCRIPTION / REMARKS', 45, y);
      doc.text('AMOUNT (PKR)', 185, y, { align: 'right' });

      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      dayItems.forEach((t, index) => {
        if (y > 275) { doc.addPage(); y = 25; }

        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, y - 5, 170, 9, 'F');
        }

        doc.text((index + 1).toString(), 25, y);
        const desc = t.description.length > 75 ? t.description.substring(0, 72) + '...' : t.description;
        doc.text(desc, 45, y);
        doc.text(t.amount.toLocaleString(), 185, y, { align: 'right' });

        y += 9;
      });

      doc.save(`RDF_Daily_${isExpense ? 'Expense' : 'Received'}_${date}.pdf`);
    } catch (e) { alert("Error generating PDF"); }
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
          dayItems.map((t) => (
            <div key={t.id} className="bg-white px-6 py-4 rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between group hover:border-slate-200 transition-all">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center ${isExpense ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div className="truncate">
                  <div className="font-black text-slate-900 text-base tracking-tight truncate leading-tight">{t.description}</div>
                  <div className="text-[8px] text-slate-300 uppercase tracking-widest font-black mt-0.5 leading-none">Record Detail</div>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0 ml-4">
                <div className={`text-xl font-black ${accentText} leading-none`}>
                  {t.amount.toLocaleString()}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onEdit(t)}
                    className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))
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
