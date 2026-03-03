import { useState } from 'react';
import { User, Lock, Save, Loader2, CheckCircle, AlertCircle, LogOut, UserPlus } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

// ── Feedback Alert ─────────────────────────────────────────────────────────────
function Alert({ type, message }) {
    if (!message) return null;
    const isSuccess = type === 'success';
    return (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-4 border ${isSuccess
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-red-50 border-red-100 text-red-600'
            }`}>
            {isSuccess ? <CheckCircle size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
            {message}
        </div>
    );
}

// ── Section card ───────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children, iconClass = 'text-brand-500 bg-brand-50' }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconClass}`}>
                    <Icon size={16} />
                </div>
                <h3 className="text-sm font-bold text-gray-800">{title}</h3>
            </div>
            <div className="p-6">{children}</div>
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

    // Invite form
    const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', password: '', role: 'teacher' });
    const [inviteStatus, setInviteStatus] = useState({ type: '', msg: '' });
    const [inviteLoading, setInviteLoading] = useState(false);

    const isAdmin = user?.role === 'admin';

    // ── Update full name ───────────────────────────────────────────────────────
    async function handleProfileSave(e) {
        e.preventDefault();
        setProfileStatus({ type: '', msg: '' });
        setProfileLoading(true);
        try {
            const { data: updatedUser } = await api.patch('/auth/me', { full_name: fullName });
            setAuth(updatedUser, accessToken, refreshToken);
            setProfileStatus({ type: 'success', msg: 'Profile updated successfully!' });
        } catch (err) {
            setProfileStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to update profile.' });
        } finally { setProfileLoading(false); }
    }

    // ── Change password ────────────────────────────────────────────────────────
    async function handlePasswordChange(e) {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm) { setPwStatus({ type: 'error', msg: 'New passwords do not match.' }); return; }
        if (pwForm.new_password.length < 8) { setPwStatus({ type: 'error', msg: 'New password must be at least 8 characters.' }); return; }
        setPwStatus({ type: '', msg: '' });
        setPwLoading(true);
        try {
            await api.post('/auth/me/change-password', {
                current_password: pwForm.current_password,
                new_password: pwForm.new_password,
            });
            setPwStatus({ type: 'success', msg: 'Password changed! Logging you out in 3 seconds…' });
            setPwForm({ current_password: '', new_password: '', confirm: '' });
            setTimeout(() => { logout(); navigate('/login'); }, 3000);
        } catch (err) {
            setPwStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to change password.' });
        } finally { setPwLoading(false); }
    }

    // ── Invite user ────────────────────────────────────────────────────────────
    async function handleInvite(e) {
        e.preventDefault();
        setInviteStatus({ type: '', msg: '' });
        setInviteLoading(true);
        try {
            const { data: newUser } = await api.post('/auth/invite', inviteForm);
            setInviteStatus({ type: 'success', msg: `${newUser.full_name} (${newUser.role}) has been added to your organisation!` });
            setInviteForm({ full_name: '', email: '', password: '', role: 'teacher' });
        } catch (err) {
            setInviteStatus({ type: 'error', msg: err.response?.data?.detail || 'Failed to invite user.' });
        } finally { setInviteLoading(false); }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Profile Settings</h2>
                <p className="text-sm text-gray-400 mt-1">Manage your account details and security</p>
            </div>

            {/* Account info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md shadow-brand-500/25">
                    {(user?.full_name?.[0] ?? 'A').toUpperCase()}
                </div>
                <div>
                    <p className="font-bold text-gray-800">{user?.full_name}</p>
                    <p className="text-sm text-gray-400">{user?.email}</p>
                    <span className={`badge mt-1.5 ${isAdmin ? 'badge-purple' : 'badge-blue'} capitalize`}>{user?.role}</span>
                </div>
            </div>

            {/* Edit Profile */}
            <Section icon={User} title="Edit Profile">
                <Alert type={profileStatus.type} message={profileStatus.msg} />
                <form onSubmit={handleProfileSave} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input" placeholder="Your full name" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email</label>
                        <input type="email" value={user?.email ?? ''} disabled className="input" />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={profileLoading} className="btn-primary flex items-center gap-2">
                            {profileLoading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </Section>

            {/* Change Password */}
            <Section icon={Lock} title="Change Password" iconClass="text-amber-600 bg-amber-50">
                <Alert type={pwStatus.type} message={pwStatus.msg} />
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    {[
                        { key: 'current_password', label: 'Current Password', placeholder: '••••••••' },
                        { key: 'new_password', label: 'New Password (min 8 chars)', placeholder: '••••••••' },
                        { key: 'confirm', label: 'Confirm New Password', placeholder: '••••••••' },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{label}</label>
                            <input
                                type="password"
                                value={pwForm[key]}
                                onChange={(e) => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                                required className="input" placeholder={placeholder}
                            />
                        </div>
                    ))}
                    <div className="flex justify-end">
                        <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
                            {pwLoading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                            Change Password
                        </button>
                    </div>
                </form>
            </Section>

            {/* Invite User — admin only */}
            {isAdmin && (
                <Section icon={UserPlus} title="Add Team Member" iconClass="text-emerald-600 bg-emerald-50">
                    <p className="text-sm text-gray-400 mb-4">
                        Add a teacher or another admin to your organisation. They'll be able to log in immediately.
                    </p>
                    <Alert type={inviteStatus.type} message={inviteStatus.msg} />
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name *</label>
                                <input type="text" required value={inviteForm.full_name} onChange={(e) => setInviteForm(p => ({ ...p, full_name: e.target.value }))} className="input" placeholder="Name" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email *</label>
                                <input type="email" required value={inviteForm.email} onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))} className="input" placeholder="teacher@school.com" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Password *</label>
                                <input type="password" required minLength={8} value={inviteForm.password} onChange={(e) => setInviteForm(p => ({ ...p, password: e.target.value }))} className="input" placeholder="Min 8 characters" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Role</label>
                                <select value={inviteForm.role} onChange={(e) => setInviteForm(p => ({ ...p, role: e.target.value }))} className="input">
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={inviteLoading} className="btn-primary flex items-center gap-2">
                                {inviteLoading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                                Add Member
                            </button>
                        </div>
                    </form>
                </Section>
            )}

            {/* Danger zone */}
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-red-500 mb-1">Sign Out</h3>
                <p className="text-xs text-gray-400 mb-4">Sign out from this device and clear your session.</p>
                <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
                >
                    <LogOut size={15} /> Sign Out
                </button>
            </div>
        </div>
    );
}
