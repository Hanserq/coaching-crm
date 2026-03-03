import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
    ArrowLeft, Loader2, AlertCircle, Phone,
    CheckCircle2, XCircle, Clock, Bell, Copy, MessageCircle,
    TrendingUp, Calendar, Award, BarChart3,
} from 'lucide-react';
import api from '../lib/axios';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
    present: { label: 'Present', cls: 'badge-green', Icon: CheckCircle2 },
    absent: { label: 'Absent', cls: 'badge-red', Icon: XCircle },
    late: { label: 'Late', cls: 'badge-yellow', Icon: Clock },
};

const AVATAR_COLORS = [
    'from-violet-400 to-purple-600', 'from-blue-400 to-indigo-600',
    'from-green-400 to-emerald-600', 'from-pink-400 to-rose-600',
    'from-amber-400 to-orange-600',
];
function avatarColor(name) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, sub, color = 'gray' }) {
    const colorMap = {
        violet: 'bg-brand-50 border-brand-100',
        green: 'bg-emerald-50 border-emerald-100',
        amber: 'bg-amber-50 border-amber-100',
        red: 'bg-red-50 border-red-100',
        gray: 'bg-gray-50 border-gray-100',
    };
    return (
        <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1 number-display">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

// ── Month bar chart ───────────────────────────────────────────────────────────
function MonthBarChart({ months }) {
    const maxTotal = Math.max(...months.map(m => m.total_marked), 1);
    return (
        <div className="flex items-end gap-2 h-32 mt-4">
            {months.map((m) => {
                const presentH = (m.present / maxTotal) * 100;
                const lateH = (m.late / maxTotal) * 100;
                const absentH = (m.absent / maxTotal) * 100;
                return (
                    <div key={m.month_label} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end gap-px" style={{ height: '100px' }}>
                            {/* stacked bar */}
                            <div className="w-full rounded-t-md overflow-hidden flex flex-col-reverse gap-0" style={{ height: `${presentH + lateH + absentH}%` }}>
                                <div style={{ height: `${(absentH / (presentH + lateH + absentH + 0.001)) * 100}%` }} className="bg-red-300 w-full shrink-0" />
                                <div style={{ height: `${(lateH / (presentH + lateH + absentH + 0.001)) * 100}%` }} className="bg-amber-300 w-full shrink-0" />
                                <div style={{ height: `${(presentH / (presentH + lateH + absentH + 0.001)) * 100}%` }} className="bg-emerald-400 w-full shrink-0" />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center leading-tight">{m.month_label.split(' ')[0]}</p>
                        <p className="text-[10px] font-semibold text-gray-600">{m.percentage}%</p>
                    </div>
                );
            })}
        </div>
    );
}

// ── Attendance bar for this month ─────────────────────────────────────────────
function MonthAttendanceBar({ present, late, absent }) {
    const total = present + late + absent || 1;
    const pPct = (present / total * 100).toFixed(1);
    const lPct = (late / total * 100).toFixed(1);
    const aPct = (absent / total * 100).toFixed(1);
    return (
        <div className="space-y-2">
            <div className="flex h-5 rounded-full overflow-hidden gap-px">
                {present > 0 && <div style={{ width: `${pPct}%` }} className="bg-emerald-400 transition-all duration-700" title={`Present: ${present}`} />}
                {late > 0 && <div style={{ width: `${lPct}%` }} className="bg-amber-400  transition-all duration-700" title={`Late: ${late}`} />}
                {absent > 0 && <div style={{ width: `${aPct}%` }} className="bg-red-400    transition-all duration-700" title={`Absent: ${absent}`} />}
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Present {present} ({pPct}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Late {late} ({lPct}%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Absent {absent} ({aPct}%)</span>
            </div>
        </div>
    );
}

// ── Guardian Notify ───────────────────────────────────────────────────────────
function GuardianAlert({ student, lateCount }) {
    const [copied, setCopied] = useState(false);
    const msg = `Dear ${student.guardian_name || 'Parent'}, your ward ${student.full_name} has been marked LATE ${lateCount} time(s) this month. Please ensure timely attendance. – Coaching CRM`;
    const phone = (student.phone || '').replace(/\D/g, '');
    const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : null;

    function handleCopy() {
        navigator.clipboard.writeText(msg);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Bell size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-800">
                        ⚠️ Late {lateCount} times this month — Guardian Alert
                    </p>
                    <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                        {student.full_name} has been late {lateCount}+ times. Consider notifying {student.guardian_name || 'the guardian'}.
                    </p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {waUrl && (
                            <a href={waUrl} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors">
                                <MessageCircle size={14} /> WhatsApp
                            </a>
                        )}
                        <button onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-semibold hover:bg-amber-300 transition-colors">
                            <Copy size={14} /> {copied ? 'Copied!' : 'Copy Message'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Student Profile Page ──────────────────────────────────────────────────────
export default function StudentProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [student, setStudent] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        Promise.all([
            api.get(`/students/${id}`),
            api.get(`/attendance/student/${id}/stats`),
        ])
            .then(([sRes, aRes]) => {
                setStudent(sRes.data);
                setStats(aRes.data);
            })
            .catch(() => setError('Failed to load student profile.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 size={32} className="animate-spin text-brand-500" />
        </div>
    );
    if (error) return (
        <div className="card flex items-center gap-2 text-red-500">
            <AlertCircle size={18} /> {error}
        </div>
    );
    if (!student || !stats) return null;

    const totalThisMonth = stats.this_month_present + stats.this_month_late + stats.this_month_absent;

    return (
        <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
            {/* Back */}
            <button onClick={() => navigate(-1)} className="btn-ghost !px-2 text-gray-400 hover:text-gray-700">
                <ArrowLeft size={16} /> Back
            </button>

            {/* Header card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start gap-5">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor(student.full_name)} flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md`}>
                        {student.full_name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-xl font-bold text-gray-800">{student.full_name}</h2>
                            <span className={`badge ${student.status === 'active' ? 'badge-green' : 'badge-red'} capitalize`}>{student.status}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{student.class_name ?? 'No class assigned'}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                            {student.guardian_name && (
                                <span className="flex items-center gap-1.5">
                                    👪 {student.guardian_name}
                                </span>
                            )}
                            {student.phone && (
                                <a href={`tel:${student.phone}`} className="flex items-center gap-1.5 text-brand-500 hover:text-brand-600">
                                    <Phone size={13} /> {student.phone}
                                </a>
                            )}
                            {student.admission_date && (
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={13} /> Admitted {format(parseISO(student.admission_date), 'd MMM yyyy')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Guardian alert — only shown when late ≥ 3 */}
            {stats.consecutive_late_this_month >= 3 && (
                <GuardianAlert student={student} lateCount={stats.consecutive_late_this_month} />
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatChip label="All-time %" value={`${stats.attendance_percentage}%`} sub={`${stats.total_marked} classes`} color="violet" />
                <StatChip label="This Month" value={`${stats.this_month_percentage}%`} sub={`${totalThisMonth} classes`} color="green" />
                <StatChip label="This Week" value={`${stats.this_week_percentage}%`} sub={`${stats.this_week_total} classes`} color="amber" />
                <StatChip label="Total Late" value={stats.late} sub="all-time" color="amber" />
            </div>

            {/* This month bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Award size={16} className="text-brand-500" />
                    <h3 className="text-sm font-bold text-gray-800">This Month's Breakdown</h3>
                    <span className="ml-auto text-xs text-gray-400">Late counts as Present</span>
                </div>
                {totalThisMonth === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No attendance recorded this month yet.</p>
                ) : (
                    <MonthAttendanceBar
                        present={stats.this_month_present}
                        late={stats.this_month_late}
                        absent={stats.this_month_absent}
                    />
                )}
            </div>

            {/* 6-month chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                    <BarChart3 size={16} className="text-brand-500" />
                    <h3 className="text-sm font-bold text-gray-800">Last 6 Months</h3>
                </div>
                <div className="flex gap-4 text-xs text-gray-400 mt-2 mb-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Present</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300" />Late</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300" />Absent</span>
                </div>
                <MonthBarChart months={stats.monthly_breakdown} />
            </div>

            {/* Recent records */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
                    <TrendingUp size={16} className="text-brand-500" />
                    <h3 className="text-sm font-bold text-gray-800">Recent Attendance (last 30)</h3>
                </div>
                {stats.recent_records.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-10">No attendance records yet.</p>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {stats.recent_records.map((r) => {
                            const cfg = STATUS_CFG[r.status];
                            return (
                                <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                                    <p className="text-sm font-medium text-gray-700 w-28 shrink-0">
                                        {format(parseISO(r.date), 'd MMM yyyy')}
                                    </p>
                                    <p className="text-xs text-gray-400 w-12 shrink-0">
                                        {format(parseISO(r.date), 'EEE')}
                                    </p>
                                    <span className={`badge ${cfg.cls} flex items-center gap-1`}>
                                        <cfg.Icon size={10} /> {cfg.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
