import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  display_name: string | null;
  group_name: string | null;
  last_lat: number | null;
  last_lng: number | null;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  setLoading: (l: boolean) => void;
  logout: () => Promise<void>;
  clearStaleSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  },

  // Panggil ini kalau stuck loading > 5 detik
  clearStaleSession: async () => {
    await supabase.auth.signOut().catch(() => null);
    // Hapus semua key supabase dari localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    set({ user: null, loading: false });
  },
}));

// ─── Auto-timeout: kalau loading > 6 detik, clear stale session otomatis ───
let _timeoutHandle: ReturnType<typeof setTimeout> | null = null;

useAuthStore.subscribe((state) => {
  if (state.loading) {
    // Mulai timer saat loading = true
    if (!_timeoutHandle) {
      _timeoutHandle = setTimeout(async () => {
        const current = useAuthStore.getState();
        if (current.loading) {
          console.warn('[AuthStore] Loading timeout — clearing stale session');
          await current.clearStaleSession();
          // Reload halaman supaya state bersih
          window.location.reload();
        }
        _timeoutHandle = null;
      }, 6000);
    }
  } else {
    // Loading selesai, cancel timer
    if (_timeoutHandle) {
      clearTimeout(_timeoutHandle);
      _timeoutHandle = null;
    }
  }
});
