import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
    Loader2, Plus, X, Phone, Mail, ChevronDown,
    Megaphone, AlertCircle, Trash2, MessageCircle,
} from 'lucide-react';
import api from '../lib/axios';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = [
    { key: 'new', label: 'New', color: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-400' },
    { key: 'contacted', label: 'Contacted', color: 'bg-violet-50 border-violet-200 text-violet-700', dot: 'bg-violet-400' },
    { key: 'demo_scheduled', label: 'Demo', color: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-400' },
    { key: 'follow_up', label: 'Follow-up', color: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-400' },
    { key: 'converted', label: 'Converted', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-400' },
    { key: 'lost', label: 'Lost', color: 'bg-red-50 border-red-200 text-red-600', dot: 'bg-red-400' },
];

const SOURCES = ['walk_in', 'whatsapp', 'website', 'referral', 'social', 'other'];

// ── Lead card ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, onStatusChange, onDelete }) {
    const st = STATUSES.find((s) => s.key === lead.status) ?? STATUSES[0];
    const waUrl = lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.full_name}, this is regarding your enquiry about ${lead.course_interest ?? 'our courses'}.`)}` : null;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2 group hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-gray-800 leading-tight">{lead.full_name}</p>
                <button onClick={() => onDelete(lead.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500">
                    <Trash2 size={13} />
                </button>
            </div>
            {lead.course_interest && <p className="text-xs text-violet-600 font-medium">{lead.course_interest}</p>}
            {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                    <Phone size={11} /> {lead.phone}
                </a>
            )}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 capitalize">{lead.source?.replace('_', ' ')}</span>
                {lead.next_followup_date && (
                    <span className="text-[10px] bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">
                        📅 {format(parseISO(lead.next_followup_date), 'd MMM')}
                    </span>
                )}
            </div>

            {/* Move to next status */}
            <div className="flex gap-1 flex-wrap">
                {STATUSES.filter((s) => s.key !== lead.status).slice(0, 3).map((s) => (
                    <button key={s.key} onClick={() => onStatusChange(lead.id, s.key)}
                        className={`text-[10px] px-2 py-0.5 rounded border ${s.color} hover:opacity-80 transition-opacity`}>
                        → {s.label}
                    </button>
                ))}
            </div>

            {waUrl && (
                <a href={waUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 font-medium">
                    <MessageCircle size={11} /> WhatsApp
                </a>
            )}
        </div>
    );
}

// ── Add Lead drawer ───────────────────────────────────────────────────────────
function AddLeadDrawer({ onClose, onAdded }) {
    const [form, setForm] = useState({ full_name: '', phone: '', email: '', course_interest: '', source: 'other', status: 'new', counselor_name: '', next_followup_date: '', notes: '' });
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!form.full_name.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form };
            if (!payload.next_followup_date) delete payload.next_followup_date;
            await api.post('/leads/', payload);
            onAdded();
            onClose();
        } catch { } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">Add New Lead</h3>
                    <button onClick={onClose} className="btn-ghost !p-1.5"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-3">
                    {[
                        { label: 'Full Name *', key: 'full_name', type: 'text' },
                        { label: 'Phone', key: 'phone', type: 'tel' },
                        { label: 'Email', key: 'email', type: 'email' },
                        { label: 'Course Interest', key: 'course_interest', type: 'text' },
                        { label: 'Counselor', key: 'counselor_name', type: 'text' },
                        { label: 'Follow-up Date', key: 'next_followup_date', type: 'date' },
                    ].map(({ label, key, type }) => (
                        <div key={key}>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                            <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="input" />
                        </div>
                    ))}
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Source</label>
                        <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className="input capitalize">
                            {SOURCES.map((s) => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
                        <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="input h-20 resize-none" />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Add Lead'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Leads Page ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [lRes, sRes] = await Promise.all([
                api.get('/leads/', { params: { page_size: 200 } }),
                api.get('/leads/stats'),
            ]);
            setLeads(lRes.data);
            setStats(sRes.data);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    async function handleStatusChange(leadId, newStatus) {
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
        await api.patch(`/leads/${leadId}`, { status: newStatus });
    }

    async function handleDelete(leadId) {
        if (!confirm('Delete this lead?')) return;
        await api.delete(`/leads/${leadId}`);
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
    }

    const byStatus = (key) => leads.filter((l) => l.status === key);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Megaphone size={20} className="text-brand-500" />
                        <h2 className="text-2xl font-bold text-gray-800">Leads</h2>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">Admission pipeline — move leads through stages</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">
                    <Plus size={16} /> Add Lead
                </button>
            </div>

            {/* Funnel summary */}
            {stats && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {STATUSES.map((s) => (
                        <div key={s.key} className={`flex-none rounded-xl border px-3 py-2 min-w-[90px] ${s.color}`}>
                            <p className="text-lg font-bold">{stats[s.key] ?? 0}</p>
                            <p className="text-[11px] font-medium">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Kanban board */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-brand-500" /></div>
            ) : (
                <div className="flex gap-3 overflow-x-auto pb-4">
                    {STATUSES.map((st) => (
                        <div key={st.key} className="flex-none w-60">
                            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-2 border ${st.color}`}>
                                <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                                <span className="text-xs font-bold">{st.label}</span>
                                <span className="ml-auto text-xs font-bold">{byStatus(st.key).length}</span>
                            </div>
                            <div className="space-y-2 min-h-[60px]">
                                {byStatus(st.key).map((lead) => (
                                    <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                                ))}
                                {byStatus(st.key).length === 0 && (
                                    <div className="text-xs text-gray-300 text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">Empty</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd && <AddLeadDrawer onClose={() => setShowAdd(false)} onAdded={fetchAll} />}
        </div>
    );
}
