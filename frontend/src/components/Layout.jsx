import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
    LayoutDashboard, Users, CalendarCheck, DollarSign,
    UserCircle, LogOut, Bell, Settings,
    Megaphone, BookOpen, GraduationCap, BarChart3,
    MessageCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

// ── Nav config ────────────────────────────────────────────────────────────────
// `mod` = null means always shown; otherwise the module key that must be enabled
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
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const { modules, fetchModules } = useSettingsStore();

    useEffect(() => { fetchModules(); }, [fetchModules]);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    const initials = user?.full_name
        ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        : '??';

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col shadow-sm">
                {/* Brand */}
                <div className="px-4 pt-5 pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-sm">C</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800 leading-tight">CoachingCRM</p>
                            <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
                        </div>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {NAV_ITEMS.filter((item) => !item.mod || modules[item.mod] !== false).map(({ to, label, Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-brand-50 text-brand-600 shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                }`
                            }
                        >
                            <Icon size={16} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom items */}
                <div className="px-2 py-3 border-t border-gray-50 space-y-0.5">
                    {BOTTOM_ITEMS.map(({ to, label, Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                                    ? 'bg-brand-50 text-brand-600'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                }`
                            }
                        >
                            <Icon size={16} />
                            {label}
                        </NavLink>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 w-full"
                    >
                        <LogOut size={16} />
                        Log out
                    </button>
                </div>

                {/* User chip */}
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
            </aside>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-6 py-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
