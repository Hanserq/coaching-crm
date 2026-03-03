import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
    BarChart3, Plus, X, Loader2, Trash2,
    ChevronDown, ChevronRight, Trophy,
} from 'lucide-react';
import api from '../lib/axios';

const RANK_EMOJI = ['🥇', '🥈', '🥉'];
const PCT_COLOR = (p) => p >= 80 ? 'text-emerald-600' : p >= 50 ? 'text-amber-600' : 'text-red-500';

// ── Create exam modal ─────────────────────────────────────────────────────────
function ExamModal({ courses, onClose, onSaved }) {
    const [form, setForm] = useState({
        title: '', subject: '', exam_date: format(new Date(), 'yyyy-MM-dd'), max_marks: 100, course_id: '',
    });
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!form.title) return;
        setSaving(true);
        try {
            const payload = { ...form, max_marks: parseFloat(form.max_marks) || 100 };
            if (!payload.course_id) delete payload.course_id;
            await api.post('/exams/', payload);
            onSaved(); onClose();
        } catch { } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Create Exam</h3>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={16} /></button>
                </div>
                {[
                    { label: 'Exam Title *', key: 'title', type: 'text' },
                    { label: 'Subject', key: 'subject', type: 'text' },
                    { label: 'Date', key: 'exam_date', type: 'date' },
                    { label: 'Max Marks', key: 'max_marks', type: 'number' },
                ].map(({ label, key, type }) => (
                    <div key={key}>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                        <input type={type} value={form[key]} onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))} className="input" />
                    </div>
                ))}
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Course (optional)</label>
                    <select value={form.course_id} onChange={(e) => setForm(f => ({ ...f, course_id: e.target.value }))} className="input">
                        <option value="">— All students —</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Create Exam'}
                </button>
            </div>
        </div>
    );
}

