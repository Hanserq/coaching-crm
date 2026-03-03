import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../lib/axios';

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState(params.get('email') ?? '');
    const [token, setToken] = useState(params.get('token') ?? '');
    const [pass, setPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (pass !== confirm) { setError('Passwords do not match.'); return; }
        if (pass.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setLoading(true); setError('');
        try {
            await api.post('/auth/reset-password', {
                email,
                token,
                new_password: pass,
            });
            setDone(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err?.response?.data?.detail ?? 'Invalid or expired code. Please try again.');
        } finally { setLoading(false); }
    }

    if (done) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-10 text-center space-y-4 border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">Password Reset!</h2>
                    <p className="text-sm text-gray-400">Redirecting you to login…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-xl shadow-violet-100/50 p-8 space-y-6 border border-gray-100">
                    {/* Back */}
                    <Link to="/forgot-password" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-500 transition-colors w-fit">
                        <ArrowLeft size={13} /> Back
                    </Link>

                    {/* Heading */}
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
                            <KeyRound size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Reset password</h1>
                        <p className="text-sm text-gray-400">Enter your code and choose a new password.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                required
                            />
                        </div>

                        {/* OTP */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">6-digit Reset Code</label>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                maxLength={6}
                                className="input tracking-widest text-lg font-bold text-center"
                                required
                            />
                        </div>

                        {/* New password */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password</label>
                            <div className="relative">
                                <input
                                    type={show ? 'text' : 'password'}
                                    value={pass}
                                    onChange={(e) => setPass(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className="input pr-10"
                                    required
                                />
                                <button type="button" onClick={() => setShow((s) => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm Password</label>
                            <input
                                type={show ? 'text' : 'password'}
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="Repeat password"
                                className="input"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full !py-3 !text-sm">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Reset Password'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400">
                        Remember your password?{' '}
                        <Link to="/login" className="text-brand-500 font-semibold hover:text-brand-600">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
