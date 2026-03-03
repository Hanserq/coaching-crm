import { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import {
    Users, CalendarCheck, DollarSign, Megaphone,
    BookOpen, GraduationCap, MessageCircle, CheckCircle2,
    Settings, BarChart3,
} from 'lucide-react';

// ── Module definitions ────────────────────────────────────────────────────────
const MODULES = [
    {
        key: 'mod_attendance',
        label: 'Attendance',
        description: 'Daily attendance marking, date navigation, and per-student analytics.',
        icon: CalendarCheck,
        color: 'from-emerald-400 to-teal-500',
        core: false,
    },
    {
        key: 'mod_fees',
        label: 'Fees & Billing',
        description: 'Fee collection, payment history, and monthly billing management.',
        icon: DollarSign,
        color: 'from-green-400 to-emerald-500',
        core: false,
    },
    {
        key: 'mod_leads',
        label: 'Lead Management',
        description: 'Admission pipeline: capture enquiries, move through stages, track conversions.',
        icon: Megaphone,
        color: 'from-pink-400 to-rose-500',
        core: false,
    },
    {
        key: 'mod_courses',
        label: 'Courses & Batches',
        description: 'Create courses, schedule batches, assign students and teachers.',
        icon: BookOpen,
        color: 'from-blue-400 to-indigo-500',
        core: false,
    },
    {
        key: 'mod_teachers',
        label: 'Teachers',
        description: 'View teacher profiles, class load, and contact details.',
        icon: GraduationCap,
        color: 'from-violet-400 to-purple-500',
        core: false,
    },
    {
        key: 'mod_exams',
        label: 'Exams & Results',
        description: 'Create tests, enter marks, auto-calculate ranks and percentages.',
        icon: BarChart3,
        color: 'from-amber-400 to-orange-500',
        core: false,
    },
    {
        key: 'mod_communication',
        label: 'Communication',
        description: 'Post notices, generate bulk WhatsApp messages for parents & students.',
        icon: MessageCircle,
        color: 'from-cyan-400 to-sky-500',
        core: false,
    },
];

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            aria-checked={checked}
            role="switch"
            className={[
                'relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none',
                checked ? 'bg-brand-500' : 'bg-gray-200',
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
        >
            <span className={[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200',
                checked ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')} />
        </button>
    );
}

// ── Module card ───────────────────────────────────────────────────────────────
function ModuleCard({ mod, enabled, onToggle, isAdmin }) {
    const Icon = mod.icon;
    return (
        <div className={`bg-white rounded-2xl border transition-all duration-200 p-5 ${enabled ? 'border-gray-100 shadow-sm' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">{mod.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{mod.description}</p>
                    </div>
                </div>
                <div className="shrink-0 mt-0.5">
                    {mod.core ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                            <CheckCircle2 size={11} /> Always On
                        </span>
                    ) : (
                        <Toggle checked={enabled} onChange={(v) => onToggle(mod.key, v)} disabled={!isAdmin} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { modules, updateModule } = useSettingsStore();
    const user = useAuthStore((s) => s.user);
    const isAdmin = user?.role === 'admin';

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Settings size={20} className="text-brand-500" />
                    <h2 className="text-2xl font-bold text-gray-800">Module Settings</h2>
                </div>
                <p className="text-sm text-gray-400">
                    Toggle the features your institute needs. Disabled modules are hidden from the sidebar — no data is deleted.
                    {!isAdmin && <span className="ml-1 text-amber-500">Only admins can change settings.</span>}
                </p>
            </div>

            {/* Core modules note */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-xs text-brand-700 flex items-start gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span><strong>Dashboard</strong> and <strong>Students</strong> are always enabled as core modules.</span>
            </div>

            {/* Module cards grid */}
            <div className="grid grid-cols-1 gap-3">
                {MODULES.map((mod) => (
                    <ModuleCard
                        key={mod.key}
                        mod={mod}
                        enabled={modules[mod.key] ?? true}
                        onToggle={updateModule}
                        isAdmin={isAdmin}
                    />
                ))}
            </div>
        </div>
    );
}
