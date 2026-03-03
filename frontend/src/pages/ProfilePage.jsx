import { useState } from 'react';
import { User, Lock, Save, Loader2, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

// ── Feedback Alert ─────────────────────────────────────────────────────────────
function Alert({ type, message }) {
    if (!message) return null;
    const isSuccess = type === 'success';
    return (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm mb-4 ${isSuccess
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
            {isSuccess ? <CheckCircle size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
            {message}
        </div>
    );
}

// ── Profile Page ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, setAuth, logout, accessToken, refreshToken } = useAuthStore();

    // Profile form
    const [fullName, setFullName] = useState(user?.full_name ?? '');
    const [profileStatus, setProfileStatus] = useState({ type: '', msg: '' });
    const [profileLoading, setProfileLoading] = useState(false);

    // Password form
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
    const [pwStatus, setPwStatus] = useState({ type: '', msg: '' });
    const [pwLoading, setPwLoading] = useState(false);

    // ── Update full name ───────────────────────────────────────────────────────
    async function handleProfileSave(e) {
        e.preventDefault();
        setProfileStatus({ type: '', msg: '' });
        setProfileLoading(true);
        try {
            const { data: updatedUser } = await api.patch('/auth/me', { full_name: fullName });
            // Update Zustand store with new user details
            setAuth(updatedUser, accessToken, refreshToken);
            setProfileStatus({ type: 'success', msg: 'Profile updated successfully!' });
        } catch (err) {
            setProfileStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to update profile.' });
        } finally {
            setProfileLoading(false);
        }
    }

    // ── Change password ────────────────────────────────────────────────────────
    async function handlePasswordChange(e) {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm) {
            setPwStatus({ type: 'error', msg: 'New passwords do not match.' });
            return;
        }
        if (pwForm.new_password.length < 8) {
            setPwStatus({ type: 'error', msg: 'New password must be at least 8 characters.' });
            return;
        }
        setPwStatus({ type: '', msg: '' });
        setPwLoading(true);
        try {
            await api.post('/auth/me/change-password', {
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            });
            setPwStatus({ type: 'success', msg: 'Password changed! Please log in again with your new password.' });
            setPwForm({ current_password: '', new_password: '', confirm: '' });
            // Log out after a short delay so the user sees the success message
            setTimeout(() => { logout(); navigate('/login'); }, 2500);
        } catch (err) {
            setPwStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to change password.' });
        } finally {
            setPwLoading(false);
        }
    }

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Profile Settings</h2>
                <p className="text-sm text-slate-500 mt-1">Manage your account details and security</p>
            </div>

            {/* Account info card */}
            <div className="card space-y-2 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xl font-bold shrink-0">
                    {(user?.full_name?.[0] ?? 'A').toUpperCase()}
                </div>
                <div>
                    <p className="font-semibold text-white">{user?.full_name}</p>
                    <p className="text-sm text-slate-400">{user?.email}</p>
                    <span className="badge bg-brand-500/20 text-brand-400 text-xs mt-1 capitalize">{user?.role}</span>
                </div>
            </div>

            {/* Edit Profile */}
            <div className="card">
                <div className="flex items-center gap-2 mb-5">
                    <User size={18} className="text-brand-400" />
                    <h3 className="text-base font-semibold text-white">Edit Profile</h3>
                </div>

                <Alert type={profileStatus.type} message={profileStatus.msg} />

                <form onSubmit={handleProfileSave} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            minLength={1}
                            className="input"
                            placeholder="Your full name"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Email</label>
                        <input
                            type="email"
                            value={user?.email ?? ''}
                            disabled
                            className="input opacity-50 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1">Email cannot be changed.</p>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={profileLoading} className="btn-primary flex items-center gap-2">
                            {profileLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>

            {/* Change Password */}
            <div className="card">
                <div className="flex items-center gap-2 mb-5">
                    <Lock size={18} className="text-brand-400" />
                    <h3 className="text-base font-semibold text-white">Change Password</h3>
                </div>

                <Alert type={pwStatus.type} message={pwStatus.msg} />

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Current Password</label>
                        <input
                            type="password"
                            value={pwForm.current_password}
                            onChange={(e) => setPwForm(p => ({ ...p, current_password: e.target.value }))}
                            required
                            className="input"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">New Password</label>
                        <input
                            type="password"
                            value={pwForm.new_password}
                            onChange={(e) => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                            required
                            minLength={8}
                            className="input"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Confirm New Password</label>
                        <input
                            type="password"
                            value={pwForm.confirm}
                            onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                            required
                            className="input"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
                            {pwLoading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                            Change Password
                        </button>
                    </div>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="card border border-red-500/20">
                <h3 className="text-base font-semibold text-red-400 mb-3">Danger Zone</h3>
                <p className="text-sm text-slate-500 mb-4">Sign out from this device and clear your session.</p>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={15} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
