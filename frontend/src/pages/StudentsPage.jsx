import { useEffect, useState, useCallback } from 'react';
import {
    Search, Plus, UserCheck, UserX, Pencil,
    Loader2, AlertCircle, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../lib/axios';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    return status === 'active'
        ? <span className="badge badge-green">Active</span>
        : <span className="badge badge-red">Inactive</span>;
}

// ── Add/Edit Student Modal ────────────────────────────────────────────────────
const EMPTY_FORM = {
    full_name: '', phone: '', guardian_name: '',
    class_name: '', monthly_fee: '', admission_date: '',
    status: 'active',
};

function StudentModal({ student, onClose, onSaved }) {
    const [form, setForm] = useState(student ?? EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isEdit = Boolean(student?.id);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...form,
                monthly_fee: parseFloat(form.monthly_fee) || 0,
                admission_date: form.admission_date || null,
                phone: form.phone || null,
                guardian_name: form.guardian_name || null,
                class_name: form.class_name || null,
            };
            if (isEdit) {
                await api.patch(`/students/${student.id}`, payload);
            } else {
                await api.post('/students/', payload);
            }
            onSaved();
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to save student.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            {/* Modal */}
            <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-white">{isEdit ? 'Edit Student' : 'Add New Student'}</h2>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={18} /></button>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="text-xs text-slate-400 mb-1 block">Full Name *</label>
                            <input name="full_name" required value={form.full_name} onChange={handleChange} className="input" placeholder="Rahul Sharma" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Phone</label>
                            <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+91 99999 00000" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Guardian Name</label>
                            <input name="guardian_name" value={form.guardian_name} onChange={handleChange} className="input" placeholder="Parent name" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Class / Batch</label>
                            <input name="class_name" value={form.class_name} onChange={handleChange} className="input" placeholder="Grade 10 - A" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Monthly Fee (₹)</label>
                            <input name="monthly_fee" type="number" min="0" step="0.01" value={form.monthly_fee} onChange={handleChange} className="input" placeholder="2500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Admission Date</label>
                            <input name="admission_date" type="date" value={form.admission_date} onChange={handleChange} className="input" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Status</label>
                            <select name="status" value={form.status} onChange={handleChange} className="input">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : (isEdit ? 'Update' : 'Add Student')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Students Page ─────────────────────────────────────────────────────────────
export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const PAGE_SIZE = 15;

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page, page_size: PAGE_SIZE };
            if (search) params.search = search;
            const { data } = await api.get('/students/', { params });
            setStudents(data.items);
            setTotal(data.total);
            setPages(data.pages);
        } catch {
            setError('Failed to load students.');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    function openAdd() { setEditTarget(null); setModalOpen(true); }
    function openEdit(student) { setEditTarget(student); setModalOpen(true); }
    function handleSaved() { setModalOpen(false); fetchStudents(); }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white">Students</h2>
                    <p className="text-sm text-slate-500">{total} total enrolled</p>
                </div>
                <button onClick={openAdd} className="btn-primary text-sm">
                    <Plus size={16} /> Add Student
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="input pl-9"
                />
            </div>

            {/* Table */}
            <div className="card !p-0 overflow-hidden">
                {error && (
                    <div className="flex items-center gap-2 p-4 text-red-400 text-sm">
                        <AlertCircle size={15} />{error}
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 size={28} className="animate-spin text-brand-500" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-sm">
                        {search ? `No students match "${search}"` : 'No students yet — add one!'}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-surface-500)]">
                                {['Name', 'Class', 'Phone', 'Monthly Fee', 'Status', ''].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-surface-500)]">
                            {students.map((s) => (
                                <tr key={s.id} className="hover:bg-[var(--color-surface-600)] transition-colors group">
                                    <td className="px-4 py-3 font-medium text-white">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                                                {s.full_name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{s.full_name}</p>
                                                {s.guardian_name && <p className="text-xs text-slate-500">{s.guardian_name}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">{s.class_name ?? '—'}</td>
                                    <td className="px-4 py-3 text-slate-300">{s.phone ?? '—'}</td>
                                    <td className="px-4 py-3 text-slate-300">₹{Number(s.monthly_fee).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => openEdit(s)}
                                            className="btn-ghost !p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-surface-500)] text-sm">
                        <span className="text-slate-500">Page {page} of {pages}</span>
                        <div className="flex gap-1">
                            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost !p-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button>
                            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !p-1.5 disabled:opacity-30"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add / Edit modal */}
            {modalOpen && (
                <StudentModal
                    student={editTarget}
                    onClose={() => setModalOpen(false)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
