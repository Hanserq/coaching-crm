import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard, Users, CalendarCheck, DollarSign,
    UserCircle, LogOut, Settings,
    Megaphone, BookOpen, GraduationCap, BarChart3,
    MessageCircle, Menu, X, ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, mod: null },
    { to: '/students', label: 'Students', Icon: Users, mod: null },
    { to: '/attendance', label: 'Attendance', Icon: CalendarCheck, mod: 'mod_attendance' },
    { to: '/fees', label: 'Fees', Icon: DollarSign, mod: 'mod_fees' },
    { to: '/leads', label: 'Leads', Icon: Megaphone, mod: 'mod_leads' },
    { to: '/courses', label: 'Courses', Icon: BookOpen, mod: 'mod_courses' },
    { to: '/teachers', label: 'Teachers', Icon: GraduationCap, mod: 'mod_teachers' },
    { to: '/exams', label: 'Exams', Icon: BarChart3, mod: 'mod_exams' },
    { to: '/communication', label: 'Messages', Icon: MessageCircle, mod: 'mod_communication' },
];

const BOTTOM_ITEMS = [
    { to: '/settings', label: 'Modules', Icon: Settings },
    { to: '/profile', label: 'Profile', Icon: UserCircle },
];

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const { modules, fetchModules } = useSettingsStore();

    // Sidebar open state — starts closed on mobile, open on desktop
    const [open, setOpen] = useState(() => window.innerWidth >= 768);
    // Desktop collapsed (icon-only) mode
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => { fetchModules(); }, [fetchModules]);

    // Close sidebar on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 768) setOpen(false);
    }, [location.pathname]);

    // Close sidebar on resize to mobile
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth < 768) setOpen(false);
            else setOpen(true);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const initials = user?.full_name
        ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        : '??';

    const isMobile = () => window.innerWidth < 768;

    // Sidebar width classes
    const sidebarW = collapsed ? 'w-16' : 'w-56';

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">

            {/* ── Mobile overlay backdrop ───────────────────────────────────── */}
            {open && isMobile() && (
                <div
                    className="fixed inset-0 bg-black/40 z-20 md:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside
                className={`
                    ${sidebarW} shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm
                    transition-all duration-300 ease-in-out
                    fixed md:relative inset-y-0 left-0 z-30
                    ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Brand + desktop collapse toggle */}
                <div className="px-3 pt-5 pb-4 border-b border-gray-50">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-md shrink-0">
                                <span className="text-white font-bold text-sm">C</span>
                            </div>
                            {!collapsed && (
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 leading-tight truncate">CoachingCRM</p>
                                    <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
                                </div>
                            )}
                        </div>
                        {/* Desktop collapse toggle */}
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-gray-50 transition-colors shrink-0"
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            <ChevronLeft size={14} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                        </button>
                        {/* Mobile close button */}
                        <button
                            onClick={() => setOpen(false)}
                            className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {NAV_ITEMS
                        .filter((item) => !item.mod || modules[item.mod] !== false)
                        .map(({ to, label, Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                title={collapsed ? label : undefined}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center px-2' : ''
                                    } ${isActive
                                        ? 'bg-brand-50 text-brand-600 shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                    }`
                                }
                            >
                                <Icon size={16} className="shrink-0" />
                                {!collapsed && label}
                            </NavLink>
                        ))}
                </nav>

                {/* Bottom items */}
                <div className="px-2 py-3 border-t border-gray-50 space-y-0.5">
                    {BOTTOM_ITEMS.map(({ to, label, Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${collapsed ? 'justify-center px-2' : ''
                                } ${isActive
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                }`
                            }
                        >
                            <Icon size={16} className="shrink-0" />
                            {!collapsed && label}
                        </NavLink>
                    ))}
                    <button
                        onClick={handleLogout}
                        title={collapsed ? 'Log out' : undefined}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 w-full ${collapsed ? 'justify-center px-2' : ''
                            }`}
                    >
                        <LogOut size={16} className="shrink-0" />
                        {!collapsed && 'Log out'}
                    </button>
                </div>

                {/* User chip — hidden when collapsed */}
                {!collapsed && (
                    <div className="px-3 pb-4">
                        <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-gray-700 truncate">{user?.full_name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile top bar with hamburger */}
                <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm shrink-0">
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">C</span>
                        </div>
                        <span className="text-sm font-bold text-gray-800">CoachingCRM</span>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
