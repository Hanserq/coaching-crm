import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
    Wallet, Plus, Loader2, AlertCircle, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../lib/axios';

// ── Record Payment Modal ──────────────────────────────────────────────────────
function PaymentModal({ student, onClose, onSaved }) {
    const [form, setForm] = useState({
        amount_paid: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        month_covered: format(new Date(), 'yyyy-MM-01'),
        payment_method: 'cash',
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/fees/', {
                student_id: student.id,
                amount_paid: parseFloat(form.amount_paid),
                payment_date: form.payment_date,
                month_covered: form.month_covered,
                payment_method: form.payment_method,
                notes: form.notes || null,
            });
            onSaved();
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to record payment.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative card w-full max-w-md">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-white">Record Payment</h2>
                        <p className="text-sm text-slate-400">{student.full_name}</p>
                    </div>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={18} /></button>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Amount Paid (₹) *</label>
                        <input
                            name="amount_paid" type="number" min="1" step="0.01" required
                            value={form.amount_paid} onChange={handleChange}
                            placeholder={`₹${Number(student.monthly_fee).toLocaleString('en-IN')}`}
                            className="input"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Payment Date</label>
                            <input name="payment_date" type="date" value={form.payment_date} onChange={handleChange} className="input" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Month Covered</label>
                            <input name="month_covered" type="month" value={form.month_covered.slice(0, 7)}
                                onChange={(e) => setForm((p) => ({ ...p, month_covered: e.target.value + '-01' }))}
                                className="input" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Payment Method</label>
                        <select name="payment_method" value={form.payment_method} onChange={handleChange} className="input">
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
                        <input name="notes" value={form.notes} onChange={handleChange} className="input" placeholder="e.g. Partial payment" />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Student row with expandable payment history ───────────────────────────────
function StudentFeeRow({ student, onPay }) {
    const [expanded, setExpanded] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const monthly = Number(student.monthly_fee);

    async function toggleExpand() {
        if (!expanded && history.length === 0) {
            setLoading(true);
            try {
                const { data } = await api.get(`/fees/student/${student.id}`, { params: { page: 1, page_size: 12 } });
                setHistory(data.items ?? data);
            } catch { /* silent */ }
            finally { setLoading(false); }
        }
        setExpanded((v) => !v);
    }

    const lastPayment = history[0];

    return (
        <>
            <tr className="hover:bg-[var(--color-surface-600)] transition-colors group cursor-pointer" onClick={toggleExpand}>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                            {student.full_name[0].toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">{student.full_name}</p>
                            <p className="text-xs text-slate-500">{student.class_name ?? '—'}</p>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-3 text-slate-300 text-sm">₹{monthly.toLocaleString('en-IN')}/mo</td>
                <td className="px-4 py-3 text-sm text-slate-400">
                    {lastPayment
                        ? format(new Date(lastPayment.payment_date), 'd MMM yyyy')
                        : <span className="text-red-400">Never</span>}
                </td>
                <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onPay(student); }}
                            className="btn-primary text-xs !py-1 !px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Plus size={13} /> Pay
                        </button>
                        {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                    </div>
                </td>
            </tr>

            {/* Expanded payment history */}
            {expanded && (
                <tr>
                    <td colSpan={4} className="bg-[var(--color-surface-800)] px-4 py-3">
                        {loading ? (
                            <div className="flex justify-center py-3"><Loader2 size={18} className="animate-spin text-brand-500" /></div>
                        ) : history.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 py-2">No payment history yet.</p>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-slate-500">
                                        {['Date', 'Amount', 'Month', 'Method', 'Notes'].map((h) => (
                                            <th key={h} className="text-left pb-2 pr-4 font-medium uppercase tracking-wide">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((p) => (
                                        <tr key={p.id} className="border-t border-[var(--color-surface-500)]">
                                            <td className="py-1.5 pr-4 text-slate-400">{format(new Date(p.payment_date), 'd MMM yy')}</td>
                                            <td className="py-1.5 pr-4 text-green-400 font-medium">₹{Number(p.amount_paid).toLocaleString('en-IN')}</td>
                                            <td className="py-1.5 pr-4 text-slate-400">{format(new Date(p.month_covered), 'MMM yyyy')}</td>
                                            <td className="py-1.5 pr-4 text-slate-400 capitalize">{p.payment_method}</td>
                                            <td className="py-1.5 pr-4 text-slate-500">{p.notes ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ── Fees Page ─────────────────────────────────────────────────────────────────
export default function FeesPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [payTarget, setPayTarget] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/students/', { params: { page: 1, page_size: 200, status: 'active' } });
            setStudents(data.items);
        } catch {
            setError('Failed to load students.');
        } finally {
            setLoading(false);
        }
    }, [refreshKey]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    function handleSaved() {
        setPayTarget(null);
        setRefreshKey((k) => k + 1);
    }

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-xl font-bold text-white">Fee Payments</h2>
                <p className="text-sm text-slate-500">Click a row to expand payment history · hover to record a payment</p>
            </div>

            <div className="card !p-0 overflow-hidden">
                {error && (
                    <div className="flex items-center gap-2 p-4 text-red-400 text-sm">
                        <AlertCircle size={15} /> {error}
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 size={28} className="animate-spin text-brand-500" />
                    </div>
                ) : students.length === 0 ? (
                    <p className="text-center py-12 text-slate-500 text-sm">No active students.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-surface-500)]">
                                {['Student', 'Monthly Fee', 'Last Payment', ''].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-surface-500)]">
                            {students.map((s) => (
                                <StudentFeeRow key={s.id} student={s} onPay={setPayTarget} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {payTarget && (
                <PaymentModal student={payTarget} onClose={() => setPayTarget(null)} onSaved={handleSaved} />
            )}
        </div>
    );
}
