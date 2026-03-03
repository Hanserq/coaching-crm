import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarCheck,
    Wallet,
    LogOut,
    Menu,
    X,
    GraduationCap,
    ChevronRight,
    Settings,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

// ── Navigation items ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/students', label: 'Students', Icon: Users },
    { to: '/attendance', label: 'Attendance', Icon: CalendarCheck },
    { to: '/fees', label: 'Fees', Icon: Wallet },
];

// ── Sidebar nav link ──────────────────────────────────────────────────────────
function SidebarLink({ to, label, Icon, onClick }) {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                [
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                    isActive
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                        : 'text-slate-400 hover:bg-surface-600 hover:text-slate-100',
                ].join(' ')
            }
        >
            {({ isActive }) => (
                <>
                    <Icon size={18} className={isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={14} className="text-brand-400" />}
                </>
            )}
        </NavLink>
    );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ onClose }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <aside className="flex flex-col h-full bg-[var(--color-surface-800)] border-r border-[var(--color-surface-500)]">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--color-surface-500)]">
                <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <GraduationCap size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-tight truncate">Coaching CRM</p>
                    <p className="text-xs text-slate-500 truncate">{user?.organization_id?.slice(0, 8)}…</p>
                </div>
                {/* Close button (mobile only) */}
                {onClose && (
                    <button onClick={onClose} className="btn-ghost !p-1.5 lg:hidden">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <SidebarLink key={item.to} {...item} onClick={onClose} />
                ))}
            </nav>

            {/* User footer */}
            <div className="px-3 py-4 border-t border-[var(--color-surface-500)] space-y-1">
                {/* User info — click to go to profile */}
                <NavLink
                    to="/profile"
                    onClick={onClose}
                    className={({ isActive }) =>
                        [
                            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 hover:bg-surface-600 group',
                            isActive ? 'bg-brand-500/10 ring-1 ring-brand-500/20' : '',
                        ].join(' ')
                    }
                >
                    <div className="w-8 h-8 rounded-full bg-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
                        {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                    </div>
                    <Settings size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </NavLink>
                {/* Logout */}
                <button onClick={handleLogout} className="btn-ghost w-full justify-start text-red-400 hover:text-red-300">
                    <LogOut size={16} />
                    <span className="text-sm">Sign out</span>
                </button>
            </div>
        </aside>
    );
}

// ── Header (desktop top bar) ──────────────────────────────────────────────────
function Header({ onMenuClick, title }) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    return (
        <header className="h-14 flex items-center justify-between px-6 border-b border-[var(--color-surface-500)] bg-[var(--color-surface-800)]/60 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
                {/* Hamburger (mobile) */}
                <button onClick={onMenuClick} className="btn-ghost !p-1.5 lg:hidden">
                    <Menu size={20} />
                </button>
                <h1 className="text-base font-semibold text-white">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
                <span className="hidden sm:block text-xs text-slate-500 mr-2">{user?.email}</span>
                <button onClick={handleLogout} className="btn-ghost !py-1.5 text-sm text-red-400 hover:text-red-300">
                    <LogOut size={15} />
                    <span className="hidden sm:block">Logout</span>
                </button>
            </div>
        </header>
    );
}

// ── Route title map ───────────────────────────────────────────────────────────
const ROUTE_TITLES = {
    '/dashboard': 'Dashboard',
    '/students': 'Students',
    '/attendance': 'Attendance',
    '/fees': 'Fee Payments',
    '/profile': 'Profile Settings',
};

// ── Layout (exported) ─────────────────────────────────────────────────────────
export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Derive the page title from the current URL
    const pathname = window.location.pathname;
    const pageTitle = Object.entries(ROUTE_TITLES).find(([key]) =>
        pathname.startsWith(key)
    )?.[1] ?? 'Coaching CRM';

    return (
        <div className="flex h-screen overflow-hidden bg-[var(--color-surface-900)]">
            {/* ── Desktop sidebar ── */}
            <div className="hidden lg:flex lg:w-60 xl:w-64 flex-shrink-0">
                <div className="w-full"><Sidebar /></div>
            </div>

            {/* ── Mobile sidebar overlay ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 flex lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="relative z-50 w-72 flex-shrink-0 animate-[slideIn_200ms_ease]">
                        <Sidebar onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                    title={pageTitle}
                />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    {/* Outlet renders the current page component */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
