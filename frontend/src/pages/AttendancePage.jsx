import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Loader2, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../lib/axios';

// ── Status cycle config ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
    present: { label: 'Present', Icon: CheckCircle2, cls: 'badge-green', next: 'absent' },
    absent: { label: 'Absent', Icon: XCircle, cls: 'badge-red', next: 'late' },
    late: { label: 'Late', Icon: Clock, cls: 'badge-yellow', next: 'present' },
};

// ── Student attendance row ────────────────────────────────────────────────────
function AttendanceRow({ student, record, onToggle, busy }) {
    const status = record?.status ?? null;
    const cfg = status ? STATUS_CONFIG[status] : null;

    return (
        <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--color-surface-500)] last:border-0 hover:bg-[var(--color-surface-600)] transition-colors">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-bold shrink-0">
                {student.full_name[0].toUpperCase()}
            </div>

            {/* Name + class */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{student.full_name}</p>
                <p className="text-xs text-slate-500">{student.class_name ?? 'No class'}</p>
            </div>

            {/* Toggle button */}
            <button
                onClick={() => onToggle(student.id, record)}
                disabled={busy}
                className={[
                    'badge cursor-pointer hover:opacity-80 transition-opacity',
                    cfg ? cfg.cls : 'bg-[var(--color-surface-600)] text-slate-400',
                    busy ? 'opacity-40 cursor-not-allowed' : '',
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
    const [records, setRecords] = useState({});   // studentId → attendance record
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyIds, setBusyIds] = useState(new Set());

    // Fetch students + today's attendance in parallel
    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [studRes, attRes] = await Promise.all([
                api.get('/students/', { params: { page: 1, page_size: 200, status: 'active' } }),
                api.get('/attendance/', { params: { date } }),
            ]);
            setStudents(studRes.data.items);
            // Index attendance records by student_id
            const map = {};
            (attRes.data.items ?? attRes.data).forEach((r) => { map[r.student_id] = r; });
            setRecords(map);
        } catch {
            setError('Failed to load attendance data.');
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleToggle(studentId, record) {
        setBusyIds((s) => new Set(s).add(studentId));
        try {
            if (!record) {
                // No record yet → create as "present"
                const { data } = await api.post('/attendance/', {
                    student_id: studentId,
                    date,
                    status: 'present',
                });
                setRecords((prev) => ({ ...prev, [studentId]: data }));
            } else {
                const nextStatus = STATUS_CONFIG[record.status].next;
                const { data } = await api.patch(`/attendance/${record.id}`, { status: nextStatus });
                setRecords((prev) => ({ ...prev, [studentId]: data }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setBusyIds((s) => { const n = new Set(s); n.delete(studentId); return n; });
        }
    }

    // Summary counts
    const present = Object.values(records).filter((r) => r.status === 'present').length;
    const absent = Object.values(records).filter((r) => r.status === 'absent').length;
    const late = Object.values(records).filter((r) => r.status === 'late').length;
    const unmarked = students.length - Object.keys(records).length;

    return (
        <div className="space-y-5">
            {/* Header + date picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white">Attendance</h2>
                    <p className="text-sm text-slate-500">Click a badge to cycle through Present → Absent → Late</p>
                </div>
                <div className="relative">
                    <CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={(e) => setDate(e.target.value)}
                        className="input pl-9 w-auto"
                    />
                </div>
            </div>

            {/* Summary pills */}
            {!loading && (
                <div className="flex flex-wrap gap-2">
                    <span className="badge badge-green">{present} Present</span>
                    <span className="badge badge-red">{absent} Absent</span>
                    <span className="badge badge-yellow">{late} Late</span>
                    <span className="badge bg-[var(--color-surface-600)] text-slate-400">{unmarked} Unmarked</span>
                </div>
            )}

            {/* Student list */}
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
                    <p className="text-center py-12 text-slate-500 text-sm">No active students found.</p>
                ) : (
                    students.map((s) => (
                        <AttendanceRow
                            key={s.id}
                            student={s}
                            record={records[s.id]}
                            onToggle={handleToggle}
                            busy={busyIds.has(s.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
