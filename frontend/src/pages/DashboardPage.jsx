import { useEffect, useState } from 'react';
import {
    Users, UserCheck, Wallet, TrendingDown,
    CalendarCheck, AlertCircle, Loader2,
} from 'lucide-react';
import api from '../lib/axios';

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
    const colorMap = {
        brand: 'bg-brand-500/15 text-brand-400',
        green: 'bg-green-500/15 text-green-400',
        red: 'bg-red-500/15 text-red-400',
        yellow: 'bg-yellow-500/15 text-yellow-400',
    };
    return (
        <div className="card flex items-start gap-4 hover:border-brand-500/30 transition-colors">
            <div className={`p-2.5 rounded-xl ${colorMap[color]}`}>
                <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</p>
                <p className="text-2xl font-bold text-white mt-0.5 tabular-nums">{value}</p>
                {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

// ── Attendance ring ───────────────────────────────────────────────────────────
function AttendanceRing({ pct }) {
    const r = 40;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return (
        <svg width="100" height="100" className="-rotate-90">
            <circle cx="50" cy="50" r={r} strokeWidth="10" className="fill-none stroke-[var(--color-surface-500)]" />
            <circle
                cx="50" cy="50" r={r} strokeWidth="10"
                className="fill-none stroke-brand-500 transition-all duration-700"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
            />
        </svg>
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
        <div className="card flex items-center gap-2 text-red-400">
            <AlertCircle size={18} /> {error}
        </div>
    );

    const fmt = (n) => Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Overview</h2>
                <p className="text-sm text-slate-500 mt-0.5">Live snapshot of your coaching centre</p>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Students" value={stats.total_students} color="brand" />
                <StatCard icon={UserCheck} label="Active Students" value={stats.active_students} color="green"
                    sub={`${stats.inactive_students} inactive`} />
                <StatCard icon={Wallet} label="Fees This Month" value={`₹${fmt(stats.total_fee_collected_this_month)}`} color="brand" />
                <StatCard icon={TrendingDown} label="Pending Fees" value={`₹${fmt(stats.pending_fees_total)}`} color="red" />
            </div>

            {/* Attendance card */}
            <div className="card flex flex-col sm:flex-row items-center gap-6">
                <div className="relative flex items-center justify-center">
                    <AttendanceRing pct={stats.today_attendance_percentage} />
                    <span className="absolute text-lg font-bold text-white">
                        {stats.today_attendance_percentage}%
                    </span>
                </div>
                <div className="text-center sm:text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wide font-medium flex items-center gap-1.5 justify-center sm:justify-start">
                        <CalendarCheck size={14} /> Today's Attendance
                    </p>
                    <p className="text-3xl font-bold text-white mt-1">{stats.today_attendance_percentage}%</p>
                    <div className="flex gap-4 mt-2 text-sm justify-center sm:justify-start">
                        <span className="badge badge-green">{stats.today_present} present</span>
                        <span className="badge badge-red">{stats.today_absent} absent</span>
                        <span className="badge badge-yellow">{stats.today_late} late</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
