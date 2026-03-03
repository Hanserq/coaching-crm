import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
    BookOpen, Plus, X, Loader2, Trash2,
    ChevronDown, ChevronRight, Users, Calendar,
    Clock, Wifi, WifiOff, GraduationCap, AlertCircle,
} from 'lucide-react';
import api from '../lib/axios';

// ── Course form modal ─────────────────────────────────────────────────────────
function CourseModal({ initial, onClose, onSaved }) {
    const [form, setForm] = useState(initial ?? { name: '', description: '', duration_months: '', fee_amount: '' });
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        try {
            const payload = {
                ...form,
                fee_amount: parseFloat(form.fee_amount) || 0,
                duration_months: form.duration_months ? parseInt(form.duration_months) : null,
            };
            if (initial?.id) await api.patch(`/courses/${initial.id}`, payload);
            else await api.post('/courses/', payload);
            onSaved();
            onClose();
        } catch { } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{initial?.id ? 'Edit Course' : 'New Course'}</h3>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={16} /></button>
                </div>
                {[
                    { label: 'Course Name *', key: 'name', type: 'text' },
                    { label: 'Description', key: 'description', type: 'text' },
                    { label: 'Duration (months)', key: 'duration_months', type: 'number' },
                    { label: 'Monthly Fee (₹)', key: 'fee_amount', type: 'number' },
                ].map(({ label, key, type }) => (
                    <div key={key}>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                        <input type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} className="input" />
                    </div>
                ))}
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Course'}
                </button>
            </div>
        </div>
    );
}

// ── Batch modal ───────────────────────────────────────────────────────────────
function BatchModal({ courseId, initial, onClose, onSaved }) {
    const [form, setForm] = useState(initial ?? { name: '', schedule: '', teacher_name: '', capacity: '', classroom: '', start_date: '', end_date: '', is_online: false, status: 'active' });
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        try {
            const payload = { ...form, course_id: courseId, capacity: form.capacity ? parseInt(form.capacity) : null };
            if (!payload.start_date) delete payload.start_date;
            if (!payload.end_date) delete payload.end_date;
            if (initial?.id) await api.patch(`/courses/batches/${initial.id}`, payload);
            else await api.post('/courses/batches', payload);
            onSaved(); onClose();
        } catch { } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-3 max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{initial?.id ? 'Edit Batch' : 'New Batch'}</h3>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={16} /></button>
                </div>
                {[
                    { label: 'Batch Name *', key: 'name', type: 'text' },
                    { label: 'Schedule (e.g. Mon/Wed/Fri 7-9am)', key: 'schedule', type: 'text' },
                    { label: 'Teacher Name', key: 'teacher_name', type: 'text' },
                    { label: 'Classroom', key: 'classroom', type: 'text' },
                    { label: 'Capacity', key: 'capacity', type: 'number' },
                    { label: 'Start Date', key: 'start_date', type: 'date' },
                    { label: 'End Date', key: 'end_date', type: 'date' },
                ].map(({ label, key, type }) => (
                    <div key={key}>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                        <input type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} className="input" />
                    </div>
                ))}
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.is_online} onChange={(e) => setForm(f => ({ ...f, is_online: e.target.checked }))} className="rounded" />
                    Online batch
                </label>
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Batch'}
                </button>
            </div>
        </div>
    );
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onRefresh }) {
    const [open, setOpen] = useState(false);
    const [batches, setBatches] = useState([]);
    const [loadingB, setLoadingB] = useState(false);
    const [showBatch, setShowBatch] = useState(false);

    async function fetchBatches() {
        setLoadingB(true);
        try {
            const { data } = await api.get('/courses/batches', { params: { course_id: course.id } });
            setBatches(data);
        } catch { } finally { setLoadingB(false); }
    }

    function toggle() {
        if (!open) fetchBatches();
        setOpen((o) => !o);
    }

    async function deleteCourse() {
        if (!confirm(`Delete "${course.name}"?`)) return;
        await api.delete(`/courses/${course.id}`);
        onRefresh();
    }

    async function deleteBatch(bId) {
        if (!confirm('Delete this batch?')) return;
        await api.delete(`/courses/batches/${bId}`);
        fetchBatches();
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={toggle}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {course.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{course.name}</p>
                    <p className="text-xs text-gray-400">{course.description ?? 'No description'} · {course.duration_months ? `${course.duration_months} months` : 'Flexible'} · ₹{Number(course.fee_amount).toLocaleString('en-IN')}/mo</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); deleteCourse(); }} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                        <Trash2 size={14} />
                    </button>
                    {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
            </div>

            {open && (
                <div className="border-t border-gray-50 bg-gray-50/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Batches</p>
                        <button onClick={() => setShowBatch(true)} className="text-xs btn-ghost !py-1 text-brand-500">
                            <Plus size={12} /> Add Batch
                        </button>
                    </div>
                    {loadingB ? <Loader2 size={16} className="animate-spin text-brand-400 mx-auto" /> : (
                        batches.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">No batches yet</p>
                        ) : (
                            batches.map((b) => (
                                <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                                        {b.is_online ? <Wifi size={13} className="text-white" /> : <WifiOff size={13} className="text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800">{b.name}</p>
                                        {b.teacher_name && <p className="text-[11px] text-gray-400">{b.teacher_name}</p>}
                                        {b.schedule && <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {b.schedule}</p>}
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-[10px] bg-violet-50 text-violet-600 rounded px-1.5 py-0.5">{b.enrolled_count} enrolled</span>
                                            {b.capacity && <span className="text-[10px] bg-gray-100 text-gray-400 rounded px-1.5 py-0.5">Cap: {b.capacity}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteBatch(b.id)} className="text-gray-300 hover:text-red-500 p-1">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )
                    )}
                </div>
            )}
            {showBatch && <BatchModal courseId={course.id} onClose={() => setShowBatch(false)} onSaved={fetchBatches} />}
        </div>
    );
}

// ── Courses Page ──────────────────────────────────────────────────────────────
export default function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/courses/');
            setCourses(data);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    return (
        <div className="max-w-2xl mx-auto space-y-5 animate-fade-up">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <BookOpen size={20} className="text-brand-500" />
                        <h2 className="text-2xl font-bold text-gray-800">Courses & Batches</h2>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">Create courses and schedule batches with teacher assignments</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                    <Plus size={16} /> New Course
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : courses.length === 0 ? (
                <div className="text-center py-20">
                    <BookOpen size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No courses yet. Create your first one!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {courses.map((c) => <CourseCard key={c.id} course={c} onRefresh={fetchCourses} />)}
                </div>
            )}

            {showAdd && <CourseModal onClose={() => setShowAdd(false)} onSaved={fetchCourses} />}
        </div>
    );
}
