import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);

    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        if (error) setError('');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const { data: tokens } = await api.post('/auth/login', form);
            const { data: user } = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            setAuth(user, tokens.access_token, tokens.refresh_token);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.detail ?? 'Login failed. Check your credentials.');
        } finally { setLoading(false); }
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-brand-50 via-purple-50 to-indigo-50">
            {/* Left decorative panel (desktop) */}
            <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-brand-500 to-brand-700 p-12 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10" />
                <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
                <div className="absolute top-1/2 -right-10 w-40 h-40 rounded-full bg-white/10" />

                <div className="relative z-10 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <GraduationCap size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white leading-tight mb-3">Coaching CRM</h1>
                    <p className="text-lg text-white/70 max-w-xs">Manage students, track attendance & collect fees — all in one place.</p>
                    <div className="mt-8 flex flex-col gap-3 text-left max-w-xs mx-auto">
                        {['📋 Attendance tracking', '💰 Fee management', '👥 Student profiles', '📊 Live dashboard stats'].map((f) => (
                            <div key={f} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                                <span className="text-sm text-white/90 font-medium">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right login form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex flex-col items-center mb-8 lg:hidden">
                        <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-xl shadow-brand-500/30 mb-3">
                            <GraduationCap size={28} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Coaching CRM</h1>
                    </div>

                    <div className="mb-7">
                        <h2 className="text-2xl font-bold text-gray-800">Welcome back!</h2>
                        <p className="text-sm text-gray-400 mt-1">Sign in to your organisation's dashboard</p>
                    </div>

                    {/* Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                                <div className="relative">
                                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        name="email" type="email" required autoComplete="email"
                                        value={form.email} onChange={handleChange}
                                        placeholder="admin@school.com"
                                        className="input pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</label>
                                <div className="relative">
                                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        name="password" type="password" required autoComplete="current-password"
                                        value={form.password} onChange={handleChange}
                                        placeholder="••••••••"
                                        className="input pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <a href="/forgot-password" className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors">
                                    Forgot password?
                                </a>
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
                                {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
                            </button>
                        </form>
                    </div>


                    <p className="mt-5 text-center text-sm text-gray-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-brand-500 font-semibold hover:text-brand-600 transition-colors">
                            Create one <Sparkles size={12} className="inline" />
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
