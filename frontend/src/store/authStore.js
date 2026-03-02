import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Auth Zustand store with localStorage persistence.
 *
 * State shape:
 *   - user         — { id, email, full_name, role, organization_id } | null
 *   - accessToken  — JWT access token string | null
 *   - refreshToken — JWT refresh token string | null
 *   - isAuthenticated — derived boolean, true when accessToken is set
 *
 * Actions:
 *   - setAuth(user, accessToken, refreshToken) — called after login/register
 *   - updateTokens(accessToken, refreshToken)  — called after token refresh
 *   - logout()                                  — clears all auth state
 */
export const useAuthStore = create(
    persist(
        (set) => ({
            // ── Initial state ───────────────────────────────────────────────────────
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            // ── Actions ─────────────────────────────────────────────────────────────

            /**
             * Populate auth state after a successful login or registration response.
             * @param {object} user - UserResponse from the API
             * @param {string} accessToken
             * @param {string} refreshToken
             */
            setAuth: (user, accessToken, refreshToken) =>
                set({
                    user,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                }),

            /**
             * Update tokens only (used by the silent refresh flow).
             */
            updateTokens: (accessToken, refreshToken) =>
                set({ accessToken, refreshToken }),

            /**
             * Clear all auth state. Called on logout or on 401 from the API.
             */
            logout: () =>
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: 'ccrm-auth',                       // localStorage key
            storage: createJSONStorage(() => localStorage),
            // Only persist the token + user — exclude ephemeral flags if added later
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        },
    ),
);
