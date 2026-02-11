
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { ToriRecord } from '../types';
import ToriFormModal from '../components/ToriFormModal';
import { PdfGenerator } from '../services/pdfGenerator';

const ToriDashboard: React.FC = () => {
    const [records, setRecords] = useState<ToriRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'FULL' | 'PAYMENT_ONLY'>('FULL');
    const [editingRecord, setEditingRecord] = useState<ToriRecord | null>(null);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const data = await db.getToriRecords();
            setRecords(data);
        } catch (error) {
            console.error("Error fetching Tori records:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const stats = useMemo(() => {
        return records.reduce((acc, r) => {
            acc.totalMun += r.mun;
            acc.totalDue += (r.mun * r.price_per_mun);
            acc.totalPaid += r.payment_given;
            return acc;
        }, { totalMun: 0, totalDue: 0, totalPaid: 0 });
    }, [records]);

    const remainingBalance = stats.totalDue - stats.totalPaid;

    const handleSave = async (record: ToriRecord) => {
        try {
            await db.saveToriRecord(record);
            fetchRecords();
            setIsModalOpen(false);
            setEditingRecord(null);
        } catch (error) {
            alert('Error saving record: ' + (error as Error).message);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this record? کیا آپ اسے حذف کرنا چاہتے ہیں؟')) {
            try {
                await db.deleteToriRecord(id);
                fetchRecords();
            } catch (error) {
                console.error("Error deleting record:", error);
            }
        }
    };

    const downloadReport = async () => {
        try {
            const doc = await PdfGenerator.initPDF();
            PdfGenerator.addHeader(doc, 'TORI LEDGER REPORT', 'RDF EMS', `GENERATED: ${new Date().toLocaleDateString()}`);

            const tableColumn = ["Date", "Mun (Weight)", "Price/Mun", "Total Bill", "Paid", "Description"];
            const tableRows = records.map(r => [
                r.date,
                r.mun,
                r.price_per_mun.toLocaleString(),
                (r.mun * r.price_per_mun).toLocaleString(),
                r.payment_given.toLocaleString(),
                r.description
            ]);

            (doc as any).autoTable({
                startY: 50,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                styles: { font: 'Amiri', fontSize: 9 },
                headStyles: { fillColor: [79, 70, 229] } // Indigo 600
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`Total Mun: ${stats.totalMun}`, 14, finalY);
            doc.text(`Total Due: PKR ${stats.totalDue.toLocaleString()}`, 14, finalY + 5);
            doc.text(`Total Paid: PKR ${stats.totalPaid.toLocaleString()}`, 14, finalY + 10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Remaining Balance: PKR ${remainingBalance.toLocaleString()}`, 14, finalY + 15);

            PdfGenerator.addFooter(doc);
            doc.save('Tori_Ledger_Report.pdf');
        } catch (e) {
            alert('Error generating PDF');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Tori Dashboard (تھوری کا کھاتہ)
                    </h1>
                    <p className="text-slate-500 mt-1 font-urdu">
                        Track weight in Mun, prices, and payments for Tori.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={downloadReport}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Report
                    </button>
                    <button
                        onClick={() => { setModalMode('PAYMENT_ONLY'); setEditingRecord(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Add Payment (رقم کی ادائیگی)
                    </button>
                    <button
                        onClick={() => { setModalMode('FULL'); setEditingRecord(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Tori (من ڈالیں)
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Mun</p>
                    <h2 className="text-2xl font-black text-slate-900">{stats.totalMun.toLocaleString()}</h2>
                    <p className="text-slate-400 font-urdu mt-1 italic text-xs">کل من</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Due</p>
                    <h2 className="text-2xl font-black text-slate-900">PKR {stats.totalDue.toLocaleString()}</h2>
                    <p className="text-slate-400 font-urdu mt-1 italic text-xs">کل واجب الادا</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Paid</p>
                    <h2 className="text-2xl font-black text-emerald-600">PKR {stats.totalPaid.toLocaleString()}</h2>
                    <p className="text-slate-400 font-urdu mt-1 italic text-xs">کل ادائیگی</p>
                </div>
                <div className="bg-indigo-900 p-6 rounded-3xl shadow-lg text-white">
                    <p className="text-indigo-300 font-bold uppercase tracking-widest text-[10px] mb-1">Remaining</p>
                    <h2 className="text-2xl font-black">PKR {remainingBalance.toLocaleString()}</h2>
                    <p className="text-indigo-300 font-urdu mt-1 italic text-xs">بقیہ رقم</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : records.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 font-urdu">No records found. (کوئی ریکارڈ نہیں ملا)</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mun (Weight)</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price/Mun</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Bill</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Paid</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {records.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{r.date}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{r.mun}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{r.price_per_mun.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-black text-slate-900">{(r.mun * r.price_per_mun).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">{r.payment_given.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500 font-urdu">{r.description}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {r.slip_url && (
                                                <a
                                                    href={r.slip_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50"
                                                    title="View Slip"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </a>
                                            )}
                                            <button
                                                onClick={() => { setEditingRecord(r); setIsModalOpen(true); }}
                                                className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <ToriFormModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingRecord(null); }}
                    onSave={handleSave}
                    editRecord={editingRecord}
                    mode={modalMode}
                />
            )}
        </div>
    );
};

export default ToriDashboard;
