import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
    Wallet, Plus, Loader2, AlertCircle, X,
    ChevronDown, ChevronUp, Calendar, CreditCard,
} from 'lucide-react';
import api from '../lib/axios';

// ── Payment Modal ─────────────────────────────────────────────────────────────
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
        e.preventDefault(); setLoading(true); setError('');
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
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
                            <Wallet size={18} className="text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-800">Record Payment</h2>
                            <p className="text-xs text-gray-400">{student.full_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={18} /></button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-4">
                            <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount Paid (₹) *</label>
                            <input
                                name="amount_paid" type="number" min="1" step="0.01" required
                                value={form.amount_paid} onChange={handleChange}
                                placeholder={`₹${Number(student.monthly_fee).toLocaleString('en-IN')}`}
                                className="input"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Payment Date</label>
                                <input name="payment_date" type="date" value={form.payment_date} onChange={handleChange} className="input" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Month Covered</label>
                                <input name="month_covered" type="month"
                                    value={form.month_covered.slice(0, 7)}
                                    onChange={(e) => setForm((p) => ({ ...p, month_covered: e.target.value + '-01' }))}
                                    className="input"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Payment Method</label>
                            <select name="payment_method" value={form.payment_method} onChange={handleChange} className="input">
                                <option value="cash">💵 Cash</option>
                                <option value="upi">📱 UPI</option>
                                <option value="bank_transfer">🏦 Bank Transfer</option>
                                <option value="cheque">📄 Cheque</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Notes (optional)</label>
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
        </div>
    );
}

// ── Student fee row ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    'from-violet-400 to-purple-500', 'from-blue-400 to-indigo-500',
    'from-green-400 to-emerald-500', 'from-pink-400 to-rose-500',
    'from-amber-400 to-orange-500',
];
function avatarColor(name) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

const METHOD_EMOJI = { cash: '💵', upi: '📱', bank_transfer: '🏦', cheque: '📄' };

function StudentFeeRow({ student, onPay }) {
    const [expanded, setExpanded] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const monthly = Number(student.monthly_fee);

    async function toggleExpand() {
        if (!expanded && history.length === 0) {
            setLoading(true);
            try {
                const { data } = await api.get(`/fees/student/${student.id}`);
                setHistory(data.payments ?? []);
            } catch { /* silent */ }
            finally { setLoading(false); }
        }
        setExpanded((v) => !v);
    }

    const lastPayment = history[0];

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Student row */}
            <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={toggleExpand}>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(student.full_name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {student.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{student.full_name}</p>
                    <p className="text-xs text-gray-400">{student.class_name ?? '—'}</p>
                </div>
                <div className="text-right hidden sm:block mr-4">
                    <p className="text-sm font-bold text-gray-800">₹{monthly.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-400">/month</p>
                </div>
                <div className="text-right mr-4 hidden md:block">
                    {lastPayment ? (
                        <>
                            <p className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10} /> Last paid</p>
                            <p className="text-xs font-medium text-emerald-600">{format(new Date(lastPayment.payment_date), 'd MMM yyyy')}</p>
                        </>
                    ) : (
                        <span className="text-xs font-medium text-red-500">Never paid</span>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onPay(student); }}
                    className="btn-primary !py-1.5 !px-3 text-xs shrink-0"
                >
                    <Plus size={12} /> Pay
                </button>
                <div className="text-gray-300 ml-1">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Payment history */}
            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                    {loading ? (
                        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-500" /></div>
                    ) : history.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-3">No payments recorded yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {history.map((p) => (
                                <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                    <span className="text-base">{METHOD_EMOJI[p.payment_method] ?? '💳'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800">{format(new Date(p.payment_date), 'd MMM yyyy')}</p>
                                        <p className="text-xs text-gray-400">{format(new Date(p.month_covered), 'MMMM yyyy')}</p>
                                    </div>
                                    <p className="text-sm font-bold text-emerald-600">₹{Number(p.amount_paid).toLocaleString('en-IN')}</p>
                                    {p.notes && <p className="text-xs text-gray-400 hidden sm:block truncate max-w-24">{p.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
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
        setLoading(true); setError('');
        try {
            const { data } = await api.get('/students/', { params: { page: 1, page_size: 100, status: 'active' } });
            setStudents(data.items);
        } catch { setError('Failed to load students.'); }
        finally { setLoading(false); }
    }, [refreshKey]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    function handleSaved() { setPayTarget(null); setRefreshKey((k) => k + 1); }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Fee Payments</h2>
                <p className="text-sm text-gray-400 mt-0.5">Click a row to expand payment history · Click Pay to record a payment</p>
            </div>

            {/* List */}
            {error && (
                <div className="card flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle size={15} /> {error}
                </div>
            )}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : students.length === 0 ? (
                <div className="text-center py-20">
                    <CreditCard size={28} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No active students to show.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {students.map((s) => (
                        <StudentFeeRow key={s.id} student={s} onPay={setPayTarget} />
                    ))}
                </div>
            )}

            {payTarget && (
                <PaymentModal student={payTarget} onClose={() => setPayTarget(null)} onSaved={handleSaved} />
            )}
        </div>
    );
}
