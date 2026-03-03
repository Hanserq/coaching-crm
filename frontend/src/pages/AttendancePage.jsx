import { useEffect, useState, useCallback } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
    CalendarDays, Loader2, AlertCircle,
    CheckCircle2, XCircle, Clock, Users,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../lib/axios';

// ── Status cycle ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    present: { label: 'Present', Icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200', next: 'absent' },
    absent: { label: 'Absent', Icon: XCircle, cls: 'bg-red-100 text-red-600 border border-red-200 hover:bg-red-200', next: 'late' },
    late: { label: 'Late', Icon: Clock, cls: 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200', next: 'present' },
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    'from-violet-400 to-purple-500', 'from-blue-400 to-indigo-500',
    'from-green-400 to-emerald-500', 'from-pink-400 to-rose-500',
    'from-amber-400 to-orange-500', 'from-cyan-400 to-sky-500',
];
function avatarColor(name) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

// ── Attendance card ───────────────────────────────────────────────────────────
function AttendanceCard({ student, record, onToggle, busy }) {
    const navigate = useNavigate();
    const status = record?.status ?? null;
    const cfg = status ? STATUS_CONFIG[status] : null;

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            {/* Clickable avatar → profile */}
            <button
                onClick={() => navigate(`/students/${student.id}`)}
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(student.full_name)} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm hover:ring-2 hover:ring-brand-400 hover:ring-offset-1 transition-all`}
                title={`View ${student.full_name}'s profile`}
            >
                {student.full_name[0].toUpperCase()}
            </button>

            {/* Name — also links to profile */}
            <div className="flex-1 min-w-0">
                <button
                    onClick={() => navigate(`/students/${student.id}`)}
                    className="text-sm font-semibold text-gray-800 truncate hover:text-brand-600 transition-colors text-left w-full"
                >
                    {student.full_name}
                </button>
                <p className="text-xs text-gray-400 truncate">{student.class_name ?? 'No class'}</p>
            </div>

            {/* Status toggle */}
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

// ── Date Navigator ────────────────────────────────────────────────────────────
function DateNavigator({ date, onChange }) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const isToday = date === today;
    const parsed = parseISO(date);

    function go(days) {
        const next = days > 0 ? addDays(parsed, days) : subDays(parsed, Math.abs(days));
        const nextStr = format(next, 'yyyy-MM-dd');
        if (nextStr <= today) onChange(nextStr);
    }

    return (
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => go(-1)} className="btn-ghost !p-2 !rounded-lg">
                <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3">
                <CalendarDays size={14} className="text-brand-500 shrink-0" />
                <div className="text-center min-w-[140px]">
                    <p className="text-sm font-bold text-gray-800">
                        {isToday ? 'Today' : format(parsed, 'EEEE')}
                    </p>
                    <p className="text-xs text-gray-400">{format(parsed, 'd MMMM yyyy')}</p>
                </div>
            </div>
            <button onClick={() => go(1)} disabled={isToday} className="btn-ghost !p-2 !rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
            </button>
            {/* Calendar input as popup */}
            <div className="relative">
                <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-8 h-full"
                    title="Pick a date"
                />
                <button className="btn-ghost !p-2 !rounded-lg text-gray-400 hover:text-brand-500" title="Pick date">
                    📅
                </button>
            </div>
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
    const pct = total > 0 ? Math.round((present + late) / total * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Attendance</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Click a badge to cycle: <span className="font-medium text-gray-500">Unmarked → Present → Absent → Late</span>
                        <span className="ml-2 text-gray-300">·</span>
                        <span className="ml-2 text-brand-500 font-medium">Click a student's name to view their profile</span>
                    </p>
                </div>
                <DateNavigator date={date} onChange={(d) => setDate(d)} />
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
                        <span className="font-medium text-gray-700">
                            Attendance Rate
                            <span className="text-xs text-gray-400 ml-2">(late counted as present)</span>
                        </span>
                        <span className="font-bold text-brand-600">{pct}%</span>
                    </div>
                    {/* Stacked bar: present green, late amber, absent red */}
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        {present > 0 && (
                            <div className="bg-emerald-400 transition-all duration-700" style={{ width: `${present / total * 100}%` }} title={`Present: ${present}`} />
                        )}
                        {late > 0 && (
                            <div className="bg-amber-400 transition-all duration-700" style={{ width: `${late / total * 100}%` }} title={`Late: ${late}`} />
                        )}
                        {absent > 0 && (
                            <div className="bg-red-400 transition-all duration-700" style={{ width: `${absent / total * 100}%` }} title={`Absent: ${absent}`} />
                        )}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400 mt-2">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Present {present}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Late {late}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Absent {absent}</span>
                    </div>
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
