import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore, type User } from '@/store/authStore';
import type { Tables } from "@/integrations/supabase/types";
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/MainLayout';
import { BackgroundServiceInit } from "@/services/backgroundService";
import Login from './pages/Login';
import Register from './pages/Register';
import Pending from './pages/Pending';
import Home from './pages/Home';
import Alerts from './pages/Alerts';
import AlertDetail from './pages/AlertDetail';
import MapPage from './pages/MapPage';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

// Fetch user dengan timeout 4 detik — kalau gagal, tetap lanjut
type DbUser = Tables<"users">;

function minimalUser(userId: string): User {
  return {
    id: userId,
    name: null,
    email: null,
    phone: null,
    role: null,
    status: null,
    display_name: null,
    group_name: null,
    last_lat: null,
    last_lng: null,
  };
}

async function fetchAndSetUser(userId: string, setUser: (u: User | null) => void) {
  try {
    const result = (await Promise.race([
      supabase.from('users').select('*').eq('id', userId).single(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      ),
    ])) as { data: DbUser | null } | null;

    if (result?.data) {
      const u = result.data;
      setUser({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        display_name: u.display_name,
        group_name: u.group_name,
        last_lat: u.last_lat,
        last_lng: u.last_lng,
      });
    } else {
      // DB query gagal/timeout — set user minimal dari auth saja
      setUser(minimalUser(userId));
    }
  } catch {
    // Timeout atau error — jangan stuck, set user minimal
    console.warn('[Auth] fetchUser timeout/error, using minimal user');
    setUser(minimalUser(userId));
  }
}

const AuthListener = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchAndSetUser(session.user.id, setUser);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchAndSetUser(session.user.id, setUser);
          setLoading(false);
        }
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          await fetchAndSetUser(session.user.id, setUser);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthListener>
          <BackgroundServiceInit />
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/home" element={<ProtectedRoute><MainLayout><Home /></MainLayout></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute><MainLayout><Alerts /></MainLayout></ProtectedRoute>} />
            <Route path="/alerts/:id" element={<ProtectedRoute><MainLayout><AlertDetail /></MainLayout></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><MainLayout><MapPage /></MainLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthListener>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
