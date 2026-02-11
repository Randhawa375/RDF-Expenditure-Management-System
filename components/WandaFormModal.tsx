
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { WandaRecord } from '../types';

interface WandaFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: WandaRecord) => void;
    editRecord: WandaRecord | null;
    mode?: 'FULL' | 'PAYMENT_ONLY';
}

const WandaFormModal: React.FC<WandaFormModalProps> = ({ isOpen, onClose, onSave, editRecord, mode = 'FULL' }) => {
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [bags, setBags] = useState('');
    const [pricePerBag, setPricePerBag] = useState('');
    const [paymentGiven, setPaymentGiven] = useState('');
    const [description, setDescription] = useState('');
    const [slipUrl, setSlipUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (editRecord) {
            setDate(editRecord.date);
            setBags(editRecord.bags.toString());
            setPricePerBag(editRecord.price_per_bag.toString());
            setPaymentGiven(editRecord.payment_given.toString());
            setDescription(editRecord.description);
            setSlipUrl(editRecord.slip_url || '');
        } else {
            resetForm();
            if (mode === 'PAYMENT_ONLY') {
                setBags('0');
                setPricePerBag('0');
                setDescription('Payment Given');
            }
        }
    }, [editRecord, mode, isOpen]);

    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setBags('');
        setPricePerBag('');
        setPaymentGiven('');
        setDescription('');
        setSlipUrl('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const publicUrl = await db.uploadFile('slips', `wanda/${fileName}`, file);
            setSlipUrl(publicUrl);
        } catch (error) {
            alert('Upload failed: ' + (error as Error).message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: editRecord ? editRecord.id : crypto.randomUUID(),
            date,
            bags: Number(bags),
            price_per_bag: Number(pricePerBag),
            payment_given: Number(paymentGiven) || 0,
            description,
            slip_url: slipUrl
        });
    };

    if (!isOpen) return null;

    const isPaymentOnly = mode === 'PAYMENT_ONLY';

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                            {editRecord ? 'Edit Wanda Record' : isPaymentOnly ? 'Add Wanda Payment' : 'Add Wanda Bags'}
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5 font-urdu">
                            {editRecord ? 'ریکارڈ تبدیل کریں' : isPaymentOnly ? 'رقم کی ادائیگی' : 'بوریاں شامل کریں'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Number of Bags</label>
                            <input
                                type="number"
                                required={!isPaymentOnly}
                                disabled={isPaymentOnly}
                                value={bags}
                                onChange={(e) => setBags(e.target.value)}
                                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none ${isPaymentOnly ? 'opacity-50' : ''}`}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Price Per Bag</label>
                            <input
                                type="number"
                                required={!isPaymentOnly}
                                disabled={isPaymentOnly}
                                value={pricePerBag}
                                onChange={(e) => setPricePerBag(e.target.value)}
                                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none ${isPaymentOnly ? 'opacity-50' : ''}`}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Payment Given</label>
                            <input
                                type="number"
                                required={isPaymentOnly}
                                value={paymentGiven}
                                onChange={(e) => setPaymentGiven(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Upload Slip (رسید اپلوڈ کریں)</label>
                        <div className="flex gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="flex-1 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {uploading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>}
                        </div>
                        {slipUrl && (
                            <div className="mt-2 relative inline-block">
                                <img src={slipUrl} alt="Slip Preview" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                                <button
                                    type="button"
                                    onClick={() => setSlipUrl('')}
                                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Description (تفصیل)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none h-20"
                            placeholder="..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest"
                    >
                        Save Record (محفوظ کریں)
                    </button>
                </form>
            </div>
        </div>
    );
};

export default WandaFormModal;
