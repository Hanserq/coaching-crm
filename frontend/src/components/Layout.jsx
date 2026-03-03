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
    Settings,
    ChevronRight,
    Bell,
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                    isActive
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
                ].join(' ')
            }
        >
            {({ isActive }) => (
                <>
                    <Icon size={17} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={13} className="text-white/60" />}
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
        <aside className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <GraduationCap size={19} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 leading-tight">Coaching CRM</p>
                    <p className="text-xs text-gray-400 truncate">Management Portal</p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="btn-ghost !p-1.5 lg:hidden">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-2 mb-3">Menu</p>
                {NAV_ITEMS.map((item) => (
                    <SidebarLink key={item.to} {...item} onClick={onClose} />
                ))}
            </nav>

            {/* User footer */}
            <div className="px-3 py-4 border-t border-gray-100 space-y-1">
                <NavLink
                    to="/profile"
                    onClick={onClose}
                    className={({ isActive }) =>
                        [
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 hover:bg-gray-100 group',
                            isActive ? 'bg-brand-50 ring-1 ring-brand-200' : '',
                        ].join(' ')
                    }
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                        {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user?.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                    </div>
                    <Settings size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </NavLink>
                <button onClick={handleLogout} className="btn-ghost w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600">
                    <LogOut size={16} />
                    <span className="text-sm">Sign out</span>
                </button>
            </div>
        </aside>
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

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuthStore();
    const pathname = window.location.pathname;
    const pageTitle = Object.entries(ROUTE_TITLES).find(([key]) =>
        pathname.startsWith(key)
    )?.[1] ?? 'Coaching CRM';

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:w-60 xl:w-64 flex-shrink-0">
                <div className="w-full"><Sidebar /></div>
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 flex lg:hidden">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <div className="relative z-50 w-72 flex-shrink-0 animate-scale-in">
                        <Sidebar onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top header */}
                <header className="h-14 flex items-center justify-between px-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="btn-ghost !p-1.5 lg:hidden">
                            <Menu size={20} />
                        </button>
                        <h1 className="text-base font-semibold text-gray-800">{pageTitle}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="btn-ghost !p-2 relative">
                            <Bell size={18} className="text-gray-400" />
                        </button>
                        <NavLink to="/profile" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">
                                {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                            </div>
                            <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.full_name}</span>
                        </NavLink>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-fade-up">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
