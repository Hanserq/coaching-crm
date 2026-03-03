import { useEffect, useState, useCallback } from 'react';
import {
    Search, Plus, Pencil, Trash2,
    Loader2, AlertCircle, X, ChevronLeft, ChevronRight,
    UserX, CheckCircle,
} from 'lucide-react';
import api from '../lib/axios';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    return status === 'active'
        ? <span className="badge badge-green flex items-center gap-1"><CheckCircle size={10} />Active</span>
        : <span className="badge badge-red flex items-center gap-1"><UserX size={10} />Inactive</span>;
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
function ConfirmModal({ student, onClose, onConfirm, loading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={22} className="text-red-500" />
                </div>
                <h3 className="text-base font-bold text-gray-800 text-center mb-1">Remove Student?</h3>
                <p className="text-sm text-gray-500 text-center">
                    This will mark <span className="font-semibold text-gray-800">{student.full_name}</span> as inactive.
                    Their attendance and payment history will be preserved.
                </p>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
                    <button onClick={onConfirm} disabled={loading} className="flex-1 btn-danger justify-center !py-2 !text-sm font-semibold">
                        {loading ? <Loader2 size={15} className="animate-spin" /> : 'Remove'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Add/Edit Student Modal ────────────────────────────────────────────────────
const EMPTY_FORM = {
    full_name: '', phone: '', guardian_name: '',
    class_name: '', monthly_fee: '', admission_date: '',
    status: 'active',
};

function StudentModal({ student, onClose, onSaved }) {
    const [form, setForm] = useState(student ? {
        ...student,
        monthly_fee: student.monthly_fee ?? '',
        admission_date: student.admission_date ?? '',
        phone: student.phone ?? '',
        guardian_name: student.guardian_name ?? '',
        class_name: student.class_name ?? '',
    } : EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isEdit = Boolean(student?.id);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const payload = {
                ...form,
                monthly_fee: parseFloat(form.monthly_fee) || 0,
                admission_date: form.admission_date || null,
                phone: form.phone || null,
                guardian_name: form.guardian_name || null,
                class_name: form.class_name || null,
            };
            if (isEdit) await api.patch(`/students/${student.id}`, payload);
            else await api.post('/students/', payload);
            onSaved();
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Failed to save student.');
        } finally { setLoading(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-bold text-gray-800">{isEdit ? 'Edit Student' : 'Add New Student'}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{isEdit ? 'Update student details' : 'Fill in the student information below'}</p>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Full Name *</label>
                                <input name="full_name" required value={form.full_name} onChange={handleChange} className="input" placeholder="Rahul Sharma" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone</label>
                                <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+91 99999 00000" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Guardian Name</label>
                                <input name="guardian_name" value={form.guardian_name} onChange={handleChange} className="input" placeholder="Parent name" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Class / Batch</label>
                                <input name="class_name" value={form.class_name} onChange={handleChange} className="input" placeholder="Grade 10 - A" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Monthly Fee (₹)</label>
                                <input name="monthly_fee" type="number" min="0" step="0.01" value={form.monthly_fee} onChange={handleChange} className="input" placeholder="2500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Admission Date</label>
                                <input name="admission_date" type="date" value={form.admission_date} onChange={handleChange} className="input" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status</label>
                                <select name="status" value={form.status} onChange={handleChange} className="input">
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : (isEdit ? 'Update Student' : 'Add Student')}
                            </button>
                        </div>
                    </form>
                </div>
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
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const PAGE_SIZE = 15;

    const fetchStudents = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = { page, page_size: PAGE_SIZE };
            if (search) params.search = search;
            const { data } = await api.get('/students/', { params });
            setStudents(data.items);
            setTotal(data.total);
            setPages(data.pages);
        } catch { setError('Failed to load students.'); }
        finally { setLoading(false); }
    }, [page, search]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    function openAdd() { setEditTarget(null); setModalOpen(true); }
    function openEdit(s) { setEditTarget(s); setModalOpen(true); }
    function handleSaved() { setModalOpen(false); fetchStudents(); }

    async function handleDelete() {
        setDeleteLoading(true);
        try {
            await api.delete(`/students/${deleteTarget.id}`);
            setDeleteTarget(null);
            fetchStudents();
        } catch { /* silently skip */ }
        finally { setDeleteLoading(false); }
    }

    // Avatar color based on first letter
    const avatarColor = (name) => {
        const colors = ['from-violet-400 to-purple-600', 'from-blue-400 to-indigo-600', 'from-green-400 to-emerald-600', 'from-pink-400 to-rose-600', 'from-amber-400 to-orange-600'];
        return colors[name.charCodeAt(0) % colors.length];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Students</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{total} students enrolled</p>
                </div>
                <button onClick={openAdd} className="btn-primary">
                    <Plus size={16} /> Add Student
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name or phone…"
                    className="input pl-10"
                />
            </div>

            {/* Card */}
            <div className="card !p-0 overflow-hidden">
                {error && (
                    <div className="flex items-center gap-2 p-4 text-red-500 text-sm border-b border-gray-100">
                        <AlertCircle size={15} />{error}
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center p-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
                ) : students.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Users size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm">{search ? `No students match "${search}"` : 'No students yet — add one!'}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/60">
                                {['Student', 'Class', 'Phone', 'Monthly Fee', 'Status', ''].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(s.full_name)} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                                                {s.full_name[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800">{s.full_name}</p>
                                                {s.guardian_name && <p className="text-xs text-gray-400">Parent: {s.guardian_name}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-gray-600">{s.class_name ?? '—'}</td>
                                    <td className="px-4 py-3.5 text-gray-600">{s.phone ?? '—'}</td>
                                    <td className="px-4 py-3.5 font-semibold text-gray-800">₹{Number(s.monthly_fee).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3.5"><StatusBadge status={s.status} /></td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(s)} className="btn-ghost !p-1.5 text-gray-400 hover:text-brand-500">
                                                <Pencil size={14} />
                                            </button>
                                            {s.status === 'active' && (
                                                <button onClick={() => setDeleteTarget(s)} className="btn-ghost !p-1.5 text-gray-400 hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm bg-gray-50/40">
                        <span className="text-gray-400">Page {page} of {pages} · {total} students</span>
                        <div className="flex gap-1">
                            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost !p-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button>
                            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !p-1.5 disabled:opacity-30"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {modalOpen && <StudentModal student={editTarget} onClose={() => setModalOpen(false)} onSaved={handleSaved} />}
            {deleteTarget && (
                <ConfirmModal
                    student={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDelete}
                    loading={deleteLoading}
                />
            )}
        </div>
    );
}