// ── Enter marks modal ─────────────────────────────────────────────────────────
function MarksModal({ exam, onClose, onSaved }) {
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [sRes, rRes] = await Promise.all([
                    api.get('/students/', { params: { page_size: 200, status: 'active' } }),
                    api.get(`/exams/${exam.id}/results`),
                ]);
                setStudents(sRes.data.items);
                const initMarks = {};
                sRes.data.items.forEach((s) => {
                    const ex = rRes.data.find((r) => r.student_id === s.id);
                    initMarks[s.id] = ex
                        ? { marks: String(ex.marks_obtained), absent: ex.is_absent }
                        : { marks: '', absent: false };
                });
                setMarks(initMarks);
            } catch { } finally { setLoading(false); }
        })();
    }, [exam.id]);

    async function handleSave() {
        setSaving(true);
        try {
            const payload = students.map((s) => ({
                student_id: s.id,
                marks_obtained: parseFloat(marks[s.id]?.marks) || 0,
                is_absent: marks[s.id]?.absent ?? false,
            }));
            await api.post(`/exams/${exam.id}/results`, payload);
            onSaved(); onClose();
        } catch { } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-gray-800">Enter Marks — {exam.title}</h3>
                        <p className="text-xs text-gray-400">Max: {exam.max_marks} marks</p>
                    </div>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={16} /></button>
                </div>
                {loading ? <Loader2 size={20} className="animate-spin mx-auto my-8 text-brand-400" /> : (
                    <div className="overflow-auto flex-1 space-y-2 mb-4">
                        {students.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                <p className="text-sm font-medium text-gray-700 flex-1">{s.full_name}</p>
                                <label className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0 cursor-pointer">
                                    <input type="checkbox" checked={marks[s.id]?.absent ?? false}
                                        onChange={(e) => setMarks(m => ({ ...m, [s.id]: { ...m[s.id], absent: e.target.checked, marks: e.target.checked ? '0' : m[s.id]?.marks ?? '' } }))} />
                                    Absent
                                </label>
                                <input
                                    type="number" min="0" max={exam.max_marks}
                                    value={marks[s.id]?.marks ?? ''}
                                    disabled={marks[s.id]?.absent}
                                    onChange={(e) => setMarks(m => ({ ...m, [s.id]: { ...m[s.id], marks: e.target.value } }))}
                                    className="input w-20 text-center disabled:opacity-40"
                                    placeholder="0"
                                />
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={handleSave} disabled={saving || loading} className="btn-primary w-full">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save All Marks'}
                </button>
            </div>
        </div>
    );
}

// ── Exam card ─────────────────────────────────────────────────────────────────
function ExamCard({ exam, courses, onDelete }) {
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [loadingR, setLoadingR] = useState(false);
    const [showMarks, setShowMarks] = useState(false);
    const course = courses.find((c) => c.id === exam.course_id);

    async function fetchResults() {
        setLoadingR(true);
        try {
            const { data } = await api.get(`/exams/${exam.id}/results`);
            setResults(data);
        } catch { } finally { setLoadingR(false); }
    }

    function toggle() { if (!open) fetchResults(); setOpen((o) => !o); }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={toggle}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                    <BarChart3 size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{exam.title}</p>
                    <p className="text-xs text-gray-400">
                        {exam.subject && `${exam.subject} · `}
                        {exam.exam_date && format(parseISO(exam.exam_date), 'd MMM yyyy')} · Max {exam.max_marks} marks
                        {course && ` · ${course.name}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete exam?')) onDelete(exam.id); }}
                        className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={13} /></button>
                    {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
            </div>

            {open && (
                <div className="border-t border-gray-50 bg-gray-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Results ({results.length})</p>
                        <button onClick={() => setShowMarks(true)} className="btn-primary !py-1 !text-xs">
                            <Plus size={12} /> Enter Marks
                        </button>
                    </div>
                    {loadingR ? <Loader2 size={16} className="animate-spin text-brand-400 mx-auto" /> : (
                        results.length === 0
                            ? <p className="text-xs text-gray-400 text-center py-4">No results yet — click "Enter Marks"</p>
                            : (
                                <div className="space-y-1.5">
                                    {results.map((r, i) => (
                                        <div key={r.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-3 py-2">
                                            <span className="text-base w-6 shrink-0">{RANK_EMOJI[i] ?? `#${i + 1}`}</span>
                                            <p className="text-xs font-medium text-gray-700 flex-1">{r.student_id.slice(0, 8)}</p>
                                            {r.is_absent
                                                ? <span className="text-[10px] bg-red-50 text-red-500 rounded-full px-2 py-0.5">Absent</span>
                                                : <span className={`text-xs font-bold ${PCT_COLOR(r.percentage)}`}>{r.marks_obtained}/{exam.max_marks} ({r.percentage}%)</span>
                                            }
                                        </div>
                                    ))}
                                </div>
                            )
                    )}
                </div>
            )}

            {showMarks && <MarksModal exam={exam} onClose={() => setShowMarks(false)} onSaved={fetchResults} />}
        </div>
    );
}

// ── Exams Page ────────────────────────────────────────────────────────────────
export default function ExamsPage() {
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [eRes, cRes] = await Promise.all([
                api.get('/exams/'),
                api.get('/courses/').catch(() => ({ data: [] })),
            ]);
            setExams(eRes.data);
            setCourses(cRes.data);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleDelete(id) {
        await api.delete(`/exams/${id}`);
        setExams((e) => e.filter((x) => x.id !== id));
    }

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Trophy size={20} className="text-brand-500" />
                        <h2 className="text-2xl font-bold text-gray-800">Exams & Results</h2>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">Create tests, enter marks, auto-rank students</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                    <Plus size={16} /> New Exam
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : exams.length === 0 ? (
                <div className="text-center py-20">
                    <BarChart3 size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No exams yet. Create your first one!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {exams.map((e) => <ExamCard key={e.id} exam={e} courses={courses} onDelete={handleDelete} />)}
                </div>
            )}

            {showAdd && <ExamModal courses={courses} onClose={() => setShowAdd(false)} onSaved={fetchAll} />}
        </div>
    );
}
