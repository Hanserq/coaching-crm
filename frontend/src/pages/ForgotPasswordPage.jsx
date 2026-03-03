import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle2, Copy, Check } from 'lucide-react';
import api from '../lib/axios';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email) return;
        setLoading(true); setError('');
        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            if (data.token) setToken(data.token);
            else setError('No account found with that email.');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally { setLoading(false); }
    }

    function copyToken() {
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-violet-100/50 p-8 space-y-6 border border-gray-100">
                    {/* Back link */}
                    <Link to="/login" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-500 transition-colors w-fit">
                        <ArrowLeft size={13} /> Back to login
                    </Link>

                    {/* Icon + heading */}
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
                            <Mail size={24} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Forgot password?</h1>
                        <p className="text-sm text-gray-400">
                            Enter your email and we'll generate a reset code for you.
                        </p>
                    </div>

                    {!token ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="input"
                                />
                            </div>
                            {error && (
                                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full !py-3 !text-sm"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Get Reset Code'}
                            </button>
                        </form>
                    ) : (
                        /* Token revealed */
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                <p className="text-xs text-emerald-700 font-medium">Reset code generated!</p>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 space-y-3 border border-gray-100">
                                <p className="text-xs text-gray-400 font-medium">Your 6-digit reset code</p>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-3xl font-black text-brand-600 tracking-widest">{token}</p>
                                    <button onClick={copyToken} className="btn-ghost !p-2 text-gray-400 hover:text-brand-500">
                                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                                    ⏰ Expires in 15 minutes
                                </p>
                            </div>

                            <p className="text-xs text-gray-400 text-center">
                                Use this code on the reset password page.
                            </p>

                            <Link
                                to={`/reset-password?email=${encodeURIComponent(email)}&token=${token}`}
                                className="btn-primary w-full !py-3 !text-sm flex items-center justify-center gap-2"
                            >
                                Continue to Reset Password →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
