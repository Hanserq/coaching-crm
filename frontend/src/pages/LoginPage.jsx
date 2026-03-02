import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
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
        setLoading(true);
        setError('');
        try {
            // 1. Get tokens
            const { data: tokens } = await api.post('/auth/login', form);
            // Temporarily store access token so the /me call is authenticated
            useAuthStore.setState({ accessToken: tokens.access_token });

            // 2. Fetch the user profile
            const { data: user } = await api.get('/auth/me');

            // 3. Persist full auth state
            setAuth(user, tokens.access_token, tokens.refresh_token);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(
                err.response?.data?.detail ?? 'Login failed. Check your credentials.'
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-900)] px-4">
            {/* Card */}
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-xl shadow-brand-500/30 mb-4">
                        <GraduationCap size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Coaching CRM</h1>
                    <p className="text-sm text-slate-400 mt-1">Sign in to your organisation</p>
                </div>

                {/* Form card */}
                <div className="card space-y-5">
                    {/* Error banner */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Email</label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="admin@school.com"
                                    className="input pl-9"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-300 uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="input pl-9"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full justify-center py-2.5 text-sm mt-2"
                        >
                            {loading ? (
                                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center text-sm text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
                        Create one
                    </Link>
                </div>
            </div>
        </div>
    );
}
