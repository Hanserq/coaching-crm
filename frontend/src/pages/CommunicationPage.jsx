import { useEffect, useState, useCallback } from 'react';
import {
    MessageCircle, Plus, X, Loader2, Trash2,
    Copy, Check, Pin, Bell, Users, Phone,
} from 'lucide-react';
import api from '../lib/axios';

// ── Notice card ───────────────────────────────────────────────────────────────
function NoticeCard({ notice, onDelete }) {
    const AUDIENCE_CLR = {
        all: 'badge-violet', students: 'badge-blue', teachers: 'badge-green', parents: 'badge-amber',
    };
    return (
        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${notice.is_pinned ? 'border-amber-200' : 'border-gray-100'}`}>
            <div className="flex items-start gap-3">
                {notice.is_pinned && <Pin size={14} className="text-amber-500 shrink-0 mt-1" />}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-800 text-sm">{notice.title}</p>
                        <button onClick={() => onDelete(notice.id)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed whitespace-pre-wrap">{notice.body}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                        <span className={`badge ${AUDIENCE_CLR[notice.audience] ?? 'badge-gray'} capitalize`}>{notice.audience}</span>
                        {notice.author && <span>by {notice.author}</span>}
                        <span className="ml-auto">{notice.created_at}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Bulk WhatsApp generator ───────────────────────────────────────────────────
function WhatsAppBlast({ students }) {
    const [msg, setMsg] = useState('Dear parent, this is a message from the coaching center. Please note: ');
    const [copied, setCopied] = useState(false);

    const withPhone = students.filter((s) => s.phone);

    function handleCopy() {
        navigator.clipboard.writeText(msg);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-800">Bulk WhatsApp Message</h3>
                <span className="ml-auto text-xs text-gray-400">{withPhone.length} contacts with phone</span>
            </div>
            <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="input h-24 resize-none text-sm"
                placeholder="Type your message…"
            />
            <button onClick={handleCopy} className="btn-secondary flex items-center gap-1.5">
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Message</>}
            </button>
            <div className="space-y-2 max-h-48 overflow-auto">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Open individual chats</p>
                {withPhone.map((s) => (
                    <a
                        key={s.id}
                        href={`https://wa.me/${s.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 bg-green-50 rounded-lg px-3 py-2"
                    >
                        <Phone size={11} /> {s.full_name} · {s.phone}
                    </a>
                ))}
                {withPhone.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No students have phone numbers stored.</p>
                )}
            </div>
        </div>
    );
}

// ── Post notice modal ─────────────────────────────────────────────────────────
function NoticeModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ title: '', body: '', audience: 'all', is_pinned: false });
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!form.title || !form.body) return;
        setSaving(true);
        try {
            await api.post('/notices/', form);
            onSaved(); onClose();
        } catch { } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Post Notice</h3>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={16} /></button>
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Title *</label>
                    <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="input" />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Message *</label>
                    <textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} className="input h-28 resize-none" />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Audience</label>
                    <select value={form.audience} onChange={(e) => setForm(f => ({ ...f, audience: e.target.value }))} className="input capitalize">
                        {['all', 'students', 'teachers', 'parents'].map((a) => <option key={a} value={a} className="capitalize">{a}</option>)}
                    </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm(f => ({ ...f, is_pinned: e.target.checked }))} className="rounded" />
                    📌 Pin this notice
                </label>
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Post Notice'}
                </button>
            </div>
        </div>
    );
}

// ── Communication Page ────────────────────────────────────────────────────────
export default function CommunicationPage() {
    const [notices, setNotices] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [tab, setTab] = useState('notices');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [nRes, sRes] = await Promise.all([
                api.get('/notices/'),
                api.get('/students/', { params: { page_size: 200, status: 'active' } }),
            ]);
            setNotices(nRes.data);
            setStudents(sRes.data.items);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleDeleteNotice(id) {
        await api.delete(`/notices/${id}`);
        setNotices((n) => n.filter((x) => x.id !== id));
    }

    return (
        <div className="max-w-2xl mx-auto space-y-5 animate-fade-up">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Bell size={20} className="text-brand-500" />
                        <h2 className="text-2xl font-bold text-gray-800">Communication</h2>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">Post notices and send bulk WhatsApp messages</p>
                </div>
                {tab === 'notices' && (
                    <button onClick={() => setShowAdd(true)} className="btn-primary">
                        <Plus size={16} /> Post Notice
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                {[
                    { id: 'notices', label: '📋 Notices' },
                    { id: 'whatsapp', label: '💬 WhatsApp' },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm text-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : tab === 'notices' ? (
                notices.length === 0 ? (
                    <div className="text-center py-20">
                        <Bell size={28} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No notices yet. Post your first announcement!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notices.map((n) => <NoticeCard key={n.id} notice={n} onDelete={handleDeleteNotice} />)}
                    </div>
                )
            ) : (
                <WhatsAppBlast students={students} />
            )}

            {showAdd && <NoticeModal onClose={() => setShowAdd(false)} onSaved={fetchAll} />}
        </div>
    );
}
