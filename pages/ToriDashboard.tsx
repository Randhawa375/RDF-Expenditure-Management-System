
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { ToriRecord } from '../types';
import ToriFormModal from '../components/ToriFormModal';

const ToriDashboard: React.FC = () => {
    const [records, setRecords] = useState<ToriRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
                <button
                    onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow hover:brightness-105 active:scale-95 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Tori Record (نیا ریکارڈ)
                </button>
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
                />
            )}
        </div>
    );
};

export default ToriDashboard;
