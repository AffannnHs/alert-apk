import { create } from 'zustand';

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
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null }),
}));
