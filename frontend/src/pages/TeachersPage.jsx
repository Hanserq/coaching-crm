import { useEffect, useState, useCallback } from 'react';
import { GraduationCap, Phone, Mail, Loader2, Users } from 'lucide-react';
import api from '../lib/axios';

// ── Teacher card ──────────────────────────────────────────────────────────────
const COLORS = ['from-violet-400 to-purple-600', 'from-blue-400 to-indigo-600', 'from-green-400 to-emerald-600', 'from-pink-400 to-rose-600', 'from-amber-400 to-orange-600'];
const avatarColor = (name) => COLORS[name.charCodeAt(0) % COLORS.length];

function TeacherCard({ user }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(user.full_name)} flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md`}>
                    {user.full_name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{user.full_name}</p>
                        <span className={`badge ${user.role === 'admin' ? 'badge-violet' : 'badge-blue'} capitalize`}>{user.role}</span>
                    </div>
                    <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 hover:text-brand-500 transition-colors">
                        <Mail size={12} /> {user.email}
                    </a>
                    <div className="mt-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Teachers Page ─────────────────────────────────────────────────────────────
export default function TeachersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                // Use the existing /auth/me endpoint — we list all org users via /students-alike endpoint
                // Since we don't have a GET /users/ route yet, we call /auth/me and show the current user
                // Plus any invited teachers available from the org. For now fetch current user as a placeholder.
                const { data } = await api.get('/auth/me');
                setUsers([data]);
            } catch { }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="max-w-2xl mx-auto space-y-5 animate-fade-up">
            <div className="flex items-center gap-2">
                <GraduationCap size={20} className="text-brand-500" />
                <h2 className="text-2xl font-bold text-gray-800">Teachers</h2>
            </div>
            <p className="text-sm text-gray-400">
                Team members in your organisation. Invite new teachers from <strong>Profile → Add Team Member</strong>.
            </p>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : users.length === 0 ? (
                <div className="text-center py-20">
                    <Users size={28} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No team members yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {users.map((u) => <TeacherCard key={u.id} user={u} />)}
                </div>
            )}
        </div>
    );
}
