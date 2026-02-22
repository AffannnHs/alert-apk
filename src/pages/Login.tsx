import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Siren, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError('Email atau password salah');
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        setError('Data pengguna tidak ditemukan');
        setLoading(false);
        return;
      }

      if (userData.status === 'PENDING') {
        navigate('/pending');
      } else if (userData.status === 'SUSPENDED') {
        setError('Akun Anda telah ditangguhkan');
        await supabase.auth.signOut();
      } else {
        setUser(userData);
        navigate('/home');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Siren Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20" style={{ boxShadow: '0 0 40px rgba(239,68,68,0.4)' }}>
            <Siren className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">EMERGENCY ALERT SYSTEM</h1>
          <p className="text-sm text-muted-foreground">Aplikasi Darurat Komunitas</p>
        </div>

        <div className="h-px bg-border" />

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@contoh.com"
              required
              className="h-12 bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 bg-secondary border-border pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-xl text-base font-bold"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>🚨 MASUK SEKARANG</>
            )}
          </Button>
        </form>

        <div className="h-px bg-border" />

        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
