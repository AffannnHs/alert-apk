import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Hourglass, RefreshCw } from 'lucide-react';

const Pending = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState('');

  // Get email on mount
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '');
    });
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate('/login'); return; }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userData?.status === 'ACTIVE') {
        setUser(userData);
        navigate('/home');
      }
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Hourglass className="h-16 w-16 text-warning-yellow" />
          <h1 className="text-xl font-bold text-foreground">Akun Dalam Verifikasi</h1>
          <p className="text-sm text-muted-foreground">
            Pendaftaran Anda diterima. Admin akan memverifikasi dalam waktu dekat.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-left">
          <p className="text-sm text-muted-foreground">📧 {email || '...'}</p>
          <p className="text-sm text-muted-foreground">Status: Menunggu Persetujuan</p>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-12 w-full rounded-xl"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>

        <Link to="/login" className="block text-sm font-semibold text-primary hover:underline">
          ← Kembali ke Login
        </Link>
      </div>
    </div>
  );
};

export default Pending;
