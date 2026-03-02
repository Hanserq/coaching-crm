import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Axios instance pre-configured for the Coaching Center CRM API.
 *
 * - baseURL: proxied to http://localhost:8000 via Vite's server.proxy in dev.
 * - Request interceptor: injects the JWT access token from the Zustand store.
 * - Response interceptor: on 401 Unauthorized, clears auth state and
 *   redirects to /login so the user re-authenticates.
 */
const api = axios.create({
    // Dev:  Vite proxy forwards /api/v1 → localhost:8000 (no CORS, no config needed)
    // Prod: set VITE_API_URL=https://your-app.railway.app/api/v1 in Vercel env vars
    baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15_000,
});

// ── Request interceptor: attach Bearer token ──────────────────────────────────
api.interceptors.request.use(
    (config) => {
        // Read directly from Zustand store state (not via hook — safe outside React)
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 → auto-logout ───────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear the auth state — ProtectedRoute will redirect to /login
            useAuthStore.getState().logout();
            // Only redirect if we're in a browser context (not SSR/test)
            if (typeof window !== 'undefined') {
                window.location.replace('/login');
            }
        }
        return Promise.reject(error);
    },
);

export default api;
