import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import {
    CalendarDays, Loader2, AlertCircle,
    CheckCircle2, XCircle, Clock, Users,
} from 'lucide-react';
import api from '../lib/axios';

// ── Status cycle ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    present: { label: 'Present', Icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200', next: 'absent' },
    absent: { label: 'Absent', Icon: XCircle, cls: 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200', next: 'late' },
    late: { label: 'Late', Icon: Clock, cls: 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200', next: 'present' },
};

// ── Student card ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    'from-violet-400 to-purple-500',
    'from-blue-400 to-indigo-500',
    'from-green-400 to-emerald-500',
    'from-pink-400 to-rose-500',
    'from-amber-400 to-orange-500',
    'from-cyan-400 to-sky-500',
];
function avatarColor(name) {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function AttendanceCard({ student, record, onToggle, busy }) {
    const status = record?.status ?? null;
    const cfg = status ? STATUS_CONFIG[status] : null;

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(student.full_name)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                {student.full_name[0].toUpperCase()}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{student.full_name}</p>
                <p className="text-xs text-gray-400 truncate">{student.class_name ?? 'No class'}</p>
            </div>

            {/* Toggle button */}
            <button
                onClick={() => onToggle(student.id, record)}
                disabled={busy}
                className={[
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150 cursor-pointer',
                    cfg ? cfg.cls : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200',
                    busy ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
            >
                {busy ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : cfg ? (
                    <><cfg.Icon size={12} /> {cfg.label}</>
                ) : (
                    'Mark'
                )}
            </button>
        </div>
    );
}

// ── Attendance Page ───────────────────────────────────────────────────────────
export default function AttendancePage() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [date, setDate] = useState(today);
    const [students, setStudents] = useState([]);
    const [records, setRecords] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyIds, setBusyIds] = useState(new Set());

    const fetchAll = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [studRes, attRes] = await Promise.all([
                api.get('/students/', { params: { page: 1, page_size: 100, status: 'active' } }),
                api.get('/attendance/daily', { params: { date } }),
            ]);
            setStudents(studRes.data.items);
            const map = {};
            (attRes.data.records ?? []).forEach((r) => { map[r.student_id] = r; });
            setRecords(map);
        } catch {
            setError('Failed to load attendance data.');
        } finally { setLoading(false); }
    }, [date]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleToggle(studentId, record) {
        setBusyIds((s) => new Set(s).add(studentId));
        try {
            if (!record) {
                const { data } = await api.post('/attendance/', { student_id: studentId, date, status: 'present' });
                setRecords((p) => ({ ...p, [studentId]: data }));
            } else {
                const nextStatus = STATUS_CONFIG[record.status].next;
                const { data } = await api.patch(`/attendance/${record.id}`, { status: nextStatus });
                setRecords((p) => ({ ...p, [studentId]: data }));
            }
        } catch (e) { console.error(e); }
        finally {
            setBusyIds((s) => { const n = new Set(s); n.delete(studentId); return n; });
        }
    }

    const present = Object.values(records).filter((r) => r.status === 'present').length;
    const absent = Object.values(records).filter((r) => r.status === 'absent').length;
    const late = Object.values(records).filter((r) => r.status === 'late').length;
    const unmarked = students.length - Object.keys(records).length;
    const total = students.length;
    const pct = total > 0 ? Math.round(present / total * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Attendance</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Click a badge to cycle: Mark → Present → Absent → Late</p>
                </div>
                <div className="relative">
                    <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="date" value={date} max={today}
                        onChange={(e) => setDate(e.target.value)}
                        className="input pl-9 w-auto"
                    />
                </div>
            </div>

            {/* Summary pills */}
            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Present', count: present, emoji: '✅', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                        { label: 'Absent', count: absent, emoji: '❌', color: 'bg-red-50 border-red-200 text-red-600' },
                        { label: 'Late', count: late, emoji: '⏰', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                        { label: 'Unmarked', count: unmarked, emoji: '⬜', color: 'bg-gray-50 border-gray-200 text-gray-500' },
                    ].map(({ label, count, emoji, color }) => (
                        <div key={label} className={`rounded-xl border p-3 ${color}`}>
                            <p className="text-lg">{emoji}</p>
                            <p className="text-2xl font-bold mt-1">{count}</p>
                            <p className="text-xs font-medium">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Progress bar */}
            {!loading && total > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Today's Attendance Rate</span>
                        <span className="font-bold text-brand-600">{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-brand-500 to-violet-400 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{present} of {total} students marked present</p>
                </div>
            )}

            {/* Student cards */}
            {error && (
                <div className="card flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle size={15} /> {error}
                </div>
            )}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : students.length === 0 ? (
                <div className="text-center py-20">
                    <Users size={28} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No active students found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {students.map((s) => (
                        <AttendanceCard
                            key={s.id}
                            student={s}
                            record={records[s.id]}
                            onToggle={handleToggle}
                            busy={busyIds.has(s.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
