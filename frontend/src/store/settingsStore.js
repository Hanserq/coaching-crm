import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/axios';

const DEFAULT_MODULES = {
    mod_attendance: true,
    mod_fees: true,
    mod_leads: true,
    mod_courses: true,
    mod_teachers: true,
    mod_exams: true,
    mod_communication: true,
};

export const useSettingsStore = create(
    persist(
        (set) => ({
            modules: { ...DEFAULT_MODULES },
            loaded: false,
            fetchModules: async () => {
                try {
                    const { data } = await api.get('/settings/modules');
                    set({ modules: data, loaded: true });
                } catch {
                    set({ loaded: true }); // fallback: show all modules
                }
            },
            updateModule: async (key, value) => {
                set((s) => ({ modules: { ...s.modules, [key]: value } }));
                try {
                    const { data } = await api.patch('/settings/modules', {
                        ...useSettingsStore.getState().modules,
                        [key]: value,
                    });
                    set({ modules: data });
                } catch {
                    // revert on error
                    set((s) => ({ modules: { ...s.modules, [key]: !value } }));
                }
            },
        }),
        { name: 'crm-modules' }
    )
);
