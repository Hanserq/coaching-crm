import { useEffect, useState, useRef } from 'react';
import {
    Users, UserCheck, Wallet, TrendingDown,
    CalendarCheck, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import api from '../lib/axios';

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ target, prefix = '', suffix = '', decimals = 0 }) {
    const [display, setDisplay] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        const start = 0;
        const end = Number(target) || 0;
        const duration = 900; // ms
        const startTime = performance.now();

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease out quart
            const eased = 1 - Math.pow(1 - progress, 4);
            setDisplay(start + (end - start) * eased);
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target]);

    const formatted = decimals > 0
        ? display.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : Math.round(display).toLocaleString('en-IN');

    return <span>{prefix}{formatted}{suffix}</span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
const CARD_THEMES = {
    violet: {
        bg: 'from-brand-500 to-brand-600',
        icon: 'bg-white/20 text-white',
        label: 'text-white/70',
        value: 'text-white',
        sub: 'text-white/60',
        dot: 'bg-white/30',
    },
    green: {
        bg: 'from-emerald-500 to-green-600',
        icon: 'bg-white/20 text-white',
        label: 'text-white/70',
        value: 'text-white',
        sub: 'text-white/60',
        dot: 'bg-white/30',
    },
    amber: {
        bg: 'from-amber-400 to-orange-500',
        icon: 'bg-white/20 text-white',
        label: 'text-white/70',
        value: 'text-white',
        sub: 'text-white/60',
        dot: 'bg-white/30',
    },
    rose: {
        bg: 'from-rose-500 to-red-600',
        icon: 'bg-white/20 text-white',
        label: 'text-white/70',
        value: 'text-white',
        sub: 'text-white/60',
        dot: 'bg-white/30',
    },
};

function StatCard({ icon: Icon, label, value, sub, theme = 'violet', trend }) {
    const t = CARD_THEMES[theme];
    return (
        <div className={`stat-card bg-gradient-to-br ${t.bg}`}>
            {/* Background decoration circle */}
            <div className={`absolute -top-5 -right-5 w-24 h-24 rounded-full ${t.dot} opacity-40`} />
            <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full ${t.dot} opacity-20`} />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl ${t.icon}`}>
                        <Icon size={20} />
                    </div>
                    {trend !== undefined && (
                        <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full bg-white/20 ${t.value}`}>
                            {trend >= 0
                                ? <ArrowUpRight size={12} />
                                : <ArrowDownRight size={12} />}
                            {Math.abs(trend)}%
                        </span>
                    )}
                </div>
                <p className={`text-2xl font-bold number-display ${t.value}`}>{value}</p>
                <p className={`text-xs font-medium uppercase tracking-wider mt-1 ${t.label}`}>{label}</p>
                {sub && <p className={`text-xs mt-1.5 ${t.sub}`}>{sub}</p>}
            </div>
        </div>
    );
}

// ── Attendance ring (SVG donut) ───────────────────────────────────────────────
function AttendanceRing({ pct, present, absent, late }) {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;

    return (
        <div className="flex items-center gap-8">
            <div className="relative flex items-center justify-center">
                <svg width="130" height="130" className="-rotate-90">
                    <circle cx="65" cy="65" r={r} strokeWidth="12" className="fill-none" stroke="#e5e7eb" />
                    <circle
                        cx="65" cy="65" r={r} strokeWidth="12"
                        fill="none"
                        stroke="url(#grad)"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}
                    />
                    <defs>
                        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute text-center">
                    <p className="text-2xl font-bold text-gray-800">{pct}%</p>
                    <p className="text-xs text-gray-400">today</p>
                </div>
            </div>
            <div className="space-y-3">
                {[
                    { label: 'Present', count: present, color: 'bg-emerald-500' },
                    { label: 'Absent', count: absent, color: 'bg-rose-500' },
                    { label: 'Late', count: late, color: 'bg-amber-500' },
                ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                        <span className="text-sm text-gray-500 w-14">{label}</span>
                        <span className="text-sm font-bold text-gray-800">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/dashboard/')
            .then(({ data }) => setStats(data))
            .catch(() => setError('Could not load dashboard stats.'))
            .finally(() => setLoading(false));
    }, []);

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

    const fmt = (n) => Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800">
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'} 👋
                </h2>
                <p className="text-sm text-gray-400 mt-1">Here's what's happening at your coaching center today.</p>
            </div>

            {/* Stat cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <StatCard
                    icon={Users}
                    label="Total Students"
                    value={<AnimatedNumber target={stats.total_students} />}
                    sub={`${stats.inactive_students} inactive`}
                    theme="violet"
                />
                <StatCard
                    icon={UserCheck}
                    label="Active Students"
                    value={<AnimatedNumber target={stats.active_students} />}
                    theme="green"
                />
                <StatCard
                    icon={Wallet}
                    label="Fees This Month"
                    value={<AnimatedNumber target={stats.total_fee_collected_this_month} prefix="₹" />}
                    theme="amber"
                />
                <StatCard
                    icon={TrendingDown}
                    label="Pending Fees"
                    value={<AnimatedNumber target={stats.pending_fees_total} prefix="₹" />}
                    sub="outstanding balance"
                    theme="rose"
                />
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Attendance donut */}
                <div className="card lg:col-span-3">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                <CalendarCheck size={13} /> Today's Attendance
                            </p>
                            <p className="text-lg font-bold text-gray-800 mt-1">
                                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                        <span className="badge badge-purple">Live</span>
                    </div>
                    <AttendanceRing
                        pct={stats.today_attendance_percentage}
                        present={stats.today_present}
                        absent={stats.today_absent}
                        late={stats.today_late}
                    />
                </div>

                {/* Quick info */}
                <div className="card lg:col-span-2 flex flex-col gap-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Quick Stats</p>
                    {[
                        { label: 'Total Enrolled', value: fmt(stats.total_students), icon: '🎓' },
                        { label: 'Active Now', value: fmt(stats.active_students), icon: '✅' },
                        { label: 'Fees Collected', value: `₹${fmt(stats.total_fee_collected_this_month)}`, icon: '💰' },
                        { label: 'Outstanding', value: `₹${fmt(stats.pending_fees_total)}`, icon: '⚠️' },
                    ].map(({ label, value, icon }) => (
                        <div key={label} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base">{icon}</div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-400">{label}</p>
                                <p className="text-sm font-bold text-gray-800">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
