import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Loader2, Building, User, Mail, Lock } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        orgName: '',
        orgSlug: '',
        fullName: '',
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            // Auto-generate slug from name if slug is untouched/empty
            if (name === 'orgName' && !prev.orgSlug) {
                newData.orgSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            return newData;
        });
        setError('');
    };

    const handleSlugChange = (e) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '');
        setFormData(prev => ({ ...prev, orgSlug: val }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Payload format required by POST /auth/register
            const payload = {
                organization: {
                    name: formData.orgName,
                    slug: formData.orgSlug
                },
                admin_user: {
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.fullName,
                    role: 'admin'
                }
            };

            const response = await api.post('/auth/register', payload);
            const { access_token, refresh_token } = response.data;

            // Fetch User profile using the new token
            // We temporarily set the token in the headers just for this request
            // before Zustand finishes saving it
            const profileRes = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const user = profileRes.data;

            setAuth(user, access_token, refresh_token);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            console.error('Registration error:', err.response?.data);
            if (err.response?.status === 409) {
                setError('Organization slug already exists. Please choose another one.');
            } else {
                setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to create account. Please check your inputs.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
            <div className="card w-full max-w-md p-8 shadow-xl">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
                        <Building className="text-white w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-surface-900">Create an Account</h1>
                    <p className="text-surface-500 text-sm mt-1">Setup your coaching center</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Organization Section */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">Organization</h3>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Clinic / Center Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building className="h-5 w-5 text-surface-400" />
                                </div>
                                <input
                                    type="text"
                                    name="orgName"
                                    value={formData.orgName}
                                    onChange={handleChange}
                                    required
                                    className="input pl-10 h-11"
                                    placeholder="Apex Coaching"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">URL Slug</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-surface-400 text-sm select-none">
                                    app.com/
                                </span>
                                <input
                                    type="text"
                                    name="orgSlug"
                                    value={formData.orgSlug}
                                    onChange={handleSlugChange}
                                    required
                                    className="input pl-[76px] h-11"
                                    placeholder="apex-coaching"
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-surface-200" />

                    {/* Admin User Section */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">Admin Account</h3>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Full Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-surface-400" />
                                </div>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    className="input pl-10 h-11"
                                    placeholder="Jane Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-surface-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="input pl-10 h-11"
                                    autoComplete="email"
                                    placeholder="jane@apex.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-surface-400" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={8}
                                    className="input pl-10 h-11"
                                    placeholder="••••••••"
                                />
                            </div>
                            <p className="text-xs text-surface-500 mt-1">Minimum 8 characters</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary w-full h-11 text-base mt-2"
                    >
                        {isLoading ? (
                            <><Loader2 className="animate-spin w-5 h-5 mr-2" /> Creating account...</>
                        ) : (
                            'Create Account'
                        )}
                    </button>

                </form>

                <div className="mt-6 text-center text-sm text-surface-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-500 transition-colors">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
